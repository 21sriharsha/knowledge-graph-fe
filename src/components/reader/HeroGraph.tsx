"use client";

import { useRouter } from "next/navigation";
import type { GraphData } from "@/components/graph/engine";
import { Graph } from "@/components/graph/Graph";

/**
 * Home hero graph (F02-FR-2): a static preview — no wheel/pinch/pan, so page scrolling passes through.
 * Hover still highlights and shows the card; any click (node or background) opens the explorer.
 */
export function HeroGraph({ data, explorerEnabled }: { data: GraphData; explorerEnabled: boolean }) {
  const router = useRouter();
  const open = () => {
    if (explorerEnabled) router.push("/graph");
  };
  return (
    <div onClick={open} style={{ height: "100%" }}>
      <Graph
        data={data}
        zoomable={false}
        linkDistance={55}
        charge={-120}
        ariaLabel={`Knowledge graph preview: ${data.nodes?.length ?? 0} articles`}
        onOpen={open}
        onSelect={open}
        style={{ height: "100%", cursor: explorerEnabled ? "pointer" : "default" }}
        testId="home-graph-canvas"
      />
    </div>
  );
}
