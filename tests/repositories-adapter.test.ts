import { beforeEach, describe, expect, it, vi } from "vitest";
import { Types } from "mongoose";

// Unit tests. The Model, the connection layer and the logger are test doubles.
// They prove how the adapter calls the Model (session, projection, limits, update shape) and how it maps results.
// Real MongoDB behavior is proven in tests-integration/repository.integration.test.ts.

const m = vi.hoisted(() => ({ connectToDatabase: vi.fn(), loggerError: vi.fn() }));
vi.mock("@/lib/db/connection", () => ({ connectToDatabase: m.connectToDatabase }));
vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: m.loggerError },
}));

import { createMongooseAdapter } from "@/lib/repositories/mongoose/adapter";
import { idToString } from "@/lib/repositories/mongoose/mapping";
import { DuplicateKeyError, RepositoryOperationError } from "@/lib/repositories/errors";
import { MAX_PAGE_SIZE, NO_SESSION, repositoryContext } from "@/lib/repositories/types";
import { DatabaseConnectionError, NotFoundError, ValidationError } from "@/lib/errors";

interface Raw {
  name: string;
  email: string;
  age: number;
  hash: string;
}
interface Dto {
  id: string;
  name: string;
  email: string;
}

/** Thenable query double. Records every chained call. */
function query(result: unknown) {
  const q = {
    select: vi.fn(() => q),
    sort: vi.fn(() => q),
    skip: vi.fn(() => q),
    limit: vi.fn(() => q),
    session: vi.fn(() => q),
    lean: vi.fn(() => q),
    then: (ok: (v: unknown) => unknown, bad: (e: unknown) => unknown) => Promise.resolve(result).then(ok, bad),
  };
  return q;
}

const id = new Types.ObjectId();
const record = { _id: id, name: "Ann", email: "a@x.test", hash: "SECRET-HASH", __v: 0 };

function makeModel() {
  const model = {
    findOne: vi.fn(() => query(record)),
    find: vi.fn(() => query([record, { ...record, _id: new Types.ObjectId() }])),
    countDocuments: vi.fn(() => query(2)),
    findOneAndUpdate: vi.fn(() => query(record)),
    create: vi.fn(async () => [{ toObject: () => ({ ...record }) }]),
  };
  return model;
}

function makeAdapter(model = makeModel()) {
  const adapter = createMongooseAdapter<Raw, Dto, "email" | "name", "name" | "email", "name">({
    model: model as never,
    mapper: (r) => ({ id: idToString(r._id), name: r.name, email: r.email }),
    fields: {
      projection: ["name", "email"],
      filterable: ["email", "name"],
      creatable: ["name", "email"],
      updatable: ["name"],
    },
  });
  return { adapter, model };
}

const session = { id: "txn-session" } as never;
const txn = repositoryContext(session);
const VALID_ID = id.toHexString();

beforeEach(() => {
  m.connectToDatabase.mockReset().mockResolvedValue({});
  m.loggerError.mockReset();
});

describe("session propagation", () => {
  it("passes the explicit session to every read and write", async () => {
    const { adapter, model } = makeAdapter();
    await adapter.findById(VALID_ID, txn);
    await adapter.getById(VALID_ID, txn);
    await adapter.findOneBy({ email: "a@x.test" }, txn);
    await adapter.findPage({ page: 1, pageSize: 5 }, txn);
    await adapter.updateById(VALID_ID, { name: "B" }, txn);
    await adapter.create({ name: "n", email: "e" }, txn);

    const queries = [
      ...model.findOne.mock.results,
      ...model.find.mock.results,
      ...model.countDocuments.mock.results,
      ...model.findOneAndUpdate.mock.results,
    ].map((r) => r.value as ReturnType<typeof query>);
    expect(queries).toHaveLength(6);
    for (const q of queries) expect(q.session).toHaveBeenCalledExactlyOnceWith(session);
    expect(model.create).toHaveBeenCalledWith(expect.any(Array), { session });
  });

  it("with no session it still calls session(null) explicitly and runs without a transaction", async () => {
    const { adapter, model } = makeAdapter();
    await adapter.findById(VALID_ID, NO_SESSION);
    await adapter.create({ name: "n", email: "e" }, NO_SESSION);
    const q = model.findOne.mock.results[0].value as ReturnType<typeof query>;
    expect(q.session).toHaveBeenCalledExactlyOnceWith(null);
    expect(model.create).toHaveBeenCalledWith(expect.any(Array), { session: undefined });
  });

  it("never ends, commits or aborts the session", async () => {
    const calls = { commitTransaction: vi.fn(), abortTransaction: vi.fn(), endSession: vi.fn(), startTransaction: vi.fn() };
    const { adapter } = makeAdapter();
    const ctx = repositoryContext(calls as never);
    await adapter.findById(VALID_ID, ctx);
    await adapter.updateById(VALID_ID, { name: "B" }, ctx);
    await adapter.create({ name: "n", email: "e" }, ctx);
    await adapter.findPage({ page: 1, pageSize: 1 }, ctx);
    for (const fn of Object.values(calls)) expect(fn).not.toHaveBeenCalled();
  });

  it("keeps a session through an error and still does not end it", async () => {
    const model = makeModel();
    model.findOneAndUpdate.mockImplementation(() => query(Promise.reject(Object.assign(new Error("x"), { name: "MongoServerError", code: 11000 }))));
    const { adapter } = makeAdapter(model);
    const endSession = vi.fn();
    await expect(adapter.updateById(VALID_ID, { name: "B" }, repositoryContext({ endSession } as never))).rejects.toBeInstanceOf(DuplicateKeyError);
    expect(endSession).not.toHaveBeenCalled();
  });
});

