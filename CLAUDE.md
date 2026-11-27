# CLAUDE.md — knowledge-graph-fe

Project rules for the frontend. The global `~/.claude/CLAUDE.md` still applies; this file adds what
is specific to this repo.

## Read before working
1. `docs/release-plan.md` — which wave we are in and what is in scope.
2. The spec sheet for the feature you are touching (`docs/specs/`).
3. Relevant ADRs (`docs/adr/`). Do not contradict an accepted ADR; propose a new one instead.

## Task log (mandatory)
- Every task gets an entry in `docs/tasklog.md` **before** work starts (status `planned` or
  `in-progress`) and is updated when it ends (`done`, `blocked`, `dropped`).
- Each entry states the rationale: why this task, why this approach, alternatives rejected.
- The log is append-only. Correct mistakes with a new entry that references the old one.

## Spec-first
- No feature code without a spec sheet in `docs/specs/`. If behaviour changes, update the spec in the
  same change.
- Acceptance criteria in specs are the source for tests. Keep spec IDs (`F03-AC-4`) in test names.

## API contract
- The contract is `../knowledge-graph-be/apim/api-spec.yaml`. `docs/openapi.yaml` in the backend is
  stale — never use it.
- Types are generated from the spec; never hand-write response types.
- Anything the UI needs that the spec lacks goes into `docs/backend-gaps.md` first.

## Architecture rules
- **BFF only:** browser code calls Next.js route handlers / server actions, never the Spring API.
- **Data ownership:** server components own server-fetched data; TanStack Query owns browser-fetched
  data. Do not cache the same data in both.
- **The UI never reads roles from the token.** It reads *effective* roles from `GET /api/studio/me`;
  hiding a control is UX only — the backend enforces access. (The backend itself may take AUTHOR,
  never ADMIN, from a Supabase-written claim — ADR 0008.)
- **No HTML injection.** Article bodies are rendered from typed content blocks; no
  `dangerouslySetInnerHTML` for content.
- **Telemetry:** feature code imports only `@/lib/telemetry` and `@opentelemetry/api`. Vendor SDKs
  (Sentry) are allowed only inside the telemetry adapters; a lint rule enforces this.

## UI rules
- Native elements first: `<dialog>`, `popover`, CSS anchor positioning, `<input type="checkbox" switch>`,
  `<select>`. React Aria only for combobox and menu keyboard handling.
- Consult the `modern-web-guidance` skill before building a UI pattern; follow its fallbacks. A
  project hook (`.claude/hooks/mwg_gate.py`) blocks the first UI-file edit in each session until a
  guide has been retrieved; consult it again for every new pattern even though the hook only checks once.
- **Browser support:** Baseline *Widely available* features freely; *Newly available* features only
  with feature detection and a fallback/polyfill loaded only where missing; nothing Chrome-only
  without a fallback.
- Keep the prototype's `data-testid`s on equivalent elements.
- Respect `prefers-reduced-motion`, keyboard access and visible focus everywhere.

## Next.js version
Next.js 16 with Cache Components. Read `AGENTS.md` and the bundled docs in
`node_modules/next/dist/docs/` before using any Next API — it differs from older versions
(`proxy.ts` not middleware, async request APIs, `use cache`/`cacheTag`/`cacheLife`).

## Input validation
Every user input (forms, route-handler bodies and params, search params, cookies we set) is parsed
with zod before it is used. Schemas live in `src/lib/validation/`.

## Commands
| Command | Purpose |
|---|---|
| `pnpm dev` | Dev server (uses `.env.local`; copy from `.env.example`) |
| `pnpm check` | Lint + typecheck + unit tests + API drift check |
| `pnpm test` / `pnpm test:e2e` | Vitest / Playwright (E2E needs dev server + backend with content) |
| `pnpm api:types` | Regenerate `src/lib/api/schema.d.ts` from the backend spec |
| `pnpm build` / `build:nonprod` / `build:prod` | Production build with `.env.local` / `.env.nonprod` / `.env.prod` |
| `node scripts/gen-tokens.mjs` | Regenerate `src/app/tokens.css` from the colour table |
