# F04 — Topic, tag and author pages

Status: draft · Wave: W1 · Prototype: `#topic-<slug>`, `#tag-<slug>`, `#author-<slug>`

## Summary
Listing pages for a topic, a tag or an author, each with a short header and the list of published
articles. Articles can belong to several topics and tags; they appear on every matching page.

## Personas and access
Public.

## Functional requirements
- F04-FR-1 Topic page: name, description, article count, colour dot, article list
  (`GET /api/topics/{slug}`), link "See in graph" (`/graph?focus=topic:{slug}`).
- F04-FR-2 Tag page: `#name`, article count, article list (`GET /api/tags/{slug}`), "See in graph"
  (`/graph?focus=tag:{slug}`).
- F04-FR-3 Author page: avatar, display name, biography, joined date, topics they write about,
  article count and list (`GET /api/authors/{slug}/page`).
- F04-FR-4 Article list items reuse the home card (F02-FR-4) when BG-2 lands; until then a compact item
  (title, summary, author name).
- F04-FR-5 "All topics" page `/topics` and "All tags" page `/tags` from `GET /api/topics` and
  `GET /api/tags` (`TaxonomyListing`), sorted by article count, with counts.
- F04-FR-6 Unknown slug or no published content → 404 page.

## API contract
| Call | Use |
|---|---|
| `GET /api/topics`, `GET /api/topics/{slug}` | topics |
| `GET /api/tags`, `GET /api/tags/{slug}` | tags |
| `GET /api/authors/{slug}/page` | author |

## UI and states
- Loading skeleton list; empty list cannot happen (404 instead); error → ErrorState.
- Topic colour from X02-FR-4.

## Accessibility
- Page `h1` is the topic/tag/author name; list is a `<ul>` of articles.

## Acceptance criteria
- F04-AC-1 Given an article with topics Distributed Systems and Databases, then it appears on both
  topic pages.
- F04-AC-2 Given `/tags/postgres`, then the header shows "#postgres" and the number of articles.
- F04-AC-3 Given `/authors/maya-okafor`, then bio, joined date and her articles show.
- F04-AC-4 Given `/topics`, then every topic with published content is listed with its count.
- F04-AC-5 Given an unknown slug, then the 404 page shows.

## Test hooks
`topic-chip`, `post-card` (list items).

## Out of scope
Following topics/authors; pagination beyond what the read models return (all articles are returned).

## Open questions / backend gaps
- Read models return every article in one response; large topics may need paging later (BG-11).
