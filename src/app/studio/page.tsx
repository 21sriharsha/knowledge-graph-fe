import type { Metadata } from 'next'
import Link from 'next/link'

import { SourceActions } from '@/components/studio/source-actions'
import { ApiRequestError, api } from '@/lib/api'
import type { AccountModel, IngestionRunResponse, SourceResponse } from '@/lib/types'

export const metadata: Metadata = { title: 'Studio' }

/**
 * The studio overview: connected repositories and what ingestion has been doing.
 *
 * Operational rather than editorial. Content enters through Git, so this page answers the two
 * questions an author actually has — "is my repository connected" and "did my last commit make it
 * in" — on one screen, without navigation.
 *
 * It shows only what the signed-in account owns, and it shows that because the backend returns only
 * what they own. Nothing here filters: a studio that hid other people's repositories in the browser
 * would be a studio that had already been sent them.
 */
export default async function StudioPage() {
  let account: AccountModel | null = null
  let sources: SourceResponse[] = []
  let runs: IngestionRunResponse[] = []
  let error: string | null = null
  let errorId: string | null = null

  // Asked first and separately, because it is the one call a brand-new account can make. Without
  // it, someone who has just signed up sees an empty studio and no reason for it.
  try {
    account = await api.studio.me()
  } catch (caught) {
    error = studioError(caught)
    errorId = caught instanceof ApiRequestError ? (caught.requestId ?? null) : null
  }

  const canOperate = (account?.roles.length ?? 0) > 0
  const hasByline = Boolean(account?.authorId) || account?.roles.includes('ADMIN')

  if (account && canOperate) {
    try {
      ;[sources, runs] = await Promise.all([api.studio.sources(), api.studio.ingestions(10)])
    } catch (caught) {
      error = studioError(caught)
      errorId = caught instanceof ApiRequestError ? (caught.requestId ?? null) : null
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Studio</h1>
        {hasByline ? (
          <Link
            href="/studio/sources/new"
            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
          >
            Connect a repository
          </Link>
        ) : null}
      </div>

      {account && !canOperate ? (
        <div className="mt-6 rounded-md border border-border bg-muted/50 p-6 text-sm">
          <p className="font-medium">Your account is not set up yet.</p>
          <p className="mt-2 text-muted-foreground">
            You are signed in{account.email ? ` as ${account.email}` : ''}, but an administrator has
            not given this account a role yet. There is nothing you can do here until they do —
            that is the platform working as intended, not an error.
          </p>
        </div>
      ) : account && !hasByline ? (
        <div className="mt-6 rounded-md border border-border bg-muted/50 p-6 text-sm">
          <p className="font-medium">No byline linked to this account.</p>
          <p className="mt-2 text-muted-foreground">
            Repositories and articles belong to an author, and this account has not been linked to
            one. An administrator links it once; after that your repositories appear here. Until
            then there is nothing for this account to own.
          </p>
        </div>
      ) : null}

      {error ? (
        <div role="alert" className="mt-6 rounded-md border border-border bg-muted/50 p-6 text-sm">
          <p>{error}</p>
          {errorId ? (
            // Shown so a report can be acted on. Pages render on the server, so without this the
            // best anyone can send is a screenshot and a rough time.
            <p className="mt-3 text-xs text-muted-foreground">
              Reference <code className="font-mono">{errorId}</code> — quote this and the failure
              can be found in the logs directly.
            </p>
          ) : null}
        </div>
      ) : (
        <>
          <section aria-labelledby="sources-heading" className="mt-8">
            <h2 id="sources-heading" className="text-sm font-semibold tracking-tight">
              Repositories
            </h2>
            {sources.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Nothing connected yet. Content enters the platform by committing Markdown to a
                repository —{' '}
                <Link href="/studio/sources/new" className="underline underline-offset-4">
                  connect one
                </Link>{' '}
                to get started.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {sources.map((source) => (
                  <li key={source.id} className="flex items-start justify-between gap-4 py-4">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {source.displayName}
                        {!source.active ? (
                          <span className="ml-2 rounded border border-border px-1.5 py-0.5 text-xs font-normal text-muted-foreground">
                            paused
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                        {providerLabel(source.sourceType)} · {source.owner}/{source.repository}
                        {source.project ? ` · ${source.project}` : ''} · {source.defaultBranch}
                        {source.contentPath ? ` · ${source.contentPath}/` : ''}
                      </p>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {source.lastSyncedAt
                          ? `Last synced ${formatWhen(source.lastSyncedAt)}`
                          : 'Never synced'}
                        {!source.webhookSecretConfigured ? (
                          // Worth saying plainly: without it the repository only updates on the
                          // periodic reconciliation, which looks like "nothing is happening".
                          <span className="ml-2">· no webhook secret, updates on schedule only</span>
                        ) : null}
                      </p>
                    </div>
                    <SourceActions id={source.id} active={source.active} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="runs-heading" className="mt-10">
            <h2 id="runs-heading" className="text-sm font-semibold tracking-tight">
              Recent ingestion
            </h2>
            {runs.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Nothing has run yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {runs.map((run) => (
                  <li key={run.id} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <Link
                        href={`/studio/ingestions/${run.id}`}
                        className="text-sm hover:underline underline-offset-4"
                      >
                        <RunState state={run.state} />
                      </Link>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatWhen(run.startedAt)} · {run.trigger.toLowerCase()} ·{' '}
                        {describeCounts(run)}
                      </p>
                    </div>
                    <Link
                      href={`/studio/ingestions/${run.id}`}
                      className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Details
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}

export function RunState({ state }: { state: IngestionRunResponse['state'] }) {
  // Wording, not colour — a status conveyed only by colour fails FRONTEND-SPEC §12, and
  // "partially succeeded" is a meaningfully different outcome from "failed".
  const label: Record<IngestionRunResponse['state'], string> = {
    RUNNING: 'Running',
    SUCCEEDED: 'Succeeded',
    PARTIALLY_SUCCEEDED: 'Partially succeeded',
    FAILED: 'Failed',
  }
  return <span className="font-medium">{label[state]}</span>
}

/** Skipped is a healthy outcome — content already current — so it is never phrased as a problem. */
export function describeCounts(run: IngestionRunResponse): string {
  const parts: string[] = []
  if (run.documentsSucceeded > 0) parts.push(`${run.documentsSucceeded} updated`)
  if (run.documentsSkipped > 0) parts.push(`${run.documentsSkipped} already current`)
  if (run.documentsFailed > 0) parts.push(`${run.documentsFailed} failed`)
  if (parts.length === 0) return 'no documents'
  return parts.join(', ')
}

export function providerLabel(type: SourceResponse['sourceType']): string {
  switch (type) {
    case 'GITHUB':
      return 'GitHub'
    case 'GITLAB':
      return 'GitLab'
    case 'AZURE_DEVOPS':
      return 'Azure DevOps'
    default:
      return type
  }
}

export function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

/**
 * Turns a failed studio call into something the reader can act on.
 *
 * <p>Every branch here answers "what do I do now", which is the only reason to show an error at all.
 * These messages talked about configured credentials until sign-in existed; saying that to someone
 * who has just signed in successfully sends them looking for an environment variable when the real
 * answer is that nobody has given their account a role yet.
 */
function studioError(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.code === 'NOT_SIGNED_IN') {
      return 'Your session has expired. Sign in again to continue.'
    }
    if (error.status === 401) {
      return 'The backend did not accept your session. Signing out and back in usually fixes it; if it does not, the identity provider and the backend disagree about who issues tokens.'
    }
    if (error.status === 403) {
      return 'You are signed in, but this account is not allowed to do that. An administrator controls which accounts can operate the studio.'
    }
    if (error.code === 'BACKEND_UNREACHABLE') {
      return 'The knowledge service is not responding, so the studio cannot load.'
    }
    if (error.status >= 500) {
      return 'The backend failed while loading the studio. This is a fault on our side, not something you did wrong.'
    }
  }
  return 'The studio could not be loaded.'
}
