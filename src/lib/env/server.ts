import "server-only";
import { describeEnvError, serverEnvSchema, withoutBlanks, type ServerEnv } from "./schema";

let cached: ServerEnv | undefined;

/**
 * Validated server environment. Fails fast with the list of invalid variables (never their values).
 * Lazily evaluated so `next build` steps that don't touch the server env don't need every secret.
 */
export function serverEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = serverEnvSchema.safeParse(withoutBlanks(process.env));
  if (!parsed.success) {
    throw new Error(`Invalid server environment:\n${describeEnvError(parsed.error)}`);
  }
  cached = parsed.data;
  return cached;
}
