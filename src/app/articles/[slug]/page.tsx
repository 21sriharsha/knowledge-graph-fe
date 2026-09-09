import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ContentBlocks } from '@/components/content/content-blocks'
import { ArticleGraph } from '@/components/graph/article-graph'
import { ApiRequestError, api } from '@/lib/api'
import type { ArticleReadModel, ArticleReference } from '@/lib/types'

/**
 * The article page.
 *
 * **One request.** The backend returns a complete `ArticleReadModel` — body, outline, author,
 * taxonomy, related articles, backlinks, breadcrumbs, previous/next and a bounded graph
 * neighbourhood. Everything on this page comes from that single call, which is the whole point of
 * the read-model architecture (FRONTEND-SPEC §5, §14).
 *
 * **Everything renders at once.** No tabs, no accordions, no "show related". If the data arrived,
 * the reader can see it.
 */

async function loadArticle(slug: string): Promise<ArticleReadModel> {
  try {
    return await api.article(slug)
  } catch (error) {
    if (error instanceof ApiRequestError && error.isNotFound) notFound()
    throw error
  }
}

export async function generateMetadata(props: PageProps<'/articles/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params
  try {
    const article = await api.article(slug)
    return {
      title: article.title,
      description: article.summary ?? undefined,
      alternates: { canonical: `/articles/${article.slug}` },
      openGraph: {
        type: 'article',
        title: article.title,
        description: article.summary ?? undefined,
        publishedTime: article.publishedAt ?? undefined,
        modifiedTime: article.updatedAt ?? undefined,
        authors: article.author.displayName ? [article.author.displayName] : undefined,
        tags: article.tags.map((tag) => tag.name),
      },
    }
  } catch {
    // Metadata must never fail a page render; the page itself reports the real problem.
    return { title: slug }
  }
}

export default async function ArticlePage(props: PageProps<'/articles/[slug]'>) {
  const { slug } = await props.params
  const article = await loadArticle(slug)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Breadcrumbs entries={article.breadcrumbs} />

      <div className="mt-6 gap-10 lg:grid lg:grid-cols-[minmax(0,1fr)_16rem]">
        <article className="min-w-0">
          <header>
            <h1 className="text-3xl font-semibold tracking-tight text-balance">{article.title}</h1>
            {article.summary ? (
              <p className="mt-3 text-lg leading-7 text-muted-foreground">{article.summary}</p>
            ) : null}
            <ArticleMeta article={article} />
          </header>

          {article.unresolvedReferences.length > 0 ? (
            <UnresolvedReferences references={article.unresolvedReferences} />
          ) : null}

          {/* The reading measure is capped here, not on the column, so wide tables and code blocks
              can still use the full width while prose stays readable. */}
          <div className="prose-measure mt-8">
            <ContentBlocks blocks={article.body} />
          </div>

          <PrevNext previous={article.previousArticle} next={article.nextArticle} />
        </article>

        <aside className="mt-12 space-y-8 lg:mt-0">
          {/* Sticky so the outline stays reachable through a long article without scrolling back. */}
          <div className="lg:sticky lg:top-20 lg:space-y-8">
            {article.outline.length > 1 ? <Outline headings={article.outline} /> : null}
            <AuthorPanel article={article} />
            <TaxonomyPanel article={article} />
          </div>
        </aside>
      </div>

      <RelatedSections article={article} />

      {article.graphContext.nodes.length > 1 ? (
        <section className="mt-12 border-t border-border pt-8">
          <h2 className="text-sm font-semibold tracking-tight">Knowledge neighbourhood</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            What this article connects to. Solid lines are links the author wrote; dashed lines are
            connections the platform inferred from shared topics and tags.
          </p>
          <div className="mt-4">
            <ArticleGraph neighbourhood={article.graphContext} focusSlug={article.slug} />
          </div>
        </section>
      ) : null}
    </div>
  )
}

