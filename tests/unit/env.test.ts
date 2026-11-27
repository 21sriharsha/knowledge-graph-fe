import { describe, expect, it } from "vitest";
import { serverEnvSchema, withoutBlanks } from "@/lib/env/schema";

const base = {
  APP_ENV: "local",
  API_BASE_URL: "http://localhost:8080",
  REVALIDATE_SECRET: "x".repeat(32),
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  NEXT_PUBLIC_WEBHOOK_BASE_URL: "http://localhost:8080",
  AUTH_MODE: "dev",
  DEV_AUTH_SECRET: "s".repeat(32),
  DEV_AUTH_ADMIN_CREDENTIALS: "admin:admin",
};

describe("X03-FR-1 / env schema", () => {
  it("accepts a valid local dev configuration", () => {
    expect(serverEnvSchema.safeParse(base).success).toBe(true);
  });

  it("refuses dev auth outside local/test (security)", () => {
    const result = serverEnvSchema.safeParse({ ...base, APP_ENV: "production", API_BASE_URL: "https://api.example.com" });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain("AUTH_MODE");
  });

  it("requires Supabase settings in supabase mode", () => {
    const result = serverEnvSchema.safeParse({ ...base, AUTH_MODE: "supabase" });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.path[0])).toEqual(
      expect.arrayContaining(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]),
    );
  });

  it("requires a DSN when the Sentry exporter is selected", () => {
    const result = serverEnvSchema.safeParse({ ...base, TELEMETRY_EXPORTER: "sentry" });
    expect(result.success).toBe(false);
  });

  it("rejects a short revalidation secret", () => {
    expect(serverEnvSchema.safeParse({ ...base, REVALIDATE_SECRET: "short" }).success).toBe(false);
  });

  it("requires https for the backend on staging/production", () => {
    const result = serverEnvSchema.safeParse({
      ...base,
      APP_ENV: "staging",
      AUTH_MODE: "supabase",
      NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_0123456789abcdef",
    });
    expect(result.success).toBe(false);
  });

  it("treats blank values as unset", () => {
    const env = withoutBlanks({ ...base, SENTRY_DSN: "", OTEL_EXPORTER_OTLP_ENDPOINT: "  " });
    expect(serverEnvSchema.safeParse(env).success).toBe(true);
  });

  it("parses feature flags as booleans", () => {
    const parsed = serverEnvSchema.parse({ ...base, FEATURE_STUDIO: "true" });
    expect(parsed.FEATURE_STUDIO).toBe(true);
    expect(parsed.FEATURE_SEARCH).toBe(false);
  });
});
