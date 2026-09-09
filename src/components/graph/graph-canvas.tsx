'use client'

import {
  Background,
  BackgroundVariant,
  Controls,
  type Edge,
  MiniMap,
  type Node,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useStore,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo } from 'react'

import { useIsDark } from '@/components/theme/use-is-dark'
import type { GraphEdge, GraphNeighbourhood, GraphNode } from '@/lib/types'
import { ConceptNode, type ConceptNodeData } from './concept-node'
import { degreesOf, forceLayout, radialLayout } from './layout'
import { topicColour } from './topic-colour'

export type GraphTone = 'surface' | 'dark'

const NODE_TYPES = { concept: ConceptNode }

/**
 * The shared graph canvas: article neighbourhoods, topic clusters and the whole-graph overview all
 * render through this one component, so the picture means the same thing wherever it appears.
 *
 * It is purely presentational — it never fetches. The server hands it a bounded neighbourhood and
 * it draws it. Filtering (`visibleIds`) is applied here rather than by re-querying, because the
 * data is already in the browser and a round trip to hide three nodes would be a click the reader
 * has to wait for.
 *
 * The canvas is `aria-hidden`; callers are responsible for rendering the equivalent list of links
 * beside it (FRONTEND-SPEC §12).
 */
export function GraphCanvas({
  neighbourhood,
  focusSlug,
  height = 420,
  tone = 'surface',
  layout,
  showMiniMap = false,
  showControls = true,
  visibleIds = null,
  onSelectSlug,
}: {
  neighbourhood: GraphNeighbourhood
  focusSlug?: string
  height?: number | string
  tone?: GraphTone
  /** Defaults to radial when there is a focused article, force otherwise. */
  layout?: 'radial' | 'force'
  showMiniMap?: boolean
  showControls?: boolean
  /** When set, nodes outside the set are dimmed and their edges hidden. */
  visibleIds?: Set<string> | null
  /** Overrides the default behaviour of navigating to the clicked article. */
  onSelectSlug?: (node: GraphNode) => void
}) {
  const router = useRouter()
  // The dark canvas is dark in either theme (it is a viewport, not a surface); the surface canvas
  // follows the page.
  const themeIsDark = useIsDark()
  const dark = tone === 'dark' || themeIsDark

  const { nodes, edges } = useMemo(() => {
    const focusId = neighbourhood.nodes.find((node) => node.slug === focusSlug)?.id
    const mode = layout ?? (focusId ? 'radial' : 'force')
    const positions =
      mode === 'radial'
        ? radialLayout(neighbourhood.nodes, focusId)
        : forceLayout(neighbourhood.nodes, neighbourhood.edges)
    const positionById = new Map(positions.map((position) => [position.id, position]))
    const degrees = degreesOf(neighbourhood.nodes, neighbourhood.edges)
    const maxDegree = Math.max(1, ...degrees.values())

    const drawnNodes: Node[] = neighbourhood.nodes.map((node) => {
      const position = positionById.get(node.id) ?? { x: 0, y: 0 }
      const degree = degrees.get(node.id) ?? 0
      const focused = node.slug === focusSlug
      // Size says "this is a hub" at a glance. Bounded so one very connected article cannot
      // swallow the canvas.
      const size = focused ? 44 : Math.round(18 + (degree / maxDegree) * 18)
      const data: ConceptNodeData = {
        label: node.title,
        colour: topicColour(node.topic),
        size,
        focused,
        dimmed: visibleIds !== null && !visibleIds.has(node.id),
        dark,
      }
      return {
        id: node.id,
        type: 'concept',
        position: { x: position.x, y: position.y },
        data,
        // Declared rather than left to measurement: the minimap draws from node dimensions and
        // renders nothing at all while they are still undefined.
        width: size,
        height: size,
        draggable: false,
        connectable: false,
        // React Flow centres nodes on their own box; offsetting by the radius keeps the
        // laid-out coordinate at the circle's centre so edges meet it cleanly.
        origin: [0.5, 0.5],
      }
    })

    const strokeBase = dark ? 'rgba(148,163,184,0.55)' : 'rgba(100,116,139,0.5)'
    const drawnEdges: Edge[] = undirected(neighbourhood.edges)
      .filter(
        (edge) =>
          visibleIds === null || (visibleIds.has(edge.sourceId) && visibleIds.has(edge.targetId)),
      )
      .map((edge, index) => ({
        id: `${edge.sourceId}-${edge.targetId}-${index}`,
        source: edge.sourceId,
        target: edge.targetId,
        type: 'default',
        animated: false, // Motion would imply flow; these are static relationships.
        style: edge.authored
          ? { stroke: strokeBase, strokeWidth: 1.6 }
          : { stroke: strokeBase, strokeWidth: 1.1, strokeDasharray: '4 4', opacity: 0.65 },
      }))

    return { nodes: drawnNodes, edges: drawnEdges }
  }, [neighbourhood, focusSlug, layout, visibleIds, dark])

  const nodeById = useMemo(
    () => new Map(neighbourhood.nodes.map((node) => [node.id, node])),
    [neighbourhood],
  )

  return (
    <div
      className={`overflow-hidden rounded-xl border ${dark ? 'graph-canvas-dark' : ''}`}
      style={{
        height,
        borderColor: tone === 'dark' ? 'rgba(148,163,184,0.18)' : 'var(--border)',
        background: tone === 'dark' ? '#0b1120' : 'var(--muted)',
      }}
      aria-hidden="true"
    >
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={NODE_TYPES}
          minZoom={0.25}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          nodesDraggable={false}
          nodesConnectable={false}
          edgesFocusable={false}
          panOnScroll
          zoomOnScroll={false}
          onNodeClick={(_, node) => {
            const selected = nodeById.get(node.id)
            if (!selected) return
            if (onSelectSlug) onSelectSlug(selected)
            else if (selected.slug !== focusSlug) router.push(`/articles/${selected.slug}`)
          }}
        >
          <FitToContent nodes={nodes} />
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color={dark ? 'rgba(148,163,184,0.18)' : 'var(--border)'}
          />
          {/* Controls are styled in globals.css: React Flow renders the buttons itself, so an
              inline style on this container would never reach them. */}
          {showControls ? <Controls showInteractive={false} /> : null}
          {/* A minimap only earns its space once the graph is too big to take in at once. Below
              that it is an empty rectangle sitting on top of an article's title. */}
          {showMiniMap && neighbourhood.nodes.length >= 20 ? (
            <MiniMap
              pannable
              zoomable
              nodeStrokeWidth={0}
              nodeBorderRadius={20}
              nodeColor={(node) => (node.data as ConceptNodeData).colour.dot}
              maskColor={dark ? 'rgba(2,6,23,0.72)' : 'rgba(241,245,249,0.72)'}
              style={{
                background: dark ? '#0f172a' : 'var(--background)',
                border: `1px solid ${dark ? 'rgba(148,163,184,0.2)' : 'var(--border)'}`,
                borderRadius: 8,
                width: 150,
                height: 110,
              }}
            />
          ) : null}
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  )
}

