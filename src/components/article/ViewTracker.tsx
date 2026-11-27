"use client";

import { useEffect } from "react";

/**
 * Fire-and-forget view count (F03-FR-9): one POST per page view, only after the page has been visible
 * for 3 s (bounces and prerenders don't count). Failures are ignored by design.
 */
export function ViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    const doc = document as Document & { prerendering?: boolean };
    let sent = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const send = () => {
      if (sent) return;
      sent = true;
      void fetch(`/api/bff/views/${encodeURIComponent(slug)}`, { method: "POST", keepalive: true }).catch(() => {});
    };
    const arm = () => {
      clearTimeout(timer);
      if (document.visibilityState === "visible" && !doc.prerendering) timer = setTimeout(send, 3000);
    };
    arm();
    document.addEventListener("visibilitychange", arm);
    document.addEventListener("prerenderingchange", arm);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", arm);
      document.removeEventListener("prerenderingchange", arm);
    };
  }, [slug]);
  return null;
}
