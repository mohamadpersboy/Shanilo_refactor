import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AppError, ValidationError, toErrorResponse } from "@/lib/errors";
import { businessOperationId, money } from "@/lib/money";
import {
  PaymentAmountMismatchError,
  PaymentInvalidAmountError,
  PaymentNotFoundError,
  PaymentProviderError,
  PaymentProviderUnavailableError,
  createPaymentService,
  paymentCreationResult,
  paymentRedirect,
  paymentVerificationResult,
  type PaymentCreationResult,
  type PaymentProvider,
  type PaymentRequest,
  type PaymentVerificationRequest,
  type PaymentVerificationResult,
} from "@/lib/payment";

const OP = businessOperationId("op-77");
const CB = "https://shop.example.com/payment/callback";

/** Test-only provider. It records every call and returns what a test tells it to return. */
class FakeProvider implements PaymentProvider {
  readonly id = "zarinpal" as const;
  readonly created: PaymentRequest[] = [];
  readonly verified: PaymentVerificationRequest[] = [];
  createImpl: (r: PaymentRequest) => Promise<PaymentCreationResult> = async () =>
    paymentCreationResult({
      provider: "zarinpal",
      providerPaymentId: "P-1",
      redirect: paymentRedirect({ url: "https://gateway.test/pay/P-1" }),
    });
  verifyImpl: (r: PaymentVerificationRequest) => Promise<PaymentVerificationResult> = async (r) =>
    paymentVerificationResult({
      status: "SUCCESS",
      providerPaymentId: r.providerPaymentId,
      providerReference: "ref-1",
      verifiedAmount: r.expectedAmount,
    });

  async createPayment(request: PaymentRequest) {
    this.created.push(request);
    return this.createImpl(request);
  }
  async verifyPayment(request: PaymentVerificationRequest) {
    this.verified.push(request);
    return this.verifyImpl(request);
  }
}

const setup = () => {
  const provider = new FakeProvider();
  return { provider, service: createPaymentService(provider) };
};

const createInput = (over: Record<string, unknown> = {}) => ({
  amount: money(150_000),
  operationId: OP,
  callbackUrl: CB,
  ...over,
});

const verifyInput = (over: Record<string, unknown> = {}) => ({
  providerPaymentId: "P-1",
  expectedAmount: money(150_000),
  callbackData: { Status: "OK" },
  ...over,
});

const rejection = async (p: Promise<unknown>): Promise<unknown> => {
  try {
    await p;
  } catch (e) {
    return e;
  }
  return undefined;
};

