import { AppError } from "@/lib/errors";

/**
 * Stable codes for the financial error categories added in Phase 2D.
 * Money-level codes (`MONEY_INVALID_AMOUNT`, `MONEY_OVERFLOW`, ...) stay in `MoneyErrorCode`.
 * Do not rename or reuse a code. A client or a log query may depend on it.
 */
export const FINANCIAL_ERROR_CODES = {
  STATE_CONFLICT: "FINANCIAL_STATE_CONFLICT",
  INSUFFICIENT_FUNDS: "FINANCIAL_INSUFFICIENT_FUNDS",
  OPERATION_CONFLICT: "FINANCIAL_OPERATION_CONFLICT",
  IDEMPOTENCY_CONFLICT: "IDEMPOTENCY_CONFLICT",
} as const;

export type FinancialErrorCode = (typeof FINANCIAL_ERROR_CODES)[keyof typeof FINANCIAL_ERROR_CODES];

/**
 * Base class of every financial error. It extends the existing `AppError`, so
 * `toErrorResponse` and the rest of the error handling work unchanged.
 * `MoneyError` extends it too: one hierarchy, one `instanceof FinancialError` check.
 *
 * `message` is the PUBLIC message. It is a fixed text per class, so it is deterministic
 * and cannot carry a stack, a database ID, a provider detail or a secret.
 * Details for logs go in `internalDetail`. Never put `internalDetail` in a response.
 * This module does not import HTTP, MongoDB or Next.js. `status` is only a mapping hint.
 */
export class FinancialError extends AppError {
  readonly internalDetail: string | undefined;

  constructor(code: string, publicMessage: string, status: number, internalDetail?: string, cause?: unknown) {
    super(code, publicMessage, status, cause === undefined ? undefined : { cause });
    this.internalDetail = internalDetail;
  }
}

/** The current state does not allow the operation (for example payment already confirmed). Contract only. No state machine here. */
export class FinancialStateConflictError extends FinancialError {
  constructor(internalDetail?: string, cause?: unknown) {
    super(FINANCIAL_ERROR_CODES.STATE_CONFLICT, "The operation is not allowed in the current state", 409, internalDetail, cause);
  }
}

/** A balance is too low (customer credit, seller wallet). Contract only. No Credit or Wallet code here. */
export class InsufficientFundsError extends FinancialError {
  constructor(internalDetail?: string, cause?: unknown) {
    super(FINANCIAL_ERROR_CODES.INSUFFICIENT_FUNDS, "Insufficient funds", 422, internalDetail, cause);
  }
}

/** A business operation conflicts with another operation. This is NOT an idempotency conflict. */
export class OperationConflictError extends FinancialError {
  constructor(internalDetail?: string, cause?: unknown) {
    super(FINANCIAL_ERROR_CODES.OPERATION_CONFLICT, "The operation conflicts with another operation", 409, internalDetail, cause);
  }
}

/** The same business operation ID was sent again with a different payload. This is not a retry. */
export class IdempotencyConflictError extends FinancialError {
  constructor(internalDetail?: string, cause?: unknown) {
    super(
      FINANCIAL_ERROR_CODES.IDEMPOTENCY_CONFLICT,
      "The operation ID was already used with a different request",
      409,
      internalDetail,
      cause,
    );
  }
}
