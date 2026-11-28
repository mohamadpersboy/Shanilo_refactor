import { describe, expect, it } from "vitest";
import { Schema, Types, model } from "mongoose";
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE,
  MAX_PAGE_SIZE,
  NO_SESSION,
  paginationParams,
  repositoryContext,
} from "@/lib/repositories/types";
import {
  DuplicateKeyError,
  RepositoryOperationError,
  isDuplicateKeyError,
  mapRepositoryError,
  recordNotFound,
} from "@/lib/repositories/errors";
import { idToString, isObjectIdString, mapRecord } from "@/lib/repositories/mongoose/mapping";
import { buildPage, toSkipLimit } from "@/lib/repositories/mongoose/pagination";
import {
  AppError,
  DatabaseConnectionError,
  DatabaseTransactionError,
  NotFoundError,
  ValidationError,
  toErrorResponse,
} from "@/lib/errors";

const SECRET = "mongodb://dbuser:s3cretPass@secret-host.internal:27017/shanilo";

function driverError(name: string, code?: number) {
  const error = new Error(`E11000 duplicate key at ${SECRET} dup key: { email: "a@b.c" }`, { cause: new Error(SECRET) });
  error.name = name;
  return Object.assign(error, code === undefined ? {} : { code });
}

describe("RepositoryContext", () => {
  it("has no session by default", () => {
    expect(NO_SESSION.session).toBeUndefined();
    expect(repositoryContext().session).toBeUndefined();
    expect(Object.isFrozen(NO_SESSION)).toBe(true);
  });

  it("carries the explicit session unchanged", () => {
    const session = { id: "fake-session" } as never;
    const ctx = repositoryContext(session);
    expect(ctx.session).toBe(session);
    expect(Object.isFrozen(ctx)).toBe(true);
  });
});

describe("paginationParams", () => {
  it("uses defaults when nothing is given", () => {
    expect(paginationParams()).toEqual({ page: 1, pageSize: DEFAULT_PAGE_SIZE });
    expect(paginationParams({})).toEqual({ page: 1, pageSize: DEFAULT_PAGE_SIZE });
  });

  it("accepts the boundary values", () => {
    expect(paginationParams({ page: 1, pageSize: 1 })).toEqual({ page: 1, pageSize: 1 });
    expect(paginationParams({ page: MAX_PAGE, pageSize: MAX_PAGE_SIZE })).toEqual({
      page: MAX_PAGE,
      pageSize: MAX_PAGE_SIZE,
    });
  });

  it("rejects a page size above the maximum (no silent clamp)", () => {
    expect(() => paginationParams({ pageSize: MAX_PAGE_SIZE + 1 })).toThrow(ValidationError);
    expect(() => paginationParams({ pageSize: 1_000_000 })).toThrow(ValidationError);
  });

  it("rejects a page above the maximum", () => {
    expect(() => paginationParams({ page: MAX_PAGE + 1 })).toThrow(ValidationError);
  });

  it.each([0, -1, 1.5, NaN, Infinity, "2", null, {}, [], true, Number.MAX_SAFE_INTEGER + 1])(
    "rejects invalid value %s",
    (bad) => {
      expect(() => paginationParams({ page: bad })).toThrow(ValidationError);
      expect(() => paginationParams({ pageSize: bad })).toThrow(ValidationError);
    },
  );

  it("returns a frozen object and does not echo the input in the message", () => {
    expect(Object.isFrozen(paginationParams({ page: 2 }))).toBe(true);
    try {
      paginationParams({ pageSize: 987654 });
    } catch (e) {
      expect((e as Error).message).not.toContain("987654");
    }
  });
});

describe("skip and limit, page building", () => {
  it("computes offset from the page", () => {
    expect(toSkipLimit({ page: 1, pageSize: 20 })).toEqual({ skip: 0, limit: 20 });
    expect(toSkipLimit({ page: 3, pageSize: 10 })).toEqual({ skip: 20, limit: 10 });
  });

  it("builds an immutable page with a copied items array", () => {
    const source = [{ a: 1 }, { a: 2 }];
    const page = buildPage(source, { page: 2, pageSize: 2 }, 7);
    expect(page).toEqual({ items: [{ a: 1 }, { a: 2 }], page: 2, pageSize: 2, total: 7 });
    expect(Object.isFrozen(page)).toBe(true);
    expect(Object.isFrozen(page.items)).toBe(true);
    source.push({ a: 3 });
    expect(page.items).toHaveLength(2);
  });
});

