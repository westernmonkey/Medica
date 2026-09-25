import test from "node:test";
import assert from "node:assert/strict";
import { advanceMatch, answerMatch, createMatch, joinMatch, toPublic } from "../../src/lib/1v1/store.ts";
import { apiError, readJson, validCode, validName } from "../../src/lib/1v1/http.ts";
import { getRedis, MatchServiceUnavailable } from "../../src/lib/1v1/redis.ts";

const questions = [{
  _id: "question-1",
  question: { text: "Q", image: null },
  options: [
    { id: "right", text: "A", image: null, isCorrect: true },
    { id: "wrong", text: "B", image: null, isCorrect: false },
  ],
}];

test("create and join creates a two-player live room", () => {
  const created = createMatch("Ada", questions, "ABC234", "player-1");
  const joined = joinMatch(created, "Lin", "player-2");
  assert.equal(joined.match.status, "playing");
  assert.deepEqual(joined.match.players.map((player) => player.name), ["Ada", "Lin"]);
  assert.equal(toPublic(joined.match).correctOptionId, null);
});

test("room rejects another player after it starts", () => {
  const room = joinMatch(createMatch("Ada", questions, "ABC234", "player-1"), "Lin", "player-2").match;
  assert.throws(() => joinMatch(room, "Sam", "player-3"), /full or already started/);
});

test("first correct answer scores and hides the key until the round locks", () => {
  const room = joinMatch(createMatch("Ada", questions, "ABC234", "player-1"), "Lin", "player-2").match;
  const locked = answerMatch(room, "player-1", "right", 1000);
  assert.equal(locked.players[0].score, 1);
  assert.equal(toPublic(locked).correctOptionId, "right");
  assert.throws(() => answerMatch(locked, "player-2", "wrong", 1100), /locked/);
});

test("both wrong answers close a round; duplicate and invalid answers fail", () => {
  const room = joinMatch(createMatch("Ada", questions, "ABC234", "player-1"), "Lin", "player-2").match;
  const first = answerMatch(room, "player-1", "wrong", 1000);
  assert.equal(first.roundEndsAt, null);
  const last = answerMatch(first, "player-2", "wrong", 1200);
  assert.notEqual(last.roundEndsAt, null);
  assert.throws(() => answerMatch(last, "player-2", "wrong", 1300), /already answered|locked/);
  assert.throws(() => answerMatch(room, "player-1", "missing", 1000), /Option not found/);
  assert.throws(() => answerMatch(room, "unknown", "right", 1000), /not in this match/);
});

test("round advances after its deadline and ends after the final question", () => {
  const room = joinMatch(createMatch("Ada", questions, "ABC234", "player-1"), "Lin", "player-2").match;
  const locked = answerMatch(room, "player-1", "wrong", 1000);
  const closed = answerMatch(locked, "player-2", "wrong", 1200);
  const done = advanceMatch(closed, 4200);
  assert.equal(done.status, "done");
  assert.equal(done.roundEndsAt, null);
});

test("room codes and display names are restricted", () => {
  assert.equal(validCode("abC234"), "ABC234");
  assert.equal(validCode("O12345"), null);
  assert.equal(validName("  Ada  "), "Ada");
  assert.equal(validName(" "), null);
  assert.equal(validName("x".repeat(41)), null);
});

test("malformed and oversized request bodies are rejected", async () => {
  await assert.rejects(readJson(new Request("https://example.test", { method: "POST", body: "{" })), /valid JSON/);
  const tooLarge = new Request("https://example.test", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: "x".repeat(5000) }),
  });
  await assert.rejects(readJson(tooLarge), /too large/);
});

test("missing Redis configuration fails honestly with HTTP 503", () => {
  const previous = process.env.REDIS_URL;
  delete process.env.REDIS_URL;
  try {
    assert.throws(() => getRedis(), MatchServiceUnavailable);
    assert.equal(apiError(new MatchServiceUnavailable()).status, 503);
  } finally {
    if (previous !== undefined) process.env.REDIS_URL = previous;
  }
});

test("Redis runtime errors return a generic 503 without exposing details", async () => {
  const response = apiError(new Error("private Redis connection string"));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "1v1 is temporarily unavailable. Please try again later." });
});
