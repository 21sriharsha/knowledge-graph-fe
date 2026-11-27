import Link from "next/link";
import { Suspense } from "react";
import { LegacyRedirect } from "@/app/_components/LegacyRedirect";
import type { Metadata } from "next";
import styles from "@/components/ui/StateView.module.css";

export const metadata: Metadata = { title: "Not found", robots: { index: false } };

/** 404 with a way forward (X04-FR-5). */
export default function NotFound() {
  return (
    <main id="main" data-view="not-found">
      <Suspense fallback={null}>
        <LegacyRedirect />
      </Suspense>
      <section className={styles.state} data-testid="not-found">
        <h2>We couldn&apos;t find that page</h2>
        <p>It may have been unpublished or moved. Try searching instead.</p>
        <form action="/search" method="get" role="search" style={{ display: "flex", gap: 8, width: "100%", maxWidth: 380 }}>
          <label className="sr-only" htmlFor="nf-q">
            Search articles
          </label>
          <input
            id="nf-q"
            name="q"
            type="search"
            maxLength={200}
            placeholder="Search articles"
            style={{ flex: 1, height: 36, borderRadius: 999, border: "1px solid var(--line-strong)", padding: "0 14px", background: "var(--surface)" }}
          />
          <button className="btn" type="submit">
            Search
          </button>
        </form>
        <Link href="/">Back to the home page</Link>
      </section>
    </main>
  );
}
