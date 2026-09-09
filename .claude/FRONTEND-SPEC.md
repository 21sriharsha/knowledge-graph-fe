# Frontend Specification

## 1. Product experience

The frontend exposes three connected modes:

1. **Read** — distraction-free article reading.
2. **Discover** — search, topics, authors and related content.
3. **Explore** — interactive knowledge graph.

The intended loop is:

`Search → Graph → Article → discover concepts → Graph`

The product should feel closer to a minimalist technical publishing platform combined with an Obsidian/Wikipedia-like knowledge neighborhood than a conventional blog.

## 1a. Golden rule for every UI decision

**The experience must be logical and immediately legible to a human.**

There is no Figma for v1. Where this document does not dictate a design, resolve it against this rule
and nothing else:

- **Fewer clicks and fewer searches is better.** If the backend already returned the data, show it —
  do not put it behind a tab, an accordion, or a "load more".
- **The user should not have to guess.** A screen that returns nothing must say *why*. A ranked result
  should say *what matched*. A broken link should look broken.
- **No decorative motion.** Animation is permitted only where it communicates state (something is
  loading, something changed). No fade-ins, no scroll reveals, no easing for its own sake.
- **Reading is the product.** Typography, contrast and line length matter more than chrome.

When a design choice cannot be resolved by this rule, prefer the option that a first-time visitor
would understand without explanation.

## 2. Technical stack

- Next.js 16 (App Router) + TypeScript
- App Router
- Server Components by default
- SSR for public/read-heavy pages
- Client Components only where interaction requires them
- Tailwind CSS
- shadcn/ui
- React Flow for initial graph visualization
- REST API integration with Spring Boot
- No frontend-owned persistence
- No direct database access

## 3. Rendering policy

### Server-rendered by default

Public pages should be SSR:

- home
- article
- author
- topic
- search result shell
- graph entry pages where practical

### Client-side islands

Use client components for:

- graph interactions
- search input enhancements
- filters
- interactive navigation
- author editing
- Markdown editor/preview
- Git connection flows

Do not turn entire pages into client components merely because one child is interactive.

## 4. Route model

### Public

- `/`
- `/articles`
- `/articles/[slug]`
- `/authors/[slug]`
- `/topics`
- `/topics/[slug]`
- `/tags/[slug]`
- `/search`
- `/graph`
- `/graph/[nodeId]`

**Amended from the original `/blog`, `/author`, `/topic` forms.** The backend materializes a route
table and exposes `GET /api/routes/resolve?path=…`, which answers "what lives at this URL". That is
only useful if the frontend's paths *are* the paths the backend registered — otherwise the two hold
different opinions about the same content and every resolution misses. The backend registers
`/articles/{slug}`, `/authors/{slug}`, `/topics/{slug}` and `/tags/{slug}`, so those are the routes.

`/articles` (the archive) and `/topics` (the browse index) are additions: the backend serves paged
listings and taxonomy indexes with per-term counts, and the golden rule says show what exists rather
than make the reader search for it.

### Author portal

- `/studio`
- `/studio/sources`
- `/studio/sources/new`
- `/studio/sources/[id]`
- `/studio/articles`
- `/studio/ingestions/[id]`

Authentication details are implementation-dependent but must preserve separation between public and author operations.

## 5. Article reader

The article page must receive an `ArticleReadModel` from the backend.

Expected data:

- title
- excerpt/description
- rendered Markdown representation
- author
- publication date
- updated date
- tags/topics
- canonical URL
- related articles
- graph context
- breadcrumbs/navigation where available

The frontend must not reconstruct relationships by issuing many individual requests.

## 6. Search UX

A single search surface supports:

- topic-based discovery
- author-based discovery
- combined author + topic queries
- natural-language queries

Examples:

- `distributed systems`
- `What has Harsh written about Kubernetes?`
- `Show me articles by Harsh about Kubernetes networking`

The SLM is backend-owned. The frontend treats search as a normal API.

### What the backend actually returns

`SearchResponse` carries article hits only — there are no separate author or topic result types in
v1. Author and topic are *filters* applied to article retrieval, not result kinds. Amended from the
original wording accordingly.

Two fields on the response exist specifically to serve the golden rule and **must** be surfaced:

- **`interpretation`** — how the query was read (`queryText`, `author`, `topics`, `tags`,
  `authorResolved`). Render it as a plain sentence above the results. When `authorResolved` is false
  after an author was named, say so explicitly: an empty result set must explain itself rather than
  look like a broken search. This is what stops the user searching a second time to find out why.
