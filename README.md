# Knowledge Graph — Frontend

Reader, graph explorer and studio for the knowledge platform. The backend lives in
`../knowledge-graph-be` (Spring Boot); this repository is the web frontend.

> Status (2026-11-26): **W0–W6 built** against the current backend and verified locally (47 unit +
> 60 end-to-end tests, lint, typecheck, API drift check, production build). Not yet deployed:
> provider accounts (Vercel, Supabase, Fly.io, Sentry) and the backend gaps in `docs/backend-gaps.md`
> are pending. See `docs/tasklog.md` for what was built and why.

## Quick start

```bash
cp .env.example .env.local   # fill DEV_AUTH_SECRET and REVALIDATE_SECRET (openssl rand -hex 32)
pnpm install
pnpm dev                     # needs the backend on :8080 — see docs/runbooks.md
```

## Product in one paragraph

A minimalist publishing site with Medium-like reading and Obsidian-like graph traversal. Authors write
Markdown in Git repositories (GitHub, GitLab, Azure DevOps); the backend ingests them on push and
serves structured content. The frontend renders that content, lets readers follow links through a
knowledge graph, search with optional AI query understanding, and gives authors/admins a studio to
manage articles, repositories, sync runs and accounts.

## Agreed stack (details in `docs/adr/`)

| Concern | Choice |
|---|---|
| Framework | Next.js App Router, TypeScript (strict), pnpm |
| Client data | TanStack Query, only for browser-fetched data |
| Backend access | Next.js as BFF; the browser never calls Spring directly |
| Auth | Supabase Auth (OIDC, PKCE) via `@supabase/ssr`; roles come from the platform DB |
| Components | Own small kit on native HTML (dialog, popover, switch, select) + React Aria for combobox/menu |
| Styling | CSS Modules + design tokens ported from the prototype |
| Graph | d3-force / d3-zoom on SVG |
| API types | Generated from `../knowledge-graph-be/apim/api-spec.yaml` |
| Observability | Telemetry adapter selected by config: Sentry now, OpenTelemetry later |
| Hosting | Vercel (FE), Supabase (Auth + Postgres), Fly.io (backend, 1 machine) |

## Repository map

| Path | What it is |
|---|---|
| `CLAUDE.md` | Working rules for this repo (read first) |
| `docs/release-plan.md` | Waves, scope, dependencies and exit criteria |
| `docs/tasklog.md` | Every task with status and rationale (append-only) |
| `docs/specs/` | One spec sheet per feature; `docs/specs/README.md` is the index and template |
| `docs/adr/` | Architecture decision records |
| `docs/backend-gaps.md` | API/backend changes the frontend depends on |
| `docs/runbooks.md` | Local setup, deploy, rollback, revalidate, re-sync, secret rotation |
| `src/` | The Next.js app (App Router); `tests/unit`, `tests/e2e` for Vitest / Playwright |
| `prototype/` | Clickable single-file prototype (open `knowledge-ui-prototype.html` in a browser) |

## Prototype

`prototype/knowledge-ui-prototype.html` is the approved UI reference (also published as a private
artifact: https://claude.ai/artifact/JAPJfKobfmrB7Sy6o562o5). It runs entirely in the browser
against a mock API that follows the backend's auth zones and response shapes. Open it directly, or
serve the folder:

```bash
python3 -m http.server 8765 --directory prototype
```

Use the **DEV** button (bottom-left) to switch persona (anonymous / pending / author / admin), add
latency, inject failures, turn AI off or empty the knowledge base. Specs reference its
`data-testid`s, which carry over to the real build.
