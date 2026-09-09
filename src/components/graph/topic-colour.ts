/**
 * Stable colours for topics.
 *
 * Assigned by hashing the topic name, so a topic keeps its colour across pages and across restarts
 * without anything being stored. A palette index that shifted between renders would make the graph
 * unreadable — a reader learns "blue is Kubernetes" within seconds and is misled the moment it
 * changes.
 *
 * Colour is never the only carrier of meaning: every node is labelled and the legend names each
 * topic in text (FRONTEND-SPEC §12).
 */
export interface TopicColour {
  /** Node fill / legend swatch. */
  dot: string
  /** Translucent fill behind a node body. */
  soft: string
  /** Node border. */
  ring: string
}

const PALETTE: TopicColour[] = [
  { dot: '#3b82f6', soft: 'rgba(59,130,246,0.14)', ring: 'rgba(59,130,246,0.55)' }, // blue
  { dot: '#10b981', soft: 'rgba(16,185,129,0.14)', ring: 'rgba(16,185,129,0.55)' }, // green
  { dot: '#8b5cf6', soft: 'rgba(139,92,246,0.14)', ring: 'rgba(139,92,246,0.55)' }, // violet
  { dot: '#f59e0b', soft: 'rgba(245,158,11,0.14)', ring: 'rgba(245,158,11,0.55)' }, // amber
  { dot: '#ec4899', soft: 'rgba(236,72,153,0.14)', ring: 'rgba(236,72,153,0.55)' }, // pink
  { dot: '#06b6d4', soft: 'rgba(6,182,212,0.14)', ring: 'rgba(6,182,212,0.55)' },   // cyan
]

const UNTOPICED: TopicColour = {
  dot: '#94a3b8',
  soft: 'rgba(148,163,184,0.14)',
  ring: 'rgba(148,163,184,0.5)',
}

export function topicColour(topic?: string | null): TopicColour {
  if (!topic) return UNTOPICED
  let hash = 0
  for (let i = 0; i < topic.length; i++) {
    hash = (hash * 31 + topic.charCodeAt(i)) >>> 0
  }
  return PALETTE[hash % PALETTE.length]
}

/** Distinct topics in a node set, in first-seen order, for a legend. */
export function topicsOf(nodes: { topic?: string | null }[]): string[] {
  const seen: string[] = []
  for (const node of nodes) {
    if (node.topic && !seen.includes(node.topic)) seen.push(node.topic)
  }
  return seen
}