- **`explanation`** on each hit — the weighted contributions (`lexical`, `semantic`, `authorMatch`,
  `topicMatch`, `tagMatch`, `recency`) plus `matchedBy`. Surface it as *words* ("matched title and
  tags"), never as a raw score. A number tells a human nothing.

`mode` (`LEXICAL` / `SEMANTIC` / `HYBRID`) and `usedQueryUnderstanding` are also returned and may be
shown as secondary detail.

The UI should make it easy to transition from result → article or result → graph.

## 7. Graph experience

The graph is a first-class discovery surface.

Node types initially:

- Article/concept
- Topic/tag may be represented as a cluster/context rather than necessarily a canonical article node

Edge semantics:

- explicit Markdown internal link
- tag/topic relationship
- AI/platform-suggested relationship

The UI should visually distinguish authoritative explicit links from inferred relationships.

Initial graph interactions:

- pan
- zoom
- select node
- open article
- focus neighborhood
- expand selected node
- return to previous context

Do not attempt to render an unbounded graph. Backend responses should be neighborhood-oriented.

### How the graph reads

One canvas component serves the landing page, the article page and the explorer, so the picture
means the same thing everywhere:

- **Colour is topic**, from `GraphNode.topic`, assigned by hashing the topic name so it is stable
  across pages and restarts. Never the only carrier of meaning — every node is labelled and the
  legend names each topic in text (§12).
- **Size is degree**, bounded, so hubs are visible without one article swallowing the canvas.
- **Line style is provenance**: solid for a link an author wrote, dashed for one the platform
  inferred.
- **One line per pair.** The API's edges are directed and reciprocal links are common — an author
  cites another article and is cited back. Drawn literally that is two curves between the same two
  circles, reading as two relationships rather than one mutual one, so the canvas collapses them;
  where a pair has both an authored and an inferred edge, the authored one wins. For the same
  reason a "connections" count is distinct neighbours, never edges.
- **Layout is deterministic.** A radial layout around the focused article, or a seeded
  force-directed layout for the whole-graph view. Returning to an article must not rearrange the
  reader's mental map.

The explorer's **View** filters (all / linked only / same topic / by topic) run in the browser over
the neighbourhood already fetched — narrowing the view is a glance, not a page load. **Focus**
changes are real navigations with real URLs, because they change which neighbourhood is being shown.

`/graph` with no `?slug=` opens on the overview sample rather than a list of entry points: an
explorer whose first screen is a menu makes the reader do the exploring before they can explore.

### The landing page

Graph-forward, with search directly under the title and three panels below it — Latest, Most
connected, Topics — carrying real content rather than acting as signposts.

**There is no "trending".** The platform does not track views, so a popularity ranking would mean
inventing a number. "Most connected" ranks by inbound and outbound links, which is a real property
of the corpus and is what the graph is about anyway.

## 8. Author portal

### Article authoring — deferred past v1

**Amended.** The backend exposes no `POST`/`PUT` article endpoints. Content enters the platform
through Git: an author commits Markdown, a webhook fires, the ingestion pipeline materializes it.
That is the author journey the North Star describes (§19), and a second write path would mean two
sources of truth for the same article and an obvious way for them to diverge.

Studio in v1 is therefore **operational, not editorial**:

- connect and configure source repositories
- trigger a synchronization
- read ingestion runs and their diagnostics
- control publication state (publish / unpublish / archive)

A web editor writing canonical Markdown remains the intended direction, but it needs backend write
endpoints first and is out of scope here. The `[[Article Title]]` / `[[Article Title|display text]]`
syntax is already fully supported on the ingestion side.

### Source management

Providers are **driven by the backend's `SourceType` enum**, never hardcoded in the UI:

- GitHub
- GitLab
- Azure DevOps

Bitbucket is named in earlier drafts but is not implemented backend-side; offering it would be a
form that cannot succeed. Adding a provider is a backend strategy plus adapter, after which it
appears here without a frontend change.

Azure DevOps additionally requires a `project`; the form must ask for it only for that provider,
because the backend rejects the connection otherwise.

The UI must not expose provider-specific internal models. It presents a normalized source configuration.

## 9. Ingestion status

Authors should be able to see:

- source
- repository
- revision
- ingestion state
- start/end time
- error state
- affected files where appropriate

Real states, amended to match the backend:

`RUNNING → SUCCEEDED | PARTIALLY_SUCCEEDED | FAILED`

`PARTIALLY_SUCCEEDED` matters and must not be collapsed into failure: one malformed file among two
hundred is a partial success, and an author needs to see that at a glance.

A run reports `documentsTotal / documentsSucceeded / documentsSkipped / documentsFailed`. **Skipped
is a healthy outcome** — the content was already current — and must not be styled as a problem.

Each run carries structured **diagnostics** (`severity`, `code`, `sourcePath`, `message`), with codes
including `UNRESOLVED_LINK`, `MISSING_TITLE`, `RAW_HTML_DROPPED`, `PARSE_FAILED`, `PROVIDER_ERROR`.
This screen is the answer to "why did my article not appear", so diagnostics are the primary content
of the run view, not a footnote. Group by severity; show the source path against each.

Re-running is exposed as "sync now" on the repository rather than a per-run retry: ingestion is
idempotent, so a fresh sync is the safe and honest way to retry.

## 10. API boundary

Frontend depends on backend REST contracts, preferably generated/documented through OpenAPI.

The live document is served at `/v3/api-docs` and is the authoritative DTO reference.

Public (anonymous):

- `GET /api/articles` — paged archive
- `GET /api/articles/{slug}` — the complete `ArticleReadModel`
- `GET /api/authors`, `GET /api/authors/{slug}`, `GET /api/authors/{slug}/page`
- `GET /api/topics`, `GET /api/topics/{slug}`
- `GET /api/tags`, `GET /api/tags/{slug}`
- `GET /api/search?q=&page=&size=&understand=`
- `GET /api/graph?slug=&depth=&includeSuggestions=`
- `GET /api/graph/{nodeId}`
- `GET /api/graph/overview?maxNodes=` — a bounded sample of the whole graph, for the landing page
  and the graph explorer's entry view
- `GET /api/navigation`
- `GET /api/routes/resolve?path=`

Studio (HTTP Basic, `AUTHOR` role):

- `GET|POST /api/studio/sources`, `GET|PUT /api/studio/sources/{id}`
- `POST|DELETE /api/studio/sources/{id}/activate`
- `POST /api/studio/sources/{id}/sync`
- `GET /api/studio/ingestions`, `GET /api/studio/ingestions/{id}`
- `GET /api/studio/ingestions/pipeline`
- `GET /api/studio/articles`, `GET /api/studio/articles/{slug}`
- `POST /api/studio/articles/{slug}/publish|unpublish|archive`
- `PUT /api/studio/authors/{slug}`

**Studio credentials never reach the browser.** Basic auth is applied server-side in Next.js route
handlers or Server Actions; the browser talks to the Next.js origin, never directly to Spring with
credentials attached.

Errors share one shape (`ApiError`: `timestamp`, `status`, `code`, `message`, `path`, `violations`).
Branch on `code`, not on prose.

## 11. Caching and freshness

The frontend should treat backend read models as optimized representations.

Avoid client-side caching that fights server freshness.

After ingestion, backend cache invalidation/read-model regeneration determines when SSR sees the new representation.

Where Next.js caching/revalidation is used, it must align with backend freshness semantics rather than becoming a second source of truth.

In Next.js 16 `fetch` is **uncached by default**, which is the behaviour this platform wants: the
backend already runs a Caffeine cache in front of persisted read models and invalidates it precisely
on ingestion. A second cache in the frontend would only add a window in which the two disagree, with
no owner. Do not add `use cache` to public content routes without a measured reason.

## 12. Accessibility

- Keyboard navigation for all interactive controls.
- Graph must have an accessible alternative to visual exploration.
- Search results must be usable without a pointer.
- Semantic headings and landmarks.
- Focus management for dialogs and navigation.
- Do not communicate graph meaning through color alone.

### Theme

Light and dark are both first-class; the reading surface is the whole page, so getting this wrong is
not cosmetic.

Dark mode is **class-based** — a `.dark` class on `<html>`, set by a blocking inline script in the
document head before first paint, from the reader's stored choice and otherwise the operating
system. The header exposes a three-state control: light, dark, follow the system.

A `prefers-color-scheme` media query is the wrong tool here and was tried first. It can swap the
design tokens, but Tailwind's dark variant is `&:is(.dark *)`, so every `dark:` utility inside the
shadcn components stays inert — the result is a half-dark page with dark surfaces and light inputs.
Driving one class makes tokens and utilities agree, and is also what lets an explicit choice
override the system.

Consequences worth keeping: define every colour on bare `:root` and redefine it under `.dark`, never
only inside a media query; anything that cannot be a CSS custom property (the React Flow canvas
draws some chrome through inline styles) reads the class instead.

## 13. Error and empty states

Every public data surface must define:

- loading state
- empty state
- not found
- backend failure
- partial data where applicable

Author surfaces additionally need:

- validation failure
- authentication/authorization failure
- ingestion failure

## 14. Performance goals

Primary objective: fast SSR for read-heavy public pages.

Avoid:

- N+1 API calls from page rendering
- large graph payloads
- unnecessary client JavaScript
- client-side reconstruction of read models

Prefer:

- one read-model request per public page
- server components
- small interactive islands
- paginated/limited search
- bounded graph neighborhoods

## 15. Non-goals for v1

- Fully client-rendered application
- Offline-first authoring
- Native mobile application
- Infinite/unbounded graph
- Browser-side vector search
- Frontend-side LLM calls