function Breadcrumbs({ entries }: { entries: ArticleReadModel['breadcrumbs'] }) {
  if (entries.length === 0) return null
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        {entries.map((entry, index) => {
          const isLast = index === entries.length - 1
          return (
            <li key={entry.path} className="flex items-center gap-1.5">
              {isLast ? (
                <span aria-current="page" className="text-foreground">
                  {entry.label}
                </span>
              ) : (
                <Link href={entry.path} className="hover:text-foreground">
                  {entry.label}
                </Link>
              )}
              {!isLast ? <span aria-hidden="true">/</span> : null}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function ArticleMeta({ article }: { article: ArticleReadModel }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
      {article.author.slug ? (
        <Link href={`/authors/${article.author.slug}`} className="hover:text-foreground">
          {article.author.displayName}
        </Link>
      ) : (
        <span>{article.author.displayName}</span>
      )}
      {article.publishedAt ? (
        <>
          <span aria-hidden="true">·</span>
          <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
        </>
      ) : null}
      <span aria-hidden="true">·</span>
      <span>{article.readingTimeMinutes} min read</span>
    </div>
  )
}

/**
 * References the author wrote that point at articles which do not exist.
 *
 * Shown to the reader rather than only to the author: it explains why some words in the text look
 * like links but are not, which is otherwise confusing.
 */
function UnresolvedReferences({ references }: { references: string[] }) {
  return (
    <div className="mt-6 rounded-md border border-border bg-muted/30 px-4 py-3 text-sm">
      <p className="text-muted-foreground">
        {references.length === 1 ? 'This article references ' : 'This article references '}
        {references.map((reference, index) => (
          <span key={reference}>
            {index > 0 ? (index === references.length - 1 ? ' and ' : ', ') : ''}
            <span className="text-foreground">{reference}</span>
          </span>
        ))}
        {references.length === 1 ? ', which has not been written yet.' : ', which have not been written yet.'}
      </p>
    </div>
  )
}

function Outline({ headings }: { headings: ArticleReadModel['outline'] }) {
  return (
    <nav aria-labelledby="outline-heading">
      <h2 id="outline-heading" className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        On this page
      </h2>
      <ul className="mt-3 space-y-1.5 text-sm">
        {headings.map((heading) => (
          <li key={heading.anchorId} style={{ paddingLeft: `${Math.max(0, heading.level - 1) * 12}px` }}>
            <a
              href={`#${heading.anchorId}`}
              className="block text-muted-foreground hover:text-foreground"
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function AuthorPanel({ article }: { article: ArticleReadModel }) {
  return (
    <section aria-labelledby="author-heading">
      <h2 id="author-heading" className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Author
      </h2>
      <p className="mt-3 text-sm">
        {article.author.slug ? (
          <Link href={`/authors/${article.author.slug}`} className="hover:underline underline-offset-4">
            {article.author.displayName}
          </Link>
        ) : (
          article.author.displayName
        )}
      </p>
    </section>
  )
}

function TaxonomyPanel({ article }: { article: ArticleReadModel }) {
  if (article.topics.length === 0 && article.tags.length === 0) return null
  return (
    <section aria-labelledby="taxonomy-heading">
      <h2 id="taxonomy-heading" className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Filed under
      </h2>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {article.topics.map((topic) => (
          <Link
            key={`topic-${topic.slug}`}
            href={`/topics/${topic.slug}`}
            className="rounded-md border border-border px-2 py-0.5 text-xs hover:bg-muted"
          >
            {topic.name}
          </Link>
        ))}
        {article.tags.map((tag) => (
          <Link
            key={`tag-${tag.slug}`}
            href={`/tags/${tag.slug}`}
            className="rounded-md border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted"
          >
            {tag.name}
          </Link>
        ))}
      </div>
    </section>
  )
}

function RelatedSections({ article }: { article: ArticleReadModel }) {
  const hasRelated = article.relatedArticles.length > 0
  const hasBacklinks = article.backlinks.length > 0
  if (!hasRelated && !hasBacklinks) return null

  return (
    <div className="mt-12 grid gap-10 border-t border-border pt-8 sm:grid-cols-2">
      {hasRelated ? (
        <section aria-labelledby="related-heading">
          <h2 id="related-heading" className="text-sm font-semibold tracking-tight">
            Related reading
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">Shares topics or tags with this article.</p>
          <ul className="mt-3 space-y-2 text-sm">
            {article.relatedArticles.map((related) => (
              <li key={related.slug}>
                <Link href={`/articles/${related.slug}`} className="hover:underline underline-offset-4">
                  {related.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {hasBacklinks ? (
        <section aria-labelledby="backlinks-heading">
          <h2 id="backlinks-heading" className="text-sm font-semibold tracking-tight">
            Linked from
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Articles whose authors linked here directly.
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {article.backlinks.map((backlink) => (
              <li key={backlink.slug}>
                <Link href={`/articles/${backlink.slug}`} className="hover:underline underline-offset-4">
                  {backlink.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

function PrevNext({
  previous,
  next,
}: {
  previous?: ArticleReference | null
  next?: ArticleReference | null
}) {
  if (!previous && !next) return null
  return (
    <nav
      aria-label="Article navigation"
      className="mt-12 grid gap-4 border-t border-border pt-6 sm:grid-cols-2"
    >
      {previous ? (
        <Link href={`/articles/${previous.slug}`} className="group rounded-md border border-border p-4">
          <span className="text-xs text-muted-foreground">Previous</span>
          <span className="mt-1 block text-sm font-medium group-hover:underline underline-offset-4">
            {previous.title}
          </span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link
          href={`/articles/${next.slug}`}
          className="group rounded-md border border-border p-4 sm:text-right"
        >
          <span className="text-xs text-muted-foreground">Next</span>
          <span className="mt-1 block text-sm font-medium group-hover:underline underline-offset-4">
            {next.title}
          </span>
        </Link>
      ) : (
        <span />
      )}
    </nav>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
