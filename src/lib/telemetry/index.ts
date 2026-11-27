/**
 * Telemetry facade (ADR 0005). Feature code imports only this module and `@opentelemetry/api`.
 * The concrete exporter (Sentry today, OTLP later) registers itself at startup from
 * `instrumentation.ts` / `instrumentation-client.ts`, selected by TELEMETRY_EXPORTER.
 */
import { SpanStatusCode, trace, type Attributes } from "@opentelemetry/api";

export type ErrorContext = {
  /** Route template, e.g. `/articles/[slug]` — never a URL with user data. */
  route?: string;
  requestId?: string;
  /** Low-cardinality tags only. */
  tags?: Record<string, string | number | boolean>;
};

export interface TelemetryAdapter {
  readonly name: "sentry" | "otlp" | "none";
  captureError(error: unknown, context?: ErrorContext): void;
}

const noopAdapter: TelemetryAdapter = { name: "none", captureError: () => {} };
let adapter: TelemetryAdapter = noopAdapter;

export function registerTelemetryAdapter(next: TelemetryAdapter): void {
  adapter = next;
}

export function activeExporter(): TelemetryAdapter["name"] {
  return adapter.name;
}

export function captureError(error: unknown, context?: ErrorContext): void {
  try {
    adapter.captureError(error, context);
  } catch {
    // Telemetry must never break the request it observes.
  }
}

const tracer = () => trace.getTracer("kg-fe");

/** Runs `fn` inside a span; records exceptions and marks the span as failed on throw. */
export async function withSpan<T>(name: string, attributes: Attributes, fn: () => Promise<T>): Promise<T> {
  return tracer().startActiveSpan(name, { attributes }, async (span) => {
    try {
      return await fn();
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  });
}
