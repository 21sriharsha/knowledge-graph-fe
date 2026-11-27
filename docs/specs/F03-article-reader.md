# F03 — Article reader

Status: draft · Wave: W1 (core reading), W2 (link previews, local graph) · Prototype: `#a-<slug>`

## Summary
A Medium-style reading page rendered from the backend's typed content blocks, with Obsidian-style
connections: backlinks, unresolved mentions, related articles, previous/next and a local graph.

## Personas and access
Public. `GET /api/articles/{slug}` returns only published articles.

## User stories
- As a reader, I can read comfortably, see where I am, and jump between sections.
- As a reader, I can preview a linked article without leaving the page.
- As a reader, I can see what links here and what is mentioned but not written yet.

## Functional requirements
### Content
- F03-FR-1 Render `body: ContentBlock[]` with exhaustive renderers: `heading` (anchor ids from
  `anchorId`), `paragraph`, `code` (Shiki highlighting on the server, language label, copy button),
  `quote`, `list` (ordered, `startNumber`), `table` (header, rows, cell `alignment`), `thematicBreak`.
- F03-FR-2 Inline: `text`, `styled` (EMPHASIS → `<em>`, STRONG → `<strong>`), `code`, `externalLink`
  (opens in same tab, `rel="noopener"`; marked external), `internalLink` (resolved → link to
  `/articles/{targetSlug}`; unresolved → non-link text with dashed underline and a tooltip "Not
  written yet"), `image` (alt text required, lazy, served per X04-FR-8), `break` (hard/soft).
- F03-FR-3 Unknown block/inline types (future backend versions) render nothing visible and log a WARN
  once per type; the type checker forces handling known types.
- F03-FR-4 No HTML string injection anywhere in content rendering. (Sole exception: Mermaid's own
  sanitised SVG output, `securityLevel: "strict"`.)
- F03-FR-12 Code blocks with language `mermaid` render as diagrams client-side (lazy-loaded), with
  the source kept in a disclosure and shown if rendering fails. *(Added 2026-11-26: real content uses
  Mermaid.)*
- F03-FR-13 The body's first heading is dropped when it repeats the title (the backend includes the
  title as an h1); remaining content headings start at h2.

### Page
- F03-FR-5 Header: breadcrumbs, title, summary, byline (avatar, author link, published date, updated
  date when different, reading time), topic and tag chips (all), actions: copy link, open in graph
  (`/graph?focus=topic:{primaryTopic}`), reading-mode toggle (light theme only, X02).
- F03-FR-6 Table of contents from `outline` (h2–h3), sticky on desktop, highlights the current section
  while scrolling; hidden on mobile behind an "On this page" disclosure.
- F03-FR-7 Reading progress bar at the top of the viewport.
- F03-FR-8 After content: "Linked from N articles" (`backlinks`), "Mentioned but not written yet"
  (`unresolvedReferences`), related articles (`relatedArticles`), previous/next (`previousArticle`,
  `nextArticle`).
- F03-FR-9 View counting: one fire-and-forget `POST /api/articles/{slug}/view` per page view after the
  page has been visible for 3 s (avoid counting bounces and prerenders).

### Wave 2 additions
- F03-FR-10 Link previews: hovering or focusing a resolved internal link for 300 ms opens a hover card
  (popover + anchor positioning) with title, summary, author and reading time; data via BFF from
  `GET /api/articles/{slug}`, cached in TanStack Query for the session. Touch devices: no preview;
  tap navigates.
- F03-FR-11 Local graph in the sidebar (F06): starts from `graphContext`; depth 1/2 and "Suggested"
  toggle refetch via BFF `GET /api/graph?slug=&depth=&includeSuggestions=`; static (no zoom), click
  opens the article, "Open in graph" link.

## API contract
| Call | Params | Use |
|---|---|---|
| `GET /api/articles/{slug}` | – | page (server) and previews (BFF) |
| `GET /api/graph` | `slug`, `depth=1|2`, `includeSuggestions` | local graph (BFF) |
| `POST /api/articles/{slug}/view` | – | view counter (BFF, fire-and-forget) |

## UI and states
- Body column ~680 px, serif body (Newsreader), sans UI (IBM Plex Sans), mono code (IBM Plex Mono).
- 404 → not-found page with search (X04-FR-5). Error → ErrorState with retry and request id.
- Mobile: single column; TOC disclosure; local graph below related articles.

## Accessibility
- One `h1` (title); content headings shift to start at `h2`.
- Copy buttons announce "Copied" politely. Code blocks are focusable when they scroll horizontally.
- Hover-card content is a convenience; the linked page holds the same information.

## Observability
- WARN for unknown block types (with type name and slug); span for preview fetches; view-POST failures
  at DEBUG only.

## Performance budget
- No client JS needed to read the article (TOC highlight, previews and local graph hydrate lazily).
- Code highlighting adds 0 KB client JS.

## Acceptance criteria
- F03-AC-1 Given an article with 5 resolved and 1 unresolved internal link, then 5 links point to
  `/articles/{slug}` and 1 renders as non-link dashed text.
- F03-AC-2 Given a heading with `anchorId` "log-matching", then `/articles/x#log-matching` scrolls to it
  and the TOC highlights it.
- F03-AC-3 Given 3 backlinks, then "Linked from 3 articles" lists them.
- F03-AC-4 Given a code block, when "Copy" is clicked, then the code is on the clipboard and "Copied"
  is announced.
- F03-AC-5 Given the page is closed after 1 s, then no view POST is sent; after 3 s visible, exactly one.
- F03-AC-6 Given hover on a resolved link for 300 ms, then a preview with title and summary appears;
  hovering the same link again makes no second request.
- F03-AC-7 Given the local graph's depth is set to 2, then the graph refetches with `depth=2` and keeps
  the previous graph visible until the new one arrives.
- F03-AC-8 Given an unknown slug, then the 404 page shows.

## Test hooks
`view-article`, `article-title`, `breadcrumbs`, `byline`, `reading-time`, `article-tags`,
`article-body`, `internal-link`, `unresolved-link`, `code-block`, `toc`, `backlinks`, `unresolved`,
`related`, `prev-next`, `copy-link`, `open-in-graph`, `reading-toggle`, `local-graph`,
`local-suggested`.

## Out of scope
Comments, highlights, claps/likes, bookmarking.

## Open questions / backend gaps
- Link previews fetch the full read model (heavy). Optional lightweight preview endpoint (BG-10).
- "Subject" line (≤150 chars) for previews/cards later (BG-6).