describe("error mapping", () => {
  it("maps MongoServerError 11000 to DuplicateKeyError", () => {
    const mapped = mapRepositoryError(driverError("MongoServerError", 11000));
    expect(mapped).toBeInstanceOf(DuplicateKeyError);
    expect(mapped.code).toBe("REPOSITORY_DUPLICATE_KEY");
    expect(mapped.status).toBe(409);
  });

  it("also maps a bulk write duplicate (11000)", () => {
    expect(mapRepositoryError(driverError("MongoBulkWriteError", 11000))).toBeInstanceOf(DuplicateKeyError);
  });

  it("does not treat other codes or other names as duplicate key", () => {
    expect(isDuplicateKeyError(driverError("MongoServerError", 11001))).toBe(false);
    expect(isDuplicateKeyError(driverError("MongoServerError"))).toBe(false);
    expect(isDuplicateKeyError(driverError("SomeOtherError", 11000))).toBe(false);
    expect(isDuplicateKeyError("11000")).toBe(false);
    expect(isDuplicateKeyError({ name: "MongoServerError", code: 11000 })).toBe(false);
  });

  it("maps unknown errors to RepositoryOperationError, not NotFound or DuplicateKey", () => {
    for (const input of [driverError("MongoServerError", 50), driverError("CastError"), new Error("x"), "boom", null, 42]) {
      const mapped = mapRepositoryError(input);
      expect(mapped).toBeInstanceOf(RepositoryOperationError);
      expect(mapped).not.toBeInstanceOf(DuplicateKeyError);
      expect(mapped).not.toBeInstanceOf(NotFoundError);
      expect(mapped.status).toBe(500);
    }
    expect((mapRepositoryError(driverError("MongoServerError", 50)) as RepositoryOperationError).driverErrorName).toBe(
      "MongoServerError",
    );
    expect((mapRepositoryError("boom") as RepositoryOperationError).driverErrorName).toBe("UnknownError");
  });

  it("never leaks driver text, keys, values, host or credentials", () => {
    for (const input of [driverError("MongoServerError", 11000), driverError("MongoNetworkError")]) {
      const mapped = mapRepositoryError(input);
      const text = [mapped.message, JSON.stringify(mapped), mapped.stack?.split("\n")[0] ?? ""].join(" ");
      expect(text).not.toMatch(/s3cretPass|secret-host|27017|dbuser|a@b\.c|E11000|dup key/);
      expect(mapped.cause).toBeUndefined();
      expect(JSON.stringify(toErrorResponse(mapped))).not.toMatch(/s3cretPass|secret-host|E11000/);
    }
  });

  it("passes application errors through unchanged", () => {
    const errors: AppError[] = [
      new NotFoundError("x"),
      new ValidationError("y"),
      new DatabaseConnectionError("connect_failed"),
      new DatabaseTransactionError("commit_failed"),
    ];
    for (const e of errors) expect(mapRepositoryError(e)).toBe(e);
  });

  it("uses the existing NotFoundError for missing records, with a fixed message", () => {
    const e = recordNotFound();
    expect(e).toBeInstanceOf(NotFoundError);
    expect(e.status).toBe(404);
    expect(e.message).toBe("Record not found");
  });

  it("returns a generic 500 response for unknown failures and 409 for duplicates", () => {
    expect(toErrorResponse(mapRepositoryError(new Error("x"))).status).toBe(500);
    expect(toErrorResponse(mapRepositoryError(driverError("MongoServerError", 11000))).status).toBe(409);
  });
});

// A real Mongoose Document, built from a throw-away model. It never connects to a database.
const LeakModel = model("RepoCoreLeakTest", new Schema({ a: Number }));
const makeDocument = () => new LeakModel({ a: 1 });

describe("DTO mapping", () => {
  const id = new Types.ObjectId();

  it("maps a plain record explicitly (extra fields are not copied)", () => {
    const dto = mapRecord({ _id: id, name: "n", secretField: "x", __v: 3 }, (r) => ({ id: idToString(r._id), name: r.name }));
    expect(dto).toEqual({ id: id.toHexString(), name: "n" });
    expect(dto).not.toHaveProperty("secretField");
    expect(dto).not.toHaveProperty("__v");
    expect(Object.getPrototypeOf(dto)).toBe(Object.prototype);
  });

  it("rejects a Mongoose Document as input", () => {
    const doc = makeDocument();
    expect(() => mapRecord(doc, () => ({ ok: true }))).toThrow(RepositoryOperationError);
  });

  it("rejects a mapper that returns a Document, at any depth", () => {
    const doc = makeDocument();
    expect(() => mapRecord({}, () => doc)).toThrow(RepositoryOperationError);
    expect(() => mapRecord({}, () => ({ nested: { list: [doc] } }))).toThrow(RepositoryOperationError);
  });

  it("rejects objects that look like Documents", () => {
    expect(() => mapRecord({}, () => ({ $__: {}, a: 1 }))).toThrow(RepositoryOperationError);
  });

  it("allows Date and ObjectId leaf values", () => {
    expect(() => mapRecord({}, () => ({ at: new Date(), ref: id }))).not.toThrow();
  });

  it("validates ObjectId text", () => {
    expect(isObjectIdString(id.toHexString())).toBe(true);
    for (const bad of ["", "abc", "zzzzzzzzzzzzzzzzzzzzzzzz", "123456789012", { $ne: null }, 5, null]) {
      expect(isObjectIdString(bad)).toBe(false);
    }
    expect(() => idToString("nope")).toThrow(RepositoryOperationError);
  });
});
