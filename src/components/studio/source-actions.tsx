'use client'

import { useState, useTransition } from 'react'

import { setSourceActive, syncSource } from '@/lib/studio-actions'

/**
 * Per-repository controls.
 *
 * A client island only because it needs pending and error state. The work happens in a Server
 * Action, so no credentials cross into the browser.
 *
 * "Sync now" is how a run is retried: ingestion is idempotent, so a fresh sync is safer and more
 * honest than a per-run retry button that would imply the old run resumes.
 */
export function SourceActions({ id, active }: { id: string; active: boolean }) {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  function run(action: () => Promise<{ ok: true } | { ok: false; message: string }>, success: string) {
    setMessage(null)
    setNote(null)
    startTransition(async () => {
      const result = await action()
      if (result.ok) setNote(success)
      else setMessage(result.message)
    })
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={pending || !active}
          onClick={() => run(() => syncSource(id), 'Sync requested — it runs in the background.')}
          className="rounded-md border border-border px-2.5 py-1 text-xs hover:bg-muted disabled:opacity-50"
          title={active ? 'Fetch and re-materialize this repository now' : 'Repository is paused'}
        >
          {pending ? 'Working…' : 'Sync now'}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            run(
              () => setSourceActive(id, !active),
              active ? 'Synchronization paused.' : 'Synchronization resumed.',
            )
          }
          className="rounded-md border border-border px-2.5 py-1 text-xs hover:bg-muted disabled:opacity-50"
        >
          {active ? 'Pause' : 'Resume'}
        </button>
      </div>
      {/* aria-live so the outcome is announced, not just shown. */}
      <p aria-live="polite" className="text-xs text-muted-foreground">
        {message ? <span className="text-foreground">{message}</span> : note}
      </p>
    </div>
  )
}
