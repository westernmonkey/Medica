import { experimental_upgradeWebSocket, type WebSocketData } from "@vercel/functions";
import { WebSocket } from "ws";
import { validCode } from "@/lib/1v1/http";
import { watchMatch } from "@/lib/1v1/realtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export function GET(request: Request) {
  const requestedCode = new URL(request.url).searchParams.get("code") ?? "";
  const code = validCode(requestedCode);
  if (!code) return Response.json({ error: "Invalid room code." }, { status: 400 });

  return experimental_upgradeWebSocket((socket) => {
    socket.on("message", (data: WebSocketData) => {
      if (Buffer.byteLength(data.toString()) > 512) {
        socket.close(1009, "Message is too large");
      } else {
        socket.close(1008, "This socket only receives match updates");
      }
    });
    void watchMatch(socket, code).catch((error) => {
      console.error("1v1 WebSocket unavailable", error instanceof Error ? error.message : "unknown error");
      if (socket.readyState === WebSocket.OPEN) socket.close(1013, "Match service unavailable");
    });
  }, { maxPayload: 512 });
}
