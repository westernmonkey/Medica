import { WebSocketServer, WebSocket } from "ws";
import type { PublicMatch } from "./types";

type GlobalDuel = typeof globalThis & {
  __duelWss?: WebSocketServer;
  __duelRooms?: Map<string, Set<WebSocket>>;
};

const WS_PORT = 3002;

export function ensureWss() {
  const g = globalThis as GlobalDuel;
  if (g.__duelWss) {
    return;
  }

  g.__duelRooms = new Map();
  const wss = new WebSocketServer({ port: WS_PORT });
  g.__duelWss = wss;

  wss.on("connection", (socket) => {
    socket.on("message", (raw) => {
      const msg = JSON.parse(String(raw)) as { type?: string; code?: string };
      if (msg.type !== "watch" || !msg.code) {
        return;
      }
      const code = msg.code.toUpperCase();
      let room = g.__duelRooms!.get(code);
      if (!room) {
        room = new Set();
        g.__duelRooms!.set(code, room);
      }
      room.add(socket);
      void import("./store").then(({ getMatch, toPublic }) => {
        const match = getMatch(code);
        if (match && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ match: toPublic(match) }));
        }
      });
    });

    socket.on("close", () => {
      g.__duelRooms!.forEach((room) => {
        room.delete(socket);
      });
    });
  });
}

export function broadcastMatch(code: string, match: PublicMatch) {
  ensureWss();
  const g = globalThis as GlobalDuel;
  const payload = JSON.stringify({ match });
  const room = g.__duelRooms?.get(code.toUpperCase());
  if (!room) {
    return;
  }
  for (const socket of room) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(payload);
    }
  }
}
