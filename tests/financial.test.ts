import { describe, expect, it } from "vitest";
import {
  LEGACY_ROUNDING_POLICY_VERSION,
  MAX_TAX_RATE_BPS,
  MoneyError,
  calculateLine,
  calculatePrice,
  calculateTax,
  createFinancialSnapshot,
  legacyRoundingPolicy,
  money,
  paymentAmount,
  roundMoney,
  taxPolicy,
  type RoundingPolicy,
  type TaxPolicy,
} from "@/lib/money";

const MAX = Number.MAX_SAFE_INTEGER;
const m = (amount: number) => money(amount);

function codeOf(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (e) {
    return e instanceof MoneyError ? e.moneyCode : `other:${String(e)}`;
  }
  return undefined;
}

// rateBps used only inside tests. It is NOT a business rate.
const tax = (rateBps: number, enabled = true) => taxPolicy(enabled, rateBps);
const taxOf = (subtotal: number, rateBps: number, enabled = true) =>
  calculateTax(m(subtotal), tax(rateBps, enabled)).amount;

describe("TaxPolicy", () => {
  it("accepts valid rates and freezes the policy", () => {
    const p = taxPolicy(true, 1_000);
    expect(p).toEqual({ enabled: true, rateBps: 1_000 });
    expect(Object.isFrozen(p)).toBe(true);
  });

  it("accepts the boundaries 0 and 10000", () => {
    expect(taxPolicy(true, 0).rateBps).toBe(0);
    expect(taxPolicy(true, MAX_TAX_RATE_BPS).rateBps).toBe(10_000);
  });

  it("accepts a disabled policy with rate 0 or a kept rate", () => {
    expect(taxPolicy(false, 0).enabled).toBe(false);
    expect(taxPolicy(false, 1_000).rateBps).toBe(1_000);
  });

  it("rejects a negative rate, a rate above 10000 and non-integers", () => {
    expect(codeOf(() => taxPolicy(true, -1))).toBe("MONEY_INVALID_AMOUNT");
    expect(codeOf(() => taxPolicy(true, 10_001))).toBe("MONEY_INVALID_AMOUNT");
    expect(codeOf(() => taxPolicy(true, 12.5))).toBe("MONEY_INVALID_AMOUNT");
    expect(codeOf(() => taxPolicy(true, Number.NaN))).toBe("MONEY_INVALID_AMOUNT");
    expect(codeOf(() => taxPolicy(true, Infinity))).toBe("MONEY_INVALID_AMOUNT");
    expect(codeOf(() => taxPolicy(false, 10_001))).toBe("MONEY_INVALID_AMOUNT");
  });

  it("rejects a forged policy object at calculation time", () => {
    const forged = { enabled: true, rateBps: 20_000 } as TaxPolicy;
    expect(codeOf(() => calculateTax(m(1_000), forged))).toBe("MONEY_INVALID_AMOUNT");
    const notBool = { enabled: "yes", rateBps: 100 } as unknown as TaxPolicy;
    expect(codeOf(() => calculateTax(m(1_000), notBool))).toBe("MONEY_INVALID_AMOUNT");
  });
});

