import { randomUUID } from "crypto";
import { pickTenQuestions } from "./questions";
import { broadcastMatch, ensureWss } from "./realtime";
import type { Match, PublicMatch } from "./types";

const matches = new Map<string, Match>();

function makeCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function toPublic(match: Match): PublicMatch {
  const q = match.questions[match.currentIndex];
  const locked = isRoundLocked(match);
  return {
    code: match.code,
    status: match.status,
    players: match.players,
    currentIndex: match.currentIndex,
    total: match.questions.length,
    question: q
      ? {
          text: q.question.text,
          image: q.question.image,
          options: q.options.map((opt) => ({
            id: opt.id,
            text: opt.text,
            image: opt.image,
          })),
        }
      : null,
    answers: match.answers,
    roundWinnerId: match.roundWinnerId,
    correctOptionId: locked && q ? q.options.find((o) => o.isCorrect)?.id ?? null : null,
  };
}

function isRoundLocked(match: Match): boolean {
  if (match.roundWinnerId) {
    return true;
  }
  return match.players.every((p) => match.answers[p.id]);
}

export function createMatch(name: string): { match: Match; playerId: string } {
  let code = makeCode();
  while (matches.has(code)) {
    code = makeCode();
  }
  const playerId = randomUUID();
  const match: Match = {
    code,
    status: "waiting",
    players: [{ id: playerId, name, score: 0 }],
    currentIndex: 0,
    questions: pickTenQuestions(),
    answers: {},
    roundWinnerId: null,
  };
  matches.set(code, match);
  ensureWss();
  broadcastMatch(code, toPublic(match));
  return { match, playerId };
}

export function getMatch(code: string): Match | undefined {
  return matches.get(code.toUpperCase());
}

export function joinMatch(code: string, name: string): { match: Match; playerId: string } {
  const match = getMatch(code);
  if (!match) {
    throw new Error("Match not found");
  }
  if (match.players.length >= 2) {
    throw new Error("Match full");
  }
  const playerId = randomUUID();
  match.players.push({ id: playerId, name, score: 0 });
  if (match.players.length === 2 && match.questions.length > 0) {
    match.status = "playing";
  }
  broadcastMatch(match.code, toPublic(match));
  return { match, playerId };
}

export function answerMatch(
  code: string,
  playerId: string,
  optionId: string,
): Match {
  const match = getMatch(code);
  if (!match) {
    throw new Error("Match not found");
  }
  if (match.status !== "playing") {
    throw new Error("Match not playing");
  }
  const player = match.players.find((p) => p.id === playerId);
  if (!player) {
    throw new Error("Not in this match");
  }
  if (match.answers[playerId]) {
    throw new Error("Already answered");
  }
  if (isRoundLocked(match)) {
    throw new Error("Round locked");
  }

  const question = match.questions[match.currentIndex];
  const option = question.options.find((o) => o.id === optionId);
  if (!option) {
    throw new Error("Bad option");
  }

  const correct = option.isCorrect;
  match.answers[playerId] = { optionId, correct };

  if (correct && !match.roundWinnerId) {
    match.roundWinnerId = playerId;
    player.score += 1;
  }

  if (isRoundLocked(match) && match.status === "playing") {
    scheduleAdvance(match);
  }
  broadcastMatch(match.code, toPublic(match));
  return match;
}

const pendingAdvance = new Map<string, ReturnType<typeof setTimeout>>();

function scheduleAdvance(match: Match) {
  if (pendingAdvance.has(match.code)) {
    return;
  }
  pendingAdvance.set(
    match.code,
    setTimeout(() => {
      pendingAdvance.delete(match.code);
      if (match.currentIndex >= match.questions.length - 1) {
        match.status = "done";
      } else {
        match.currentIndex += 1;
        match.answers = {};
        match.roundWinnerId = null;
      }
      broadcastMatch(match.code, toPublic(match));
    }, 3000),
  );
}
