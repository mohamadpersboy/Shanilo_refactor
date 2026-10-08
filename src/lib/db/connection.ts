import "server-only";
import mongoose, { type Connection, type ConnectOptions } from "mongoose";
import { getDatabaseEnv } from "@/lib/env/server";
import { DatabaseConnectionError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/**
 * MongoDB connection layer (Mongoose 9, default connection).
 *
 * - Lazy: importing this module never opens a connection. Only `connectToDatabase()` does.
 * - One connection per process: the in-flight Promise is cached on `globalThis`,
 *   so Next.js hot reload does not open a second connection.
 * - A rejected Promise is dropped from the cache, so the next call can retry.
 * - Reconnect after a network drop is left to the MongoDB driver.
 * - Errors are converted to `DatabaseConnectionError`. No URI, host or driver text leaves this file.
 */

/**
 * Mongoose reads `strictQuery` when a Schema is created. It is not a connection option.
 * This only sets the default for Schemas created after this module is loaded.
 */
mongoose.set("strictQuery", true);

/** Upper bound for the driver pool. The driver default (100) is too high for one VPS. */
export const MAX_POOL_SIZE = 10;
/** Fail fast when MongoDB is down. The driver default (30000 ms) would stall requests. */
export const SERVER_SELECTION_TIMEOUT_MS = 5_000;

export const MONGOOSE_CONNECT_OPTIONS: Readonly<ConnectOptions> = Object.freeze({
  bufferCommands: false,
  autoIndex: false,
  autoCreate: false,
  maxPoolSize: MAX_POOL_SIZE,
  serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS,
});

// Mongoose `readyState` values (see `mongoose.STATES`).
const DISCONNECTED = 0;
const CONNECTED = 1;
const CONNECTING = 2;
const DISCONNECTING = 3;

interface ConnectionCache {
  /** Promise of the current or last connect attempt. `null` when none is usable. */
  promise: Promise<Connection> | null;
  /** True after a connect attempt succeeded and nobody has closed the connection since. */
  established: boolean;
}

const CACHE_KEY = Symbol.for("shanilo.db.connection-cache");
type GlobalWithCache = typeof globalThis & { [CACHE_KEY]?: ConnectionCache };

function getCache(): ConnectionCache {
  const holder = globalThis as GlobalWithCache;
  return (holder[CACHE_KEY] ??= { promise: null, established: false });
}

/** Only a plain class name is safe to keep. Anything else could carry host or credentials. */
function safeErrorName(error: unknown): string {
  const name = error instanceof Error ? error.name : "";
  return /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(name) ? name : "UnknownError";
}

function toConnectionError(error: unknown, reason: "connect_failed" | "disconnect_failed"): DatabaseConnectionError {
  const driverErrorName = safeErrorName(error);
  logger.error("MongoDB operation failed", { reason, driverErrorName });
  return new DatabaseConnectionError(reason, driverErrorName);
}

function startConnection(uri: string, cache: ConnectionCache): Promise<Connection> {
  // The async function body runs up to the first `await` synchronously,
  // so a synchronous throw from `mongoose.connect` is also converted.
  const attempt: Promise<Connection> = (async () => {
    try {
      await mongoose.connect(uri, MONGOOSE_CONNECT_OPTIONS);
    } catch (error) {
      throw toConnectionError(error, "connect_failed");
    }
    return mongoose.connection;
  })();

  cache.promise = attempt;
  // Registered before any caller awaits `attempt`, so the cache is already updated
  // when a caller catches the rejection and retries.
  attempt.then(
    () => {
      if (cache.promise === attempt) cache.established = true;
    },
    () => {
      if (cache.promise === attempt) {
        cache.promise = null;
        cache.established = false;
      }
    },
  );
  return attempt;
}

/**
 * Return the shared MongoDB connection. Connect on first use.
 *
 * - connected: return it.
 * - connecting: return the cached attempt.
 * - disconnecting: throw `DatabaseConnectionError` ("connection_closing"). Call again after the close ends.
 * - disconnected, never connected or last attempt failed: start a new attempt.
 * - disconnected after a successful connect: the driver is reconnecting by itself. Return the connection.
 *   Operations fail fast (see SERVER_SELECTION_TIMEOUT_MS) until the driver is back.
 *
 * Throws `ConfigError` (variable names only) when `MONGODB_URI` is missing or invalid.
 * Throws `DatabaseConnectionError` when MongoDB cannot be reached.
 */
export async function connectToDatabase(): Promise<Connection> {
  const connection = mongoose.connection;
  const cache = getCache();

  switch (connection.readyState) {
    case CONNECTED:
      return connection;

    case DISCONNECTING:
      throw new DatabaseConnectionError("connection_closing");

    case CONNECTING:
      if (cache.promise) return cache.promise;
      // Another caller started this connect outside this module. Wait for it. Do not cache.
      try {
        await connection.asPromise();
      } catch (error) {
        throw toConnectionError(error, "connect_failed");
      }
      return connection;

    case DISCONNECTED:
    default:
      if (cache.promise) {
        // An attempt is in flight, or the connection was established and the driver is reconnecting.
        if (cache.established) return connection;
        return cache.promise;
      }
      return startConnection(getDatabaseEnv().MONGODB_URI, cache);
  }
}

/**
 * Close the connection and clear the cache, so the next `connectToDatabase()` connects again.
 * For tests and controlled lifecycles only. Nothing in this module calls it automatically.
 * No SIGTERM or SIGINT handler is registered here.
 */
export async function disconnectDatabase(): Promise<void> {
  const cache = getCache();
  cache.promise = null;
  cache.established = false;
  if (mongoose.connection.readyState === DISCONNECTED) return;
  try {
    await mongoose.disconnect();
  } catch (error) {
    throw toConnectionError(error, "disconnect_failed");
  }
}
