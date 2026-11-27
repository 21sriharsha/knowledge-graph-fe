import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getTopics, readSafely } from "@/lib/api/reader";
import { topicColor } from "@/lib/topic-color";
import { ErrorState } from "@/components/ui/StateView";
import styles from "@/components/reader/taxonomy.module.css";

export const metadata: Metadata = { title: "All topics", alternates: { canonical: "/topics" } };

/** All topics (F04-FR-5), most articles first. */
export default function TopicsIndex() {
  return (
    <main id="main" data-view="topics" className={styles.page}>
      <header className={styles.header}>
        <div className="eyebrow">Browse</div>
        <h1 className={styles.title}>All topics</h1>
      </header>
      <Suspense fallback={<div className="skel" style={{ height: 240 }} />}>
        <List />
      </Suspense>
    </main>
  );
}

async function List() {
  const topics = await readSafely(getTopics);
  if (!topics.ok) return <ErrorState requestId={topics.requestId} retryHref="/topics" />;
  const entries = [...(topics.data.entries ?? [])].sort((a, b) => (b.articleCount ?? 0) - (a.articleCount ?? 0));
  return (
    <ul className={styles.index} data-testid="topic-index">
      {entries.map((t) => (
        <li key={t.slug}>
          <Link href={`/topics/${t.slug}`}>
            <span className="dot" style={{ background: topicColor(t.slug) }} aria-hidden="true" />
            <span className={styles.name}>
              {t.name}
              {t.description && <span className={styles.desc}>{t.description}</span>}
            </span>
            <span className="faint tabular">{t.articleCount}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
