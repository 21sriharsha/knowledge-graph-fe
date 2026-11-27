/**
 * Sentry adapter — the only module allowed to import `@sentry/*` (enforced by ESLint).
 * Loaded dynamically by the instrumentation files when TELEMETRY_EXPORTER=sentry.
 */
import * as Sentry from "@sentry/nextjs";
import type { ErrorContext, TelemetryAdapter } from "../index";

export type SentryInitOptions = {
  dsn: string;
  environment: string;
  release: string;
  tracesSampleRate: number;
};

export function createSentryAdapter(options: SentryInitOptions): TelemetryAdapter {
  Sentry.init({
    dsn: options.dsn,
    environment: options.environment,
    release: options.release,
    tracesSampleRate: options.tracesSampleRate,
    // Sentry 11 data collection: no user info, cookies, headers, query params or bodies (X03-FR-5).
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
    },
    // Never ship cookies, headers or query strings that may carry user data (X03-FR-5).
    beforeSend(event) {
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers;
        delete event.request.query_string;
      }
      return event;
    },
  });

  return {
    name: "sentry",
    captureError(error: unknown, context?: ErrorContext) {
      Sentry.withScope((scope) => {
        if (context?.route) scope.setTag("route", context.route);
        if (context?.requestId) scope.setTag("request_id", context.requestId);
        for (const [key, value] of Object.entries(context?.tags ?? {})) scope.setTag(key, String(value));
        Sentry.captureException(error);
      });
    },
  };
}

export const captureRequestError = Sentry.captureRequestError;
