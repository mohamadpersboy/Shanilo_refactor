import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AppError, ValidationError, toErrorResponse } from "@/lib/errors";
import { FinancialError, MoneyError, businessOperationId, money } from "@/lib/money";
import {
  MAX_CALLBACK_FIELDS,
  MAX_CALLBACK_URL_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_PROVIDER_TOKEN_LENGTH,
  PAYMENT_ERROR_CODES,
  PAYMENT_PROVIDER_IDS,
  PaymentAmountMismatchError,
  PaymentError,
  PaymentInvalidAmountError,
  PaymentNotFoundError,
  PaymentProviderError,
  PaymentProviderUnavailableError,
  assertVerifiedAmount,
  isPaymentProviderId,
  paymentCallbackData,
  paymentCreationResult,
  paymentProviderId,
  paymentRedirect,
  paymentRequest,
  paymentVerificationRequest,
  paymentVerificationResult,
  providerPaymentId,
  providerReference,
  type PaymentCreationResult,
  type PaymentProvider,
  type PaymentRequest,
  type PaymentVerificationRequest,
  type PaymentVerificationResult,
} from "@/lib/payment";

const OP = businessOperationId("op-1");
const CB = "https://shop.example.com/payment/callback";
const SENSITIVE = "merchant=SECRET123 https://gw.example/soap code=-32 stack at x";

const validRequest = (over: Partial<Parameters<typeof paymentRequest>[0]> = {}) =>
  paymentRequest({ amount: money(150_000), operationId: OP, callbackUrl: CB, ...over });

const codeOf = (fn: () => unknown): string | undefined => {
  try {
    fn();
  } catch (e) {
    return e instanceof AppError ? e.code : `other:${String(e)}`;
  }
  return undefined;
};

describe("provider ID", () => {
  it("defines mellat and zarinpal", () => {
    expect([...PAYMENT_PROVIDER_IDS]).toEqual(["mellat", "zarinpal"]);
    expect(paymentProviderId("mellat")).toBe("mellat");
    expect(paymentProviderId("zarinpal")).toBe("zarinpal");
    expect(isPaymentProviderId("mellat")).toBe(true);
  });

  it("rejects an unknown or malformed provider", () => {
    for (const bad of ["", "Mellat", "paypal", " zarinpal"]) expect(() => paymentProviderId(bad)).toThrow(ValidationError);
    expect(isPaymentProviderId(undefined)).toBe(false);
    expect(isPaymentProviderId(5)).toBe(false);
  });
});

describe("PaymentRequest", () => {
  it("accepts valid Money (TOMAN), operationId and callback URL; description is optional", () => {
    const r = validRequest();
    expect(r.amount).toEqual({ amount: 150_000, currency: "TOMAN" });
    expect(r.operationId).toBe("op-1");
    expect(r.callbackUrl).toBe(CB);
    expect("description" in r).toBe(false);
    expect(validRequest({ description: "order 15" }).description).toBe("order 15");
  });

  it("is frozen and independent of the input Money", () => {
    const amount = money(5_000);
    const r = validRequest({ amount });
    expect(Object.isFrozen(r)).toBe(true);
    expect(Object.isFrozen(r.amount)).toBe(true);
    expect(r.amount).not.toBe(undefined);
  });

  it("rejects zero, negative, float and non-Money amounts", () => {
    expect(codeOf(() => validRequest({ amount: money(0) }))).toBe("PAYMENT_INVALID_AMOUNT");
    expect(codeOf(() => validRequest({ amount: money(-1) }))).toBe("PAYMENT_INVALID_AMOUNT");
    const float = { amount: 10.5, currency: "TOMAN" } as unknown as ReturnType<typeof money>;
    expect(codeOf(() => validRequest({ amount: float }))).toBe("PAYMENT_INVALID_AMOUNT");
    const unsafe = { amount: 2 ** 53, currency: "TOMAN" } as unknown as ReturnType<typeof money>;
    expect(codeOf(() => validRequest({ amount: unsafe }))).toBe("PAYMENT_INVALID_AMOUNT");
    const usd = { amount: 100, currency: "USD" } as unknown as ReturnType<typeof money>;
    expect(codeOf(() => validRequest({ amount: usd }))).toBe("PAYMENT_INVALID_AMOUNT");
  });

  it("money boundary: a raw number is not accepted as the amount", () => {
    // @ts-expect-error a raw number is not Money. The compiler rejects it.
    const call = () => paymentRequest({ amount: 150_000, operationId: OP, callbackUrl: CB });
    expect(codeOf(call)).toBe("PAYMENT_INVALID_AMOUNT"); // and it is rejected at run time too
  });

  it("rejects an invalid operation ID", () => {
    expect(() => validRequest({ operationId: "  " as typeof OP })).toThrow(ValidationError);
    expect(() => validRequest({ operationId: "" as typeof OP })).toThrow(ValidationError);
  });

  it("rejects an invalid callback URL", () => {
    for (const bad of ["", "   ", "not a url", "/relative/path", "ftp://x.com/cb", "javascript:alert(1)", "https://u:p@x.com/cb"]) {
      expect(() => validRequest({ callbackUrl: bad })).toThrow(ValidationError);
    }
    expect(() => validRequest({ callbackUrl: `https://x.com/${"a".repeat(MAX_CALLBACK_URL_LENGTH)}` })).toThrow(ValidationError);
    expect(validRequest({ callbackUrl: "http://localhost:3000/cb" }).callbackUrl).toBe("http://localhost:3000/cb");
  });

  it("description boundary", () => {
    expect(validRequest({ description: "d".repeat(MAX_DESCRIPTION_LENGTH) }).description).toHaveLength(MAX_DESCRIPTION_LENGTH);
    expect(() => validRequest({ description: "d".repeat(MAX_DESCRIPTION_LENGTH + 1) })).toThrow(ValidationError);
  });
});

