import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomBytes } from "node:crypto";
import type { Connection, Model } from "mongoose";
import { getTestDatabaseEnv } from "../tests/support/test-env";

// Real MongoDB test of the repository foundation. It needs MONGODB_TEST_URI (a dedicated test Replica Set).
// It never reads MONGODB_URI for the connection. It refuses to run if both are equal.
// It uses ONE temporary collection with a test-only Model defined in this file. It drops only that collection.
// The Model is not a business schema. It exists only to exercise the adapter.

const TEST_URI = getTestDatabaseEnv(process.env).MONGODB_TEST_URI;
const COLLECTION = `__shanilo_it_repo_${randomBytes(6).toString("hex")}`;

interface Raw {
  name: string;
  code: string;
  score?: number; // has a Schema default
  internal: string;
}
interface Dto {
  id: string;
  name: string;
  code: string;
  score: number;
}

type Db = typeof import("@/lib/db/connection");
let db: Db;
let tx: typeof import("@/lib/db/transaction");
let repoErrors: typeof import("@/lib/repositories/errors");
let appErrors: typeof import("@/lib/errors");
let types: typeof import("@/lib/repositories/types");
let conn: Connection;
let TestModel: Model<Raw>;
let repo: import("@/lib/repositories/mongoose/adapter").MongooseAdapter<Raw, Dto, "code" | "name", "name" | "code" | "score", "name" | "score">;

beforeAll(async () => {
  vi.stubEnv("MONGODB_URI", TEST_URI);
  vi.resetModules();
  db = await import("@/lib/db/connection");
  tx = await import("@/lib/db/transaction");
  repoErrors = await import("@/lib/repositories/errors");
  appErrors = await import("@/lib/errors");
  types = await import("@/lib/repositories/types");
  const { createMongooseAdapter } = await import("@/lib/repositories/mongoose/adapter");
  const { idToString } = await import("@/lib/repositories/mongoose/mapping");
  const { Schema, model } = await import("mongoose");

  conn = await db.connectToDatabase();
  // Safety guard: write only into a database whose name says "test".
  if (!/test/i.test(conn.name)) {
    await db.disconnectDatabase();
    throw new Error(`Refusing to write: database name "${conn.name}" does not contain "test".`);
  }

  const schema = new Schema<Raw>(
    {
      name: { type: String, required: true },
      code: { type: String, required: true },
      score: { type: Number, default: 0 },
      internal: { type: String, default: "hidden" },
    },
    { strictQuery: true },
  );
  schema.index({ code: 1 }, { unique: true });
  TestModel = model<Raw>(`RepoIt${randomBytes(4).toString("hex")}`, schema, COLLECTION);
  // autoCreate and autoIndex are off in the connection layer. Create the collection and the unique index here,
  // because a collection cannot be created implicitly inside a transaction.
  await TestModel.createCollection();
  await TestModel.createIndexes();

  repo = createMongooseAdapter({
    model: TestModel,
    mapper: (r): Dto => ({ id: idToString(r._id), name: r.name, code: r.code, score: r.score ?? 0 }),
    fields: {
      projection: ["name", "code", "score"],
      filterable: ["code", "name"],
      creatable: ["name", "code", "score"],
      updatable: ["name", "score"],
    },
  });
});

afterAll(async () => {
  try {
    if (conn && conn.readyState === 1) await conn.collection(COLLECTION).drop().catch(() => {});
  } finally {
    await db?.disconnectDatabase();
    vi.unstubAllEnvs();
  }
});

const rawCount = (filter: Record<string, unknown> = {}) => conn.collection(COLLECTION).countDocuments(filter);

