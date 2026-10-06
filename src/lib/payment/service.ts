import { ValidationError } from "@/lib/errors";
import type { BusinessOperationId, Money } from "@/lib/money";
import { PaymentInvalidAmountError, PaymentProviderError } from "./errors";
import type { PaymentProvider } from "./provider";
import {
  assertVerifiedAmount,
  paymentCreationResult,
  paymentRequest,
  paymentVerificationRequest,
  paymentVerificationResult,
  type PaymentCreationResult,
  type PaymentVerificationResult,
} from "./values";

/**
 * Domain-level orchestration of a payment (Phase 2F). Pure: no I/O, no ENV, no clock, no storage.
 *
 *   PaymentService → PaymentProvider → Adapter
 *
 * The service owns the provider it receives. It does not find, select or build a provider.
 * Provider errors (`PaymentError` subclasses) pass through unchanged. The service never wraps them.
 *
 * IDEMPOTENCY: this service carries a stable `operationId` (Phase 2D) to the provider contract.
 * It does NOT enforce idempotency. There is no store, so it cannot detect a replay, an
 * in-progress operation or a conflict. Persistence-based enforcement is deferred.
 *
 * CALLBACK: the service never parses callback data. It passes the data to the provider as given.
 * Callback received ≠ payment confirmed. Only `SUCCESS` from the provider plus a matching
 * amount (`assertVerifiedAmount`) counts as a confirmed payment.
 */
export interface PaymentService {
  /** Ask the provider to create a payment. Returns provider-neutral data and a redirect as data. */
  createPayment(input: CreatePaymentInput): Promise<PaymentCreationResult>;

  /**
   * Verify a payment with the provider. `SUCCESS` is returned only when the verified amount and the
   * payment ID match. `FAILED` and `PENDING` are returned as normal results, never as exceptions.
   */
  verifyPayment(input: VerifyPaymentInput): Promise<PaymentVerificationResult>;
}

export type CreatePaymentInput = Readonly<{
  /** Positive TOMAN. Zero, negative and other currencies are rejected. */
  amount: Money;
  operationId: BusinessOperationId;
  callbackUrl: string;
  description?: string;
}>;

export type VerifyPaymentInput = Readonly<{
  providerPaymentId: string;
  /** Positive TOMAN the caller expects. */
  expectedAmount: Money;
  /** Opaque data from the customer's browser. The service does not read its keys. */
  callbackData: Readonly<Record<string, string | undefined>>;
}>;

/** A provider answer that breaks the contract is a provider fault, not a caller fault. */
function checkedProviderAnswer<T>(build: () => T, what: string): T {
  try {
    return build();
  } catch (cause) {
    if (cause instanceof ValidationError || cause instanceof PaymentInvalidAmountError) throw new PaymentProviderError(`Provider returned an invalid ${what}`, cause);
    throw cause;
  }
}

export function createPaymentService(provider: PaymentProvider): PaymentService {
  return Object.freeze({
    async createPayment(input: CreatePaymentInput): Promise<PaymentCreationResult> {
      const request = paymentRequest(input);
      const created = await provider.createPayment(request);
      const result = checkedProviderAnswer(() => paymentCreationResult(created), "creation result");
      if (result.provider !== provider.id) {
        throw new PaymentProviderError("Creation result belongs to a different provider");
      }
      return result;
    },

    async verifyPayment(input: VerifyPaymentInput): Promise<PaymentVerificationResult> {
      const request = paymentVerificationRequest(input);
      const verified = await provider.verifyPayment(request);
      const result = checkedProviderAnswer(() => paymentVerificationResult(verified), "verification result");
      assertVerifiedAmount(request, result);
      return result;
    },
  });
}
