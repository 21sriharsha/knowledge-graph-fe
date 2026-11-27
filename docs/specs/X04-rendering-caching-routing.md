# X04 — Rendering, caching and routing

Status: draft · Wave: W0 (routing skeleton), W1 (caching + revalidation)

## Summary
Public pages are server-rendered and cached by tag; the backend tells the frontend what changed after
ingestion. URLs are clean and stable; legacy paths resolve through the backend.

## Routes
| URL | Page | Rendering |
|---|---|---|
| `/` | Home (F02) | cached, tags `articles`, `navigation`, `graph` |
| `/articles/[slug]` | Article (F03) | cached, tags `article:{slug}`, `graph` |
| `/topics/[slug]` | Topic (F04) | cached, tag `topic:{slug}` |
| `/tags/[slug]` | Tag (F04) | cached, tag `tag:{slug}` |
| `/authors/[slug]` | Author (F04) | cached, tag `author:{slug}` |
| `/search` | Search (F05) | dynamic (query-driven), not cached |
| `/graph` | Explorer (F06) | shell cached; data fetched client-side |
| `/signin`, `/auth/callback` | F01 | dynamic |
| `/studio/**` | Studio (F07–F11) | dynamic, never cached, `noindex` |

Breadcrumb paths from the backend (`/articles/{slug}`, `/topics/{slug}`) already match these URLs.

## Functional requirements
- X04-FR-1 Reader fetches use Next.js data cache with tags listed above and a safety
  `revalidate` of 1 hour.
- X04-FR-2 `POST /api/revalidate` accepts `{ tags: string[] }` signed with HMAC-SHA256
  (`X-Signature` over the raw body, secret `REVALIDATE_SECRET`, timestamp header with 5-minute
  replay window). Valid → `revalidateTag` for each tag, 202; invalid → 401, nothing revalidated.
- X04-FR-3 The backend's cache-invalidation ingestion step calls this endpoint with the slugs, topics,
  tags and authors affected (BG-1). Until then, the 1-hour safety revalidation applies.
- X04-FR-4 Studio publish/unpublish/archive also revalidates `article:{slug}`, `articles` and `graph`
  directly from the server action (no wait for the backend).
- X04-FR-5 Unknown slug → backend 404 → Next.js `notFound()`; the not-found page offers search.
- X04-FR-6 Legacy/unknown paths: middleware-free fallback in `not-found` calls
  `GET /api/routes/resolve?path=` and issues a 308 redirect to the canonical URL when a target is
  returned (`ARTICLE|AUTHOR|TOPIC|TAG`).
- X04-FR-7 Metadata: per-page `<title>`, description (article summary), canonical URL, Open Graph;
  studio and auth pages are `noindex`. `sitemap.xml` from `GET /api/articles` (paged) and
  `robots.txt`.
- X04-FR-8 Article images (`ImageReference.url`, served by `GET /api/assets/{repositoryId}/**`) go through
  a BFF image route or `next/image` with the backend host in `remotePatterns`; decision in W1 (open
  question 1).
- X04-FR-9 Loading UI: route-level `loading.tsx` skeletons matching the prototype's skeletons.

## Acceptance criteria
- X04-AC-1 Given an article is cached, when a valid revalidate call names `article:{slug}`, then the
  next request renders fresh content.
- X04-AC-2 Given an invalid signature or a timestamp older than 5 minutes, then 401 and no cache change.
- X04-AC-3 Given `/articles/does-not-exist`, then a 404 page with a search box is shown.
- X04-AC-4 Given a path the backend resolves to an article, then the browser is redirected (308) to
  `/articles/{slug}`.
- X04-AC-5 Given any `/studio` page, then the response has `Cache-Control: private, no-store` and
  `X-Robots-Tag: noindex`.

## Performance budget
- Cached reader page TTFB < 200 ms p75 at the edge; LCP < 2.5 s p75 on 4G mid-range mobile.

## Open questions / backend gaps
1. Images: proxy through the BFF (hides backend host, adds hop) or allow the backend host in
   `next/image`? Recommendation: proxy with long-lived caching headers.
2. BG-1: revalidation callback from the backend.
