import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getAuthorPage, readSafely } from "@/lib/api/reader";
import { parseSlug } from "@/lib/validation";
import { PostCard } from "@/components/reader/PostCard";
import { Avatar, TopicChip } from "@/components/ui/Chips";
import { ErrorState } from "@/components/ui/StateView";
import styles from "@/components/reader/taxonomy.module.css";

type Props = PageProps<"/authors/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = parseSlug((await params).slug);
  const author = slug ? await readSafely(() => getAuthorPage(slug)) : null;
  return author?.ok
    ? { title: author.data.displayName, description: author.data.biography, alternates: { canonical: `/authors/${slug}` } }
    : { title: "Author" };
}

/** Author page (F04-FR-3). */
export default function AuthorPage({ params }: Props) {
  return (
    <main id="main" data-view="author" className={styles.page}>
      <Suspense fallback={<div className="skel" style={{ height: 160 }} />}>
        <Author params={params} />
      </Suspense>
    </main>
  );
}

const joined = new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" });

async function Author({ params }: { params: Props["params"] }) {
  const slug = parseSlug((await params).slug);
  if (!slug) notFound();
  const author = await readSafely(() => getAuthorPage(slug));
  if (!author.ok) {
    if (author.kind === "not_found") notFound();
    return <ErrorState requestId={author.requestId} retryHref={`/authors/${slug}`} />;
  }
  const a = author.data;
  const name = a.displayName ?? slug;
  return (
    <>
      <header className={styles.header}>
        <div className={styles.authorHead}>
          <Avatar name={name} size={64} />
          <div>
            <div className="eyebrow">Author</div>
            <h1 className={styles.title}>{name}</h1>
            <div className={styles.meta}>
              <span className="tabular">
                {a.articleCount ?? 0} {a.articleCount === 1 ? "article" : "articles"}
              </span>
              {a.joinedAt && <span>Joined {joined.format(new Date(a.joinedAt))}</span>}
            </div>
          </div>
        </div>
        {a.biography && (
          <p className={styles.description} style={{ marginTop: 16, whiteSpace: "pre-line" }}>
            {a.biography}
          </p>
        )}
        {a.topics?.length ? (
          <div className={styles.chips}>{a.topics.map((t) => t.slug && <TopicChip key={t.slug} slug={t.slug} name={t.name ?? t.slug} />)}</div>
        ) : null}
      </header>
      {(a.articles ?? []).map((article) => (
        <PostCard key={article.slug} article={article} authorSlug={slug} />
      ))}
    </>
  );
}
