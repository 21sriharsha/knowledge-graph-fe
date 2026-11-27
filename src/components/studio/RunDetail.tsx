"use client";

/** Studio: one ingestion run (F09-FR-3…5): summary, pipeline, diagnostics with severity filter. */
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { components } from "@/lib/api/schema";
import { bff, BffError } from "@/lib/bff-client";
import { StatePill, type Tone } from "@/components/ui/Chips";
import { ErrorState } from "@/components/ui/StateView";
import { CopyButton } from "@/components/content/CopyButton";
import { CopyCommands } from "@/components/content/CopyCommands";
import { dateTime, DIAGNOSTIC_HELP, duration, RUN_STATE, TRIGGER } from "./runs-shared";
import styles from "./studio.module.css";

type Run = components["schemas"]["IngestionRunResponse"];
type Severity = "ERROR" | "WARNING" | "INFO";
const SEVERITY: Record<Severity, { label: string; tone: Tone }> = {
  ERROR: { label: "Error", tone: "err" },
  WARNING: { label: "Warning", tone: "warn" },
  INFO: { label: "Info", tone: "info" },
};

/** Pipeline step ids are kebab-case ("parse-markdown") → "Parse markdown". */
function humanStep(step: string): string {
  const words = step.replace(/Handler$/, "").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[-_]+/g, " ").trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function RunDetail({ id }: { id: string }) {
  const [filter, setFilter] = useState<Severity | "ALL">("ALL");
  const run = useQuery({
    queryKey: ["studio", "run", id],
    queryFn: () => bff<Run>(`/api/bff/studio/ingestions/${id}`),
    refetchInterval: (query) => (query.state.data?.state === "RUNNING" ? 3000 : false),
  });
  const pipeline = useQuery({
    queryKey: ["studio", "pipeline"],
    queryFn: () => bff<string[]>("/api/bff/studio/ingestions/pipeline"),
    staleTime: Infinity,
  });

  if (run.isPending) return <div className="skel" style={{ height: 240 }} />;
  if (run.isError) {
    if (run.error instanceof BffError && run.error.kind === "not_found") return <ErrorState title="Run not found" message="It may belong to a repository you don't manage." />;
    return <ErrorState requestId={run.error instanceof BffError ? run.error.requestId : undefined} message={run.error.message} />;
  }

  const r = run.data;
  const state = RUN_STATE[r.state ?? ""] ?? { label: r.state ?? "Unknown", tone: "neutral" as const };
  const diagnostics = r.diagnostics ?? [];
  const counts = diagnostics.reduce<Record<string, number>>((acc, d) => ({ ...acc, [d.severity ?? "INFO"]: (acc[d.severity ?? "INFO"] ?? 0) + 1 }), {});
  const shown = filter === "ALL" ? diagnostics : diagnostics.filter((d) => d.severity === filter);

  return (
    <section aria-labelledby="run-heading">
      <CopyCommands />
      <p>
        <Link href="/studio/runs">← Sync history</Link>
      </p>
      <div className={styles.toolbar}>
        <h2 id="run-heading">
          Sync run <StatePill tone={state.tone}>{state.label}</StatePill>
        </h2>
      </div>

      <dl className={styles.summary} data-testid="run-summary">
        <div className={styles.stat}>
          <dt>Trigger</dt>
          <dd>{TRIGGER[r.trigger ?? ""] ?? r.trigger}</dd>
        </div>
        <div className={styles.stat}>
          <dt>Revision</dt>
          <dd className="tabular">{r.requestedRevision ? r.requestedRevision.slice(0, 12) : "latest"}</dd>
        </div>
        <div className={styles.stat}>
          <dt>Documents</dt>
          <dd className="tabular">
            {r.documentsSucceeded ?? 0}/{r.documentsTotal ?? 0} ok · {r.documentsFailed ?? 0} failed
          </dd>
        </div>
        <div className={styles.stat}>
          <dt>Started</dt>
          <dd>{r.startedAt ? dateTime.format(new Date(r.startedAt)) : "—"}</dd>
        </div>
        <div className={styles.stat}>
          <dt>Duration</dt>
          <dd className="tabular">{duration(r.startedAt, r.finishedAt)}</dd>
        </div>
        {r.correlationId && (
          <div className={styles.stat}>
            <dt>Correlation id</dt>
            <dd style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <code id="run-correlation" style={{ fontSize: 12, overflowWrap: "anywhere" }}>
                {r.correlationId}
              </code>
              <CopyButton targetId="run-correlation" label="Copy correlation id" />
            </dd>
          </div>
        )}
      </dl>

      {pipeline.data?.length ? (
        <>
          <h3>Pipeline</h3>
          <ol className={styles.pipeline} data-testid="pipeline" aria-label="Processing steps, in order">
            {pipeline.data.map((step) => (
              <li key={step}>{humanStep(step)}</li>
            ))}
          </ol>
        </>
      ) : null}

      <div className={styles.toolbar}>
        <h3 style={{ margin: 0 }}>Diagnostics</h3>
        <div className={styles.filters} role="group" aria-label="Filter by severity">
          {(["ALL", "ERROR", "WARNING", "INFO"] as const).map((s) => (
            <button key={s} type="button" aria-pressed={filter === s} onClick={() => setFilter(s)}>
              {s === "ALL" ? `All (${diagnostics.length})` : `${SEVERITY[s].label} (${counts[s] ?? 0})`}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="muted" data-testid="diagnostics-empty">
          {diagnostics.length === 0 ? "Clean run — no diagnostics." : "No diagnostics at this severity."}
        </p>
      ) : (
        <table className={styles.table} data-testid="diagnostics">
          <thead>
            <tr>
              <th scope="col">Severity</th>
              <th scope="col">Issue</th>
              <th scope="col">File</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((d, i) => {
              const sev = SEVERITY[(d.severity as Severity) ?? "INFO"] ?? SEVERITY.INFO;
              return (
                <tr key={`${d.code}-${d.sourcePath}-${i}`}>
                  <td>
                    <StatePill tone={sev.tone}>{sev.label}</StatePill>
                  </td>
                  <td>
                    <strong>{d.code}</strong> — {d.message}
                    {d.code && DIAGNOSTIC_HELP[d.code] && <span className={styles.help}>{DIAGNOSTIC_HELP[d.code]}</span>}
                  </td>
                  <td>
                    <span className={styles.sub}>{d.sourcePath}</span>
                    {d.articleSlug && <Link href={`/articles/${d.articleSlug}`}>View article</Link>}
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
