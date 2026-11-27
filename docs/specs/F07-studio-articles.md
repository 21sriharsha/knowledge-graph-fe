# F07 — Studio: articles

Status: draft · Wave: W5 · Prototype: `#studio` (Articles tab)

## Summary
Authors see their own articles (admins see all) in every publication state and can publish,
unpublish or archive them. Content itself is edited in Git, not here.

## Personas and access
`/api/studio/**` requires AUTHOR. Authors see/act only on articles of their linked byline; others
return 404. Admins see and act on all. Pending users see the pending screen (F01).

## User stories
- As an author, I can see which of my articles are drafts, published or archived.
- As an author, I can take an article offline (unpublish) or archive it, with a confirmation.
- As an admin, I can fix any author's publication state.

## Functional requirements
- F07-FR-1 List from `GET /api/studio/articles?page=&size=20&sort=updatedAt,desc`: title, state pill
  (Draft / Published / Archived), topics, tags, updated date, revision number, source path; row links
  to the public article when published.
- F07-FR-2 State filter tabs: All / Draft / Published / Archived with counts for the loaded page
  (client-side until BG-14 adds a server filter; label counts "on this page" if paging is active).
- F07-FR-3 Admins see an Author column (author names resolved from `GET /api/authors`, cached).
- F07-FR-4 Actions per row (allowed transitions only):
  Draft → Publish; Published → Unpublish, Archive; Archived → Publish.
  Publish is immediate; Unpublish and Archive need inline confirmation (`ConfirmInline`).
- F07-FR-5 Mutations use TanStack Query with optimistic state change and rollback on error; success
  toast; also revalidate public caches (X04-FR-4).
- F07-FR-6 Errors: 409 `DOMAIN_RULE_VIOLATION` → toast with backend message, row reverts; 404 → toast
  "This article is no longer available to you", row removed after refetch.
- F07-FR-7 Detail drawer (optional, W5 stretch): `GET /api/studio/articles/{slug}` showing metadata,
  source path and revision.
- F07-FR-8 Empty state: "No articles yet — connect a repository" with a link to Repositories.

## API contract
| Call | Success | Errors handled |
|---|---|---|
| `GET /api/studio/articles` (`page`, `size`, `sort`) | `PageResponseArticleResponse` | 401, 5xx |
| `POST /api/studio/articles/{slug}/publish` | `ArticleResponse` | 404, 409 |
| `POST /api/studio/articles/{slug}/unpublish` | `ArticleResponse` | 404, 409 |
| `POST /api/studio/articles/{slug}/archive` | `ArticleResponse` | 404, 409 |
| `GET /api/authors` (admin) | `PageResponseAuthorResponse` | – |

## UI and states
- Table on desktop, stacked cards on mobile. Loading skeleton rows; error state with retry.

## Accessibility
- State pills are text, not colour-only. Confirmation moves focus to the safe action.

## Observability
- Span per mutation with operation and outcome; WARN on 409.

## Acceptance criteria
- F07-AC-1 Given author Maya, then only her 6 articles are listed; admin sees all authors' articles
  with an Author column.
- F07-AC-2 Given a published article, when Unpublish is confirmed, then the pill changes to Draft
  immediately, a toast confirms, and the public page returns 404 after revalidation.
- F07-AC-3 Given Archive is clicked and then cancelled, then nothing changes.
- F07-AC-4 Given the backend returns 409, then the row reverts and the message is shown.
- F07-AC-5 Given an archived article, then only Publish is offered.

## Test hooks
`view-studio`, `studio-articles`, `studio-articles-empty`, `state-pill`, `act-publish`,
`act-unpublish`, `act-archive`, `confirm-row`, `confirm-yes`, `view-article`, `toast`.

## Out of scope
Editing content in the browser; scheduling publication.

## Open questions / backend gaps
- BG-14: server-side state filter and author name on `ArticleResponse`.
- **BG-21 (bug):** the backend list omits DRAFT articles, so an unpublished article disappears from
  this page and can't be re-published from the UI until the backend is fixed.
- Implementation note: public caches are expired with `revalidateTag(tag, { expire: 0 })` on success
  (read-your-writes), not stale-while-revalidate.
