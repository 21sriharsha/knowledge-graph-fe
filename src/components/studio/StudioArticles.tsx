"use client";

/**
 * Studio: articles (F07). State filter, allowed transitions only, inline confirmation for
 * unpublish/archive, optimistic updates with rollback; the BFF expires public caches on success.
 */
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { components } from "@/lib/api/schema";
import { bff, BffError } from "@/lib/bff-client";
import { StatePill, type Tone } from "@/components/ui/Chips";
import { EmptyState, ErrorState } from "@/components/ui/StateView";
import { useToast } from "@/components/ui/Toast";
import { useStudioAccount } from "./StudioShell";
import styles from "./studio.module.css";

type Article = components["schemas"]["ArticleResponse"];
type Page = components["schemas"]["PageResponseArticleResponse"];
type AuthorPage = components["schemas"]["PageResponseAuthorResponse"];
type State = "DRAFT" | "PUBLISHED" | "ARCHIVED";
type Action = "publish" | "unpublish" | "archive";

const STATE: Record<State, { label: string; tone: Tone }> = {
  DRAFT: { label: "Draft", tone: "neutral" },
  PUBLISHED: { label: "Published", tone: "ok" },
  ARCHIVED: { label: "Archived", tone: "warn" },
};
const NEXT_STATE: Record<Action, State> = { publish: "PUBLISHED", unpublish: "DRAFT", archive: "ARCHIVED" };
const ALLOWED: Record<State, Action[]> = { DRAFT: ["publish"], PUBLISHED: ["unpublish", "archive"], ARCHIVED: ["publish"] };
const LABEL: Record<Action, string> = { publish: "Publish", unpublish: "Unpublish", archive: "Archive" };
const updated = new Intl.DateTimeFormat("en", { dateStyle: "medium" });
const QUERY_KEY = ["studio", "articles"];

export function StudioArticles() {
  const account = useStudioAccount();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState<State | "ALL">("ALL");
  const [confirm, setConfirm] = useState<{ slug: string; action: Action } | null>(null);

  const articles = useQuery({ queryKey: QUERY_KEY, queryFn: () => bff<Page>("/api/bff/studio/articles?page=0&size=100") });
  const authors = useQuery({
    queryKey: ["studio", "authors"],
    queryFn: () => bff<AuthorPage>("/api/bff/studio/authors"),
    enabled: account.admin,
    staleTime: 5 * 60_000,
  });

  const transition = useMutation({
    mutationFn: ({ slug, action }: { slug: string; action: Action }) => bff<Article>(`/api/bff/studio/articles/${slug}/${action}`, { method: "POST" }),
    onMutate: async ({ slug, action }) => {
      setConfirm(null);
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData<Page>(QUERY_KEY);
      queryClient.setQueryData<Page>(QUERY_KEY, (page) =>
        page ? { ...page, content: page.content?.map((a) => (a.slug === slug ? { ...a, publicationState: NEXT_STATE[action] } : a)) } : page,
      );
      return { previous };
    },
    onError: (error, { action }, ctx) => {
      queryClient.setQueryData(QUERY_KEY, ctx?.previous);
      if (error instanceof BffError && error.kind === "not_found") {
        toast("This article is no longer available to you.", "err");
        void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      } else {
        toast(error instanceof BffError ? error.message : `Couldn't ${LABEL[action].toLowerCase()} the article.`, "err");
      }
    },
    onSuccess: (article, { action }) => toast(`${article.title ?? "Article"} ${action === "publish" ? "published" : action === "unpublish" ? "unpublished" : "archived"}.`),
    onSettled: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  if (articles.isPending) return <div className="skel" style={{ height: 240 }} />;
  if (articles.isError) return <ErrorState requestId={articles.error instanceof BffError ? articles.error.requestId : undefined} message={articles.error.message} />;

  const all = [...(articles.data.content ?? [])].sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
  const counts = all.reduce<Record<string, number>>((acc, a) => ({ ...acc, [a.publicationState ?? ""]: (acc[a.publicationState ?? ""] ?? 0) + 1 }), {});
  const shown = filter === "ALL" ? all : all.filter((a) => a.publicationState === filter);
  const authorName = (id?: string) => authors.data?.content?.find((a) => a.id === id)?.displayName ?? "—";
  const paged = !articles.data.last;

  return (
    <section aria-labelledby="articles-heading" data-testid="studio-articles">
      <div className={styles.toolbar}>
        <h2 id="articles-heading">Articles</h2>
        <div className={styles.filters} role="group" aria-label="Filter by state">
          {(["ALL", "DRAFT", "PUBLISHED", "ARCHIVED"] as const).map((s) => (
            <button key={s} type="button" aria-pressed={filter === s} onClick={() => setFilter(s)}>
              {s === "ALL" ? `All (${all.length})` : `${STATE[s].label} (${counts[s] ?? 0})`}
            </button>
          ))}
        </div>
      </div>
      {paged && <p className="faint">Counts are for the first {all.length} articles (BG-14: no server-side state filter yet).</p>}

      {all.length === 0 ? (
        <EmptyState testId="studio-articles-empty" title="No articles yet" body="Connect a repository and sync it to see articles here." action={{ label: "Repositories", href: "/studio/repositories" }} />
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Article</th>
              <th scope="col">State</th>
              {account.admin && <th scope="col">Author</th>}
              <th scope="col">Updated</th>
              <th scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map((a) => {
              const state = (a.publicationState ?? "DRAFT") as State;
              const pendingAction = confirm && confirm.slug === a.slug ? confirm.action : null;
              return (
                <tr key={a.id} data-testid="studio-article-row" data-slug={a.slug}>
                  <td>
                    {state === "PUBLISHED" ? (
                      <Link href={`/articles/${a.slug}`} className={styles.rowTitle} data-testid="view-article">
                        {a.title}
                      </Link>
                    ) : (
                      <span className={styles.rowTitle}>{a.title}</span>
                    )}
                    <span className={styles.sub}>
                      {a.sourcePath} · rev {a.revisionNumber ?? 1}
                      {a.topics?.length ? ` · ${a.topics.join(", ")}` : ""}
                    </span>
                  </td>
                  <td>
                    <StatePill tone={STATE[state].tone}>{STATE[state].label}</StatePill>
                  </td>
                  {account.admin && <td>{authorName(a.authorId)}</td>}
                  <td>{a.updatedAt ? updated.format(new Date(a.updatedAt)) : "—"}</td>
                  <td>
                    {pendingAction ? (
                      <div className={styles.confirm} data-testid="confirm-row">
                        <span>{pendingAction === "archive" ? "Archive this article?" : "Take this article offline?"}</span>
                        <button type="button" className="btn" data-size="sm" autoFocus onClick={() => setConfirm(null)}>
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="btn"
                          data-size="sm"
                          data-variant="danger"
                          onClick={() => transition.mutate({ slug: a.slug!, action: pendingAction })}
                          data-testid="confirm-yes"
                        >
                          {LABEL[pendingAction]}
                        </button>
                      </div>
                    ) : (
                      <div className={styles.actions}>
                        {ALLOWED[state].map((action) => (
                          <button
                            key={action}
                            type="button"
                            className="btn"
                            data-size="sm"
                            data-variant={action === "publish" ? "primary" : undefined}
                            onClick={() => (action === "publish" ? transition.mutate({ slug: a.slug!, action }) : setConfirm({ slug: a.slug!, action }))}
                            data-testid={`act-${action}`}
                          >
                            {LABEL[action]}
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
