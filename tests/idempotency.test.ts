import { describe, expect, it } from "vitest";
import { ValidationError } from "@/lib/errors";
import {
  IdempotencyConflictError,
  MAX_IDEMPOTENCY_TOKEN_LENGTH,
  OPERATION_STATUSES,
  assertNoIdempotencyConflict,
  businessOperationId,
  classifyIdempotentRequest,
  idempotencyRecord,
  idempotentOperation,
  isOperationStatus,
  operationPayloadHash,
  type OperationStatus,
} from "@/lib/money";

const A = businessOperationId("A");
const B = businessOperationId("B");
const H1 = operationPayloadHash("H1");
const H2 = operationPayloadHash("H2");

describe("BusinessOperationId", () => {
  it("accepts an opaque non-empty string, kept as given", () => {
    expect(businessOperationId("abc")).toBe("abc");
    expect(businessOperationId("9f2c1c3e-0000-4000-8000-000000000000")).toBe("9f2c1c3e-0000-4000-8000-000000000000");
    expect(businessOperationId("any:format/ok 1")).toBe("any:format/ok 1");
    expect(businessOperationId(" a ")).toBe(" a ");
  });

  it("rejects empty, whitespace-only and non-string input", () => {
    for (const bad of ["", " ", "   ", "\t\n"]) expect(() => businessOperationId(bad)).toThrow(ValidationError);
    for (const bad of [undefined, null, 5, {}] as unknown[]) {
      expect(() => businessOperationId(bad as string)).toThrow(ValidationError);
    }
  });

  it("length boundary", () => {
    expect(MAX_IDEMPOTENCY_TOKEN_LENGTH).toBe(255);
    expect(businessOperationId("x".repeat(255))).toHaveLength(255);
    expect(() => businessOperationId("x".repeat(256))).toThrow(ValidationError);
  });

  it("error is a safe 400 without the input value", () => {
    try {
      businessOperationId("   ");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).status).toBe(400);
    }
  });
});

describe("OperationPayloadHash", () => {
  it("accepts a valid hash", () => {
    expect(operationPayloadHash("sha256:abc123")).toBe("sha256:abc123");
  });

  it("rejects empty and whitespace-only", () => {
    expect(() => operationPayloadHash("")).toThrow(ValidationError);
    expect(() => operationPayloadHash("  ")).toThrow(ValidationError);
  });

  it("length boundary", () => {
    expect(operationPayloadHash("h".repeat(255))).toHaveLength(255);
    expect(() => operationPayloadHash("h".repeat(256))).toThrow(ValidationError);
  });
});

describe("OperationStatus and IdempotencyRecord", () => {
  it("has a closed set of statuses", () => {
    expect([...OPERATION_STATUSES]).toEqual(["PENDING", "SUCCEEDED", "FAILED"]);
    expect(isOperationStatus("PENDING")).toBe(true);
    expect(isOperationStatus("CANCELLED")).toBe(false);
    expect(isOperationStatus(undefined)).toBe(false);
  });

  it("builds a frozen record and rejects a bad status", () => {
    const r = idempotencyRecord(A, H1, "SUCCEEDED");
    expect(r).toEqual({ operationId: "A", payloadHash: "H1", status: "SUCCEEDED" });
    expect(Object.isFrozen(r)).toBe(true);
    expect(() => idempotencyRecord(A, H1, "DONE" as OperationStatus)).toThrow(ValidationError);
  });

  it("builds a frozen generic operation request", () => {
    const op = idempotentOperation(A, H1, { amount: 5 });
    expect(op.payload).toEqual({ amount: 5 });
    expect(Object.isFrozen(op)).toBe(true);
  });
});

