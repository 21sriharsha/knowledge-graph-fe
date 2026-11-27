import { createHmac, timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { serverEnv } from "@/lib/env/server";
import { logger } from "@/lib/telemetry/logger";

/**
 * Cache revalidation webhook (X04-FR-2), called by the backend after ingestion (BG-1).
 *
 *   POST /api/revalidate
 *   X-Timestamp: <unix seconds>
 *   X-Signature: sha256=<hex HMAC-SHA256 of "<timestamp>.<raw body>" with REVALIDATE_SECRET>
 *   { "tags": ["article:hybrid-retrieval", "articles", "graph"] }
 *
 * Replay window 5 minutes; constant-time signature comparison; tags validated against the known shapes.
 */
const TAG = /^(articles|navigation|graph|(article|topic|tag|author):[a-z0-9]+(?:-[a-z0-9]+)*)$/;
const body = z.object({ tags: z.array(z.string().regex(TAG)).min(1).max(200) });
const REPLAY_WINDOW_S = 300;

function unauthorized(reason: string) {
  logger.warn({ reason }, "revalidate.rejected");
  return Response.json({ ok: false, message: "Unauthorized" }, { status: 401 });
}

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > 16_384) return Response.json({ ok: false, message: "Payload too large" }, { status: 413 });

  const timestamp = request.headers.get("x-timestamp") ?? "";
  const signature = (request.headers.get("x-signature") ?? "").replace(/^sha256=/, "");
  const ts = Number(timestamp);
  if (!Number.isInteger(ts) || Math.abs(Date.now() / 1000 - ts) > REPLAY_WINDOW_S) return unauthorized("timestamp");

  const expected = createHmac("sha256", serverEnv().REVALIDATE_SECRET).update(`${timestamp}.${raw}`).digest("hex");
  const given = Buffer.from(signature, "hex");
  const wanted = Buffer.from(expected, "hex");
  if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) return unauthorized("signature");

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return Response.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }
  const parsed = body.safeParse(json);
  if (!parsed.success) return Response.json({ ok: false, message: "Invalid tags" }, { status: 400 });

  const tags = [...new Set(parsed.data.tags)];
  for (const tag of tags) revalidateTag(tag, "max");
  logger.info({ count: tags.length, tags: tags.slice(0, 20) }, "revalidate.accepted");
  return Response.json({ ok: true, revalidated: tags.length }, { status: 202 });
}
