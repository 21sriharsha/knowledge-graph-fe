"use client";

/**
 * Reading mode (X02-FR-5…7), as in the prototype: the header toggle is offered on every page while the
 * light scheme is rendered. The paper palette applies site-wide; the article-only effects (hidden
 * chrome, larger type, the floating exit control) are scoped to article pages. Persists per browser;
 * the pre-paint head script restores it on the next visit.
 */
import { useSyncExternalStore } from "react";
import { Icon } from "@/components/ui/Icon";
import { useRenderedScheme } from "@/components/layout/ThemeToggle";
import styles from "./article.module.css";

const KEY = "reading-mode";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-reading"] });
  return () => observer.disconnect();
}
const isOn = () => document.documentElement.dataset.reading === "on";

function setReading(on: boolean) {
  try {
    if (on) localStorage.setItem(KEY, "on");
    else localStorage.removeItem(KEY);
  } catch {
    // Storage blocked: still apply for this page view.
  }
  if (on) document.documentElement.dataset.reading = "on";
  else delete document.documentElement.dataset.reading;
}

/** Header toggle (prototype placement: immediately before the theme toggle). */
export function ReadingToggle() {
  const scheme = useRenderedScheme();
  const on = useSyncExternalStore(subscribe, isOn, () => false);
  if (scheme !== "light") return null;
  return (
    <button
      type="button"
      className="icon-btn"
      aria-pressed={on}
      onClick={() => setReading(!on)}
      title={on ? "Exit reading mode" : "Reading mode"}
      data-testid="reading-toggle"
    >
      <Icon name="book" />
      <span className="sr-only">Reading mode</span>
    </button>
  );
}

/**
 * The floating "Exit reading mode" control (X02-FR-6), rendered by the article page rather than the
 * header: the header's backdrop-filter makes it the containing block for `position: fixed`
 * descendants, which would pin this button inside the header instead of the viewport corner.
 */
export function ExitReading() {
  const scheme = useRenderedScheme();
  const on = useSyncExternalStore(subscribe, isOn, () => false);
  if (scheme !== "light" || !on) return null;
  return (
    <button
      type="button"
      className={`btn ${styles.exitReading}`}
      onClick={() => setReading(false)}
      data-testid="exit-reading"
    >
      Exit reading mode
    </button>
  );
}
