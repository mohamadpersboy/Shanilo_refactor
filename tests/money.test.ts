import { describe, expect, it } from "vitest";
import {
  CURRENCIES,
  DEFAULT_CURRENCY,
  MoneyError,
  add,
  compare,
  equals,
  isCurrency,
  isNegative,
  isZero,
  LARGE_STEP,
  SMALL_AMOUNT_THRESHOLD,
  SMALL_STEP,
  legacyRoundingPolicy,
  money,
  multiply,
  negate,
  roundMoney,
  subtract,
  sum,
  zero,
  type Money,
  type RoundingPolicy,
} from "@/lib/money";

const MAX = Number.MAX_SAFE_INTEGER;

function codeOf(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (e) {
    return e instanceof MoneyError ? e.moneyCode : `other:${String(e)}`;
  }
  return undefined;
}

describe("Currency", () => {
  it("supports only TOMAN and defaults to it", () => {
    expect(CURRENCIES).toEqual(["TOMAN"]);
    expect(DEFAULT_CURRENCY).toBe("TOMAN");
    expect(isCurrency("TOMAN")).toBe(true);
    expect(isCurrency("RIAL")).toBe(false);
    expect(isCurrency(undefined)).toBe(false);
  });
});

describe("money()", () => {
  it("creates an immutable integer value in TOMAN", () => {
    const m = money(12500);
    expect(m).toEqual({ amount: 12500, currency: "TOMAN" });
    expect(Object.isFrozen(m)).toBe(true);
  });

  it("accepts zero, negatives and the safe-integer limits", () => {
    expect(money(0).amount).toBe(0);
    expect(money(-5).amount).toBe(-5);
    expect(money(MAX).amount).toBe(MAX);
    expect(money(-MAX).amount).toBe(-MAX);
  });

  it("normalises -0 to 0", () => {
    expect(Object.is(money(-0).amount, 0)).toBe(true);
  });

  it.each([1.5, 0.1, NaN, Infinity, -Infinity])("rejects non-integer %s", (v) => {
    expect(codeOf(() => money(v))).toBe("MONEY_INVALID_AMOUNT");
  });

  it("rejects non-number input", () => {
    expect(codeOf(() => money("100" as unknown as number))).toBe("MONEY_INVALID_AMOUNT");
    expect(codeOf(() => money(null as unknown as number))).toBe("MONEY_INVALID_AMOUNT");
  });

  it("rejects unsafe integers as overflow", () => {
    expect(codeOf(() => money(MAX + 1))).toBe("MONEY_OVERFLOW");
    expect(codeOf(() => money(-MAX - 1))).toBe("MONEY_OVERFLOW");
    expect(codeOf(() => money(2 ** 60))).toBe("MONEY_OVERFLOW");
  });

  it("rejects an unknown currency", () => {
    expect(codeOf(() => money(1, "USD" as never))).toBe("MONEY_INVALID_CURRENCY");
  });

  it("MoneyError never leaks as a client error", () => {
    const e = new MoneyError("MONEY_OVERFLOW", "x");
    expect(e.status).toBe(500);
    expect(e.code).toBe("MONEY_OVERFLOW");
  });
});

describe("arithmetic", () => {
  it("adds and subtracts", () => {
    expect(add(money(100), money(250))).toEqual(money(350));
    expect(subtract(money(100), money(250))).toEqual(money(-150));
    expect(add(money(5), negate(money(5)))).toEqual(zero());
  });

  it("multiplies by an integer factor", () => {
    expect(multiply(money(1200), 3)).toEqual(money(3600));
    expect(multiply(money(1200), 0)).toEqual(zero());
    expect(Object.is(multiply(money(1200), 0).amount, 0)).toBe(true);
    expect(multiply(money(1200), -1)).toEqual(money(-1200));
  });

  it("rejects fractional or unsafe factors", () => {
    expect(codeOf(() => multiply(money(100), 1.5))).toBe("MONEY_INVALID_AMOUNT");
    expect(codeOf(() => multiply(money(100), NaN))).toBe("MONEY_INVALID_AMOUNT");
    expect(codeOf(() => multiply(money(100), MAX + 1))).toBe("MONEY_OVERFLOW");
  });

  it("detects overflow on add, subtract and multiply", () => {
    expect(codeOf(() => add(money(MAX), money(1)))).toBe("MONEY_OVERFLOW");
    expect(codeOf(() => add(money(-MAX), money(-1)))).toBe("MONEY_OVERFLOW");
    expect(codeOf(() => subtract(money(MAX), money(-1)))).toBe("MONEY_OVERFLOW");
    expect(codeOf(() => multiply(money(2 ** 52), 2))).toBe("MONEY_OVERFLOW");
    expect(codeOf(() => multiply(money(MAX), MAX))).toBe("MONEY_OVERFLOW");
  });

  it("allows results exactly at the safe limit", () => {
    expect(add(money(MAX - 1), money(1)).amount).toBe(MAX);
    expect(multiply(money(MAX), 1).amount).toBe(MAX);
    expect(subtract(money(-MAX + 1), money(1)).amount).toBe(-MAX);
  });

  it("sums a list, empty list gives zero", () => {
    expect(sum([money(100), money(200), money(300)])).toEqual(money(600));
    expect(sum([])).toEqual(zero());
    expect(codeOf(() => sum([money(MAX), money(1)]))).toBe("MONEY_OVERFLOW");
  });

  it("matches exact integer math over many deterministic cases", () => {
    let seed = 12345;
    const next = () => (seed = (seed * 1103515245 + 12345) % 2147483648);
    for (let i = 0; i < 5000; i++) {
      const a = (next() % 2_000_000_000) - 1_000_000_000;
      const b = (next() % 2_000_000_000) - 1_000_000_000;
      const q = (next() % 1000) - 500;
      expect(add(money(a), money(b)).amount).toBe(a + b);
      expect(subtract(money(a), money(b)).amount).toBe(a - b);
      expect(multiply(money(a), q).amount).toBe(a * q === 0 ? 0 : a * q);
    }
  });
});

