"use client";

/**
 * Two-state colour-scheme toggle (modern-web-guidance: dark-mode-toggle, X02-FR-3):
 *  - states are "system" (nothing stored) and an override stored literally ("light" | "dark");
 *  - toggling targets the opposite of what is RENDERED; if that equals the system preference the
 *    override is removed instead of stored (so the site follows the OS again);
 *  - a stored value is never removed retroactively when the OS later matches it;
 *  - syncs across tabs via the storage event.
 * Reading mode is light-only, so switching to dark clears its flag on <html> (X02-AC-3).
 */
import { useEffect, useSyncExternalStore } from "react";
import { Icon } from "@/components/ui/Icon";

const KEY = "color-scheme";
const media = () => window.matchMedia("(prefers-color-scheme: dark)");

function readStored(): "light" | "dark" | null {
  try {
    const value = localStorage.getItem(KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

function apply(stored: "light" | "dark" | null) {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
  if (meta) meta.content = stored ?? "light dark";
  const dark = stored ? stored === "dark" : media().matches;
  let readingWanted = false;
  try {
    readingWanted = localStorage.getItem("reading-mode") === "on";
  } catch {}
  if (!dark && readingWanted) document.documentElement.dataset.reading = "on";
  else delete document.documentElement.dataset.reading;
  window.dispatchEvent(new Event("kg:scheme"));
}

function subscribe(onChange: () => void) {
  const mq = media();
  mq.addEventListener("change", onChange);
  window.addEventListener("kg:scheme", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    mq.removeEventListener("change", onChange);
    window.removeEventListener("kg:scheme", onChange);
    window.removeEventListener("storage", onChange);
  };
}

const noopSubscribe = () => () => {};

/** Rendered scheme: stored override, else system preference. */
export function useRenderedScheme(): "light" | "dark" {
  return useSyncExternalStore(
    subscribe,
    () => readStored() ?? (media().matches ? "dark" : "light"),
    () => "light",
  );
}

export function ThemeToggle() {
  const rendered = useRenderedScheme();
  // True only after hydration, without a setState-in-effect (the icon depends on client-only state).
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === KEY || event.key === "reading-mode") apply(readStored());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggle = () => {
    const target = rendered === "dark" ? "light" : "dark";
    const system = media().matches ? "dark" : "light";
    try {
      if (target === system) localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, target);
    } catch {
      // Storage blocked: still apply for this page view.
    }
    apply(target === system ? null : target);
  };

  const next = rendered === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      className="icon-btn"
      onClick={toggle}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      data-testid="theme-toggle"
      suppressHydrationWarning
    >
      {mounted && <Icon name={rendered === "dark" ? "sun" : "moon"} />}
    </button>
  );
}
