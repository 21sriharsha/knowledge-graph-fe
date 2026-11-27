# Release plan

Status: approved 2026-11-26 · all waves built locally 2026-11-26 (deployment pending provider accounts)

The frontend ships in **seven waves (W0–W6)**. Each wave ends with something usable in staging and a
go/no-go for production. Public reading comes first (it needs no sign-in and delivers value on its
own); the studio comes later because content can be ingested from Git before any studio UI exists.

## Principles
- **Vertical slices:** every wave is deployable on its own; nothing half-built is visible in
  production (unfinished routes are behind server-side feature flags).
- **Contract first:** a wave starts only when its backend gaps (`backend-gaps.md`) are agreed; UI work
  can start against MSW mocks typed from the spec.
- **Spec → tests → code:** acceptance criteria become Playwright/Vitest tests in the same wave.
- **Every task logged** in `tasklog.md` with its rationale.

## Environments
| Env | Frontend | Backend | Data | Purpose |
|---|---|---|---|---|
| local | `pnpm dev` | local Spring (`local` profile) or MSW mocks | compose Postgres :5433 | development |
| preview | Vercel per-PR URL | shared staging backend | staging | review each PR |
| staging | Vercel `staging` | Fly.io `kg-be-staging` (1 machine) | Supabase staging project | wave acceptance |
| production | Vercel `production` | Fly.io `kg-be-prod` (1 machine) | Supabase prod project | users |

All three providers in the same region.

## Wave overview
Build status (2026-11-26): every wave's scope is implemented and verified locally against the real
backend; production release still requires the W0 provider accounts and the listed backend gaps.

| Wave | Theme | Specs | Backend gaps needed | Effort | User-visible? |
|---|---|---|---|---|---|
| **W0** | Foundations & deploy pipeline | X01, X02 (tokens/kit core), X03, X04 (skeleton) | BG-7, BG-16, BG-17 | M | No (internal) |
| **W1** | Public reader MVP | F02, F03 (core), F04, X02 (reading mode), X04 (caching) | BG-1, BG-2, BG-3, BG-9 | L | **Yes — soft launch** |
| **W2** | Discovery | F05, F03 (previews), F06 (component + local graph) | BG-4, BG-12, (BG-10 optional) | M | Yes |
| **W3** | Graph explorer | F06 (explorer) | BG-5, BG-13 | M | Yes |
| **W4** | Sign-in & studio core | F01, F08, F09 | – | L | Yes (authors/admins) |
| **W5** | Studio editorial & admin | F07, F10, F11 | BG-14 | M | Yes (authors/admins) |
| **W6** | Hardening & GA | all; OTLP adapter | BG-8 | M | **GA** |

Effort is relative (S/M/L). Calendar dates are set after W0, once real velocity is known.

Dependencies: W1 needs W0. W2 and W3 need W1; W3 needs W2's graph component. W4 needs W0 only and can
run in parallel with W2/W3 if capacity allows. W5 needs W4. W6 needs all.

---

## W0 — Foundations & deploy pipeline
**Goal:** an empty but production-shaped app deployed to staging through CI, with auth plumbing,
API types, telemetry and the component kit's base.

Scope
- `git init`, Next.js App Router + TS strict + pnpm, ESLint/Prettier, zod env validation.
- Generated API types + drift check (X01-FR-1); typed server client; BFF result mapping.
- Telemetry adapter (Sentry + noop), structured logging, health/ready routes (X03).
- Tokens, theme (system/light/dark, no flash), kit primitives: Button, Chip, Skeleton, ErrorState,
  EmptyState, Toast, Dialog (X02).
- Route skeleton for all X04 routes with not-found and loading states.
- CI: lint, typecheck, unit tests, build, spec drift, Playwright smoke on preview.
- Accounts/projects created by the owner: Vercel, Supabase (asymmetric keys), Fly.io, Sentry.
- Backend: Dockerfile + `fly.toml` (BG-16), schema off `public` (BG-7), JWKS verified (BG-17).

Exit criteria
- PR → preview URL → staging deploy works end to end; staging `/api/ready` is green against the Fly
  backend.
- A Sentry test error from staging arrives with release and request id.
- Theme switch without flash; kit primitives pass axe.

## W1 — Public reader MVP (soft launch)
**Goal:** readers can browse and read published articles quickly, in light, dark or reading mode.

Scope: home (F02, static graph preview included), article core (F03-FR-1…9), topic/tag/author pages
and indexes (F04), reading mode (X02), caching + revalidation + metadata + sitemap (X04).

