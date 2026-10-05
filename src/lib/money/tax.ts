import { isCurrency } from "./currency";
import { MoneyError } from "./errors";
import { money, type Money } from "./money";
import { legacyRoundingPolicy, type RoundingPolicy } from "./rounding";

/** 10_000 basis points = 100%. 1_000 bps = 10%. 1_250 bps = 12.5%. */
export const BASIS_POINTS_DENOMINATOR = 10_000;
/** MVP upper bound: a tax above 100% of the subtotal is rejected. */
export const MAX_TAX_RATE_BPS = BASIS_POINTS_DENOMINATOR;

/**
 * Immutable tax configuration. It carries NO default rate: the real rate is an
 * open owner decision (OD-07 B). The caller supplies it.
 * `enabled = false` always means tax 0. The rate is still validated and kept,
 * so a snapshot can record the configured value.
 */
export type TaxPolicy = Readonly<{ enabled: boolean; rateBps: number }>;

function assertValidTaxPolicy(policy: TaxPolicy): void {
  if (typeof policy !== "object" || policy === null || typeof policy.enabled !== "boolean") {
    throw new MoneyError("MONEY_INVALID_AMOUNT", "Tax policy `enabled` must be a boolean");
  }
  const { rateBps } = policy;
  if (typeof rateBps !== "number" || !Number.isSafeInteger(rateBps)) {
    throw new MoneyError("MONEY_INVALID_AMOUNT", "Tax rate must be an integer number of basis points");
  }
  if (rateBps < 0 || rateBps > MAX_TAX_RATE_BPS) {
    throw new MoneyError("MONEY_INVALID_AMOUNT", `Tax rate must be between 0 and ${MAX_TAX_RATE_BPS} basis points`);
  }
}

/** Create a validated, frozen TaxPolicy. An invalid state is rejected here, not later. */
export function taxPolicy(enabled: boolean, rateBps: number): TaxPolicy {
  const policy = { enabled, rateBps };
  assertValidTaxPolicy(policy);
  return Object.freeze(policy);
}

/**
 * Tax for a non-negative `subtotal`:
 *
 *   taxRaw = floor(subtotal × rateBps / 10_000)   (exact integer arithmetic)
 *   tax    = rounding.round(taxRaw)               (the same RoundingPolicy as prices)
 *
 * `subtotal × rateBps` can pass `Number.MAX_SAFE_INTEGER`, so it is computed in
 * BigInt. The BigInt value never leaves this function. Because `rateBps <= 10_000`,
 * `taxRaw <= subtotal`, so it is always a safe integer. Flooring first does not
 * change the result: every rounding tie is an integer, so a fraction cannot cross one.
 * Rounding up near `MAX_SAFE_INTEGER` can overflow and raises `MONEY_OVERFLOW`.
 */
export function calculateTax(
  subtotal: Money,
  policy: TaxPolicy,
  rounding: RoundingPolicy = legacyRoundingPolicy,
): Money {
  assertValidTaxPolicy(policy);
  if (!isCurrency(subtotal.currency)) {
    throw new MoneyError("MONEY_INVALID_CURRENCY", "Unsupported currency");
  }
  const checked = money(subtotal.amount, subtotal.currency);
  if (checked.amount < 0) {
    throw new MoneyError("MONEY_INVALID_AMOUNT", "Subtotal must not be negative");
  }
  if (!policy.enabled || policy.rateBps === 0) {
    return money(0, checked.currency);
  }
  const raw = (BigInt(checked.amount) * BigInt(policy.rateBps)) / BigInt(BASIS_POINTS_DENOMINATOR);
  return rounding.round(money(Number(raw), checked.currency));
}
