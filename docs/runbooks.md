# Runbooks

Operational procedures for the frontend (W6). Backend procedures live in `../knowledge-graph-be`.

## Local development
1. Backend: system Postgres (or `docker compose up -d` in the backend repo) and
   `java -jar platform-app/target/platform-app-*.jar --spring.profiles.active=local`
   (build it with `./mvnw -q package -DskipTests -pl platform-app -am`).
2. Content: register repositories in the studio (Repositories → Connect) or via
   `POST /api/studio/sources` with the local admin user, then "Sync now".
3. Frontend: `cp .env.example .env.local`, fill `DEV_AUTH_SECRET` and `REVALIDATE_SECRET`
   (`openssl rand -hex 32`), then `pnpm dev`. Sign in with the dev personas (AUTH_MODE=dev).
4. Checks: `pnpm check` (lint, typecheck, unit, API drift) and `pnpm test:e2e` (needs 2 + 3).

## Deploy (Vercel)
- Preview: every PR builds with the **Preview** env (values from `.env.nonprod` + secrets in Vercel).
- Staging/production: merge to `main` → staging; promote in Vercel → production (`.env.prod` values).
- Required secrets per environment: `REVALIDATE_SECRET`, `SENTRY_AUTH_TOKEN` (if Sentry), Supabase
  publishable key and URL (public), Sentry DSN (public).
- After a deploy, `/api/ready` must return 200 (backend reachable) before promoting.

## Rollback
- Frontend: Vercel → Deployments → previous deployment → "Instant rollback". No data migration involved.
- Backend: `fly releases` → `fly deploy --image <previous>`; then re-run syncs (in-memory queue,
  ADR 0006) and revalidate everything (below).

## Revalidate everything (stale pages after an incident)
Sign the call with the shared secret (5-minute replay window):
```bash
TS=$(date +%s); BODY='{"tags":["articles","navigation","graph"]}'
SIG=$(printf "%s.%s" "$TS" "$BODY" | openssl dgst -sha256 -hmac "$REVALIDATE_SECRET" -hex | awk '{print $2}')
curl -X POST https://<site>/api/revalidate -H "x-timestamp: $TS" -H "x-signature: sha256=$SIG" -d "$BODY"
```
Article/topic/tag/author pages also carry their own tags (`article:<slug>` …); `articles` covers all
article reads.

## Re-sync after a backend deploy
The backend's job queue is in memory (BG-8): a deploy drops queued/running ingestion. Studio →
Repositories → "Sync now" on each active repository, then check Sync history for failures.

## Rotate secrets
- `REVALIDATE_SECRET`: set the new value in both the backend config and Vercel, redeploy both. During
  the switch, revalidation calls fail (401) and pages fall back to the 1-hour safety revalidation.
- Repository access tokens / webhook secrets: Studio → Repositories → Edit → enter the new value
  (write-only; blank keeps the old one). Update the webhook secret in the Git provider at the same time.
- `DEV_AUTH_SECRET`: local only; changing it signs everyone out of dev sessions.

## Switch telemetry exporter (Sentry → OpenTelemetry)
Set `TELEMETRY_EXPORTER=otlp`, `NEXT_PUBLIC_TELEMETRY_EXPORTER=otlp` and the standard
`OTEL_EXPORTER_OTLP_ENDPOINT` (+ `OTEL_EXPORTER_OTLP_HEADERS` if the collector needs auth), redeploy.
No code changes (ADR 0005). Browser errors then arrive as `client.error` log lines.

## Troubleshooting
| Symptom | Check |
|---|---|
| Pages show "Something went wrong" with a reference | Search logs for that `requestId` (frontend and backend share it) |
| Studio says "Studio is unavailable" | `/api/ready`; backend `/actuator/health`; Supabase JWKS reachable (BG-17) |
| Content doesn't update after a push | Webhook secret configured? Sync history shows the run? `/api/revalidate` 401s in logs? |
| Unpublished article missing from studio list | Known backend bug BG-21; re-publish via API or wait for the fix |
