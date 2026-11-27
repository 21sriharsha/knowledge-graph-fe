"use client";

/**
 * Graph explorer (F06-FR-9…14): whole graph (articles + links) or a topic/tag-centred tree.
 * URL is the state (shareable) and is validated with zod like any user input. Data comes from BFF
 * routes via TanStack Query; the previous graph stays visible while new data loads.
 */
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { z } from "zod";
import type { components } from "@/lib/api/schema";
import type { TaxonomyGraph } from "@/lib/api/taxonomy-graph";
import type { ArticlePreview } from "@/app/api/bff/articles/[slug]/preview/route";
import { bff } from "@/lib/bff-client";
import { topicColor } from "@/lib/topic-color";
import { Graph } from "./Graph";
import type { GraphHandle, SimNode } from "./engine";
import { Switch } from "@/components/ui/Switch";
import { Icon } from "@/components/ui/Icon";
import styles from "./explorer.module.css";

export type ExplorerTerm = { id: string; kind: "topic" | "tag"; slug: string; name: string; count: number };
type Overview = components["schemas"]["GraphNeighbourhood"];

const TERM = /^(topic|tag):[a-z0-9]+(?:-[a-z0-9]+)*$/;
const urlSchema = z.object({
  focus: z.string().regex(TERM).optional().catch(undefined),
  max: z.coerce.number().int().min(8).max(60).catch(40),
  depth: z.coerce.number().int().min(1).max(2).catch(1),
  tags: z.enum(["0", "1"]).catch("1"),
});

