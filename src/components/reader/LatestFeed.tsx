"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import type { components } from "@/lib/api/schema";
import { bff } from "@/lib/bff-client";
import { PostCard } from "./PostCard";

type Page = components["schemas"]["PageResponseArticleReference"];

const PAGE_SIZE = 8;

/**
 * "Latest" list (F02-FR-3). The first page is server-rendered and handed in as initial data; further
 * pages load client-side through the BFF without re-rendering the page (F02-AC-4).
 */
export function LatestFeed({ firstPage, authorSlugs }: { firstPage: Page; authorSlugs: Record<string, string> }) {
  const query = useInfiniteQuery({
    queryKey: ["articles", "latest", PAGE_SIZE],
    queryFn: ({ pageParam }) => bff<Page>(`/api/bff/articles?page=${pageParam}&size=${PAGE_SIZE}`),
    initialPageParam: 0,
    initialData: { pages: [firstPage], pageParams: [0] },
    getNextPageParam: (last) => (last.last ? undefined : (last.page ?? 0) + 1),
    staleTime: 5 * 60_000,
  });

  const articles = query.data.pages.flatMap((p) => p.content ?? []);
  return (
    <>
      <div data-testid="feed">
        {articles.map((article) => (
          <PostCard key={article.slug} article={article} authorSlug={article.authorName ? authorSlugs[article.authorName] : undefined} />
        ))}
      </div>
      {query.hasNextPage && (
        <div style={{ display: "grid", placeItems: "center", paddingBlock: 24 }}>
          <button
            type="button"
            className="btn"
            onClick={() => query.fetchNextPage()}
            disabled={query.isFetchingNextPage}
            aria-busy={query.isFetchingNextPage}
            data-testid="load-more"
          >
            {query.isFetchingNextPage ? "Loading…" : "Show more"}
          </button>
          {query.isError && (
            <p role="alert" className="muted" style={{ marginTop: 8 }}>
              Couldn&apos;t load more articles. Try again.
            </p>
          )}
        </div>
      )}
    </>
  );
}