describe("PaymentRedirect and PaymentCreationResult", () => {
  const redirect = paymentRedirect({ url: "https://gw.example/pay/ABC" });

  it("redirect is data: GET by default, POST with form fields allowed, immutable", () => {
    expect(redirect).toEqual({ url: "https://gw.example/pay/ABC", method: "GET", fields: {} });
    const post = paymentRedirect({ url: "https://gw.example/start", method: "POST", fields: { RefId: "1" } });
    expect(post.fields).toEqual({ RefId: "1" });
    expect(Object.isFrozen(post)).toBe(true);
    expect(Object.isFrozen(post.fields)).toBe(true);
  });

  it("rejects a bad redirect URL, method or fields", () => {
    expect(() => paymentRedirect({ url: "" })).toThrow(ValidationError);
    expect(() => paymentRedirect({ url: "x" })).toThrow(ValidationError);
    expect(() => paymentRedirect({ url: "https://a.com", method: "PUT" as "GET" })).toThrow(ValidationError);
    expect(() => paymentRedirect({ url: "https://a.com", method: "GET", fields: { a: "1" } })).toThrow(ValidationError);
    expect(() => paymentRedirect({ url: "https://a.com", method: "POST", fields: { "": "1" } })).toThrow(ValidationError);
  });

  it("creation result holds provider, provider payment ID and redirect, frozen", () => {
    const r = paymentCreationResult({ provider: "zarinpal", providerPaymentId: "A0000123", redirect });
    expect(r).toEqual({ provider: "zarinpal", providerPaymentId: "A0000123", redirect });
    expect(Object.isFrozen(r)).toBe(true);
    expect(Object.keys(r).sort()).toEqual(["provider", "providerPaymentId", "redirect"]); // no raw gateway response
  });

  it("rejects empty or whitespace IDs and an unknown provider", () => {
    for (const bad of ["", "  "]) {
      expect(() => paymentCreationResult({ provider: "mellat", providerPaymentId: bad, redirect })).toThrow(ValidationError);
    }
    expect(() => paymentCreationResult({ provider: "x" as "mellat", providerPaymentId: "1", redirect })).toThrow(ValidationError);
    expect(providerPaymentId("p".repeat(MAX_PROVIDER_TOKEN_LENGTH))).toHaveLength(MAX_PROVIDER_TOKEN_LENGTH);
    expect(() => providerPaymentId("p".repeat(MAX_PROVIDER_TOKEN_LENGTH + 1))).toThrow(ValidationError);
    expect(() => providerReference("")).toThrow(ValidationError);
  });
});

