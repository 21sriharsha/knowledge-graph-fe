import type { Metadata } from 'next'
import Link from 'next/link'

import { BackendUnavailable } from '@/components/backend-unavailable'
import { api } from '@/lib/api'
import type { SearchHit, SearchResponse } from '@/lib/types'

export const metadata: Metadata = { title: 'Search' }

/**
 * Search results.
 *
 * A server-rendered page on a real URL, so results are linkable and the back button behaves. The
 * search input itself is the header's client island; this page does no client fetching.
 *
 * The golden rule shows up here more than anywhere else: the backend tells us how it read the query
 * and why each result matched, and both are surfaced. A reader who gets nothing back should learn
 * *why* from this page rather than by searching again differently.
 */
export default async function SearchPage(props: PageProps<'/search'>) {
  const params = await props.searchParams
  const query = typeof params.q === 'string' ? params.q.trim() : ''
  const page = Number.parseInt(typeof params.page === 'string' ? params.page : '0', 10) || 0

  if (!query) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
        <p className="mt-2 text-muted-foreground">
          Search by keyword, or ask in ordinary language — “what has Harsh written about Kubernetes
          networking”. You can also filter directly with{' '}
          <code className="rounded border border-border bg-muted px-1 py-0.5 text-sm">by:name</code>,{' '}
          <code className="rounded border border-border bg-muted px-1 py-0.5 text-sm">tag:name</code>{' '}
          or{' '}
          <code className="rounded border border-border bg-muted px-1 py-0.5 text-sm">topic:name</code>.
        </p>
      </div>
    )
  }

  let response: SearchResponse
  try {
    response = await api.search(query, page)
  } catch {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
        <div className="mt-6">
          <BackendUnavailable what="Results" />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        {response.totalResults > 0
          ? `${response.totalResults} result${response.totalResults === 1 ? '' : 's'}`
          : 'No results'}
        <span className="ml-2 font-normal text-muted-foreground">for “{query}”</span>
      </h1>

      <Interpretation response={response} />

      {response.results.length === 0 ? (
        <EmptyResults response={response} query={query} />
      ) : (
        <ol className="mt-6">
          {response.results.map((hit) => (
            <li key={hit.articleId}>
              <Result hit={hit} />
            </li>
          ))}
        </ol>
      )}

      <Pagination response={response} query={query} />
    </div>
  )
}

/**
 * How the backend read the query, in a sentence.
 *
 * This is the single highest-value thing on the page. Without it, "articles by Harsch about
 * kubernetes" returning nothing looks like a broken search; with it, the reader immediately sees
 * that no author matched and fixes the spelling instead of searching again blind.
 */
function Interpretation({ response }: { response: SearchResponse }) {
  const { interpretation } = response
  const filters: string[] = []

  if (interpretation.author) {
    filters.push(
      interpretation.authorResolved
        ? `written by ${interpretation.author}`
        : `written by ${interpretation.author} — no matching author`,
    )
  }
  if (interpretation.topics.length > 0) filters.push(`about ${interpretation.topics.join(', ')}`)
  if (interpretation.tags.length > 0) filters.push(`tagged ${interpretation.tags.join(', ')}`)

  const authorMissing = Boolean(interpretation.author) && !interpretation.authorResolved

  if (filters.length === 0 && !response.usedQueryUnderstanding) {
    // Nothing was extracted and no model ran: there is nothing to explain, so say nothing rather
    // than pad the page with "we searched for what you typed".
    return null
  }

  return (
    <div
      className={`mt-4 rounded-md border px-4 py-3 text-sm ${
        authorMissing ? 'border-border bg-muted/50' : 'border-border bg-muted/30'
      }`}
    >
      <p>
        <span className="text-muted-foreground">Read as: </span>
        <span className="text-foreground">
          matching “{interpretation.queryText}”
          {filters.length > 0 ? `, ${filters.join(', ')}` : ''}
        </span>
      </p>
      {response.usedQueryUnderstanding ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Interpreted from your question. Retrieval mode: {response.mode.toLowerCase()}.
        </p>
      ) : null}
    </div>
  )
}

/**
 * The empty state, which must explain itself.
 *
 * An unresolvable author filter is the common and confusing case, so it gets a specific message and
 * a one-click way out — searching the same words without the filter, rather than making the reader
 * retype the query.
 */