describe("calculateTax", () => {
  it.each([
    [100_000, 1_000, 10_000],
    [12_300, 1_000, 1_200], // raw 1_230 → nearest 100
    [99_950, 1_000, 10_000], // raw 9_995 → 10_000
    [1_000_000, 1_250, 125_000],
  ])("subtotal %i at %i bps → %i", (subtotal, bps, expected) => {
    expect(taxOf(subtotal, bps)).toBe(expected);
  });

  it("rounds a raw tax below 100,000 to the nearest 100", () => {
    expect(taxOf(999_499, 1_000)).toBe(99_900); // raw 99_949
    expect(taxOf(999_500, 1_000)).toBe(100_000); // raw 99_950
  });

  it("uses the small step below 100,000 and the large step from 100,000 raw tax", () => {
    expect(taxOf(999_990, 1_000)).toBe(100_000); // raw 99_999 → 100_000
    expect(taxOf(1_000_004, 1_000)).toBe(100_000); // raw 100_000 (floor) → 100_000
    expect(taxOf(1_005_000, 1_000)).toBe(101_000); // raw 100_500 → 101_000
    expect(taxOf(1_004_990, 1_000)).toBe(100_000); // raw 100_499 → 100_000
  });

  it("matches RoundingPolicy applied to the exact raw value", () => {
    for (const bps of [1, 250, 999, 1_000, 1_250, 3_333, 10_000]) {
      for (let subtotal = 0; subtotal <= 400_000; subtotal += 997) {
        const raw = Math.floor((subtotal * bps) / 10_000); // safe: small values
        expect(taxOf(subtotal, bps)).toBe(roundMoney(m(raw)).amount);
      }
    }
  });

  it("zero tax: enabled with rate 0 gives 0", () => {
    expect(taxOf(500_000, 0)).toBe(0);
  });

  it("disabled tax gives 0 even with a rate", () => {
    expect(taxOf(500_000, 1_000, false)).toBe(0);
  });

  it("zero subtotal gives 0 and never -0", () => {
    expect(Object.is(taxOf(0, 1_000), 0)).toBe(true);
  });

  it("is exact where subtotal × rate passes MAX_SAFE_INTEGER", () => {
    // MAX × 9_999 is far above 2^53. Independent exact computation of floor(MAX × 9999 / 10000).
    const expectedRaw = Math.floor(MAX / 10_000) * 9_999 + Math.floor(((MAX % 10_000) * 9_999) / 10_000);
    const identity: RoundingPolicy = { version: "identity-test", round: (x) => x };
    expect(calculateTax(m(MAX), tax(9_999), identity).amount).toBe(expectedRaw);
    expect(Number.isSafeInteger(expectedRaw)).toBe(true);
  });

  it("overflow: rounding the raw tax up past the safe range throws MONEY_OVERFLOW", () => {
    expect(codeOf(() => calculateTax(m(MAX), tax(10_000)))).toBe("MONEY_OVERFLOW");
  });

  it("rejects a negative subtotal and a bad Money", () => {
    expect(codeOf(() => calculateTax(m(-1), tax(1_000)))).toBe("MONEY_INVALID_AMOUNT");
    const bad = { amount: 1.5, currency: "TOMAN" } as unknown as ReturnType<typeof money>;
    expect(codeOf(() => calculateTax(bad, tax(1_000)))).toBe("MONEY_INVALID_AMOUNT");
  });

  it("does not round the subtotal first", () => {
    // subtotal 12_345 is not a multiple of 100. raw = floor(1_234.5) = 1_234 → 1_200.
    expect(taxOf(12_345, 1_000)).toBe(1_200);
  });
});

