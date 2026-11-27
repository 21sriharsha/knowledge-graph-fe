# F08 — Studio: repositories

Status: draft · Wave: W4 · Prototype: `#studio` (Repositories tab)

## Summary
Connect and manage the Git repositories that content is ingested from (GitHub, GitLab incl.
self-hosted, Azure DevOps): credentials, webhook secret, branch and path, activation, manual sync.

## Personas and access
AUTHOR zone. Authors manage repositories owned by their byline; admins manage all (others → 404).

## User stories
- As an admin, I can connect a repository so pushes publish articles.
- As an author, I can see whether my repository is healthy (token, webhook secret, last sync) and
  trigger a sync.

## Functional requirements
- F08-FR-1 List (`GET /api/studio/sources`) as cards: provider, display name, `owner/repository`
  (+ project for Azure), branch, content path, active/paused, last synced revision and time, warnings
  "No access token" (`accessTokenConfigured=false`) and "No webhook secret — pushes won't trigger
  syncs" (`webhookSecretConfigured=false`).
- F08-FR-2 "Connect repository" opens a Drawer form (`POST /api/studio/sources`):
  - required: type, display name (≤200), owner (≤200), repository (≤200);
  - project (≤200) shown and required only for Azure DevOps;
  - optional: default branch (≤200), content path (≤500), API base URL (≤500, must be `https://`;
    shown for GitLab/Azure self-hosted), access token (≤500), webhook secret (≤500), owner author
    name (≤200) and email (≤320, email format).
- F08-FR-3 Edit (`PUT /api/studio/sources/{id}`, `UpdateSourceRequest`): display name (required),
  branch, content path, API base URL, owner author (select, admins only), access token, webhook secret.
  Type/owner/repository/project are read-only after creation.
- F08-FR-4 Secrets are **write-only**: fields are empty with "Configured — leave blank to keep" when
  set; entering a value replaces it. Values are never displayed, logged or kept in client state after
  submit.
- F08-FR-5 After creating, show the webhook URL to configure in the provider:
  `{public backend URL}/api/webhooks/sources/{id}` with a copy button and provider-specific hint.
- F08-FR-6 Activate/pause toggle: `POST`/`DELETE /api/studio/sources/{id}/activate`.
- F08-FR-7 "Sync now": `POST /api/studio/sources/{id}/sync` → 202 → toast "Sync started" + link to the
  new run in Sync history (F09).
- F08-FR-8 Validation errors (400 `violations`) map to fields; client-side zod mirrors the length
  rules and required fields.
- F08-FR-9 Drawer with unsaved changes asks before discarding (X02-FR-11).

## API contract
| Call | Success | Errors handled |
|---|---|---|
| `GET /api/studio/sources` | `SourceResponse[]` | 401, 5xx |
| `GET /api/studio/sources/{id}` | `SourceResponse` | 404 |
| `POST /api/studio/sources` | 201 `SourceResponse` | 400, 409 |
| `PUT /api/studio/sources/{id}` | `SourceResponse` | 400, 404, 409 |
| `POST /api/studio/sources/{id}/sync` | 202 | 404, 409 |
| `POST`/`DELETE /api/studio/sources/{id}/activate` | `SourceResponse` | 404, 409 |

## UI and states
- Empty: "No repositories connected" with "Connect repository".
- Paused cards are visually muted; sync is disabled while paused.

## Accessibility
- Drawer is a modal `<dialog>` with a labelled heading; errors linked with `aria-describedby`; first
  invalid field receives focus on submit.

## Observability
- Spans for create/update/sync/activate with provider type and outcome; never the token or secret.

## Acceptance criteria
- F08-AC-1 Given type Azure DevOps, then Project is shown and required; for GitHub it is hidden.
- F08-AC-2 Given API base URL `http://git.example`, then validation fails with "Must use https".
- F08-AC-3 Given a repository with a token configured, when editing, then the token field is empty with
  the "Configured" hint, and saving without typing keeps the token.
- F08-AC-4 Given `webhookSecretConfigured=false`, then the card shows the webhook warning.
- F08-AC-5 Given "Sync now", then a 202 shows "Sync started" with a link to the run list filtered to
  this repository.
- F08-AC-6 Given an author who does not own a repository, when opening its URL, then a not-found
  state shows (backend 404).
- F08-AC-7 Given a new repository is created, then the webhook URL with copy button is shown.

## Test hooks
`connect-repo`, `drawer`, `source-card`, `source-edit`, `source-save`, `source-sync`,
`source-toggle`, `sources-empty`, `notice-token`, `notice-webhook`.

## Out of scope
OAuth app installation flows (e.g. GitHub App); webhook auto-registration.

## Open questions
- The public webhook URL base must be configured (`NEXT_PUBLIC_WEBHOOK_BASE_URL`) since the browser
  never sees the backend URL otherwise.
