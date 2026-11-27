"use client";

import { useEffect } from "react";
import { captureError } from "@/lib/telemetry";
import { ErrorState } from "@/components/ui/StateView";

/** Route-segment error boundary (X03-FR-7). */
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    captureError(error, { tags: { boundary: "route" } });
  }, [error]);
  return (
    <main id="main" data-view="error">
      <ErrorState requestId={error.digest}>
        <button type="button" className="btn" onClick={reset} data-testid="error-retry">
          Try again
        </button>
      </ErrorState>
    </main>
  );
}
