"use client";

import { useEffect } from "react";
import { captureError } from "@/lib/telemetry";

/** Last-resort boundary when the root layout itself fails. Must render its own <html>. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    captureError(error, { tags: { boundary: "global" } });
  }, [error]);
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100dvh", margin: 0 }}>
        <div role="alert" style={{ textAlign: "center", maxWidth: 480, padding: 16 }}>
          <h1 style={{ fontWeight: 500 }}>Something went wrong</h1>
          <p>Please try again. If it keeps happening, quote this reference: {error.digest ?? "n/a"}</p>
          <button type="button" onClick={reset}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
