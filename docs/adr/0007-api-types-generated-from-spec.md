# 0007 — API types generated from the OpenAPI spec

Status: accepted · 2026-11-26

## Context
`../knowledge-graph-be/apim/api-spec.yaml` is the contract. Hand-written types drift silently.

## Decision
- Generate TypeScript types with **openapi-typescript**; call the API with **openapi-fetch** (typed
  paths, params and bodies) from server code only (ADR 0002).
- The generated file is committed; `pnpm api:types` regenerates it. CI regenerates and fails on a diff
  (spec drift check).
- Content blocks (`ContentBlock`, `InlineContent`) are discriminated unions on `type`; renderers switch
  exhaustively so a new block type fails type-checking instead of rendering nothing.
- MSW mock handlers for tests are typed against the same generated types.

## Consequences
- Contract changes surface as compile errors.
- Responses are typed, not validated at runtime; zod validation is used only at trust boundaries we
  own (env vars, forms, the revalidate webhook payload).

## Alternatives considered
- orval / openapi-generator clients: heavier generated code, less control over fetch behaviour.
