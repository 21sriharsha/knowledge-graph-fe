/**
 * Force-directed graph engine (F06-FR-1…8): d3-force + d3-zoom on SVG, framework-agnostic so the
 * React wrapper only mounts/updates it. Ported from the approved prototype.
 *
 * Security: node titles come from content; the hover card is built with DOM APIs and textContent —
 * never innerHTML.
 */
import { drag } from "d3-drag";
import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import { select, type Selection } from "d3-selection";
import { zoom, zoomIdentity, zoomTransform, type ZoomBehavior } from "d3-zoom";
import "d3-transition"; // augments selection.transition() used by select/zoomBy/reset
import { topicColor } from "@/lib/topic-color";
import { placeHoverCard } from "./hover-card-placement";

export type GraphNodeInput = {
  id?: string;
  slug?: string;
  title?: string;
  distance?: number;
  topic?: string;
  /** Taxonomy graphs: node kind and article count. */
  kind?: "topic" | "tag";
  count?: number;
};

export type GraphEdgeInput = {
  sourceId?: string;
  targetId?: string;
  authored?: boolean;
  kind?: string;
  label?: string;
  weight?: number;
};

export type GraphData = { nodes?: GraphNodeInput[]; edges?: GraphEdgeInput[] };

export type GraphOptions = {
  mini: boolean;
  focusId: string | null;
  labels: "auto" | "always";
  arrows: boolean;
  suggested: boolean;
  linkDistance: number;
  charge: number;
  /** Topic names to show; null = all. Tag nodes are never filtered out. */
  topicFilter: Set<string> | null;
  filterText: string;
  zoomable: boolean;
  tooltip: boolean;
  ariaLabel: string;
  topicsOf?: (node: SimNode) => string[];
  onOpen?: (node: SimNode) => void;
  onSelect?: (node: SimNode | null) => void;
};

export type SimNode = GraphNodeInput & SimulationNodeDatum & { id: string; title: string; deg: number; r: number };
type SimEdge = SimulationLinkDatum<SimNode> & GraphEdgeInput & { sourceId: string; targetId: string };

export const DEFAULT_OPTIONS: GraphOptions = {
  mini: false,
  focusId: null,
  labels: "auto",
  arrows: false,
  suggested: true,
  linkDistance: 70,
  charge: -180,
  topicFilter: null,
  filterText: "",
  zoomable: true,
  tooltip: true,
  ariaLabel: "Knowledge graph",
};

let instanceCount = 0;

