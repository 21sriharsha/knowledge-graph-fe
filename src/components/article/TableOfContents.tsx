"use client";

/**
 * "On this page" (F03-FR-6) per modern-web-guidance "scrollspy": native `scroll-target-group: auto` +
 * `:target-current` where supported; IntersectionObserver fallback elsewhere; `aria-current` mirrored
 * on scroll end for assistive tech (MANDATORY in the guide).
 */
import { useEffect, useRef } from "react";
import styles from "./article.module.css";

export type TocItem = { id: string; text: string; level: number };

export function TableOfContents({ items }: { items: TocItem[] }) {
  const nav = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = nav.current;
    if (!root) return;
    const links = Array.from(root.querySelectorAll<HTMLAnchorElement>("a[href^='#']"));
    const setCurrent = (active: HTMLAnchorElement | null) => {
      for (const link of links) {
        link.setAttribute("aria-current", link === active ? "true" : "false");
        link.classList.toggle("target-current", link === active);
      }
    };

    if (CSS.supports("scroll-target-group: auto")) {
      const sync = () => setCurrent(root.querySelector<HTMLAnchorElement>("a:target-current"));
      sync();
      document.addEventListener("scrollend", sync);
      return () => document.removeEventListener("scrollend", sync);
    }

    const byId = new Map(links.map((l) => [decodeURIComponent(l.hash.slice(1)), l]));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setCurrent(byId.get(entry.target.id) ?? null);
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 },
    );
    for (const id of byId.keys()) {
      const heading = document.getElementById(id);
      if (heading) observer.observe(heading);
    }
    return () => observer.disconnect();
  }, [items]);

  if (items.length < 2) return null;
  return (
    <nav ref={nav} aria-label="On this page" className={styles.toc} data-testid="toc">
      <p className={styles.tocHead}>On this page</p>
      <ol>
        {items.map((item) => (
          <li key={item.id} data-level={item.level}>
            <a href={`#${item.id}`}>{item.text}</a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
