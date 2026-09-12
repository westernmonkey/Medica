/**
 * Reasoning: Known posts and queries check that semantic neighbors rank near the
 * top (rank 1 or 2). Date filter is checked separately with fixed timestamps.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const { embedText } = require("../embedding/embed-text");
const { cosineSimilarity } = require("../search/cosine-similarity");
const { searchPosts } = require("../search/search-posts");
const { shutdownEmbeddingWorker } = require("../embedding/embedding-worker");

test("cosineSimilarity is 1 for identical vectors", function testCosineIdentical() {
  const a = new Float32Array([1, 0, 0]);
  const b = new Float32Array([1, 0, 0]);
  assert.equal(cosineSimilarity(a, b), 1);
});

test("semantic search ranks expected posts near the top", async function testSemanticRanks() {
  const corpus = [
    { id: "chest", text: "Acute chest pain with radiation to the left arm suggests myocardial infarction." },
    { id: "meningitis", text: "Neck stiffness fever and photophobia are classic meningitis signs." },
    { id: "asthma", text: "Wheezing and reversible airway obstruction point to asthma." },
    { id: "diabetes", text: "Polyuria polydipsia and weight loss suggest new onset diabetes mellitus." },
    { id: "fracture", text: "Open tibial fracture needs urgent surgical debridement and antibiotics." },
    { id: "anemia", text: "Fatigue pallor and low hemoglobin indicate anemia." },
  ];

  const posts = [];
  for (let i = 0; i < corpus.length; i++) {
    const item = corpus[i];
    posts.push({
      id: item.id,
      text: item.text,
      vector: await embedText(item.text),
      tags: [],
      hasImage: false,
      hasVoice: false,
      createdAt: "2026-01-15T12:00:00.000Z",
    });
  }

  const cases = [
    { query: "heart attack arm pain", expectedId: "chest" },
    { query: "stiff neck fever headache infection", expectedId: "meningitis" },
    { query: "breathing wheeze inhaler", expectedId: "asthma" },
    { query: "high blood sugar thirst urination", expectedId: "diabetes" },
  ];

  const rows = [];
  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    const queryVector = await embedText(c.query);
    const results = searchPosts({
      posts: posts,
      queryVector: queryVector,
      dateFrom: null,
      dateTo: null,
    });
    let rank = -1;
    for (let r = 0; r < results.length; r++) {
      if (results[r].id === c.expectedId) {
        rank = r + 1;
        break;
      }
    }
    rows.push({ query: c.query, expected: c.expectedId, rank: rank, pass: rank === 1 || rank === 2 });
    assert.ok(rank === 1 || rank === 2, "expected " + c.expectedId + " in top 2, got rank " + rank);
  }

  console.log("search ranks:");
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    console.log("  query=\"" + row.query + "\" expected=" + row.expected + " rank=" + row.rank + " pass=" + row.pass);
  }
});

test("date filter excludes posts outside range", async function testDateFilter() {
  const vector = await embedText("Generic clinical note.");
  const posts = [
    {
      id: "old",
      text: "Old note",
      vector: vector,
      tags: [],
      hasImage: false,
      hasVoice: false,
      createdAt: "2025-01-01T00:00:00.000Z",
    },
    {
      id: "new",
      text: "New note",
      vector: vector,
      tags: [],
      hasImage: false,
      hasVoice: false,
      createdAt: "2026-06-01T00:00:00.000Z",
    },
  ];
  const results = searchPosts({
    posts: posts,
    queryVector: vector,
    dateFrom: "2026-01-01T00:00:00.000Z",
    dateTo: "2026-12-31T23:59:59.000Z",
  });
  assert.equal(results.length, 1);
  assert.equal(results[0].id, "new");
  console.log("date-filter: excludedOutsideRange=true keptCount=1");
  await shutdownEmbeddingWorker();
});
