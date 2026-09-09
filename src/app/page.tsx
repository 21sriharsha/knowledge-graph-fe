import Link from 'next/link'
import { Suspense } from 'react'

import { BackendUnavailable } from '@/components/backend-unavailable'
import { GraphCanvas } from '@/components/graph/graph-canvas'
import { topicColour } from '@/components/graph/topic-colour'
import { SearchBox } from '@/components/search/search-box'
import { api } from '@/lib/api'
import type {
  ArticleReference,
  GraphNeighbourhood,
  TaxonomyListing,
  TrendingArticle,
} from '@/lib/types'

/**
 * The landing page.
 *
 * The graph is the product, so the graph is the centrepiece — a first-time visitor should be able
 * to see what this place is without reading a paragraph about it. Search sits directly under the
 * title because it is the fastest route in, and the three columns below carry real content rather
 * than being signposts: everything on this page is one click from something to read.
 *
 * Four concurrent requests, all cached backend-side.
 */
export default async function HomePage() {
  let articles: ArticleReference[] = []
  let topics: TaxonomyListing = { entries: [] }
  let graph: GraphNeighbourhood | null = null
  let trending: TrendingArticle[] = []
  let unavailable = false

  try {
    const [archive, taxonomy, overview, mostRead] = await Promise.all([
      api.articles(0, 6),
      api.topics(),
      api.graphOverview(40),
      api.trending(7, 6),
    ])
    articles = archive.content
    topics = taxonomy
    graph = overview
    trending = mostRead
  } catch {
    unavailable = true
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <section className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Knowledge, connected
        </h1>
        <p className="mt-3 text-lg text-muted-foreground text-balance">
          Durable technical writing, linked to the ideas around it. Ask a question, or follow the
          links.
        </p>
        <div className="mx-auto mt-7 max-w-xl">
          <Suspense fallback={<div className="h-12 rounded-full border border-border" />}>
            <SearchBox size="hero" />
          </Suspense>
        </div>
      </section>

      {unavailable ? (
        <div className="mt-12">
          <BackendUnavailable what="The knowledge base" />
        </div>
      ) : (
        <>
          {graph && graph.nodes.length > 0 ? (
            <section aria-labelledby="graph-heading" className="mt-10">
              <GraphCanvas
                neighbourhood={graph}
                height={440}
                layout="force"
                showControls={false}
              />
              <div className="mt-3 text-center">
                <h2 id="graph-heading" className="sr-only">
                  The knowledge graph
                </h2>
                <Link
                  href="/graph"
                  className="text-sm font-medium underline-offset-4 hover:underline"
                >
                  Explore the graph →
                </Link>
              </div>
            </section>
          ) : null}

          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <Panel
              title="Latest"
              hint="New articles and updates"
              moreHref="/articles"
              moreLabel="All articles"
              emptyMessage="Nothing published yet. Connect a repository in the studio."
            >
              {articles.map((article) => (
                <li key={article.slug}>
                  <Link
                    href={`/articles/${article.slug}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {article.title}
                  </Link>
                  {article.authorName ? (
                    <p className="text-xs text-muted-foreground">{article.authorName}</p>
                  ) : null}
                </li>
              ))}
            </Panel>

            <Panel
              title="Trending"
              hint="Most read this week"
              moreHref="/articles"
              moreLabel="All articles"
              emptyMessage="Nothing has been read yet this week. This fills in as people visit."
            >
              {trending.map((entry) => (
                <li key={entry.slug} className="flex items-baseline gap-2">
                  <span
                    aria-hidden="true"
                    className="mt-1.5 inline-block size-2.5 shrink-0 rounded-full"
                    style={{ background: topicColour(entry.topic).dot }}
                  />
                  <span>
                    <Link
                      href={`/articles/${entry.slug}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {entry.title}
                    </Link>
                    {/* The count is shown rather than an unexplained order: a ranked list that
                        will not say what ranked it asks to be taken on faith. */}
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      {entry.views} read{entry.views === 1 ? '' : 's'}
                    </span>
                  </span>
                </li>
              ))}
            </Panel>

            <Panel
              title="Topics"
              hint="Browse by subject"
              moreHref="/topics"
              moreLabel="All topics"
              emptyMessage="No topics yet."
            >
              {topics.entries.slice(0, 6).map((topic) => (
                <li key={topic.slug} className="flex items-baseline justify-between gap-3">
                  <Link
                    href={`/topics/${topic.slug}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {topic.name}
                  </Link>
                  {/* The count is shown so nobody clicks into an almost-empty topic to find out. */}
                  <span className="text-xs text-muted-foreground">{topic.articleCount}</span>
                </li>
              ))}
            </Panel>
          </div>
        </>
      )}
    </div>
  )
}

function Panel({
  title,
  hint,
  moreHref,
  moreLabel,
  emptyMessage,
  children,
}: {
  title: string
  hint: string
  moreHref: string
  moreLabel: string
  emptyMessage: string
  children: React.ReactNode
}) {
  const items = Array.isArray(children) ? children : [children]
  const empty = items.flat().filter(Boolean).length === 0

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      <p className="text-xs text-muted-foreground">{hint}</p>
      {empty ? (
        <p className="mt-4 text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <ul className="mt-4 space-y-2.5 text-sm">{children}</ul>
      )}
      <Link
        href={moreHref}
        className="mt-4 inline-block text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        {moreLabel} →
      </Link>
    </section>
  )
}
