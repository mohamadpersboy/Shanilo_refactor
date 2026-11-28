import type { ClientSession } from "mongoose";
import { ValidationError } from "@/lib/errors";

/**
 * Shared repository contracts (persistence-neutral, except for the optional `ClientSession`).
 *
 * This file defines NO universal CRUD contract. Each business domain defines its own small,
 * domain-specific repository interface later. See docs/repositories/README.md.
 */

/**
 * Explicit data-access context. A Service builds it and passes it to every repository call.
 *
 * - `session` is the transaction session from `runInTransaction`. If it is set, every database
 *   operation of that repository call MUST use it. If it is not set, the call runs outside a transaction.
 * - There is no implicit propagation (no AsyncLocalStorage, no global). The Service owns the transaction.
 * - A repository never starts, commits, aborts or ends a session.
 */
export interface RepositoryContext {
  readonly session?: ClientSession;
}

/** Context for a call outside any transaction. */
export const NO_SESSION: RepositoryContext = Object.freeze({});

/** Build a context. Pass the session from `runInTransaction`, or nothing for a call without a transaction. */
export function repositoryContext(session?: ClientSession): RepositoryContext {
  return session === undefined ? NO_SESSION : Object.freeze({ session });
}

/** Page size used when the caller does not give one. */
export const DEFAULT_PAGE_SIZE = 20;
/** Hard upper bound for one page. A caller cannot ask for more. */
export const MAX_PAGE_SIZE = 100;
/** Hard upper bound for the page number (offset pagination gets slow for deep pages). */
export const MAX_PAGE = 10_000;

/** Validated pagination. Use `paginationParams` to create it. `page` starts at 1. */
export interface PaginationParams {
  readonly page: number;
  readonly pageSize: number;
}

/** One page of plain DTO values. It never contains persistence objects (no Mongoose documents). */
export interface RepositoryPage<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly pageSize: number;
  /** Total number of matching records (all pages). */
  readonly total: number;
}

function boundedInteger(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= min && value <= max;
}

/**
 * Validate pagination input. Missing values get defaults. Invalid values are rejected, never clamped:
 * a wrong value is a caller bug, and silently changing it would hide the bug.
 * Throws `ValidationError` (fixed message, the input value is not echoed).
 */
export function paginationParams(input: { page?: unknown; pageSize?: unknown } = {}): PaginationParams {
  const page = input.page === undefined ? 1 : input.page;
  const pageSize = input.pageSize === undefined ? DEFAULT_PAGE_SIZE : input.pageSize;
  if (!boundedInteger(page, 1, MAX_PAGE)) throw new ValidationError("Invalid pagination page");
  if (!boundedInteger(pageSize, 1, MAX_PAGE_SIZE)) throw new ValidationError("Invalid pagination page size");
  return Object.freeze({ page, pageSize });
}
