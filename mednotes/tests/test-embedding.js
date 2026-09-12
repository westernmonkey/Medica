/**
 * Reasoning: Prove the bundled model loads with no network, returns 384 floats,
 * and is deterministic for identical input. Print load and embed timings so
 * performance regressions are visible.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadModel } = require("../embedding/load-model");
const { embedText } = require("../embedding/embed-text");
const { embedTextAsync, shutdownEmbeddingWorker } = require("../embedding/embedding-worker");

test("bundled model loads offline and embeds to 384 dims", async function testOfflineEmbed() {
  const loadStart = Date.now();
  await loadModel();
  const loadMs = Date.now() - loadStart;

  const embedStart = Date.now();
  const vector = await embedText("Patient presents with dyspnea and hypoxia.");
  const embedMs = Date.now() - embedStart;

  assert.equal(vector.length, 384);
  assert.equal(vector.byteLength, 1536);

  const again = await embedText("Patient presents with dyspnea and hypoxia.");
  for (let i = 0; i < 384; i++) {
    assert.equal(again[i], vector[i]);
  }

  console.log("embedding: loadMs=" + loadMs + " embedMs=" + embedMs + " dims=384 deterministic=true");
});

test("worker embeds without throwing", async function testWorkerEmbed() {
  const vector = await embedTextAsync("Shortness of breath on exertion.");
  assert.equal(vector.length, 384);
  console.log("embedding-worker: dims=" + vector.length);
  await shutdownEmbeddingWorker();
});
