import { connection } from "next/server";
import { serverEnv } from "@/lib/env/server";
import { logger } from "@/lib/telemetry/logger";

/** Readiness (X03-FR-10): checks the backend actuator with a 2 s timeout. Never cached. */
export async function GET() {
  await connection();
  const headers = { "Cache-Control": "no-store" };
  try {
    const response = await fetch(`${serverEnv().API_BASE_URL}/actuator/health`, {
      signal: AbortSignal.timeout(2000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`backend health ${response.status}`);
    return Response.json({ status: "ready", backend: "up" }, { headers });
  } catch (error) {
    logger.warn({ err: { message: (error as Error).message } }, "readiness.backend_down");
    return Response.json({ status: "not_ready", backend: "down" }, { status: 503, headers });
  }
}