export function Explorer({ topics, tags, totalArticles }: { topics: ExplorerTerm[]; tags: ExplorerTerm[]; totalArticles: number }) {
  const router = useRouter();
  const params = useSearchParams();
  const url = urlSchema.parse({
    focus: params.get("focus") ?? undefined,
    max: params.get("max") ?? undefined,
    depth: params.get("depth") ?? undefined,
    tags: params.get("tags") ?? undefined,
  });
  const scope: "all" | "term" = url.focus ? "term" : "all";
  const withTags = url.tags === "1";
  const defaultTerm = topics[0]?.id ?? tags[0]?.id;

  const [arrows, setArrows] = useState(false);
  const [labels, setLabels] = useState(false);
  const [dist, setDist] = useState(130);
  const [charge, setCharge] = useState(360);
  const [filter, setFilter] = useState("");
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<SimNode | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const graph = useRef<GraphHandle | null>(null);

  const navigate = (next: Partial<{ focus: string | null; max: number; depth: number; tags: boolean }>) => {
    const search = new URLSearchParams();
    const focus = next.focus === null ? undefined : (next.focus ?? url.focus);
    if (focus) {
      search.set("focus", focus);
      search.set("depth", String(next.depth ?? url.depth));
      if (!(next.tags ?? withTags)) search.set("tags", "0");
    } else {
      search.set("max", String(next.max ?? url.max));
    }
    setSelected(null);
    router.replace(`/graph?${search.toString()}`, { scroll: false });
  };

  const overview = useQuery({
    queryKey: ["graph", "overview", url.max],
    queryFn: () => bff<Overview>(`/api/bff/graph/overview?maxNodes=${url.max}`),
    enabled: scope === "all",
    placeholderData: keepPreviousData,
  });
  const taxonomy = useQuery({
    queryKey: ["graph", "taxonomy", url.focus, url.depth, withTags],
    queryFn: () => bff<TaxonomyGraph>(`/api/bff/graph/taxonomy?term=${encodeURIComponent(url.focus!)}&depth=${url.depth}&tags=${withTags}`),
    enabled: scope === "term",
    placeholderData: keepPreviousData,
  });
  const active = scope === "all" ? overview : taxonomy;
  const data = active.data;

  const topicFilter = useMemo(() => {
    if (!hidden.size) return null;
    return new Set(topics.filter((t) => !hidden.has(t.slug)).map((t) => t.name));
  }, [hidden, topics]);

  const preview = useQuery({
    queryKey: ["article-preview", selected?.slug],
    queryFn: () => bff<ArticlePreview>(`/api/bff/articles/${encodeURIComponent(selected!.slug!)}/preview`),
    enabled: !!selected?.slug && !selected.kind,
    staleTime: Infinity,
  });

  const focusId = scope === "term" ? (data as TaxonomyGraph | undefined)?.centerId ?? null : null;
  const truncated = !!data?.truncated;
  const topicSlugByName = new Map(topics.map((t) => [t.name, t.slug]));

  const onSelect = (node: SimNode | null) => {
    if (node?.kind && node.id !== url.focus) {
      navigate({ focus: node.id });
      return;
    }
    setSelected(node);
  };
  const onOpen = (node: SimNode) => {
    if (node.kind) router.push(`/${node.kind === "topic" ? "topics" : "tags"}/${node.slug}`);
    else if (node.slug) router.push(`/articles/${node.slug}`);
  };

  return (
    <div className={styles.explorer} data-testid="view-graph">
      <div className={styles.canvas}>
        {data && (
          <Graph
            ref={graph}
            data={data}
            focusId={focusId}
            labels={labels || scope === "term" ? "always" : "auto"}
            arrows={arrows}
            suggested={false}
            linkDistance={dist}
            charge={-charge}
            topicFilter={scope === "all" ? topicFilter : null}
            filterText={filter}
            ariaLabel={`Knowledge graph: ${data.nodes?.length ?? 0} nodes, ${data.edges?.length ?? 0} links`}
            onSelect={onSelect}
            onOpen={onOpen}
            style={{ height: "100%" }}
          />
        )}
        {active.isError && (
          <p role="alert" className={styles.error}>
            Couldn&apos;t load the graph.{" "}
            <button type="button" className="btn" data-size="sm" onClick={() => active.refetch()}>
              Try again
            </button>
          </p>
        )}
      </div>

      <button type="button" className={`btn ${styles.panelToggle}`} aria-expanded={panelOpen} aria-controls="graph-panel" onClick={() => setPanelOpen((o) => !o)}>
        <Icon name="filter" size={16} /> Filters
      </button>

      <aside id="graph-panel" className={styles.panel} data-open={panelOpen || undefined} aria-label="Graph settings" data-testid="graph-panel">
        <section className={styles.section}>
          <div className={styles.head}>
            <h2>Graph</h2>
            <button type="button" className="btn" data-variant="ghost" data-size="sm" onClick={() => graph.current?.reset()} data-testid="graph-reset">
              Reset view
            </button>
          </div>
          <label className="field">
            Find a note
            <input
              type="text"
              value={filter}
              maxLength={100}
              placeholder="Type to highlight"
              onChange={(e) => {
                setFilter(e.target.value);
                graph.current?.setFilter(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                const match = graph.current?.findByTitle(filter);
                if (match) graph.current?.select(match.id);
              }}
              data-testid="graph-filter"
            />
          </label>
        </section>

        <section className={styles.section}>
          <div role="group" aria-label="Scope" className={styles.seg}>
            <button type="button" aria-pressed={scope === "all"} onClick={() => navigate({ focus: null })} data-testid="scope-all">
              Whole graph
            </button>
            <button type="button" aria-pressed={scope === "term"} onClick={() => defaultTerm && navigate({ focus: url.focus ?? defaultTerm })} data-testid="scope-local">
              Around a topic or tag
            </button>
          </div>
          {scope === "all" ? (
            <label className="field">
              Node limit <span className="tabular">{url.max}</span>
              <input type="range" min={8} max={60} step={1} defaultValue={url.max} onChange={(e) => navigate({ max: Number(e.target.value) })} data-testid="graph-max-nodes" />
            </label>
          ) : (
            <>
              <label className="field">
                Centre on
                <select value={url.focus} onChange={(e) => TERM.test(e.target.value) && navigate({ focus: e.target.value })} data-testid="graph-focus">
                  <optgroup label="Topics">
                    {topics.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Tags">
                    {tags.map((t) => (
                      <option key={t.id} value={t.id}>
                        #{t.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </label>
              <label className="field">
                Depth <span className="tabular">{url.depth}</span>
                <input type="range" min={1} max={2} step={1} value={url.depth} onChange={(e) => navigate({ depth: Number(e.target.value) })} data-testid="graph-depth" />
              </label>
              <Switch checked={withTags} onChange={(next) => navigate({ tags: next })} label="Include tags as leaves" testId="graph-include-tags" />
              <p className={styles.hint}>Leaves are topics and tags that share articles with the centre. Click one to re-centre.</p>
            </>
          )}
        </section>

        <section className={styles.section}>
          <Switch checked={arrows} onChange={setArrows} label="Arrows" />
          <Switch checked={labels} onChange={setLabels} label="Always show labels" />
          <p className={styles.hint}>
            {scope === "term"
              ? "A line means the two share at least one article. Bigger dots have more articles; grey dots are tags."
              : "Lines are links written by authors. Bigger dots have more links."}
          </p>
        </section>

        {scope === "all" && (
          <section className={styles.section}>
            <h2>Topics</h2>
            <div className={styles.topics} data-testid="graph-topics">
              {topics.map((t) => (
                <label key={t.slug}>
                  <input
                    type="checkbox"
                    checked={!hidden.has(t.slug)}
                    onChange={(e) =>
                      setHidden((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.delete(t.slug);
                        else next.add(t.slug);
                        return next;
                      })
                    }
                  />
                  <span className="dot" style={{ background: topicColor(t.slug) }} aria-hidden="true" />
                  {t.name}
                  <span className="faint tabular">{t.count}</span>
                </label>
              ))}
            </div>
          </section>
        )}

        <section className={styles.section}>
          <h2>Forces</h2>
          <label className="field">
            Link distance
            <input type="range" min={30} max={200} value={dist} onChange={(e) => setDist(Number(e.target.value))} />
          </label>
          <label className="field">
            Repel
            <input type="range" min={40} max={600} value={charge} onChange={(e) => setCharge(Number(e.target.value))} />
          </label>
        </section>
      </aside>

      {truncated && (
        <div className={styles.banner} role="status" data-testid="graph-truncated">
          {scope === "all"
            ? `Showing the ${data?.nodes?.length ?? 0} most-connected of ${totalArticles} articles. Raise the node limit to see more.`
            : "Showing the strongest connections only. Lower the depth or re-centre on a leaf to see more."}
        </div>
      )}

      <div className={styles.zoom}>
        <button type="button" aria-label="Zoom in" onClick={() => graph.current?.zoomBy(1.3)}>
          <Icon name="plus" size={16} />
        </button>
        <button type="button" aria-label="Zoom out" onClick={() => graph.current?.zoomBy(1 / 1.3)}>
          <Icon name="minus" size={16} />
        </button>
      </div>

      {selected && (
        <div className={styles.card} data-testid="graph-card">
          {selected.kind ? (
            <>
              <div className={styles.cardMeta}>
                <span className="dot" style={{ background: selected.kind === "tag" ? "var(--muted)" : topicColor(selected.slug) }} aria-hidden="true" />
                {selected.kind === "topic" ? "Topic" : "Tag"} · {selected.count} {selected.count === 1 ? "article" : "articles"}
              </div>
              <h3>{selected.title}</h3>
              <div className={styles.cardActions}>
                <Link className="btn" data-variant="primary" data-size="sm" href={`/${selected.kind === "topic" ? "topics" : "tags"}/${selected.slug}`} data-testid="graph-card-open">
                  Browse articles
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className={styles.cardMeta}>
                {selected.topic && <span className="dot" style={{ background: topicColor(selected.topic) }} aria-hidden="true" />}
                {selected.topic} · {selected.deg} {selected.deg === 1 ? "link" : "links"}
              </div>
              <h3>{selected.title}</h3>
              {preview.data?.summary && <p>{preview.data.summary}</p>}
              <div className={styles.cardActions}>
                <Link className="btn" data-variant="primary" data-size="sm" href={`/articles/${selected.slug}`} data-testid="graph-card-open">
                  Read article
                </Link>
                {selected.topic && topicSlugByName.get(selected.topic) && (
                  <button type="button" className="btn" data-size="sm" onClick={() => navigate({ focus: `topic:${topicSlugByName.get(selected.topic!)}` })} data-testid="graph-card-focus">
                    Show its topics
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