describe("calculateLine", () => {
  it("no discount: the unit price is still rounded (Legacy behaviour)", () => {
    const line = calculateLine({ unitPrice: m(12_349), discountPercent: 0, quantity: 1 });
    expect(line.finalUnitPrice.amount).toBe(12_300);
    expect(line.lineTotal.amount).toBe(12_300);
  });

  it("applies the discount, then rounds the unit price", () => {
    // 123_456 − 10% → floor(111_110.4) = 111_110 → nearest 1000 → 111_000
    const line = calculateLine({ unitPrice: m(123_456), discountPercent: 10, quantity: 1 });
    expect(line.finalUnitPrice.amount).toBe(111_000);
  });

  it("line total = rounded unit price × quantity (not rounded after the multiplication)", () => {
    const line = calculateLine({ unitPrice: m(12_349), discountPercent: 0, quantity: 3 });
    expect(line.finalUnitPrice.amount).toBe(12_300);
    expect(line.lineTotal.amount).toBe(36_900);
    const q1 = calculateLine({ unitPrice: m(12_349), discountPercent: 0, quantity: 1 });
    expect(q1.lineTotal.amount).toBe(12_300);
  });

  it("100% discount gives 0", () => {
    expect(calculateLine({ unitPrice: m(50_000), discountPercent: 100, quantity: 2 }).lineTotal.amount).toBe(0);
  });

  it("matches the Legacy formula floor(price − price × percent / 100) then roundPrice", () => {
    for (const price of [1_000, 12_349, 99_999, 100_001, 250_500, 1_234_567]) {
      for (const percent of [0, 1, 5, 10, 33, 50, 99, 100]) {
        const legacyDiscounted = Math.floor(price - (price * percent) / 100);
        const expected = roundMoney(m(legacyDiscounted)).amount;
        expect(calculateLine({ unitPrice: m(price), discountPercent: percent, quantity: 1 }).finalUnitPrice.amount).toBe(
          expected,
        );
      }
    }
  });

  it("rejects an invalid quantity", () => {
    for (const quantity of [0, -1, 1.5, Number.NaN, Infinity, 2 ** 53]) {
      expect(codeOf(() => calculateLine({ unitPrice: m(1_000), discountPercent: 0, quantity }))).toBe(
        "MONEY_INVALID_AMOUNT",
      );
    }
  });

  it("rejects an invalid discount percent and a negative unit price", () => {
    for (const discountPercent of [-1, 101, 12.5, Number.NaN]) {
      expect(codeOf(() => calculateLine({ unitPrice: m(1_000), discountPercent, quantity: 1 }))).toBe(
        "MONEY_INVALID_AMOUNT",
      );
    }
    expect(codeOf(() => calculateLine({ unitPrice: m(-1_000), discountPercent: 0, quantity: 1 }))).toBe(
      "MONEY_INVALID_AMOUNT",
    );
  });

  it("line total overflow throws MONEY_OVERFLOW", () => {
    expect(codeOf(() => calculateLine({ unitPrice: m(1_000_000_000_000), discountPercent: 0, quantity: 10_000_000 }))).toBe(
      "MONEY_OVERFLOW",
    );
  });
});

