import { answerMatch, getMatch, joinMatch, toPublic } from "@/lib/1v1/store";
import { ensureWss } from "@/lib/1v1/realtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ code: string }> },
) {
  ensureWss();
  const { code } = await context.params;
  const match = getMatch(code);
  if (!match) {
    return Response.json({ error: "Match not found" }, { status: 404 });
  }
  return Response.json({ match: toPublic(match) });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params;
  const body = await request.json();
  const action = String(body.action ?? "");
  ensureWss();

  try {
    if (action === "join") {
      const name = String(body.name ?? "").trim();
      if (!name) {
        return Response.json({ error: "Name required" }, { status: 400 });
      }
      const { match, playerId } = joinMatch(code, name);
      return Response.json({ match: toPublic(match), playerId });
    }

    if (action === "answer") {
      const playerId = String(body.playerId ?? "");
      const optionId = String(body.optionId ?? "");
      const match = answerMatch(code, playerId, optionId);
      return Response.json({ match: toPublic(match) });
    }

    return Response.json({ error: "Bad action" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    return Response.json({ error: message }, { status: 400 });
  }
}
