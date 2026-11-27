"use client";

/**
 * Toasts (X02-FR-8) per modern-web-guidance "persistent-toast-notifications":
 *  - each toast is popover="manual" (no light-dismiss, stackable), inside one labelled region;
 *  - announced with document.ariaNotify() where available, else a pre-rendered live region;
 *  - errors persist until closed; confirmations auto-dismiss after 6 s unless focus is inside;
 *  - never shown while a modal dialog is open (deferred until it closes);
 *  - closing a focused toast moves focus to the next toast or back to where it was.
 * Toast text must always duplicate information available elsewhere in the UI.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./Icon";
import styles from "./Toast.module.css";

type Tone = "ok" | "err" | "info";
type ToastItem = { id: number; message: string; tone: Tone };
type ToastApi = { toast: (message: string, tone?: Tone) => void };

const ToastContext = createContext<ToastApi>({ toast: () => {} });
export const useToast = () => useContext(ToastContext);

const AUTO_DISMISS_MS = 6000;

function announce(message: string, liveRegion: HTMLElement | null) {
  const doc = document as Document & { ariaNotify?: (msg: string) => void };
  if (typeof doc.ariaNotify === "function") {
    doc.ariaNotify(message);
  } else if (liveRegion) {
    liveRegion.textContent = "";
    // Next frame so screen readers notice the change.
    requestAnimationFrame(() => (liveRegion.textContent = message));
  }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const liveRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  const show = useCallback((item: ToastItem) => {
    setItems((current) => [...current, item]);
    announce(item.message, liveRef.current);
  }, []);

  const toast = useCallback(
    (message: string, tone: Tone = "ok") => {
      const item = { id: nextId.current++, message, tone };
      const modal = document.querySelector<HTMLDialogElement>("dialog:modal");
      if (modal) modal.addEventListener("close", () => show(item), { once: true });
      else show(item);
    },
    [show],
  );

  const dismiss = useCallback((id: number) => {
    setItems((current) => {
      const index = current.findIndex((t) => t.id === id);
      const focusedInside = document.activeElement?.closest(`[data-toast-id="${id}"]`);
      if (focusedInside) {
        const next = current[index + 1] ?? current[index - 1];
        requestAnimationFrame(() => {
          const target = next
            ? document.querySelector<HTMLElement>(`[data-toast-id="${next.id}"] button`)
            : returnFocus.current;
          target?.focus();
        });
      }
      return current.filter((t) => t.id !== id);
    });
  }, []);

  useEffect(() => {
    const remember = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-toast-id]")) returnFocus.current = target;
    };
    document.addEventListener("focusin", remember);
    return () => document.removeEventListener("focusin", remember);
  }, []);

  const api = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <section role="region" aria-label="Notifications" className={styles.region}>
        {items.map((item, index) => (
          <ToastView key={item.id} item={item} offset={index} onClose={() => dismiss(item.id)} />
        ))}
      </section>
      <p className="sr-only">Screen reader announcements</p>
      <div ref={liveRef} aria-live="polite" className="sr-only" />
    </ToastContext.Provider>
  );
}

function ToastView({ item, offset, onClose }: { item: ToastItem; offset: number; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el && typeof el.showPopover === "function" && !el.matches(":popover-open, .\\:popover-open")) el.showPopover();
  }, []);

  useEffect(() => {
    if (item.tone === "err") return; // errors persist until dismissed
    let timer = setTimeout(function tick() {
      if (ref.current?.contains(document.activeElement)) timer = setTimeout(tick, 1000);
      else onClose();
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [item.tone, onClose]);

  return (
    <div
      ref={ref}
      popover="manual"
      className={styles.toast}
      data-tone={item.tone}
      data-toast-id={item.id}
      data-testid="toast"
      style={{ insetBlockEnd: `calc(16px + ${offset} * 64px)` }}
    >
      <span className={styles.message}>{item.message}</span>
      <button type="button" className="icon-btn" onClick={onClose} aria-label="Close notification">
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}
