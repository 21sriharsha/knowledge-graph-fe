# F10 — Studio: accounts and roles

Status: draft · Wave: W5 · Prototype: `#studio` (Accounts tab, admin only)

## Summary
Since ADR 0008, every signed-in user is an author through their token. This page shows and edits
*stored* grants (ADMIN, and AUTHOR for accounts without the token claim). It does not show
token-granted AUTHOR, and revoking AUTHOR here doesn't stop it: ban the user in Supabase instead.
Admins grant and revoke roles and link accounts to author bylines. Before ADR 0008, this was how a pending user became
an author.

## Personas and access
`/api/studio/accounts/**` requires ADMIN (403 otherwise). The tab is hidden for non-admins.

## User stories
- As an admin, I can find a newly signed-up account and grant AUTHOR.
- As an admin, I can link an account to an existing byline so it owns that author's content.

## Functional requirements
- F10-FR-1 List `GET /api/studio/accounts`: display name, email, issuer (provider), roles as switches
  (AUTHOR, ADMIN), linked author, created, last seen. Search box filters client-side by name/email.
- F10-FR-2 Pending accounts (no roles) are highlighted and sortable to the top.
- F10-FR-3 Toggling a role: `PUT`/`DELETE /api/studio/accounts/{id}/roles/{role}` with optimistic
  update and rollback.
- F10-FR-4 Removing your own ADMIN role requires a confirmation dialog explaining you will lose access
  to this page.
- F10-FR-5 Link byline: select from `GET /api/authors` → `PUT /api/studio/accounts/{id}/author`
  (`LinkAuthorRequest`); "Unlink" → `DELETE`. A byline already linked to another account returns 409 →
  toast with the backend message, select reverts.
- F10-FR-6 Admins cannot be left at zero: if the backend refuses (409), show its message.

## API contract
| Call | Success | Errors handled |
|---|---|---|
| `GET /api/studio/accounts` | `AccountResponse[]` | 403 |
| `PUT`/`DELETE /api/studio/accounts/{id}/roles/{role}` | `AccountResponse` | 404, 409 |
| `PUT`/`DELETE /api/studio/accounts/{id}/author` | `AccountResponse` | 404, 409 |
| `GET /api/authors` | `PageResponseAuthorResponse` | – |

## UI and states
- Table on desktop, cards on mobile; loading skeleton; 403 page for non-admins.

## Accessibility
- Role switches are labelled "AUTHOR role for {name}"; confirmation dialog focuses Cancel.

## Observability
- Span per role/link change with outcome (no emails in attributes).

## Acceptance criteria
- F10-AC-1 Given a pending account, when AUTHOR is switched on, then the account shows AUTHOR and that
  user's "Check again" on the pending screen now opens the studio.
- F10-AC-2 Given the admin switches off their own ADMIN, then a confirmation dialog appears first.
- F10-AC-3 Given linking a byline already linked elsewhere, then a 409 toast shows and the select
  reverts.
- F10-AC-4 Given an author opens `/studio/accounts`, then a 403 page shows.

## Test hooks
`accounts-table`, `account-row`, `link-author`, `toast`.

## Out of scope
Inviting users by email; deleting accounts.

## Open questions
- Does the backend prevent removing the last admin? Confirm; spec assumes a 409 if so.
