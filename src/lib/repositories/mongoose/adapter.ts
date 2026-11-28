import "server-only";
import { Types, type Model } from "mongoose";
import { connectToDatabase } from "@/lib/db/connection";
import { ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { mapRepositoryError, recordNotFound, RepositoryOperationError } from "@/lib/repositories/errors";
import {
  isObjectIdString,
  mapRecord,
  type DtoMapper,
  type LeanRecord,
} from "@/lib/repositories/mongoose/mapping";
import { buildPage, toSkipLimit } from "@/lib/repositories/mongoose/pagination";
import {
  paginationParams,
  type PaginationParams,
  type RepositoryContext,
  type RepositoryPage,
} from "@/lib/repositories/types";

/**
 * Small Mongoose adapter foundation for future DOMAIN repositories.
 *
 * It is a helper that a domain repository uses inside. It is not a generic CRUD repository
 * and a Service never sees it. See docs/repositories/README.md.
 *
 * Safety rules built into every method:
 * - The Model is injected. There is no global model registry and no `mongoose.connect()` here.
 *   `connectToDatabase()` (existing layer) is awaited before each operation. It is lazy and cached.
 * - Every query and write gets `ctx.session` explicitly. A provided session is never dropped.
 *   The adapter never starts, commits, aborts or ends a session.
 * - Reads use `lean()` plus an explicit `projection` allowlist plus an explicit mapper.
 *   Results are plain DTO values. A Mongoose Document never leaves the adapter.
 * - Callers cannot pass query or update objects. Filters are equality on allowlisted fields with scalar
 *   values only. Creates and updates accept only allowlisted fields. MongoDB operators cannot be injected.
 * - Pagination is validated again here (page size is at most MAX_PAGE_SIZE). Sorting is fixed (`_id`).
 * - Unexpected errors become safe repository errors. See `errors.ts`.
 * - Queries inside one session run one after another. MongoDB does not support parallel
 *   operations on one session.
 */

const FIELD_NAME = /^[A-Za-z][A-Za-z0-9_]*$/;
const RESERVED_FIELDS = new Set(["_id", "__v"]);

export interface MongooseAdapterConfig<
  TRaw extends object,
  TDto,
  F extends keyof TRaw & string,
  C extends keyof TRaw & string,
  U extends keyof TRaw & string,
> {
  /** The injected Model. */
  readonly model: Model<TRaw>;
  /** Hand-written mapper from a lean record to the DTO. */
  readonly mapper: DtoMapper<LeanRecord<TRaw>, TDto>;
  readonly fields: {
    /** Fields read from the database (besides `_id`). Required and not empty. */
    readonly projection: readonly (keyof TRaw & string)[];
    /** Fields allowed in `findOneBy` and `findPage` filters. Default: none. */
    readonly filterable?: readonly F[];
    /** Fields allowed in `create`. Default: none (create is rejected). */
    readonly creatable?: readonly C[];
    /** Fields allowed in `updateById`. Default: none (update is rejected). */
    readonly updatable?: readonly U[];
  };
}

export interface MongooseAdapter<
  TRaw extends object,
  TDto,
  F extends keyof TRaw & string,
  C extends keyof TRaw & string,
  U extends keyof TRaw & string,
> {
  /** `null` when not found or when `id` is not a valid ObjectId text. */
  findById(id: string, ctx: RepositoryContext): Promise<TDto | null>;
  /** Like `findById`, but throws `NotFoundError` when there is no record. */
  getById(id: string, ctx: RepositoryContext): Promise<TDto>;
  /** Equality match on allowlisted fields. The filter must not be empty. */
  findOneBy(filter: Readonly<Partial<Pick<TRaw, F>>>, ctx: RepositoryContext): Promise<TDto | null>;
  /** One bounded page, sorted by `_id`. */
  findPage(
    pagination: PaginationParams,
    ctx: RepositoryContext,
    filter?: Readonly<Partial<Pick<TRaw, F>>>,
  ): Promise<RepositoryPage<TDto>>;
  /** Insert one record. Only allowlisted fields are accepted. */
  create(data: Readonly<Pick<TRaw, C>>, ctx: RepositoryContext): Promise<TDto>;
  /** `$set` of allowlisted fields. Throws `NotFoundError` when there is no record. */
  updateById(id: string, changes: Readonly<Partial<Pick<TRaw, U>>>, ctx: RepositoryContext): Promise<TDto>;
}

type AnyModel = Model<Record<string, unknown>>;

function assertFieldList(name: string, fields: readonly string[], allowEmpty: boolean): ReadonlySet<string> {
  if (!allowEmpty && fields.length === 0) throw new RepositoryOperationError(`Empty${name}Error`);
  for (const field of fields) {
    if (!FIELD_NAME.test(field) || RESERVED_FIELDS.has(field)) {
      throw new RepositoryOperationError(`Invalid${name}Error`);
    }
  }
  return new Set(fields);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/** Values may be scalars, null, arrays and plain objects. Object keys must not look like operators or paths. */
function isSafeValue(value: unknown, depth = 0): boolean {
  if (value === null) return true;
  if (value instanceof Date || value instanceof Types.ObjectId) return true;
  if (typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (depth > 10) return false;
  if (Array.isArray(value)) return value.every((item) => isSafeValue(item, depth + 1));
  if (isPlainObject(value)) {
    return Object.entries(value).every(
      ([key, item]) => !key.startsWith("$") && !key.includes(".") && isSafeValue(item, depth + 1),
    );
  }
  return false;
}

/**
 * Copy only allowlisted fields. Any other key, an operator key, a path key, a non-plain object
 * or an unsafe value is rejected. `undefined` values are rejected as well.
 * The error message is fixed. It does not echo the input.
 */
function pickAllowed(
  input: unknown,
  allowed: ReadonlySet<string>,
  message: string,
  { requireNonEmpty }: { requireNonEmpty: boolean },
): Record<string, unknown> {
  if (!isPlainObject(input)) throw new ValidationError(message);
  const keys = Object.keys(input);
  if (requireNonEmpty && keys.length === 0) throw new ValidationError(message);
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    if (!allowed.has(key) || !isSafeValue(input[key])) throw new ValidationError(message);
    out[key] = input[key];
  }
  return out;
}

function assertScalarFilter(filter: Record<string, unknown>): void {
  for (const value of Object.values(filter)) {
    const scalar =
      typeof value === "string" ||
      typeof value === "boolean" ||
      (typeof value === "number" && Number.isFinite(value)) ||
      value instanceof Date ||
      value instanceof Types.ObjectId;
    if (!scalar) throw new ValidationError("Invalid filter");
  }
}

function pickFields(source: Record<string, unknown>, fields: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = { _id: source._id };
  for (const field of fields) if (field in source) out[field] = source[field];
  return out;
}

export function createMongooseAdapter<
  TRaw extends object,
  TDto,
  F extends keyof TRaw & string = never,
  C extends keyof TRaw & string = never,
  U extends keyof TRaw & string = never,
>(config: MongooseAdapterConfig<TRaw, TDto, F, C, U>): MongooseAdapter<TRaw, TDto, F, C, U> {
  const model = config.model as unknown as AnyModel;
  const { mapper } = config;
  const projectionFields = [...config.fields.projection] as string[];
  assertFieldList("Projection", projectionFields, false);
  const projection = Object.fromEntries(projectionFields.map((f) => [f, 1 as const]));
  const filterable = assertFieldList("Filterable", config.fields.filterable ?? [], true);
  const creatable = assertFieldList("Creatable", config.fields.creatable ?? [], true);
  const updatable = assertFieldList("Updatable", config.fields.updatable ?? [], true);
  const sort = { _id: 1 } as const;

  const toDto = (raw: unknown): TDto => mapRecord(raw as LeanRecord<TRaw>, mapper);

  /** Ensure the connection (existing layer), run the operation, map errors safely. */
  async function run<T>(operation: string, work: () => Promise<T>): Promise<T> {
    try {
      await connectToDatabase();
      return await work();
    } catch (error) {
      const mapped = mapRepositoryError(error);
      if (mapped instanceof RepositoryOperationError) {
        logger.error("Repository operation failed", { operation, driverErrorName: mapped.driverErrorName });
      }
      throw mapped;
    }
  }

  function filterOf(input: unknown): Record<string, unknown> {
    const filter = pickAllowed(input, filterable, "Invalid filter", { requireNonEmpty: false });
    assertScalarFilter(filter);
    return filter;
  }

  async function findById(id: string, ctx: RepositoryContext): Promise<TDto | null> {
    if (!isObjectIdString(id)) return null;
    return run("findById", async () => {
      const raw = await model.findOne({ _id: id }).select(projection).session(ctx.session ?? null).lean();
      return raw === null ? null : toDto(raw);
    });
  }

  return {
    findById,

    async getById(id, ctx) {
      const dto = await findById(id, ctx);
      if (dto === null) throw recordNotFound();
      return dto;
    },

    async findOneBy(filterInput, ctx) {
      const filter = filterOf(filterInput);
      if (Object.keys(filter).length === 0) throw new ValidationError("Invalid filter");
      return run("findOneBy", async () => {
        const raw = await model
          .findOne(filter)
          .select(projection)
          .sort(sort)
          .session(ctx.session ?? null)
          .lean();
        return raw === null ? null : toDto(raw);
      });
    },

    async findPage(pagination, ctx, filterInput) {
      // Validate again: a hand-built object must not bypass the page size limit.
      const params = paginationParams(pagination);
      const filter = filterOf(filterInput ?? {});
      const { skip, limit } = toSkipLimit(params);
      return run("findPage", async () => {
        const total = await model
          .countDocuments(filter)
          .session(ctx.session ?? null);
        const rows = await model
          .find(filter)
          .select(projection)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .session(ctx.session ?? null)
          .lean();
        return buildPage(rows.map(toDto), params, total);
      });
    },

    async create(data, ctx) {
      const values = pickAllowed(data, creatable, "Invalid fields", { requireNonEmpty: true });
      return run("create", async () => {
        const [created] = await model.create([values], { session: ctx.session });
        if (created === undefined) throw new RepositoryOperationError("EmptyCreateResultError");
        // Convert to a plain object here. The Document never leaves the adapter.
        return toDto(pickFields(created.toObject() as Record<string, unknown>, projectionFields));
      });
    },

    async updateById(id, changes, ctx) {
      const set = pickAllowed(changes, updatable, "Invalid fields", { requireNonEmpty: true });
      if (!isObjectIdString(id)) throw recordNotFound();
      return run("updateById", async () => {
        const raw = await model
          .findOneAndUpdate({ _id: id }, { $set: set }, { returnDocument: "after", runValidators: true })
          .select(projection)
          .session(ctx.session ?? null)
          .lean();
        if (raw === null) throw recordNotFound();
        return toDto(raw);
      });
    },
  };
}
