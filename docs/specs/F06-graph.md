# F06 — Graph: component, local graph and explorer

Status: draft · Wave: W2 (component + local graph), W3 (explorer) · Prototype: `#graph`, article sidebar

## Summary
One reusable force-directed graph component (d3-force/d3-zoom on SVG) used in three places: the
static home preview (F02), the article's local graph (F03) and the full explorer. The explorer has
two scopes: **Whole graph** (articles and their links) and **Around a topic or tag** (a topic/tag at
the centre, related topics and tags as labelled leaves).

## Personas and access
Public.

## Functional requirements
### Component
- F06-FR-1 Props: data (`nodes`, `edges`), `focusId`, `labels` (`auto|always`), `arrows`, `suggested`,
  `linkDistance`, `charge`, `topicFilter`, `filterText`, `zoomable`, `tooltip`, `topicsOf(node)`,
  `onOpen`, `onSelect`. Imperative: `select`, `zoomBy`, `reset`.
- F06-FR-2 Node size scales with degree (or article count for term nodes); colour by primary topic;
  tag nodes neutral grey. Authored edges solid; suggested dashed (`SHARED_TOPIC`, `SHARED_TAG`) or
  dotted (`SEMANTIC_SIMILARITY`).
- F06-FR-3 Hover/focus highlights the node and neighbours, dims the rest, and shows **one** hover card
  (no native SVG `<title>` tooltip): article nodes → topics (all) + title; term nodes → kind, article
  count, name. Card flips near edges, hides on drag/zoom (and on page scroll in the top layer).
  Placement: beside the node in a wide graph (explorer); when the card would cover a small graph
  (local graph, mobile), it sits outside the graph level with the node — right (preferred), left,
  above or below, whichever fits. Uses the top layer (`popover="manual"`); without Popover support it stays
  inside the graph (`src/components/graph/hover-card-placement.ts`).
- F06-FR-4 Labels: hidden by default for article graphs; fade in when zoomed past ~1.8×; selected and
  focused nodes keep labels; "Always show labels" forces them. Term graphs always show labels.
- F06-FR-5 `zoomable=false` removes wheel/pinch/pan (used by home and local graph).
- F06-FR-6 Keyboard: nodes are focusable (Tab), Enter opens, Space selects. Stale selection is cleared
  when the data changes.
- F06-FR-7 `prefers-reduced-motion`: simulation runs to rest before first paint (no animation).
- F06-FR-8 Client-only, lazy-loaded (`next/dynamic`, no SSR); container has fixed height (no CLS).
### Explorer (`/graph`)
- F06-FR-9 Settings panel: find a note (highlight + Enter selects), scope switch, node limit (whole
  graph, 8–60, default 40), suggested links, arrows, always-show-labels, edge legend, topic filter with
  counts, forces (link distance default **130**, repel default **360**), reset view, zoom buttons.
  Mobile: panel collapses behind "Filters".
- F06-FR-10 Whole graph: `GET /api/graph/overview?maxNodes=` (+ suggestions when enabled — see open
  question 2). Truncated → banner "Showing the N most-connected of M articles".
- F06-FR-11 Selecting an article node opens a side card: topics, link count, title, summary, "Read
  article", "Show its topics" (switches to taxonomy scope centred on its primary topic). Double-click
  opens the article.
- F06-FR-12 Around a topic or tag: "Centre on" select (topics and tags groups), depth 1–2, "Include
  tags as leaves"; data from the taxonomy endpoint (BG-5). Clicking a leaf re-centres; the card offers
  "Browse articles" (topic/tag page). Truncated → banner.
- F06-FR-13 URL state: `/graph?scope=all&max=40` and `/graph?focus=topic:databases&depth=1&tags=1`
  so views are shareable; article "Open in graph" uses `focus=topic:{primaryTopic}`.
- F06-FR-14 Refetches keep the previous graph visible until new data arrives (TanStack Query
  `placeholderData`).

## API contract
| Call | Params | Use |
|---|---|---|
| `GET /api/graph/overview` | `maxNodes` | whole graph, home preview |
| `GET /api/graph` | `slug`, `depth`, `includeSuggestions` | local graph |
| `GET /api/graph/taxonomy` (**BG-5, not in spec**) | `term=topic:{slug}|tag:{slug}`, `depth=1..2`, `includeTags` | taxonomy scope |
| `GET /api/articles` | paged | explorer card summaries / multi-topic lookup until BG-4 |

## UI and states
- Empty graph (no published articles) → "The graph is empty" state.
- Error → toast "Couldn't load the graph" with retry; previous graph stays.

## Accessibility
- SVG `role="img"` with a summary ("29 articles, 54 links"); every node has `aria-label` with its
  title. The explorer offers the same navigation through the side card buttons and topic/tag pages, so
  the graph is never the only path to content.

## Observability
- Span `graph.load` with scope, node count, edge count, truncated.

## Performance budget
- 60 nodes / 150 edges settle within 1.5 s on a mid-range laptop; interactions stay under 100 ms INP.
- If whole-graph needs > 500 nodes in future, evaluate canvas/WebGL (sigma.js).

## Acceptance criteria
- F06-AC-1 Given the explorer loads, then link distance is 130 and repel 360, and all nodes fit within
  the canvas at default zoom.
- F06-AC-2 Given hover on an article node, then exactly one card shows with its topics and title, and
  no browser tooltip appears.
- F06-AC-3 Given default zoom, then no article labels are visible; at 2× they are.
- F06-AC-4 Given node limit 12, then the truncation banner shows.
- F06-AC-5 Given scope "Around a topic or tag" centred on Databases, then Databases is the centre and
  leaves are labelled topics/tags; clicking "#postgres" re-centres on it.
- F06-AC-6 Given "Include tags as leaves" is off while centred on a tag, then the centre stays and only
  topic leaves show.
- F06-AC-7 Given the topic filter unchecks Security, then Security article nodes disappear; tag nodes
  are unaffected.
- F06-AC-8 Given the local graph on an article, when the wheel scrolls over it, then the page scrolls.
- F06-AC-9 Given `/graph?focus=tag:postgres`, then the taxonomy scope opens centred on #postgres.
- F06-AC-10 Given hover on a node in the article's local graph, then the hover card does not overlap
  the graph.

## Test hooks
`view-graph`, `graph-panel`, `graph-filter`, `scope-all`, `scope-local`, `graph-max-nodes`,
`graph-focus`, `graph-depth`, `graph-include-tags`, `graph-suggested`, `graph-topics`,
`graph-reset`, `graph-truncated`, `graph-card`, `graph-card-open`, `graph-card-focus`, `graph-svg`,
`graph-node`, `graph-tooltip`, `empty-graph`, `local-graph`, `local-suggested`.

## Out of scope
Editing links from the graph; saving custom layouts.

## Open questions / backend gaps
1. BG-4: `GraphNode` carries one `topic`; all topics needed for the hover card everywhere.
2. `GET /api/graph/overview` has no `includeSuggestions` parameter in the spec (the prototype passes
   it). Either add it (BG-13) or hide the suggested toggle in whole-graph scope.
3. BG-5: taxonomy endpoint. Interim: the BFF composes the same tree from topic and tag read models
   (`src/lib/api/taxonomy-graph.ts`). If parent/child topics are wanted later, the backend needs topic
   hierarchy.
4. Implementation note: the "Suggested links" toggle is offered only in the local graph (BG-13).
