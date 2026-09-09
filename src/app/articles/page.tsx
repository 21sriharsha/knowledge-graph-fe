import type { Metadata } from 'next'
import Link from 'next/link'

import { ArticleCardList } from '@/components/article-card'
import { BackendUnavailable } from '@/components/backend-unavailable'
import { api } from '@/lib/api'
import type { ArticleReference, PageResponse } from '@/lib/types'

export const metadata: Metadata = { title: 'Articles' }

/** The full archive, newest first. Paged, because it has to stay usable as the corpus grows. */
export default async function ArticlesPage(props: PageProps<'/articles'>) {
  const params = await props.searchParams
  const page = Number.parseInt(typeof params.page === 'string' ? params.page : '0', 10) || 0

  let archive: PageResponse<ArticleReference>
  try {
    archive = await api.articles(page, 20)
  } catch {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Articles</h1>
        <div className="mt-6">
          <BackendUnavailable what="The archive" />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Articles</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {archive.totalElements} published, newest first.
      </p>

      <div className="mt-6">
        <ArticleCardList articles={archive.content} emptyMessage="Nothing published yet." />
      </div>

      {archive.totalPages > 1 ? (
        <nav aria-label="Article pages" className="mt-8 flex items-center justify-between text-sm">
          {archive.page > 0 ? (
            <Link
              href={`/articles?page=${archive.page - 1}`}
              className="rounded-md border border-border px-3 py-1.5 hover:bg-muted"
            >
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted-foreground">
            Page {archive.page + 1} of {archive.totalPages}
          </span>
          {!archive.last ? (
            <Link
              href={`/articles?page=${archive.page + 1}`}
              className="rounded-md border border-border px-3 py-1.5 hover:bg-muted"
            >
              Next
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  )
}
