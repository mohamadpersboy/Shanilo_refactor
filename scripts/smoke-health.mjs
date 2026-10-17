// Production smoke test. Run after `npm run build`.
// It starts `next start` on a free port, checks /api/health, then stops the server.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");
const port = process.env.SMOKE_PORT ?? "3199";
const base = `http://127.0.0.1:${port}`;

if (!existsSync(join(process.cwd(), ".next", "BUILD_ID"))) {
  console.error("No production build found in .next. Run `npm run build` first.");
  process.exit(1);
}

const server = spawn(process.execPath, [nextBin, "start", "-p", port], { stdio: "inherit" });
let exited = false;
server.on("exit", () => (exited = true));

/** Stop the server and wait until the child process has really exited. */
async function stopServer() {
  if (exited) return;
  await new Promise((resolve) => {
    const timer = setTimeout(resolve, 10_000);
    server.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
    server.kill();
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok, detail });

try {
  let res = null;
  for (let i = 0; i < 40 && !exited; i++) {
    try {
      res = await fetch(`${base}/api/health`);
      break;
    } catch {
      await sleep(500);
    }
  }
  if (!res) throw new Error("Server did not answer in 20 seconds.");

  const body = await res.json();
  check("GET /api/health status is 200", res.status === 200, String(res.status));
  check('body is {"status":"ok"}', JSON.stringify(body) === '{"status":"ok"}', JSON.stringify(body));
  check("Cache-Control contains no-store", (res.headers.get("cache-control") ?? "").includes("no-store"));

  const home = await fetch(`${base}/`);
  check("GET / status is 200", home.status === 200, String(home.status));

  const missing = await fetch(`${base}/this-route-does-not-exist`);
  check("unknown route returns 404", missing.status === 404, String(missing.status));
} catch (e) {
  check("server reachable", false, e instanceof Error ? e.message : String(e));
} finally {
  await stopServer();
}

console.log("\n=== SMOKE RESULT ===");
for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? `  [${r.detail}]` : ""}`);
// Do not call process.exit(): on Windows it can crash Node while the child handle is still closing.
process.exitCode = results.every((r) => r.ok) && results.length > 0 ? 0 : 1;
