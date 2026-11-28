import { AppError, NotFoundError } from "@/lib/errors";
import { safeErrorName } from "@/lib/db/error-name";

/**
 * Repository error layer. Policy: docs/repositories/README.md (section "Error mapping").
 *
 * - "Not found" reuses the existing application `NotFoundError`. No duplicate class.
 * - Duplicate key (MongoDB code 11000) becomes `DuplicateKeyError` (409).
 * - Every other unexpected driver error becomes `RepositoryOperationError` (500, fixed message).
 *   It is NOT NotFound and NOT DuplicateKey, so unknown failures stay distinguishable.
 * - Errors that are already `AppError` (for example `DatabaseConnectionError`,
 *   `DatabaseTransactionError`, `ValidationError`, `NotFoundError`) pass through unchanged.
 * - Messages are fixed. Raw driver text, keys, values, hosts and stack traces never leave this layer.
 *   No `cause` is attached, because a driver error can contain the connection string.
 */

/** Base class of repository-level errors. */
export class RepositoryError extends AppError {}

/** A unique index rejected the write. The message does not name the index, the key or the value. */
export class DuplicateKeyError extends RepositoryError {
  constructor() {
    super("REPOSITORY_DUPLICATE_KEY", "Record already exists", 409);
  }
}

/**
 * An unexpected failure in a data-access operation (status 500).
 * `driverErrorName` is only the error class name, for example "MongoServerError" or "CastError".
 */
export class RepositoryOperationError extends RepositoryError {
  readonly driverErrorName: string;

  constructor(driverErrorName: string) {
    super("REPOSITORY_OPERATION_FAILED", "Data access operation failed", 500);
    this.driverErrorName = driverErrorName;
  }
}

/** The fixed "not found" error for repositories. */
export function recordNotFound(): NotFoundError {
  return new NotFoundError("Record not found");
}

const DUPLICATE_KEY_CODE = 11000;
const DUPLICATE_KEY_ERROR_NAMES = new Set(["MongoServerError", "MongoBulkWriteError"]);

/** True for a MongoDB duplicate key error: a driver error named MongoServerError with code 11000. */
export function isDuplicateKeyError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const { code } = error as Error & { code?: unknown };
  return DUPLICATE_KEY_ERROR_NAMES.has(error.name) && code === DUPLICATE_KEY_CODE;
}

/**
 * Convert anything thrown by a data-access operation into a safe application error.
 * Pure function: it does not log. The caller logs `RepositoryOperationError` once.
 */
export function mapRepositoryError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (isDuplicateKeyError(error)) return new DuplicateKeyError();
  return new RepositoryOperationError(safeErrorName(error));
}
