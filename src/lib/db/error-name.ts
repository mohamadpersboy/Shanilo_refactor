/**
 * Only a plain class name is safe to keep from a driver error.
 * Anything else (message, stack, cause) could carry host, port or credentials.
 */
export function safeErrorName(error: unknown): string {
  const name = error instanceof Error ? error.name : "";
  return /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(name) ? name : "UnknownError";
}
