import type { Metadata } from 'next'
import Link from 'next/link'

import { BackendUnavailable } from '@/components/backend-unavailable'
import { api } from '@/lib/api'
import type { TaxonomyListing } from '@/lib/types'

export const metadata: Metadata = { title: 'Topics' }

/**
 * The browse index.
 *
 * Topics and tags on one page rather than two: they are the same question ("what is written about
 * here"), and splitting them would make the reader navigate twice to answer it.
 */
export default async function TopicsPage() {
  let topics: TaxonomyListing
  let tags: TaxonomyListing
  try {
    ;[topics, tags] = await Promise.all([api.topics(), api.tags()])
  } catch {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Topics</h1>
        <div className="mt-6">
          <BackendUnavailable what="Topics" />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Browse</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Only subjects with published articles are listed.
      </p>

      <section aria-labelledby="topics-heading" className="mt-8">
        <h2 id="topics-heading" className="text-sm font-semibold tracking-tight">
          Topics
        </h2>
        {topics.entries.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No topics yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {topics.entries.map((topic) => (
              <li key={topic.slug} className="py-3">
                <div className="flex items-baseline justify-between gap-4">
                  <Link
                    href={`/topics/${topic.slug}`}
                    className="font-medium hover:underline underline-offset-4"
                  >
                    {topic.name}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {topic.articleCount} article{topic.articleCount === 1 ? '' : 's'}
                  </span>
                </div>
                {topic.description ? (
                  <p className="mt-1 text-sm text-muted-foreground">{topic.description}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="tags-heading" className="mt-10">
        <h2 id="tags-heading" className="text-sm font-semibold tracking-tight">
          Tags
        </h2>
        {tags.entries.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No tags yet.</p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {tags.entries.map((tag) => (
              <li key={tag.slug}>
                <Link
                  href={`/tags/${tag.slug}`}
                  className="inline-flex items-baseline gap-1.5 rounded-md border border-border px-2.5 py-1 text-sm hover:bg-muted"
                >
                  {tag.name}
                  <span className="text-xs text-muted-foreground">{tag.articleCount}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
