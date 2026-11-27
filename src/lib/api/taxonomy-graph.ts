import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { getTag, getTags, getTopic, getTopics, TAGS } from "./reader";

/**
 * INTERIM for BG-5 (no `/api/graph/taxonomy` in the backend yet): builds the topic/tag co-occurrence
 * tree from the existing topic and tag read models (F06-FR-12).
 *
 * Cost: one cached request per topic and per tag, capped at MAX_TERMS. Fine for the current content;
 * replace with the backend endpoint when BG-5 lands (same output shape, so the UI won't change).
 */
const MAX_TERMS = 200;
const CAPS = [0, 12, 4];

export type TermNode = {
  id: string;
  kind: "topic" | "tag";
  slug: string;
  title: string;
  topic?: string;
  count: number;
  distance: number;
};
export type TermEdge = { sourceId: string; targetId: string; authored: true; kind: "SHARED_ARTICLES"; weight: number; label: string };
export type TaxonomyGraph = { centerId: string; nodes: TermNode[]; edges: TermEdge[]; truncated: boolean };
type TermInfo = Omit<TermNode, "distance"> & { articles: string[] };

async function termIndex(): Promise<TermInfo[] | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.navigation, TAGS.articles);
  const [topics, tags] = await Promise.all([getTopics(), getTags()]);
  if (!topics.ok || !tags.ok) return null;
  const topicEntries = (topics.data.entries ?? []).filter((t) => t.slug).slice(0, MAX_TERMS);
  const tagEntries = (tags.data.entries ?? []).filter((t) => t.slug).slice(0, Math.max(0, MAX_TERMS - topicEntries.length));
  const [topicModels, tagModels] = await Promise.all([
    Promise.all(topicEntries.map((t) => getTopic(t.slug!))),
    Promise.all(tagEntries.map((t) => getTag(t.slug!))),
  ]);
  const terms: TermInfo[] = [];
  topicEntries.forEach((t, i) => {
    const model = topicModels[i];
    if (!model.ok) return;
    terms.push({
      id: `topic:${t.slug}`,
      kind: "topic",
      slug: t.slug!,
      title: t.name ?? t.slug!,
      topic: t.name ?? t.slug!,
      count: model.data.articleCount ?? model.data.articles?.length ?? 0,
      articles: (model.data.articles ?? []).map((a) => a.slug!).filter(Boolean),
    });
  });
  tagEntries.forEach((t, i) => {
    const model = tagModels[i];
    if (!model.ok) return;
    terms.push({
      id: `tag:${t.slug}`,
      kind: "tag",
      slug: t.slug!,
      title: `#${t.name ?? t.slug}`,
      count: model.data.articleCount ?? model.data.articles?.length ?? 0,
      articles: (model.data.articles ?? []).map((a) => a.slug!).filter(Boolean),
    });
  });
  return terms;
}

export async function buildTaxonomyGraph(term: string, depth: 1 | 2, includeTags: boolean): Promise<TaxonomyGraph | "not_found" | "unavailable"> {
  const index = await termIndex();
  if (!index) return "unavailable";
  const byId = new Map(index.map((t) => [t.id, t]));
  const root = byId.get(term);
  if (!root) return "not_found";

  const eligible = index.filter((t) => includeTags || t.kind === "topic" || t.id === root.id);
  const coOccurring = (id: string) => {
    const base = new Set(byId.get(id)!.articles);
    return eligible
      .filter((t) => t.id !== id)
      .map((t) => [t.id, t.articles.filter((a) => base.has(a)).length] as const)
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  };

  const seen = new Map<string, number>([[root.id, 0]]);
  const edges: TermEdge[] = [];
  let frontier = [root.id];
  let truncated = false;
  for (let d = 1; d <= depth; d++) {
    const next: string[] = [];
    for (const id of frontier) {
      const candidates = coOccurring(id).filter(([t]) => !seen.has(t));
      if (candidates.length > CAPS[d]) truncated = true;
      for (const [t, n] of candidates.slice(0, CAPS[d])) {
        seen.set(t, d);
        next.push(t);
        edges.push({ sourceId: id, targetId: t, authored: true, kind: "SHARED_ARTICLES", weight: n, label: `${n} shared ${n === 1 ? "article" : "articles"}` });
      }
    }
    frontier = next;
  }

  const nodes: TermNode[] = [...seen].map(([id, distance]) => {
    const { articles, ...info } = byId.get(id)!;
    void articles;
    return { ...info, distance };
  });
  return { centerId: root.id, nodes, edges, truncated };
}
