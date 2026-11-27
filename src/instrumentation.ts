/**
 * Server startup hook (X03-FR-1). Validates the environment once and registers the telemetry
 * adapter chosen by TELEMETRY_EXPORTER. Feature code never knows which exporter is active.
 */
import type { Instrumentation } from "next";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { serverEnv } = await import("@/lib/env/server");
  const { registerTelemetryAdapter } = await import("@/lib/telemetry");
  const { logger } = await import("@/lib/telemetry/logger");
  const env = serverEnv(); // throws with the list of invalid variables

  if (env.TELEMETRY_EXPORTER === "sentry" && env.SENTRY_DSN) {
    const { createSentryAdapter } = await import("@/lib/telemetry/adapters/sentry");
    registerTelemetryAdapter(
      createSentryAdapter({
        dsn: env.SENTRY_DSN,
        environment: env.APP_ENV,
        release: process.env.NEXT_PUBLIC_RELEASE ?? "dev",
        tracesSampleRate: env.TELEMETRY_TRACES_SAMPLE_RATE,
      }),
    );
  } else if (env.TELEMETRY_EXPORTER === "otlp") {
    const { createOtlpServerAdapter } = await import("@/lib/telemetry/adapters/otlp-server");
    registerTelemetryAdapter(
      await createOtlpServerAdapter({ serviceName: "kg-fe", environment: env.APP_ENV, release: process.env.NEXT_PUBLIC_RELEASE ?? "dev" }),
    );
  }

  logger.info(
    { exporter: env.TELEMETRY_EXPORTER, authMode: env.AUTH_MODE, appEnv: env.APP_ENV },
    "app.startup",
  );
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { captureError } = await import("@/lib/telemetry");
  const { logger } = await import("@/lib/telemetry/logger");
  const requestId = [request.headers["x-request-id"]].flat()[0];
  logger.error(
    { route: context.routePath, routeType: context.routeType, requestId, err: { message: (error as Error).message } },
    "request.error",
  );
  captureError(error, { route: context.routePath, requestId });
};
