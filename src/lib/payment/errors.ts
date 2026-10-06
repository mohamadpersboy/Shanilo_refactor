import { FinancialError } from "@/lib/money";

/**
 * Stable, provider-neutral payment error codes. Gateway-specific codes (Mellat, ZarinPal)
 * never appear here. An Adapter keeps them in `internalDetail` only, and maps them to one of these.
 *
 * Not included on purpose:
 *  - verification failed: a normal result (`status: "FAILED"`), not an exception.
 *  - already verified: a duplicate verification is a Service/idempotency state (`FinancialStateConflictError`,
 *    or a `SUCCESS` result with the same facts). It needs no payment-specific code.
 */
export const PAYMENT_ERROR_CODES = {
  PROVIDER_ERROR: "PAYMENT_PROVIDER_ERROR",
  PROVIDER_UNAVAILABLE: "PAYMENT_PROVIDER_UNAVAILABLE",
  INVALID_AMOUNT: "PAYMENT_INVALID_AMOUNT",
  NOT_FOUND: "PAYMENT_NOT_FOUND",
  AMOUNT_MISMATCH: "PAYMENT_AMOUNT_MISMATCH",
} as const;

export type PaymentErrorCode = (typeof PAYMENT_ERROR_CODES)[keyof typeof PAYMENT_ERROR_CODES];

/**
 * Base of payment errors: AppError → FinancialError → PaymentError.
 * Public `message` is fixed per class. Raw gateway text, codes, URLs and credentials go only in
 * `internalDetail`, which must never reach a response. `status` is a mapping hint, not HTTP code.
 */
export class PaymentError extends FinancialError {
  constructor(code: PaymentErrorCode, publicMessage: string, status: number, internalDetail?: string, cause?: unknown) {
    super(code, publicMessage, status, internalDetail, cause);
  }
}

/** The gateway answered, but the answer is an error or cannot be understood. */
export class PaymentProviderError extends PaymentError {
  constructor(internalDetail?: string, cause?: unknown) {
    super(PAYMENT_ERROR_CODES.PROVIDER_ERROR, "The payment provider returned an error", 502, internalDetail, cause);
  }
}

/** The gateway could not be reached or is down. */
export class PaymentProviderUnavailableError extends PaymentError {
  constructor(internalDetail?: string, cause?: unknown) {
    super(PAYMENT_ERROR_CODES.PROVIDER_UNAVAILABLE, "The payment provider is unavailable", 503, internalDetail, cause);
  }
}

/** The payment amount is not a valid positive Money value. */
export class PaymentInvalidAmountError extends PaymentError {
  constructor(internalDetail?: string, cause?: unknown) {
    super(PAYMENT_ERROR_CODES.INVALID_AMOUNT, "Invalid payment amount", 400, internalDetail, cause);
  }
}

/** The gateway does not know this payment. */
export class PaymentNotFoundError extends PaymentError {
  constructor(internalDetail?: string, cause?: unknown) {
    super(PAYMENT_ERROR_CODES.NOT_FOUND, "Payment not found", 404, internalDetail, cause);
  }
}

/** The verified amount differs from the expected amount. */
export class PaymentAmountMismatchError extends PaymentError {
  constructor(internalDetail?: string, cause?: unknown) {
    super(PAYMENT_ERROR_CODES.AMOUNT_MISMATCH, "Payment amount does not match the expected amount", 422, internalDetail, cause);
  }
}
