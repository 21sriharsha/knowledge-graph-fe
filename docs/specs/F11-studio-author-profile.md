# F11 — Studio: author profile

Status: draft · Wave: W5 · Prototype: **not prototyped** (endpoint exists in the API)

## Summary
Authors edit the public profile of their own byline (display name, biography, avatar URL, contact
email); admins can edit any author. The profile appears on the author page (F04).

## Personas and access
AUTHOR zone. `PUT /api/studio/authors/{slug}` succeeds only for the caller's linked byline or for
admins; otherwise 404.

## Functional requirements
- F11-FR-1 `/studio/profile` for authors (their linked byline); admins can open
  `/studio/authors/{slug}` from the accounts page.
- F11-FR-2 Form (`UpdateAuthorProfileRequest`): display name (required, ≤200), biography (≤10 000,
  plain text with line breaks), avatar URL (≤1000, https), email (≤320, email format; not shown
  publicly — confirm).
- F11-FR-3 Preview of the author header as it will look on the public page.
- F11-FR-4 Save → toast; revalidate `author:{slug}` (X04).
- F11-FR-5 An author account without a linked byline sees "Your account isn't linked to a byline yet —
  ask an admin".

## API contract
| Call | Success | Errors handled |
|---|---|---|
| `GET /api/authors/{slug}` | `AuthorResponse` | 404 |
| `PUT /api/studio/authors/{slug}` | `AuthorResponse` | 400, 404 |

## Accessibility
- Labelled fields, character counters announced only on demand (not on every keystroke).

## Acceptance criteria
- F11-AC-1 Given Maya edits her biography, then the author page shows the new text after save.
- F11-AC-2 Given an author opens another author's profile URL, then a not-found state shows.
- F11-AC-3 Given a 10 001-character biography, then validation blocks saving.
- F11-AC-4 Given an account without a byline, then the "not linked" message shows.

## Out of scope
Avatar upload (URL only).

## Open questions
- Should `email` be public on the author page? The read model (`AuthorReadModel`) does not include it,
  so assume private.
- Prototype this screen before W5 implementation.
