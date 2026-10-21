import { beforeEach, describe, expect, it, vi } from "vitest";

// Unit tests only. The connection layer, the logger and the session are test doubles.
// They check call order, session release, error mapping and the absence of any non-transactional fallback.
// Real MongoDB behavior (atomicity, rollback, isolation) is proven in tests-integration/.

const m = vi.hoisted(() => ({
  connectToDatabase: vi.fn(),
  loggerError: vi.fn(),
}));
vi.mock("@/lib/db/connection", () => ({ connectToDatabase: m.connectToDatabase }));
vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: m.loggerError },
}));

import { runInTransaction } from "@/lib/db/transaction";
import { DatabaseConnectionError, DatabaseTransactionError, toErrorResponse } from "@/lib/errors";

const SECRET_URI = "mongodb://dbuser:s3cretPass@secret-host.internal:27017/shanilo";

/** Session double. Calls are recorded in `events`, so the order can be checked. */
function makeSession(overrides: Partial<Record<string, unknown>> = {}) {
  const events: string[] = [];
  let open = false;
  const session = {
    startTransaction: vi.fn(() => {
      events.push("start");
      open = true;
    }),
    commitTransaction: vi.fn(async () => {
      events.push("commit");
      open = false;
    }),
    abortTransaction: vi.fn(async () => {
      events.push("abort");
      open = false;
    }),
    endSession: vi.fn(async () => {
      events.push("end");
    }),
    inTransaction: vi.fn(() => open),
    ...overrides,
  };
  return { session, events };
}

function useSession(session: unknown) {
  const startSession = vi.fn(async () => session);
  m.connectToDatabase.mockResolvedValue({ startSession });
  return startSession;
}

/** Error shaped like a driver error, with sensitive text in the message and a cause. */
function driverError(name: string, extra: Record<string, unknown> = {}) {
  const error = new Error(`failed to reach ${SECRET_URI}`, { cause: new Error(SECRET_URI) });
  error.name = name;
  return Object.assign(error, extra);
}

function expectNoLeak(value: unknown) {
  const text =
    value instanceof Error
      ? JSON.stringify(value, Object.getOwnPropertyNames(value)) + String(value.message) + String(value.stack)
      : JSON.stringify(value);
  expect(text).not.toContain("s3cretPass");
  expect(text).not.toContain("secret-host");
  expect(text).not.toContain("dbuser");
  expect(text).not.toContain("27017");
  expect(text).not.toContain("mongodb://");
}

function expectLogsClean() {
  const text = JSON.stringify(m.loggerError.mock.calls);
  expect(text).not.toContain("s3cretPass");
  expect(text).not.toContain("secret-host");
  expect(text).not.toContain("mongodb://");
}

beforeEach(() => {
  m.connectToDatabase.mockReset();
  m.loggerError.mockReset();
});

describe("runInTransaction: success", () => {
  it("runs the callback with the session, commits, ends the session and returns the result", async () => {
    const { session, events } = makeSession();
    const startSession = useSession(session);
    const callback = vi.fn(async (s: unknown) => {
      events.push("callback");
      expect(s).toBe(session);
      return { ok: 42 };
    });

    const result = await runInTransaction(callback);

    expect(result).toEqual({ ok: 42 });
    expect(startSession).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(events).toEqual(["start", "callback", "commit", "end"]);
    expect(session.abortTransaction).not.toHaveBeenCalled();
  });

  it("does not fail when ending the session fails after a successful commit", async () => {
    const { session } = makeSession({
      endSession: vi.fn(async () => {
        throw driverError("MongoServerError");
      }),
    });
    useSession(session);

    await expect(runInTransaction(async () => "committed")).resolves.toBe("committed");
    expect(session.commitTransaction).toHaveBeenCalledTimes(1);
    expect(m.loggerError).toHaveBeenCalledTimes(1);
    expectLogsClean();
  });
});

