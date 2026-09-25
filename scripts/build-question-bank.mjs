import fs from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const sourceRoot = path.resolve("data/question-bank/source");
const outputRoot = path.resolve(".generated/question-bank");
const questionsPerChunk = 250;

function directories(directory) {
  return fs.readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== ".git")
    .map((entry) => entry.name);
}

function questionFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json") && !["chapters.json", "status.json"].includes(entry.name))
    .map((entry) => entry.name)
    .sort();
}

function quizQuestion(data) {
  return {
    _id: data._id,
    encodedTopic: data.encodedTopic ?? null,
    question: data.question ?? { text: null, image: null },
    options: Array.isArray(data.options) ? data.options.map((option) => ({
      id: option.id,
      text: option.text ?? null,
      isCorrect: Boolean(option.isCorrect),
      image: option.image ?? null,
    })) : [],
    solution: data.solution ?? { text: null, image: null },
  };
}

function readQuestion(filePath) {
  const record = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (record.success !== true || !record.data || typeof record.data._id !== "string") return null;
  return quizQuestion(record.data);
}

export function buildQuestionBank(source = sourceRoot, output = outputRoot) {
  if (!fs.existsSync(source)) throw new Error(`Question source not found: ${source}`);
  fs.rmSync(output, { recursive: true, force: true });
  fs.mkdirSync(output, { recursive: true });

  const index = { version: 1, totalQuestions: 0, chapters: [] };
  for (const exam of directories(source)) {
    for (const subject of directories(path.join(source, exam))) {
      for (const type of directories(path.join(source, exam, subject))) {
        for (const chapter of directories(path.join(source, exam, subject, type))) {
          const folder = path.join(source, exam, subject, type, chapter);
          const files = questionFiles(folder);
          if (!files.length) continue;

          const chapterEntry = { exam, subject, type, chapter, questionCount: 0, chunks: [] };
          let batch = [];
          let batchNumber = 0;
          const writeBatch = () => {
            if (!batch.length) return;
            const name = `${String(index.chapters.length).padStart(4, "0")}-${String(batchNumber++).padStart(3, "0")}.json.gz`;
            fs.writeFileSync(path.join(output, name), gzipSync(Buffer.from(JSON.stringify(batch)), { level: 9 }));
            chapterEntry.chunks.push({ file: name, count: batch.length });
            chapterEntry.questionCount += batch.length;
            batch = [];
          };

          for (const file of files) {
            const question = readQuestion(path.join(folder, file));
            if (!question) continue;
            batch.push(question);
            if (batch.length >= questionsPerChunk) writeBatch();
          }
          writeBatch();
          if (chapterEntry.questionCount) {
            index.totalQuestions += chapterEntry.questionCount;
            index.chapters.push(chapterEntry);
          }
        }
      }
    }
  }

  fs.writeFileSync(path.join(output, "index.json"), `${JSON.stringify(index)}\n`);
  return index;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const index = buildQuestionBank();
  console.log(`Packed ${index.totalQuestions} questions in ${index.chapters.length} chapters.`);
}
