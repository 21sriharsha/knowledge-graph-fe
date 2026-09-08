# Frontend Specification

## 1. Product experience

The frontend exposes three connected modes:

1. **Read** — distraction-free article reading.
2. **Discover** — search, topics, authors and related content.
3. **Explore** — interactive knowledge graph.

The intended loop is:

`Search → Graph → Article → discover concepts → Graph`

The product should feel closer to a minimalist technical publishing platform combined with an Obsidian/Wikipedia-like knowledge neighborhood than a conventional blog.

## 2. Technical stack

- Next.js + TypeScript
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
- `/blog/[slug]`
- `/author/[slug]`
- `/topic/[slug]`
- `/search`
- `/graph`
- `/graph/[nodeId]`

### Author portal

- `/studio`
- `/studio/articles`
- `/studio/articles/new`
- `/studio/articles/[id]`
- `/studio/sources`
- `/studio/sources/new`
- `/studio/sources/[id]`
- `/studio/ingestion/[id]`

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

Search response should distinguish:

- articles
- authors
- topics/concepts where applicable
- graph context when available

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

## 8. Author portal

### Article creation

The editor should support the canonical Markdown representation.

Required capabilities:

- title/frontmatter metadata
- Markdown editing
- preview
- tags/topics
- internal-link syntax
- validation
- publish/update

Internal links should support:

`[[Article Title]]`

and optionally:

`[[Article Title|display text]]`

The web editor must produce content semantically equivalent to Git-ingested Markdown.

### Source management

Authors can register supported source providers:

- GitHub
- GitLab
- Bitbucket
- Azure DevOps

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

Example states:

`PENDING → RUNNING → COMPLETED`

Failure state:

`RUNNING → FAILED`

Retry should be exposed only when backend policy permits it.

## 10. API boundary

Frontend depends on backend REST contracts, preferably generated/documented through OpenAPI.

Representative endpoints:

- `GET /api/articles/{slug}`
- `GET /api/authors/{slug}`
- `GET /api/topics/{slug}`
- `GET /api/search`
- `GET /api/graph`
- `GET /api/graph/{nodeId}`
- `POST /api/studio/articles`
- `PUT /api/studio/articles/{id}`
- `GET /api/studio/sources`
- `POST /api/studio/sources`
- `GET /api/studio/ingestions/{id}`

Exact DTOs belong to the backend API specification.

## 11. Caching and freshness

The frontend should treat backend read models as optimized representations.

Avoid client-side caching that fights server freshness.

After ingestion, backend cache invalidation/read-model regeneration determines when SSR sees the new representation.

Where Next.js caching/revalidation is used, it must align with backend freshness semantics rather than becoming a second source of truth.

## 12. Accessibility

- Keyboard navigation for all interactive controls.
- Graph must have an accessible alternative to visual exploration.
- Search results must be usable without a pointer.
- Semantic headings and landmarks.
- Focus management for dialogs and navigation.
- Do not communicate graph meaning through color alone.

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
