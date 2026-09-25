import { randomUUID, createHash } from "node:crypto";
import type Redis from "ioredis";
import type { Match } from "./types";
import { advanceMatch, answerMatch, joinMatch } from "./store";
import { getRedis } from "./redis";

const ROOM_TTL_SECONDS = 2 * 60 * 60;
const ROOM_PREFIX = "medica:1v1:room:";
const EVENT_STREAM = "medica:1v1:events";
const MAX_CONFLICT_RETRIES = 5;

function roomKey(code: string): string {
  return `${ROOM_PREFIX}${code}`;
}

function parseMatch(value: string): Match {
  return JSON.parse(value) as Match;
}

async function writeEvent(redis: Redis, code: string, match: Match) {
  const transaction = redis.multi();
  transaction
    .set(roomKey(code), JSON.stringify(match), "EX", ROOM_TTL_SECONDS)
    .xadd(EVENT_STREAM, "MAXLEN", "~", "10000", "*", "code", code, "revision", String(match.revision))
    .expire(EVENT_STREAM, 24 * 60 * 60);
  return transaction.exec();
}

async function updateMatch(code: string, update: (match: Match) => Match): Promise<Match> {
  const redis = getRedis();
  const key = roomKey(code);
  for (let attempt = 0; attempt < MAX_CONFLICT_RETRIES; attempt += 1) {
    await redis.watch(key);
    const value = await redis.get(key);
    if (!value) {
      await redis.unwatch();
      throw new Error("Match not found");
    }

    const current = parseMatch(value);
    const next = update(current);
    if (next === current) {
      await redis.unwatch();
      await redis.expire(key, ROOM_TTL_SECONDS);
      return current;
    }

    const result = await writeEvent(redis, code, next);
    if (result) return next;
  }
  throw new Error("Match changed. Please try again.");
}

export async function getMatch(code: string): Promise<Match | null> {
  const redis = getRedis();
  const value = await redis.get(roomKey(code));
  if (!value) return null;
  const current = parseMatch(value);
  if (current.roundEndsAt && current.roundEndsAt <= Date.now()) {
    return updateMatch(code, (match) => advanceMatch(match));
  }
  await redis.expire(roomKey(code), ROOM_TTL_SECONDS);
  return current;
}

export async function reserveNewRoom(match: Match): Promise<boolean> {
  const redis = getRedis();
  const created = await redis.set(roomKey(match.code), JSON.stringify(match), "EX", ROOM_TTL_SECONDS, "NX");
  return created === "OK";
}

export async function joinRoom(code: string, name: string): Promise<{ match: Match; playerId: string }> {
  const playerId = randomUUID();
  const match = await updateMatch(code, (current) => joinMatch(current, name, playerId).match);
  return { match, playerId };
}

export async function answerRoom(code: string, playerId: string, optionId: string): Promise<Match> {
  return updateMatch(code, (match) => {
    const advanced = advanceMatch(match);
    if (advanced !== match) return advanced;
    return answerMatch(match, playerId, optionId);
  });
}

export async function allowRequest(request: Request, action: "create" | "join", limit: number): Promise<boolean> {
  const { ipAddress } = await import("@vercel/functions");
  const ip = ipAddress(request) || "unknown";
  const digest = createHash("sha256").update(ip).digest("hex").slice(0, 24);
  const key = `medica:1v1:rate:${action}:${digest}`;
  const redis = getRedis();
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 60);
  return count <= limit;
}