/**
 * One line per pair of articles.
 *
 * The backend's edges are directed, and reciprocal links are common: an author cites another
 * article and is cited back. Drawn literally that is two curves between the same two circles, which
 * reads as two different relationships rather than one mutual one.
 *
 * Where a pair has both an authored link and an inferred one, the authored edge wins. An author's
 * link is authoritative and the inference adds nothing; drawing a solid and a dashed line on top of
 * each other would only say that the platform agrees.
 */
function undirected(edges: GraphEdge[]): GraphEdge[] {
  const byPair = new Map<string, GraphEdge>()
  for (const edge of edges) {
    const key = [edge.sourceId, edge.targetId].sort().join('\u0000')
    const existing = byPair.get(key)
    if (!existing || (edge.authored && !existing.authored)) byPair.set(key, edge)
  }
  return [...byPair.values()]
}

/**
 * Frames the graph so labels are not clipped.
 *
 * `fitView` measures node boxes, and a node box here is just the circle — its title hangs outside
 * it. Fitting to the circles alone reliably cut the bottom row's labels in half. This fits to the
 * laid-out coordinates inflated by the room a label actually occupies, so the first thing a reader
 * sees is a graph they can read.
 *
 * Zoom is capped at 1 so six nodes are not magnified to fill the canvas; labels are sized for
 * zoom 1 and only shrink once the graph is genuinely large, where the zoom controls take over.
 */
function FitToContent({ nodes }: { nodes: Node[] }) {
  const { setViewport } = useReactFlow()
  const width = useStore((state) => state.width)
  const height = useStore((state) => state.height)

  useEffect(() => {
    if (nodes.length === 0 || width === 0 || height === 0) return

    const xs = nodes.map((node) => node.position.x)
    const ys = nodes.map((node) => node.position.y)
    const minX = Math.min(...xs) - SIDE_ROOM
    const maxX = Math.max(...xs) + SIDE_ROOM
    const minY = Math.min(...ys) - TOP_ROOM
    const maxY = Math.max(...ys) + BOTTOM_ROOM

    const zoom = Math.min(1, (width * 0.96) / (maxX - minX), (height * 0.96) / (maxY - minY))
    const centreX = (minX + maxX) / 2
    const centreY = (minY + maxY) / 2

    setViewport(
      { x: width / 2 - centreX * zoom, y: height / 2 - centreY * zoom, zoom },
      { duration: 0 },
    )
  }, [nodes, width, height, setViewport])

  return null
}

/** Half a label's width either side, and enough below a circle for two lines of title. */
const SIDE_ROOM = 95
const TOP_ROOM = 32
const BOTTOM_ROOM = 56
