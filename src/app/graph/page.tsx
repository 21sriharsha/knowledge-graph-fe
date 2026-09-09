import type { Metadata } from 'next'
import Link from 'next/link'

import { BackendUnavailable } from '@/components/backend-unavailable'
import { GraphExplorer } from '@/components/graph/graph-explorer'
import { api } from '@/lib/api'
import type { GraphNeighbourhood } from '@/lib/types'

export const metadata: Metadata = { title: 'Graph' }

/**
 * The graph explorer.
 *
 * Without a `?slug=` it opens on a bounded sample of the whole graph rather than a list of links —
 * an explorer whose first screen is a menu makes the reader do the exploring before they can
 * explore. With a slug it centres on that article and its neighbourhood.
 *
 * Depth is a link rather than a slider: it round-trips to the backend anyway, and a real URL keeps
 * every view shareable and back-buttonable.
 */
export default async function GraphPage(props: PageProps<'/graph'>) {
  const params = await props.searchParams
  const slug = typeof params.slug === 'string' ? params.slug : ''
  const depth = Math.min(
    3,
    Math.max(1, Number.parseInt(typeof params.depth === 'string' ? params.depth : '1', 10) || 1),
  )

  let neighbourhood: GraphNeighbourhood
  try {
    neighbourhood = slug ? await api.graphBySlug(slug, depth) : await api.graphOverview(60)
  } catch {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Graph</h1>
        <div className="mt-6">
          <BackendUnavailable what="The graph" />
        </div>
      </div>
    )
  }

  const focus = neighbourhood.nodes.find((node) => node.slug === slug)

  if (neighbourhood.nodes.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Graph</h1>
        <p className="mt-3 text-muted-foreground">
          {slug
            ? 'That article has no connections yet, so there is no neighbourhood to draw.'
            : 'Nothing has been published yet, so there is no graph to explore. Connect a repository in the studio to ingest some articles.'}
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {focus ? focus.title : 'The knowledge graph'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {focus ? (
              <>
                Its neighbourhood, {depth} hop{depth === 1 ? '' : 's'} out.{' '}
                <Link href={`/articles/${focus.slug}`} className="underline underline-offset-4">
                  Read the article
                </Link>
              </>
            ) : (
              'Every published article and the links between them. Pick one to centre on it.'
            )}
          </p>
        </div>

        {slug ? (
          <nav aria-label="Neighbourhood depth" className="flex items-center gap-1.5 text-sm">
            <span className="text-muted-foreground">Depth</span>
            {[1, 2, 3].map((level) => (
              <Link
                key={level}
                href={`/graph?slug=${encodeURIComponent(slug)}&depth=${level}`}
                aria-current={level === depth ? 'page' : undefined}
                className={`rounded-md border px-2.5 py-1 ${
                  level === depth
                    ? 'border-foreground/40 bg-muted font-medium'
                    : 'border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                {level}
              </Link>
            ))}
            <Link
              href="/graph"
              className="ml-2 rounded-md border border-border px-2.5 py-1 text-muted-foreground hover:bg-muted"
            >
              Whole graph
            </Link>
          </nav>
        ) : null}
      </div>

      <div className="mt-6">
        <GraphExplorer
          neighbourhood={neighbourhood}
          focusSlug={focus?.slug}
          depth={focus ? depth : undefined}
        />
      </div>
    </div>
  )
}
