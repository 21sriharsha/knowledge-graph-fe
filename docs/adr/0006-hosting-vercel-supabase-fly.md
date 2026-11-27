# 0006 — Hosting on Vercel, Supabase and Fly.io

Status: accepted · 2026-11-26

## Context
The backend is one Spring Boot jar (`platform-app`) needing Postgres 17 + pgvector, a public URL for
repository webhooks, and (optionally) Ollama. Its job queue is in memory (`InMemoryJobQueueImpl`).

## Decision
- **Vercel** hosts the Next.js app: tag revalidation and per-PR preview deployments. Build with
  `output: "standalone"` so a container move stays possible.
- **Supabase** provides Auth and the backend's Postgres. The backend's Liquibase schema moves out of
  `public` (which Supabase exposes through its Data API) into its own schema, not exposed.
- **Fly.io** runs the backend container: **exactly one always-on machine** (the in-memory queue does
  not survive restarts or span replicas). Health checks on the actuator endpoints.
- All three in the **same region**.
- Ollama is off at launch; the backend falls back to heuristics.
- Environments: local, preview (per PR, shared staging backend), staging, production.

## Consequences
- Deploys of the backend drop queued/running ingestion; operators re-run a sync after deploy until the
  queue is persisted.
- Webhooks missed during a backend deploy are not retried automatically; manual/scheduled sync is the
  safety net.
- Account creation for Vercel, Supabase, Fly.io and Sentry is done by the project owner.

## Alternatives considered
- Single self-hosted VM (Caddy + containers + Postgres + Ollama): cheapest and runs Ollama, but backups,
  patching and uptime are on us.
- Cloud Run for the backend: scale-to-zero would kill background ingestion and schedules.