describe("connection", () => {
  it("uses the existing connection layer before each operation", async () => {
    const { adapter } = makeAdapter();
    await adapter.findById(VALID_ID, NO_SESSION);
    expect(m.connectToDatabase).toHaveBeenCalledTimes(1);
  });

  it("passes connection errors through unchanged", async () => {
    const failure = new DatabaseConnectionError("connect_failed");
    m.connectToDatabase.mockRejectedValue(failure);
    const { adapter, model } = makeAdapter();
    await expect(adapter.findById(VALID_ID, NO_SESSION)).rejects.toBe(failure);
    expect(model.findOne).not.toHaveBeenCalled();
  });
});

describe("DTO mapping and no Document leakage", () => {
  it("returns plain DTOs with only mapped fields", async () => {
    const { adapter } = makeAdapter();
    const dto = await adapter.getById(VALID_ID, NO_SESSION);
    expect(dto).toEqual({ id: VALID_ID, name: "Ann", email: "a@x.test" });
    expect(Object.getPrototypeOf(dto)).toBe(Object.prototype);
    expect(JSON.stringify(dto)).not.toContain("SECRET-HASH");
  });

  it("reads with lean and a projection allowlist", async () => {
    const { adapter, model } = makeAdapter();
    await adapter.findById(VALID_ID, NO_SESSION);
    const q = model.findOne.mock.results[0].value as ReturnType<typeof query>;
    expect(q.lean).toHaveBeenCalled();
    expect(q.select).toHaveBeenCalledWith({ name: 1, email: 1 });
  });

  it("create returns a DTO built from a plain copy, limited to the projection", async () => {
    const { adapter } = makeAdapter();
    const dto = await adapter.create({ name: "Ann", email: "a@x.test" }, NO_SESSION);
    expect(dto).toEqual({ id: VALID_ID, name: "Ann", email: "a@x.test" });
  });

  it("the mapper cannot leak a persistence object", async () => {
    const adapter = createMongooseAdapter<Raw, unknown>({
      model: makeModel() as never,
      mapper: () => ({ $__: {}, $isNew: false }),
      fields: { projection: ["name"] },
    });
    await expect(adapter.getById(VALID_ID, NO_SESSION)).rejects.toBeInstanceOf(RepositoryOperationError);
  });

  it("returns a frozen page of DTOs", async () => {
    const { adapter } = makeAdapter();
    const page = await adapter.findPage({ page: 1, pageSize: 10 }, NO_SESSION);
    expect(page.items).toHaveLength(2);
    expect(page.total).toBe(2);
    expect(Object.isFrozen(page)).toBe(true);
    for (const item of page.items) expect(Object.keys(item).sort()).toEqual(["email", "id", "name"]);
  });
});

