import { ValidationError } from "@/lib/errors";
import { IdempotencyConflictError } from "./financial-errors";

/**
 * Idempotency contract (Phase 2D). Types and pure helpers only.
 * No storage, no hashing, no unique index, no transaction, no retry policy.
 * Those belong to the Data Layer and Service Layer phases.
 *
 * Meaning: one stable business operation must create a financial effect at most once.
 *  - new operationId                      → NEW
 *  - same operationId + same payloadHash  → REPLAYED (or IN_PROGRESS while it still runs). Do not run it again.
 *  - same operationId + other payloadHash → CONFLICT → `IDEMPOTENCY_CONFLICT`
 * Not decided here: the exact operation ID of a settlement or payment, retention/TTL,
 * the persistence schema, retry policy, gateway-specific keys.
 */

declare const operationIdBrand: unique symbol;
declare const payloadHashBrand: unique symbol;

/** Longest accepted ID or hash. A technical bound against abuse, not a business rule. */
export const MAX_IDEMPOTENCY_TOKEN_LENGTH = 255;

/**
 * Opaque, caller-generated identifier of one business operation. It is not an
 * OrderId, PaymentId, RefundId, SettlementId or PayoutId, and it is not required to be a UUID.
 * The value is kept exactly as given and compared by string equality.
 */
export type BusinessOperationId = string & { readonly [operationIdBrand]: true };

/** Opaque identity of a request payload. How it is computed is outside this phase. Compared by string equality only. */
export type OperationPayloadHash = string & { readonly [payloadHashBrand]: true };

function assertToken(value: unknown, what: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(`${what} must be a non-empty string`);
  }
  if (value.length > MAX_IDEMPOTENCY_TOKEN_LENGTH) {
    throw new ValidationError(`${what} must be at most ${MAX_IDEMPOTENCY_TOKEN_LENGTH} characters`);
  }
  return value;
}

/** Validate and brand an operation ID. Rejects a non-string, an empty value, a whitespace-only value and a value over the length bound. */
export function businessOperationId(value: string): BusinessOperationId {
  return assertToken(value, "Business operation ID") as BusinessOperationId;
}

/** Validate and brand a payload hash. Rejects a non-string, an empty value, a whitespace-only value and a value over the length bound. */
export function operationPayloadHash(value: string): OperationPayloadHash {
  return assertToken(value, "Operation payload hash") as OperationPayloadHash;
}

export const OPERATION_STATUSES = ["PENDING", "SUCCEEDED", "FAILED"] as const;

/**
 * Lifecycle of a stored operation. It is generic on purpose: `FAILED` is NOT assumed
 * to be terminal. Whether a failed operation may run again is a retry policy of the
 * future Service layer.
 */
export type OperationStatus = (typeof OPERATION_STATUSES)[number];

export function isOperationStatus(value: unknown): value is OperationStatus {
  return typeof value === "string" && (OPERATION_STATUSES as readonly string[]).includes(value);
}

/** What the system already knows about one operation. Immutable value. */
export type IdempotencyRecord = Readonly<{
  operationId: BusinessOperationId;
  payloadHash: OperationPayloadHash;
  status: OperationStatus;
}>;

export function idempotencyRecord(
  operationId: BusinessOperationId,
  payloadHash: OperationPayloadHash,
  status: OperationStatus,
): IdempotencyRecord {
  if (!isOperationStatus(status)) throw new ValidationError("Invalid operation status");
  return Object.freeze({
    operationId: businessOperationId(operationId),
    payloadHash: operationPayloadHash(payloadHash),
    status,
  });
}

/**
 * A request to run an operation once. `payload` is generic and is held by reference
 * (not deep-copied, not compared). Callers should pass immutable data.
 */
export type IdempotentOperation<TPayload> = Readonly<{
  operationId: BusinessOperationId;
  payloadHash: OperationPayloadHash;
  payload: TPayload;
}>;

export function idempotentOperation<TPayload>(
  operationId: BusinessOperationId,
  payloadHash: OperationPayloadHash,
  payload: TPayload,
): IdempotentOperation<TPayload> {
  return Object.freeze({
    operationId: businessOperationId(operationId),
    payloadHash: operationPayloadHash(payloadHash),
    payload,
  });
}

/**
 * Outcome of one REQUEST against what is already known. It is separate from `OperationStatus`
 * (the lifecycle of the stored operation):
 *  - NEW         no record exists. The operation has not run.
 *  - IN_PROGRESS same ID, same hash, status PENDING. Another run is still active.
 *  - REPLAYED    same ID, same hash, status SUCCEEDED or FAILED. Do not execute again;
 *                use the existing result. `record.status` tells the caller which one.
 *                Retrying after FAILED is a later Service decision, not made here.
 *  - CONFLICT    same ID, different hash. This is NOT a retry.
 */
export type IdempotencyOutcome =
  | Readonly<{ outcome: "NEW" }>
  | Readonly<{ outcome: "IN_PROGRESS"; record: IdempotencyRecord }>
  | Readonly<{ outcome: "REPLAYED"; record: IdempotencyRecord }>
  | Readonly<{ outcome: "CONFLICT"; record: IdempotencyRecord }>;

const NEW_OUTCOME: IdempotencyOutcome = Object.freeze({ outcome: "NEW" });

/**
 * Pure decision. Payload hashes are compared with string equality. The payload is not inspected.
 * `existing` is what a future store found for `request.operationId`, or `undefined` for none.
 * A record with another operation ID is a caller bug and throws `ValidationError`.
 */
export function classifyIdempotentRequest(
  request: Pick<IdempotentOperation<unknown>, "operationId" | "payloadHash">,
  existing?: IdempotencyRecord,
): IdempotencyOutcome {
  const operationId = businessOperationId(request.operationId);
  const payloadHash = operationPayloadHash(request.payloadHash);
  if (existing === undefined) return NEW_OUTCOME;
  if (existing.operationId !== operationId) {
    throw new ValidationError("Existing record belongs to a different operation ID");
  }
  if (existing.payloadHash !== payloadHash) return Object.freeze({ outcome: "CONFLICT", record: existing });
  if (existing.status === "PENDING") return Object.freeze({ outcome: "IN_PROGRESS", record: existing });
  return Object.freeze({ outcome: "REPLAYED", record: existing });
}

/** Throw `IdempotencyConflictError` (`IDEMPOTENCY_CONFLICT`) when the outcome is CONFLICT. */
export function assertNoIdempotencyConflict(
  outcome: IdempotencyOutcome,
): asserts outcome is Exclude<IdempotencyOutcome, { outcome: "CONFLICT" }> {
  if (outcome.outcome === "CONFLICT") {
    throw new IdempotencyConflictError("Operation ID reused with a different payload hash");
  }
}
