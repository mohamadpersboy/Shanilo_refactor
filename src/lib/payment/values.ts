import { ValidationError } from "@/lib/errors";
import { businessOperationId, equals, money, type BusinessOperationId, type Money } from "@/lib/money";
import { PaymentAmountMismatchError, PaymentInvalidAmountError } from "./errors";
import {
  isPaymentProviderId,
  providerPaymentId,
  providerReference,
  type PaymentProviderId,
  type ProviderPaymentId,
  type ProviderReference,
} from "./ids";

/*
 * Value types of the PaymentProvider contract. All are immutable (frozen copies).
 *
 * MONEY BOUNDARY: the domain only speaks `Money` (TOMAN, integer). A gateway needs its own
 * unit (for example Rial). The conversion Toman → gateway amount happens ONLY inside a
 * Provider Adapter, and only from the real contract of that gateway. There is no conversion
 * helper here or in `Money`, and a PaymentService must never pass a raw `number`.
 */

export const MAX_CALLBACK_URL_LENGTH = 2048;
export const MAX_DESCRIPTION_LENGTH = 255;

function assertPositiveMoney(value: Money, what: string): Money {
  if (typeof value !== "object" || value === null || typeof value.amount !== "number") {
    throw new PaymentInvalidAmountError(`${what} must be a Money value`);
  }
  let checked: Money;
  try {
    checked = money(value.amount, value.currency);
  } catch (cause) {
    throw new PaymentInvalidAmountError(`${what} is not a valid Money value`, cause);
  }
  if (checked.amount <= 0) throw new PaymentInvalidAmountError(`${what} must be greater than zero`);
  return checked;
}

/** A generic absolute http(s) URL. Not gateway-specific. Uses the built-in `URL` only. */
function assertUrl(value: unknown, what: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(`${what} must be a non-empty string`);
  }
  if (value.length > MAX_CALLBACK_URL_LENGTH) {
    throw new ValidationError(`${what} is too long`);
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new ValidationError(`${what} must be an absolute URL`);
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new ValidationError(`${what} must use http or https`);
  }
  if (parsed.username !== "" || parsed.password !== "") {
    throw new ValidationError(`${what} must not contain credentials`);
  }
  return value;
}

/** What a PaymentService asks a provider to create. */
export type PaymentRequest = Readonly<{
  /** Domain amount. Positive TOMAN. The Adapter converts it to the gateway unit. */
  amount: Money;
  /** Business operation of this payment attempt (Phase 2D). The provider does not store or check it. */
  operationId: BusinessOperationId;
  callbackUrl: string;
  /** Free text for the gateway. Never used for business logic. */
  description?: string;
}>;

export function paymentRequest(input: {
  amount: Money;
  operationId: BusinessOperationId;
  callbackUrl: string;
  description?: string;
}): PaymentRequest {
  const amount = assertPositiveMoney(input.amount, "Payment amount");
  const operationId = businessOperationId(input.operationId);
  const callbackUrl = assertUrl(input.callbackUrl, "Callback URL");
  const { description } = input;
  if (description === undefined) return Object.freeze({ amount, operationId, callbackUrl });
  if (typeof description !== "string" || description.length > MAX_DESCRIPTION_LENGTH) {
    throw new ValidationError(`Description must be a string of at most ${MAX_DESCRIPTION_LENGTH} characters`);
  }
  return Object.freeze({ amount, operationId, callbackUrl, description });
}

export const REDIRECT_METHODS = ["GET", "POST"] as const;
export type RedirectMethod = (typeof REDIRECT_METHODS)[number];

/**
 * Where the customer must go, as DATA. The provider never redirects a browser, never builds an HTTP
 * response and never calls `redirect()`. Some gateways need a POST form, so the method and the
 * form fields are part of the destination. `fields` is empty for GET.
 */
export type PaymentRedirect = Readonly<{
  url: string;
  method: RedirectMethod;
  fields: Readonly<Record<string, string>>;
}>;

export function paymentRedirect(input: {
  url: string;
  method?: RedirectMethod;
  fields?: Readonly<Record<string, string>>;
}): PaymentRedirect {
  const url = assertUrl(input.url, "Redirect URL");
  const method = input.method ?? "GET";
  if (!(REDIRECT_METHODS as readonly string[]).includes(method)) {
    throw new ValidationError("Redirect method must be GET or POST");
  }
  const fields: Record<string, string> = {};
  for (const [key, value] of Object.entries(input.fields ?? {})) {
    if (key.length === 0 || typeof value !== "string") throw new ValidationError("Redirect fields must be string pairs");
    fields[key] = value;
  }
  if (method === "GET" && Object.keys(fields).length > 0) {
    throw new ValidationError("A GET redirect has no form fields");
  }
  return Object.freeze({ url, method, fields: Object.freeze(fields) });
}

/** Result of `createPayment`. Provider-neutral. No raw gateway response. */
export type PaymentCreationResult = Readonly<{
  provider: PaymentProviderId;
  providerPaymentId: ProviderPaymentId;
  redirect: PaymentRedirect;
}>;

export function paymentCreationResult(input: {
  provider: PaymentProviderId;
  providerPaymentId: string;
  redirect: PaymentRedirect;
}): PaymentCreationResult {
  if (!isPaymentProviderId(input.provider)) throw new ValidationError("Unsupported payment provider");
  const redirect = paymentRedirect(input.redirect);
  return Object.freeze({
    provider: input.provider,
    providerPaymentId: providerPaymentId(input.providerPaymentId),
    redirect,
  });
}

export const MAX_CALLBACK_FIELDS = 64;
export const MAX_CALLBACK_KEY_LENGTH = 128;
export const MAX_CALLBACK_VALUE_LENGTH = 4096;

