# Repository Architecture (Phase 3 — Repository Foundation)

Status: foundation only. This document and the code in `src/lib/repositories` give future
**domain** repositories a shared, safe base. **They do not authorize any business repository or model.**
User, Product, Order, Payment, Wallet and Seller repositories, business schemas, BSON Money
representation, and index/migration tooling are separate future tasks.

## 1. Layers

```
Server Action / Route Handler → Service → Repository → MongoDB
```

| Layer | Owns | Must not |
|---|---|---|
| Service | Business rules, prices and financial values, authorization decisions, transaction boundaries, side effects (payment, SMS, email) | Use Mongoose models, queries or documents |
| Repository | Data access only: one domain, explicit methods, plain DTOs in and out | Make business decisions, calculate money, own transactions, call external APIs, send SMS or email, decide authorization |
| `lib/repositories` (this foundation) | Shared types, safe Mongoose helper, error mapping | Contain any business domain |

Decisions (approved):

- **Domain-specific repositories.** Each domain defines its own small interface. There is no universal CRUD repository.
- **Services own transactions.** A repository never starts, commits, aborts or ends a transaction.
- **Explicit `ClientSession`.** The Service passes the session in a `RepositoryContext`. There is no implicit propagation.

## 2. Files

| File | Purpose |
|---|---|
| `src/lib/repositories/types.ts` | `RepositoryContext`, `NO_SESSION`, `repositoryContext()`, `PaginationParams`, `RepositoryPage<T>`, `paginationParams()`, limits |
| `src/lib/repositories/errors.ts` | `DuplicateKeyError`, `RepositoryOperationError`, `mapRepositoryError()`, `recordNotFound()` |
| `src/lib/repositories/mongoose/adapter.ts` | `createMongooseAdapter()` — safe, injected-Model helper |
| `src/lib/repositories/mongoose/mapping.ts` | `DtoMapper`, `mapRecord()` (leak guard), `idToString()`, `isObjectIdString()` |
| `src/lib/repositories/mongoose/pagination.ts` | `toSkipLimit()`, `buildPage()` |

Existing files `src/lib/db/*` and `src/lib/errors/index.ts` are unchanged. `runInTransaction` is unchanged:
one attempt, no automatic retry. Retry and ambiguous-commit policy stay deferred.

## 3. Defining a domain repository contract (future work)

A domain defines a contract in domain terms. The contract uses DTOs and `RepositoryContext`. It never mentions Mongoose.

```ts
// Example only. "Widget" is a placeholder, not a real business model.
import type { RepositoryContext, PaginationParams, RepositoryPage } from "@/lib/repositories/types";

export interface WidgetDto {
  readonly id: string;
  readonly name: string;
}

export interface WidgetRepository {
  getById(id: string, ctx: RepositoryContext): Promise<WidgetDto>;
  findByName(name: string, ctx: RepositoryContext): Promise<WidgetDto | null>;
  list(page: PaginationParams, ctx: RepositoryContext): Promise<RepositoryPage<WidgetDto>>;
  rename(id: string, name: string, ctx: RepositoryContext): Promise<WidgetDto>;
}
```

Rules for contracts:

- `ctx: RepositoryContext` is a **required** last parameter on every method. A caller cannot forget it. Pass `NO_SESSION` outside a transaction.
- Methods are named for what the domain needs (`rename`), not for the database (`updateOne`).
- No Mongoose types, no filter or update objects, no documents in the signature.

## 4. Using the Mongoose adapter

`createMongooseAdapter()` is used **inside** a domain repository implementation. Services never see it.

```ts
import type { Model } from "mongoose";
import { createMongooseAdapter } from "@/lib/repositories/mongoose/adapter";
import { idToString } from "@/lib/repositories/mongoose/mapping";

// `WidgetModel` is injected by the caller. The adapter registers no model and opens no connection.
export function createWidgetRepository(model: Model<WidgetRaw>): WidgetRepository {
  const adapter = createMongooseAdapter({
    model,
    mapper: (raw): WidgetDto => ({ id: idToString(raw._id), name: raw.name }),
    fields: {
      projection: ["name"],        // the only fields read
      filterable: ["name"],        // equality filters allowed
      updatable: ["name"],         // fields `updateById` may $set
    },
  });
  return {
    getById: (id, ctx) => adapter.getById(id, ctx),
    findByName: (name, ctx) => adapter.findOneBy({ name }, ctx),
    list: (page, ctx) => adapter.findPage(page, ctx),
    rename: (id, name, ctx) => adapter.updateById(id, { name }, ctx),
  };
}
```

Adapter methods: `findById`, `getById`, `findOneBy`, `findPage`, `create`, `updateById`. There is no delete, no bulk
operation and no free-form query. A domain that needs more adds a specific, reviewed method in its own repository.
Anything beyond the adapter's surface is written with the same rules (explicit session, projection, lean, mapper).

Built-in guarantees:

- The Model is injected. No `mongoose.connect()`. The existing `connectToDatabase()` is awaited (lazy and cached).
- Every query and write receives `ctx.session`. With no session the adapter still calls `.session(null)` explicitly.
- Reads use `lean()` and the `projection` allowlist. Writes convert the created document to a plain object before mapping.
- Field-name allowlists are validated when the adapter is created (no `$`, no `.`, no `_id`, no `__v`, projection not empty).
- Sorting is fixed to `_id`. A caller cannot choose a sort or an operator.
- `count` and `find` in `findPage` run one after another, because one session cannot run parallel operations.
  Outside a transaction the total and the items can differ slightly if data changes between the two queries.