describe("callback data and verification request", () => {
  it("callback data is a frozen string map; undefined values are dropped; input is copied", () => {
    const input: Record<string, string | undefined> = { a: "1", b: undefined, RefId: "xyz" };
    const d = paymentCallbackData(input);
    expect(d).toEqual({ a: "1", RefId: "xyz" });
    expect(Object.isFrozen(d)).toBe(true);
    input.a = "changed";
    expect(d.a).toBe("1");
  });

  it("callback data is bounded", () => {
    const many = Object.fromEntries(Array.from({ length: MAX_CALLBACK_FIELDS + 1 }, (_, i) => [`k${i}`, "v"]));
    expect(() => paymentCallbackData(many)).toThrow(ValidationError);
    expect(() => paymentCallbackData({ "": "v" })).toThrow(ValidationError);
    expect(() => paymentCallbackData({ k: "v".repeat(4097) })).toThrow(ValidationError);
  });

  it("verification request: payment ID, expected Money, callback data; a callback alone proves nothing", () => {
    const r = paymentVerificationRequest({ providerPaymentId: "A1", expectedAmount: money(150_000), callbackData: { Status: "OK" } });
    expect(r.expectedAmount.currency).toBe("TOMAN");
    expect(Object.isFrozen(r)).toBe(true);
    expect(codeOf(() => paymentVerificationRequest({ providerPaymentId: "A1", expectedAmount: money(0), callbackData: {} }))).toBe(
      "PAYMENT_INVALID_AMOUNT",
    );
    expect(() => paymentVerificationRequest({ providerPaymentId: "", expectedAmount: money(1), callbackData: {} })).toThrow(ValidationError);
  });
});

describe("PaymentVerificationResult", () => {
  it("SUCCESS carries provider reference and verified amount, frozen", () => {
    const r = paymentVerificationResult({
      status: "SUCCESS",
      providerPaymentId: "A1",
      providerReference: "REF-9",
      verifiedAmount: money(150_000),
    });
    expect(r).toEqual({ status: "SUCCESS", providerPaymentId: "A1", providerReference: "REF-9", verifiedAmount: { amount: 150_000, currency: "TOMAN" } });
    expect(Object.isFrozen(r)).toBe(true);
    if (r.status === "SUCCESS") expect(r.verifiedAmount.currency).toBe("TOMAN");
  });

  it("SUCCESS without a reference is valid (reference is optional)", () => {
    const r = paymentVerificationResult({ status: "SUCCESS", providerPaymentId: "A1", verifiedAmount: money(1_000) });
    expect("providerReference" in r).toBe(false);
  });

  it("FAILED and PENDING have no verified amount", () => {
    for (const status of ["FAILED", "PENDING"] as const) {
      const r = paymentVerificationResult({ status, providerPaymentId: "A1" });
      expect(r.status).toBe(status);
      expect("verifiedAmount" in r).toBe(false);
      expect(Object.isFrozen(r)).toBe(true);
    }
    const withRef = paymentVerificationResult({ status: "FAILED", providerPaymentId: "A1", providerReference: "R" });
    expect(withRef.providerReference).toBe("R");
  });

  it("rejects a bad verified amount, status, or an amount on a non-success result", () => {
    expect(codeOf(() => paymentVerificationResult({ status: "SUCCESS", providerPaymentId: "A1", verifiedAmount: money(0) }))).toBe(
      "PAYMENT_INVALID_AMOUNT",
    );
    expect(() => paymentVerificationResult({ status: "DONE" as "FAILED", providerPaymentId: "A1" })).toThrow(ValidationError);
    expect(() =>
      paymentVerificationResult({ status: "FAILED", providerPaymentId: "A1", verifiedAmount: money(5) } as never),
    ).toThrow(ValidationError);
    expect(() => paymentVerificationResult({ status: "PENDING", providerPaymentId: "" })).toThrow(ValidationError);
  });

  it("assertVerifiedAmount: matching amount passes; mismatch, currency-equal wrong amount and wrong ID throw", () => {
    const req = paymentVerificationRequest({ providerPaymentId: "A1", expectedAmount: money(150_000), callbackData: {} });
    const ok = paymentVerificationResult({ status: "SUCCESS", providerPaymentId: "A1", verifiedAmount: money(150_000) });
    expect(() => assertVerifiedAmount(req, ok)).not.toThrow();
    const low = paymentVerificationResult({ status: "SUCCESS", providerPaymentId: "A1", verifiedAmount: money(149_900) });
    expect(codeOf(() => assertVerifiedAmount(req, low))).toBe("PAYMENT_AMOUNT_MISMATCH");
    const other = paymentVerificationResult({ status: "SUCCESS", providerPaymentId: "B2", verifiedAmount: money(150_000) });
    expect(codeOf(() => assertVerifiedAmount(req, other))).toBe("PAYMENT_AMOUNT_MISMATCH");
    for (const status of ["FAILED", "PENDING"] as const) {
      expect(() => assertVerifiedAmount(req, paymentVerificationResult({ status, providerPaymentId: "A1" }))).not.toThrow();
    }
  });
});

