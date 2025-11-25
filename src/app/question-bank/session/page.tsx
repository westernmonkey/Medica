// src/app/question-bank/session/page.tsx (FIXED)

export const dynamic = 'force-dynamic';

import fs from 'fs';
import path from 'path';
import QuizClient from './quiz-client';
import 'katex/dist/katex.min.css'; // Import KaTeX CSS

// Define the shape of a single question
export interface QuestionData {
  _id: string;
  question: {
    text: string | null;
    image: string | null;
  };
  options: {
    id: string;
    text: string | null;
    isCorrect: boolean;
    image: string | null;
  }[];
  solution: {
    text: string | null;
    image: string | null;
  };
  // Add any other fields you might need
}

// Helper to shuffle an array
const shuffle = (array: any[]) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

// This Server Component reads all the question files
export default async function QuizPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  // 🚀 CRITICAL FIX: The error suggests that searchParams is a Proxy-like object
  // that needs to be explicitly resolved before accessing its properties,
  // even if the component is async. We use Promise.resolve to explicitly await it.
  const resolvedSearchParams = (await Promise.resolve(searchParams)) as typeof searchParams;

  const exam = decodeURIComponent(resolvedSearchParams.exam as string);
  const subject = decodeURIComponent(resolvedSearchParams.subject as string);
  const type = decodeURIComponent(resolvedSearchParams.type as string);
  const numQuestions = parseInt(resolvedSearchParams.num as string) || 20;
  
  // Handle chapters, which can be a single string or an array
  let chapterNames: string[] = [];
  if (Array.isArray(resolvedSearchParams.chapters)) {
    chapterNames = resolvedSearchParams.chapters.map(ch => decodeURIComponent(ch));
  } else if (typeof resolvedSearchParams.chapters === 'string') {
    chapterNames = [decodeURIComponent(resolvedSearchParams.chapters)];
  }

  if (!exam || !subject || !type || chapterNames.length === 0) {
    return <div>Error: Missing quiz parameters.</div>;
  }

  const allQuestions: QuestionData[] = [];
  const bankPath = path.join(process.cwd(), 'public', 'bank');

  try {
    // Loop through each selected chapter folder
    for (const chapter of chapterNames) {
      const chapterPath = path.join(
        bankPath,
        exam, // e.g., 'neetug'
        subject, // e.g., 'Physics'
        type, // e.g., 'NTA Abhyaas'
        chapter // e.g., 'Current Electricity'
      );

      const questionFiles = fs.readdirSync(chapterPath)
                               .filter(file => file.endsWith('.json'));

      // Read every question file in the folder
      for (const file of questionFiles) {
        const filePath = path.join(chapterPath, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const json = JSON.parse(fileContent);
        
        // Add the 'data' part to our question list
        if (json.success && json.data) {
          allQuestions.push(json.data);
        }
      }
    }
  } catch (error) {
    console.error('Failed to read question files:', error);
    return <div>Error loading questions. Please check folder paths.</div>;
  }

  // We have all questions, now let's shuffle and slice
  const shuffledQuestions = shuffle(allQuestions);
  const quizQuestions = shuffledQuestions.slice(0, numQuestions);

  // Pass the final list of questions to the Client Component
  return <QuizClient questions={quizQuestions} />;
}