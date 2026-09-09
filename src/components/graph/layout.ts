import type { GraphEdge, GraphNode } from '@/lib/types'

export interface PositionedNode {
  id: string
  x: number
  y: number
}

/**
 * Deterministic layouts for bounded neighbourhoods.
 *
 * Determinism is the point. React Flow will happily animate a fresh random arrangement on every
 * render, which means an article's graph looks different each time you return to it and the reader
 * has to re-read the picture. Both layouts here are pure functions of the node ordering the backend
 * returned, so the same neighbourhood always draws identically.
 *
 * Neither layout is a general-purpose graph drawing algorithm, and neither needs to be: the backend
 * caps a neighbourhood at a few dozen nodes (FRONTEND-SPEC §7 — no unbounded graph).
 */

/** A focused article at the centre, its neighbours on rings by hop distance. */
export function radialLayout(
  nodes: GraphNode[],
  focusId: string | undefined,
  ringGap = 155,
): PositionedNode[] {
  const others = nodes.filter((node) => node.id !== focusId)
  const byDistance = new Map<number, GraphNode[]>()
  for (const node of others) {
    const ring = Math.max(1, node.distance || 1)
    const bucket = byDistance.get(ring)
    if (bucket) bucket.push(node)
    else byDistance.set(ring, [node])
  }

  const positioned: PositionedNode[] = []
  if (focusId) positioned.push({ id: focusId, x: 0, y: 0 })

  for (const [ring, members] of [...byDistance.entries()].sort((a, b) => a[0] - b[0])) {
    const radius = ringGap * ring
    // Offset every other ring by half a step so outer nodes do not hide directly behind inner ones.
    const offset = ring % 2 === 0 ? Math.PI / members.length : 0
    members.forEach((node, index) => {
      const angle = (index / members.length) * 2 * Math.PI - Math.PI / 2 + offset
      positioned.push({ id: node.id, x: Math.cos(angle) * radius, y: Math.sin(angle) * radius })
    })
  }
  return positioned
}

/**
 * Fruchterman–Reingold, seeded on a golden-angle spiral rather than randomly.
 *
 * Used for the whole-graph overview, where there is no single centre to organise around and a
 * radial layout would be a lie about the structure. The spiral seed is what keeps it deterministic;
 * classic FR starts from random positions.
 */
export function forceLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  { spacing = 150, iterations = 260 }: { spacing?: number; iterations?: number } = {},
): PositionedNode[] {
  const count = nodes.length
  if (count === 0) return []
  if (count === 1) return [{ id: nodes[0].id, x: 0, y: 0 }]

  // The drawing area is derived from the node count and the spacing we want between neighbours,
  // rather than being a fixed canvas size. A fixed area would scatter six nodes across a wide
  // rectangle, and `fitView` would then zoom out far enough to make every label unreadable — which
  // is precisely what a graph must not do.
  const width = Math.sqrt(count * spacing * spacing * ASPECT)
  const height = width / ASPECT

  const index = new Map(nodes.map((node, i) => [node.id, i]))
  const x = new Float64Array(count)
  const y = new Float64Array(count)

  const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))
  const seedRadius = Math.min(width, height) / 2
  for (let i = 0; i < count; i++) {
    const angle = i * GOLDEN_ANGLE
    const radius = seedRadius * Math.sqrt((i + 0.5) / count)
    x[i] = Math.cos(angle) * radius
    y[i] = Math.sin(angle) * radius
  }

  const links = edges
    .map((edge) => [index.get(edge.sourceId), index.get(edge.targetId)] as const)
    .filter((pair): pair is readonly [number, number] => pair[0] !== undefined && pair[1] !== undefined)

  const k = Math.sqrt((width * height) / count)
  const dx = new Float64Array(count)
  const dy = new Float64Array(count)
  let temperature = width / 8

  for (let step = 0; step < iterations; step++) {
    dx.fill(0)
    dy.fill(0)

    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        let deltaX = x[i] - x[j]
        let deltaY = y[i] - y[j]
        let distance = Math.hypot(deltaX, deltaY)
        if (distance < 0.01) {
          // Perturb coincident nodes along a fixed direction so the tie breaks the same way twice.
          deltaX = 0.01 * (i % 2 === 0 ? 1 : -1)
          deltaY = 0.01
          distance = Math.hypot(deltaX, deltaY)
        }
        const force = (k * k) / distance
        const fx = (deltaX / distance) * force
        const fy = (deltaY / distance) * force
        dx[i] += fx
        dy[i] += fy
        dx[j] -= fx
        dy[j] -= fy
      }
    }

    for (const [a, b] of links) {
      const deltaX = x[a] - x[b]
      const deltaY = y[a] - y[b]
      const distance = Math.max(0.01, Math.hypot(deltaX, deltaY))
      const force = (distance * distance) / k
      const fx = (deltaX / distance) * force
      const fy = (deltaY / distance) * force
      dx[a] -= fx
      dy[a] -= fy
      dx[b] += fx
      dy[b] += fy
    }

    for (let i = 0; i < count; i++) {
      // Gentle pull to the origin, so disconnected components do not drift off the canvas.
      dx[i] -= x[i] * 0.012
      dy[i] -= y[i] * 0.012

      const magnitude = Math.max(0.01, Math.hypot(dx[i], dy[i]))
      const capped = Math.min(magnitude, temperature)
      x[i] += (dx[i] / magnitude) * capped
      y[i] += (dy[i] / magnitude) * capped
    }

    temperature *= 0.97
  }

  return nodes.map((node, i) => ({ id: node.id, x: x[i], y: y[i] }))
}

const ASPECT = 1.6

/**
 * How many other articles each one is connected to.
 *
 * Distinct neighbours, not edges. Edges are directed and reciprocal links are common, so counting
 * them would score a mutual link twice and tell a reader that an article with three neighbours has
 * four connections. Self-links, if one ever appears, count for nothing.
 */
export function degreesOf(nodes: GraphNode[], edges: GraphEdge[]): Map<string, number> {
  const neighbours = new Map(nodes.map((node) => [node.id, new Set<string>()]))
  for (const edge of edges) {
    if (edge.sourceId === edge.targetId) continue
    neighbours.get(edge.sourceId)?.add(edge.targetId)
    neighbours.get(edge.targetId)?.add(edge.sourceId)
  }
  return new Map([...neighbours].map(([id, set]) => [id, set.size]))
}
