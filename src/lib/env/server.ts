import "server-only";
import {
  appSchema,
  cloudinarySchema,
  databaseSchema,
  mellatSchema,
  parseGroup,
  smsIrSchema,
  smtpSchema,
  zarinpalSchema,
  type EnvSource,
} from "./schema";

/**
 * Server-only, lazy, per-group env access. This is the ONLY place that reads
 * process.env for secrets. A group is validated when first requested, so a
 * missing optional provider never blocks startup or the build.
 */
const source = (): EnvSource => process.env;

export const getAppEnv = () => parseGroup("app", appSchema, source());
export const getDatabaseEnv = () => parseGroup("database", databaseSchema, source());
export const getCloudinaryEnv = () => parseGroup("cloudinary", cloudinarySchema, source());
export const getMellatEnv = () => parseGroup("mellat", mellatSchema, source());
export const getZarinpalEnv = () => parseGroup("zarinpal", zarinpalSchema, source());
export const getSmsIrEnv = () => parseGroup("smsir", smsIrSchema, source());
export const getSmtpEnv = () => parseGroup("smtp", smtpSchema, source());
