import { describe, expect, it } from "vitest";
import { AppError, ValidationError, toErrorResponse } from "@/lib/errors";
import {
  FINANCIAL_ERROR_CODES,
  FinancialError,
  FinancialStateConflictError,
  IdempotencyConflictError,
  InsufficientFundsError,
  MoneyError,
  OperationConflictError,
  money,
  add,
} from "@/lib/money";

const SENSITIVE = "mongodb://user:pass@host/db orderId=64f1c2 stack at Object.<anonymous> gateway_secret=abc";

const classes = [
  [FinancialStateConflictError, "FINANCIAL_STATE_CONFLICT", 409],
  [InsufficientFundsError, "FINANCIAL_INSUFFICIENT_FUNDS", 422],
  [OperationConflictError, "FINANCIAL_OPERATION_CONFLICT", 409],
  [IdempotencyConflictError, "IDEMPOTENCY_CONFLICT", 409],
] as const;

describe("Financial errors", () => {
  it("error codes are stable", () => {
    expect(FINANCIAL_ERROR_CODES).toEqual({
      STATE_CONFLICT: "FINANCIAL_STATE_CONFLICT",
      INSUFFICIENT_FUNDS: "FINANCIAL_INSUFFICIENT_FUNDS",
      OPERATION_CONFLICT: "FINANCIAL_OPERATION_CONFLICT",
      IDEMPOTENCY_CONFLICT: "IDEMPOTENCY_CONFLICT",
    });
    expect(new Set(Object.values(FINANCIAL_ERROR_CODES)).size).toBe(4);
  });

  it.each(classes)("%o has code %s and status %i, and is an AppError", (Ctor, code, status) => {
    const e = new Ctor();
    expect(e).toBeInstanceOf(FinancialError);
    expect(e).toBeInstanceOf(AppError);
    expect(e).toBeInstanceOf(Error);
    expect(e.code).toBe(code);
    expect(e.status).toBe(status);
    expect(e.name).toBe(Ctor.name);
  });

  it("each category is a distinct class (operation conflict is not idempotency conflict)", () => {
    const op = new OperationConflictError();
    const idem = new IdempotencyConflictError();
    expect(op).not.toBeInstanceOf(IdempotencyConflictError);
    expect(idem).not.toBeInstanceOf(OperationConflictError);
    expect(op.code).not.toBe(idem.code);
  });

  it.each(classes)("%o public message is fixed and hides internal detail", (Ctor) => {
    const plain = new Ctor();
    const withDetail = new Ctor(SENSITIVE, new Error(SENSITIVE));
    expect(withDetail.message).toBe(plain.message); // deterministic
    expect(withDetail.message).not.toMatch(/mongodb|pass|orderId|stack|secret|Object\./i);
    expect(withDetail.internalDetail).toBe(SENSITIVE); // kept for logs only
    expect(plain.internalDetail).toBeUndefined();
  });

  it.each(classes)("%o response body leaks nothing", (Ctor, code, status) => {
    const res = toErrorResponse(new Ctor(SENSITIVE));
    expect(res.status).toBe(status);
    expect(res.body).toEqual({ error: { code, message: new Ctor().message } });
    expect(JSON.stringify(res)).not.toContain("mongodb");
  });

  it("does not depend on HTTP, MongoDB or Next.js", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync("src/lib/money/financial-errors.ts", "utf8");
    expect(src).not.toMatch(/next\/|NextResponse|mongoose|mongodb|process\.env/);
  });
});

describe("MoneyError (Phase 2A behaviour kept)", () => {
  it("is still a MoneyError with moneyCode and status 500, and is now also a FinancialError", () => {
    let caught: unknown;
    try {
      money(1.5);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(MoneyError);
    expect(caught).toBeInstanceOf(FinancialError);
    expect(caught).toBeInstanceOf(AppError);
    const e = caught as MoneyError;
    expect(e.moneyCode).toBe("MONEY_INVALID_AMOUNT");
    expect(e.code).toBe("MONEY_INVALID_AMOUNT");
    expect(e.status).toBe(500);
    expect(e.name).toBe("MoneyError");
  });

  it("keeps overflow and mismatch codes", () => {
    const codeOf = (fn: () => unknown) => {
      try {
        fn();
      } catch (e) {
        return (e as MoneyError).moneyCode;
      }
    };
    expect(codeOf(() => add(money(Number.MAX_SAFE_INTEGER), money(1)))).toBe("MONEY_OVERFLOW");
    expect(codeOf(() => money(1, "USD" as never))).toBe("MONEY_INVALID_CURRENCY");
  });

  it("a MoneyError response stays a generic 500", () => {
    expect(toErrorResponse(new MoneyError("MONEY_OVERFLOW", "x")).body.error.code).toBe("INTERNAL_ERROR");
  });

  it("ValidationError stays unchanged", () => {
    expect(new ValidationError().status).toBe(400);
  });
});
