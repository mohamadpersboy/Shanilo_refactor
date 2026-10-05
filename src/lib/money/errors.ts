import { AppError } from "@/lib/errors";

export type MoneyErrorCode =
  | "MONEY_INVALID_AMOUNT"
  | "MONEY_INVALID_CURRENCY"
  | "MONEY_OVERFLOW"
  | "MONEY_CURRENCY_MISMATCH";

/**
 * Raised when a money invariant is broken. This is a domain/programming error,
 * not user input validation. Status 500 keeps details out of API responses.
 * Phase 2D may reclassify it under the financial error hierarchy.
 */
export class MoneyError extends AppError {
  readonly moneyCode: MoneyErrorCode;

  constructor(moneyCode: MoneyErrorCode, message: string) {
    super(moneyCode, message, 500);
    this.moneyCode = moneyCode;
  }
}
