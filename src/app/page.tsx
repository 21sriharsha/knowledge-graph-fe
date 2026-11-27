import Link from "next/link";
import { Suspense } from "react";
import { getArticlesPage, getGraphOverview, getNavigation, getTrending, readSafely } from "@/lib/api/reader";
import { serverEnv } from "@/lib/env/server";
import { HeroGraph } from "@/components/reader/HeroGraph";
import { LatestFeed } from "@/components/reader/LatestFeed";
import { EmptyState, ErrorState } from "@/components/ui/StateView";
import { Icon } from "@/components/ui/Icon";
import { topicColor, slugify } from "@/lib/topic-color";
import styles from "./home.module.css";

/** Home (F02). Cached sections prerender into the static shell; each streams independently. */
export default function Home() {
  const explorer = serverEnv().FEATURE_EXPLORER;
  return (
    <main id="main" data-view="home" className={`wrap ${styles.home}`}>
      <Suspense fallback={<section className={`${styles.hero} skel`} aria-hidden="true" />}>
        <Hero explorer={explorer} />
      </Suspense>
      <div className={styles.feed}>
        <h2 className={styles.feedHead} data-testid="feed-head">
          Latest
        </h2>
        <Suspense fallback={<FeedSkeleton />}>
          <Feed />
        </Suspense>
      </div>
      <aside className={styles.rail}>
        <Suspense fallback={<div className="skel" style={{ height: 220 }} />}>
          <Trending />
        </Suspense>
        <Suspense fallback={<div className="skel" style={{ height: 120 }} />}>
          <Topics />
        </Suspense>
      </aside>
    </main>
  );
}

async function Hero({ explorer }: { explorer: boolean }) {
  const [nav, overview] = await Promise.all([readSafely(getNavigation), readSafely(() => getGraphOverview(40))]);
  if (!nav.ok) return <ErrorState requestId={nav.requestId} retryHref="/" />;
  const count = nav.data.publishedArticleCount ?? 0;
  if (count === 0) {
    return (
      <div className={styles.fullRow}>
        <EmptyState
          testId="empty-home"
          title="Nothing published yet"
          body="Articles appear here as soon as a connected repository is synced."
        />
      </div>
    );
  }
  const edges = overview.ok ? (overview.data.edges?.length ?? 0) : 0;
  return (
    <section className={styles.hero} aria-label="Graph overview" data-testid="home-graph">
      <div className={styles.heroCopy}>
        <div className="eyebrow tabular">
          {count} {count === 1 ? "article" : "articles"} · {edges} {edges === 1 ? "link" : "links"}
        </div>
        <h1>Everything links to something.</h1>
        <p>Read an article, then follow the connections. Hover a node to see its neighbours, click to explore.</p>
      </div>
      <div className={styles.canvas}>{overview.ok && <HeroGraph data={overview.data} explorerEnabled={explorer} />}</div>
      {explorer && (
        <Link className={`btn ${styles.cta}`} href="/graph" data-testid="open-explorer">
          <Icon name="graph" size={16} />
          Open the graph
        </Link>
      )}
    </section>
  );
}

async function Feed() {
  const [page, nav] = await Promise.all([readSafely(() => getArticlesPage(0, 8)), readSafely(getNavigation)]);
  if (!page.ok) return <ErrorState requestId={page.requestId} retryHref="/" />;
  if (!page.data.content?.length) return <p className="muted">No articles yet.</p>;
  const authorSlugs = Object.fromEntries(
    (nav.ok ? (nav.data.authors ?? []) : []).filter((a) => a.label && a.slug).map((a) => [a.label!, a.slug!]),
  );
  return <LatestFeed firstPage={page.data} authorSlugs={authorSlugs} />;
}

async function Trending() {
  const [trending, nav] = await Promise.all([readSafely(() => getTrending(7, 6)), readSafely(getNavigation)]);
  // Trending failure only hides the section (F02 partial-failure rule).
  if (!trending.ok || !trending.data.length) return null;
  const topicSlug = new Map((nav.ok ? (nav.data.topics ?? []) : []).map((t) => [t.label, t.slug]));
  return (
    <section data-testid="trending">
      <h3 className={styles.railHead}>Most read this week</h3>
      <ol className={styles.trend}>
        {trending.data.map((t) => {
          const slug = t.topic ? (topicSlug.get(t.topic) ?? slugify(t.topic)) : undefined;
          return (
            <li key={t.slug}>
              <div>
                <Link href={`/articles/${t.slug}`}>{t.title}</Link>
                <div className={styles.trendMeta}>
                  {t.authorName} · <span className="tabular">{(t.views ?? 0).toLocaleString("en")}</span> reads
                </div>
                {t.topic && slug && (
                  <div className={styles.trendTax} data-testid="trending-taxonomy">
                    <Link className="chip" href={`/topics/${slug}`} data-testid="topic-chip">
                      <span className="dot" style={{ background: topicColor(slug) }} aria-hidden="true" />
                      {t.topic}
                    </Link>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

const TOPIC_LIMIT = 12;

async function Topics() {
  const nav = await readSafely(getNavigation);
  if (!nav.ok || !nav.data.topics?.length) return null;
  const topics = [...nav.data.topics].sort((a, b) => (b.articleCount ?? 0) - (a.articleCount ?? 0));
  return (
    <section>
      <h3 className={styles.railHead}>Topics</h3>
      <div className={styles.topicList}>
        {topics.slice(0, TOPIC_LIMIT).map((t) => (
          <Link key={t.slug} className="chip" href={`/topics/${t.slug}`} data-testid="topic-chip">
            <span className="dot" style={{ background: topicColor(t.slug) }} aria-hidden="true" />
            {t.label} <span className="faint tabular">{t.articleCount}</span>
          </Link>
        ))}
      </div>
      {topics.length > TOPIC_LIMIT && (
        <Link href="/topics" className={styles.seeAll}>
          See all topics
        </Link>
      )}
    </section>
  );
}

function FeedSkeleton() {
  return (
    <div aria-hidden="true" style={{ display: "grid", gap: 24, paddingTop: 16 }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ display: "grid", gap: 8 }}>
          <div className="skel" style={{ width: 140, height: 14 }} />
          <div className="skel" style={{ width: "70%", height: 24 }} />
          <div className="skel" style={{ width: "95%", height: 14 }} />
        </div>
      ))}
    </div>
  );
}
