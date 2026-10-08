import { ConfigError } from "@/lib/errors";
import { parseGroup, testDatabaseSchema, type EnvSource } from "@/lib/env/schema";

/**
 * Test-only access to MONGODB_TEST_URI. Integration tests call this; the app never does.
 * It reads the variable and checks it. It does not connect to MongoDB.
 *
 * Rules:
 * - Missing or malformed value throws ConfigError (names only, never values).
 * - MONGODB_TEST_URI must differ from MONGODB_URI, so a test run cannot touch
 *   the development or production database.
 */
export function getTestDatabaseEnv(source: EnvSource = process.env) {
  const env = parseGroup("test-database", testDatabaseSchema, source);
  const runtimeUri = source.MONGODB_URI?.trim();
  if (runtimeUri && runtimeUri === env.MONGODB_TEST_URI) {
    throw new ConfigError("test-database", ["MONGODB_TEST_URI", "MONGODB_URI"]);
  }
  return env;
}
