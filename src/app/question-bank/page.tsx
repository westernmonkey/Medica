import QuizSelector from "./quiz-selector";
import { getQuizStructure } from "@/lib/question-bank/data";
import type { QuizFileStructure } from "./types";

export default function SetupPage() {
  const structure: QuizFileStructure = getQuizStructure();
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-12">
      <div className="w-full max-w-2xl rounded-2xl bg-card p-8 text-card-foreground shadow-2xl ring-1 ring-border">
        <h1 className="mb-8 text-center text-4xl font-bold text-primary">Build Your Quiz</h1>
        <QuizSelector structure={structure} />
      </div>
    </main>
  );
}
