import { describe, expect, it } from "vitest";
import { appSchema, databaseSchema, parseGroup, publicSchema, smtpSchema } from "@/lib/env/schema";
import { ConfigError, toErrorResponse, AppError, NotFoundError } from "@/lib/errors";
import { redact } from "@/lib/logger/redact";
import { getTestDatabaseEnv } from "./support/test-env";

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
    const uri = "mongodb://localhost:27017/shanilo";
    expect(parseGroup("database", databaseSchema, { MONGODB_URI: uri }).MONGODB_URI).toBe(uri);
  });

  it("accepts only mongodb:// and mongodb+srv:// URIs, without echoing the value", () => {
    const ok = ["mongodb://h:27017/db", "mongodb+srv://cluster.example.net/db"];
    for (const v of ok) expect(parseGroup("database", databaseSchema, { MONGODB_URI: v }).MONGODB_URI).toBe(v);

    const bad = ["x", "http://h/db", "postgres://h/db", "mongodb://", "mongodb+srv://", "mongodb://h /db", ""];
    for (const v of bad) expect(() => parseGroup("database", databaseSchema, { MONGODB_URI: v })).toThrow(ConfigError);

    const secret = "ftp://user:hunter2@host/db";
    try {
      parseGroup("database", databaseSchema, { MONGODB_URI: secret });
      expect.unreachable();
    } catch (e) {
      expect((e as Error).message).toContain("MONGODB_URI");
      expect((e as Error).message).not.toContain("hunter2");
    }
  });

  it("does not require MONGODB_TEST_URI for the app database or app groups", () => {
    const uri = "mongodb://localhost:27017/shanilo";
    expect(parseGroup("database", databaseSchema, { MONGODB_URI: uri }).MONGODB_URI).toBe(uri);
    expect(parseGroup("app", appSchema, {}).LOG_LEVEL).toBe("info");
  });

  it("keeps public schema to NEXT_PUBLIC_* names only", () => {
    expect(Object.keys(publicSchema.shape).every((k) => k.startsWith("NEXT_PUBLIC_"))).toBe(true);
  });
});

describe("test database env (MONGODB_TEST_URI)", () => {
  const testUri = "mongodb://localhost:27018/shanilo_test";

  it("reads MONGODB_TEST_URI from the given source", () => {
    expect(getTestDatabaseEnv({ MONGODB_TEST_URI: testUri }).MONGODB_TEST_URI).toBe(testUri);
  });

  it("fails when MONGODB_TEST_URI is missing, empty, or has a bad scheme", () => {
    for (const source of [{}, { MONGODB_TEST_URI: "" }, { MONGODB_TEST_URI: "http://h/db" }]) {
      expect(() => getTestDatabaseEnv(source)).toThrow(ConfigError);
    }
  });

  it("does not use MONGODB_URI as a fallback", () => {
    expect(() => getTestDatabaseEnv({ MONGODB_URI: "mongodb://localhost:27017/shanilo" })).toThrow(ConfigError);
  });

  it("refuses to run when MONGODB_TEST_URI equals MONGODB_URI", () => {
    expect(() => getTestDatabaseEnv({ MONGODB_URI: testUri, MONGODB_TEST_URI: testUri })).toThrow(ConfigError);
  });

  it("allows different MONGODB_URI and MONGODB_TEST_URI", () => {
    const env = getTestDatabaseEnv({ MONGODB_URI: "mongodb://localhost:27017/shanilo", MONGODB_TEST_URI: testUri });
    expect(env.MONGODB_TEST_URI).toBe(testUri);
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
