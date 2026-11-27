# F02 — Home

Status: draft · Wave: W1 · Prototype: `#home`

## Summary
A calm landing page: a non-interactive graph preview that opens the explorer, a "Latest" feed of
article cards, and a sidebar with "Most read this week" and topics.

## Personas and access
Public.

## User stories
- As a reader, I see what's new and can open an article in one click.
- As a reader, I get a sense of how content connects and can jump into the graph.

## Functional requirements
- F02-FR-1 Hero: eyebrow "{publishedArticleCount} articles · {edges} links", headline, one-line intro,
  graph preview from `GET /api/graph/overview?maxNodes=40`.
- F02-FR-2 Graph preview is **static**: no wheel/pinch zoom, no pan (page scroll passes through);
  hover highlights neighbours and shows the hover card; **any click** (node or background) navigates
  to `/graph`. An "Open the graph" button does the same.
- F02-FR-3 Feed: single "Latest" list (no topic tabs — topics can grow without limit), newest first,
  from `GET /api/articles?page=0&size=8`; "Show more" loads the next page client-side.
- F02-FR-4 Article card: author (avatar + name → author page), all topics as chips, title → article,
  summary, date, reading time, link count, first 3 tags + "+N" chip (tooltip lists the rest).
  Requires BG-2 (fields missing from `ArticleReference`).
- F02-FR-5 Sidebar "Most read this week": `GET /api/articles/trending?days=7&limit=6`, numbered list
  with title, author, read count, topic chip and up to 2 tag chips (tags need BG-3).
- F02-FR-6 Sidebar "Topics": chips from `GET /api/navigation` with article counts. Show the top 12 by
  count and a "See all topics" link when there are more (open question 1).
- F02-FR-7 No "Authors" section on home.

## API contract
| Call | Params | Use |
|---|---|---|
| `GET /api/navigation` | – | counts, topics |
| `GET /api/graph/overview` | `maxNodes=40` | hero graph |
| `GET /api/articles` | `page`, `size=8` | feed |
| `GET /api/articles/trending` | `days=7`, `limit=6` | sidebar |

## UI and states
- Loading: skeleton hero, 3 skeleton cards, skeleton sidebar.
- Empty knowledge base (`publishedArticleCount = 0`): "Nothing published yet" state, no graph.
- Partial failure: if trending fails, hide that section; if the feed fails, show ErrorState with retry.
- Mobile: hero copy stacks above a 240 px graph; sidebar moves below the feed.

## Accessibility
- Graph preview has `role="img"` with a text alternative and a real link ("Open the graph") for
  keyboard users; hover card content is also available on the article itself.

## Observability
- Web Vitals for `/`; span for each backend call (X01).

## Performance budget
- LCP element is the headline text; graph renders after hydration and must not shift layout (fixed
  height container).

## Acceptance criteria
- F02-AC-1 Given 29 published articles, then the eyebrow shows "29 articles · {n} links".
- F02-AC-2 Given the cursor over the graph, when the user scrolls the wheel, then the page scrolls and
  the graph zoom stays at 1×.
- F02-AC-3 Given a click on a node or on empty graph space, then `/graph` opens.
- F02-AC-4 Given more than 8 articles, when "Show more" is clicked, then 8 more cards append without
  re-rendering the page.
- F02-AC-5 Given an article with 5 tags, then its card shows 3 tag chips and "+2".
- F02-AC-6 Given an article with two topics, then both topic chips show on its card.
- F02-AC-7 Given `publishedArticleCount = 0`, then the empty state shows and no graph is requested.

## Test hooks
`view-home`, `home-graph`, `open-explorer`, `feed`, `feed-head`, `post-card`, `more-tags`,
`load-more`, `trending`, `trending-taxonomy`, `topic-chip`, `empty-home`.

## Out of scope
Personalised feeds, following authors/topics.

## Open questions / backend gaps
1. Topic list cap (top 12 + "See all") — confirm.
2. BG-2, BG-3.
