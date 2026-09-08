import { createMatch, toPublic } from "@/lib/1v1/store";
import { ensureWss } from "@/lib/1v1/realtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  ensureWss();
  const body = await request.json();
  const name = String(body.name ?? "").trim();
  if (!name) {
    return Response.json({ error: "Name required" }, { status: 400 });
  }
  const { match, playerId } = createMatch(name);
  return Response.json({ match: toPublic(match), playerId });
}
