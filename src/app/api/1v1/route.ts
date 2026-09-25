import { apiError, readJson, validName } from "@/lib/1v1/http";
import { createRoom } from "@/lib/1v1/create-room";
import { allowRequest } from "@/lib/1v1/rooms";
import { toPublic } from "@/lib/1v1/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const name = validName(body.name);
    if (!name) return Response.json({ error: "Name must be 1–40 characters." }, { status: 400 });
    if (!(await allowRequest(request, "create", 5))) {
      return Response.json({ error: "Too many rooms created. Try again in a minute." }, { status: 429 });
    }
    const { match, playerId } = await createRoom(name);
    return Response.json({ match: toPublic(match), playerId });
  } catch (error) {
    return apiError(error);
  }
}
