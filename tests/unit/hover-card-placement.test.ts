import { describe, expect, it } from "vitest";
import { placeHoverCard } from "@/components/graph/hover-card-placement";

const viewport = { width: 1440, height: 900 };
const card = { width: 260, height: 70 };

describe("placeHoverCard (F06-FR-3)", () => {
  it("F06-FR-3 puts the card beside the node in a wide graph (explorer)", () => {
    const graph = { left: 300, top: 100, width: 1000, height: 600 };
    const p = placeHoverCard(graph, { x: 500, y: 300 }, 6, card, viewport);
    expect(p.mode).toBe("beside");
    expect(p.left).toBe(500 + 6 + 12);
    expect(p.top).toBe(300 - 35);
  });

  it("F06-FR-3 flips beside placement to the left near the graph's right edge", () => {
    const graph = { left: 0, top: 0, width: 1000, height: 600 };
    const p = placeHoverCard(graph, { x: 950, y: 300 }, 6, card, viewport);
    expect(p.left).toBe(950 - 6 - 12 - 260);
  });

  it("F06-FR-3 prefers the right of a small graph when the monitor has room", () => {
    const wide = { width: 1920, height: 1080 };
    const graph = { left: 1285, top: 120, width: 280, height: 280 };
    const p = placeHoverCard(graph, { x: 1400, y: 200 }, 6, card, wide);
    expect(p.mode).toBe("outside");
    expect(p.left).toBe(1285 + 280 + 12);
    expect(p.top).toBe(200 - 35);
  });

  it("F06-FR-3 falls back to the left of the sidebar graph when the right has no room", () => {
    const graph = { left: 1100, top: 120, width: 280, height: 280 };
    const p = placeHoverCard(graph, { x: 1240, y: 200 }, 6, card, viewport);
    expect(p.mode).toBe("outside");
    expect(p.left + card.width).toBeLessThanOrEqual(graph.left); // no overlap with the graph
    expect(p.top).toBe(200 - 35);
  });

  it("F06-FR-3 falls back above, then below, a full-width mobile graph", () => {
    const phone = { width: 390, height: 844 };
    const below = placeHoverCard({ left: 16, top: 40, width: 358, height: 280 }, { x: 200, y: 150 }, 6, card, phone);
    expect(below.mode).toBe("outside");
    expect(below.top).toBe(40 + 280 + 12);
    const above = placeHoverCard({ left: 16, top: 400, width: 358, height: 280 }, { x: 200, y: 500 }, 6, card, phone);
    expect(above.top).toBe(400 - 12 - 70);
  });

  it("F06-FR-3 stays inside the viewport when nothing fits", () => {
    const tiny = { width: 300, height: 300 };
    const p = placeHoverCard({ left: 0, top: 0, width: 300, height: 300 }, { x: 150, y: 150 }, 6, card, tiny);
    expect(p.left).toBeGreaterThanOrEqual(8);
    expect(p.top).toBeGreaterThanOrEqual(8);
    expect(p.left + card.width).toBeLessThanOrEqual(300 - 8 + 0.001);
  });

  it("F06-FR-3 forces beside placement when the card cannot leave the graph (no top layer)", () => {
    const graph = { left: 0, top: 0, width: 280, height: 280 };
    const p = placeHoverCard(graph, { x: 140, y: 140 }, 6, card, viewport, false);
    expect(p.mode).toBe("beside");
    expect(p.left).toBeGreaterThanOrEqual(8);
  });
});
