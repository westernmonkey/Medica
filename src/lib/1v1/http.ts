export class RequestError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 4096) throw new RequestError("Request is too large.", 413);
  if (!request.body) throw new RequestError("A JSON request body is required.");

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
      if (text.length > 4096) throw new RequestError("Request is too large.", 413);
    }
    text += decoder.decode();
  } finally {
    reader.releaseLock();
  }

  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new RequestError("Request body must be valid JSON.");
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new RequestError("Request body must be a JSON object.");
  }
  return value as Record<string, unknown>;
}

export function validCode(value: string): string | null {
  const code = value.trim().toUpperCase();
  return /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(code) ? code : null;
}

export function validName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim();
  return name.length >= 1 && name.length <= 40 ? name : null;
}

export function apiError(error: unknown): Response {
  if (error instanceof Error && error.name === "MatchServiceUnavailable") {
    return Response.json({ error: "1v1 is temporarily unavailable. Please try again later." }, { status: 503 });
  }
  if (error instanceof RequestError) return Response.json({ error: error.message }, { status: error.status });
  const message = error instanceof Error ? error.message : "Request failed.";
  const statusByMessage: Record<string, number> = {
    "Match not found": 404,
    "Match is full or already started": 409,
    "Match is not playing": 409,
    "Player is not in this match": 403,
    "Player already answered": 409,
    "Round is locked": 409,
    "Option not found": 400,
    "Match changed. Please try again.": 409,
  };
  const status = statusByMessage[message];
  if (status) return Response.json({ error: message }, { status });
  return Response.json({ error: "1v1 is temporarily unavailable. Please try again later." }, { status: 503 });
}