- Mongoose strict mode and `strictQuery: true` (set it on each Schema, see `CLAUDE.md` section 18) are an extra layer, not the only one.

## 5. DTO mapping

A mapper is written by hand for each domain: `(raw: LeanRecord<TRaw>) => TDto`.

- There is no automatic `toObject()` copy. A new database field never reaches the Service by accident.
- Convert `_id` with `idToString()`. DTOs hold plain values (string, number, boolean, `Date`, plain objects, arrays).
- `mapRecord()` rejects a Mongoose Document (or subdocument) as input and anywhere in the output.
  A violation is a programming error and throws `RepositoryOperationError("DocumentLeakError")`.
- Money fields in DTOs follow the domain `Money` contract. The BSON representation is **not decided** here.

## 6. ClientSession propagation and transactions

The Service owns the transaction. It uses the existing helper and passes the session on:

```ts
import { runInTransaction } from "@/lib/db/transaction";
import { repositoryContext } from "@/lib/repositories/types";

async function renameTwice(widgets: WidgetRepository, id: string) {
  // 1. Business decisions and validation happen here, in the Service.
  return runInTransaction(async (session) => {
    const ctx = repositoryContext(session);          // 2. explicit session
    await widgets.rename(id, "first", ctx);          // 3. repository attaches it to the write
    return widgets.rename(id, "second", ctx);        //    same transaction
  });
  // 4. commit or abort and session release are done by runInTransaction, never by a repository.
}
```

- A repository call without `ctx.session` runs **outside** the transaction. That is by design. Pass the same `ctx` to every call that must be atomic.
- The callback runs once. No external API, payment gateway, SMS or email call inside the callback.
- If a repository throws, `runInTransaction` aborts and rethrows the same error object.
- A duplicate key inside a transaction aborts it. The Service decides what that means.

## 7. Error mapping policy

| Situation | Error | Status | Notes |
|---|---|---|---|
| No record | `NotFoundError` (existing, "Record not found") | 404 | Reused. No duplicate class. `findById` returns `null`; `getById` / `updateById` throw |
| Duplicate key (`MongoServerError`, code `11000`) | `DuplicateKeyError` (`REPOSITORY_DUPLICATE_KEY`) | 409 | Message does not name the index, key or value |
| Any other driver or unexpected error | `RepositoryOperationError` (`REPOSITORY_OPERATION_FAILED`) | 500 | Fixed message. Only the driver error class name is kept (`driverErrorName`). Logged once with the safe logger |
| Bad input to the adapter (pagination, filter, update or create fields) | `ValidationError` (existing) | 400 | Fixed message. The input is not echoed |
| Connection or transaction failure | `DatabaseConnectionError`, `DatabaseTransactionError` (existing) | 503 | Pass through unchanged |
| Already an `AppError` | unchanged | — | |

Rules: raw driver messages, stacks, hosts, credentials, connection strings, keys and values never leave the repository layer.
No `cause` is attached. Unknown failures are **not** converted into NotFound or DuplicateKey.
A Service may map `NotFoundError` or `DuplicateKeyError` to a domain-specific error or message.

## 8. Pagination and update safety

Pagination: `paginationParams({ page, pageSize })` — page ≥ 1 and ≤ `MAX_PAGE` (10 000), page size 1 to `MAX_PAGE_SIZE` (100),
default 20. Invalid values are **rejected**, not clamped. The adapter validates again, so a hand-built object cannot exceed the limit.
Offset pagination is simple but slow for deep pages. A domain that needs deep paging designs cursor pagination later.

Update safety:

- `updateById` accepts a plain object whose keys are all in the adapter's `updatable` list. The adapter builds the `$set` itself.
- Rejected: unlisted fields, `_id`, keys starting with `$`, dotted paths, `__proto__`, non-plain objects, `undefined`, `NaN`,
  functions, and any value that holds an operator-like key (`{ name: { $gt: "" } }`).
- No MongoDB operators cross the boundary. Filters accept only equality on `filterable` fields with scalar values.
- Never pass a request body directly to a repository. The Service validates input (for example with Zod) and passes typed arguments.
  The allowlist is a second barrier, not the first.

## 9. Testing approach

- **Unit tests** (`tests/repositories-core.test.ts`, `tests/repositories-adapter.test.ts`): `npm test`. The Model is a test double.
  They prove session propagation, projection, bounded pagination, allowlists, DTO mapping, leak guard, not-found and error mapping.
- **Integration tests** (`tests-integration/repository.integration.test.ts`): `npm run test:integration`. They use a real Replica Set via
  `MONGODB_TEST_URI` with all existing guards (separate from `MONGODB_URI`, database name contains `test`, one temporary collection, cleanup only of that collection).
  They prove the real session behavior: commit, rollback, isolation, duplicate key, and real pagination.
  The test Model lives only inside the test file. It is not a business schema.
- Future domain repositories add their own tests with the same two levels.

## 10. Not in scope

Business repositories and schemas, BSON Money, indexes and migrations, retry and ambiguous-commit policy, delete and bulk operations,
cursor pagination, authentication and authorization, CI integration-test infrastructure.