describe("calculatePrice", () => {
  const noTax = taxPolicy(false, 0);

  it("no discount, quantity 1, no shipping", () => {
    const c = calculatePrice({
      lines: [{ unitPrice: m(200_000), discountPercent: 0, quantity: 1 }],
      shipping: m(0),
      taxPolicy: noTax,
    });
    expect(c.subtotal.amount).toBe(200_000);
    expect(c.tax.amount).toBe(0);
    expect(c.shipping.amount).toBe(0);
    expect(c.total.amount).toBe(200_000);
    expect(c.discount.amount).toBe(0);
  });

  it("several lines: subtotal is the sum of line totals", () => {
    const c = calculatePrice({
      lines: [
        { unitPrice: m(150_000), discountPercent: 10, quantity: 2 }, // 135_000 × 2
        { unitPrice: m(12_349), discountPercent: 0, quantity: 3 }, // 12_300 × 3
      ],
      shipping: m(30_000),
      taxPolicy: noTax,
    });
    expect(c.lines.map((l) => l.lineTotal.amount)).toEqual([270_000, 36_900]);
    expect(c.subtotal.amount).toBe(306_900);
    expect(c.total.amount).toBe(336_900);
  });

  it("discount is gross minus subtotal", () => {
    const c = calculatePrice({
      lines: [{ unitPrice: m(200_000), discountPercent: 10, quantity: 2 }],
      shipping: m(0),
      taxPolicy: noTax,
    });
    expect(c.discount.amount).toBe(40_000);
  });

  it("total = subtotal + tax + shipping with NO second rounding", () => {
    const c = calculatePrice({
      lines: [{ unitPrice: m(123_000), discountPercent: 0, quantity: 1 }],
      shipping: m(12_345), // not a multiple of 100: stays as given
      taxPolicy: tax(1_000),
    });
    expect(c.subtotal.amount).toBe(123_000);
    expect(c.tax.amount).toBe(12_300); // raw 12_300 is already a multiple of 100
    expect(c.shipping.amount).toBe(12_345);
    expect(c.total.amount).toBe(123_000 + 12_300 + 12_345);
    expect(c.total.amount).not.toBe(roundMoney(m(c.total.amount)).amount);
  });

  it("shipping is independent: not a percentage and not rounded", () => {
    const base = { lines: [{ unitPrice: m(500_000), discountPercent: 0, quantity: 1 }], taxPolicy: noTax };
    expect(calculatePrice({ ...base, shipping: m(0) }).total.amount).toBe(500_000);
    expect(calculatePrice({ ...base, shipping: m(777) }).total.amount).toBe(500_777);
  });

  it("disabled tax gives tax 0 and records the configured rate", () => {
    const c = calculatePrice({
      lines: [{ unitPrice: m(500_000), discountPercent: 0, quantity: 1 }],
      shipping: m(0),
      taxPolicy: tax(1_000, false),
    });
    expect(c.tax.amount).toBe(0);
    expect(c.policy).toMatchObject({ taxEnabled: false, taxRateBps: 1_000 });
  });

  it("records the policy that was used, including the rounding version", () => {
    const c = calculatePrice({ lines: [], shipping: m(0), taxPolicy: tax(1_250) });
    expect(c.policy).toEqual({
      taxEnabled: true,
      taxRateBps: 1_250,
      roundingPolicyVersion: LEGACY_ROUNDING_POLICY_VERSION,
      currency: "TOMAN",
    });
    expect(c.subtotal.amount).toBe(0);
    expect(c.total.amount).toBe(0);
  });

  it("uses a custom RoundingPolicy everywhere and records its version", () => {
    const floorTo1000: RoundingPolicy = {
      version: "floor-1000-test",
      round: (x) => money(Math.floor(x.amount / 1_000) * 1_000, x.currency),
    };
    const c = calculatePrice({
      lines: [{ unitPrice: m(12_999), discountPercent: 0, quantity: 1 }],
      shipping: m(0),
      taxPolicy: tax(1_000),
      roundingPolicy: floorTo1000,
    });
    expect(c.lines[0]?.finalUnitPrice.amount).toBe(12_000);
    expect(c.tax.amount).toBe(1_000);
    expect(c.policy.roundingPolicyVersion).toBe("floor-1000-test");
  });

  it("returns frozen values and does not mutate its input", () => {
    const input = {
      lines: [{ unitPrice: m(12_349), discountPercent: 5, quantity: 2 }],
      shipping: m(1_000),
      taxPolicy: tax(1_000),
    };
    const copy = JSON.stringify(input);
    const c = calculatePrice(input);
    expect(JSON.stringify(input)).toBe(copy);
    expect(Object.isFrozen(c)).toBe(true);
    expect(Object.isFrozen(c.lines)).toBe(true);
    expect(Object.isFrozen(c.lines[0])).toBe(true);
    expect(Object.isFrozen(c.policy)).toBe(true);
  });

  it("is deterministic", () => {
    const input = {
      lines: [{ unitPrice: m(98_765), discountPercent: 7, quantity: 4 }],
      shipping: m(15_000),
      taxPolicy: tax(900),
    };
    expect(calculatePrice(input)).toEqual(calculatePrice(input));
  });

  it("rejects negative shipping", () => {
    expect(codeOf(() => calculatePrice({ lines: [], shipping: m(-1), taxPolicy: noTax }))).toBe("MONEY_INVALID_AMOUNT");
  });

  it("overflow: subtotal sum", () => {
    const big = { unitPrice: m(4_000_000_000_000_000), discountPercent: 0, quantity: 1 };
    expect(codeOf(() => calculatePrice({ lines: [big, big, big], shipping: m(0), taxPolicy: noTax }))).toBe("MONEY_OVERFLOW");
  });

  it("overflow: line total", () => {
    expect(
      codeOf(() =>
        calculatePrice({
          lines: [{ unitPrice: m(4_000_000_000_000_000), discountPercent: 0, quantity: 3 }],
          shipping: m(0),
          taxPolicy: noTax,
        }),
      ),
    ).toBe("MONEY_OVERFLOW");
  });

  it("overflow: total (subtotal + tax + shipping)", () => {
    expect(
      codeOf(() =>
        calculatePrice({
          lines: [{ unitPrice: m(9_000_000_000_000_000), discountPercent: 0, quantity: 1 }],
          shipping: m(7_199_254_740_992),
          taxPolicy: noTax,
        }),
      ),
    ).toBe("MONEY_OVERFLOW");
  });

  it("overflow: tax rounding near the limit", () => {
    expect(
      codeOf(() =>
        calculatePrice({
          lines: [{ unitPrice: m(MAX - 991), discountPercent: 0, quantity: 1 }],
          shipping: m(0),
          taxPolicy: tax(10_000),
        }),
      ),
    ).toBe("MONEY_OVERFLOW");
  });
});

