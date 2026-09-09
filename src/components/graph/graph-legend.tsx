import type { GraphNeighbourhood } from '@/lib/types'
import { topicColour, topicsOf } from './topic-colour'

/**
 * What the picture means, in words.
 *
 * Line style separates author-written links from platform inferences; the swatches name each
 * topic. Both are spelled out in text because FRONTEND-SPEC §12 forbids carrying graph meaning in
 * colour alone, and because a reader should not have to infer a convention.
 */
export function GraphLegend({
  neighbourhood,
  tone = 'surface',
  showTopics = true,
}: {
  neighbourhood: GraphNeighbourhood
  tone?: 'surface' | 'dark'
  /** Off where the surrounding UI already lists the topics, so the reader is not told twice. */
  showTopics?: boolean
}) {
  const topics = topicsOf(neighbourhood.nodes)
  const muted = tone === 'dark' ? 'text-slate-400' : 'text-muted-foreground'
  const line = tone === 'dark' ? 'bg-slate-400' : 'bg-muted-foreground'
  const dashed = tone === 'dark' ? 'border-slate-400' : 'border-muted-foreground'

  return (
    <div className={`space-y-3 text-xs ${muted}`}>
      <dl className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className={`inline-block h-px w-6 ${line}`} />
          <dt className="sr-only">Solid line</dt>
          <dd>linked by the author</dd>
        </div>
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className={`inline-block h-px w-6 border-t border-dashed ${dashed}`} />
          <dt className="sr-only">Dashed line</dt>
          <dd>related by shared topics or tags</dd>
        </div>
      </dl>

      {showTopics && topics.length > 0 ? (
        <div>
          <p className="font-medium tracking-wide uppercase">Topics</p>
          <ul className="mt-1.5 space-y-1">
            {topics.map((topic) => (
              <li key={topic} className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="inline-block size-2.5 shrink-0 rounded-full"
                  style={{ background: topicColour(topic).dot }}
                />
                <span>{topic}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p>Circle size shows how many connections an article has.</p>
    </div>
  )
}
