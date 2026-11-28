const SENSITIVE =
  /pass(word)?|secret|token|api[-_]?key|authorization|cookie|otp|credential|private|mongodb_uri|connection|merchant|terminal/i;
const MONGO_URI = /mongodb(\+srv)?:\/\/[^\s"']+/gi;
// Bearer tokens and GitHub tokens that may appear inside free-text messages.
const TOKEN_IN_TEXT = /(bearer\s+[A-Za-z0-9._~+/-]{8,}=*|github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{20,})/gi;

/** Deep-redact sensitive keys and connection strings before logging. */
export function redact(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[Truncated]";
  if (typeof value === "string") return value.replace(MONGO_URI, "[REDACTED]").replace(TOKEN_IN_TEXT, "[REDACTED]");
  if (value instanceof Error) return { name: value.name, message: redact(value.message, depth + 1) };
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, SENSITIVE.test(k) ? "[REDACTED]" : redact(v, depth + 1)]),
    );
  }
  return value;
}
