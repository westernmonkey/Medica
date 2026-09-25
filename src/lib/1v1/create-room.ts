import { randomUUID } from "node:crypto";
import { pickTenQuestions } from "./questions";
import { reserveNewRoom } from "./rooms";
import { createMatch, makeRoomCode } from "./store";
import { MatchServiceUnavailable } from "./redis";

export async function createRoom(name: string) {
  const questions = pickTenQuestions();
  if (!questions.length) throw new MatchServiceUnavailable();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const playerId = randomUUID();
    const match = createMatch(name, questions, makeRoomCode(), playerId);
    if (await reserveNewRoom(match)) return { match, playerId };
  }
  throw new Error("Could not create a match. Please try again.");
}
