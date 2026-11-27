/**
 * Where to put a graph node's hover card (F06-FR-3), in viewport coordinates.
 *
 * Two modes:
 * - **beside** — next to the node, inside the graph. Used when the graph is wide enough that the card
 *   hides only a small part of it (the explorer).
 * - **outside** — next to the graph's box, level with the node. Used when the card would cover most
 *   of a small graph (the article sidebar's local graph, mobile). Tried in order: right of the graph
 *   (owner preference on desktop), left of it, above it, below it. If none fits, it falls back to the side with the most room,
 *   clamped to the viewport.
 *
 * Pure so it can be unit-tested without a layout engine.
 */

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface HoverCardPlacement {
  left: number;
  top: number;
  mode: "beside" | "outside";
}

/** Gap between the card and whatever it sits next to (node or graph edge), and from the viewport edge. */
const GAP = 12;
const EDGE = 8;
/** "Beside" is used only while the card takes at most this share of the graph's width. */
const MAX_BESIDE_WIDTH_SHARE = 0.45;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

export function placeHoverCard(
  graph: Rect,
  node: Point,
  nodeRadius: number,
  card: Size,
  viewport: Size,
  /** False when the card cannot leave the graph's box (no top layer); forces "beside". */
  allowOutside = true,
): HoverCardPlacement {
  if (!allowOutside || card.width <= graph.width * MAX_BESIDE_WIDTH_SHARE) {
    return placeBesideNode(graph, node, nodeRadius, card);
  }
  return placeOutsideGraph(graph, node, card, viewport);
}

function placeBesideNode(graph: Rect, node: Point, nodeRadius: number, card: Size): HoverCardPlacement {
  const offset = nodeRadius + GAP;
  const graphRight = graph.left + graph.width;
  let left = node.x + offset;
  if (left + card.width > graphRight - EDGE) left = node.x - offset - card.width;
  return {
    mode: "beside",
    left: clamp(left, graph.left + EDGE, graphRight - card.width - EDGE),
    top: clamp(node.y - card.height / 2, graph.top + EDGE, graph.top + graph.height - card.height - EDGE),
  };
}

function placeOutsideGraph(graph: Rect, node: Point, card: Size, viewport: Size): HoverCardPlacement {
  const graphRight = graph.left + graph.width;
  const graphBottom = graph.top + graph.height;
  const levelWithNode = clamp(node.y - card.height / 2, EDGE, viewport.height - card.height - EDGE);
  const alignedWithNode = clamp(node.x - card.width / 2, EDGE, viewport.width - card.width - EDGE);

  const candidates: Array<{ left: number; top: number; fits: boolean; room: number }> = [
    { left: graphRight + GAP, top: levelWithNode, room: viewport.width - graphRight, fits: graphRight + GAP + card.width <= viewport.width - EDGE },
    { left: graph.left - GAP - card.width, top: levelWithNode, room: graph.left, fits: graph.left - GAP - card.width >= EDGE },
    { left: alignedWithNode, top: graph.top - GAP - card.height, room: graph.top, fits: graph.top - GAP - card.height >= EDGE },
    { left: alignedWithNode, top: graphBottom + GAP, room: viewport.height - graphBottom, fits: graphBottom + GAP + card.height <= viewport.height - EDGE },
  ];
  const chosen = candidates.find((c) => c.fits) ?? candidates.reduce((best, c) => (c.room > best.room ? c : best));
  return {
    mode: "outside",
    left: clamp(chosen.left, EDGE, viewport.width - card.width - EDGE),
    top: clamp(chosen.top, EDGE, viewport.height - card.height - EDGE),
  };
}
