# Prototype

Single-file, dependency-light prototype of the frontend (vanilla JS + d3 from cdnjs). It is a design
and test-case reference, **not** production code: nothing here is imported into the Next.js app.

- File: `knowledge-ui-prototype.html` (copy of artifact version 11, 2026-11-26)
- Artifact: https://claude.ai/artifact/JAPJfKobfmrB7Sy6o562o5
- Mock API: `route()` inside the file enforces the backend's auth zones (401/403) and mirrors
  `../knowledge-graph-be/apim/api-spec.yaml`, with a few deliberate deviations that are marked
  `NOT IN SPEC YET` in the code and listed in `../docs/backend-gaps.md`.

When the UI changes, update the artifact and re-copy the file here so both stay in sync.
