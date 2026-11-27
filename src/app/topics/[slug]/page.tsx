import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getNavigation, getTopic, readSafely } from "@/lib/api/reader";
import { serverEnv } from "@/lib/env/server";
import { parseSlug } from "@/lib/validation";
import { topicColor } from "@/lib/topic-color";
import { PostCard } from "@/components/reader/PostCard";
import { TaxonomyHeader } from "@/components/reader/TaxonomyHeader";
import { ErrorState } from "@/components/ui/StateView";
import styles from "@/components/reader/taxonomy.module.css";

type Props = PageProps<"/topics/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = parseSlug((await params).slug);
  const topic = slug ? await readSafely(() => getTopic(slug)) : null;
  return topic?.ok ? { title: topic.data.name, description: topic.data.description, alternates: { canonical: `/topics/${slug}` } } : { title: "Topic" };
}

/** Topic page (F04-FR-1). */
export default function TopicPage({ params }: Props) {
  return (
    <main id="main" data-view="topic" className={styles.page}>
      <Suspense fallback={<div className="skel" style={{ height: 160 }} />}>
        <Topic params={params} />
      </Suspense>
    </main>
  );
}

async function Topic({ params }: { params: Props["params"] }) {
  const slug = parseSlug((await params).slug);
  if (!slug) notFound();
  const [topic, nav] = await Promise.all([readSafely(() => getTopic(slug)), readSafely(getNavigation)]);
  if (!topic.ok) {
    if (topic.kind === "not_found") notFound();
    return <ErrorState requestId={topic.requestId} retryHref={`/topics/${slug}`} />;
  }
  const authorSlugs = new Map((nav.ok ? (nav.data.authors ?? []) : []).map((a) => [a.label, a.slug]));
  return (
    <>
      <TaxonomyHeader
        eyebrow="Topic"
        title={topic.data.name ?? slug}
        description={topic.data.description}
        count={topic.data.articleCount}
        color={topicColor(slug)}
        graphHref={serverEnv().FEATURE_EXPLORER ? `/graph?focus=topic:${slug}` : undefined}
      />
      {(topic.data.articles ?? []).map((a) => (
        <PostCard key={a.slug} article={a} authorSlug={a.authorName ? authorSlugs.get(a.authorName) : undefined} />
      ))}
    </>
  );
}
