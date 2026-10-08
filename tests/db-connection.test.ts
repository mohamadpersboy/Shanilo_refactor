import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DatabaseConnectionError } from "@/lib/errors";

// Unit tests only. Mongoose is replaced by a small mock. No real MongoDB connection is made.
const m = vi.hoisted(() => {
  const connection = { readyState: 0, asPromise: vi.fn() };
  const mongoose = { set: vi.fn(), connect: vi.fn(), disconnect: vi.fn(), connection };
  return { mongoose, connection };
});
vi.mock("mongoose", () => ({ default: m.mongoose }));

const RUNTIME_URI = "mongodb://runtime-host:27017/shanilo";
const TEST_URI = "mongodb://test-host:27018/shanilo_test";
const CACHE_KEY = Symbol.for("shanilo.db.connection-cache");

const DISCONNECTED = 0;
const CONNECTED = 1;
const CONNECTING = 2;
const DISCONNECTING = 3;

type Mod = typeof import("@/lib/db/connection");

// `vi.resetModules()` also reloads `@/lib/errors`. Use the same fresh instance as the module under test,
// otherwise `instanceof` compares two different copies of the same class.
let errors: typeof import("@/lib/errors");

async function loadModule(): Promise<Mod> {
  vi.resetModules();
  errors = await import("@/lib/errors");
  return import("@/lib/db/connection");
}

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Make `mongoose.connect` succeed and move the mocked connection to "connected". */
function connectSucceeds() {
  m.mongoose.connect.mockImplementation(async () => {
    m.connection.readyState = CONNECTED;
    return m.mongoose;
  });
}

