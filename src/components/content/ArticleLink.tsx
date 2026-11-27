"use client";

/**
 * Internal article link with a hovercard preview (F03-FR-10), per modern-web-guidance "hovercard":
 *  - `interestfor` on the link + `popover="hint"` on the card: shown on hover AND keyboard focus, with
 *    the browser's interest delay; the `interestfor` polyfill loads only where unsupported;
 *  - the link navigates, so the card is `role="tooltip"` + `aria-describedby` (never aria-expanded);
 *  - positioned with CSS anchor positioning; browsers without it simply don't show the card (it is
 *    supplemental — the same information is one click away);
 *  - data loads lazily on first open (TanStack Query, cached for the session — F03-AC-6).
 */
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useId, useRef, useState } from "react";
import { bff } from "@/lib/bff-client";
import type { ArticlePreview } from "@/app/api/bff/articles/[slug]/preview/route";
import styles from "./content.module.css";

export function ArticleLink({ slug, children }: { slug: string; children: React.ReactNode }) {
  const id = `preview-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const card = useRef<HTMLDivElement>(null);
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    const el = card.current;
    if (!el) return;
    // `toggle` doesn't bubble; listen on the popover itself.
    const onToggle = (event: Event) => {
      if ((event as ToggleEvent).newState === "open") setOpened(true);
    };
    el.addEventListener("toggle", onToggle);
    // Interest can fire before hydration attaches the listener: load if the card is already open.
    if (el.matches(":popover-open")) setOpened(true);
    return () => el.removeEventListener("toggle", onToggle);
  }, []);

  const preview = useQuery({
    queryKey: ["article-preview", slug],
    queryFn: () => bff<ArticlePreview>(`/api/bff/articles/${encodeURIComponent(slug)}/preview`),
    enabled: opened,
    staleTime: Infinity,
  });

  return (
    <>
      <Link
        href={`/articles/${slug}`}
        className={styles.internal}
        data-testid="internal-link"
        data-slug={slug}
        aria-describedby={id}
        {...({ interestfor: id } as Record<string, string>)}
      >
        {children}
      </Link>
      <span ref={card} id={id} popover="hint" role="tooltip" className={styles.hovercard} data-testid="link-preview">
        {preview.data ? (
          <>
            <span className={styles.hcMeta}>
              {preview.data.authorName}
              {preview.data.readingTimeMinutes ? ` · ${preview.data.readingTimeMinutes} min read` : ""}
            </span>
            <span className={styles.hcTitle}>{preview.data.title}</span>
            {preview.data.summary && <span className={styles.hcSummary}>{preview.data.summary}</span>}
          </>
        ) : preview.isError ? (
          <span className={styles.hcMeta}>Preview unavailable</span>
        ) : (
          <span className={styles.hcMeta}>Loading preview…</span>
        )}
      </span>
    </>
  );
}
