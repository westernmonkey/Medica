// app/quiz-selector.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
// ADD THIS LINE
import type { QuizFileStructure } from './types';

// Helper function to format strings for paths
const formatPath = (str: string) => encodeURIComponent(str);

export default function QuizSelector({ structure }: { structure: QuizFileStructure }) {
  const router = useRouter();
  
  // State for selections
  const [exam, setExam] = useState('');
  const [subject, setSubject] = useState('');
  const [type, setType] = useState('');
  const [chapters, setChapters] = useState<string[]>([]);
  const [numQuestions, setNumQuestions] = useState(20);

  // Get available options based on previous selections
  const examOptions = Object.keys(structure);
  const subjectOptions = exam ? Object.keys(structure[exam]) : [];
  const typeOptions = exam && subject ? Object.keys(structure[exam][subject]) : [];
  const chapterOptions = exam && subject && type ? structure[exam][subject][type] : [];

  // Handler for chapter checkboxes
  const handleChapterChange = (chapter: string) => {
    setChapters((prev) =>
      prev.includes(chapter)
        ? prev.filter((c) => c !== chapter) // Uncheck
        : [...prev, chapter] // Check
    );
  };

  // Handler for starting the quiz
  const startQuiz = () => {
    if (!exam || !subject || !type || chapters.length === 0) {
      alert('Please select all fields and at least one chapter.');
      return;
    }

    // Build the query string
    const query = new URLSearchParams();
    query.append('exam', formatPath(exam));
    query.append('subject', formatPath(subject));
    query.append('type', formatPath(type));
    query.append('num', numQuestions.toString());
    
    // Add all selected chapters
    chapters.forEach(ch => query.append('chapters', formatPath(ch)));

    // Navigate to the quiz page with the selections
    router.push(`/question-bank/session?${query.toString()}`);
  };
  
  // Reset fields when a parent dropdown changes
  const handleExamChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setExam(e.target.value);
    setSubject('');
    setType('');
    setChapters([]);
  };

  const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSubject(e.target.value);
    setType('');
    setChapters([]);
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setType(e.target.value);
    setChapters([]);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* --- Exam Dropdown --- */}
      <label className="flex flex-col">
        <span className="font-medium">Exam:</span>
        <select value={exam} onChange={handleExamChange} className="p-2 border rounded">
          <option value="">Select Exam</option>
          {examOptions.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
      </label>

      {/* --- Subject Dropdown --- */}
      <label className="flex flex-col">
        <span className="font-medium">Subject:</span>
        <select value={subject} onChange={handleSubjectChange} disabled={!exam} className="p-2 border rounded disabled:bg-gray-100">
          <option value="">Select Subject</option>
          {subjectOptions.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>

      {/* --- Type Dropdown --- */}
      <label className="flex flex-col">
        <span className="font-medium">Type:</span>
        <select value={type} onChange={handleTypeChange} disabled={!subject} className="p-2 border rounded disabled:bg-gray-100">
          <option value="">Select Type</option>
          {typeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>

      {/* --- Chapter Checkboxes --- */}
      {chapterOptions.length > 0 && (
        <div className="flex flex-col">
          <span className="font-medium">Chapters (Select one or more):</span>
          <div className="h-64 overflow-y-auto border rounded p-4 grid grid-cols-1 md:grid-cols-2 gap-2">
            {chapterOptions.map((ch) => (
              <label key={ch} className="flex items-center gap-2 p-2 rounded hover:bg-gray-100">
                <input
                  type="checkbox"
                  checked={chapters.includes(ch)}
                  onChange={() => handleChapterChange(ch)}
                  className="w-4 h-4"
                />
                <span>{ch}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* --- Number of Questions --- */}
      <label className="flex flex-col">
        <span className="font-medium">Number of Questions:</span>
        <input
          type="number"
          value={numQuestions}
          onChange={(e) => setNumQuestions(Math.max(1, parseInt(e.target.value) || 1))}
          className="p-2 border rounded"
        />
      </label>

      {/* --- Start Button --- */}
      <button onClick={startQuiz} className="p-4 bg-blue-600 text-white font-bold rounded hover:bg-blue-700">
        Start Quiz
      </button>
    </div>
  );
}