beforeEach(() => {
  m.mongoose.set.mockReset();
  m.mongoose.connect.mockReset();
  m.mongoose.disconnect.mockReset();
  m.connection.asPromise.mockReset();
  m.connection.readyState = DISCONNECTED;
  delete (globalThis as Record<symbol, unknown>)[CACHE_KEY];
  vi.stubEnv("MONGODB_URI", RUNTIME_URI);
  vi.stubEnv("MONGODB_TEST_URI", TEST_URI);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("db connection: lazy and configuration", () => {
  it("does not connect, disconnect or read env when the module is imported", async () => {
    const sigterm = process.listenerCount("SIGTERM");
    const sigint = process.listenerCount("SIGINT");
    await loadModule();
    expect(m.mongoose.connect).not.toHaveBeenCalled();
    expect(m.mongoose.disconnect).not.toHaveBeenCalled();
    expect(process.listenerCount("SIGTERM")).toBe(sigterm);
    expect(process.listenerCount("SIGINT")).toBe(sigint);
  });

  it("sets strictQuery to true when the module is loaded", async () => {
    await loadModule();
    expect(m.mongoose.set).toHaveBeenCalledWith("strictQuery", true);
  });

  it("connects with MONGODB_URI and the agreed Mongoose options", async () => {
    connectSucceeds();
    const { connectToDatabase, MONGOOSE_CONNECT_OPTIONS } = await loadModule();
    const connection = await connectToDatabase();

    expect(connection).toBe(m.connection);
    expect(m.mongoose.connect).toHaveBeenCalledTimes(1);
    const [uri, options] = m.mongoose.connect.mock.calls[0];
    expect(uri).toBe(RUNTIME_URI);
    expect(options).toBe(MONGOOSE_CONNECT_OPTIONS);
    expect(options).toMatchObject({ bufferCommands: false, autoIndex: false, autoCreate: false });
  });

  it("sets only the options we chose, with a bounded pool and a short server selection timeout", async () => {
    const { MONGOOSE_CONNECT_OPTIONS: o, MAX_POOL_SIZE, SERVER_SELECTION_TIMEOUT_MS } = await loadModule();
    expect(Object.keys(o).sort()).toEqual(
      ["autoCreate", "autoIndex", "bufferCommands", "maxPoolSize", "serverSelectionTimeoutMS"].sort(),
    );
    expect(o.maxPoolSize).toBe(MAX_POOL_SIZE);
    expect(MAX_POOL_SIZE).toBeGreaterThan(0);
    expect(MAX_POOL_SIZE).toBeLessThanOrEqual(20);
    expect(o.serverSelectionTimeoutMS).toBe(SERVER_SELECTION_TIMEOUT_MS);
    expect(SERVER_SELECTION_TIMEOUT_MS).toBeLessThanOrEqual(10_000);
    expect(Object.isFrozen(o)).toBe(true);
  });

  it("never uses MONGODB_TEST_URI, even when MONGODB_URI is missing", async () => {
    connectSucceeds();
    vi.stubEnv("MONGODB_URI", "");
    const { connectToDatabase } = await loadModule();
    await expect(connectToDatabase()).rejects.toBeInstanceOf(errors.ConfigError);
    expect(m.mongoose.connect).not.toHaveBeenCalled();
  });

  it("rejects an invalid MONGODB_URI scheme with a ConfigError that names the variable only", async () => {
    vi.stubEnv("MONGODB_URI", "http://user:hunter2@host/db");
    const { connectToDatabase } = await loadModule();
    const error = await connectToDatabase().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(errors.ConfigError);
    expect((error as Error).message).toContain("MONGODB_URI");
    expect((error as Error).message).not.toContain("hunter2");
    expect(m.mongoose.connect).not.toHaveBeenCalled();
  });
});

describe("db connection: caching and states", () => {
  it("shares one in-flight attempt between concurrent callers", async () => {
    const gate = deferred<void>();
    m.mongoose.connect.mockImplementation(async () => {
      m.connection.readyState = CONNECTING;
      await gate.promise;
      m.connection.readyState = CONNECTED;
      return m.mongoose;
    });
    const { connectToDatabase } = await loadModule();

    const first = connectToDatabase();
    const second = connectToDatabase();
    // The module is mid-connect: a later call must reuse the cached attempt.
    const third = connectToDatabase();
    gate.resolve();

    const results = await Promise.all([first, second, third]);
    for (const connection of results) expect(connection).toBe(m.connection);
    expect(m.mongoose.connect).toHaveBeenCalledTimes(1);
  });

  it("does not create a new connection while one is connected", async () => {
    connectSucceeds();
    const { connectToDatabase } = await loadModule();
    await connectToDatabase();
    await connectToDatabase();
    await connectToDatabase();
    expect(m.mongoose.connect).toHaveBeenCalledTimes(1);
  });

  it("keeps the cache on globalThis, so a reloaded module reuses the connection", async () => {
    connectSucceeds();
    const first = await loadModule();
    await first.connectToDatabase();

    expect((globalThis as Record<symbol, unknown>)[CACHE_KEY]).toBeDefined();

    // Simulate hot reload: fresh module instance, same globalThis, same connected Mongoose.
    const reloaded = await loadModule();
    await reloaded.connectToDatabase();
    expect(m.mongoose.connect).toHaveBeenCalledTimes(1);
  });

  it("drops a rejected attempt from the cache, so the next call can retry", async () => {
    m.mongoose.connect
      .mockImplementationOnce(async () => {
        m.connection.readyState = DISCONNECTED;
        throw Object.assign(new Error("boom"), { name: "MongoServerSelectionError" });
      })
      .mockImplementationOnce(async () => {
        m.connection.readyState = CONNECTED;
        return m.mongoose;
      });
    const { connectToDatabase } = await loadModule();

    await expect(connectToDatabase()).rejects.toBeInstanceOf(errors.DatabaseConnectionError);
    expect(m.mongoose.connect).toHaveBeenCalledTimes(1);

    await expect(connectToDatabase()).resolves.toBe(m.connection);
    expect(m.mongoose.connect).toHaveBeenCalledTimes(2);
  });

  it("retries more than once if MongoDB stays unavailable", async () => {
    m.mongoose.connect.mockImplementation(async () => {
      throw new Error("down");
    });
    const { connectToDatabase } = await loadModule();
    await expect(connectToDatabase()).rejects.toBeInstanceOf(errors.DatabaseConnectionError);
    await expect(connectToDatabase()).rejects.toBeInstanceOf(errors.DatabaseConnectionError);
    expect(m.mongoose.connect).toHaveBeenCalledTimes(2);
  });

  it("fails fast while the connection is closing and starts no new connection", async () => {
    m.connection.readyState = DISCONNECTING;
    const { connectToDatabase } = await loadModule();
    const error = await connectToDatabase().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(errors.DatabaseConnectionError);
    expect((error as DatabaseConnectionError).reason).toBe("connection_closing");
    expect(m.mongoose.connect).not.toHaveBeenCalled();
  });

  it("waits for a connect that another caller started, without caching it", async () => {
    m.connection.readyState = CONNECTING;
    m.connection.asPromise.mockResolvedValue(m.connection);
    const { connectToDatabase } = await loadModule();
    await expect(connectToDatabase()).resolves.toBe(m.connection);
    expect(m.connection.asPromise).toHaveBeenCalledTimes(1);
    expect(m.mongoose.connect).not.toHaveBeenCalled();
  });

  it("trusts the driver to reconnect after a successful connect, and opens no second connection", async () => {
    connectSucceeds();
    const { connectToDatabase } = await loadModule();
    await connectToDatabase();

    m.connection.readyState = DISCONNECTED; // network drop; the driver reconnects by itself
    await expect(connectToDatabase()).resolves.toBe(m.connection);
    expect(m.mongoose.connect).toHaveBeenCalledTimes(1);
  });

  it("connects again after an explicit disconnect", async () => {
    connectSucceeds();
    m.mongoose.disconnect.mockImplementation(async () => {
      m.connection.readyState = DISCONNECTED;
    });
    const { connectToDatabase, disconnectDatabase } = await loadModule();

    await connectToDatabase();
    await disconnectDatabase();
    expect(m.mongoose.disconnect).toHaveBeenCalledTimes(1);

    await connectToDatabase();
    expect(m.mongoose.connect).toHaveBeenCalledTimes(2);
  });

  it("disconnectDatabase does nothing when already disconnected", async () => {
    const { disconnectDatabase } = await loadModule();
    await disconnectDatabase();
    expect(m.mongoose.disconnect).not.toHaveBeenCalled();
  });

  it("ignores the result of an attempt that was cancelled by disconnectDatabase", async () => {
    const gate = deferred<void>();
    m.mongoose.connect.mockImplementation(async () => {
      m.connection.readyState = CONNECTING;
      await gate.promise;
      m.connection.readyState = CONNECTED;
      return m.mongoose;
    });
    m.mongoose.disconnect.mockImplementation(async () => {
      m.connection.readyState = DISCONNECTED;
    });
    const { connectToDatabase, disconnectDatabase } = await loadModule();

    const pending = connectToDatabase();
    await disconnectDatabase();
    gate.resolve();
    await pending;

    const cache = (globalThis as Record<symbol, { promise: unknown; established: boolean }>)[CACHE_KEY];
    expect(cache.promise).toBeNull();
    expect(cache.established).toBe(false);
  });
});

describe("db connection: errors do not leak connection details", () => {
  // Fake values, used only to prove they never appear in errors or logs.
  // Built from parts so secret scanners do not flag a credential-shaped literal.
  const SECRET_URI = ["mongodb+srv:", "//", "appuser", ":", "s3cretPw", "@", "cluster0.internal-host.example.net:27017/shanilo?retryWrites=true"].join("");
  const FORBIDDEN = ["appuser", "s3cretPw", "internal-host", "cluster0", "27017", "mongodb://", "mongodb+srv://", "retryWrites"];

  function expectClean(text: string) {
    for (const part of FORBIDDEN) expect(text).not.toContain(part);
  }

  it("turns a driver error that contains the URI into a safe DatabaseConnectionError", async () => {
    vi.stubEnv("MONGODB_URI", SECRET_URI);
    m.mongoose.connect.mockImplementation(async (uri: string) => {
      throw Object.assign(new Error(`getaddrinfo ENOTFOUND ${uri} (cluster0.internal-host.example.net:27017)`), {
        name: "MongoServerSelectionError",
      });
    });
    const { connectToDatabase } = await loadModule();
    const error = (await connectToDatabase().catch((e: unknown) => e)) as DatabaseConnectionError;

    expect(error).toBeInstanceOf(errors.DatabaseConnectionError);
    expect(error.code).toBe("DATABASE_CONNECTION_FAILED");
    expect(error.reason).toBe("connect_failed");
    expect(error.driverErrorName).toBe("MongoServerSelectionError");
    expect(error.cause).toBeUndefined();

    expectClean(error.message);
    expectClean(String(error));
    expectClean(error.stack ?? "");
    expectClean(JSON.stringify(error));
    expectClean(JSON.stringify(errors.toErrorResponse(error)));
  });

  it("does not write the URI or the raw driver error to the log", async () => {
    vi.stubEnv("MONGODB_URI", SECRET_URI);
    m.mongoose.connect.mockImplementation(async (uri: string) => {
      throw Object.assign(new Error(`cannot connect to ${uri}`), { name: "MongoParseError" });
    });
    const { connectToDatabase } = await loadModule();
    await connectToDatabase().catch(() => undefined);

    const lines = [console.error, console.warn, console.log].flatMap((spy) =>
      vi.mocked(spy).mock.calls.map((args) => args.map(String).join(" ")),
    );
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) expectClean(line);
    expect(lines.join("\n")).toContain("MongoParseError");
  });

  it("replaces an error name that is not a plain class name", async () => {
    m.mongoose.connect.mockImplementation(async () => {
      throw Object.assign(new Error("x"), { name: "host=db.internal:27017 user=appuser" });
    });
    const { connectToDatabase } = await loadModule();
    const error = (await connectToDatabase().catch((e: unknown) => e)) as DatabaseConnectionError;
    expect(error.driverErrorName).toBe("UnknownError");
  });

  it("handles a thrown value that is not an Error", async () => {
    m.mongoose.connect.mockImplementation(async () => {
      throw SECRET_URI;
    });
    const { connectToDatabase } = await loadModule();
    const error = (await connectToDatabase().catch((e: unknown) => e)) as DatabaseConnectionError;
    expect(error).toBeInstanceOf(errors.DatabaseConnectionError);
    expect(error.driverErrorName).toBe("UnknownError");
    expectClean(JSON.stringify(error));
  });

  it("also converts a synchronous throw from mongoose.connect", async () => {
    m.mongoose.connect.mockImplementation(() => {
      throw Object.assign(new Error(`bad uri ${SECRET_URI}`), { name: "MongoParseError" });
    });
    const { connectToDatabase } = await loadModule();
    const error = (await connectToDatabase().catch((e: unknown) => e)) as DatabaseConnectionError;
    expect(error).toBeInstanceOf(errors.DatabaseConnectionError);
    expectClean(error.message);
    expectClean(JSON.stringify(error));
  });

  it("turns a failed disconnect into a safe error", async () => {
    m.connection.readyState = CONNECTED;
    m.mongoose.disconnect.mockRejectedValue(Object.assign(new Error(`close failed ${SECRET_URI}`), { name: "MongoNetworkError" }));
    const { disconnectDatabase } = await loadModule();
    const error = (await disconnectDatabase().catch((e: unknown) => e)) as DatabaseConnectionError;
    expect(error).toBeInstanceOf(errors.DatabaseConnectionError);
    expect(error.reason).toBe("disconnect_failed");
    expectClean(error.message);
    expectClean(JSON.stringify(error));
  });

  it("maps to a generic 500 response for API clients", async () => {
    const response = errors.toErrorResponse(new errors.DatabaseConnectionError("connect_failed", "MongoServerSelectionError"));
    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe("INTERNAL_ERROR");
  });
});