describe("payment errors", () => {
  const classes = [
    [PaymentProviderError, "PAYMENT_PROVIDER_ERROR", 502],
    [PaymentProviderUnavailableError, "PAYMENT_PROVIDER_UNAVAILABLE", 503],
    [PaymentInvalidAmountError, "PAYMENT_INVALID_AMOUNT", 400],
    [PaymentNotFoundError, "PAYMENT_NOT_FOUND", 404],
    [PaymentAmountMismatchError, "PAYMENT_AMOUNT_MISMATCH", 422],
  ] as const;

  it("codes are stable and contain no gateway names", () => {
    expect(PAYMENT_ERROR_CODES).toEqual({
      PROVIDER_ERROR: "PAYMENT_PROVIDER_ERROR",
      PROVIDER_UNAVAILABLE: "PAYMENT_PROVIDER_UNAVAILABLE",
      INVALID_AMOUNT: "PAYMENT_INVALID_AMOUNT",
      NOT_FOUND: "PAYMENT_NOT_FOUND",
      AMOUNT_MISMATCH: "PAYMENT_AMOUNT_MISMATCH",
    });
    expect(Object.values(PAYMENT_ERROR_CODES).join(",")).not.toMatch(/mellat|zarinpal/i);
  });

  it.each(classes)("%o: hierarchy AppError → FinancialError → PaymentError; separate from MoneyError", (Ctor, code, status) => {
    const e = new Ctor();
    expect(e).toBeInstanceOf(PaymentError);
    expect(e).toBeInstanceOf(FinancialError);
    expect(e).toBeInstanceOf(AppError);
    expect(e).not.toBeInstanceOf(MoneyError);
    expect(e.code).toBe(code);
    expect(e.status).toBe(status);
  });

  it.each(classes)("%o: public message is fixed and hides gateway details", (Ctor, code, status) => {
    const e = new Ctor(SENSITIVE, new Error(SENSITIVE));
    expect(e.message).toBe(new Ctor().message);
    expect(e.message).not.toMatch(/SECRET|soap|gw\.example|stack|code=/);
    expect(e.internalDetail).toBe(SENSITIVE);
    const res = toErrorResponse(e);
    // Existing mapping: a 5xx AppError becomes a generic INTERNAL_ERROR, so nothing leaks. Below 500 the fixed message is returned.
    if (status >= 500) expect(res.body.error).toEqual({ code: "INTERNAL_ERROR", message: "Internal server error" });
    else expect(res.body.error).toEqual({ code, message: e.message });
    expect(JSON.stringify(res)).not.toContain("SECRET");
  });
});

/**
 * Test double ONLY. It is not a gateway implementation. It shows the contract can be implemented, and
 * that the TOMAN → gateway-unit conversion lives inside the Adapter (here, a fake "×10 to Rial").
 */
class TestPaymentProvider implements PaymentProvider {
  readonly id = "zarinpal" as const;
  readonly seenGatewayAmounts: number[] = [];
  private readonly store = new Map<string, { gatewayAmount: number; paid: boolean }>();

  async createPayment(request: PaymentRequest): Promise<PaymentCreationResult> {
    const gatewayAmount = request.amount.amount * 10; // conversion is inside the Adapter
    this.seenGatewayAmounts.push(gatewayAmount);
    const id = `T-${this.store.size + 1}`;
    this.store.set(id, { gatewayAmount, paid: false });
    return paymentCreationResult({
      provider: this.id,
      providerPaymentId: id,
      redirect: paymentRedirect({ url: `https://gateway.test/pay/${id}` }),
    });
  }

