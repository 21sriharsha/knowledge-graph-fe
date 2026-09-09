'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

import type { GraphNeighbourhood } from '@/lib/types'
import { GraphCanvas } from './graph-canvas'
import { GraphLegend } from './graph-legend'
import { topicColour, topicsOf } from './topic-colour'

type View = 'all' | 'related' | 'topic'

/**
 * The graph explorer's interactive shell.
 *
 * Filtering happens here, in the browser, over the neighbourhood the server already sent. The data
 * is a few dozen nodes and it is already loaded, so narrowing the view is instant — asking the
 * backend to hide three nodes would turn a glance into a page load.
 *
 * Changing *where you are* is different: that is a real navigation to a different neighbourhood, so
 * it is a link with a URL, and stays shareable and back-buttonable.
 */
export function GraphExplorer({
  neighbourhood,
  focusSlug,
  depth,
}: {
  neighbourhood: GraphNeighbourhood
  focusSlug?: string
  depth?: number
}) {
  const [view, setView] = useState<View>('all')
  const [topicFilter, setTopicFilter] = useState<string | null>(null)

  const focus = neighbourhood.nodes.find((node) => node.slug === focusSlug)
  const topics = topicsOf(neighbourhood.nodes)

  /** Nodes reachable from the focus by a link a person actually wrote. */
  const authoredNeighbourIds = useMemo(() => {
    if (!focus) return new Set<string>()
    const ids = new Set<string>([focus.id])
    for (const edge of neighbourhood.edges) {
      if (!edge.authored) continue
      if (edge.sourceId === focus.id) ids.add(edge.targetId)
      if (edge.targetId === focus.id) ids.add(edge.sourceId)
    }
    return ids
  }, [focus, neighbourhood.edges])

  const visibleIds = useMemo(() => {
    if (topicFilter) {
      return new Set(
        neighbourhood.nodes.filter((node) => node.topic === topicFilter).map((node) => node.id),
      )
    }
    if (!focus || view === 'all') return null
    if (view === 'related') return authoredNeighbourIds
    return new Set(
      neighbourhood.nodes
        .filter((node) => node.id === focus.id || (!!focus.topic && node.topic === focus.topic))
        .map((node) => node.id),
    )
  }, [topicFilter, focus, view, authoredNeighbourIds, neighbourhood.nodes])

  const shownCount = visibleIds ? visibleIds.size : neighbourhood.nodes.length

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
      <div>
        <GraphCanvas
          neighbourhood={neighbourhood}
          focusSlug={focusSlug}
          height={560}
          tone="dark"
          showMiniMap
          visibleIds={visibleIds}
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Showing {shownCount} of {neighbourhood.nodes.length} article
          {neighbourhood.nodes.length === 1 ? '' : 's'}
          {depth ? ` within ${depth} hop${depth === 1 ? '' : 's'}` : ''}. Click a circle to open the
          article; drag to pan.
          {neighbourhood.truncated
            ? ' This is part of a larger graph — some connections are not drawn.'
            : ''}
        </p>
      </div>

      <aside className="space-y-6 text-sm">
        <section>
          <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            View
          </h2>
          <div role="radiogroup" aria-label="Which articles to show" className="mt-2 space-y-1">
            {focus ? (
              <>
                <ViewOption
                  checked={!topicFilter && view === 'all'}
                  onSelect={() => {
                    setTopicFilter(null)
                    setView('all')
                  }}
                  label="All concepts"
                  hint={`${neighbourhood.nodes.length} articles`}
                />
                <ViewOption
                  checked={!topicFilter && view === 'related'}
                  onSelect={() => {
                    setTopicFilter(null)
                    setView('related')
                  }}
                  label="Linked only"
                  hint={`${authoredNeighbourIds.size} written links`}
                />
                <ViewOption
                  checked={!topicFilter && view === 'topic'}
                  onSelect={() => {
                    setTopicFilter(null)
                    setView('topic')
                  }}
                  label="Same topic"
                  hint={focus.topic ?? 'no topic set'}
                  disabled={!focus.topic}
                />
              </>
            ) : (
              <ViewOption
                checked={!topicFilter}
                onSelect={() => setTopicFilter(null)}
                label="All concepts"
                hint={`${neighbourhood.nodes.length} articles`}
              />
            )}
            {topics.map((topic) => (
              <ViewOption
                key={topic}
                checked={topicFilter === topic}
                onSelect={() => setTopicFilter(topic)}
                label={topic}
                swatch={topicColour(topic).dot}
              />
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Focus
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Re-centre the graph on any article.
          </p>
          <ul className="mt-2 space-y-0.5">
            {neighbourhood.nodes.map((node) => {
              const current = node.slug === focusSlug
              return (
                <li key={node.id}>
                  <Link
                    href={`/graph?slug=${encodeURIComponent(node.slug)}`}
                    aria-current={current ? 'page' : undefined}
                    className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${
                      current ? 'bg-muted font-medium' : 'hover:bg-muted'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className="inline-block size-2.5 shrink-0 rounded-full"
                      style={{ background: topicColour(node.topic).dot }}
                    />
                    <span className="truncate">{node.title}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>

        <section className="border-t border-border pt-4">
          {/* Topics are already the View filters above; repeating them here would be noise. */}
          <GraphLegend neighbourhood={neighbourhood} showTopics={false} />
        </section>
      </aside>
    </div>
  )
}

function ViewOption({
  checked,
  onSelect,
  label,
  hint,
  swatch,
  disabled = false,
}: {
  checked: boolean
  onSelect: () => void
  label: string
  hint?: string
  swatch?: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      disabled={disabled}
      onClick={onSelect}
      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left ${
        checked ? 'bg-muted font-medium' : 'hover:bg-muted'
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {swatch ? (
        <span
          aria-hidden="true"
          className="inline-block size-2.5 shrink-0 rounded-full"
          style={{ background: swatch }}
        />
      ) : (
        <span
          aria-hidden="true"
          className={`inline-block size-2.5 shrink-0 rounded-full border ${
            checked ? 'border-foreground bg-foreground' : 'border-muted-foreground/50'
          }`}
        />
      )}
      <span className="truncate">{label}</span>
      {hint ? <span className="ml-auto text-xs text-muted-foreground">{hint}</span> : null}
    </button>
  )
}
