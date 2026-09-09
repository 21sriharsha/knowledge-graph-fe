/**
 * Shown when the backend cannot be reached.
 *
 * Distinct from an empty state on purpose: "there is nothing here" and "we cannot tell you what is
 * here" are different facts, and conflating them would have a reader conclude the platform is empty
 * when it is merely unreachable.
 */
export function BackendUnavailable({ what = 'this page' }: { what?: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-6">
      <h2 className="text-sm font-semibold">The knowledge service is not responding</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {what} could not be loaded. The content still exists — the API serving it is unavailable
        right now. Retrying in a moment is usually enough.
      </p>
    </div>
  )
}
