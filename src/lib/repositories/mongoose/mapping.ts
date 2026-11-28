import { Document, Types } from "mongoose";
import { RepositoryOperationError } from "@/lib/repositories/errors";

/**
 * Explicit DTO mapping. A mapper turns one plain ("lean") database record into one DTO.
 * The mapper is written by hand for each domain. There is no automatic `toObject()` copy,
 * so a new database field never reaches the Service layer by accident.
 */
export type DtoMapper<TRaw, TDto> = (raw: Readonly<TRaw>) => TDto;

/** A raw record from a lean query. `_id` is always present. */
export type LeanRecord<TRaw> = TRaw & { readonly _id: Types.ObjectId };

const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i;

/** True if the text can be an ObjectId. Used to reject bad ids before any database call. */
export function isObjectIdString(value: unknown): value is string {
  return typeof value === "string" && OBJECT_ID_PATTERN.test(value);
}

/** Convert a raw `_id` to its string form. For use inside mappers. */
export function idToString(id: unknown): string {
  if (id instanceof Types.ObjectId) return id.toHexString();
  if (isObjectIdString(id)) return id;
  throw new RepositoryOperationError("InvalidIdError");
}

/** True for a Mongoose Document or an object that looks like one. */
export function isPersistenceObject(value: unknown): boolean {
  if (value === null || typeof value !== "object") return false;
  return value instanceof Document || "$__" in value || "$isNew" in value;
}

/**
 * Check the whole value tree for persistence objects (Document, subdocument).
 * Arrays and plain objects are walked. `Date` and `ObjectId` are leaf values and are allowed.
 */
function containsPersistenceObject(value: unknown, depth = 0): boolean {
  if (value === null || typeof value !== "object") return false;
  if (isPersistenceObject(value)) return true;
  if (depth > 20) return false;
  if (value instanceof Date || value instanceof Types.ObjectId) return false;
  const children = Array.isArray(value) ? value : Object.values(value);
  return children.some((child) => containsPersistenceObject(child, depth + 1));
}

/**
 * Run the mapper on a lean record and verify the result.
 * - The input must not be a Document (the adapter always uses lean queries).
 * - The output must not contain a Document or subdocument anywhere.
 * A violation is a programming error. It throws `RepositoryOperationError` (no data in the message).
 */
export function mapRecord<TRaw, TDto>(raw: TRaw, mapper: DtoMapper<TRaw, TDto>): TDto {
  if (isPersistenceObject(raw)) throw new RepositoryOperationError("DocumentLeakError");
  const dto = mapper(raw);
  if (containsPersistenceObject(dto)) throw new RepositoryOperationError("DocumentLeakError");
  return dto;
}
