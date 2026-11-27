import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getArticle, readSafely } from "@/lib/api/reader";
import { serverEnv } from "@/lib/env/server";
import { clientEnv } from "@/lib/env/client";
import { parseSlug } from "@/lib/validation";
import { ArticleBody } from "@/components/content/ArticleBody";
import { CopyButton } from "@/components/content/CopyButton";
import { CopyCommands } from "@/components/content/CopyCommands";
import { TableOfContents } from "@/components/article/TableOfContents";
import { ViewTracker } from "@/components/article/ViewTracker";
import { ReadingToggle } from "@/components/article/ReadingToggle";
import { LocalGraphPanel } from "@/components/article/LocalGraphPanel";
import { Avatar, TagChip, TopicChip } from "@/components/ui/Chips";
import { ErrorState } from "@/components/ui/StateView";
import { Icon } from "@/components/ui/Icon";
import styles from "@/components/article/article.module.css";

type Props = PageProps<"/articles/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = parseSlug((await params).slug);
  if (!slug) return { title: "Not found" };
  const article = await readSafely(() => getArticle(slug));
  if (!article.ok) return { title: "Article" };
  const a = article.data;
  return {
    title: a.title,
    description: a.summary,
    alternates: { canonical: `/articles/${slug}` },
    openGraph: { type: "article", title: a.title, description: a.summary, publishedTime: a.publishedAt, authors: a.author?.displayName ? [a.author.displayName] : undefined },
  };
}

/** Article reader (F03). Params are awaited inside <Suspense> so unknown slugs still get the app shell. */
export default function ArticlePage({ params }: Props) {
  return (
    <main id="main" data-view="article" className={styles.page}>
      <div className={styles.progress} aria-hidden="true" />
      <Suspense fallback={<ArticleSkeleton />}>
        <Article params={params} />
      </Suspense>
    </main>
  );
}

const dateFormat = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const formatDate = (iso?: string) => (iso ? dateFormat.format(new Date(iso)) : undefined);

