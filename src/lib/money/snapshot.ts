import { MoneyError } from "./errors";
import { add, equals, money, multiply, sum, zero, type Money } from "./money";
import type { PolicySnapshot, PriceCalculation, PriceLine } from "./pricing";

/** One line of the historical order. Value-based and frozen. */
export type LineFinancialSnapshot = Readonly<{
  unitPrice: Money;
  discountPercent: number;
  finalUnitPrice: Money;
  quantity: number;
  lineTotal: Money;
}>;

/**
 * Immutable financial record of an order at creation time. It holds values only:
 * no reference to a Product or to a live policy object. It can be rebuilt from itself.
 *
 * Not in this type on purpose:
 *  - `refundedAmount`: mutable financial state. Refund design belongs to a later phase.
 *  - Seller Payable, Wallet and Settlement: Phase 12. A successful payment must not
 *    raise a Seller Wallet directly (M-09, M-10).
 *  - BSON or storage types: Phase 3.
 *
 * Invariants: `total = subtotal + tax + shipping` and `paymentAmount = total` (M-06).
 */
export type FinancialSnapshot = Readonly<{
  currency: PolicySnapshot["currency"];
  lines: readonly LineFinancialSnapshot[];
  subtotal: Money;
  discount: Money;
  tax: Money;
  shipping: Money;
  total: Money;
  paidAmount: Money;
  policy: PolicySnapshot;
}>;

function fail(message: string): MoneyError {
  return new MoneyError("MONEY_INVALID_AMOUNT", message);
}

function copyMoney(value: Money): Money {
  return money(value.amount, value.currency);
}

function copyLine(line: PriceLine): LineFinancialSnapshot {
  const unitPrice = copyMoney(line.unitPrice);
  const finalUnitPrice = copyMoney(line.finalUnitPrice);
  const lineTotal = copyMoney(line.lineTotal);
  if (!equals(lineTotal, multiply(finalUnitPrice, line.quantity))) {
    throw fail("Line total must equal final unit price × quantity");
  }
  return Object.freeze({
    unitPrice,
    discountPercent: line.discountPercent,
    finalUnitPrice,
    quantity: line.quantity,
    lineTotal,
  });
}

/**
 * Build a snapshot from a calculation. Every value is copied, so a later change to
 * the inputs cannot change the snapshot. `paidAmount` defaults to zero (not paid yet);
 * it must not be negative and must not be above `total`. The calculation is
 * re-checked, so an inconsistent object is rejected and not stored.
 */
export function createFinancialSnapshot(
  calculation: PriceCalculation,
  paidAmount: Money = zero(calculation.currency),
): FinancialSnapshot {
  const lines = calculation.lines.map(copyLine);
  const subtotal = copyMoney(calculation.subtotal);
  const tax = copyMoney(calculation.tax);
  const shipping = copyMoney(calculation.shipping);
  const total = copyMoney(calculation.total);
  const paid = copyMoney(paidAmount);

  if (!equals(subtotal, sum(lines.map((line) => line.lineTotal), calculation.currency))) {
    throw fail("Subtotal must equal the sum of line totals");
  }
  if (!equals(total, add(add(subtotal, tax), shipping))) {
    throw fail("Total must equal subtotal + tax + shipping");
  }
  if (paid.amount < 0 || paid.amount > total.amount) {
    throw fail("Paid amount must be between zero and the total");
  }
  if (paid.currency !== calculation.currency) {
    throw new MoneyError("MONEY_CURRENCY_MISMATCH", "Paid amount currency differs from the order currency");
  }

  return Object.freeze({
    currency: calculation.currency,
    lines: Object.freeze(lines),
    subtotal,
    discount: copyMoney(calculation.discount),
    tax,
    shipping,
    total,
    paidAmount: paid,
    policy: Object.freeze({
      taxEnabled: calculation.policy.taxEnabled,
      taxRateBps: calculation.policy.taxRateBps,
      roundingPolicyVersion: calculation.policy.roundingPolicyVersion,
      currency: calculation.policy.currency,
    }),
  });
}

/** The amount to send to a payment provider is always the order total (M-06). */
export function paymentAmount(snapshot: FinancialSnapshot): Money {
  return snapshot.total;
}
