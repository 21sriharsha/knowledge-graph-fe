"use client";

/**
 * Studio: sync history (F09-FR-1/2). Polls every 3 s while any listed run is RUNNING (and the tab is
 * visible — TanStack Query pauses intervals in hidden tabs by default), stops when none are.
 */
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import type { components } from "@/lib/api/schema";
import { bff, BffError } from "@/lib/bff-client";
import { StatePill } from "@/components/ui/Chips";
import { EmptyState, ErrorState } from "@/components/ui/StateView";
import { dateTime, duration, RUN_STATE, TRIGGER } from "./runs-shared";
import styles from "./studio.module.css";

type Run = components["schemas"]["IngestionRunResponse"];
type Source = components["schemas"]["SourceResponse"];

export function SyncHistory() {
  const router = useRouter();
  const params = useSearchParams();
  const repositoryId = z.uuid().optional().catch(undefined).parse(params.get("repositoryId") ?? undefined);

  const sources = useQuery({ queryKey: ["studio", "sources"], queryFn: () => bff<Source[]>("/api/bff/studio/sources") });
  const runs = useQuery({
    queryKey: ["studio", "runs", repositoryId ?? "all"],
    queryFn: () => bff<Run[]>(`/api/bff/studio/ingestions?limit=20${repositoryId ? `&repositoryId=${repositoryId}` : ""}`),
    refetchInterval: (query) => (query.state.data?.some((r) => r.state === "RUNNING") ? 3000 : false),
  });
  const repoName = (id?: string) => sources.data?.find((s) => s.id === id)?.displayName ?? "Repository";

  return (
    <section aria-labelledby="runs-heading">
      <div className={styles.toolbar}>
        <h2 id="runs-heading">Sync history</h2>
        <label className="field" style={{ minWidth: 220 }}>
          <span className="sr-only">Repository</span>
          <select
            value={repositoryId ?? ""}
            onChange={(e) => router.replace(e.target.value ? `/studio/runs?repositoryId=${e.target.value}` : "/studio/runs", { scroll: false })}
            aria-label="Filter by repository"
          >
            <option value="">All repositories</option>
            {(sources.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.displayName}
              </option>
            ))}
          </select>
        </label>
      </div>

      {runs.isPending ? (
        <div className="skel" style={{ height: 200 }} />
      ) : runs.isError ? (
        <ErrorState requestId={runs.error instanceof BffError ? runs.error.requestId : undefined} message={runs.error.message} />
      ) : runs.data.length === 0 ? (
        <EmptyState testId="runs-empty" title="No syncs yet" body="Runs appear here when a repository is synced." action={{ label: "Repositories", href: "/studio/repositories" }} />
      ) : (
        <table className={styles.table} data-testid="runs-table">
          <thead>
            <tr>
              <th scope="col">State</th>
              <th scope="col">Repository</th>
              <th scope="col">Documents</th>
              <th scope="col">Started</th>
              <th scope="col">Duration</th>
            </tr>
          </thead>
          <tbody>
            {runs.data.map((run) => {
              const state = RUN_STATE[run.state ?? ""] ?? { label: run.state ?? "Unknown", tone: "neutral" as const };
              return (
                <tr key={run.id} data-testid="run-row">
                  <td>
                    <StatePill tone={state.tone}>{state.label}</StatePill>
                  </td>
                  <td>
                    <Link href={`/studio/runs/${run.id}`} className={styles.rowTitle}>
                      {repoName(run.repositoryId)}
                    </Link>
                    <span className={styles.sub}>
                      {TRIGGER[run.trigger ?? ""] ?? run.trigger}
                      {run.requestedRevision ? ` · ${run.requestedRevision.slice(0, 7)}` : ""}
                    </span>
                  </td>
                  <td className="tabular">
                    {run.documentsSucceeded ?? 0} ok · {run.documentsSkipped ?? 0} skipped · {run.documentsFailed ?? 0} failed
                    <span className={styles.sub}>of {run.documentsTotal ?? 0}</span>
                  </td>
                  <td>{run.startedAt ? dateTime.format(new Date(run.startedAt)) : "—"}</td>
                  <td className="tabular">{duration(run.startedAt, run.finishedAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
