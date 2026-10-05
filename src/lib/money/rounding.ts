import { isCurrency } from "./currency";
import { MoneyError } from "./errors";
import { money, type Money } from "./money";

/**
 * Pure rounding abstraction for Money. A policy never changes the currency
 * and never mutates its input. It has no I/O, no clock and no ENV access.
 */
export interface RoundingPolicy {
  round(amount: Money): Money;
}

/**
 * Single source of truth for the Legacy price rounding rule (OD-11 option A,
 * Legacy `roundPrice` in `helpers_general`, used by `ProductDetail::getPurePriceAttribute`):
 *
 *   |amount| <  SMALL_AMOUNT_THRESHOLD → nearest SMALL_STEP
 *   |amount| >= SMALL_AMOUNT_THRESHOLD → nearest LARGE_STEP
 *
 * The step is chosen from the amount BEFORE rounding. So 99_950 uses the
 * small step and gives 100_000, and 100_499 uses the large step and gives 100_000.
 * All values are in TOMAN.
 */
export const SMALL_AMOUNT_THRESHOLD = 100_000;
export const SMALL_STEP = 100;
export const LARGE_STEP = 1_000;

/**
 * Round a non-negative safe integer to the nearest `step`, ties up (Half-Up).
 * Integer arithmetic only: `%`, `-`, `+` and `*` on safe integers are exact.
 * There is no division, so no float rounding can enter the result.
 */
function roundMagnitudeHalfUp(magnitude: number, step: number): number {
  const remainder = magnitude % step;
  const floorValue = magnitude - remainder;
  const rounded = remainder * 2 >= step ? floorValue + step : floorValue;
  if (!Number.isSafeInteger(rounded)) {
    throw new MoneyError("MONEY_OVERFLOW", "Rounded amount is outside the safe integer range");
  }
  return rounded;
}

/**
 * Legacy rounding policy. TOMAN is the only currency (`Currency` type), and the
 * input currency is carried to the result unchanged.
 *
 * Negative amounts (technical decision for Phase 2B, not a Legacy rule):
 * Legacy `roundPrice` was only used for non-negative prices. Its result for a
 * negative number is an artefact of PHP `substr` on the "-" sign and is not
 * reliable, so it is not preserved. The policy is sign-symmetric:
 * `round(-x) = -round(x)`. The step is chosen from `|amount|`. Ties go away
 * from zero. Example: -12_350 → -12_400, -99_950 → -100_000, -100_500 → -101_000.
 */
export const legacyRoundingPolicy: RoundingPolicy = Object.freeze({
  round(amount: Money): Money {
    // Re-validate: rejects a malformed object, a float, an unsafe integer or an unknown currency.
    if (!isCurrency(amount.currency)) {
      throw new MoneyError("MONEY_INVALID_CURRENCY", "Unsupported currency");
    }
    const checked = money(amount.amount, amount.currency);
    const magnitude = Math.abs(checked.amount);
    const step = magnitude < SMALL_AMOUNT_THRESHOLD ? SMALL_STEP : LARGE_STEP;
    const rounded = roundMagnitudeHalfUp(magnitude, step);
    return money(checked.amount < 0 ? -rounded : rounded, checked.currency);
  },
});

/** Round `amount` with `policy`. The default policy is the Legacy rule. */
export function roundMoney(amount: Money, policy: RoundingPolicy = legacyRoundingPolicy): Money {
  return policy.round(amount);
}
