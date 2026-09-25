import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import { buildQuestionBank } from "../../scripts/build-question-bank.mjs";

test("question-bank build keeps quiz fields in compressed chapter chunks", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "medica-bank-test-"));
  const source = path.join(root, "source");
  const output = path.join(root, "generated");
  const chapter = path.join(source, "exam", "subject", "practice", "chapter");
  fs.mkdirSync(chapter, { recursive: true });
  fs.writeFileSync(path.join(chapter, "q1.json"), JSON.stringify({
    success: true,
    data: {
      _id: "q1",
      encodedTopic: "Chapter - Topic",
      question: { text: "Question", image: null },
      options: [{ id: "a", text: "Choice", image: null, isCorrect: true }],
      solution: { text: "Reason", image: null },
      unusedMetadata: "not packed",
    },
  }));
  fs.writeFileSync(path.join(chapter, "chapters.json"), "{}");

  try {
    const index = buildQuestionBank(source, output);
    assert.equal(index.totalQuestions, 1);
    assert.deepEqual(index.chapters[0].chunks.map((chunk) => chunk.count), [1]);
    const packed = JSON.parse(gunzipSync(fs.readFileSync(path.join(output, index.chapters[0].chunks[0].file))).toString("utf8"));
    assert.equal(packed[0].encodedTopic, "Chapter - Topic");
    assert.equal(packed[0].solution.text, "Reason");
    assert.equal("unusedMetadata" in packed[0], false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