describe("not found", () => {
  it("findById returns null, getById throws NotFoundError", async () => {
    const model = makeModel();
    model.findOne.mockImplementation(() => query(null));
    const { adapter } = makeAdapter(model);
    expect(await adapter.findById(VALID_ID, NO_SESSION)).toBeNull();
    await expect(adapter.getById(VALID_ID, NO_SESSION)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("an invalid id is not found and never reaches the database", async () => {
    const { adapter, model } = makeAdapter();
    expect(await adapter.findById("not-an-id", NO_SESSION)).toBeNull();
    await expect(adapter.getById("not-an-id", NO_SESSION)).rejects.toBeInstanceOf(NotFoundError);
    await expect(adapter.updateById("not-an-id", { name: "x" }, NO_SESSION)).rejects.toBeInstanceOf(NotFoundError);
    expect(model.findOne).not.toHaveBeenCalled();
    expect(model.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("updateById throws NotFoundError when no record matches", async () => {
    const model = makeModel();
    model.findOneAndUpdate.mockImplementation(() => query(null));
    const { adapter } = makeAdapter(model);
    await expect(adapter.updateById(VALID_ID, { name: "x" }, NO_SESSION)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("pagination", () => {
  it("applies skip and limit from the validated page", async () => {
    const { adapter, model } = makeAdapter();
    await adapter.findPage({ page: 3, pageSize: 10 }, NO_SESSION);
    const q = model.find.mock.results[0].value as ReturnType<typeof query>;
    expect(q.skip).toHaveBeenCalledWith(20);
    expect(q.limit).toHaveBeenCalledWith(10);
    expect(q.sort).toHaveBeenCalledWith({ _id: 1 });
  });

  it("accepts exactly the maximum page size", async () => {
    const { adapter, model } = makeAdapter();
    await adapter.findPage({ page: 1, pageSize: MAX_PAGE_SIZE }, NO_SESSION);
    expect((model.find.mock.results[0].value as ReturnType<typeof query>).limit).toHaveBeenCalledWith(MAX_PAGE_SIZE);
  });

  it.each([
    { page: 1, pageSize: MAX_PAGE_SIZE + 1 },
    { page: 1, pageSize: 0 },
    { page: 0, pageSize: 10 },
    { page: 1.5, pageSize: 10 },
    { page: 1, pageSize: Number.POSITIVE_INFINITY },
  ])("re-validates a hand-built pagination object %j and does not query", async (bad) => {
    const { adapter, model } = makeAdapter();
    await expect(adapter.findPage(bad, NO_SESSION)).rejects.toBeInstanceOf(ValidationError);
    expect(model.find).not.toHaveBeenCalled();
    expect(model.countDocuments).not.toHaveBeenCalled();
  });

  it("runs count and find one after another (one session cannot run parallel operations)", async () => {
    const order: string[] = [];
    const model = makeModel();
    model.countDocuments.mockImplementation(() => {
      order.push("count:start");
      return query(Promise.resolve(1).then((v) => (order.push("count:end"), v)));
    });
    model.find.mockImplementation(() => {
      order.push("find:start");
      return query([]);
    });
    const { adapter } = makeAdapter(model);
    await adapter.findPage({ page: 1, pageSize: 5 }, txn);
    expect(order).toEqual(["count:start", "count:end", "find:start"]);
  });
});

describe("filter safety", () => {
  it("passes equality filters only for allowlisted fields", async () => {
    const { adapter, model } = makeAdapter();
    await adapter.findOneBy({ email: "a@x.test" }, NO_SESSION);
    expect(model.findOne).toHaveBeenCalledWith({ email: "a@x.test" });
  });

  it.each([
    ["operator object value", { email: { $ne: null } }],
    ["regex value", { email: /.*/ }],
    ["array value", { email: ["a"] }],
    ["unlisted field", { hash: "x" }],
    ["operator key", { $or: [{ email: "a" }] }],
    ["path key", { "email.x": "a" }],
    ["empty filter", {}],
    ["undefined value", { email: undefined }],
  ])("rejects %s in findOneBy", async (_label, filter) => {
    const { adapter, model } = makeAdapter();
    await expect(adapter.findOneBy(filter as never, NO_SESSION)).rejects.toBeInstanceOf(ValidationError);
    expect(model.findOne).not.toHaveBeenCalled();
  });

  it("rejects an unsafe filter in findPage", async () => {
    const { adapter, model } = makeAdapter();
    await expect(adapter.findPage({ page: 1, pageSize: 1 }, NO_SESSION, { email: { $gt: "" } } as never)).rejects.toBeInstanceOf(ValidationError);
    expect(model.find).not.toHaveBeenCalled();
  });
});

describe("update allowlist", () => {
  it("builds an explicit $set from allowlisted fields only", async () => {
    const { adapter, model } = makeAdapter();
    await adapter.updateById(VALID_ID, { name: "New" }, txn);
    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: VALID_ID },
      { $set: { name: "New" } },
      { returnDocument: "after", runValidators: true },
    );
  });

  it.each([
    ["field outside the allowlist", { email: "x@y.z" }],
    ["readable but not updatable field", { hash: "x" }],
    ["_id", { _id: new Types.ObjectId() }],
    ["operator key", { $set: { name: "x" } }],
    ["$inc operator", { $inc: { age: 1 } }],
    ["dotted path", { "name.first": "x" }],
    ["__proto__ own key", JSON.parse('{"__proto__": {"name": "x"}}')],
    ["allowed plus unlisted field", { name: "ok", email: "no" }],
    ["operator inside a value", { name: { $gt: "" } }],
    ["nested operator", { name: { a: { $unset: 1 } } }],
    ["undefined value", { name: undefined }],
    ["function value", { name: () => 1 }],
    ["NaN", { name: Number.NaN }],
    ["empty changes", {}],
    ["array instead of object", ["name"]],
    ["null", null],
    ["class instance", new (class Evil { name = "x"; })()],
  ])("rejects %s", async (_label, changes) => {
    const { adapter, model } = makeAdapter();
    await expect(adapter.updateById(VALID_ID, changes as never, txn)).rejects.toBeInstanceOf(ValidationError);
    expect(model.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("rejects every update when no field is updatable", async () => {
    const adapter = createMongooseAdapter<Raw, Dto>({
      model: makeModel() as never,
      mapper: (r) => ({ id: idToString(r._id), name: r.name, email: r.email }),
      fields: { projection: ["name"] },
    });
    await expect(adapter.updateById(VALID_ID, { name: "x" } as never, NO_SESSION)).rejects.toBeInstanceOf(ValidationError);
  });

  it("the validation message does not echo the input", async () => {
    const { adapter } = makeAdapter();
    const error = await adapter.updateById(VALID_ID, { sneaky_field: "v4lue" } as never, NO_SESSION).catch((e: unknown) => e as Error);
    expect((error as Error).message).not.toMatch(/sneaky_field|v4lue/);
  });
});

describe("create allowlist", () => {
  it("accepts only creatable fields", async () => {
    const { adapter, model } = makeAdapter();
    await adapter.create({ name: "n", email: "e" }, NO_SESSION);
    expect(model.create).toHaveBeenCalledWith([{ name: "n", email: "e" }], { session: undefined });
    await expect(adapter.create({ name: "n", hash: "x" } as never, NO_SESSION)).rejects.toBeInstanceOf(ValidationError);
    await expect(adapter.create({ name: "n", $set: 1 } as never, NO_SESSION)).rejects.toBeInstanceOf(ValidationError);
    await expect(adapter.create({} as never, NO_SESSION)).rejects.toBeInstanceOf(ValidationError);
    expect(model.create).toHaveBeenCalledTimes(1);
  });
});

describe("error handling", () => {
  it("maps duplicate key 11000 to DuplicateKeyError", async () => {
    const model = makeModel();
    model.create.mockRejectedValue(Object.assign(new Error("E11000 dup key {email: 'a@x.test'}"), { name: "MongoServerError", code: 11000 }));
    const { adapter } = makeAdapter(model);
    const error = await adapter.create({ name: "n", email: "e" }, txn).catch((e: unknown) => e as Error);
    expect(error).toBeInstanceOf(DuplicateKeyError);
    expect((error as Error).message).not.toMatch(/E11000|a@x\.test/);
    expect(m.loggerError).not.toHaveBeenCalled();
  });

  it("maps unknown failures to RepositoryOperationError, logs only the class name, and leaks nothing", async () => {
    const model = makeModel();
    const secret = "mongodb://u:s3cretPass@secret-host.internal:27017/db";
    model.findOne.mockImplementation(() => query(Promise.reject(Object.assign(new Error(secret), { name: "MongoNetworkError" }))));
    const { adapter } = makeAdapter(model);
    const error = await adapter.findById(VALID_ID, NO_SESSION).catch((e: unknown) => e as Error);
    expect(error).toBeInstanceOf(RepositoryOperationError);
    expect(error).not.toBeInstanceOf(NotFoundError);
    expect(error).not.toBeInstanceOf(DuplicateKeyError);
    expect(JSON.stringify(error) + (error as Error).message).not.toMatch(/s3cretPass|secret-host/);
    expect(m.loggerError).toHaveBeenCalledExactlyOnceWith("Repository operation failed", {
      operation: "findById",
      driverErrorName: "MongoNetworkError",
    });
  });
});

describe("adapter configuration", () => {
  const base = { model: makeModel() as never, mapper: () => ({}) };

  it("requires a non-empty projection", () => {
    expect(() => createMongooseAdapter<Raw, object>({ ...base, fields: { projection: [] } })).toThrow(RepositoryOperationError);
  });

  it.each(["$where", "a.b", "_id", "__v", "", "1abc", "na me"])("rejects the invalid field name %j", (name) => {
    expect(() => createMongooseAdapter<Raw, object>({ ...base, fields: { projection: [name as never] } })).toThrow(RepositoryOperationError);
    expect(() => createMongooseAdapter<Raw, object, never, never, "name">({ ...base, fields: { projection: ["name"], updatable: [name as never] } })).toThrow(RepositoryOperationError);
  });
});
