/**
 * Supported currencies. Shanilo stores and calculates every amount in TOMAN.
 * Toman→Rial conversion belongs only inside a payment provider adapter (Phase 12).
 */
export const CURRENCIES = ["TOMAN"] as const;

export type Currency = (typeof CURRENCIES)[number];

export const DEFAULT_CURRENCY: Currency = "TOMAN";

export function isCurrency(value: unknown): value is Currency {
  return typeof value === "string" && (CURRENCIES as readonly string[]).includes(value);
}
