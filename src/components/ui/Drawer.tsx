"use client";

/**
 * Side drawer = native modal <dialog> (modern-web-guidance: dialog; ADR 0004).
 *  - showModal(): the browser provides inert page, focus containment, top layer, Esc/back gesture and
 *    focus return — no role/aria-modal/focus-trap/Esc handler here.
 *  - Named by its <h1> (aria-labelledby). Scroll containment CSS so the page doesn't scroll behind it.
 *  - Unsaved changes: the `cancel` event (Esc, back gesture, Close button via requestClose) is
 *    intercepted and a visible confirmation shown instead (X02-FR-11). The message space is reserved so
 *    buttons never move under the pointer, and Discard is announced via aria-describedby.
 */
import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "./Icon";
import styles from "./Drawer.module.css";

export function Drawer({
  open,
  onClose,
  title,
  dirty = false,
  children,
  testId = "drawer",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  dirty?: boolean;
  children: React.ReactNode;
  testId?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const warnId = useId();
  const [confirming, setConfirming] = useState(false);
  const dirtyRef = useRef(dirty);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const onCancel = (event: Event) => {
      if (dirtyRef.current) {
        event.preventDefault();
        setConfirming(true);
      }
    };
    const onCloseEvent = () => {
      setConfirming(false);
      onClose();
    };
    dialog.addEventListener("cancel", onCancel);
    dialog.addEventListener("close", onCloseEvent);
    return () => {
      dialog.removeEventListener("cancel", onCancel);
      dialog.removeEventListener("close", onCloseEvent);
    };
  }, [onClose]);

  const requestClose = () => {
    const dialog = ref.current as (HTMLDialogElement & { requestClose?: () => void }) | null;
    if (!dialog) return;
    if (typeof dialog.requestClose === "function") dialog.requestClose();
    else if (dirtyRef.current) setConfirming(true);
    else dialog.close();
  };

  return (
    <dialog ref={ref} className={styles.drawer} aria-labelledby={titleId} data-testid={testId}>
      <header className={styles.head}>
        <h1 id={titleId}>{title}</h1>
        <button type="button" className="icon-btn" onClick={requestClose} aria-label="Close">
          <Icon name="close" />
        </button>
      </header>
      <div className={styles.confirm} style={{ visibility: confirming ? "visible" : "hidden" }}>
        <p id={warnId} role={confirming ? "alert" : undefined}>
          You have unsaved changes.
        </p>
        <button type="button" className="btn" data-variant="danger" data-size="sm" aria-describedby={warnId} onClick={() => ref.current?.close()} tabIndex={confirming ? 0 : -1}>
          Discard
        </button>
        <button type="button" className="btn" data-size="sm" onClick={() => setConfirming(false)} tabIndex={confirming ? 0 : -1} autoFocus={confirming}>
          Keep editing
        </button>
      </div>
      <div className={styles.body}>{open && children}</div>
    </dialog>
  );
}
