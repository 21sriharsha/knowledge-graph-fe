import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { z } from "zod";
import { backend, call } from "@/lib/api/server";
import { serverEnv } from "@/lib/env/server";
import { withSpan } from "@/lib/telemetry";
import { first, flagSchema, pageSchema, searchQuerySchema } from "@/lib/validation";
import type { components } from "@/lib/api/schema";
import { incomingRequestId } from "@/lib/auth/session";
import { SearchForm } from "@/components/search/SearchForm";
import { ErrorState } from "@/components/ui/StateView";
import { TagChip, TopicChip } from "@/components/ui/Chips";
import { slugify } from "@/lib/topic-color";
import styles from "@/components/search/search.module.css";

export const metadata: Metadata = { title: "Search", robots: { index: false } };

const PAGE_SIZE = 10;
const params = z.object({ q: searchQuerySchema.optional().catch(undefined), page: pageSchema.catch(0), understand: flagSchema(true).catch(true) });

type Props = PageProps<"/search">;
type Hit = components["schemas"]["SearchHit"];

/** Search results (F05-FR-4…11). Dynamic: query-driven, never cached. */
export default function SearchPage({ searchParams }: Props) {
  if (!serverEnv().FEATURE_SEARCH) notFound();
  return (
    <main id="main" data-view="search" className={styles.page}>
      <h1 className="sr-only">Search</h1>
      <Suspense fallback={<ResultsSkeleton />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Results({ searchParams }: { searchParams: Props["searchParams"] }) {
  await connection(); // query-driven and uncached: request time only
  const raw = await searchParams;
  const { q, page, understand } = params.parse({ q: first(raw.q), page: first(raw.page), understand: first(raw.understand) });
  if (!q) {
    return (
      <div data-testid="view-search">
        <SearchForm q="" understand={understand} />
        <p className="muted">Type a few words — try a topic, a technique, or &ldquo;by &lt;author&gt;&rdquo;.</p>
      </div>
    );
  }

  const { client, requestId } = backend({ requestId: await incomingRequestId() });
  const result = await withSpan("search", { "search.page": page, "search.understand": understand, "search.query_length": q.length }, () =>
    call(requestId, () => client.GET("/api/search", { params: { query: { q, page, size: PAGE_SIZE, understand } } })),
  );

  if (!result.ok) {
    return (
      <div data-testid="view-search">
        <SearchForm q={q} understand={understand} />
        <ErrorState requestId={result.requestId} retryHref={`/search?q=${encodeURIComponent(q)}`} />
      </div>
    );
  }

  const r = result.data;
  const hits = r.results ?? [];
  const total = r.totalResults ?? 0;
  const terms = highlightTerms(r.interpretation?.queryText || q);
  const mode = r.mode === "LEXICAL" ? "Keyword" : r.mode === "SEMANTIC" ? "Semantic" : "Hybrid";
  const base = `/search?q=${encodeURIComponent(q)}${understand ? "" : "&understand=false"}`;

  return (
    <div data-testid="view-search">
      <SearchForm q={q} understand={understand} />

      <p className={styles.meta} data-testid="search-meta" aria-live="polite">
        <span className="tabular">
          {total} {total === 1 ? "result" : "results"}
        </span>{" "}
        · {mode} · <span className="tabular">{r.tookMillis ?? 0} ms</span>
      </p>

      {understand && !r.usedQueryUnderstanding && (
        <p className={styles.notice} data-testid="interp-skipped">
          AI query understanding is unavailable right now — showing keyword results.
        </p>
      )}
      {!understand && (
        <p className={styles.noticeQuiet} data-testid="interp-off">
          AI query understanding is off.
        </p>
      )}

      {r.usedQueryUnderstanding && r.interpretation && <Interpretation interpretation={r.interpretation} />}

      {hits.length === 0 ? (
        <section className={styles.empty} data-testid="search-empty">
          <h2>No matches for &ldquo;{q}&rdquo;</h2>
          <ul>
            <li>Check the spelling or try fewer words.</li>
            <li>{understand ? "Turn AI understanding off for exact keyword matching." : "Turn AI understanding on to match by meaning."}</li>
            <li>
              <Link href="/topics">Browse topics</Link> instead.
            </li>
          </ul>
        </section>
      ) : (
        <ol className={styles.results} data-testid="search-results">
          {hits.map((hit) => (
            <HitView key={hit.articleId ?? hit.slug} hit={hit} terms={terms} />
          ))}
        </ol>
      )}

      {total > PAGE_SIZE && (
        <nav aria-label="Search results pages" className={styles.pager}>
          {page > 0 ? <Link href={`${base}&page=${page - 1}`}>← Previous</Link> : <span />}
          <span className="faint tabular">
            Page {page + 1} of {Math.ceil(total / PAGE_SIZE)}
          </span>
          {(page + 1) * PAGE_SIZE < total ? <Link href={`${base}&page=${page + 1}`}>Next →</Link> : <span />}
        </nav>
      )}
    </div>
  );
}

function Interpretation({ interpretation: i }: { interpretation: components["schemas"]["Interpretation"] }) {
  const date = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const chips: { label: string; value: string; note?: string }[] = [];
  if (i.queryText) chips.push({ label: "Words", value: `“${i.queryText}”` });
  if (i.author) chips.push({ label: "Author", value: i.author, note: i.authorResolved ? undefined : "not found" });
  for (const t of i.topics ?? []) chips.push({ label: "Topic", value: t });
  for (const t of i.tags ?? []) chips.push({ label: "Tag", value: `#${t}` });
  if (i.publishedAfter) chips.push({ label: "After", value: date.format(new Date(i.publishedAfter)) });
  if (i.publishedBefore) chips.push({ label: "Before", value: date.format(new Date(i.publishedBefore)) });
  if (!chips.length) return null;
  return (
    <div className={styles.interp} data-testid="interpretation">
      <span className={styles.interpLabel}>Understood as</span>
      {chips.map((c, idx) => (
        <span key={idx} className="chip">
          <span className="faint">{c.label}</span> {c.value}
          {c.note && <span className={styles.warn}> ({c.note})</span>}
        </span>
      ))}
    </div>
  );
}

const SCORE_PARTS: { key: keyof components["schemas"]["ScoreExplanation"]; label: string }[] = [
  { key: "lexical", label: "Keyword match" },
  { key: "semantic", label: "Meaning match" },
  { key: "authorMatch", label: "Author" },
  { key: "topicMatch", label: "Topic" },
  { key: "tagMatch", label: "Tag" },
  { key: "recency", label: "Recency" },
];

function HitView({ hit, terms }: { hit: Hit; terms: string[] }) {
  const date = hit.publishedAt ? new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(hit.publishedAt)) : null;
  const parts = SCORE_PARTS.filter((p) => typeof hit.explanation?.[p.key] === "number" && (hit.explanation[p.key] as number) > 0);
  return (
    <li className={styles.hit} data-testid="search-hit">
      <h2 className={styles.hitTitle}>
        <Link href={`/articles/${hit.slug}`}>
          <Highlight text={hit.title ?? hit.slug ?? ""} terms={terms} />
        </Link>
      </h2>
      {hit.summary && (
        <p className={styles.hitSummary}>
          <Highlight text={hit.summary} terms={terms} />
        </p>
      )}
      <div className={styles.hitMeta}>
        {hit.authorSlug ? <Link href={`/authors/${hit.authorSlug}`}>{hit.authorName}</Link> : <span>{hit.authorName}</span>}
        {date && <span>· {date}</span>}
        {hit.readingTimeMinutes ? <span>· {hit.readingTimeMinutes} min read</span> : null}
      </div>
      <div className={styles.hitTax}>
        {(hit.topics ?? []).map((t) => (
          <TopicChip key={t} slug={slugify(t)} name={t} />
        ))}
        {(hit.tags ?? []).map((t) => (
          <TagChip key={t} slug={slugify(t)} name={t} />
        ))}
      </div>
      {parts.length > 0 && (
        <details className={styles.why} data-testid="why-result">
          <summary>Why this result</summary>
          <dl>
            {parts.map((p) => {
              const value = hit.explanation![p.key] as number;
              return (
                <div key={p.key} className={styles.score}>
                  <dt>{p.label}</dt>
                  <dd>
                    <meter min={0} max={1} value={Math.min(1, value)} aria-label={`${p.label} ${Math.round(value * 100)}%`} />
                    <span className="tabular">{value.toFixed(2)}</span>
                  </dd>
                </div>
              );
            })}
            {hit.explanation?.matchedBy?.length ? (
              <div className={styles.score}>
                <dt>Matched by</dt>
                <dd>{hit.explanation.matchedBy.map((m) => m.toLowerCase().replace(/_/g, " ")).join(", ")}</dd>
              </div>
            ) : null}
          </dl>
        </details>
      )}
    </li>
  );
}

function highlightTerms(text: string): string[] {
  return [...new Set(text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 2))].slice(0, 10);
}

/** Wraps query terms in <mark> without any HTML strings (F05-FR-9). */
function Highlight({ text, terms }: { text: string; terms: string[] }) {
  if (!terms.length) return <>{text}</>;
  const pattern = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  return (
    <>
      {text.split(pattern).map((part, i) => (terms.includes(part.toLowerCase()) ? <mark key={i}>{part}</mark> : part))}
    </>
  );
}

function ResultsSkeleton() {
  return (
    <div aria-hidden="true" style={{ display: "grid", gap: 18, paddingTop: 12 }}>
      <div className="skel" style={{ height: 40 }} />
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ display: "grid", gap: 8 }}>
          <div className="skel" style={{ height: 22, width: "60%" }} />
          <div className="skel" style={{ height: 14, width: "90%" }} />
        </div>
      ))}
    </div>
  );
}