describe("classifyIdempotentRequest", () => {
  it("NEW: no existing record", () => {
    expect(classifyIdempotentRequest({ operationId: A, payloadHash: H1 })).toEqual({ outcome: "NEW" });
  });

  it("new operationId is NEW even if another operation exists", () => {
    // The store would look up by ID. A record for another ID is never passed for B.
    expect(classifyIdempotentRequest({ operationId: B, payloadHash: H1 }, undefined).outcome).toBe("NEW");
  });

  it("REPLAYED: same ID, same hash, already succeeded", () => {
    const existing = idempotencyRecord(A, H1, "SUCCEEDED");
    const out = classifyIdempotentRequest({ operationId: A, payloadHash: H1 }, existing);
    expect(out).toEqual({ outcome: "REPLAYED", record: existing });
  });

  it("REPLAYED also for FAILED: it is not executed again here, and the status is visible for the Service", () => {
    const existing = idempotencyRecord(A, H1, "FAILED");
    const out = classifyIdempotentRequest({ operationId: A, payloadHash: H1 }, existing);
    expect(out.outcome).toBe("REPLAYED");
    if (out.outcome === "REPLAYED") expect(out.record.status).toBe("FAILED");
  });

  it("IN_PROGRESS: same ID, same hash, still pending", () => {
    const existing = idempotencyRecord(A, H1, "PENDING");
    expect(classifyIdempotentRequest({ operationId: A, payloadHash: H1 }, existing).outcome).toBe("IN_PROGRESS");
  });

  it("CONFLICT: same ID, different hash (for every status)", () => {
    for (const status of OPERATION_STATUSES) {
      const existing = idempotencyRecord(A, H1, status);
      const out = classifyIdempotentRequest({ operationId: A, payloadHash: H2 }, existing);
      expect(out).toEqual({ outcome: "CONFLICT", record: existing });
    }
  });

  it("Replay and Conflict are different outcomes", () => {
    const existing = idempotencyRecord(A, H1, "SUCCEEDED");
    const replay = classifyIdempotentRequest({ operationId: A, payloadHash: H1 }, existing);
    const conflict = classifyIdempotentRequest({ operationId: A, payloadHash: H2 }, existing);
    expect(replay.outcome).not.toBe(conflict.outcome);
  });

  it("compares hashes by exact string equality", () => {
    const existing = idempotencyRecord(A, operationPayloadHash("abc"), "SUCCEEDED");
    expect(classifyIdempotentRequest({ operationId: A, payloadHash: operationPayloadHash("ABC") }, existing).outcome).toBe(
      "CONFLICT",
    );
    expect(classifyIdempotentRequest({ operationId: A, payloadHash: operationPayloadHash("abc ") }, existing).outcome).toBe(
      "CONFLICT",
    );
  });

  it("rejects an existing record of another operation ID (caller bug)", () => {
    const other = idempotencyRecord(B, H1, "SUCCEEDED");
    expect(() => classifyIdempotentRequest({ operationId: A, payloadHash: H1 }, other)).toThrow(ValidationError);
  });

  it("is pure: same input, same output, and inputs are not changed", () => {
    const existing = idempotencyRecord(A, H1, "PENDING");
    const before = JSON.stringify(existing);
    const first = classifyIdempotentRequest({ operationId: A, payloadHash: H1 }, existing);
    expect(classifyIdempotentRequest({ operationId: A, payloadHash: H1 }, existing)).toEqual(first);
    expect(JSON.stringify(existing)).toBe(before);
    expect(Object.isFrozen(first)).toBe(true);
  });
});

describe("assertNoIdempotencyConflict", () => {
  it("throws IDEMPOTENCY_CONFLICT for a CONFLICT outcome with a safe public message", () => {
    const existing = idempotencyRecord(A, H1, "SUCCEEDED");
    const outcome = classifyIdempotentRequest({ operationId: A, payloadHash: H2 }, existing);
    try {
      assertNoIdempotencyConflict(outcome);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(IdempotencyConflictError);
      const err = e as IdempotencyConflictError;
      expect(err.code).toBe("IDEMPOTENCY_CONFLICT");
      expect(err.status).toBe(409);
      expect(err.message).not.toContain("H1");
      expect(err.message).not.toContain("H2");
    }
  });

  it("does not throw for NEW, IN_PROGRESS or REPLAYED", () => {
    expect(() => assertNoIdempotencyConflict({ outcome: "NEW" })).not.toThrow();
    for (const status of ["PENDING", "SUCCEEDED", "FAILED"] as const) {
      const out = classifyIdempotentRequest({ operationId: A, payloadHash: H1 }, idempotencyRecord(A, H1, status));
      expect(() => assertNoIdempotencyConflict(out)).not.toThrow();
    }
  });
});
