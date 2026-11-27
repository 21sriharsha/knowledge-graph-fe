"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Header.module.css";

/** Primary navigation (modern-web-guidance: navbar) — links stay in Tab order; aria-current marks the page. */
export function NavLinks({ explorer }: { explorer: boolean }) {
  const pathname = usePathname();
  const readActive = pathname === "/" || /^\/(articles|topics|tags|authors)/.test(pathname);
  const graphActive = pathname.startsWith("/graph");
  return (
    <nav aria-label="Primary" className={styles.nav}>
      <Link href="/" aria-current={readActive ? "page" : undefined} data-testid="nav-read">
        Read
      </Link>
      {explorer && (
        <Link href="/graph" aria-current={graphActive ? "page" : undefined} data-testid="nav-graph">
          Graph
        </Link>
      )}
    </nav>
  );
}
