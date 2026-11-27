# 0005 — Config-selected telemetry adapter

Status: accepted · 2026-11-26

## Context
Sentry is the chosen tool for now; the plan is to migrate to OpenTelemetry later. The migration must
be a configuration change, not a refactor of feature code.

## Decision
- `TELEMETRY_EXPORTER=sentry|otlp|none` is read at startup in `instrumentation.ts` (server) and
  `instrumentation-client.ts` (browser), which register the matching adapter.
- Feature code uses only:
  - `@opentelemetry/api` for spans and context;
  - `@/lib/telemetry` for errors, structured logs and user-safe context (`captureError`, `log`,
    `withSpan`).
- Adapters live in `lib/telemetry/adapters/{sentry,otlp,noop}`. An ESLint `no-restricted-imports`
  rule forbids `@sentry/*` outside the Sentry adapter.
- Server logs are structured JSON (pino) with `requestId`, `traceId`, route and status; never tokens,
  emails or other PII.
- Trace context (`traceparent`) and `X-Request-Id` are forwarded to the backend.

## Consequences
- Migrating = add/finish the OTLP adapter, flip the env var, delete the Sentry adapter.
- Slight indirection for error capture; spans already use the vendor-neutral API.

## Alternatives considered
- Calling Sentry directly everywhere: fastest now, expensive migration later.
- OpenTelemetry only from day one: needs a backend (Grafana Cloud, Honeycomb, …) before launch.
