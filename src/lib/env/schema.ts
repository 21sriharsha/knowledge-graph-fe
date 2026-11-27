/**
 * Environment contract (zod). Every variable the app reads is declared here; nothing reads
 * `process.env` directly except `server.ts` / `client.ts`, which validate through these schemas.
 *
 * Kept free of `server-only` so unit tests can exercise the rules.
 */
import { z } from "zod";

const bool = z
  .enum(["true", "false"])
  .default("false")
  .transform((v) => v === "true");

const credentials = z
  .string()
  .regex(/^[^:\s]+:[^\s]+$/, "must be user:password");

export const APP_ENVS = ["local", "test", "preview", "staging", "production"] as const;

/** Blank values (`KEY=` in env files) mean "not set", not "invalid". */
export function withoutBlanks(source: Record<string, string | undefined>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(source).filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].trim() !== ""),
  );
}

export const serverEnvSchema = z
  .object({
    APP_ENV: z.enum(APP_ENVS),
    API_BASE_URL: z.url(),
    API_TIMEOUT_READ_MS: z.coerce.number().int().min(500).max(30_000).default(5_000),
    API_TIMEOUT_WRITE_MS: z.coerce.number().int().min(500).max(60_000).default(10_000),

    AUTH_MODE: z.enum(["supabase", "dev"]).default("supabase"),
    DEV_AUTH_SECRET: z.string().min(32).optional(),
    DEV_AUTH_AUTHOR_CREDENTIALS: credentials.optional(),
    DEV_AUTH_ADMIN_CREDENTIALS: credentials.optional(),
    NEXT_PUBLIC_SUPABASE_URL: z.url().optional(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20).optional(),

    REVALIDATE_SECRET: z.string().min(32),
    NEXT_PUBLIC_SITE_URL: z.url(),
    NEXT_PUBLIC_WEBHOOK_BASE_URL: z.url(),

    TELEMETRY_EXPORTER: z.enum(["sentry", "otlp", "none"]).default("none"),
    SENTRY_DSN: z.url().optional(),
    OTEL_EXPORTER_OTLP_ENDPOINT: z.url().optional(),
    TELEMETRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.1),
    LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),

    FEATURE_SEARCH: bool,
    FEATURE_EXPLORER: bool,
    FEATURE_STUDIO: bool,
  })
  .superRefine((env, ctx) => {
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message });

    if (env.AUTH_MODE === "dev") {
      // The dev sign-in maps personas to the backend's local HTTP Basic users. It must never be
      // reachable on a deployed environment.
      if (env.APP_ENV !== "local" && env.APP_ENV !== "test") {
        issue("AUTH_MODE", "dev auth is only allowed when APP_ENV is local or test");
      }
      if (!env.DEV_AUTH_SECRET) issue("DEV_AUTH_SECRET", "required when AUTH_MODE=dev");
      if (!env.DEV_AUTH_AUTHOR_CREDENTIALS && !env.DEV_AUTH_ADMIN_CREDENTIALS) {
        issue("DEV_AUTH_ADMIN_CREDENTIALS", "at least one dev persona credential is required");
      }
    } else {
      if (!env.NEXT_PUBLIC_SUPABASE_URL) issue("NEXT_PUBLIC_SUPABASE_URL", "required when AUTH_MODE=supabase");
      if (!env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
        issue("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "required when AUTH_MODE=supabase");
      }
    }
    if (env.TELEMETRY_EXPORTER === "sentry" && !env.SENTRY_DSN) {
      issue("SENTRY_DSN", "required when TELEMETRY_EXPORTER=sentry");
    }
    if (env.TELEMETRY_EXPORTER === "otlp" && !env.OTEL_EXPORTER_OTLP_ENDPOINT) {
      issue("OTEL_EXPORTER_OTLP_ENDPOINT", "required when TELEMETRY_EXPORTER=otlp");
    }
    if ((env.APP_ENV === "production" || env.APP_ENV === "staging") && !env.API_BASE_URL.startsWith("https://")) {
      issue("API_BASE_URL", "must use https outside local/test/preview");
    }
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_ENV: z.enum(APP_ENVS),
  NEXT_PUBLIC_AUTH_MODE: z.enum(["supabase", "dev"]).default("supabase"),
  NEXT_PUBLIC_SITE_URL: z.url(),
  NEXT_PUBLIC_WEBHOOK_BASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_URL: z.url().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_TELEMETRY_EXPORTER: z.enum(["sentry", "otlp", "none"]).default("none"),
  NEXT_PUBLIC_SENTRY_DSN: z.url().optional(),
  NEXT_PUBLIC_TELEMETRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.1),
  NEXT_PUBLIC_RELEASE: z.string().default("dev"),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;

/** Formats a zod error into one line per variable without echoing any values (they may be secrets). */
export function describeEnvError(error: z.ZodError): string {
  return error.issues.map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`).join("\n");
}