export function createGraph(el: HTMLElement, initialData: GraphData, initialOptions: Partial<GraphOptions>) {
  const o: GraphOptions = { ...DEFAULT_OPTIONS, ...initialOptions };
  let data = initialData;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const arrowId = `kg-arrow-${++instanceCount}`;

  const svg = select(el).append("svg").attr("class", "kg-graph").attr("role", "img").attr("data-testid", "graph-svg");
  svg
    .append("defs")
    .append("marker")
    .attr("id", arrowId)
    .attr("viewBox", "0 -4 8 8")
    .attr("refX", 14)
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M0,-3.5L8,0L0,3.5")
    .attr("class", "kg-arrow");
  const root = svg.append("g");
  const gE = root.append("g");
  const gN = root.append("g");

  let W = el.clientWidth || 600;
  let H = el.clientHeight || 300;
  let k = 1;
  let selId: string | null = null;
  let hoverId: string | null = null;
  let nodes: SimNode[] = [];
  let edges: SimEdge[] = [];
  const posCache = new Map<string, { x: number; y: number }>();

  const sim: Simulation<SimNode, SimEdge> = forceSimulation<SimNode, SimEdge>()
    .force("link", forceLink<SimNode, SimEdge>().id((d) => d.id))
    .force("charge", forceManyBody())
    .force("x", forceX(0).strength(0.06))
    .force("y", forceY(0).strength(0.08))
    .force("collide", forceCollide<SimNode>().radius((d) => d.r + 4))
    .on("tick", draw);

  const zoomer: ZoomBehavior<SVGSVGElement, unknown> = zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.3, 4])
    .on("zoom", (event) => {
      k = event.transform.k;
      root.attr("transform", event.transform.toString());
      labelVisibility();
      hideTip();
    });
  svg.call(zoomer).on("dblclick.zoom", null);
  if (!o.zoomable) {
    // F06-FR-5: keep programmatic centring, drop wheel/pinch/pan so page scrolling is never trapped.
    svg
      .on("wheel.zoom", null)
      .on("mousedown.zoom", null)
      .on("touchstart.zoom", null)
      .on("touchmove.zoom", null)
      .on("touchend.zoom touchcancel.zoom", null)
      .classed("static", true);
  }

  if (getComputedStyle(el).position === "static") el.style.position = "relative";
  const tip = o.tooltip ? document.createElement("div") : null;
  // The card goes in the top layer (popover="manual") so it can sit outside a small graph instead of
  // covering it; the local-graph panel clips with overflow:hidden, which only the top layer escapes.
  // Popover is Baseline "newly available": without it the card stays absolutely positioned inside the
  // graph (previous behaviour). No polyfill — the card is a decorative duplicate of the node's
  // aria-label. `interestfor` and CSS anchor positioning don't fit: the triggers are SVG <g> nodes
  // moved by the simulation, and anchor positioning lacks Firefox support.
  const tipInTopLayer = !!tip && Object.hasOwn(HTMLElement.prototype, "popover");
  if (tip) {
    tip.className = "kg-tip";
    // Visual duplicate of the focused/hovered node's aria-label — hidden from assistive tech.
    tip.setAttribute("aria-hidden", "true");
    tip.dataset.testid = "graph-tooltip";
    if (tipInTopLayer) {
      tip.setAttribute("popover", "manual");
      tip.classList.add("kg-tip-layer");
    }
    el.appendChild(tip);
  }
  // A viewport-fixed card would drift away from its node when the page scrolls under it.
  const hideTipOnScroll = () => hideTip();
  if (tipInTopLayer) window.addEventListener("scroll", hideTipOnScroll, { capture: true, passive: true });

  function showTip(n: SimNode) {
    if (!tip) return;
    tip.replaceChildren();
    const meta = document.createElement("div");
    meta.className = "kg-tip-meta";
    const addMeta = (label: string, color: string) => {
      const item = document.createElement("span");
      const dot = document.createElement("span");
      dot.className = "dot";
      dot.style.background = color;
      item.append(dot, document.createTextNode(label));
      meta.appendChild(item);
    };
    if (n.kind) {
      const count = `${n.count ?? 0} ${n.count === 1 ? "article" : "articles"}`;
      addMeta(`${n.kind === "topic" ? "Topic" : "Tag"} · ${count}`, n.kind === "tag" ? "var(--muted)" : topicColor(n.slug ?? n.topic));
    } else {
      for (const name of (o.topicsOf ? o.topicsOf(n) : [n.topic]).filter(Boolean) as string[]) addMeta(name, topicColor(name));
    }
    const title = document.createElement("b");
    title.textContent = n.title;
    tip.append(meta, title);
    const t = zoomTransform(svg.node()!);
    if (tipInTopLayer && !tip.matches(":popover-open")) tip.showPopover();
    tip.classList.add("on");
    const card = { width: tip.offsetWidth, height: tip.offsetHeight };
    const box = tipInTopLayer ? el.getBoundingClientRect() : { left: 0, top: 0, width: W, height: H };
    const viewport = tipInTopLayer
      ? { width: document.documentElement.clientWidth, height: window.innerHeight }
      : { width: W, height: H };
    const node = { x: box.left + t.applyX(n.x ?? 0), y: box.top + t.applyY(n.y ?? 0) };
    // Without the top layer the card can't leave the graph, so only "beside" placement applies.
    const place = placeHoverCard(box, node, n.r * t.k, card, viewport, tipInTopLayer);
    tip.style.left = `${place.left}px`;
    tip.style.top = `${place.top}px`;
    tip.dataset.placement = place.mode;
  }
  function hideTip() {
    if (!tip) return;
    tip.classList.remove("on");
    if (tipInTopLayer && tip.matches(":popover-open")) tip.hidePopover();
  }

  function center() {
    svg.call(zoomer.transform, zoomIdentity.translate(W / 2, H / 2));
  }

  function topicVisible(n: GraphNodeInput) {
    return n.kind === "tag" || !o.topicFilter || (n.topic ? o.topicFilter.has(n.topic) : true);
  }

  function build() {
    svg.attr("aria-label", o.ariaLabel);
    nodes = (data.nodes ?? [])
      .filter((n): n is GraphNodeInput & { id: string } => !!n.id && topicVisible(n))
      .map((n) => {
        const cached = posCache.get(n.id);
        return { ...n, title: n.title ?? n.slug ?? "Untitled", deg: 0, r: 4, ...(cached ?? {}) };
      });
    const ids = new Set(nodes.map((n) => n.id));
    if (selId && !ids.has(selId)) selId = null;
    edges = (data.edges ?? [])
      .filter((e): e is GraphEdgeInput & { sourceId: string; targetId: string } => !!e.sourceId && !!e.targetId)
      .filter((e) => ids.has(e.sourceId) && ids.has(e.targetId) && (o.suggested || e.authored))
      .map((e) => ({ ...e, source: e.sourceId, target: e.targetId }));
    const deg = new Map<string, number>();
    for (const e of edges) {
      deg.set(e.sourceId, (deg.get(e.sourceId) ?? 0) + 1);
      deg.set(e.targetId, (deg.get(e.targetId) ?? 0) + 1);
    }
    for (const n of nodes) {
      n.deg = deg.get(n.id) ?? 0;
      n.r = (o.mini ? 3.5 : 4.5) + Math.sqrt(n.count ?? n.deg) * (o.mini ? 1.6 : 2.3) + (n.id === o.focusId ? 3 : 0);
    }
    if (o.focusId) {
      const f = nodes.find((n) => n.id === o.focusId);
      if (f && !posCache.has(f.id)) {
        f.fx = 0;
        f.fy = 0;
        setTimeout(() => {
          f.fx = null;
          f.fy = null;
        }, 600);
      }
    }

    const eSel = gE.selectAll<SVGLineElement, SimEdge>("line").data(edges, (e) => `${e.sourceId}>${e.targetId}`);
    eSel.exit().remove();
    eSel
      .enter()
      .append("line")
      .merge(eSel)
      .attr("class", (e) => `e${e.authored ? "" : " sug"}`)
      .attr("data-kind", (e) => e.kind ?? null)
      .attr("marker-end", o.arrows ? `url(#${arrowId})` : null);

    const nSel = gN.selectAll<SVGGElement, SimNode>("g.n").data(nodes, (n) => n.id);
    nSel.exit().remove();
    const nEnter = nSel
      .enter()
      .append("g")
      .attr("class", "n")
      .attr("tabindex", o.mini ? -1 : 0)
      .attr("data-testid", "graph-node")
      .attr("data-slug", (n) => n.slug ?? null);
    nEnter.append("circle").attr("class", "halo");
    nEnter.append("circle").attr("class", "core");
    nEnter.append("text").attr("dy", "0.32em");
    const all = nEnter.merge(nSel);
    all.classed("focus", (n) => n.id === o.focusId);
    all
      .select<SVGCircleElement>("circle.core")
      .attr("r", (n) => n.r)
      .style("fill", (n) => (n.kind === "tag" ? "var(--muted)" : topicColor(n.kind === "topic" ? n.slug : n.topic)));
    all.select<SVGCircleElement>("circle.halo").attr("r", (n) => n.r + 4);
    const max = o.mini ? 26 : 38;
    all
      .select<SVGTextElement>("text")
      .text((n) => (n.title.length > max ? `${n.title.slice(0, max - 2)}…` : n.title))
      .attr("x", (n) => n.r + 5);
    all.attr("aria-label", (n) => n.title);
    all
      .on("mouseenter", (_e, n) => {
        hoverId = n.id;
        highlight();
        showTip(n);
      })
      .on("mouseleave", () => {
        hoverId = null;
        highlight();
        hideTip();
      })
      .on("focus", (_e, n) => {
        hoverId = n.id;
        highlight();
        showTip(n);
      })
      .on("blur", () => {
        hoverId = null;
        highlight();
        hideTip();
      })
      .on("click", (event: MouseEvent, n) => {
        event.stopPropagation();
        if (o.mini) {
          o.onOpen?.(n);
          return;
        }
        selId = selId === n.id ? null : n.id;
        highlight();
        o.onSelect?.(selId ? n : null);
      })
      .on("dblclick", (event: MouseEvent, n) => {
        event.stopPropagation();
        o.onOpen?.(n);
      })
      .on("keydown", (event: KeyboardEvent, n) => {
        if (event.key === "Enter") o.onOpen?.(n);
        if (event.key === " ") {
          event.preventDefault();
          selId = n.id;
          highlight();
          o.onSelect?.(n);
        }
      });
    all.call(
      drag<SVGGElement, SimNode>()
        .on("start", (event, d) => {
          hideTip();
          if (!event.active) sim.alphaTarget(0.25).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) sim.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }),
    );

    sim.nodes(nodes);
    sim
      .force<ReturnType<typeof forceLink<SimNode, SimEdge>>>("link")!
      .links(edges)
      .distance((e) => (o.mini ? 0.6 : 1) * o.linkDistance * (e.authored ? 1 : 1.4))
      .strength((e) => (e.authored ? 0.5 : 0.15));
    sim.force<ReturnType<typeof forceManyBody<SimNode>>>("charge")!.strength(o.mini ? o.charge * 0.55 : o.charge);
    if (reduce) {
      sim.stop();
      sim.alpha(1);
      for (let i = 0; i < 300; i++) sim.tick();
      draw();
    } else {
      sim.alpha(posCache.size ? 0.4 : 1).restart();
    }
    highlight();
    labelVisibility();
  }

  function draw() {
    gE.selectAll<SVGLineElement, SimEdge>("line")
      .attr("x1", (e) => (e.source as SimNode).x ?? 0)
      .attr("y1", (e) => (e.source as SimNode).y ?? 0)
      .attr("x2", (e) => (e.target as SimNode).x ?? 0)
      .attr("y2", (e) => (e.target as SimNode).y ?? 0);
    gN.selectAll<SVGGElement, SimNode>("g.n").attr("transform", (n) => `translate(${n.x ?? 0},${n.y ?? 0})`);
    for (const n of nodes) posCache.set(n.id, { x: n.x ?? 0, y: n.y ?? 0 });
  }

  const endId = (end: string | SimNode | number | undefined) => (typeof end === "object" ? end.id : String(end));

  function neighbours(id: string) {
    const set = new Set([id]);
    for (const e of edges) {
      const a = endId(e.source);
      const b = endId(e.target);
      if (a === id) set.add(b);
      if (b === id) set.add(a);
    }
    return set;
  }

  function highlight() {
    const active = hoverId ?? selId;
    const nb = active ? neighbours(active) : null;
    const f = o.filterText.toLowerCase().trim();
    gN.selectAll<SVGGElement, SimNode>("g.n")
      .classed("hov", (n) => !!tip && n.id === hoverId && o.labels !== "always")
      .classed("hi", (n) => !!nb && nb.has(n.id))
      .classed("dim", (n) => (!!nb && !nb.has(n.id)) || (!!f && !nb && !n.title.toLowerCase().includes(f)))
      .classed("sel", (n) => n.id === selId)
      .classed("match", (n) => !!f && n.title.toLowerCase().includes(f));
    gE.selectAll<SVGLineElement, SimEdge>("line")
      .classed("hi", (e) => !!active && (endId(e.source) === active || endId(e.target) === active))
      .classed("dim", (e) => (!!active && endId(e.source) !== active && endId(e.target) !== active) || (!!f && !active));
    labelVisibility();
  }

  function labelVisibility() {
    const always = o.labels === "always";
    gN.selectAll<SVGTextElement, SimNode>("g.n text").style("opacity", (n) => {
      if (always) return 1;
      if (o.mini) return n.id === o.focusId ? 1 : 0;
      return k >= 1.8 ? 1 : Math.max(0, (k - 1.4) * 2.5);
    });
  }

  svg.on("click", () => {
    if (selId) {
      selId = null;
      highlight();
      o.onSelect?.(null);
    }
  });

  const resizeObserver = new ResizeObserver(() => {
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (w && h && (w !== W || h !== H)) {
      W = w;
      H = h;
      center();
    }
  });
  resizeObserver.observe(el);
  center();
  build();

  const animate = (s: Selection<SVGSVGElement, unknown, null, undefined>, ms: number) =>
    reduce ? s : (s.transition().duration(ms) as unknown as Selection<SVGSVGElement, unknown, null, undefined>);

  return {
    update(next: Partial<GraphOptions> & { data?: GraphData }) {
      const { data: nextData, ...rest } = next;
      Object.assign(o, rest);
      if (nextData) data = nextData;
      build();
    },
    setFilter(text: string) {
      o.filterText = text;
      highlight();
    },
    select(id: string) {
      selId = id;
      highlight();
      const n = nodes.find((x) => x.id === id);
      if (n) animate(svg as never, 450).call(zoomer.transform, zoomIdentity.translate(W / 2 - (n.x ?? 0) * 1.6, H / 2 - (n.y ?? 0) * 1.6).scale(1.6));
      o.onSelect?.(n ?? null);
    },
    zoomBy(factor: number) {
      animate(svg as never, 200).call(zoomer.scaleBy, factor);
    },
    reset() {
      selId = null;
      highlight();
      animate(svg as never, 300).call(zoomer.transform, zoomIdentity.translate(W / 2, H / 2));
      o.onSelect?.(null);
    },
    findByTitle(text: string): SimNode | undefined {
      const f = text.toLowerCase().trim();
      return f ? nodes.find((n) => n.title.toLowerCase().includes(f)) : undefined;
    },
    destroy() {
      sim.stop();
      resizeObserver.disconnect();
      svg.remove();
      if (tipInTopLayer) window.removeEventListener("scroll", hideTipOnScroll, { capture: true });
      hideTip();
      tip?.remove();
    },
    get counts() {
      return { nodes: nodes.length, edges: edges.length };
    },
  };
}

export type GraphHandle = ReturnType<typeof createGraph>;
