// app/question-bank/page.tsx
import fs from 'fs';
import path from 'path';
import QuizSelector from './quiz-selector';
import type { QuizFileStructure } from './types';

// Helper function to read directories safely
const readDir = (dirPath: string): string[] => {
  try {
    return fs
      .readdirSync(dirPath, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);
  } catch (error)
  {
    console.warn(`Could not read directory: ${dirPath}`, error);
    return []; // Return empty array if path doesn't exist
  }
};

// This Server Component reads the file system
export default function SetupPage() {
  const bankPath = path.join(process.cwd(), 'public', 'bank');
  const structure: QuizFileStructure = {};

  const exams = readDir(bankPath);

  for (const exam of exams) {
    structure[exam] = {};
    const examPath = path.join(bankPath, exam);
    const subjects = readDir(examPath);

    for (const subject of subjects) {
      structure[exam][subject] = {};
      const subjectPath = path.join(examPath, subject);
      const types = readDir(subjectPath);

      for (const type of types) {
        const typePath = path.join(subjectPath, type);
        const chapters = readDir(typePath);
        structure[exam][subject][type] = chapters;
      }
    }
  }

  // Pass the entire structure to the client component
  return (
    // The background pattern is now on the body, so we just center the content
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-12">
      {/* Use card styles for the container */}
      <div className="w-full max-w-2xl rounded-2xl bg-card p-8 text-card-foreground shadow-2xl ring-1 ring-border">
        {/* Use primary text color for the heading */}
        <h1 className="mb-8 text-center text-4xl font-bold text-primary">
          Build Your Quiz
        </h1>
        <QuizSelector structure={structure} />
      </div>
    </main>
  );
}