/**
 * Data the customer's browser brought back from the gateway (query or form fields), as a flat
 * string map. The domain does NOT interpret the keys: only the Adapter knows them. It is an
 * untrusted claim, not a result.
 *
 * CALLBACK RECEIVED ≠ PAYMENT CONFIRMED. A payment may count as successful in the Service Layer
 * only after `verifyPayment` returned `SUCCESS` and the verified amount matched.
 *
 * Design choice: a safe, bounded, serializable string map (option A) instead of an opaque
 * `unknown` (option B), so no un-checked value crosses the contract. `undefined` values are dropped.
 */
export type PaymentCallbackData = Readonly<Record<string, string>>;

export function paymentCallbackData(input: Readonly<Record<string, string | undefined>>): PaymentCallbackData {
  const entries = Object.entries(input).filter((entry): entry is [string, string] => entry[1] !== undefined);
  if (entries.length > MAX_CALLBACK_FIELDS) throw new ValidationError("Too many callback fields");
  const data: Record<string, string> = {};
  for (const [key, value] of entries) {
    if (key.length === 0 || key.length > MAX_CALLBACK_KEY_LENGTH) throw new ValidationError("Invalid callback field name");
    if (typeof value !== "string" || value.length > MAX_CALLBACK_VALUE_LENGTH) {
      throw new ValidationError("Invalid callback field value");
    }
    data[key] = value;
  }
  return Object.freeze(data);
}

/** What the Service asks a provider to verify. The provider checks the amount; no UI does. */
export type PaymentVerificationRequest = Readonly<{
  providerPaymentId: ProviderPaymentId;
  /** Amount the order expects. The Adapter compares it with the gateway amount (in the gateway unit). */
  expectedAmount: Money;
  callbackData: PaymentCallbackData;
}>;

export function paymentVerificationRequest(input: {
  providerPaymentId: string;
  expectedAmount: Money;
  callbackData: Readonly<Record<string, string | undefined>>;
}): PaymentVerificationRequest {
  return Object.freeze({
    providerPaymentId: providerPaymentId(input.providerPaymentId),
    expectedAmount: assertPositiveMoney(input.expectedAmount, "Expected amount"),
    callbackData: paymentCallbackData(input.callbackData),
  });
}

/**
 * Domain states of a verification. Gateway states are mapped to these inside the Adapter.
 *  - SUCCESS: the gateway confirms the payment. `verifiedAmount` is present.
 *  - FAILED:  the gateway confirms the payment did not happen.
 *  - PENDING: the result is not final yet (or cannot be known now). Not success, not failure.
 * A gateway answer for a payment that was already verified (for example ZarinPal code 101) is the
 * same facts again: the Adapter returns `SUCCESS`. Duplicate handling is the Service's idempotency.
 */
export const PAYMENT_VERIFICATION_STATUSES = ["SUCCESS", "FAILED", "PENDING"] as const;
export type PaymentVerificationStatus = (typeof PAYMENT_VERIFICATION_STATUSES)[number];

export type PaymentVerificationResult =
  | Readonly<{
      status: "SUCCESS";
      providerPaymentId: ProviderPaymentId;
      /** Reference for the financial record. */
      providerReference?: ProviderReference;
      /** Amount the gateway confirms, converted back to Money (TOMAN) by the Adapter. */
      verifiedAmount: Money;
    }>
  | Readonly<{
      status: "FAILED" | "PENDING";
      providerPaymentId: ProviderPaymentId;
      providerReference?: ProviderReference;
    }>;

export function paymentVerificationResult(
  input:
    | { status: "SUCCESS"; providerPaymentId: string; providerReference?: string; verifiedAmount: Money }
    | { status: "FAILED" | "PENDING"; providerPaymentId: string; providerReference?: string },
): PaymentVerificationResult {
  const id = providerPaymentId(input.providerPaymentId);
  const reference = input.providerReference === undefined ? undefined : providerReference(input.providerReference);
  if (!(PAYMENT_VERIFICATION_STATUSES as readonly string[]).includes(input.status)) {
    throw new ValidationError("Invalid verification status");
  }
  if (input.status === "SUCCESS") {
    const verifiedAmount = assertPositiveMoney(input.verifiedAmount, "Verified amount");
    return Object.freeze(
      reference === undefined
        ? { status: "SUCCESS" as const, providerPaymentId: id, verifiedAmount }
        : { status: "SUCCESS" as const, providerPaymentId: id, providerReference: reference, verifiedAmount },
    );
  }
  if ("verifiedAmount" in input) throw new ValidationError("Only a SUCCESS result carries a verified amount");
  return Object.freeze(
    reference === undefined
      ? { status: input.status, providerPaymentId: id }
      : { status: input.status, providerPaymentId: id, providerReference: reference },
  );
}

/**
 * Defence in depth for the Service Layer: a SUCCESS result must have the expected amount and
 * the same payment ID. Throws `PaymentAmountMismatchError` (`PAYMENT_AMOUNT_MISMATCH`) otherwise.
 * It does nothing for FAILED or PENDING. Pure. No UI comparison.
 */
export function assertVerifiedAmount(request: PaymentVerificationRequest, result: PaymentVerificationResult): void {
  if (result.providerPaymentId !== request.providerPaymentId) {
    throw new PaymentAmountMismatchError("Verification result belongs to a different provider payment ID");
  }
  if (result.status !== "SUCCESS") return;
  if (!equals(result.verifiedAmount, request.expectedAmount)) {
    throw new PaymentAmountMismatchError("Verified amount differs from the expected amount");
  }
}
