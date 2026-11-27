import { clientEnvSchema, describeEnvError, type ClientEnv } from "./schema";

let cached: ClientEnv | undefined;

/**
 * Validated public environment. `NEXT_PUBLIC_*` values are inlined at build time, so each one must be
 * referenced literally here for Next.js to replace it.
 */
export function clientEnv(): ClientEnv {
  if (cached) return cached;
  const parsed = clientEnvSchema.safeParse({
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
    NEXT_PUBLIC_AUTH_MODE: process.env.NEXT_PUBLIC_AUTH_MODE,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_WEBHOOK_BASE_URL: process.env.NEXT_PUBLIC_WEBHOOK_BASE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || undefined,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || undefined,
    NEXT_PUBLIC_TELEMETRY_EXPORTER: process.env.NEXT_PUBLIC_TELEMETRY_EXPORTER,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN || undefined,
    NEXT_PUBLIC_TELEMETRY_TRACES_SAMPLE_RATE: process.env.NEXT_PUBLIC_TELEMETRY_TRACES_SAMPLE_RATE,
    NEXT_PUBLIC_RELEASE: process.env.NEXT_PUBLIC_RELEASE,
  });
  if (!parsed.success) {
    throw new Error(`Invalid public environment:\n${describeEnvError(parsed.error)}`);
  }
  cached = parsed.data;
  return cached;
}
