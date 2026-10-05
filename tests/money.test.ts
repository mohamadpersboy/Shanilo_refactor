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
  money,
  multiply,
  negate,
  subtract,
  sum,
  zero,
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