describe("runInTransaction: callback failure", () => {
  it("aborts, never commits, rethrows the same error object and ends the session", async () => {
    const { session, events } = makeSession();
    useSession(session);
    const failure = new Error("business rule failed");

    const caught = await runInTransaction(async () => {
      events.push("callback");
      throw failure;
    }).catch((e: unknown) => e);

    expect(caught).toBe(failure);
    expect(events).toEqual(["start", "callback", "abort", "end"]);
    expect(session.commitTransaction).not.toHaveBeenCalled();
  });

  it("converts a synchronous throw from the callback in the same way", async () => {
    const { session, events } = makeSession();
    useSession(session);
    const failure = new Error("sync failure");

    const caught = await runInTransaction((() => {
      throw failure;
    }) as () => Promise<never>).catch((e: unknown) => e);

    expect(caught).toBe(failure);
    expect(events).toEqual(["start", "abort", "end"]);
  });

  it("runs the callback exactly once, also for a transient transaction error (no retry)", async () => {
    const { session } = makeSession();
    useSession(session);
    const transient = Object.assign(new Error("write conflict"), {
      name: "MongoServerError",
      code: 112,
      errorLabels: ["TransientTransactionError"],
    });
    const callback = vi.fn(async () => {
      throw transient;
    });

    await expect(runInTransaction(callback)).rejects.toBe(transient);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(session.startTransaction).toHaveBeenCalledTimes(1);
  });

  it("still throws the callback error when abort fails, and still ends the session", async () => {
    const { session, events } = makeSession({
      abortTransaction: vi.fn(async () => {
        throw driverError("MongoServerError");
      }),
    });
    useSession(session);
    const failure = new Error("business rule failed");

    const caught = await runInTransaction(async () => {
      throw failure;
    }).catch((e: unknown) => e);

    expect(caught).toBe(failure);
    expect(session.endSession).toHaveBeenCalledTimes(1);
    expect(events).not.toContain("commit");
    expect(m.loggerError).toHaveBeenCalledTimes(1);
    expectLogsClean();
  });

  it("does not call abort when the transaction is already closed", async () => {
    const { session } = makeSession({ inTransaction: vi.fn(() => false) });
    useSession(session);

    await expect(
      runInTransaction(async () => {
        throw new Error("x");
      }),
    ).rejects.toThrow("x");
    expect(session.abortTransaction).not.toHaveBeenCalled();
    expect(session.endSession).toHaveBeenCalledTimes(1);
  });
});

describe("runInTransaction: start failure", () => {
  it("throws a typed safe error when the session cannot start, and does not run the callback", async () => {
    m.connectToDatabase.mockResolvedValue({
      startSession: vi.fn(async () => {
        throw driverError("MongoServerSelectionError");
      }),
    });
    const callback = vi.fn(async () => "never");

    const caught = await runInTransaction(callback).catch((e: unknown) => e);

    expect(caught).toBeInstanceOf(DatabaseTransactionError);
    expect((caught as DatabaseTransactionError).reason).toBe("start_failed");
    expect((caught as DatabaseTransactionError).driverErrorName).toBe("MongoServerSelectionError");
    expect(callback).not.toHaveBeenCalled();
    expectNoLeak(caught);
    expectLogsClean();
  });

  it("throws a typed safe error when the transaction cannot start, ends the session, and does not run the callback", async () => {
    const { session } = makeSession({
      startTransaction: vi.fn(() => {
        throw driverError("MongoTransactionError");
      }),
    });
    useSession(session);
    const callback = vi.fn(async () => "never");

    const caught = await runInTransaction(callback).catch((e: unknown) => e);

    expect(caught).toBeInstanceOf(DatabaseTransactionError);
    expect((caught as DatabaseTransactionError).reason).toBe("start_failed");
    expect(callback).not.toHaveBeenCalled();
    expect(session.commitTransaction).not.toHaveBeenCalled();
    expect(session.endSession).toHaveBeenCalledTimes(1);
    expectNoLeak(caught);
    expectLogsClean();
  });

  it("passes a connection error through and starts no session", async () => {
    const connectionError = new DatabaseConnectionError("connect_failed", "MongoServerSelectionError");
    m.connectToDatabase.mockRejectedValue(connectionError);
    const callback = vi.fn(async () => "never");

    await expect(runInTransaction(callback)).rejects.toBe(connectionError);
    expect(callback).not.toHaveBeenCalled();
  });
});

