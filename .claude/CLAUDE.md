# CLAUDE.md — Frontend

## Mission

Implement the Next.js frontend for the knowledge publishing platform.

## Rules

1. Use TypeScript.
2. Prefer Server Components.
3. Use Client Components only for genuine interactivity.
4. Public/read pages are SSR-first.
5. Never access PostgreSQL or backend internals directly.
6. Treat Spring Boot REST/OpenAPI contracts as the backend boundary.
7. Do not duplicate backend business logic in the frontend.
8. Do not call an LLM directly from the browser.
9. Search UI sends user intent to the backend; query understanding is backend-owned.
10. Graph rendering uses React Flow initially and must consume bounded backend graph data.
11. Keep graph semantics explicit: author links, tags/topics, and inferred relationships are distinct.
12. Do not introduce a client-side global state solution unless a concrete cross-page requirement exists.
13. Keep components small and domain-oriented.
14. Accessibility is mandatory, not a later cleanup.
15. Avoid N+1 data fetching.
16. Prefer backend read models over assembling pages from many endpoints.
17. Keep public and studio/author concerns separated.
18. Do not add Redis, Elasticsearch, GraphQL, or client-side databases unless an explicit architecture change is approved.
19. Add tests for important rendering, search, graph, and author workflows.
20. Keep visual design minimalist, technical, and discovery-oriented.

## Architecture preference

`Route → Server Component → Backend read model → Render`

Interactive island:

`Server Component → Client Component → backend API`

## Search principle

`User query → backend Search API → backend query understanding/retrieval → SearchResponse`

The frontend never decides whether a query is lexical, semantic, author-based, or SLM-powered.

## Graph principle

The graph is a navigation mechanism. Clicking a node should provide a clear path to the corresponding article/concept.

## Definition of done

- Type-safe
- Accessible
- SSR-first
- No unnecessary client JS
- No backend logic duplicated
- Tests for changed behavior
- Loading/error/empty states included
