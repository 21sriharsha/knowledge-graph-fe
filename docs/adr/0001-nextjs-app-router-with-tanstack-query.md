# 0001 — Next.js App Router with TanStack Query for client data

Status: accepted · 2026-11-26

## Context
The product is mostly a public reader (SEO, fast first paint, content that changes only when authors
push to Git) plus a smaller authenticated studio (mutations, polling, interactive lists). The backend
already invalidates caches when ingestion finishes.

## Decision
- Next.js App Router, TypeScript strict, pnpm, current Node LTS.
- Reader pages are **server components**, statically cached and revalidated on demand by tag.
- **TanStack Query** is used only for data fetched in the browser: studio, search suggestions, graph
  explorer refetches, link-preview cache.
- Rule: a piece of data is owned by exactly one of the two. Studio pages that render on the server
  first pre-load their data into Query (`HydrationBoundary`) to avoid a second request.
- Not adopted: TanStack Router (would replace the App Router), TanStack Start (would replace Next.js).
  TanStack Table may be added later if studio lists need client sorting/filtering/bulk select.

## Consequences
- Reader pages ship little JavaScript and are served from cache.
- Studio gets polling (`refetchInterval` while a sync run is `RUNNING`), optimistic updates with
  rollback, and invalidation across views.
- Two data paths to understand; the ownership rule keeps them from overlapping.

## Alternatives considered
- **TanStack Start**: strong type-safe routing, but no built-in equivalent of tag-based ISR; would need
  hand-built CDN caching. Revisit if the studio becomes the main product.
- **Next.js only (server actions + `useOptimistic`)**: workable for simple mutations, weak for polling
  and cross-view invalidation.
