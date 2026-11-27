import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getNavigation, getTag, readSafely } from "@/lib/api/reader";
import { serverEnv } from "@/lib/env/server";
import { parseSlug } from "@/lib/validation";
import { PostCard } from "@/components/reader/PostCard";
import { TaxonomyHeader } from "@/components/reader/TaxonomyHeader";
import { ErrorState } from "@/components/ui/StateView";
import styles from "@/components/reader/taxonomy.module.css";

type Props = PageProps<"/tags/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = parseSlug((await params).slug);
  const tag = slug ? await readSafely(() => getTag(slug)) : null;
  return tag?.ok ? { title: `#${tag.data.name}`, alternates: { canonical: `/tags/${slug}` } } : { title: "Tag" };
}

/** Tag page (F04-FR-2). */
export default function TagPage({ params }: Props) {
  return (
    <main id="main" data-view="tag" className={styles.page}>
      <Suspense fallback={<div className="skel" style={{ height: 160 }} />}>
        <Tag params={params} />
      </Suspense>
    </main>
  );
}

async function Tag({ params }: { params: Props["params"] }) {
  const slug = parseSlug((await params).slug);
  if (!slug) notFound();
  const [tag, nav] = await Promise.all([readSafely(() => getTag(slug)), readSafely(getNavigation)]);
  if (!tag.ok) {
    if (tag.kind === "not_found") notFound();
    return <ErrorState requestId={tag.requestId} retryHref={`/tags/${slug}`} />;
  }
  const authorSlugs = new Map((nav.ok ? (nav.data.authors ?? []) : []).map((a) => [a.label, a.slug]));
  return (
    <>
      <TaxonomyHeader
        eyebrow="Tag"
        title={`#${tag.data.name ?? slug}`}
        count={tag.data.articleCount}
        graphHref={serverEnv().FEATURE_EXPLORER ? `/graph?focus=tag:${slug}` : undefined}
      />
      {(tag.data.articles ?? []).map((a) => (
        <PostCard key={a.slug} article={a} authorSlug={a.authorName ? authorSlugs.get(a.authorName) : undefined} />
      ))}
    </>
  );
}
