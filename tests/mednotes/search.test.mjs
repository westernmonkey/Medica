import test from "node:test";
import assert from "node:assert/strict";
import { cosineSimilarity, rankPosts } from "../../src/app/mednotes/search.ts";

const vector = values => Float32Array.from(values);
const post = (id, text, values, createdAt) => ({
  id, text, vector: vector(values), tags: [], createdAt, deletedAt: null, image: null, voice: null,
});

test("cosine similarity ranks semantic vectors and handles invalid dimensions", () => {
  assert.equal(cosineSimilarity(vector([1, 0]), vector([1, 0])), 1);
  assert.equal(cosineSimilarity(vector([1, 0]), vector([0, 1])), 0);
  assert.equal(cosineSimilarity(vector([1]), vector([1, 0])), 0);
});

test("browser search ranks posts and applies inclusive date filters", () => {
  const posts = [
    post("a", "close meaning", [0.8, 0.2], "2026-01-02T12:00:00.000Z"),
    post("b", "different meaning", [0, 1], "2026-02-02T12:00:00.000Z"),
  ];
  const result = rankPosts(posts, vector([1, 0]), "2026-01-01", "2026-01-31");
  assert.deepEqual(result.map(item => item.id), ["a"]);
  assert.ok(result[0].score > 0.9);
});
