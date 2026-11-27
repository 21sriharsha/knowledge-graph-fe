# F05 — Search

Status: draft · Wave: W2 · Prototype: header search box, `#search`

## Summary
Instant title suggestions in the header and a results page with hybrid (keyword + semantic) ranking.
When AI query understanding is on, the page shows how the query was interpreted (author, topics,
tags, date range) and why each result matched.

## Personas and access
Public.

## User stories
- As a reader, I can type a few letters and jump straight to an article.
- As a reader, I can ask "raft by Maya since 2025" and see how it was understood.
- As a reader, I can see why a result ranked where it did.

## Functional requirements
### Suggestions (header)
- F05-FR-1 Combobox (React Aria) in the header; `/` focuses it from anywhere except text inputs.
- F05-FR-2 After 2+ characters and 150 ms debounce, BFF calls `GET /api/search/suggest?q=&limit=6`;
  results cached per query (TanStack Query, 5 min). Each item: topic dot, title, author.
- F05-FR-3 Keyboard: ↑/↓ moves, Enter opens the highlighted article (or submits the query when none is
  highlighted), Esc closes. Last item "Search for '…'" goes to `/search?q=`.
### Results page
- F05-FR-4 `/search?q=&page=&understand=` (URL is the state; shareable). Server calls
  `GET /api/search?q=&page=&size=10&understand=`.
- F05-FR-5 Toggle "Understand my query (AI)" (default on) sets `understand`.
- F05-FR-6 Meta line: result count, `mode` (Keyword / Semantic / Hybrid), time (`tookMillis`).
- F05-FR-7 When `usedQueryUnderstanding` and `interpretation` present: "Understood as" chips for query
  text, author (marked if not resolved), topics, tags, published after/before.
- F05-FR-8 When `understand=true` but `usedQueryUnderstanding=false`: notice "AI is unavailable —
  showing keyword results".
- F05-FR-9 Hit: title (query terms highlighted), summary, author, topics, tags, date, reading time;
  expandable "Why this result" showing `explanation` components as bars (lexical, semantic, author,
  topic, tag, recency) and `matchedBy`.
- F05-FR-10 Pagination: previous/next using `totalResults`; page size 10.
- F05-FR-11 Empty results: suggestions (check spelling, turn AI off/on, browse topics).

## API contract
| Call | Params | Use |
|---|---|---|
| `GET /api/search/suggest` | `q`, `limit=6` | header (BFF) |
| `GET /api/search` | `q`, `page`, `size=10` (always sent), `understand` | results (server) |

## UI and states
- Loading: skeleton hits; header suggestions show a subtle spinner after 300 ms.
- Error: ErrorState with retry; suggestion errors fail silently (log WARN).
- Mobile: search opens as a full-width overlay.

## Accessibility
- Combobox follows the ARIA combobox pattern (React Aria); results count announced politely.
- Score bars have text values; highlighting uses `<mark>`.

## Observability
- Span `search` with `mode`, `usedQueryUnderstanding`, `totalResults`, `tookMillis`; the query itself is
  never logged (length only).

## Performance budget
- Suggestion round-trip < 250 ms p75 (BFF + backend, same region).

## Acceptance criteria
- F05-AC-1 Given "ra" typed, then after the debounce up to 6 suggestions appear; ↓ + Enter opens the
  second suggestion.
- F05-AC-2 Given "raft by Maya since 2025" with AI on, then "Understood as" shows author Maya, query
  "raft" and a published-after date.
- F05-AC-3 Given AI off, then no interpretation shows and the mode is Keyword.
- F05-AC-4 Given the backend reports `usedQueryUnderstanding=false` with `understand=true`, then the
  "AI unavailable" notice shows.
- F05-AC-5 Given a hit, when "Why this result" is opened, then each non-zero score component shows.
- F05-AC-6 Given the URL `/search?q=raft&page=1`, when shared, then the same page renders.
- F05-AC-7 Given `/` pressed on the home page, then the search box is focused.

## Test hooks
`header-search`, `suggest-list`, `suggest-item`, `suggest-all`, `view-search`, `search-input`,
`search-submit`, `search-understand`, `search-meta`, `interpretation`, `interp-off`,
`interp-skipped`, `search-results`, `search-hit`, `why-result`, `search-empty`.

## Out of scope
Filters UI (facets), saved searches.

## Open questions / backend gaps
- `size` defaults to 0 in the spec (BG-12); the frontend always sends `size`.