describe("runInTransaction: commit failure", () => {
  it("throws a typed safe error, does not call abort, and ends the session", async () => {
    const { session, events } = makeSession({
      commitTransaction: vi.fn(async () => {
        throw driverError("MongoServerError");
      }),
    });
    useSession(session);

    const caught = await runInTransaction(async () => "value").catch((e: unknown) => e);

    expect(caught).toBeInstanceOf(DatabaseTransactionError);
    expect((caught as DatabaseTransactionError).reason).toBe("commit_failed");
    expect(session.abortTransaction).not.toHaveBeenCalled();
    expect(events).toEqual(["start", "end"]);
    expectNoLeak(caught);
    expectLogsClean();
  });
});

describe("runInTransaction: unsupported deployment (fail closed)", () => {
  const standaloneError = () =>
    driverError("MongoServerError", {
      code: 20,
      message: "Transaction numbers are only allowed on a replica set member or mongos",
    });

  it("maps the standalone server error to 'unsupported', aborts, and runs the callback only once", async () => {
    const { session } = makeSession();
    useSession(session);
    const callback = vi.fn(async () => {
      throw standaloneError();
    });

    const caught = await runInTransaction(callback).catch((e: unknown) => e);

    expect(caught).toBeInstanceOf(DatabaseTransactionError);
    expect((caught as DatabaseTransactionError).reason).toBe("unsupported");
    // No fallback: one callback run, one transaction, no commit, no second attempt without a transaction.
    expect(callback).toHaveBeenCalledTimes(1);
    expect(session.startTransaction).toHaveBeenCalledTimes(1);
    expect(session.commitTransaction).not.toHaveBeenCalled();
    expect(session.endSession).toHaveBeenCalledTimes(1);
    expectNoLeak(caught);
  });

  it("maps the driver compatibility error from session start to 'start_failed' with no callback run", async () => {
    m.connectToDatabase.mockResolvedValue({
      startSession: vi.fn(async () => {
        throw driverError("MongoCompatibilityError");
      }),
    });
    const callback = vi.fn(async () => "never");

    const caught = await runInTransaction(callback).catch((e: unknown) => e);

    expect(caught).toBeInstanceOf(DatabaseTransactionError);
    expect(callback).not.toHaveBeenCalled();
  });

  it("maps the driver compatibility error thrown inside the callback to 'unsupported'", async () => {
    const { session } = makeSession();
    useSession(session);

    const caught = await runInTransaction(async () => {
      throw driverError("MongoCompatibilityError");
    }).catch((e: unknown) => e);

    expect((caught as DatabaseTransactionError).reason).toBe("unsupported");
  });

  it("does not map other server errors with code 20", async () => {
    const { session } = makeSession();
    useSession(session);
    const other = Object.assign(new Error("some other illegal operation"), { name: "MongoServerError", code: 20 });

    await expect(
      runInTransaction(async () => {
        throw other;
      }),
    ).rejects.toBe(other);
  });
});

describe("DatabaseTransactionError: public exposure", () => {
  it("has a fixed message, no cause, and a generic API response", async () => {
    const { session } = makeSession({
      commitTransaction: vi.fn(async () => {
        throw driverError("MongoServerError");
      }),
    });
    useSession(session);

    const caught = (await runInTransaction(async () => 1).catch((e: unknown) => e)) as DatabaseTransactionError;

    expect(caught.code).toBe("DATABASE_TRANSACTION_FAILED");
    expect(caught.message).toBe("Database transaction could not be completed");
    expect(caught.cause).toBeUndefined();
    const response = toErrorResponse(caught);
    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe("INTERNAL_ERROR");
    expectNoLeak(response.body);
  });
});
