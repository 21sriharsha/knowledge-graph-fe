/**
 * Browser startup hook (X03-FR-1, X03-FR-7). Registers the telemetry adapter and loads platform
 * polyfills only where feature detection fails (CLAUDE.md browser-support policy, ADR 0004).
 */
import { clientEnv } from "@/lib/env/client";
import { registerTelemetryAdapter, captureError } from "@/lib/telemetry";
import { loadPolyfills } from "@/lib/polyfills";

loadPolyfills();

const env = clientEnv();

if (env.NEXT_PUBLIC_TELEMETRY_EXPORTER === "sentry" && env.NEXT_PUBLIC_SENTRY_DSN) {
  const dsn = env.NEXT_PUBLIC_SENTRY_DSN;
  void import("@/lib/telemetry/adapters/sentry").then(({ createSentryAdapter }) => {
    registerTelemetryAdapter(
      createSentryAdapter({
        dsn,
        environment: env.NEXT_PUBLIC_APP_ENV,
        release: env.NEXT_PUBLIC_RELEASE,
        tracesSampleRate: env.NEXT_PUBLIC_TELEMETRY_TRACES_SAMPLE_RATE,
      }),
    );
  });
}

if (env.NEXT_PUBLIC_TELEMETRY_EXPORTER === "otlp") {
  void import("@/lib/telemetry/adapters/otlp-browser").then(({ createBeaconAdapter }) => registerTelemetryAdapter(createBeaconAdapter()));
}

window.addEventListener("unhandledrejection", (event) => captureError(event.reason, { tags: { kind: "unhandledrejection" } }));
window.addEventListener("error", (event) => captureError(event.error ?? event.message, { tags: { kind: "window.error" } }));
