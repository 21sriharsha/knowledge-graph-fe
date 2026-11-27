/** Browser half of the OTLP adapter: beacons errors to the BFF intake (see otlp-server.ts). */
import type { ErrorContext, TelemetryAdapter } from "../index";

const MAX_REPORTS_PER_PAGE = 10;

export function createBeaconAdapter(): TelemetryAdapter {
  let sent = 0;
  return {
    name: "otlp",
    captureError(error: unknown, context?: ErrorContext) {
      if (sent >= MAX_REPORTS_PER_PAGE || typeof navigator === "undefined") return;
      sent++;
      const err = error instanceof Error ? error : new Error(String(error));
      const body = JSON.stringify({
        name: err.name.slice(0, 100),
        message: err.message.slice(0, 500),
        route: (context?.route ?? window.location.pathname).slice(0, 200), // path only — no query string
        kind: String(context?.tags?.kind ?? context?.tags?.boundary ?? "client").slice(0, 50),
      });
      const blob = new Blob([body], { type: "application/json" });
      if (!navigator.sendBeacon?.("/api/telemetry/client-error", blob)) {
        void fetch("/api/telemetry/client-error", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
      }
    },
  };
}
