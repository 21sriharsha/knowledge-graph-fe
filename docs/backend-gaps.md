# Backend gaps

Changes in `../knowledge-graph-be` that frontend specs depend on. Each gap names the spec that needs
it and the wave by which it is needed. Raise them as backend issues/PRs; update status here.

Status: `open` · `agreed` · `in-progress` · `done` · `dropped`

| ID | Gap | Needed by | Wave | Status |
|---|---|---|---|---|
| BG-1 | Cache-invalidation ingestion step calls the frontend `POST /api/revalidate` (HMAC-signed) with affected tags: `article:{slug}`, `topic:{slug}`, `tag:{slug}`, `author:{slug}`, `articles`, `navigation`, `graph` | X04 | W1 | open |
| BG-2 | `ArticleReference` (used by `/api/articles`, topic/tag/author read models) lacks fields for cards: author slug + avatar, `publishedAt`, `readingTimeMinutes`, topics (`TaxonomyReference[]`), tags, link count. Add them or add an `ArticleCard` schema | F02, F04 | W1 | open |
| BG-3 | `TrendingArticle` has `topic` only; add `tags: string[]` (and ideally `topics[]`) | F02 | W1 | open |
| BG-4 | `GraphNode` has a single `topic`; add `topics: string[]` | F06 | W2 | open |
| BG-5 | New `GET /api/graph/taxonomy?term=topic:{slug}\|tag:{slug}&depth=1..2&includeTags=` returning a co-occurrence tree: nodes `{id, kind, slug, name, topic?, count, distance}`, edges weighted by shared articles, `truncated` | F06 | W3 | open — interim BFF composition in `src/lib/api/taxonomy-graph.ts` |
| BG-6 | Optional article `subject` (≤150 chars) in front matter → validation diagnostic when too long → stored → exposed on `GraphNode`, `ArticleReference` and previews | F03, F06 | post-GA | open |
| BG-7 | Move Liquibase schema out of `public` (Supabase exposes `public` via its Data API); exclude the new schema from the Data API | Deploy | W0 | open |
| BG-8 | Persist the job queue (currently `InMemoryJobQueueImpl`) so deploys/restarts don't drop ingestion and >1 instance is possible | Ops | W6 | open |
| BG-9 | Document `ApiError` (400/404/409/500) responses in `api-spec.yaml` | X01 | W1 | open |
| BG-10 | Optional lightweight preview endpoint (title, summary, author, reading time, topics) for link hover cards instead of the full read model | F03 | W2 (optional) | open |
| BG-11 | Paging for topic/tag/author read models when lists grow large | F04 | post-GA | open |
| BG-12 | `GET /api/search` `size` defaults to `0` in the spec; set a sensible default (e.g. 10) | F05 | W2 | not a bug — `size` 0/absent means the default (20, max 50); now documented on `bugfix/studio-drafts-and-frontmatter-commas` (backend spec `.claude/specs/bugfix-studio-drafts-and-frontmatter-commas.md`). Needs spec regeneration after merge |
| BG-13 | `GET /api/graph/overview` has no `includeSuggestions` parameter; add it or confirm suggestions are only for neighbourhoods | F06 | W3 | open |
| BG-14 | `GET /api/studio/articles`: server-side `state` filter; author display name on `ArticleResponse` | F07 | W5 | open |
| BG-15 | Per-step pipeline status/timing on `IngestionRunResponse` | F09 | post-GA | open |
| BG-16 | Deployment assets: Dockerfile (JRE 21), `fly.toml`, health/readiness endpoints exposed, env documentation | Deploy | W0 | open |
| BG-18 | Front-matter `summary` (and possibly other scalar values) is truncated at the first comma, e.g. "Combining lexical and semantic retrieval, and why…" is stored as "Combining lexical and semantic retrieval". Likely the comma-list parsing used for `topics`/`tags` is applied to every key | F02, F03, F05 | W1 | fixed on `bugfix/studio-drafts-and-frontmatter-commas` (backend spec `.claude/specs/bugfix-studio-drafts-and-frontmatter-commas.md`) (D2); existing values are repaired by resyncing each source after deploy |
| BG-19 | Polymorphic content schemas (`ContentBlock`, `InlineContent`) have no `discriminator.mapping`; generated types use schema names ("Heading", "TextRun") but the API sends Jackson subtype names ("heading", "text", "internalLink", …). Interim: `src/lib/content/types.ts` re-tags the generated types | X01, F03 | W1 | open |
| BG-20 | `Pageable` is declared as a single object query param (`pageable`) instead of `page`, `size`, `sort`. Interim: client serialises objects form-exploded | X01 | W1 | open |
| BG-21 | `GET /api/studio/articles` omits DRAFT articles even for admins (totalElements excludes them; `GET /api/studio/articles/{slug}` still returns the draft). Unpublished articles therefore disappear from the studio list and can't be re-published from the UI. Expected: all states, filtered by ownership | F07 | W5 | fixed on `bugfix/studio-drafts-and-frontmatter-commas` (backend spec `.claude/specs/bugfix-studio-drafts-and-frontmatter-commas.md`) (D1): all states, ownership-scoped, newest `updatedAt` first |
| BG-17 | Confirm Supabase JWKS works with `OIDC_ISSUER_URI` / `OIDC_JWK_SET_URI` (asymmetric signing keys) end to end | F01 | W0 | open |
| BG-22 | Caller errors answered as 500: unknown `sort` property (→ 400 `INVALID_REQUEST`) and unmapped path (→ 404 `NOT_FOUND`) | X01 | W1 | fixed on `bugfix/studio-drafts-and-frontmatter-commas` (backend spec `.claude/specs/bugfix-studio-drafts-and-frontmatter-commas.md`) (D3, D5) |
| BG-23 | An ingestion run that fails after `persist-content` leaves graph/search/read model stale, and later resyncs skip the document as unchanged, so nothing heals it. Needs a "needs rematerialisation" marker or an admin force action | F09, Ops | post-GA | open (found while verifying BG-18) |
