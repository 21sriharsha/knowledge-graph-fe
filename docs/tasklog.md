# Task log

Append-only record of every task: what, status, and **why** (the rationale and alternatives). Correct
an entry by adding a new one that references it. Newest entries at the bottom of each section.

Status: `planned` · `in-progress` · `done` · `blocked` · `dropped`
IDs: `T-00xx` = pre-wave work, `T-W<n>-xx` = wave tasks.

---

## Pre-wave: discovery, prototype, decisions

### T-0001 · 2026-11-25 · done · Understand the backend
- **Task:** Recover the earlier backend analysis session (BFS of capabilities, DFS of the
  push → webhook → ingestion and search flows) and read the security model, read models and the API
  spec.
- **Rationale:** The frontend's shape is dictated by what the backend serves (typed content blocks, no
  HTML; roles from DB, not tokens; public vs studio zones). Designing without this would produce a UI
  the API cannot back.
- **Outcome:** `apim/api-spec.yaml` confirmed as the contract (`docs/openapi.yaml` is stale).

### T-0002 · 2026-11-25 · done · Choose sign-in approach
- **Task:** Decide authentication for the frontend.
- **Rationale:** Backend is an OIDC resource server (JWKS, issuer check, roles in DB). OIDC sign-in via
  Supabase Auth fits without backend changes beyond config; Next.js App Router chosen as the stack.
- **Alternatives:** Auth.js (duplicate session layer), Clerk/Auth0 (second vendor). See ADR 0003.

### T-0003 · 2026-11-25 · done · Build the clickable prototype
- **Task:** Single-file HTML prototype (reader, graph explorer, search, OIDC sign-in, studio) with a
  mock API mirroring the backend's auth zones and schemas, personas, latency/failure injection.
- **Rationale:** Lets the owner see and comment on the UI before any framework code, and doubles as
  the source of test cases (`data-testid`s, personas, failure modes). Vanilla JS + d3 kept it
  dependency-light and publishable as an artifact.
- **Outcome:** https://claude.ai/artifact/JAPJfKobfmrB7Sy6o562o5 (copy in `prototype/`).

### T-0004 · 2026-11-25 · done · Prototype revisions from review comments (v2–v11)
- **Task and rationale per change:**
  - v2 Removed home topic tabs — topics can grow without limit; a tab row would not scale.
  - v3 Topic + tags on "Most read" items — more context per item; needs BG-3.
  - v4 Removed Authors section from home — reduce sidebar noise; bylines already link to authors.
  - v5 Multiple topics and tags per article — matches `ArticleReadModel` arrays; card shows 3 tags + "+N".
  - v6 Any click on the home graph opens the explorer — the preview is an entry point, not a tool.
  - v7 Explorer "Around a topic or tag" replaces "Around an article" — owner wants topic/tag-centred
    exploration with names as leaves; needs BG-5.
  - v8 Explorer defaults link distance 130 / repel 360 — reduce clutter.
  - v9 Hover cards instead of always-on labels — labels collided with edges.
  - v10 Home graph made static (no zoom/pan) — accidental zoom when scrolling the page.
  - v11 One hover card only (removed native SVG tooltip), content = topics + title; subject line (≤150
    chars) planned later (BG-6).

