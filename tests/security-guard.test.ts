import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { redact } from "@/lib/logger/redact";
import { securityHeaders } from "../next.config";

const ROOT = process.cwd();

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const sourceFiles = [...walk(join(ROOT, "app")), ...walk(join(ROOT, "src"))].filter((f) =>
  /\.(ts|tsx|js|jsx|mjs)$/.test(f),
);

describe("security regression guard (S12, S17, S19, S23, S24)", () => {
  it("scans a non-empty source set", () => {
    expect(sourceFiles.length).toBeGreaterThan(10);
  });

  it.each([
    ["dangerouslySetInnerHTML (S12, S23)", /dangerouslySetInnerHTML/],
    ["eval / new Function (S24)", /\beval\s*\(|new\s+Function\s*\(/],
    ["child_process in app code", /child_process/],
    ["debug dump dd()/dump() (S17, S19)", /(^|[^\w.])(dd|dump)\s*\(/m],
    ["dynamic import from variable (S24)", /import\s*\(\s*[^"'`\s)]/],
    ["Mongo $where / mapReduce operators", /\$where|\bmapReduce\b/],
  ])("source has no %s", (_label, pattern) => {
    const hits = sourceFiles.filter((f) => pattern.test(readFileSync(f, "utf8"))).map((f) => relative(ROOT, f));
    expect(hits).toEqual([]);
  });

  it("does not log secrets-bearing process.env wholesale", () => {
    const hits = sourceFiles
      .filter((f) => /console\.\w+\([^)]*process\.env\b(?!\.)/.test(readFileSync(f, "utf8")))
      .map((f) => relative(ROOT, f));
    expect(hits).toEqual([]);
  });
});

describe("route inventory (S3, S4, S13: no unreviewed endpoints)", () => {
  // Any new Route Handler must be added here in the same PR as its authorization tests.
  const REVIEWED_ROUTES = ["app/api/health/route.ts"];

  it("only reviewed Route Handlers exist", () => {
    const routes = walk(join(ROOT, "app"))
      .map((f) => relative(ROOT, f).split("\\").join("/"))
      .filter((f) => /\/route\.(ts|tsx|js)$/.test(f));
    expect(routes.sort()).toEqual([...REVIEWED_ROUTES].sort());
  });

  it("has no Server Actions file without review", () => {
    const hits = sourceFiles.filter((f) => /^\s*["']use server["']/m.test(readFileSync(f, "utf8")));
    expect(hits.map((f) => relative(ROOT, f))).toEqual([]);
  });
});

describe("secret hygiene (S1, S2)", () => {
  const SECRET_KEYS = /(PASSWORD|SECRET|API_KEY|TOKEN|URI|TERMINAL_ID|USERNAME|MERCHANT_ID|LINE_NUMBER)/;

  it(".env.example holds placeholders only", () => {
    const lines = readFileSync(join(ROOT, ".env.example"), "utf8").split("\n");
    const bad = lines
      .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/))
      .filter((m): m is RegExpMatchArray => m !== null && SECRET_KEYS.test(m[1]) && m[2].trim() !== "")
      .map((m) => m[1]);
    expect(bad).toEqual([]);
  });

  it("no real-looking credentials in tracked source/docs", () => {
    const files = [...walk(join(ROOT, "app")), ...walk(join(ROOT, "src")), ...walk(join(ROOT, "docs")), join(ROOT, "CLAUDE.md"), join(ROOT, ".env.example")];
    const patterns = [
      /github_pat_[A-Za-z0-9_]{20,}/,
      /\bgh[pousr]_[A-Za-z0-9]{30,}/,
      /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
      /\bAKIA[0-9A-Z]{16}\b/,
      /\bsk_live_[A-Za-z0-9]{10,}/,
    ];
    const hits = files.filter((f) => patterns.some((p) => p.test(readFileSync(f, "utf8")))).map((f) => relative(ROOT, f));
    expect(hits).toEqual([]);
  });

  it("redacts tokens inside free text and sensitive keys", () => {
    const out = JSON.stringify(
      redact({
        message: "auth failed Bearer abcdef1234567890 and github_pat_ABCDEFGHIJKLMNOPQRSTUV",
        otp: "12345",
        nested: { authorization: "x", resetCode: "y", password: "z" },
      }),
    );
    expect(out).not.toMatch(/abcdef1234567890|ABCDEFGHIJKLMNOPQRSTUV|12345/);
    expect(out).toContain("[REDACTED]");
  });
});

describe("security headers (S26)", () => {
  it("sends baseline headers in every environment", () => {
    const keys = securityHeaders(false).map((h) => h.key);
    expect(keys).toEqual(
      expect.arrayContaining(["X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy", "Permissions-Policy"]),
    );
    expect(keys).not.toContain("Strict-Transport-Security");
  });

  it("adds HSTS only in production", () => {
    const hsts = securityHeaders(true).find((h) => h.key === "Strict-Transport-Security");
    expect(hsts?.value).toMatch(/max-age=\d{7,}/);
  });
});