describe("FinancialSnapshot", () => {
  const build = (paid?: ReturnType<typeof money>) => {
    const calc = calculatePrice({
      lines: [
        { unitPrice: m(150_000), discountPercent: 10, quantity: 2 },
        { unitPrice: m(12_349), discountPercent: 0, quantity: 3 },
      ],
      shipping: m(30_000),
      taxPolicy: tax(1_000),
    });
    return { calc, snap: createFinancialSnapshot(calc, paid) };
  };

  it("holds the complete order and line values", () => {
    const { calc, snap } = build();
    expect(snap.subtotal).toEqual(calc.subtotal);
    expect(snap.discount).toEqual(calc.discount);
    expect(snap.tax).toEqual(calc.tax);
    expect(snap.shipping).toEqual(calc.shipping);
    expect(snap.total).toEqual(calc.total);
    expect(snap.lines).toHaveLength(2);
    expect(Object.keys(snap.lines[0] ?? {}).sort()).toEqual(
      ["discountPercent", "finalUnitPrice", "lineTotal", "quantity", "unitPrice"].sort(),
    );
    expect(snap.lines[0]).toMatchObject({ discountPercent: 10, quantity: 2 });
  });

  it("keeps the currency on every Money", () => {
    const { snap } = build();
    expect(snap.currency).toBe("TOMAN");
    for (const v of [snap.subtotal, snap.discount, snap.tax, snap.shipping, snap.total, snap.paidAmount]) {
      expect(v.currency).toBe("TOMAN");
    }
    for (const l of snap.lines) {
      expect(l.unitPrice.currency).toBe("TOMAN");
      expect(l.finalUnitPrice.currency).toBe("TOMAN");
      expect(l.lineTotal.currency).toBe("TOMAN");
    }
  });

  it("snapshots the tax policy and the rounding policy version", () => {
    const { snap } = build();
    expect(snap.policy).toEqual({
      taxEnabled: true,
      taxRateBps: 1_000,
      roundingPolicyVersion: legacyRoundingPolicy.version,
      currency: "TOMAN",
    });
  });

  it("keeps paidAmount and defaults it to zero", () => {
    expect(build().snap.paidAmount.amount).toBe(0);
    const { calc } = build();
    expect(build(calc.total).snap.paidAmount.amount).toBe(calc.total.amount);
    expect(build(m(1_000)).snap.paidAmount.amount).toBe(1_000);
  });

  it("rejects a paidAmount that is negative or above the total", () => {
    const { calc } = build();
    expect(codeOf(() => createFinancialSnapshot(calc, m(-1)))).toBe("MONEY_INVALID_AMOUNT");
    expect(codeOf(() => createFinancialSnapshot(calc, m(calc.total.amount + 1)))).toBe("MONEY_INVALID_AMOUNT");
  });

  it("has no refundedAmount and no payable/wallet/settlement fields", () => {
    const { snap } = build();
    const keys = Object.keys(snap);
    expect(keys).not.toContain("refundedAmount");
    expect(keys.join(",")).not.toMatch(/refund|payable|wallet|settle|payout|credit/i);
    expect(keys.sort()).toEqual(
      ["currency", "discount", "lines", "paidAmount", "policy", "shipping", "subtotal", "tax", "total"].sort(),
    );
  });

  it("is deeply frozen", () => {
    const { snap } = build();
    expect(Object.isFrozen(snap)).toBe(true);
    expect(Object.isFrozen(snap.lines)).toBe(true);
    expect(Object.isFrozen(snap.lines[0])).toBe(true);
    expect(Object.isFrozen(snap.policy)).toBe(true);
    expect(Object.isFrozen(snap.total)).toBe(true);
    expect(() => {
      (snap as unknown as { total: unknown }).total = m(1);
    }).toThrow();
  });

  it("does not change when the input objects change afterwards", () => {
    const policy = { enabled: true, rateBps: 1_000 };
    const mutableLines = [{ unitPrice: m(100_000), discountPercent: 0, quantity: 1 }];
    const calc = calculatePrice({ lines: mutableLines, shipping: m(0), taxPolicy: policy });
    const before = JSON.stringify(createFinancialSnapshot(calc));
    const snap = createFinancialSnapshot(calc);
    policy.rateBps = 5_000;
    policy.enabled = false;
    mutableLines.push({ unitPrice: m(999_000), discountPercent: 0, quantity: 9 });
    expect(JSON.stringify(snap)).toBe(before);
    expect(snap.policy.taxRateBps).toBe(1_000);
  });

  it("paymentAmount equals order total", () => {
    const { snap } = build();
    expect(paymentAmount(snap)).toEqual(snap.total);
  });

  it("rejects an inconsistent calculation", () => {
    const { calc } = build();
    const badTotal = { ...calc, total: m(calc.total.amount + 1) };
    expect(codeOf(() => createFinancialSnapshot(badTotal))).toBe("MONEY_INVALID_AMOUNT");
    const badSubtotal = { ...calc, subtotal: m(calc.subtotal.amount + 1) };
    expect(codeOf(() => createFinancialSnapshot(badSubtotal))).toBe("MONEY_INVALID_AMOUNT");
    const firstLine = calc.lines[0];
    if (!firstLine) throw new Error("test setup");
    const badLine = { ...calc, lines: [{ ...firstLine, lineTotal: m(1) }, ...calc.lines.slice(1)] };
    expect(codeOf(() => createFinancialSnapshot(badLine))).toBe("MONEY_INVALID_AMOUNT");
  });
});

