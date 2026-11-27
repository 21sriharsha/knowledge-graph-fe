# 0004 — Own component kit on native HTML

Status: accepted · 2026-11-26

## Context
The design is minimalist (Medium-like) and already expressed as CSS tokens in the prototype. Modern
browsers now provide dialogs, popovers, anchor positioning and switches natively; the
`modern-web-guidance` skill recommends them over JavaScript re-implementations.

## Decision
- A small in-repo kit (`components/ui`, ~10–15 components), styled with CSS Modules + tokens.
- Native first: modal `<dialog>` for confirmations and drawers; `popover` + CSS anchor positioning for
  hover cards, menus, suggestion lists and toasts; `<input type="checkbox" switch>` for toggles;
  `<select>` (customizable select as progressive enhancement).
- **React Aria** hooks only where the platform lacks keyboard behaviour: search combobox and menus.
- Polyfills (`@oddbird/popover-polyfill`, `invokers-polyfill`, `input-switch-polyfill`) are loaded
  only after feature detection fails, per the browser-support policy in `CLAUDE.md`.
- The graph hover card keeps JS positioning: graph nodes are SVG shapes, not HTML anchors.

## Consequences
- Full control of look and bundle size; we own accessibility testing of the kit.
- Less JavaScript than Radix/MUI equivalents; behaviour comes from the browser.

## Alternatives considered
- **shadcn/ui**: copies Radix + Tailwind code into the repo; assumes Tailwind and re-implements native
  behaviour in JS.
- **Material UI**: Material look conflicts with the design; heavy runtime; constant restyling effort.