  async verifyPayment(request: PaymentVerificationRequest): Promise<PaymentVerificationResult> {
    const entry = this.store.get(request.providerPaymentId);
    if (!entry) throw new PaymentNotFoundError("unknown id");
    if (request.callbackData.Status !== "OK") {
      return paymentVerificationResult({ status: "FAILED", providerPaymentId: request.providerPaymentId });
    }
    entry.paid = true;
    return paymentVerificationResult({
      status: "SUCCESS",
      providerPaymentId: request.providerPaymentId,
      providerReference: "ref-1",
      verifiedAmount: money(entry.gatewayAmount / 10), // back to TOMAN inside the Adapter
    });
  }
}

describe("PaymentProvider contract (test double)", () => {
  it("create → callback → verify → amount check, with the conversion only inside the adapter", async () => {
    const provider: PaymentProvider = new TestPaymentProvider();
    const created = await provider.createPayment(validRequest({ amount: money(150_000) }));
    expect(created.provider).toBe("zarinpal");
    expect(created.redirect.url).toContain(created.providerPaymentId);

    const callback = paymentCallbackData({ Status: "OK", Authority: created.providerPaymentId });
    const verifyReq = paymentVerificationRequest({
      providerPaymentId: created.providerPaymentId,
      expectedAmount: money(150_000),
      callbackData: callback,
    });
    const result = await provider.verifyPayment(verifyReq);
    expect(result.status).toBe("SUCCESS");
    expect(() => assertVerifiedAmount(verifyReq, result)).not.toThrow();
    if (result.status === "SUCCESS") expect(result.verifiedAmount).toEqual({ amount: 150_000, currency: "TOMAN" });
    expect((provider as TestPaymentProvider).seenGatewayAmounts).toEqual([1_500_000]);
  });

  it("a callback that says failure gives FAILED, and an unknown payment is PAYMENT_NOT_FOUND", async () => {
    const provider = new TestPaymentProvider();
    const created = await provider.createPayment(validRequest());
    const failed = await provider.verifyPayment(
      paymentVerificationRequest({ providerPaymentId: created.providerPaymentId, expectedAmount: money(150_000), callbackData: { Status: "NOK" } }),
    );
    expect(failed.status).toBe("FAILED");
    await expect(
      provider.verifyPayment(paymentVerificationRequest({ providerPaymentId: "nope", expectedAmount: money(1), callbackData: {} })),
    ).rejects.toBeInstanceOf(PaymentNotFoundError);
  });

  it("the verification result, not the callback, decides the amount: tampered callback cannot change it", async () => {
    const provider = new TestPaymentProvider();
    const created = await provider.createPayment(validRequest({ amount: money(150_000) }));
    const req = paymentVerificationRequest({
      providerPaymentId: created.providerPaymentId,
      expectedAmount: money(1_000), // the order expects less than what the gateway holds
      callbackData: { Status: "OK", amount: "1000" },
    });
    const result = await provider.verifyPayment(req);
    expect(() => assertVerifiedAmount(req, result)).toThrow(PaymentAmountMismatchError);
  });
});

describe("contract stays pure and provider-neutral", () => {
  const files = readdirSync("src/lib/payment").map((f) => ({ f, src: readFileSync(`src/lib/payment/${f}`, "utf8") }));
  const code = files.map(({ src }) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")).join("\n");

  it("has no HTTP, SOAP, Next.js, database or ENV code", () => {
    expect(code).not.toMatch(/\bfetch\s*\(|axios|XMLHttpRequest|soap|next\/|NextResponse|mongoose|mongodb|process\.env|setTimeout|@\/lib\/env/i);
    expect(code).not.toMatch(/(?<![A-Za-z])redirect\s*\(/); // no Next.js redirect()
  });

  it("has no gateway-specific names in the domain contract", () => {
    // "mellat" and "zarinpal" appear only as the two provider ID literals.
    expect(code.match(/mellat|zarinpal/gi)).toEqual(["mellat", "zarinpal"]);
    expect(code).not.toMatch(/MELLAT_|ZARINPAL_|authority|RefId|SaleOrderId|SaleReferenceId|rawResponse/i);
  });

  it("has no Toman → Rial conversion in the contract", () => {
    expect(code).not.toMatch(/rial|toRial|\*\s*10\b/i);
  });
});