describe("comparison", () => {
  it("compares, equals, isZero, isNegative", () => {
    expect(compare(money(1), money(2))).toBe(-1);
    expect(compare(money(2), money(2))).toBe(0);
    expect(compare(money(3), money(2))).toBe(1);
    expect(equals(money(2), money(2))).toBe(true);
    expect(equals(money(2), money(3))).toBe(false);
    expect(isZero(zero())).toBe(true);
    expect(isZero(money(1))).toBe(false);
    expect(isNegative(money(-1))).toBe(true);
    expect(isNegative(money(0))).toBe(false);
  });

  it("rejects mixed currencies", () => {
    const rial = { amount: 10, currency: "RIAL" } as never;
    expect(codeOf(() => add(money(1), rial))).toBe("MONEY_CURRENCY_MISMATCH");
    expect(codeOf(() => subtract(money(1), rial))).toBe("MONEY_CURRENCY_MISMATCH");
    expect(codeOf(() => compare(money(1), rial))).toBe("MONEY_CURRENCY_MISMATCH");
    expect(equals(money(10), rial)).toBe(false);
  });
});

describe("RoundingPolicy (Phase 2B)", () => {
  const r = (amount: number): number => roundMoney(money(amount)).amount;
  const stepOf = (amount: number): number =>
    Math.abs(amount) < SMALL_AMOUNT_THRESHOLD ? SMALL_STEP : LARGE_STEP;

  it("keeps the rule constants in one place", () => {
    expect(SMALL_AMOUNT_THRESHOLD).toBe(100_000);
    expect(SMALL_STEP).toBe(100);
    expect(LARGE_STEP).toBe(1_000);
  });

  it.each([
    [0, 0],
    [1, 0],
    [49, 0],
    [50, 100],
    [99, 100],
    [100, 100],
    [101, 100],
    [149, 100],
    [150, 200],
    [151, 200],
    [1_234, 1_200],
    [12_349, 12_300],
    [12_350, 12_400],
    [12_351, 12_400],
    [99_949, 99_900],
    [99_950, 100_000],
    [99_951, 100_000],
  ])("below threshold: %i → %i (nearest 100, Half-Up)", (input, expected) => {
    expect(r(input)).toBe(expected);
  });

  it.each([
    [100_000, 100_000],
    [100_001, 100_000],
    [100_499, 100_000],
    [100_500, 101_000],
    [100_501, 101_000],
  ])("threshold: %i → %i (nearest 1000, Half-Up)", (input, expected) => {
    expect(r(input)).toBe(expected);
  });

  it.each([
    [1_000_000, 1_000_000],
    [1_234_499, 1_234_000],
    [1_234_500, 1_235_000],
    [1_234_501, 1_235_000],
    [3_000_000, 3_000_000],
    [9_999_999, 10_000_000],
  ])("large amounts: %i → %i", (input, expected) => {
    expect(r(input)).toBe(expected);
  });

  it("boundary regression: step is chosen from the amount before rounding", () => {
    expect(r(99_950)).toBe(100_000); // small step
    expect(r(100_500)).toBe(101_000); // large step
    expect(r(99_999)).toBe(100_000);
    expect(r(100_499)).toBe(100_000);
  });

  it("zero stays zero and is never -0", () => {
    expect(Object.is(r(0), 0)).toBe(true);
    expect(Object.is(r(-0), 0)).toBe(true);
    expect(Object.is(r(-49), 0)).toBe(true);
  });

  it("preserves the currency", () => {
    const out = roundMoney(money(12_349, "TOMAN"));
    expect(out.currency).toBe("TOMAN");
    expect(equals(out, money(12_300, "TOMAN"))).toBe(true);
  });

  it("does not mutate the input and returns a frozen value", () => {
    const input = money(12_349);
    const snapshot = { ...input };
    const out = roundMoney(input);
    expect(input).toEqual(snapshot);
    expect(Object.isFrozen(input)).toBe(true);
    expect(Object.isFrozen(out)).toBe(true);
    expect(out).not.toBe(input);
  });

  it("is deterministic", () => {
    for (const amount of [0, 49, 50, 99_950, 100_500, 1_234_500, -12_350]) {
      const first = roundMoney(money(amount));
      for (let i = 0; i < 5; i += 1) expect(roundMoney(money(amount))).toEqual(first);
    }
  });

  it("negative amounts are sign-symmetric: round(-x) = -round(x), ties away from zero", () => {
    expect(r(-49)).toBe(0);
    expect(r(-50)).toBe(-100);
    expect(r(-12_349)).toBe(-12_300);
    expect(r(-12_350)).toBe(-12_400);
    expect(r(-99_950)).toBe(-100_000);
    expect(r(-100_499)).toBe(-100_000);
    expect(r(-100_500)).toBe(-101_000);
    for (let x = 1; x <= 250_000; x += 7) expect(r(-x) + r(x)).toBe(0);
  });

  it("property: result is within step/2 of the input", () => {
    const samples = [
      ...Array.from({ length: 2_000 }, (_, i) => i * 97),
      ...Array.from({ length: 2_000 }, (_, i) => 100_000 + i * 1_013),
      ...Array.from({ length: 500 }, (_, i) => -(i * 997)),
    ];
    for (const x of samples) {
      expect(Math.abs(r(x) - x)).toBeLessThanOrEqual(stepOf(x) / 2);
    }
  });

  it("property: result is a multiple of the input step (exact, step from the input)", () => {
    for (let x = -250_000; x <= 250_000; x += 13) {
      const out = r(x);
      expect(Math.abs(out) % stepOf(x)).toBe(0);
    }
  });

  it("property: idempotent, round(round(x)) = round(x)", () => {
    for (let x = -300_000; x <= 300_000; x += 11) expect(r(r(x))).toBe(r(x));
    for (const x of [99_950, 99_951, 100_500, 1_234_500, 9_999_999, MAX - 1_000]) {
      expect(r(r(x))).toBe(r(x));
    }
  });

  it("matches the active Legacy roundPrice (values produced by running the Legacy PHP function)", () => {
    const legacy: ReadonlyArray<readonly [number, number]> = [
      [0, 0], [1, 0], [49, 0], [50, 100], [99, 100], [100, 100], [101, 100], [149, 100],
      [150, 200], [151, 200], [1234, 1200], [12349, 12300], [12350, 12400], [12351, 12400],
      [99949, 99900], [99950, 100000], [99951, 100000], [99999, 100000], [100000, 100000],
      [100001, 100000], [100499, 100000], [100500, 101000], [100501, 101000], [100999, 101000],
      [101500, 102000], [250499, 250000], [250500, 251000], [999999, 1000000],
      [1000000, 1000000], [1234499, 1234000], [1234500, 1235000], [1234501, 1235000],
      [3000000, 3000000], [9999999, 10000000], [12345678, 12346000], [99999999, 100000000],
    ];
    for (const [input, expected] of legacy) expect(r(input)).toBe(expected);
  });

  describe("overflow and invalid input", () => {
    it("throws MONEY_OVERFLOW when rounding up leaves the safe range", () => {
      // MAX = 9_007_199_254_740_991. The next multiple of 1000 above it is unsafe.
      expect(codeOf(() => roundMoney(money(MAX)))).toBe("MONEY_OVERFLOW");
      expect(codeOf(() => roundMoney(money(-MAX)))).toBe("MONEY_OVERFLOW");
    });

    it("rounds down near the limit without overflow", () => {
      expect(r(MAX - 991)).toBe(9_007_199_254_740_000);
      expect(r(-(MAX - 991))).toBe(-9_007_199_254_740_000);
    });

    it("rejects a malformed Money object with the existing MoneyError codes", () => {
      const bad = (amount: number, currency: string): Money => ({ amount, currency }) as unknown as Money;
      expect(codeOf(() => roundMoney(bad(1.5, "TOMAN")))).toBe("MONEY_INVALID_AMOUNT");
      expect(codeOf(() => roundMoney(bad(Number.NaN, "TOMAN")))).toBe("MONEY_INVALID_AMOUNT");
      expect(codeOf(() => roundMoney(bad(Infinity, "TOMAN")))).toBe("MONEY_INVALID_AMOUNT");
      expect(codeOf(() => roundMoney(bad(2 ** 53, "TOMAN")))).toBe("MONEY_OVERFLOW");
      expect(codeOf(() => roundMoney(bad(100, "USD")))).toBe("MONEY_INVALID_CURRENCY");
    });
  });

  describe("policy abstraction", () => {
    it("roundMoney uses the Legacy policy by default", () => {
      expect(roundMoney(money(99_950))).toEqual(legacyRoundingPolicy.round(money(99_950)));
    });

    it("roundMoney accepts any RoundingPolicy", () => {
      const identity: RoundingPolicy = { version: "identity-test", round: (m) => m };
      const input = money(12_349);
      expect(roundMoney(input, identity)).toBe(input);
    });
  });
});
