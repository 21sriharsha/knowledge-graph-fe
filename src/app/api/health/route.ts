import { connection } from "next/server";

/** Liveness (X03-FR-10): no dependencies, never cached. */
export async function GET() {
  await connection();
  return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
}
