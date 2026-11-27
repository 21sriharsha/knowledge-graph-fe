import { z } from "zod";
import { serverEnv } from "@/lib/env/server";
import { logger } from "@/lib/telemetry/logger";

const report = z.object({
  name: z.string().max(100),
  message: z.string().max(500),
  route: z.string().max(200).regex(/^\/[^?#\s]*$/), // path only
  kind: z.string().max(50),
});

/**
 * Browser error intake for TELEMETRY_EXPORTER=otlp (ADR 0005). Same-origin only, small validated
 * payloads, no query strings or user identifiers; logged as structured WARN for the log pipeline.
 * Disabled (204, nothing logged) unless the OTLP exporter is selected.
 */
export async function POST(request: Request) {
  if (serverEnv().TELEMETRY_EXPORTER !== "otlp") return new Response(null, { status: 204 });
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return new Response(null, { status: 403 });
  const raw = await request.text();
  if (raw.length > 2048) return new Response(null, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response(null, { status: 400 });
  }
  const parsed = report.safeParse(body);
  if (!parsed.success) return new Response(null, { status: 400 });
  logger.warn({ source: "browser", ...parsed.data }, "client.error");
  return new Response(null, { status: 204 });
}
