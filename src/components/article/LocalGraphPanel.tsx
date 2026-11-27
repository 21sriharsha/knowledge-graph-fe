"use client";

/**
 * Local graph in the article sidebar (F03-FR-11, F06). Starts from the read model's graphContext;
 * depth and "Suggested" refetch through the BFF and keep the previous graph visible meanwhile.
 * Static (no zoom/pan) so page scrolling is never trapped; click a node to open that article.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { components } from "@/lib/api/schema";
import { bff } from "@/lib/bff-client";
import { Graph } from "@/components/graph/Graph";
import { Switch } from "@/components/ui/Switch";
import styles from "./article.module.css";

type Neighbourhood = components["schemas"]["GraphNeighbourhood"];

export function LocalGraphPanel({ slug, initial, explorer }: { slug: string; initial?: Neighbourhood; explorer: boolean }) {
  const router = useRouter();
  const [depth, setDepth] = useState(1);
  const [suggested, setSuggested] = useState(false);
  const isInitial = depth === 1 && !suggested && !!initial;

  const query = useQuery({
    queryKey: ["graph", "local", slug, depth, suggested],
    queryFn: () => bff<Neighbourhood>(`/api/bff/graph/neighbourhood?slug=${encodeURIComponent(slug)}&depth=${depth}&suggestions=${suggested}`),
    initialData: isInitial ? initial : undefined,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
  });

  const data = query.data;
  const focusId = data?.nodes?.find((n) => n.distance === 0)?.id ?? null;
  if (!data?.nodes?.length || data.nodes.length < 2) return null;

  return (
    <section className={styles.localGraph} data-testid="local-graph" aria-label="Local graph">
      <div className={styles.lgHead}>
        <span className="eyebrow">Local graph</span>
        <div className={styles.lgTools}>
          <div role="group" aria-label="Depth" className={styles.seg}>
            {[1, 2].map((d) => (
              <button key={d} type="button" aria-pressed={depth === d} onClick={() => setDepth(d)}>
                {d}
              </button>
            ))}
          </div>
          <span className={styles.lgSwitch}>
            <Switch checked={suggested} onChange={setSuggested} label="Suggested" testId="local-suggested" />
          </span>
        </div>
      </div>
      <Graph
        data={data}
        mini
        zoomable={false}
        focusId={focusId}
        suggested={suggested}
        ariaLabel={`Local graph: ${data.nodes.length} linked articles`}
        onOpen={(n) => n.slug && n.slug !== slug && router.push(`/articles/${n.slug}`)}
        style={{ height: 240 }}
      />
      <div className={styles.lgFoot}>
        <span className="tabular">
          {data.nodes.length} notes · {data.edges?.length ?? 0} links
        </span>
        {explorer && <Link href="/graph">Open in graph</Link>}
      </div>
      {query.isError && <p role="alert" className="faint">Couldn&apos;t update the graph.</p>}
    </section>
  );
}
