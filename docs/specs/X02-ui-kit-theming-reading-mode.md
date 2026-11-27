# X02 — UI kit, theming and reading mode

Status: draft · Wave: W0 (tokens, theme, kit primitives), W1 (reading mode) · ADR: 0004
Prototype: theme toggle in header, reading toggle on article pages

## Summary
A small in-repo component kit on native HTML, design tokens ported from the prototype, a light/dark
theme that follows the OS by default, and a light-only reading mode for long-form articles.

## Personas and access
All personas. Preferences are per browser (no account setting yet).

## Functional requirements
### Tokens and theme
- X02-FR-1 Tokens (colour, type scale, spacing, radius, shadow, topic colours `--t-ds|db|net|obs|sec|dev`)
  are CSS custom properties on `:root`, ported from the prototype.
- X02-FR-2 `<meta name="color-scheme" content="light dark">` in the document head and `color-scheme`
  on `:root`. Colour pairs use `light-dark()` with a fallback for browsers that lack it.
- X02-FR-3 Theme choice: `system` (default) or a stored override (`light` / `dark`) in localStorage,
  applied before first paint by a tiny inline head script that updates `<meta name="color-scheme">`
  (modern-web-guidance `dark-mode-toggle`). Two-state toggle: it targets the opposite of the rendered
  scheme and removes the override when that equals the system preference. *(Changed 2026-11-26 from a
  cookie: reading cookies in the root layout would make every page dynamic under Cache Components.)*
- X02-FR-4 Topic colours derive from a stable hash of the topic slug (OKLCH hue at fixed lightness/
  chroma, ≥3:1 on both backgrounds); unknown topics get a neutral colour. Colour is always paired with
  the topic name (it is never the only cue).

### Reading mode
- X02-FR-5 Available only in light theme, on every page (as in the prototype). Switching to dark turns
  it off. The toggle sits in the site header immediately before the theme toggle, not in the article
  body. The warm paper palette applies site-wide; the article-only effects in FR-6 (hidden chrome,
  larger type, "Exit reading mode") apply on article pages only.
- X02-FR-6 Reading mode: warm paper background, larger serif body, wider line height; hides header
  navigation, search, table of contents and local graph; shows an "Exit reading mode" control.
- X02-FR-7 State persists per browser; leaving the article page keeps the preference but the chrome
  returns on non-article pages.

### Kit (initial set)
- X02-FR-8 Components: Button, IconButton, Chip (topic/tag), Avatar, Skeleton, StatePill,
  EmptyState/ErrorState (with retry and optional request id), Toast (popover-based), Dialog (modal
  `<dialog>`), Drawer (modal `<dialog>` styled as side sheet), HoverCard (popover + anchor positioning),
  Menu (popover + React Aria keyboard), Switch (`<input type="checkbox" switch>`), Select (native),
  Combobox (React Aria), Tabs/SegmentedControl, ConfirmInline.
- X02-FR-9 Polyfills load only when feature detection fails: Popover (`@oddbird/popover-polyfill`),
  Invoker commands (`invokers-polyfill`), switch (`input-switch-polyfill`). Styles combine native and
  polyfilled pseudo-classes with `:is()`.
- X02-FR-10 Dialogs: no manual focus trap / `role="dialog"` / Esc handler; `aria-labelledby` on every
  dialog; `autofocus` on the safe action in destructive confirmations; scroll containment CSS.
- X02-FR-11 Drawer with unsaved form changes guards closing in the `cancel` handler (works where
  `closedby` is unsupported).

## UI and states
- Mobile first; 16 px side gutter; no horizontal scroll at 320 px.
- Focus ring visible in both themes with ≥ 3:1 contrast.

## Accessibility
- Text contrast ≥ 4.5:1 (body) in light, dark and reading mode.
- `prefers-reduced-motion` disables non-essential transitions (toasts, hover cards, graph motion).
- Every kit component has an axe check and keyboard test in the kit test suite.

## Observability
- Count theme and reading-mode changes (anonymous product metric, no user id).

## Performance budget
- Kit CSS < 25 KB gzip; no runtime CSS-in-JS.

## Acceptance criteria
- X02-AC-1 Given OS dark mode and no saved choice, when any page loads, then it renders dark on first
  paint (no light flash).
- X02-AC-2 Given light theme on an article, when the reader toggles reading mode, then nav, search,
  TOC and local graph are hidden and "Exit reading mode" is shown.
- X02-AC-3 Given reading mode on, when the theme switches to dark, then reading mode turns off and its
  toggle is hidden.
- X02-AC-4 Given reading mode on, when the reader opens the home page, then the header chrome is visible.
- X02-AC-5 Given light theme on a non-article page (home, studio), then the reading toggle is in the header
  before the theme toggle, and pressing it applies the paper palette; it is absent in dark theme.
- X02-AC-5 Given a browser without Popover support, when a hover card opens, then the polyfill was
  loaded and the card is positioned; in a supporting browser the polyfill is never requested.
- X02-AC-6 Given a destructive confirmation dialog, when it opens, then focus is on the safe action,
  and Esc closes it and returns focus to the trigger.
- X02-AC-7 Given a drawer with unsaved changes, when Esc is pressed, then a discard confirmation is
  shown instead of closing.

## Test hooks
`theme-toggle`, `reading-toggle`, `exit-reading`, `drawer`, `toast`, `confirm-row`, `confirm-yes`,
`error-state`, `error-retry`.

## Out of scope
Per-account preference sync; custom fonts beyond the prototype's three families.

## Open questions
- Should reading mode also offer a font-size step control? (Not in prototype.)
