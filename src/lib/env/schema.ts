import { z } from "zod";
import { ConfigError } from "@/lib/errors";

const nonEmpty = z.string().trim().min(1);
const emptyToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const optional = <T extends z.ZodType>(schema: T) => z.preprocess(emptyToUndefined, schema.optional());

/** Public config. Only NEXT_PUBLIC_* names may appear here. */
export const publicSchema = z.object({
  NEXT_PUBLIC_APP_URL: optional(z.url()),
});

export const appSchema = z.object({
  LOG_LEVEL: z.preprocess(emptyToUndefined, z.enum(["debug", "info", "warn", "error"]).default("info")),
});

/** MongoDB connection string. Scheme check only; the value is never echoed in errors. */
const mongoUri = z
  .string()
  .trim()
  .regex(/^mongodb(\+srv)?:\/\/\S+$/);

export const databaseSchema = z.object({ MONGODB_URI: mongoUri });

/**
 * Integration tests only. Not part of the app runtime: nothing in `src/` reads it,
 * and a missing value never affects `next build` or `next start`.
 */
export const testDatabaseSchema = z.object({ MONGODB_TEST_URI: mongoUri });

export const cloudinarySchema = z.object({
  CLOUDINARY_CLOUD_NAME: nonEmpty,
  CLOUDINARY_API_KEY: nonEmpty,
  CLOUDINARY_API_SECRET: nonEmpty,
});

export const mellatSchema = z.object({
  MELLAT_TERMINAL_ID: nonEmpty,
  MELLAT_USERNAME: nonEmpty,
  MELLAT_PASSWORD: nonEmpty,
});

export const zarinpalSchema = z.object({ ZARINPAL_MERCHANT_ID: nonEmpty });

export const smsIrSchema = z.object({
  SMSIR_API_KEY: nonEmpty,
  SMSIR_LINE_NUMBER: nonEmpty,
});

export const smtpSchema = z.object({
  SMTP_HOST: nonEmpty,
  SMTP_PORT: z.coerce.number().int().min(1).max(65535),
  SMTP_USER: nonEmpty,
  SMTP_PASSWORD: nonEmpty,
  SMTP_FROM: nonEmpty,
});

export type EnvSource = Record<string, string | undefined>;

/**
 * Validate one config group. Throws ConfigError listing variable NAMES only,
 * never values (zod issue messages can echo input, so they are not used).
 */
export function parseGroup<S extends z.ZodObject>(group: string, schema: S, source: EnvSource): z.infer<S> {
  const result = schema.safeParse(source);
  if (result.success) return result.data;
  const names = [...new Set(result.error.issues.map((i) => String(i.path[0] ?? "unknown")))];
  throw new ConfigError(group, names);
}