### T-0005 · 2026-11-25 · done · Stack and deployment decision
- **Task:** Choose frontend stack and hosting.
- **Rationale:** Managed services chosen by the owner for low ops burden. Vercel (native tag
  revalidation, PR previews), Supabase (Auth + Postgres with pgvector, one vendor), Fly.io (always-on
  container; Cloud Run's scale-to-zero would kill background ingestion). Single backend machine because
  the job queue is in memory. See ADRs 0001, 0002, 0006.
- **Findings recorded:** BG-7 (Supabase `public` schema exposure), BG-8 (in-memory queue).

### T-0006 · 2026-11-25 · done · Telemetry approach
- **Task:** Error tracking/tracing choice.
- **Rationale:** Owner wants Sentry now and OpenTelemetry later with a config-only switch → adapter
  selected at startup, OTel API for spans, lint rule against direct Sentry imports. See ADR 0005.

### T-0007 · 2026-11-26 · done · TanStack scope
- **Task:** Decide whether to use TanStack libraries.
- **Rationale:** Next.js already handles routing and server caching; TanStack Query adds what Next
  lacks for browser-fetched data (polling running syncs, optimistic updates, cross-view invalidation,
  per-query caching of suggestions). Router/Start rejected (would replace the App Router / Next.js).
  See ADR 0001.

### T-0008 · 2026-11-26 · done · Component strategy (after consulting modern-web-guidance)
- **Task:** Build vs adopt a component library.
- **Rationale:** Guides (`dialog`, `position-aware-tooltips`, `switch`, `dark-mode`,
  `interest-triggered-action-previews`) recommend native `<dialog>`, popover + anchor positioning,
  switch checkbox and `color-scheme`; shadcn/ui assumes Tailwind and re-implements these in JS; MUI's
  look conflicts with the design. Own kit + React Aria for combobox/menu. See ADR 0004.
- **Note:** The skill's CLI needs Node (not installed); the bundled guide files (plugin v1.0.2) were
  read directly.

### T-0009 · 2026-11-26 · done · Set up the frontend project documentation
- **Task:** Create the repo structure in `knowledge-graph-fe`: README, CLAUDE.md, prototype copy,
  ADRs 0001–0007, spec sheets X01–X04 and F01–F11, backend gaps, release plan, this log.
- **Rationale:** Owner asked for specs per feature, a task log with rationale and a wave-based release
  plan before Wave 0. Specs were written against the real API (operations and schemas dumped from
  `apim/api-spec.yaml`, error shape from `GlobalExceptionHandler`/`ApiError`, ownership rule from
  `StudioPrincipal.canActOnBehalfOf` → 404).
- **Findings:** `/api/articles` returns `ArticleReference` without card fields (BG-2); `GET /api/tags`
  exists (prototype had assumed it didn't); `PUT /api/studio/authors/{slug}` exists but was not
  prototyped (F11); search `size` default is 0 (BG-12); overview has no `includeSuggestions` (BG-13).
- **Not done:** `git init` (first W0 task, so the initial commit can be reviewed); no code.

### T-0010 · 2026-11-26 · done · Enforce modern-web-guidance with a Claude Code hook
- **Task:** Project hook that blocks the first UI-file edit (`.tsx/.jsx/.css/.scss/.html`, excluding
  tests and `docs/`) in a Claude Code session until a modern-web-guidance guide has been retrieved
  (CLI `search`/`retrieve` or reading a bundled guide file).
- **Rationale:** Skills are model-invoked; a CLAUDE.md rule depends on the model remembering it. The
  owner wants it automatic. A hook is enforced by the harness, not by memory. Hooks cannot invoke a
  skill themselves, so the hook gates the edit and tells Claude what to load.
- **Alternatives rejected:** `UserPromptSubmit` reminder on every prompt (noisy, still advisory);
  per-pattern enforcement (not mechanically verifiable — the CLAUDE.md rule covers it).
- **Implementation:** `.claude/settings.json` (checked in), `.claude/hooks/mwg_gate.py` (Python 3 —
  Node isn't installed yet). Marker per session in the system temp dir.
- **Outcome:** Script tested with sample events: UI edit blocked without a marker; `.ts`, test and
  `docs/` files pass; a failed CLI run does not count; reading a guide unblocks that session only;
  malformed input never blocks. Takes effect in sessions started after this change.

### T-0011 · 2026-11-26 · done · Register sample content repositories in the local backend
- **Task:** Registered the owner's three GitHub repos (`knowledge-graph-blog-content`, `-meera`,
  `-anita`, path `docs`, branch `main`) via `POST /api/studio/sources` (local HTTP Basic admin) and
  synced them: 6 articles, 4 topics, 3 authors, all runs SUCCEEDED.
- **Rationale:** Owner asked to build against working APIs with real content instead of a mock API
  (an earlier plan for a mock API server from the prototype data was dropped).
- **Decisions:** Owner authors "Anita Rao" (named in the content) and "Meera" (surname unknown); the
  shared repo has no owner author, so the backend's fallback uses its display name "Platform Notes".
  All editable later via `PUT /api/studio/sources/{id}`.
- **Findings:** front-matter `summary` is cut at the first comma (BG-18); article bodies start with an
  h1 repeating the title; code blocks include Mermaid diagrams; images are served from
  `/api/assets/{repositoryId}/…`; trending is empty until views are recorded.

### T-0012 · 2026-11-26 · done · Owner authorises building all waves
- **Task:** Owner authorised starting all waves sequentially with decisions at Claude's discretion,
  building against the **current** backend (backend gaps handled by graceful fallbacks until a new
  backend version lands), env templates `.env.example`, `.env.nonprod`, `.env.prod`, and zod
  validation of every user input before use.
- **Rationale for interim fallbacks:** BG items are not built yet; each feature degrades to what the
  current API provides and is marked in code with `BG-n` so it can be upgraded later.

### T-0013 · 2026-11-26 · done · Backend bug fix for the frontend backlog (BG-21, BG-18, BG-12)
- **Task:** Owner asked for a backend bug-fix branch with a spec and implementation, built with the
  coding, architecture and engineering skills.
- **Done:** Backend branch `bugfix/studio-drafts-and-frontmatter-commas`. Spec
  `.claude/specs/bugfix-studio-drafts-and-frontmatter-commas.md`. Fixes:
  - BG-21: studio list shows every state.
  - BG-18: front-matter scalars keep their commas; stored values are repaired on resync.
  - BG-22 (new): unknown sort → 400, unknown path → 404.
  - BG-12: documented; it was not a bug.
  - Backend tests 320/0 failures. Checked manually against the local app.
  - Not committed.
- **Why this approach:** Root causes were fixed rather than worked around in the BFF.
  - The studio list needed its own editorial queries; the reader queries stay unchanged.
  - Repairing data needed a refresh path at an unchanged hash. A plain resync skips unchanged
    documents, and a new revision is impossible because of `UNIQUE (article_id, content_hash)`.
  - Rejected: a one-off SQL backfill. It would not keep graph, search and read model consistent.
- **Follow-ups:**
  - BG-23: a failed run leaves derived models stale.
  - FE: no code change is needed. The studio already renders the state badges, and drafts appear
    once the backend merges.
### T-0014 · 2026-11-27 · done · Local-graph hover card covers the graph (F06-FR-3)
- **Task:** Owner reported that hovering a node in the article sidebar graph shows a card that
  covers the whole component.
- **Cause:** The card (max 260px) was placed beside the node *inside* a ~280px panel with
  `overflow: hidden`, so it had nowhere else to go.
- **Fix:** The card is now in the top layer (`popover="manual"`), placed in viewport coordinates by
  the pure `placeHoverCard`. Beside the node in wide graphs; outside small graphs, level with the
  node. Hidden on scroll. The transition respects `prefers-reduced-motion`.
- **Rejected:**
  - `interestfor` + CSS anchor positioning: the triggers are SVG `<g>` nodes moved by the
    simulation, and anchor positioning has no Firefox support.
  - A portal to `<body>` with `position: fixed`: the top layer does the same without z-index fights.
- **Fallback:** Without Popover support (Baseline newly available) the card keeps the old in-graph
  placement; no polyfill, since the card is a decorative duplicate of the node's aria-label.
- **Verified:**
  - `pnpm check`: 53 unit tests, including 6 new placement tests.
  - E2E explorer and reader specs: 35/35.
  - Chromium at 1440×900 and 390×844: card/graph overlap 0 px².
  - Firefox and Safari not checked (no browsers installed).

### T-0015 · 2026-11-27 · done · Hover card prefers the right of the local graph (amends T-0014)
- **Task:** Owner asked for the card to appear to the right of the graph on desktops and monitors.
- **Change:** Outside placement order is now right → left → above → below.
- **Note:** The local graph is the rightmost column, so "right" fits only when the viewport has
  room. Verified: at 1920×1080 the card sits right of the graph; at 1440×900 there is about 117px
  free, so it falls back to the left.
- **Verified:** Unit tests 7/7 for placement.

---

## Wave 0 — Foundations (in progress)

### T-W0-10 · 2026-11-26 · done · Wave 0 foundations built
- **Done:** `git init` (branch `main`, nothing committed — commits need owner approval); Next.js
  16.4.6 scaffold (App Router, TS strict, pnpm, Turbopack, Cache Components + Partial Prefetching as
  scaffolded); generated API types + `pnpm api:check` drift check; zod-validated env
  (`src/lib/env/schema.ts`) with `.env.example`, `.env.nonprod`, `.env.prod`; typed backend client
  with timeouts, one retry for idempotent calls, `X-Request-Id` + `traceparent`, ApiError mapping;
  telemetry facade + Sentry adapter + pino logger + instrumentation hooks; proxy.ts (request ids,
  Supabase refresh, studio no-store/noindex); tokens generator + globals; header, theme toggle, toasts,
  state views; health/ready routes; ESLint guards (no Sentry outside adapter, no server client in
  components); Vitest (28 tests); GitHub Actions CI.
- **Decisions & rationale:**
  - *Read the bundled Next 16 docs first* (AGENTS.md warns APIs changed): middleware → `proxy`,
    async request APIs, `use cache` + `cacheTag` + `cacheLife`, `revalidateTag(tag, profile)`.
  - *Reader data in `use cache` functions; outages are thrown out of the cache and rendered at request
    time via `connection()`* so an outage is never cached or baked into the static shell.
  - *Theme stored in localStorage + pre-paint inline script, not a cookie* (spec X02-FR-3 changed):
    reading cookies in the root layout would make every page dynamic under Cache Components. Follows
    modern-web-guidance `dark-mode-toggle` (two-state toggle, meta color-scheme mapped back in CSS).
  - *Topic colours hashed from slug* — real topics are open-ended (Kubernetes, PostgreSQL…).
  - *Dev auth mode* (AUTH_MODE=dev, refused by zod outside local/test): persona cookie (HMAC) mapped
    to the backend's local Basic users so studio can be built/tested against the real API without a
    Supabase project.
  - *Article images via a rewrite of `/api/assets/**` only* — same-origin, backend host hidden.
  - *Content tags re-typed* over generated fields because the spec lacks discriminator mapping (BG-19);
    *Pageable serialised form-exploded* (BG-20).
  - *Sentry 11 uses `dataCollection`* (no PII, cookies, headers, query, bodies) — `sendDefaultPii`
    no longer exists.
- **Not done / follow-ups:** OTLP adapter (W6); provider accounts (owner); CI checkout of the backend
  repo needs a token if that repo is private.

### T-W1-01 · 2026-11-26 · done · Wave 1 — public reader
- **Done:** home (static hero graph → explorer, "Latest" feed with BFF "Show more", trending, topics
  top-12 + "See all"), article reader (typed block renderer, Shiki tokens, Mermaid, copy buttons,
  scrollspy TOC + mobile disclosure, CSS scroll-driven progress bar, byline, chips, backlinks,
  unresolved mentions, related, prev/next, 3 s view counter, reading mode, local graph), topic / tag /
  author pages and indexes, signed revalidation webhook, sitemap, robots, legacy path resolution, graph
  engine port (d3, typed, tooltip via textContent).
- **Verified:** against the real local backend with the sample repos; Playwright desktop suite 14/17
  passing before W3 (the 3 failures were the not-yet-built `/graph` route and two a11y issues, since
  fixed: avatar contrast, empty tooltip role); axe clean (light + dark) on home and article.
- **Decisions & rationale:**
  - *Compact post cards* (title, summary, author) — `ArticleReference` lacks date/reading time/topics/
    tags (BG-2); author links use slugs from `/api/navigation`, never guessed from names.
  - *Body h1 equal to the title is dropped; content headings start at h2* — one h1 per page.
  - *Shiki tokens as React spans, dual theme via CSS vars + light-dark()* — no HTML strings.
  - *Mermaid rendered client-side, lazily, securityLevel "strict"* — the one sanctioned
    `dangerouslySetInnerHTML` (mermaid's own sanitised SVG output); source kept in a disclosure.
  - *URL allow-list* for content links (http/https/mailto) and images (`/api/assets/**`, https).
  - *Topic colours: hashed hue in OKLCH* (8-slot palette collided with 4 real topics); trade-off
    documented in `topic-color.ts`. Avatars use a darker variant for 4.5:1 white text.
  - *input-switch-polyfill replaced by a minimal CSS fallback + explicit role="switch"* — the polyfill
    fetches CSS via `import.meta.resolve`, unsupported by bundlers; copying from node_modules is
    forbidden by the guidance.
  - *notFound() inside Suspense streams with 200 + noindex* (Next streaming constraint).
  - *Backend restarted* from its packaged jar (`--spring.profiles.active=local`) after it stopped
    mid-session; data persisted in the system Postgres.

### T-W2-01 · 2026-11-26 · done · Wave 2 — discovery
- **Done:** header search combobox with suggestions (React Aria + react-stately, 150 ms debounce,
  "/" shortcut, Enter → highlighted article or search), `/search` results (URL state, AI switch,
  interpretation chips, AI-unavailable notice, `<mark>` highlighting without HTML strings, "Why this
  result" with `<meter>`s, pager, empty state), link hovercards (interestfor + popover="hint", lazy
  preview via BFF, polyfill only where unsupported, hidden where anchor positioning is missing),
  local graph depth/suggested refetch (done in W1).
- **Verified:** Playwright desktop 26/27 (remaining failure = `/graph`, W3); axe clean on search.
- **Decisions & rationale:**
  - *Suggestion BFF responses cached for minutes per query* (`use cache`, outages thrown so they
    aren't cached); the query is never logged (length only, X03-FR-5).
  - *Combobox opens when results arrive* (React Aria won't reopen an empty collection by itself) and
    *our Enter handler runs before React Aria's* (with allowsCustomValue it commits the text and
    clears the highlight first).
  - *Shiki moved into a `use cache` function* — it reads the clock internally, which Cache Components
    only allows inside cached scopes; also caches highlighting per (code, language).
  - *Every uncached server-side backend call is preceded by `connection()`* (search, session,
    legacy redirect) — request-time only, never part of the static shell.

### T-W3-01 · 2026-11-26 · done · Wave 3 — graph explorer
- **Done:** `/graph` with whole-graph scope (node limit, topic filter, truncation banner, side card
  with summary via preview BFF, "Show its topics") and topic/tag scope (centre select, depth 1–2,
  include-tags switch, click a leaf to re-centre, "Browse articles"), find-a-note, arrows/labels
  switches, forces (defaults 130/360), zoom buttons, reset, URL state validated with zod, mobile panel
  toggle.
- **Verified:** Playwright explorer suite 8/8 + home→explorer test; axe clean; screenshots light/dark.
- **Decisions & rationale:**
  - *Interim taxonomy graph built in the BFF* (`lib/api/taxonomy-graph.ts`) from topic and tag read
    models, because BG-5 doesn't exist yet: one cached request per term, capped at 200 terms, same
    output shape as the proposed endpoint so the UI is unchanged when BG-5 lands.
  - *Suggested links toggle not offered in whole-graph scope* — `/api/graph/overview` has no
    `includeSuggestions` (BG-13); the local graph keeps it.
  - *Explorer canvas starts right of the settings panel* (fixes the prototype's "graph behind the
    panel" issue).
  - *E2E clicks target `circle.core` and run with reduced motion* — node groups' boxes include hidden
    labels, and moving nodes are never "stable" for Playwright.

### T-W4-01 · 2026-11-26 · done · Wave 4 — sign-in and studio core
- **Done:** `/signin` (Supabase GitHub/Google/magic link, or local dev personas), `/auth/callback`
  (PKCE exchange, validated `next`), `/auth/signout` (POST, same-origin), studio gate (session →
  `/api/studio/me` → pending screen or shell), studio shell with role-aware tabs, repositories
  (cards with token/webhook warnings, connect/edit drawer, Azure project rule, https API base URL,
  write-only secrets, webhook URL after connect, pause/activate, sync now), sync history (3 s polling
  while running, repository filter), run detail (summary, correlation id copy, pipeline, diagnostics
  with severity filter and help text). Studio BFF helper (`lib/api/studio.ts`): CSRF same-origin
  check on mutations, session required, zod body parsing, typed results.
- **Verified:** Playwright studio suite against the real backend in dev auth mode; axe clean on
  repositories.
- **Decisions & rationale:**
  - *Modal `<dialog>` drawer with a `cancel`-event discard guard* (modern-web-guidance dialog) —
    works where `closedby` is unsupported; message space reserved so buttons don't move.
  - *Studio segments export `instant = false`* — they read the session and redirect, so they can't be
    instant-navigation shells (Next 16 auth guide); needed on every page, not just the layout.
  - *No `sort` on studio article list requests* — a nested array inside the Pageable object didn't
    serialise (BG-20); sorted client-side. `call()` now logs exceptions instead of swallowing them.
  - *Shared zod schemas* for studio forms (client feedback) and BFF routes (authoritative).

### T-W5-01 · 2026-11-26 · done · Wave 5 — studio editorial and admin
- **Done:** studio articles (state filter, allowed transitions, inline confirm, optimistic updates,
  immediate public cache expiry), accounts (pending first, role switches, self-admin confirmation
  dialog, byline link/unlink with 409 handling), author profile (own byline or `/studio/authors/[slug]`
  for admins, preview, zod validation).
- **Verified:** full Playwright suite 60/60 (desktop + mobile) against the real backend; lint,
  typecheck, unit tests, API drift check and production build all green.
- **Findings / decisions:**
  - **BG-21 (backend bug):** `GET /api/studio/articles` omits DRAFT articles, so unpublished articles
    vanish from the studio and can't be re-published from the UI. The E2E test restores via the BFF.
  - *Studio actions expire tags with `{ expire: 0 }`* (read-your-writes); the ingestion webhook keeps
    `"max"` (stale-while-revalidate) — unpublish must disappear immediately, ingestion updates needn't.
  - *Accounts list is empty locally* — HTTP Basic users are service accounts; real accounts appear
    after Supabase sign-ins (owner action, W0 provider setup).
  - *E2E data hygiene:* the unpublish test restores the article in a `finally` block; an earlier
    failed run had left `kubernetes-networking` as DRAFT and it was restored via the API.

### T-W6-01 · 2026-11-26 · done · Wave 6 — hardening
- **Done:** OTLP telemetry adapter (server: `@vercel/otel` registered at startup, standard
  `OTEL_EXPORTER_OTLP_*` env; browser: errors beaconed to a validated same-origin intake route) —
  switching from Sentry is now a config change only (ADR 0005); Content-Security-Policy + HSTS (prod) +
  existing security headers; unit tests for security-critical code (URL allow-list, open-redirect
  guard, slug validation, studio schemas → 47 unit tests); runbooks (`docs/runbooks.md`); README,
  release-plan and spec updates for everything that changed during the build.
- **Verified:** full Playwright suite 60/60 with the CSP active (no violations), lint, typecheck, unit
  tests, API drift check, production build.
- **Decisions & rationale:**
  - *`script-src 'unsafe-inline'` kept in the CSP* — a nonce-based CSP would make every page dynamic
    (per-request nonces) and lose the static shell and tag caching (ADR 0001). All other directives are
    strict (no third-party scripts, no framing, no plugins, same-origin forms, explicit connect-src).
  - *OTLP adapter split into server and browser modules* so server-only code never enters the client
    bundle; browser errors carry only name, message, path and kind (no query strings, no user data).
  - *@vercel/otel + OTel peer packages added* — the Next.js-documented way to register OTel; it reads
    the standard OTLP env vars, so any collector (Grafana Cloud, Honeycomb, self-hosted) works.
- **Not done (needs the owner or the backend):** provider accounts and deployment (T-W0-08), backend
  prerequisites BG-7/BG-16/BG-17 (T-W0-09), the backend gaps that unlock richer UI (BG-2/3/4/5/13/14/21),
  real Supabase sign-in testing (needs a Supabase project), screen-reader smoke tests on VoiceOver/NVDA
  (manual), Core Web Vitals measured on staging.

### T-W0-01 · planned · Initialise repository and scaffold Next.js
- **Rationale:** Establish the baseline (App Router, TS strict, pnpm, Node LTS, ESLint/Prettier,
  `output: "standalone"`) before any feature. Needs Node + pnpm installed locally (not present on this
  machine as of 2026-11-26).

### T-W0-02 · planned · Generated API types and drift check (X01-FR-1)
- **Rationale:** Contract errors become compile errors; CI blocks silent drift (ADR 0007).

### T-W0-03 · planned · Typed server client and BFF result mapping (X01-FR-2…8)
- **Rationale:** One place for auth headers, correlation ids, timeouts, retries and `ApiError` mapping.

### T-W0-04 · planned · Telemetry adapter, logging, health/ready routes (X03)
- **Rationale:** Observability from the first deploy; config-selected exporter per ADR 0005.

### T-W0-05 · planned · Tokens, theme without flash, kit primitives (X02-FR-1…4, FR-8 subset)
- **Rationale:** Every later page depends on tokens and primitives; theme cookie avoids flash.

### T-W0-06 · planned · Route skeleton, not-found and loading states (X04)
- **Rationale:** Fix URL structure and caching boundaries early; later waves fill pages in.

### T-W0-07 · planned · CI pipeline (lint, typecheck, test, build, drift, Playwright smoke)
- **Rationale:** Enforce the definition of done automatically from the start.

### T-W0-08 · planned · Provider accounts and projects (owner action)
- **Rationale:** Vercel, Supabase (asymmetric JWT keys), Fly.io and Sentry accounts must be created by
  the owner; Claude does not create accounts.

### T-W0-09 · planned · Backend prerequisites BG-7, BG-16, BG-17 (backend repo)
- **Rationale:** Staging cannot be safely deployed with the schema in `public`, and the backend needs a
  container image and verified JWKS before auth work in W4.
