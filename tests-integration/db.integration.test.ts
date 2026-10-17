import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomBytes } from "node:crypto";
import type { Connection } from "mongoose";
import { getTestDatabaseEnv } from "../tests/support/test-env";

// Real MongoDB test. It needs MONGODB_TEST_URI (a dedicated test Replica Set).
// It never reads MONGODB_URI for the connection. It refuses to run if both are equal.
// It writes only to one temporary collection. It drops only that collection.

const TEST_URI = getTestDatabaseEnv(process.env).MONGODB_TEST_URI;
const COLLECTION = `__shanilo_it_${randomBytes(6).toString("hex")}`;

type Mod = typeof import("@/lib/db/connection");
let db: Mod;
let errors: typeof import("@/lib/errors");
let conn: Connection;

beforeAll(async () => {
  vi.stubEnv("MONGODB_URI", TEST_URI);
  vi.resetModules();
  errors = await import("@/lib/errors");
  db = await import("@/lib/db/connection");
  conn = await db.connectToDatabase();
  // Safety guard: write only into a database whose name says "test".
  if (!/test/i.test(conn.name)) {
    await db.disconnectDatabase();
    throw new Error(`Refusing to write: database name "${conn.name}" does not contain "test".`);
  }
});

afterAll(async () => {
  try {
    if (conn && conn.readyState === 1) await conn.collection(COLLECTION).drop().catch(() => {});
  } finally {
    await db?.disconnectDatabase();
    vi.unstubAllEnvs();
  }
});

describe("real MongoDB: connection layer", () => {
  it("connects and answers ping", async () => {
    expect(conn.readyState).toBe(1);
    const res = await conn.db!.admin().command({ ping: 1 });
    expect(res.ok).toBe(1);
  });

  it("returns the same connection on repeated and parallel calls", async () => {
    const [a, b, c] = await Promise.all([db.connectToDatabase(), db.connectToDatabase(), db.connectToDatabase()]);
    expect(a).toBe(conn);
    expect(b).toBe(conn);
    expect(c).toBe(conn);
  });

  it("targets a Replica Set (needed for multi-document transactions)", async () => {
    const hello = await conn.db!.admin().command({ hello: 1 });
    expect(typeof hello.setName).toBe("string");
  });
});

describe("real MongoDB: transactions", () => {
  it("commits two writes together", async () => {
    await conn.db!.createCollection(COLLECTION).catch(() => {});
    const col = conn.collection(COLLECTION);
    const session = await conn.startSession();
    try {
      await session.withTransaction(async () => {
        await col.insertOne({ k: "commit", n: 1 }, { session });
        await col.insertOne({ k: "commit", n: 2 }, { session });
      });
    } finally {
      await session.endSession();
    }
    expect(await col.countDocuments({ k: "commit" })).toBe(2);
  });

  it("rolls back every write when the callback throws", async () => {
    const col = conn.collection(COLLECTION);
    const session = await conn.startSession();
    await expect(
      session.withTransaction(async () => {
        await col.insertOne({ k: "abort", n: 1 }, { session });
        await col.insertOne({ k: "abort", n: 2 }, { session });
        throw new Error("force rollback");
      }),
    ).rejects.toThrow("force rollback");
    await session.endSession();
    expect(await col.countDocuments({ k: "abort" })).toBe(0);
  });

  it("does not show uncommitted writes to other readers", async () => {
    const col = conn.collection(COLLECTION);
    const session = await conn.startSession();
    try {
      session.startTransaction();
      await col.insertOne({ k: "isolation" }, { session });
      expect(await col.countDocuments({ k: "isolation" })).toBe(0);
      await session.abortTransaction();
    } finally {
      await session.endSession();
    }
  });
});

describe("real MongoDB: failure and recovery", () => {
  it("fails fast with a safe error, then connects again", async () => {
    await db.disconnectDatabase();
    expect(conn.readyState).toBe(0);

    vi.stubEnv("MONGODB_URI", "mongodb://unreachable-host-for-test.invalid:27017/shanilo_test");
    const started = Date.now();
    const failure = await db.connectToDatabase().then(
      () => null,
      (e: unknown) => e,
    );
    expect(failure).toBeInstanceOf(errors.DatabaseConnectionError);
    expect(Date.now() - started).toBeLessThan(15_000);
    const text = JSON.stringify(failure) + String((failure as Error).message);
    expect(text).not.toContain("unreachable-host-for-test");
    expect(text).not.toContain("27017");

    // A failed attempt must not be cached.
    vi.stubEnv("MONGODB_URI", TEST_URI);
    const again = await db.connectToDatabase();
    expect(again.readyState).toBe(1);
    conn = again;
  });

  it("disconnect then connect works", async () => {
    await db.disconnectDatabase();
    expect(conn.readyState).toBe(0);
    conn = await db.connectToDatabase();
    expect(conn.readyState).toBe(1);
  });
});
