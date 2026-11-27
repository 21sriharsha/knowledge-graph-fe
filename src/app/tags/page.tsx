import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getTags, readSafely } from "@/lib/api/reader";
import { ErrorState } from "@/components/ui/StateView";
import styles from "@/components/reader/taxonomy.module.css";

export const metadata: Metadata = { title: "All tags", alternates: { canonical: "/tags" } };

/** All tags (F04-FR-5), most articles first. */
export default function TagsIndex() {
  return (
    <main id="main" data-view="tags" className={styles.page}>
      <header className={styles.header}>
        <div className="eyebrow">Browse</div>
        <h1 className={styles.title}>All tags</h1>
      </header>
      <Suspense fallback={<div className="skel" style={{ height: 240 }} />}>
        <List />
      </Suspense>
    </main>
  );
}

async function List() {
  const tags = await readSafely(getTags);
  if (!tags.ok) return <ErrorState requestId={tags.requestId} retryHref="/tags" />;
  const entries = [...(tags.data.entries ?? [])].sort((a, b) => (b.articleCount ?? 0) - (a.articleCount ?? 0));
  return (
    <ul className={styles.index} data-testid="tag-index">
      {entries.map((t) => (
        <li key={t.slug}>
          <Link href={`/tags/${t.slug}`}>
            <span className={styles.name}>#{t.name}</span>
            <span className="faint tabular">{t.articleCount}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
