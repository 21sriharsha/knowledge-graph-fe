import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ApiRequestError, api } from '@/lib/api'
import type { IngestionDiagnostic, IngestionRunResponse } from '@/lib/types'

export const metadata: Metadata = { title: 'Ingestion run' }

/**
 * One ingestion run and everything it reported.
 *
 * This page is the answer to "why did my article not appear", so the diagnostics are the content,
 * not a footnote. They are grouped by severity, each carrying the source path that produced it, so
 * an author can go straight to the file rather than hunting for it.
 */
export default async function IngestionRunPage(props: PageProps<'/studio/ingestions/[id]'>) {
  const { id } = await props.params

  let run: IngestionRunResponse
  try {
    run = await api.studio.ingestion(id)
  } catch (error) {
    if (error instanceof ApiRequestError && error.isNotFound) notFound()
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link href="/studio" className="text-sm text-muted-foreground hover:text-foreground">
          ← Studio
        </Link>
        <div role="alert" className="mt-6 rounded-md border border-border bg-muted/50 p-6 text-sm">
          This run could not be loaded.
        </div>
      </div>
    )
  }

  const errors = run.diagnostics.filter((d) => d.severity === 'ERROR')
  const warnings = run.diagnostics.filter((d) => d.severity === 'WARNING')
  const info = run.diagnostics.filter((d) => d.severity === 'INFO')

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/studio" className="text-sm text-muted-foreground hover:text-foreground">
        ← Studio
      </Link>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">{stateLabel(run.state)}</h1>
      <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
        <Row term="Trigger" value={run.trigger.toLowerCase()} />
        <Row term="Started" value={new Date(run.startedAt).toLocaleString('en-GB')} />
        {run.finishedAt ? (
          <Row term="Finished" value={new Date(run.finishedAt).toLocaleString('en-GB')} />
        ) : null}
        {run.requestedRevision ? <Row term="Revision" value={run.requestedRevision} mono /> : null}
        <Row term="Correlation id" value={run.correlationId} mono />
      </dl>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Count label="Documents" value={run.documentsTotal} />
        <Count label="Updated" value={run.documentsSucceeded} />
        {/* Neutral wording: an unchanged document is a healthy outcome, not a near-miss. */}
        <Count label="Already current" value={run.documentsSkipped} />
        <Count label="Failed" value={run.documentsFailed} />
      </div>

      {run.diagnostics.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">
          This run reported nothing worth flagging.
        </p>
      ) : (
        <div className="mt-8 space-y-8">
          <DiagnosticGroup
            title="Errors"
            description="These documents were not materialized."
            diagnostics={errors}
          />
          <DiagnosticGroup
            title="Warnings"
            description="These were published, but something needs your attention."
            diagnostics={warnings}
          />
          <DiagnosticGroup title="Notes" diagnostics={info} />
        </div>
      )}
    </div>
  )
}

function DiagnosticGroup({
  title,
  description,
  diagnostics,
}: {
  title: string
  description?: string
  diagnostics: IngestionDiagnostic[]
}) {
  if (diagnostics.length === 0) return null
  return (
    <section aria-labelledby={`diag-${title}`}>
      <h2 id={`diag-${title}`} className="text-sm font-semibold tracking-tight">
        {title} <span className="font-normal text-muted-foreground">({diagnostics.length})</span>
      </h2>
      {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
      <ul className="mt-3 divide-y divide-border rounded-md border border-border">
        {diagnostics.map((diagnostic, index) => (
          <li key={index} className="px-4 py-3">
            <p className="text-sm">{diagnostic.message}</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {diagnostic.code}
              {diagnostic.sourcePath ? ` · ${diagnostic.sourcePath}` : ''}
              {diagnostic.articleSlug ? ` · ${diagnostic.articleSlug}` : ''}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Row({ term, value, mono }: { term: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-2">
      <dt className="text-muted-foreground">{term}</dt>
      <dd className={mono ? 'truncate font-mono text-xs' : ''}>{value}</dd>
    </div>
  )
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border px-3 py-2">
      <p className="text-lg font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function stateLabel(state: IngestionRunResponse['state']): string {
  switch (state) {
    case 'RUNNING':
      return 'Running'
    case 'SUCCEEDED':
      return 'Succeeded'
    case 'PARTIALLY_SUCCEEDED':
      return 'Partially succeeded'
    case 'FAILED':
      return 'Failed'
  }
}
