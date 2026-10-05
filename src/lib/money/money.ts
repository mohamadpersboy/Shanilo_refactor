import { DEFAULT_CURRENCY, isCurrency, type Currency } from "./currency";
import { MoneyError } from "./errors";

/**
 * Immutable money value: an integer amount in the smallest unit of `currency`.
 * For TOMAN the smallest unit is 1 Toman.
 *
 * Invariants: `amount` is a safe integer (never a float, NaN or Infinity),
 * `-0` is normalised to `0`. Negative amounts are allowed so that differences
 * can be expressed. Domain types that must be non-negative check this themselves.
 * BSON storage type is decided in Phase 3. Do not assume `number` maps to an integer type.
 */
export type Money = Readonly<{ amount: number; currency: Currency }>;

function checkedInteger(value: number, what: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new MoneyError("MONEY_INVALID_AMOUNT", `${what} must be a finite number`);
  }
  if (!Number.isInteger(value)) {
    throw new MoneyError("MONEY_INVALID_AMOUNT", `${what} must be an integer`);
  }
  if (!Number.isSafeInteger(value)) {
    throw new MoneyError("MONEY_OVERFLOW", `${what} is outside the safe integer range`);
  }
  return value === 0 ? 0 : value; // normalise -0
}

/** Create a Money value. Throws `MoneyError` on a non-integer, unsafe or unknown-currency input. */
export function money(amount: number, currency: Currency = DEFAULT_CURRENCY): Money {
  if (!isCurrency(currency)) {
    throw new MoneyError("MONEY_INVALID_CURRENCY", "Unsupported currency");
  }
  return Object.freeze({ amount: checkedInteger(amount, "Money amount"), currency });
}

export function zero(currency: Currency = DEFAULT_CURRENCY): Money {
  return money(0, currency);
}

function sameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new MoneyError("MONEY_CURRENCY_MISMATCH", `Cannot combine ${a.currency} with ${b.currency}`);
  }
}

/**
 * A float result of safe-integer inputs is exact while it stays inside the safe range.
 * Beyond it, the rounded result is at least 2^53, so `isSafeInteger` still rejects it.
 */
function checkedResult(value: number, currency: Currency): Money {
  if (!Number.isSafeInteger(value)) {
    throw new MoneyError("MONEY_OVERFLOW", "Money arithmetic result is outside the safe integer range");
  }
  return money(value, currency);
}

export function add(a: Money, b: Money): Money {
  sameCurrency(a, b);
  return checkedResult(a.amount + b.amount, a.currency);
}

export function subtract(a: Money, b: Money): Money {
  sameCurrency(a, b);
  return checkedResult(a.amount - b.amount, a.currency);
}

/** Multiply by an integer factor (for example a quantity). Fractions are not allowed here. */
export function multiply(a: Money, factor: number): Money {
  const f = checkedInteger(factor, "Multiplication factor");
  return checkedResult(a.amount * f, a.currency);
}

export function negate(a: Money): Money {
  return money(-a.amount, a.currency);
}

/** Sum a list. An empty list gives zero in `currency`. */
export function sum(values: readonly Money[], currency: Currency = DEFAULT_CURRENCY): Money {
  return values.reduce((total, value) => add(total, value), zero(currency));
}

/** Returns -1, 0 or 1. Throws on different currencies. */
export function compare(a: Money, b: Money): -1 | 0 | 1 {
  sameCurrency(a, b);
  return a.amount < b.amount ? -1 : a.amount > b.amount ? 1 : 0;
}

export function equals(a: Money, b: Money): boolean {
  return a.currency === b.currency && a.amount === b.amount;
}

export function isZero(a: Money): boolean {
  return a.amount === 0;
}

export function isNegative(a: Money): boolean {
  return a.amount < 0;
}
