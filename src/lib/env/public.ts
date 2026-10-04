import { parseGroup, publicSchema } from "./schema";

/** Public (client-safe) config. Next.js inlines NEXT_PUBLIC_* only when referenced literally. */
export function getPublicEnv() {
  return parseGroup("public", publicSchema, {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  });
}
