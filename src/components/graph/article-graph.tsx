import Link from 'next/link'

import type { GraphNeighbourhood } from '@/lib/types'
import { GraphCanvas } from './graph-canvas'
import { GraphLegend } from './graph-legend'

/**
 * An article's own neighbourhood, as shown on the article page.
 *
 * A Server Component: only the canvas inside it is interactive, so the list, the legend and the
 * links ship as HTML. Clicking a node opens that article — the graph is navigation, not ornament.
 *
 * The list beside the canvas is not a fallback. It is always rendered, is keyboard-navigable, and
 * is genuinely the faster route for anyone who just wants to click through.
 */
export function ArticleGraph({
  neighbourhood,
  focusSlug,
  height = 340,
}: {
  neighbourhood: GraphNeighbourhood
  focusSlug: string
  height?: number
}) {
  const neighbours = neighbourhood.nodes.filter((node) => node.slug !== focusSlug)
  const authoredIds = new Set(
    neighbourhood.edges
      .filter((edge) => edge.authored)
      .flatMap((edge) => [edge.sourceId, edge.targetId]),
  )

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_15rem]">
      <GraphCanvas neighbourhood={neighbourhood} focusSlug={focusSlug} height={height} />

      <div className="text-sm">
        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Connected articles
        </h3>
        <ul className="mt-3 space-y-2">
          {neighbours.map((node) => (
            <li key={node.id}>
              <Link href={`/articles/${node.slug}`} className="underline-offset-4 hover:underline">
                {node.title}
              </Link>
              <span className="ml-1.5 text-xs text-muted-foreground">
                {authoredIds.has(node.id) ? 'linked' : 'related'}
              </span>
            </li>
          ))}
        </ul>

        {neighbourhood.truncated ? (
          <p className="mt-4 text-xs text-muted-foreground">
            Showing part of a larger neighbourhood — some connections are not drawn.
          </p>
        ) : null}

        <div className="mt-4 border-t border-border pt-3">
          <GraphLegend neighbourhood={neighbourhood} />
        </div>
      </div>
    </div>
  )
}
