# X03 — Observability

Status: draft · Wave: W0 · ADR: 0005

## Summary
Errors, traces, structured logs and Web Vitals from day one, behind a telemetry adapter selected by
configuration so Sentry can later be replaced by OpenTelemetry without touching feature code.

## Functional requirements
- X03-FR-1 `TELEMETRY_EXPORTER` = `sentry` | `otlp` | `none` (default `none` locally). Read once at
  startup in `instrumentation.ts` and `instrumentation-client.ts`; invalid values fail startup with a
  clear message (zod env validation).
- X03-FR-2 Public API (`@/lib/telemetry`): `captureError(err, context)`, `log.{debug,info,warn,error}`,
  `withSpan(name, attrs, fn)`, `setRouteContext(route)`. Spans otherwise use `@opentelemetry/api`.
- X03-FR-3 ESLint `no-restricted-imports` blocks `@sentry/*` outside `lib/telemetry/adapters/sentry`.
- X03-FR-4 Server logs: JSON via pino with `timestamp`, `level`, `service="kg-fe"`, `env`, `route`,
  `requestId`, `traceId`, `status`, `durationMs`. Levels: DEBUG (dev only), INFO (startup, revalidation),
  WARN (expected failures: 4xx on mutations, fallback paths), ERROR (unexpected failures).
- X03-FR-5 Never log or attach: tokens, cookies, emails, names, search queries in full (log length and
  hash only), webhook secrets, repository access tokens.
- X03-FR-6 Propagate `traceparent` and `X-Request-Id` to the backend (see X01-FR-4).
- X03-FR-7 Browser: unhandled errors and rejections captured; React error boundaries per route
  segment call `captureError` and render `ErrorState` with the request id when known.
- X03-FR-8 Web Vitals (LCP, INP, CLS, TTFB) reported per route template.
- X03-FR-9 Sampling configurable by env: errors 100 %, traces 10 % in production, 100 % in staging.
- X03-FR-10 Health: `GET /api/health` (liveness, no dependencies) and `GET /api/ready` (checks the
  backend `/actuator/health` with a 2 s timeout). Neither is cached.
- X03-FR-11 Release tagging: every event carries the git SHA and environment.

## Key events to instrument
| Event | Signal |
|---|---|
| Backend call | span + latency metric (X01) |
| Revalidation webhook received/rejected | INFO / WARN log, counter by outcome |
| Sign-in started/completed/failed | span + counter by provider (no user id) |
| Studio mutation | span with operation + outcome; WARN on conflict/validation |
| Search | span with mode, result count, AI used, latency (query not logged) |
| Graph explorer load | span with node count, truncated flag |

## Acceptance criteria
- X03-AC-1 Given `TELEMETRY_EXPORTER=none`, then no telemetry network requests are made.
- X03-AC-2 Given `TELEMETRY_EXPORTER=sentry`, when a server component throws, then one Sentry event is
  sent with route, release and request id, and no cookies/headers.
- X03-AC-3 Given a feature file importing `@sentry/nextjs`, when lint runs, then it fails.
- X03-AC-4 Given a studio request, then the backend log and the frontend log share the same `requestId`.
- X03-AC-5 Given the backend is down, then `/api/health` is 200 and `/api/ready` is 503.

## Out of scope
OTLP adapter implementation (planned for W6); dashboards/alerts beyond Sentry defaults.

## Open questions
- Which OTel backend will replace Sentry (Grafana Cloud, Honeycomb, self-hosted)? Needed before W6.
