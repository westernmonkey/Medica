import QuizClient from "./quiz-client";
import { getQuestionsForChapters } from "@/lib/question-bank/data";
import type { QuizQuestion } from "@/lib/question-bank/data";
import "katex/dist/katex.min.css";

export const dynamic = "force-dynamic";
export type QuestionData = QuizQuestion;

function decode(value: string | string[] | undefined): string[] {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return values.map((item) => {
    try { return decodeURIComponent(item); } catch { return ""; }
  }).filter(Boolean);
}

export default async function QuizPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const [exam] = decode(params.exam);
  const [subject] = decode(params.subject);
  const [type] = decode(params.type);
  const [rawCount] = decode(params.num);
  const chapters = decode(params.chapters);
  const requestedCount = Number.parseInt(rawCount ?? "20", 10);

  if (!exam || !subject || !type || !chapters.length) {
    return <main className="p-8">Choose an exam, subject, type and at least one chapter.</main>;
  }

  let questions: QuizQuestion[] | null = null;
  try {
    questions = getQuestionsForChapters({ exam, subject, type, chapters }, requestedCount);
  } catch (error) {
    console.error("Could not load quiz data", error instanceof Error ? error.message : "unknown error");
  }
  if (!questions) return <main className="p-8">Quiz data is unavailable. Please try again later.</main>;
  if (!questions.length) return <main className="p-8">No questions were found for that selection.</main>;
  return <QuizClient questions={questions} />;
}