describe("real MongoDB: adapter without a transaction", () => {
  it("creates, reads and maps to a plain DTO without internal fields", async () => {
    const created = await repo.create({ name: "Plain", code: "plain-1", score: 5 }, types.NO_SESSION);
    expect(created).toEqual({ id: expect.stringMatching(/^[0-9a-f]{24}$/), name: "Plain", code: "plain-1", score: 5 });
    expect(Object.getPrototypeOf(created)).toBe(Object.prototype);
    expect(created).not.toHaveProperty("internal");

    const found = await repo.getById(created.id, types.NO_SESSION);
    expect(found).toEqual(created);
    expect(await repo.findOneBy({ code: "plain-1" }, types.NO_SESSION)).toEqual(created);
    expect(await repo.findOneBy({ code: "does-not-exist" }, types.NO_SESSION)).toBeNull();
    // The hidden field really exists in the database. The projection keeps it out of the DTO.
    expect(await rawCount({ code: "plain-1", internal: "hidden" })).toBe(1);
  });

  it("not found: null for findById, NotFoundError for getById and updateById", async () => {
    const missing = "0".repeat(24);
    expect(await repo.findById(missing, types.NO_SESSION)).toBeNull();
    await expect(repo.getById(missing, types.NO_SESSION)).rejects.toBeInstanceOf(appErrors.NotFoundError);
    await expect(repo.updateById(missing, { name: "x" }, types.NO_SESSION)).rejects.toBeInstanceOf(appErrors.NotFoundError);
  });

  it("maps a real duplicate key error (11000) to DuplicateKeyError without driver text", async () => {
    await repo.create({ name: "A", code: "dup-1" }, types.NO_SESSION);
    const error = await repo.create({ name: "B", code: "dup-1" }, types.NO_SESSION).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(repoErrors.DuplicateKeyError);
    expect(JSON.stringify(error) + (error as Error).message).not.toMatch(/E11000|dup-1|index|collection/i);
    expect(await rawCount({ code: "dup-1" })).toBe(1);
  });

  it("updates only allowlisted fields and rejects the rest before any write", async () => {
    const created = await repo.create({ name: "Before", code: "upd-1", score: 1 }, types.NO_SESSION);
    const updated = await repo.updateById(created.id, { name: "After", score: 9 }, types.NO_SESSION);
    expect(updated).toEqual({ ...created, name: "After", score: 9 });

    await expect(repo.updateById(created.id, { code: "hijack" } as never, types.NO_SESSION)).rejects.toBeInstanceOf(appErrors.ValidationError);
    await expect(repo.updateById(created.id, { $set: { code: "x" } } as never, types.NO_SESSION)).rejects.toBeInstanceOf(appErrors.ValidationError);
    await expect(repo.updateById(created.id, { name: { $ne: null } } as never, types.NO_SESSION)).rejects.toBeInstanceOf(appErrors.ValidationError);
    expect(await repo.getById(created.id, types.NO_SESSION)).toEqual(updated);
  });

  it("rejects operator filters (no query injection)", async () => {
    await expect(repo.findOneBy({ code: { $ne: "" } } as never, types.NO_SESSION)).rejects.toBeInstanceOf(appErrors.ValidationError);
    await expect(repo.findOneBy({ internal: "hidden" } as never, types.NO_SESSION)).rejects.toBeInstanceOf(appErrors.ValidationError);
  });

  it("paginates with a bounded, ordered page and the real total", async () => {
    await conn.collection(COLLECTION).deleteMany({ code: /^page-/ });
    for (let i = 0; i < 7; i += 1) await repo.create({ name: "Page", code: `page-${i}` }, types.NO_SESSION);

    const filter = { name: "Page" };
    const first = await repo.findPage({ page: 1, pageSize: 3 }, types.NO_SESSION, filter);
    const second = await repo.findPage({ page: 2, pageSize: 3 }, types.NO_SESSION, filter);
    const third = await repo.findPage({ page: 3, pageSize: 3 }, types.NO_SESSION, filter);
    const beyond = await repo.findPage({ page: 4, pageSize: 3 }, types.NO_SESSION, filter);

    expect([first.items.length, second.items.length, third.items.length, beyond.items.length]).toEqual([3, 3, 1, 0]);
    expect(first.total).toBe(7);
    const codes = [...first.items, ...second.items, ...third.items].map((i) => i.code);
    expect(codes).toEqual([0, 1, 2, 3, 4, 5, 6].map((i) => `page-${i}`));
    await expect(repo.findPage({ page: 1, pageSize: types.MAX_PAGE_SIZE + 1 }, types.NO_SESSION)).rejects.toBeInstanceOf(appErrors.ValidationError);
  });
});

