import { WebSocket } from "ws";
import type Redis from "ioredis";
import type { PublicMatch } from "./types";
import { getMatch } from "./rooms";
import { getRedis } from "./redis";
import { toPublic } from "./store";

const EVENT_STREAM = "medica:1v1:events";
const rooms = new Map<string, Set<WebSocket>>();
let readerStart: Promise<void> | null = null;

function sendMatch(socket: WebSocket, match: PublicMatch) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ match }));
}

export function broadcastMatch(code: string, match: PublicMatch) {
  const sockets = rooms.get(code);
  if (!sockets) return;
  for (const socket of sockets) sendMatch(socket, match);
}

export async function watchMatch(socket: WebSocket, code: string) {
  const redis = getRedis();
  let sockets = rooms.get(code);
  if (!sockets) {
    sockets = new Set();
    rooms.set(code, sockets);
  }
  sockets.add(socket);
  socket.once("close", () => removeSocket(socket, code));
  socket.once("error", () => removeSocket(socket, code));

  await startEventReader(redis);
  const match = await getMatch(code);
  if (!match) {
    socket.send(JSON.stringify({ error: "Match not found" }));
    socket.close(1008, "Match not found");
    return;
  }
  sendMatch(socket, toPublic(match));
}

function removeSocket(socket: WebSocket, code: string) {
  const sockets = rooms.get(code);
  sockets?.delete(socket);
  if (sockets?.size === 0) rooms.delete(code);
}

function fieldsToObject(fields: string[]): Record<string, string> {
  const values: Record<string, string> = {};
  for (let i = 0; i + 1 < fields.length; i += 2) values[fields[i]] = fields[i + 1];
  return values;
}

async function startEventReader(redis: Redis) {
  if (!readerStart) {
    readerStart = (async () => {
      const reader = redis.duplicate({ maxRetriesPerRequest: null });
      const latest = await reader.xrevrange(EVENT_STREAM, "+", "-", "COUNT", 1);
      const cursor = latest[0]?.[0] ?? "0-0";
      void readEvents(reader, cursor);
    })();
  }
  try {
    await readerStart;
  } catch (error) {
    readerStart = null;
    throw error;
  }
}

async function readEvents(reader: Redis, initialCursor: string) {
  let cursor = initialCursor;
  let delay = 250;
  while (true) {
    try {
      const streams = await reader.xread("BLOCK", 5000, "STREAMS", EVENT_STREAM, cursor);
      if (!streams) continue;
      for (const [, entries] of streams) {
        for (const [id, fields] of entries) {
          cursor = id;
          const event = fieldsToObject(fields);
          const match = event.code ? await getMatch(event.code) : null;
          if (match && match.revision >= Number(event.revision)) {
            broadcastMatch(event.code, toPublic(match));
          }
        }
      }
      delay = 250;
    } catch (error) {
      console.error("1v1 Redis event relay failed", error instanceof Error ? error.message : "unknown error");
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * 2, 5000);
    }
  }
}
