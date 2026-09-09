import Link from 'next/link'

import type { ArticleReference } from '@/lib/types'

/**
 * One article in a list.
 *
 * The summary is always shown when the backend has one. It is the difference between a reader
 * deciding from the list and a reader opening three articles to find the right one — which is the
 * golden rule's "fewer clicks" applied to the most common surface in the app.
 */
export function ArticleCard({ article }: { article: ArticleReference }) {
  return (
    <article className="border-b border-border py-5 last:border-0">
      <h3 className="text-base font-medium tracking-tight">
        <Link href={`/articles/${article.slug}`} className="hover:underline underline-offset-4">
          {article.title}
        </Link>
      </h3>
      {article.summary ? (
        <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-muted-foreground">
          {article.summary}
        </p>
      ) : null}
      {article.authorName ? (
        <p className="mt-2 text-xs text-muted-foreground">{article.authorName}</p>
      ) : null}
    </article>
  )
}

export function ArticleCardList({
  articles,
  emptyMessage = 'Nothing here yet.',
}: {
  articles: ArticleReference[]
  emptyMessage?: string
}) {
  if (articles.length === 0) {
    return <p className="py-8 text-sm text-muted-foreground">{emptyMessage}</p>
  }
  return (
    <div>
      {articles.map((article) => (
        <ArticleCard key={article.slug} article={article} />
      ))}
    </div>
  )
}
