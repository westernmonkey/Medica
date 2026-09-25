import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const batchFile = process.argv[2];
if (!batchFile) {
  throw new Error("Provide a topic batch JSON file");
}

const topics = JSON.parse(fs.readFileSync(batchFile, "utf8"));
const bankRoot = fs.realpathSync(path.resolve("data/question-bank/source"));
assert(topics && !Array.isArray(topics) && typeof topics === "object", "Invalid batch");
const edits = [];

for (const [relativeFile, encodedTopic] of Object.entries(topics)) {
  const file = fs.realpathSync(path.resolve(relativeFile));
  assert(file.startsWith(bankRoot + path.sep) && file.endsWith(".json"), "Invalid question path");
  const chapter = path.basename(path.dirname(file));
  assert(typeof encodedTopic === "string" && encodedTopic.startsWith(chapter + " - ") && encodedTopic.length > chapter.length + 3, "Invalid topic");
  const question = JSON.parse(fs.readFileSync(file, "utf8"));
  assert(question.data && typeof question.data === "object", "Missing question data");
  assert(!question.data.encodedTopic || question.data.encodedTopic === encodedTopic, "Existing topic conflict: " + file);
  if (question.data.encodedTopic === encodedTopic) continue;
  const original = structuredClone(question);
  question.data.encodedTopic = encodedTopic;
  edits.push({ file, question, original });
}

for (const { file, question, original } of edits) {
  const temporaryFile = file + ".encoding";
  fs.writeFileSync(temporaryFile, JSON.stringify(question) + "\n", { flag: "wx" });
  fs.renameSync(temporaryFile, file);
  const saved = JSON.parse(fs.readFileSync(file, "utf8"));
  assert.equal(saved.data.encodedTopic, question.data.encodedTopic);
  delete saved.data.encodedTopic;
  assert.deepEqual(saved, original, "Unexpected data change: " + file);
}

console.log(`Applied and verified ${edits.length} topics; other question data preserved.`);