async function Article({ params }: { params: Props["params"] }) {
  const slug = parseSlug((await params).slug);
  if (!slug) notFound();
  const result = await readSafely(() => getArticle(slug));
  if (!result.ok) {
    if (result.kind === "not_found") notFound();
    return <ErrorState requestId={result.requestId} retryHref={`/articles/${slug}`} />;
  }
  const a = result.data;
  const title = a.title ?? slug;
  const explorer = serverEnv().FEATURE_EXPLORER;
  const published = formatDate(a.publishedAt);
  const updated = formatDate(a.updatedAt);
  const toc = (a.outline ?? [])
    .filter((h) => h.anchorId && h.text && (h.level === 2 || h.level === 3))
    .map((h) => ({ id: h.anchorId!, text: h.text!, level: h.level! }));
  const primaryTopic = a.topics?.[0];
  const url = `${clientEnv().NEXT_PUBLIC_SITE_URL}/articles/${slug}`;

  return (
    <div className={`wrap ${styles.layout}`}>
      <aside className={styles.tocCol}>
        <TableOfContents items={toc} />
      </aside>

      <article className={styles.article}>
        {a.breadcrumbs?.length ? (
          <nav aria-label="Breadcrumb" className={styles.crumbs} data-testid="breadcrumbs">
            <ol>
              {a.breadcrumbs.slice(0, -1).map((b) => (
                <li key={b.path}>
                  <Link href={b.path ?? "/"}>{b.label}</Link>
                </li>
              ))}
            </ol>
          </nav>
        ) : null}

        <header className={styles.header}>
          <h1 className={styles.title} data-testid="article-title">
            {title}
          </h1>
          {a.summary && <p className={styles.summary}>{a.summary}</p>}
          <div className={styles.byline} data-testid="byline">
            {a.author?.displayName && <Avatar name={a.author.displayName} size={36} />}
            <div>
              {a.author?.slug ? (
                <Link href={`/authors/${a.author.slug}`} className={styles.author}>
                  {a.author.displayName}
                </Link>
              ) : (
                <span className={styles.author}>{a.author?.displayName}</span>
              )}
              <div className="faint">
                {published && <time dateTime={a.publishedAt}>{published}</time>}
                {updated && updated !== published && (
                  <>
                    {" "}
                    · Updated <time dateTime={a.updatedAt}>{updated}</time>
                  </>
                )}
                {a.readingTimeMinutes ? <span data-testid="reading-time"> · {a.readingTimeMinutes} min read</span> : null}
              </div>
            </div>
            <div className={styles.actions}>
              <span id={`url-${slug}`} hidden>
                {url}
              </span>
              <CopyButton targetId={`url-${slug}`} label="Copy link to this article" testId="copy-link" />
              {explorer && primaryTopic?.slug && (
                <Link className="icon-btn" href={`/graph?focus=topic:${primaryTopic.slug}`} title="Open in graph" data-testid="open-in-graph">
                  <Icon name="graph" />
                  <span className="sr-only">Open in graph</span>
                </Link>
              )}
              <ReadingToggle />
            </div>
          </div>
          {(a.topics?.length || a.tags?.length) && (
            <div className={styles.tax} data-testid="article-tags">
              {a.topics?.map((t) => t.slug && <TopicChip key={t.slug} slug={t.slug} name={t.name ?? t.slug} />)}
              {a.tags?.map((t) => t.slug && <TagChip key={t.slug} slug={t.slug} name={t.name ?? t.slug} />)}
            </div>
          )}
        </header>

        {toc.length >= 2 && (
          <details className={styles.mobileToc} data-testid="toc-mobile">
            <summary>On this page</summary>
            <ol>
              {toc.map((item) => (
                <li key={item.id} data-level={item.level}>
                  <a href={`#${item.id}`}>{item.text}</a>
                </li>
              ))}
            </ol>
          </details>
        )}

        <ArticleBody blocks={a.body ?? []} slug={slug} title={title} />

        <footer className={styles.after}>
          {a.backlinks?.length ? (
            <section data-testid="backlinks">
              <h2>
                Linked from {a.backlinks.length} {a.backlinks.length === 1 ? "article" : "articles"}
              </h2>
              <ul className={styles.refList}>
                {a.backlinks.map((b) => (
                  <li key={b.slug}>
                    <Link href={`/articles/${b.slug}`}>{b.title}</Link>
                    {b.summary && <p>{b.summary}</p>}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {a.unresolvedReferences?.length ? (
            <section data-testid="unresolved">
              <h2>Mentioned but not written yet</h2>
              <ul className={styles.ghostList}>
                {a.unresolvedReferences.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {a.relatedArticles?.length ? (
            <section data-testid="related">
              <h2>Related</h2>
              <ul className={styles.refList}>
                {a.relatedArticles.map((r) => (
                  <li key={r.slug}>
                    <Link href={`/articles/${r.slug}`}>{r.title}</Link>
                    <span className="faint"> · {r.authorName}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {(a.previousArticle?.slug || a.nextArticle?.slug) && (
            <nav aria-label="More in this topic" className={styles.prevNext} data-testid="prev-next">
              {a.previousArticle?.slug ? (
                <Link href={`/articles/${a.previousArticle.slug}`} rel="prev">
                  <span className="faint">Previous</span>
                  {a.previousArticle.title}
                </Link>
              ) : (
                <span />
              )}
              {a.nextArticle?.slug && (
                <Link href={`/articles/${a.nextArticle.slug}`} rel="next" className={styles.next}>
                  <span className="faint">Next</span>
                  {a.nextArticle.title}
                </Link>
              )}
            </nav>
          )}
        </footer>
      </article>

      <aside className={styles.rail}>
        <LocalGraphPanel slug={slug} initial={a.graphContext} explorer={explorer} />
      </aside>

      <CopyCommands />
      <ViewTracker slug={slug} />
    </div>
  );
}

function ArticleSkeleton() {
  return (
    <div className="wrap" aria-hidden="true" style={{ maxWidth: "var(--col)", paddingBlock: 48, display: "grid", gap: 14 }}>
      <div className="skel" style={{ height: 40, width: "80%" }} />
      <div className="skel" style={{ height: 18, width: "60%" }} />
      <div className="skel" style={{ height: 300 }} />
    </div>
  );
}
