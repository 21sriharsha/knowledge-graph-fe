/**
 * Conditional polyfills (modern-web-guidance: dialog, persistent-toast-notifications, switch).
 * Each loads ONLY when native support is missing — never unconditionally.
 */
export function loadPolyfills(): void {
  if (typeof window === "undefined") return;

  // Popover API — Baseline newly available (2025-01). Detect on HTMLElement.prototype.
  if (!Object.hasOwn(HTMLElement.prototype, "popover")) {
    void import("@oddbird/popover-polyfill");
  }
  // Invoker commands (command/commandfor) — Baseline newly available (2025-12).
  if (!("commandForElement" in HTMLButtonElement.prototype)) {
    void import("invokers-polyfill");
  }
  // Interest invokers (interestfor) for link hovercards — limited availability (Chrome/Edge only).
  if (!("interestForElement" in HTMLButtonElement.prototype)) {
    void import("interestfor");
  }
  // <input type="checkbox" switch> — Safari only today. The recommended `input-switch-polyfill` fetches
  // its stylesheet via `import.meta.resolve`, which bundlers (Turbopack) do not support, and the guidance
  // forbids copying files out of node_modules. So: a minimal fallback instead — switch styling in
  // globals.css under `.switch-fallback`; the <Switch> component renders role="switch" in its markup so
  // assistive tech announces it correctly without touching the DOM before hydration.
  if (!("switch" in HTMLInputElement.prototype)) {
    document.documentElement.classList.add("switch-fallback");
  }
}
