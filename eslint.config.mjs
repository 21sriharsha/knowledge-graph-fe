import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // ADR 0005: vendor telemetry SDKs only inside their adapter.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/telemetry/adapters/sentry.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@sentry/*"], message: "Use @/lib/telemetry (ADR 0005); Sentry is only allowed in its adapter." },
          ],
        },
      ],
    },
  },
  {
    // ADR 0002: browser code must not reach the backend client. Server-only components that need it
    // live under src/app/_components.
    files: ["src/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [{ name: "@/lib/api/server", message: "Server-only backend client; call a BFF route instead (ADR 0002)." }],
          patterns: [{ group: ["@sentry/*"], message: "Use @/lib/telemetry (ADR 0005)." }],
        },
      ],
    },
  },
  {
    // Playwright fixtures call a parameter named `use`, which the React hooks rule mistakes for a hook.
    files: ["tests/e2e/**/*.ts"],
    rules: { "react-hooks/rules-of-hooks": "off" },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "src/lib/api/schema.d.ts", "prototype/**", "playwright-report/**", "test-results/**"]),
]);

export default eslintConfig;
