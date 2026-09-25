import { apiError, readJson, validCode, validName } from "@/lib/1v1/http";
import { allowRequest, answerRoom, getMatch, joinRoom } from "@/lib/1v1/rooms";
import { toPublic } from "@/lib/1v1/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Context = { params: Promise<{ code: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const { code: rawCode } = await context.params;
    const code = validCode(rawCode);
    if (!code) return Response.json({ error: "Invalid room code." }, { status: 400 });
    const match = await getMatch(code);
    if (!match) return Response.json({ error: "Match not found." }, { status: 404 });
    return Response.json({ match: toPublic(match) });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const { code: rawCode } = await context.params;
    const code = validCode(rawCode);
    if (!code) return Response.json({ error: "Invalid room code." }, { status: 400 });
    const body = await readJson(request);

    if (body.action === "join") {
      const name = validName(body.name);
      if (!name) return Response.json({ error: "Name must be 1–40 characters." }, { status: 400 });
      if (!(await allowRequest(request, "join", 20))) {
        return Response.json({ error: "Too many join attempts. Try again in a minute." }, { status: 429 });
      }
      const { match, playerId } = await joinRoom(code, name);
      return Response.json({ match: toPublic(match), playerId });
    }

    if (body.action === "answer") {
      const playerId = typeof body.playerId === "string" ? body.playerId : "";
      const optionId = typeof body.optionId === "string" ? body.optionId : "";
      if (!/^[0-9a-f-]{36}$/i.test(playerId) || !/^[A-Za-z0-9_-]{1,32}$/.test(optionId)) {
        return Response.json({ error: "Invalid answer." }, { status: 400 });
      }
      const match = await answerRoom(code, playerId, optionId);
      return Response.json({ match: toPublic(match) });
    }
    return Response.json({ error: "Action must be join or answer." }, { status: 400 });
  } catch (error) {
    return apiError(error);
  }
}