describe("createPayment", () => {
  it("delegates a valid TOMAN request to the provider with the same data", async () => {
    const { provider, service } = setup();
    const result = await service.createPayment(createInput({ description: "order 15" }));
    expect(provider.created).toHaveLength(1);
    expect(provider.created[0]).toEqual({ amount: { amount: 150_000, currency: "TOMAN" }, operationId: "op-77", callbackUrl: CB, description: "order 15" });
    expect(result.provider).toBe("zarinpal");
    expect(result.providerPaymentId).toBe("P-1");
    expect(result.redirect).toEqual({ url: "https://gateway.test/pay/P-1", method: "GET", fields: {} });
  });

  it("returns a frozen, provider-neutral result", async () => {
    const { service } = setup();
    const result = await service.createPayment(createInput());
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.keys(result).sort()).toEqual(["provider", "providerPaymentId", "redirect"]);
  });

  it("rejects zero, negative, float and unknown-currency amounts before any provider call", async () => {
    const { provider, service } = setup();
    for (const amount of [{ amount: 0, currency: "TOMAN" }, { amount: -5, currency: "TOMAN" }, { amount: 1.5, currency: "TOMAN" }, { amount: 1000, currency: "RIAL" }]) {
      const error = await rejection(service.createPayment(createInput({ amount })));
      expect(error).toBeInstanceOf(PaymentInvalidAmountError);
    }
    expect(provider.created).toHaveLength(0);
  });

  it("rejects a malformed operation ID or callback URL before any provider call", async () => {
    const { provider, service } = setup();
    expect(await rejection(service.createPayment(createInput({ operationId: "" })))).toBeInstanceOf(ValidationError);
    expect(await rejection(service.createPayment(createInput({ callbackUrl: "not-a-url" })))).toBeInstanceOf(ValidationError);
    expect(provider.created).toHaveLength(0);
  });

  it("passes provider errors through unchanged (same instance)", async () => {
    const { provider, service } = setup();
    for (const error of [new PaymentProviderUnavailableError("down"), new PaymentProviderError("bad"), new PaymentNotFoundError("none")]) {
      provider.createImpl = async () => {
        throw error;
      };
      expect(await rejection(service.createPayment(createInput()))).toBe(error);
    }
  });

  it("treats a malformed provider result as a provider error without leaking detail", async () => {
    const { provider, service } = setup();
    provider.createImpl = async () => ({ provider: "zarinpal", providerPaymentId: "", redirect: { url: "https://x.test", method: "GET", fields: {} } }) as PaymentCreationResult;
    const error = await rejection(service.createPayment(createInput()));
    expect(error).toBeInstanceOf(PaymentProviderError);
    expect(toErrorResponse(error).body.error.code).toBe("INTERNAL_ERROR");
    expect(JSON.stringify(toErrorResponse(error))).not.toMatch(/invalid creation result|PAYMENT_PROVIDER_ERROR/);
  });

  it("rejects a result that names a different provider", async () => {
    const { provider, service } = setup();
    provider.createImpl = async () =>
      paymentCreationResult({ provider: "mellat", providerPaymentId: "P-9", redirect: paymentRedirect({ url: "https://gateway.test/p" }) });
    expect(await rejection(service.createPayment(createInput()))).toBeInstanceOf(PaymentProviderError);
  });

  it("does not claim idempotency: the same operation ID reaches the provider every time", async () => {
    const { provider, service } = setup();
    await service.createPayment(createInput());
    await service.createPayment(createInput());
    expect(provider.created).toHaveLength(2);
    expect(provider.created.every((r) => r.operationId === OP)).toBe(true);
  });
});

