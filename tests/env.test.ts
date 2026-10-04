import { describe, expect, it } from "vitest";
import { appSchema, databaseSchema, parseGroup, publicSchema, smtpSchema } from "@/lib/env/schema";
import { ConfigError, toErrorResponse, AppError, NotFoundError } from "@/lib/errors";
import { redact } from "@/lib/logger/redact";

describe("env validation", () => {
  it("applies the default log level and treats empty as unset", () => {
    expect(parseGroup("app", appSchema, {}).LOG_LEVEL).toBe("info");
    expect(parseGroup("app", appSchema, { LOG_LEVEL: "" }).LOG_LEVEL).toBe("info");
  });

  it("fails only when a required group is requested, naming variables but never values", () => {
    const secret = "super-secret-value";
    try {
      parseGroup("smtp", smtpSchema, { SMTP_HOST: secret, SMTP_PORT: "not-a-number" });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ConfigError);
      const msg = (e as Error).message;
      expect(msg).toContain("SMTP_PORT");
      expect(msg).toContain("SMTP_USER");
      expect(msg).not.toContain(secret);
    }
  });

  it("requires MONGODB_URI when the database group is requested", () => {
    expect(() => parseGroup("database", databaseSchema, {})).toThrow(ConfigError);
    expect(parseGroup("database", databaseSchema, { MONGODB_URI: "x" }).MONGODB_URI).toBe("x");
  });

  it("keeps public schema to NEXT_PUBLIC_* names only", () => {
    expect(Object.keys(publicSchema.shape).every((k) => k.startsWith("NEXT_PUBLIC_"))).toBe(true);
  });
});

describe("errors", () => {
  it("does not leak unexpected error details", () => {
    const r = toErrorResponse(new Error("db password is hunter2"));
    expect(r.status).toBe(500);
    expect(JSON.stringify(r.body)).not.toContain("hunter2");
  });
  it("exposes expected 4xx errors", () => {
    expect(toErrorResponse(new NotFoundError()).status).toBe(404);
    expect(toErrorResponse(new AppError("X", "boom", 500)).status).toBe(500);
  });
});

describe("log redaction", () => {
  it("redacts sensitive keys and Mongo URIs", () => {
    const out = redact({
      password: "p",
      headers: { Authorization: "Bearer x" },
      note: "uri mongodb+srv://u:p@h/db failed",
      ok: 1,
    }) as Record<string, unknown>;
    expect(out.password).toBe("[REDACTED]");
    expect((out.headers as Record<string, unknown>).Authorization).toBe("[REDACTED]");
    expect(String(out.note)).not.toContain("mongodb+srv://");
    expect(out.ok).toBe(1);
  });
});
