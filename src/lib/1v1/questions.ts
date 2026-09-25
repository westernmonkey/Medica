import { getRandomQuestions } from "@/lib/question-bank/data";
import type { Question } from "./types";

export function pickTenQuestions(): Question[] {
  return getRandomQuestions(10);
}