describe("verifyPayment", () => {
  it("passes the callback data and the expected amount to the provider", async () => {
    const { provider, service } = setup();
    await service.verifyPayment(verifyInput({ callbackData: { Status: "OK", Authority: "A1", extra: undefined } }));
    expect(provider.verified).toHaveLength(1);
    expect(provider.verified[0]).toEqual({
      providerPaymentId: "P-1",
      expectedAmount: { amount: 150_000, currency: "TOMAN" },
      callbackData: { Status: "OK", Authority: "A1" },
    });
  });

  it("does not read callback keys: any content reaches the provider and the provider decides", async () => {
    const { provider, service } = setup();
    provider.verifyImpl = async (r) => paymentVerificationResult({ status: "FAILED", providerPaymentId: r.providerPaymentId });
    const result = await service.verifyPayment(verifyInput({ callbackData: { Status: "OK" } }));
    expect(result.status).toBe("FAILED");
  });

  it("confirms SUCCESS only with the matching amount", async () => {
    const { service } = setup();
    const result = await service.verifyPayment(verifyInput());
    expect(result).toEqual({ status: "SUCCESS", providerPaymentId: "P-1", providerReference: "ref-1", verifiedAmount: { amount: 150_000, currency: "TOMAN" } });
  });

  it("rejects SUCCESS with a different amount using the existing mismatch error", async () => {
    const { provider, service } = setup();
    provider.verifyImpl = async (r) =>
      paymentVerificationResult({ status: "SUCCESS", providerPaymentId: r.providerPaymentId, verifiedAmount: money(1_000) });
    expect(await rejection(service.verifyPayment(verifyInput()))).toBeInstanceOf(PaymentAmountMismatchError);
  });

  it("rejects a result for a different payment ID", async () => {
    const { provider, service } = setup();
    provider.verifyImpl = async (r) =>
      paymentVerificationResult({ status: "SUCCESS", providerPaymentId: "OTHER", verifiedAmount: r.expectedAmount });
    expect(await rejection(service.verifyPayment(verifyInput()))).toBeInstanceOf(PaymentAmountMismatchError);
  });

  it("returns FAILED as a normal result, not an exception", async () => {
    const { provider, service } = setup();
    provider.verifyImpl = async (r) => paymentVerificationResult({ status: "FAILED", providerPaymentId: r.providerPaymentId });
    expect(await service.verifyPayment(verifyInput())).toEqual({ status: "FAILED", providerPaymentId: "P-1" });
  });

  it("returns PENDING as a normal result, neither success nor failure", async () => {
    const { provider, service } = setup();
    provider.verifyImpl = async (r) => paymentVerificationResult({ status: "PENDING", providerPaymentId: r.providerPaymentId });
    expect(await service.verifyPayment(verifyInput())).toEqual({ status: "PENDING", providerPaymentId: "P-1" });
  });

  it("rejects a bad expected amount before any provider call", async () => {
    const { provider, service } = setup();
    for (const expectedAmount of [{ amount: 0, currency: "TOMAN" }, { amount: -1, currency: "TOMAN" }, { amount: 5, currency: "RIAL" }]) {
      expect(await rejection(service.verifyPayment(verifyInput({ expectedAmount })))).toBeInstanceOf(PaymentInvalidAmountError);
    }
    expect(provider.verified).toHaveLength(0);
  });

  it("passes provider errors through unchanged (same instance)", async () => {
    const { provider, service } = setup();
    for (const error of [new PaymentProviderUnavailableError("down"), new PaymentNotFoundError("none"), new PaymentProviderError("bad")]) {
      provider.verifyImpl = async () => {
        throw error;
      };
      expect(await rejection(service.verifyPayment(verifyInput()))).toBe(error);
    }
  });

  it("treats a malformed provider result as a provider error", async () => {
    const { provider, service } = setup();
    provider.verifyImpl = async () => ({ status: "SUCCESS", providerPaymentId: "P-1" }) as PaymentVerificationResult;
    const error = await rejection(service.verifyPayment(verifyInput()));
    expect(error).toBeInstanceOf(PaymentProviderError);
    expect(error).toBeInstanceOf(AppError);
  });

  it("verifying twice calls the provider twice: no replay is claimed without a store", async () => {
    const { provider, service } = setup();
    await service.verifyPayment(verifyInput());
    await service.verifyPayment(verifyInput());
    expect(provider.verified).toHaveLength(2);
  });
});

describe("service stays pure and provider-neutral", () => {
  const source = readFileSync("src/lib/payment/service.ts", "utf8");
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  it("has no forbidden import or call", () => {
    expect(code).not.toMatch(/next\/|mongoose|mongodb|process\.env|@\/lib\/env|\bfetch\s*\(|axios|XMLHttpRequest/i);
    expect(code).not.toMatch(/order|cart|repository|transaction|session|redis/i);
  });

  it("has no provider lookup, selection or registry", () => {
    expect(code).not.toMatch(/getProvider|selectProvider|resolveProvider|registry|factory|PAYMENT_PROVIDER_IDS/i);
  });

  it("has no gateway names, gateway terms or currency conversion", () => {
    expect(code).not.toMatch(/mellat|zarinpal|soap|authority|RefId|SaleOrderId|SaleReferenceId|rial|toRial|\*\s*10\b/i);
  });

  it("does not enforce idempotency without a store", () => {
    expect(code).not.toMatch(/classifyIdempotentRequest|assertNoIdempotencyConflict|IdempotencyConflictError|OperationConflictError|REPLAYED|IN_PROGRESS/);
  });

  it("does not create a payment record, status store or state machine", () => {
    expect(code).not.toMatch(/new Map|new Set|EXPIRED|PaymentRepository|PaymentModel|PaymentSchema/);
  });
});
