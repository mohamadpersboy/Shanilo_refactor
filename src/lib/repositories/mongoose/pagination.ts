import type { PaginationParams, RepositoryPage } from "@/lib/repositories/types";

/** Offset and limit for a validated `PaginationParams`. `limit` is never above MAX_PAGE_SIZE. */
export function toSkipLimit(params: PaginationParams): { readonly skip: number; readonly limit: number } {
  return { skip: (params.page - 1) * params.pageSize, limit: params.pageSize };
}

/** Build an immutable page. The items array is a frozen copy. */
export function buildPage<T>(items: readonly T[], params: PaginationParams, total: number): RepositoryPage<T> {
  return Object.freeze({
    items: Object.freeze([...items]),
    page: params.page,
    pageSize: params.pageSize,
    total,
  });
}
