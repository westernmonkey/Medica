import { randomInt, randomUUID } from "node:crypto";
import type { Match, Player, PublicMatch, Question } from "./types";

const ROOM_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeRoomCode(): string {
  return Array.from({ length: 6 }, () => ROOM_CHARACTERS[randomInt(ROOM_CHARACTERS.length)]).join("");
}

export function createMatch(name: string, questions: Question[], code = makeRoomCode(), playerId = randomUUID()): Match {
  return {
    code,
    status: questions.length ? "waiting" : "done",
    players: [{ id: playerId, name, score: 0 }],
    currentIndex: 0,
    questions,
    answers: {},
    roundWinnerId: null,
    roundEndsAt: null,
    revision: 1,
  };
}

export function joinMatch(match: Match, name: string, playerId = randomUUID()): { match: Match; playerId: string } {
  if (match.status !== "waiting" || match.players.length !== 1) throw new Error("Match is full or already started");
  const players: Player[] = [...match.players, { id: playerId, name, score: 0 }];
  return { match: { ...match, players, status: "playing", revision: match.revision + 1 }, playerId };
}

export function answerMatch(match: Match, playerId: string, optionId: string, now = Date.now()): Match {
  if (match.status !== "playing") throw new Error("Match is not playing");
  if (!match.players.some((player) => player.id === playerId)) throw new Error("Player is not in this match");
  if (match.answers[playerId]) throw new Error("Player already answered");
  if (match.roundEndsAt) throw new Error("Round is locked");

  const option = match.questions[match.currentIndex]?.options.find((item) => item.id === optionId);
  if (!option) throw new Error("Option not found");

  const answers = { ...match.answers, [playerId]: { optionId, correct: option.isCorrect } };
  const roundWinnerId = option.isCorrect ? playerId : match.roundWinnerId;
  const players = match.players.map((player) =>
    player.id === playerId && option.isCorrect ? { ...player, score: player.score + 1 } : player,
  );
  const locked = roundWinnerId !== null || players.every((player) => answers[player.id]);
  return {
    ...match,
    answers,
    players,
    roundWinnerId,
    roundEndsAt: locked ? now + 3000 : null,
    revision: match.revision + 1,
  };
}

export function advanceMatch(match: Match, now = Date.now()): Match {
  if (!match.roundEndsAt || match.roundEndsAt > now) return match;
  const isLastQuestion = match.currentIndex >= match.questions.length - 1;
  return {
    ...match,
    currentIndex: isLastQuestion ? match.currentIndex : match.currentIndex + 1,
    status: isLastQuestion ? "done" : "playing",
    answers: {},
    roundWinnerId: null,
    roundEndsAt: null,
    revision: match.revision + 1,
  };
}

export function toPublic(match: Match): PublicMatch {
  const question = match.questions[match.currentIndex];
  const locked = match.roundEndsAt !== null;
  return {
    code: match.code,
    status: match.status,
    players: match.players,
    currentIndex: match.currentIndex,
    total: match.questions.length,
    question: question ? {
      text: question.question.text,
      image: question.question.image,
      options: question.options.map(({ id, text, image }) => ({ id, text, image })),
    } : null,
    answers: match.answers,
    roundWinnerId: match.roundWinnerId,
    correctOptionId: locked && question ? question.options.find((option) => option.isCorrect)?.id ?? null : null,
    revision: match.revision,
  };
}
