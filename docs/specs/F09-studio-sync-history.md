# F09 — Studio: sync history and run detail

Status: draft · Wave: W4 · Prototype: `#studio` (Sync history tab, run detail)

## Summary
A list of ingestion runs (webhook, manual, scheduled) with outcomes and document counts, and a run
detail page showing the processing pipeline and diagnostics so authors can fix their Markdown.

## Personas and access
AUTHOR zone. The backend filters runs to repositories the caller may act on; admins see all.

## Functional requirements
- F09-FR-1 List `GET /api/studio/ingestions?limit=20&repositoryId=`: state pill (Running / Succeeded /
  Partially succeeded / Failed), trigger, repository name, revision (short SHA), documents
  succeeded/skipped/failed of total, started, duration. Filter by repository (select).
- F09-FR-2 While any listed run is `RUNNING`, refetch every 3 s; stop when none are running or the tab
  is hidden.
- F09-FR-3 Run detail `/studio/runs/{id}` (`GET /api/studio/ingestions/{id}`): summary (state, trigger,
  revision, counts, start/finish, `correlationId` with copy), pipeline steps from
  `GET /api/studio/ingestions/pipeline` (e.g. Validation, MarkdownParsing, MetadataExtraction,
  ContentPersistence, GraphUpdate, SearchIndex, Embedding, ReadModel, CacheInvalidation), diagnostics
  table.
- F09-FR-4 Diagnostics: severity (INFO/WARNING/ERROR) filter with counts, code, message, source path,
  article link (when `articleSlug` resolves), time. Known codes get a short help text: `UNRESOLVED_LINK`,
  `UNCHANGED`, `RAW_HTML_DROPPED`, `PROVIDER_ERROR`, `PERSIST_FAILED`, `PARSE_FAILED`, `MISSING_TITLE`,
  `HANDLER_FAILED`, `ARTICLE_REMOVED`; unknown codes show the message only.
- F09-FR-5 Run detail also polls every 3 s while `RUNNING`.
- F09-FR-6 Empty states: no runs yet (link to Repositories); no diagnostics ("Clean run").

## API contract
| Call | Params | Success |
|---|---|---|
| `GET /api/studio/ingestions` | `limit=20`, `repositoryId?` | `IngestionRunResponse[]` |
| `GET /api/studio/ingestions/{id}` | – | `IngestionRunResponse` |
| `GET /api/studio/ingestions/pipeline` | – | `string[]` (cache for the session) |

## UI and states
- The pipeline is shown as an ordered list of steps; the backend does not report per-step status, so
  steps are informational (see open question).

## Accessibility
- Polling updates do not steal focus; state changes of the open run are announced politely once.

## Observability
- Span for run detail load; polling requests are not logged individually.

## Acceptance criteria
- F09-AC-1 Given a RUNNING run, then the list refreshes until it finishes, then polling stops.
- F09-AC-2 Given a run with 5 diagnostics (2 ERROR, 3 WARNING), when filtering ERROR, then 2 rows show.
- F09-AC-3 Given a diagnostic with code `UNRESOLVED_LINK`, then its help text shows.
- F09-AC-4 Given an author, then runs for repositories they don't own are not listed.
- F09-AC-5 Given the run detail, then the correlation id can be copied.

## Test hooks
`runs-table`, `run-row`, `run-summary`, `pipeline`, `diagnostics`, `diagnostics-empty`, `state-pill`.

## Out of scope
Re-running a single document; downloading logs.

## Open questions / backend gaps
- Per-step pipeline status/timings are not in the API; useful for showing where a run failed (BG-15).