describe("integration: Money + RoundingPolicy + TaxPolicy + PriceCalculation = FinancialSnapshot", () => {
  it("builds an order snapshot end to end without any database", () => {
    const policy = taxPolicy(true, 1_250);
    const calc = calculatePrice({
      lines: [
        { unitPrice: m(500_000), discountPercent: 20, quantity: 2 }, // 400_000 × 2 = 800_000
        { unitPrice: m(99_950), discountPercent: 0, quantity: 1 }, // 100_000 (rounded up)
        { unitPrice: m(1_049), discountPercent: 0, quantity: 5 }, // 1_000 × 5
      ],
      shipping: m(25_000),
      taxPolicy: policy,
    });
    expect(calc.subtotal.amount).toBe(905_000);
    // raw = floor(905_000 × 1250 / 10000) = 113_125 → nearest 1000 → 113_000
    expect(calc.tax.amount).toBe(113_000);
    expect(calc.total.amount).toBe(905_000 + 113_000 + 25_000);

    const snap = createFinancialSnapshot(calc, calc.total);
    expect(snap.paidAmount).toEqual(snap.total);
    expect(paymentAmount(snap).amount).toBe(1_043_000);
    expect(snap.policy.roundingPolicyVersion).toBe("legacy-v1");
    expect(snap.discount.amount).toBe(
      500_000 * 2 + 99_950 + 1_049 * 5 - 905_000,
    );
  });
});