Exit criteria
- All F02/F03 (core)/F04/X04 acceptance criteria pass in CI.
- Revalidation from a real ingestion run updates staging within 1 minute (BG-1).
- Core Web Vitals on staging: LCP < 2.5 s, CLS < 0.1, INP < 200 ms (p75, mobile emulation).
- No serious/critical axe violations on reader pages.

Release: production soft launch (no announcement); studio routes flagged off. Content ingested via
the backend API using admin service credentials until W4.

## W2 — Discovery
**Goal:** readers find things: search with AI understanding, link previews, local graph.

Scope: F05 (suggest + results), F03-FR-10/11 (previews, local graph), F06 component.

Exit criteria
- F05 and F06 (component/local) acceptance criteria pass.
- Search with AI off and with the model unavailable degrades to keyword results with the notice.
- Suggestion p75 < 250 ms in staging.

## W3 — Graph explorer
**Goal:** Obsidian-style exploration of the whole graph and of topics/tags.

Scope: `/graph` with both scopes, settings panel, URL state, side card (F06-FR-9…14).

Exit criteria
- F06 explorer acceptance criteria pass; 60-node graph settles < 1.5 s; INP < 100 ms on interactions.
- Taxonomy endpoint (BG-5) live in staging.

## W4 — Sign-in & studio core
**Goal:** admins and authors sign in, connect repositories and watch syncs.

Scope: F01 (sign-in, pending screen, account menu), F08 (repositories), F09 (sync history, run detail
with polling); studio shell/navigation.

Exit criteria
- F01/F08/F09 acceptance criteria pass for all four personas.
- Security checks: open-redirect guard, no secrets in client bundles/logs, studio `no-store` +
  `noindex`, CSRF-safe mutations (server actions / same-origin route handlers).
- An admin connects a real GitHub repo in staging, a push triggers a run, the article appears on the
  public site.

Release: production for invited authors/admins (bootstrap admin emails).

## W5 — Studio editorial & admin
**Goal:** authors manage publication state and their profile; admins manage access.

Scope: F07 (articles), F10 (accounts/roles/bylines), F11 (author profile — prototype first).

Exit criteria
- F07/F10/F11 acceptance criteria pass; a pending user can be promoted to author end to end.

## W6 — Hardening & GA
**Goal:** production-ready for general availability.

Scope
- Performance pass (bundle budgets, image strategy, font loading), full accessibility audit (keyboard,
  screen reader smoke on VoiceOver/NVDA), security review (headers/CSP, dependency audit).
- OTLP telemetry adapter implemented and tested (`TELEMETRY_EXPORTER=otlp` in staging).
- Persistent job queue in backend (BG-8) or documented operational workaround.
- Runbooks: deploy, rollback, re-sync after backend deploy, rotating secrets.

Exit criteria
- All acceptance criteria green; error rate < 0.5 % of requests over 7 days in staging/soft launch.
- GA announcement.

---

## Definition of done (every task)
- Spec updated if behaviour changed; acceptance criteria covered by tests.
- Lint, typecheck, unit and e2e tests pass in CI; axe clean for touched pages.
- Telemetry added per spec; no secrets/PII in logs.
- `tasklog.md` entry updated with outcome and rationale.

## Feature flags
Server-side env flags (e.g. `FEATURE_STUDIO`, `FEATURE_EXPLORER`, `FEATURE_SEARCH_AI_TOGGLE`), read in
layouts/route handlers; flagged-off routes return 404. Flags are removed once a wave reaches GA.

## Rollback
- Frontend: Vercel instant rollback to the previous deployment.
- Backend: `fly releases` rollback; afterwards re-run syncs (in-memory queue, ADR 0006).
- Revalidation is idempotent; a full revalidate (`tags: ["articles","graph","navigation"]`) is the
  recovery step for stale pages.

## Risks
| Risk | Impact | Mitigation |
|---|---|---|
| Backend gaps (BG-2, BG-5) land late | W1 cards / W3 explorer blocked | Build against MSW mocks; ship compact cards first (F04-FR-4) |
| In-memory job queue drops work on deploy | Missed content updates | Re-sync runbook; BG-8 in W6 |
| Supabase `public` schema exposure | Data leak | BG-7 is a W0 exit criterion |
| Extra BFF hop latency | Slower pages | Same region; cache reader pages |
| Newly-available web features in older browsers | Broken overlays | Feature-detected polyfills (CLAUDE.md policy) |
