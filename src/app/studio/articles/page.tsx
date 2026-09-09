import type { Metadata } from 'next'
import Link from 'next/link'

import { ApiRequestError, api } from '@/lib/api'
import type { ArticleResponse, PageResponse } from '@/lib/types'

export const metadata: Metadata = { title: 'Articles · Studio' }

/**
 * The editorial article list.
 *
 * Distinct from the public archive: it shows publication state and where each article came from in
 * the repository, which is what an author needs when reconciling "what did I commit" against "what
 * is live".
 */
export default async function StudioArticlesPage(props: PageProps<'/studio/articles'>) {
  const params = await props.searchParams
  const page = Number.parseInt(typeof params.page === 'string' ? params.page : '0', 10) || 0

  let articles: PageResponse<ArticleResponse>
  try {
    articles = await api.studio.articles(page, 25)
  } catch (error) {
    const message =
      error instanceof ApiRequestError && error.code === 'STUDIO_CREDENTIALS_MISSING'
        ? 'Studio credentials are not configured.'
        : 'Articles could not be loaded.'
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <Link href="/studio" className="text-sm text-muted-foreground hover:text-foreground">
          ← Studio
        </Link>
        <div role="alert" className="mt-6 rounded-md border border-border bg-muted/50 p-6 text-sm">
          {message}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link href="/studio" className="text-sm text-muted-foreground hover:text-foreground">
        ← Studio
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Articles</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {articles.totalElements} article{articles.totalElements === 1 ? '' : 's'} ingested.
      </p>

      {articles.content.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          Nothing ingested yet. Connect a repository and sync it.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-border">
          {articles.content.map((article) => (
            <li key={article.id} className="py-4">
              <div className="flex items-baseline justify-between gap-4">
                <Link
                  href={`/articles/${article.slug}`}
                  className="font-medium hover:underline underline-offset-4"
                >
                  {article.title}
                </Link>
                <span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-xs text-muted-foreground">
                  {article.publicationState.toLowerCase()}
                </span>
              </div>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {article.sourcePath ?? 'authored in place'} · revision {article.revisionNumber}
                {article.sourceRevision ? ` · ${article.sourceRevision.slice(0, 8)}` : ''}
              </p>
              {article.topics.length > 0 || article.tags.length > 0 ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {[...article.topics, ...article.tags].join(', ')}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
