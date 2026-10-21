import "server-only";
import type { ClientSession } from "mongoose";
import { connectToDatabase } from "@/lib/db/connection";
import { safeErrorName } from "@/lib/db/error-name";
import { DatabaseTransactionError, type DatabaseTransactionFailure } from "@/lib/errors";
import { logger } from "@/lib/logger";

/**
 * Generic MongoDB transaction helper (Mongoose 9, default connection).
 *
 * It is independent of any business domain. It knows no collection, Schema or business rule.
 * Connection handling stays in `connection.ts`. This file only runs one transaction on that connection.
 *
 * Contract:
 * - The callback gets the `ClientSession`. Pass it to EVERY database operation that must be part
 *   of the transaction (`{ session }`). An operation without it runs outside the transaction.
 * - One attempt only. The callback runs once. There is no retry, also not for transient errors.
 *   The caller decides if a retry is safe.
 * - Do not call external services (HTTP, payment gateway, SMS, email) inside the callback.
 * - Success: commit, then return the callback result.
 * - Callback throws: abort, then rethrow the SAME error object. It is not wrapped.
 *   Exception: a "transactions not supported" error becomes `DatabaseTransactionError("unsupported")`.
 * - Fail closed: if the session cannot start, the deployment has no transaction support, or the commit
 *   fails, the helper throws. It never runs the callback without a transaction and never reports success.
 * - The session is always ended: on success, on callback error, and on start, commit or abort failure.
 * - After a commit attempt the helper does not call abort. A failed commit can leave an unknown outcome.
 *   The caller must treat `commit_failed` as "result unknown" for non-idempotent work.
 * - Errors from this helper are `DatabaseTransactionError` (fixed message, no URI, host or driver text).
 *   Driver details go only to the safe logger, as the error class name.
 */

export type TransactionCallback<T> = (session: ClientSession) => Promise<T>;

const UNSUPPORTED_MESSAGE = /transaction numbers are only allowed on a replica set member or mongos/i;

/**
 * True when MongoDB says this deployment cannot run transactions (for example a standalone server).
 * Matches only the known server error (code 20 with its fixed text) or the driver compatibility error.
 */
function isTransactionUnsupported(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === "MongoCompatibilityError") return true;
  const { code } = error as Error & { code?: unknown };
  return code === 20 && UNSUPPORTED_MESSAGE.test(error.message);
}

function toTransactionError(error: unknown, reason: DatabaseTransactionFailure): DatabaseTransactionError {
  const driverErrorName = safeErrorName(error);
  logger.error("MongoDB transaction failed", { reason, driverErrorName });
  return new DatabaseTransactionError(reason, driverErrorName);
}

/** Abort the open transaction. A failed abort must not hide the original callback error. */
async function abortQuietly(session: ClientSession): Promise<void> {
  try {
    if (session.inTransaction()) await session.abortTransaction();
  } catch (error) {
    logger.error("MongoDB transaction abort failed", { driverErrorName: safeErrorName(error) });
  }
}

/**
 * End the session. This runs after the commit or abort is done.
 * A failure here must not turn a committed transaction into a reported failure.
 */
async function endQuietly(session: ClientSession): Promise<void> {
  try {
    await session.endSession();
  } catch (error) {
    logger.error("MongoDB session end failed", { driverErrorName: safeErrorName(error) });
  }
}

/**
 * Run `callback` inside one MongoDB transaction and return its result.
 *
 * Throws `DatabaseConnectionError` when MongoDB cannot be reached (from `connectToDatabase`).
 * Throws `DatabaseTransactionError` when the transaction cannot start, is not supported, or cannot commit.
 * Rethrows any error from `callback` unchanged (after abort).
 */
export async function runInTransaction<T>(callback: TransactionCallback<T>): Promise<T> {
  const connection = await connectToDatabase();

  let session: ClientSession;
  try {
    session = await connection.startSession();
  } catch (error) {
    throw toTransactionError(error, "start_failed");
  }

  try {
    try {
      session.startTransaction();
    } catch (error) {
      throw toTransactionError(error, "start_failed");
    }

    let result: T;
    try {
      result = await callback(session);
    } catch (error) {
      await abortQuietly(session);
      if (isTransactionUnsupported(error)) throw toTransactionError(error, "unsupported");
      throw error;
    }

    try {
      await session.commitTransaction();
    } catch (error) {
      throw toTransactionError(error, isTransactionUnsupported(error) ? "unsupported" : "commit_failed");
    }
    return result;
  } finally {
    await endQuietly(session);
  }
}
