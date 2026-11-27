import "server-only";
/**
 * OpenTelemetry adapter (ADR 0005; W6). Selected with TELEMETRY_EXPORTER=otlp.
 *
 * Server: registers the OTel SDK via @vercel/otel (the Next.js-recommended wrapper). Traces export over
 * OTLP using the standard env vars (OTEL_EXPORTER_OTLP_ENDPOINT / _HEADERS / _PROTOCOL). OTel has no
 * error-tracking product, so errors are recorded on the active span and logged as structured ERROR
 * lines (collected by the log pipeline).
 *
 * Browser: no OTel SDK shipped to the client; errors are beaconed to `/api/telemetry/client-error`,
 * which validates and logs them server-side. Feature code is unaware of any of this.
 */
import { SpanStatusCode, trace } from "@opentelemetry/api";
import type { ErrorContext, TelemetryAdapter } from "../index";
import { logger } from "../logger";

export async function createOtlpServerAdapter(options: { serviceName: string; environment: string; release: string }): Promise<TelemetryAdapter> {
  const { registerOTel } = await import("@vercel/otel");
  registerOTel({
    serviceName: options.serviceName,
    attributes: { "deployment.environment": options.environment, "service.version": options.release },
    traceExporter: "auto",
  });
  return {
    name: "otlp",
    captureError(error: unknown, context?: ErrorContext) {
      const err = error instanceof Error ? error : new Error(String(error));
      const span = trace.getActiveSpan();
      span?.recordException(err);
      span?.setStatus({ code: SpanStatusCode.ERROR });
      logger.error({ route: context?.route, requestId: context?.requestId, tags: context?.tags, err: { name: err.name, message: err.message, stack: err.stack } }, "error.captured");
    },
  };
}
