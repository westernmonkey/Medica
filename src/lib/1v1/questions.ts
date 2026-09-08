import fs from "fs";
import path from "path";
import { shuffle } from "@/lib/utils";
import type { Question } from "./types";

function walkQuestionFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkQuestionFiles(full));
      continue;
    }
    if (
      entry.name.endsWith(".json") &&
      entry.name !== "chapters.json" &&
      entry.name !== "status.json"
    ) {
      files.push(full);
    }
  }
  return files;
}

let cachedFiles: string[] | null = null;

export function pickTenQuestions(): Question[] {
  const bankPath = path.join(process.cwd(), "public", "bank");
  if (!cachedFiles) {
    cachedFiles = walkQuestionFiles(bankPath);
  }
  const files = shuffle(cachedFiles).slice(0, 10);
  const questions: Question[] = [];

  for (const file of files) {
    const json = JSON.parse(fs.readFileSync(file, "utf-8"));
    if (!json.success || !json.data) {
      continue;
    }
    const data = json.data;
    questions.push({
      _id: data._id,
      question: data.question,
      options: data.options,
    });
  }

  return questions;
}
