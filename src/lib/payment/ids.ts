import { ValidationError } from "@/lib/errors";

declare const providerPaymentIdBrand: unique symbol;
declare const providerReferenceBrand: unique symbol;

/** Supported gateways. A plain string union: importing it never imports an implementation. */
export const PAYMENT_PROVIDER_IDS = ["mellat", "zarinpal"] as const;
export type PaymentProviderId = (typeof PAYMENT_PROVIDER_IDS)[number];

export function isPaymentProviderId(value: unknown): value is PaymentProviderId {
  return typeof value === "string" && (PAYMENT_PROVIDER_IDS as readonly string[]).includes(value);
}

export function paymentProviderId(value: string): PaymentProviderId {
  if (!isPaymentProviderId(value)) throw new ValidationError("Unsupported payment provider");
  return value;
}

/** Technical bound against abuse, not a gateway rule. */
export const MAX_PROVIDER_TOKEN_LENGTH = 255;

/**
 * The gateway's identifier of one payment, as an opaque string. ZarinPal's Authority or a Mellat
 * RefId is mapped to it INSIDE the Adapter. It is not a BusinessOperationId, OrderId or PaymentId.
 */
export type ProviderPaymentId = string & { readonly [providerPaymentIdBrand]: true };

/**
 * An extra gateway reference of a confirmed payment (for example a bank reference or trace number),
 * as an opaque string. It is for the financial record. The domain never parses it.
 */
export type ProviderReference = string & { readonly [providerReferenceBrand]: true };

function token(value: unknown, what: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(`${what} must be a non-empty string`);
  }
  if (value.length > MAX_PROVIDER_TOKEN_LENGTH) {
    throw new ValidationError(`${what} must be at most ${MAX_PROVIDER_TOKEN_LENGTH} characters`);
  }
  return value;
}

export function providerPaymentId(value: string): ProviderPaymentId {
  return token(value, "Provider payment ID") as ProviderPaymentId;
}

export function providerReference(value: string): ProviderReference {
  return token(value, "Provider reference") as ProviderReference;
}