function EmptyResults({ response, query }: { response: SearchResponse; query: string }) {
  const { interpretation } = response
  const authorMissing = Boolean(interpretation.author) && !interpretation.authorResolved

  return (
    <div className="mt-6 rounded-md border border-border p-6">
      {authorMissing ? (
        <>
          <p className="text-sm">
            Nobody here is called <span className="font-medium">{interpretation.author}</span>, so the
            author filter matched nothing.
          </p>
          <p className="mt-3 text-sm">
            <Link
              href={`/search?q=${encodeURIComponent(interpretation.queryText)}`}
              className="underline underline-offset-4"
            >
              Search for “{interpretation.queryText}” without the author filter
            </Link>
          </p>
        </>
      ) : (
        <>
          <p className="text-sm">Nothing matched “{query}”.</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Try fewer or more general words.</li>
            <li>
              Browse <Link href="/topics" className="underline underline-offset-4">topics</Link> or the{' '}
              <Link href="/articles" className="underline underline-offset-4">full archive</Link>.
            </li>
          </ul>
        </>
      )}
    </div>
  )
}

function Result({ hit }: { hit: SearchHit }) {
  return (
    <article className="border-b border-border py-5 last:border-0">
      <h2 className="text-base font-medium tracking-tight">
        <Link href={`/articles/${hit.slug}`} className="hover:underline underline-offset-4">
          {hit.title}
        </Link>
      </h2>
      {hit.summary ? (
        <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-muted-foreground">{hit.summary}</p>
      ) : null}
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        {hit.authorName ? (
          hit.authorSlug ? (
            <Link href={`/authors/${hit.authorSlug}`} className="hover:text-foreground">
              {hit.authorName}
            </Link>
          ) : (
            <span>{hit.authorName}</span>
          )
        ) : null}
        {hit.publishedAt ? (
          <>
            <span aria-hidden="true">·</span>
            <time dateTime={hit.publishedAt}>
              {new Date(hit.publishedAt).toLocaleDateString('en-GB', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </time>
          </>
        ) : null}
        <span aria-hidden="true">·</span>
        <span>{describeMatch(hit)}</span>
      </div>
    </article>
  )
}

/**
 * Why this result matched, in words.
 *
 * Never the raw score. "0.847" tells a human nothing; "matched text and topic" tells them whether
 * the result is likely to be what they wanted, which is the only question they are asking.
 */
function describeMatch(hit: SearchHit): string {
  const reasons: string[] = []
  const { explanation } = hit

  if (explanation.lexical > 0) reasons.push('text')
  if (explanation.semantic > 0) reasons.push('meaning')
  if (explanation.authorMatch > 0) reasons.push('author')
  if (explanation.topicMatch > 0) reasons.push('topic')
  if (explanation.tagMatch > 0) reasons.push('tag')

  if (reasons.length === 0) return 'matched'
  if (reasons.length === 1) return `matched on ${reasons[0]}`
  return `matched on ${reasons.slice(0, -1).join(', ')} and ${reasons.at(-1)}`
}

function Pagination({ response, query }: { response: SearchResponse; query: string }) {
  const totalPages = Math.ceil(response.totalResults / Math.max(1, response.size))
  if (totalPages <= 1) return null

  const hasPrevious = response.page > 0
  const hasNext = response.page + 1 < totalPages

  return (
    <nav aria-label="Search results pages" className="mt-8 flex items-center justify-between text-sm">
      {hasPrevious ? (
        <Link
          href={`/search?q=${encodeURIComponent(query)}&page=${response.page - 1}`}
          className="rounded-md border border-border px-3 py-1.5 hover:bg-muted"
        >
          Previous
        </Link>
      ) : (
        <span />
      )}
      <span className="text-muted-foreground">
        Page {response.page + 1} of {totalPages}
      </span>
      {hasNext ? (
        <Link
          href={`/search?q=${encodeURIComponent(query)}&page=${response.page + 1}`}
          className="rounded-md border border-border px-3 py-1.5 hover:bg-muted"
        >
          Next
        </Link>
      ) : (
        <span />
      )}
    </nav>
  )
}
