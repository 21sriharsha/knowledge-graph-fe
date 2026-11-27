# Spec sheets

One sheet per feature. A sheet is the source of truth for behaviour and for tests: acceptance
criteria IDs (e.g. `F03-AC-4`) appear in test names.

## Index

### Cross-cutting (platform)
| ID | Spec | Wave |
|---|---|---|
| X01 | [BFF and API client](X01-bff-and-api-client.md) | W0 |
| X02 | [UI kit, theming and reading mode](X02-ui-kit-theming-reading-mode.md) | W0–W1 |
| X03 | [Observability](X03-observability.md) | W0 |
| X04 | [Rendering, caching and routing](X04-rendering-caching-routing.md) | W0–W1 |

### Features
| ID | Spec | Wave |
|---|---|---|
| F01 | [Authentication and access](F01-auth-and-access.md) | W4 |
| F02 | [Home](F02-home.md) | W1 |
| F03 | [Article reader](F03-article-reader.md) | W1 (core), W2 (previews, local graph) |
| F04 | [Topic, tag and author pages](F04-topic-tag-author-pages.md) | W1 |
| F05 | [Search](F05-search.md) | W2 |
| F06 | [Graph: component, local graph and explorer](F06-graph.md) | W2 (local), W3 (explorer) |
| F07 | [Studio: articles](F07-studio-articles.md) | W5 |
| F08 | [Studio: repositories](F08-studio-repositories.md) | W4 |
| F09 | [Studio: sync history and run detail](F09-studio-sync-history.md) | W4 |
| F10 | [Studio: accounts and roles](F10-studio-accounts.md) | W5 |
| F11 | [Studio: author profile](F11-studio-author-profile.md) | W5 |

Backend changes these specs depend on are collected in [`../backend-gaps.md`](../backend-gaps.md)
(IDs `BG-n`).

## Conventions
- **Personas:** `anon` (signed out), `pending` (signed in, no roles — rare since ADR 0008), `author` (AUTHOR, linked byline),
  `admin` (ADMIN, optionally also AUTHOR). These match the prototype's DEV persona switch.
- **Ownership:** an author may act only on resources owned by their linked byline; admins on anything.
  The backend answers **404** (not 403) for resources the caller does not own.
- **Errors:** the backend returns `ApiError { status, code, message, path, requestId, violations[] }`
  with codes `NOT_FOUND`, `DOMAIN_RULE_VIOLATION` (409), `VALIDATION_FAILED` (400),
  `INVALID_REQUEST` (400), `INTERNAL_ERROR` (500). 401/403 come from Spring Security.
- **States:** every data view specifies loading, empty, error and (where relevant) forbidden states.
- **Test hooks:** keep the prototype `data-testid`s listed in each sheet.

## Template

```markdown
# <ID> — <Feature name>

Status: draft | approved | implemented · Wave: Wn · Prototype: <route/hash>

## Summary
One paragraph: what and why.

## Personas and access
Who can use it; which backend zone protects it.

## User stories
- As a <persona>, I want <capability>, so that <outcome>.

## Functional requirements
- <ID>-FR-1 …

## API contract
| Call (via BFF) | Params | Success | Errors handled |

## UI and states
Layout notes; loading / empty / error / forbidden; responsive behaviour.

## Accessibility
Keyboard, focus, names/roles, motion.

## Observability
Spans, logs, metrics, user-visible request id.

## Performance budget
Targets for this feature.

## Acceptance criteria
- <ID>-AC-1 Given … when … then …

## Test hooks
`data-testid`s carried over from the prototype.

## Out of scope
## Open questions / backend gaps
```
