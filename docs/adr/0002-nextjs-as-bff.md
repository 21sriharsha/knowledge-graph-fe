# 0002 — Next.js as the backend-for-frontend

Status: accepted · 2026-11-26

## Context
The Spring API is a stateless JWT resource server with a single configured CORS origin
(`FRONTEND_ORIGIN`). Vercel preview deployments have changing URLs. Access tokens should not be
readable by browser JavaScript.

## Decision
- The browser calls only Next.js (server components, route handlers under `app/api/`, server actions).
- Next.js calls Spring server-to-server with `Authorization: Bearer <supabase access token>` read from
  the httpOnly session cookie.
- Next.js forwards/creates `X-Request-Id` (the backend's correlation header) and W3C `traceparent`
  on every call, and logs both.
- Backend errors (`ApiError`: `status`, `code`, `message`, `path`, `requestId`, `violations[]`) are
  mapped to typed results; the UI shows `requestId` on unexpected failures so support can find the log.
- The fire-and-forget view counter (`POST /api/articles/{slug}/view`) also goes through a route handler.

## Consequences
- No CORS configuration needed for previews; backend origin is never exposed.
- One extra network hop: Vercel functions, Supabase and Fly.io must run in the same region.
- Route handlers are a thin, typed proxy — no business logic lives in them.

## Alternatives considered
- **Browser calls Spring directly**: fewer hops, but breaks on preview URLs (single CORS origin) and
  requires tokens in browser-readable storage.
