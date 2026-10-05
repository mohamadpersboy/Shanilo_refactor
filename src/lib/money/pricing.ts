import { isCurrency, type Currency } from "./currency";
import { MoneyError } from "./errors";
import { add, money, multiply, sum, type Money } from "./money";
import { legacyRoundingPolicy, type RoundingPolicy } from "./rounding";
import { calculateTax, type TaxPolicy } from "./tax";

/** Input for one line. Generic: it does not depend on a Product or Order model. */
export type PriceLineInput = Readonly<{
  /** Price of one unit before discount. Must not be negative. */
  unitPrice: Money;
  /** Whole percent, 0 to 100. Legacy used an integer percent (`(int) $percent`). */
  discountPercent: number;
  /** Positive safe integer. */
  quantity: number;
}>;

export type PriceLine = Readonly<{
  unitPrice: Money;
  discountPercent: number;
  finalUnitPrice: Money;
  quantity: number;
  lineTotal: Money;
}>;

/** The policy values that produced a calculation. Primitive values only. */
export type PolicySnapshot = Readonly<{
  taxEnabled: boolean;
  taxRateBps: number;
  roundingPolicyVersion: string;
  currency: Currency;
}>;

export type PriceCalculation = Readonly<{
  currency: Currency;
  lines: readonly PriceLine[];
  /** Σ lineTotal. Not rounded again. */
  subtotal: Money;
  /** Gross (Σ unitPrice × quantity) minus subtotal. It includes the effect of rounding, so it can be negative. */
  discount: Money;
  tax: Money;
  /** Independent input. Never derived from the subtotal and never rounded here. */
  shipping: Money;
  /** subtotal + tax + shipping. No second rounding. */
  total: Money;
  policy: PolicySnapshot;
}>;

export type PriceCalculationInput = Readonly<{
  lines: readonly PriceLineInput[];
  shipping: Money;
  taxPolicy: TaxPolicy;
  roundingPolicy?: RoundingPolicy;
}>;

function invalid(message: string): MoneyError {
  return new MoneyError("MONEY_INVALID_AMOUNT", message);
}

function assertNonNegative(value: Money, what: string): Money {
  if (!isCurrency(value.currency)) {
    throw new MoneyError("MONEY_INVALID_CURRENCY", "Unsupported currency");
  }
  const checked = money(value.amount, value.currency);
  if (checked.amount < 0) throw invalid(`${what} must not be negative`);
  return checked;
}

function assertDiscountPercent(percent: number): number {
  if (!Number.isSafeInteger(percent) || percent < 0 || percent > 100) {
    throw invalid("Discount percent must be an integer from 0 to 100");
  }
  return percent;
}

function assertQuantity(quantity: number): number {
  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    throw invalid("Quantity must be a positive integer");
  }
  return quantity;
}

/**
 * One line (M-04): discount → round the UNIT price → lineTotal = rounded unit × quantity.
 *
 * The unit price after discount is floor(price × (100 − percent) / 100). Legacy
 * `subPercent` then `roundPrice` floors the same value before rounding. BigInt keeps
 * `price × (100 − percent)` exact. The result is never above `price`, so it is a safe integer.
 * Zero-price after rounding is a Phase 8 decision. It is not handled here.
 */
export function calculateLine(input: PriceLineInput, rounding: RoundingPolicy = legacyRoundingPolicy): PriceLine {
  const unitPrice = assertNonNegative(input.unitPrice, "Unit price");
  const discountPercent = assertDiscountPercent(input.discountPercent);
  const quantity = assertQuantity(input.quantity);

  const discounted = (BigInt(unitPrice.amount) * BigInt(100 - discountPercent)) / 100n;
  const finalUnitPrice = rounding.round(money(Number(discounted), unitPrice.currency));
  const lineTotal = multiply(finalUnitPrice, quantity); // throws MONEY_OVERFLOW instead of a wrong value

  return Object.freeze({ unitPrice, discountPercent, finalUnitPrice, quantity, lineTotal });
}

/**
 * Pure price calculation (M-04):
 * lines → subtotal = Σ lineTotal → tax = round(subtotal × rateBps / 10_000)
 * → total = subtotal + tax + shipping. Total is not rounded again.
 * Every Money must have the currency of `shipping`, or `MONEY_CURRENCY_MISMATCH` is thrown.
 */
export function calculatePrice(input: PriceCalculationInput): PriceCalculation {
  const rounding = input.roundingPolicy ?? legacyRoundingPolicy;
  const shipping = assertNonNegative(input.shipping, "Shipping");
  const { currency } = shipping;

  const lines = input.lines.map((line) => calculateLine(line, rounding));
  const subtotal = sum(
    lines.map((line) => line.lineTotal),
    currency,
  );
  let gross = money(0, currency);
  for (const line of lines) gross = add(gross, multiply(line.unitPrice, line.quantity));
  const discount = add(gross, money(-subtotal.amount, currency));

  const tax = calculateTax(subtotal, input.taxPolicy, rounding);
  const total = add(add(subtotal, tax), shipping);

  return Object.freeze({
    currency,
    lines: Object.freeze(lines),
    subtotal,
    discount,
    tax,
    shipping,
    total,
    policy: Object.freeze({
      taxEnabled: input.taxPolicy.enabled,
      taxRateBps: input.taxPolicy.rateBps,
      roundingPolicyVersion: rounding.version,
      currency,
    }),
  });
}
