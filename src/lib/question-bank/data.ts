import fs from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";

export type QuizQuestion = {
  _id: string;
  encodedTopic: string | null;
  question: { text: string | null; image: string | null };
  options: { id: string; text: string | null; isCorrect: boolean; image: string | null }[];
  solution: { text: string | null; image: string | null };
};

type Chunk = { file: string; count: number };
type Chapter = { exam: string; subject: string; type: string; chapter: string; questionCount: number; chunks: Chunk[] };
type Index = { version: number; totalQuestions: number; chapters: Chapter[] };

const dataDirectory = path.join(process.cwd(), ".generated", "question-bank");
const CHUNK_CACHE_LIMIT = 8;
let cachedIndex: Index | undefined;
const cachedChunks = new Map<string, QuizQuestion[]>();

function getIndex(): Index {
  if (cachedIndex) return cachedIndex;
  const indexPath = path.join(dataDirectory, "index.json");
  cachedIndex = JSON.parse(fs.readFileSync(indexPath, "utf8")) as Index;
  return cachedIndex;
}

function loadChunk(chunk: Chunk): QuizQuestion[] {
  const cached = cachedChunks.get(chunk.file);
  if (cached) {
    cachedChunks.delete(chunk.file);
    cachedChunks.set(chunk.file, cached);
    return cached;
  }
  const filePath = path.join(dataDirectory, path.basename(chunk.file));
  const questions = JSON.parse(gunzipSync(fs.readFileSync(filePath)).toString("utf8")) as QuizQuestion[];
  cachedChunks.set(chunk.file, questions);
  if (cachedChunks.size > CHUNK_CACHE_LIMIT) {
    const oldest = cachedChunks.keys().next().value;
    if (oldest) cachedChunks.delete(oldest);
  }
  return questions;
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function getQuizStructure(): Record<string, Record<string, Record<string, string[]>>> {
  const result: Record<string, Record<string, Record<string, string[]>>> = {};
  for (const item of getIndex().chapters) {
    result[item.exam] ??= {};
    result[item.exam][item.subject] ??= {};
    result[item.exam][item.subject][item.type] ??= [];
    result[item.exam][item.subject][item.type].push(item.chapter);
  }
  return result;
}

export function getQuestionsForChapters(
  selections: { exam: string; subject: string; type: string; chapters: string[] },
  requestedCount: number,
): QuizQuestion[] {
  const count = Math.min(100, Math.max(1, Number.isFinite(requestedCount) ? Math.floor(requestedCount) : 20));
  const selected = getIndex().chapters.filter((item) =>
    item.exam === selections.exam && item.subject === selections.subject &&
    item.type === selections.type && selections.chapters.includes(item.chapter),
  );
  if (!selected.length) return [];

  const sample: QuizQuestion[] = [];
  let seen = 0;
  for (const chapter of selected) {
    for (const chunk of chapter.chunks) {
      for (const question of loadChunk(chunk)) {
        seen += 1;
        if (sample.length < count) sample.push(question);
        else {
          const replacement = Math.floor(Math.random() * seen);
          if (replacement < count) sample[replacement] = question;
        }
      }
    }
  }
  return shuffle(sample);
}

export function getRandomQuestions(count: number): QuizQuestion[] {
  const requestedCount = Math.min(100, Math.max(0, Number.isFinite(count) ? Math.floor(count) : 10));
  const chunks = getIndex().chapters.flatMap((chapter) => chapter.chunks);
  const selectedChunks: Chunk[] = [];
  const available = [...chunks];
  let selectedQuestionCount = 0;
  while (selectedQuestionCount < requestedCount && available.length) {
    const totalWeight = available.reduce((sum, chunk) => sum + chunk.count, 0);
    let pick = Math.random() * totalWeight;
    const selectedIndex = available.findIndex((chunk) => (pick -= chunk.count) < 0);
    const [selected] = available.splice(Math.max(0, selectedIndex), 1);
    selectedChunks.push(selected);
    selectedQuestionCount += selected.count;
  }
  const pool = selectedChunks.flatMap(loadChunk);
  return shuffle(pool).slice(0, requestedCount);
}