describe("real MongoDB: session propagation and transactions owned by the Service", () => {
  it("commits several repository writes together when the session is passed", async () => {
    let used: unknown;
    await tx.runInTransaction(async (session) => {
      used = session;
      const ctx = types.repositoryContext(session);
      await repo.create({ name: "T", code: "tx-commit-1" }, ctx);
      await repo.create({ name: "T", code: "tx-commit-2" }, ctx);
    });
    expect(await rawCount({ code: /^tx-commit-/ })).toBe(2);
    expect((used as { hasEnded: boolean }).hasEnded).toBe(true);
  });

  it("rolls back repository writes (create and update) when the Service throws", async () => {
    const base = await repo.create({ name: "Base", code: "tx-abort-base", score: 1 }, types.NO_SESSION);
    const failure = new Error("business failure");

    const caught = await tx
      .runInTransaction(async (session) => {
        const ctx = types.repositoryContext(session);
        await repo.create({ name: "T", code: "tx-abort-new" }, ctx);
        await repo.updateById(base.id, { score: 99 }, ctx);
        throw failure;
      })
      .catch((e: unknown) => e);

    expect(caught).toBe(failure);
    expect(await rawCount({ code: "tx-abort-new" })).toBe(0);
    expect((await repo.getById(base.id, types.NO_SESSION)).score).toBe(1);
  });

  it("a read with the session sees uncommitted writes. a read without it does not", async () => {
    await tx.runInTransaction(async (session) => {
      const ctx = types.repositoryContext(session);
      await repo.create({ name: "Iso", code: "tx-iso-1" }, ctx);
      expect(await repo.findOneBy({ code: "tx-iso-1" }, ctx)).not.toBeNull();
      expect(await repo.findOneBy({ code: "tx-iso-1" }, types.NO_SESSION)).toBeNull();
      const inside = await repo.findPage({ page: 1, pageSize: 10 }, ctx, { name: "Iso" });
      const outside = await repo.findPage({ page: 1, pageSize: 10 }, types.NO_SESSION, { name: "Iso" });
      expect([inside.total, outside.total]).toEqual([1, 0]);
    });
    expect(await repo.findOneBy({ code: "tx-iso-1" }, types.NO_SESSION)).not.toBeNull();
  });

  it("a duplicate key inside a transaction becomes DuplicateKeyError and rolls everything back", async () => {
    await repo.create({ name: "Exists", code: "tx-dup-existing" }, types.NO_SESSION);
    const caught = await tx
      .runInTransaction(async (session) => {
        const ctx = types.repositoryContext(session);
        await repo.create({ name: "Ok", code: "tx-dup-new" }, ctx);
        await repo.create({ name: "Dup", code: "tx-dup-existing" }, ctx);
      })
      .catch((e: unknown) => e);

    expect(caught).toBeInstanceOf(repoErrors.DuplicateKeyError);
    expect(await rawCount({ code: "tx-dup-new" })).toBe(0);
    expect(await rawCount({ code: "tx-dup-existing" })).toBe(1);
  });

  it("the repository does not end the session. The helper does", async () => {
    await tx.runInTransaction(async (session) => {
      const ctx = types.repositoryContext(session);
      await repo.create({ name: "Live", code: "tx-live-1" }, ctx);
      expect(session.hasEnded).toBe(false);
      expect(session.inTransaction()).toBe(true);
      await repo.getById((await repo.findOneBy({ code: "tx-live-1" }, ctx))!.id, ctx);
      expect(session.hasEnded).toBe(false);
      expect(session.inTransaction()).toBe(true);
    });
  });
});
