import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getNavigation, getTags, readSafely } from "@/lib/api/reader";
import { serverEnv } from "@/lib/env/server";
import { Explorer, type ExplorerTerm } from "@/components/graph/Explorer";
import { EmptyState, ErrorState } from "@/components/ui/StateView";

export const metadata: Metadata = { title: "Graph", description: "Explore how articles, topics and tags connect." };

/** Graph explorer (F06-FR-9…14). The shell and term lists are cached; graph data loads client-side. */
export default function GraphPage() {
  if (!serverEnv().FEATURE_EXPLORER) notFound();
  return (
    <main id="main" data-view="graph">
      <h1 className="sr-only">Graph explorer</h1>
      <Suspense fallback={<div className="skel" style={{ height: "calc(100dvh - var(--hdr))" }} />}>
        <ExplorerLoader />
      </Suspense>
    </main>
  );
}

async function ExplorerLoader() {
  const [nav, tags] = await Promise.all([readSafely(getNavigation), readSafely(getTags)]);
  if (!nav.ok) return <ErrorState requestId={nav.requestId} retryHref="/graph" />;
  const total = nav.data.publishedArticleCount ?? 0;
  if (total === 0) {
    return <EmptyState testId="empty-graph" title="The graph is empty" body="It fills in as articles are published and link to each other." />;
  }
  const topics: ExplorerTerm[] = (nav.data.topics ?? [])
    .filter((t) => t.slug && t.label)
    .map((t) => ({ id: `topic:${t.slug}`, kind: "topic", slug: t.slug!, name: t.label!, count: t.articleCount ?? 0 }));
  const tagTerms: ExplorerTerm[] = (tags.ok ? (tags.data.entries ?? []) : [])
    .filter((t) => t.slug && t.name)
    .map((t) => ({ id: `tag:${t.slug}`, kind: "tag", slug: t.slug!, name: t.name!, count: t.articleCount ?? 0 }));
  return (
    // useSearchParams in the client explorer requires a Suspense boundary.
    <Suspense fallback={null}>
      <Explorer topics={topics} tags={tagTerms} totalArticles={total} />
    </Suspense>
  );
}
