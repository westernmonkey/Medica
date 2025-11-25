'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { QuestionData } from './page';
import { BlockMath, InlineMath } from 'react-katex';

type AnswerState = 'unanswered' | 'correct' | 'incorrect';

// Helper function to strip extraneous text wrappers and ensure $...$ wrapping for KaTeX.
const cleanAnswerText = (text: string | null): string | null => {
  if (!text) return null;

  let cleaned = text;
  
  // 1. Aggressively strip surrounding text and status markers from the raw option text
  cleaned = cleaned.replace(/Your answer: |Correct answer: /g, '').trim();
  cleaned = cleaned.replace(/\s+\(Correct!\)|\s+\(Incorrect\)/g, '').trim();
  
  // 2. Remove the specific \text{} wrappers commonly seen in the data
  cleaned = cleaned.replace(/\\text{/g, '').replace(/}/g, '').trim();

  // 3. Remove backslashes ONLY if they are escaping a space or non-KaTeX character
  // We'll trust that the remaining \commands (like \mathrm or \frac) are intentional.
  
  // 4. Ensure the cleaned content is wrapped in $...$ for renderText to process it as inline math.
  if (cleaned.startsWith('<math')) {
      // Don't wrap MathML, let renderText handle it via dangerouslySetInnerHTML
      return cleaned; 
  }

  // Remove existing dollar signs if they appear at the start/end
  if (cleaned.startsWith('$') && cleaned.endsWith('$')) {
      cleaned = cleaned.slice(1, -1);
  }
  
  // Wrap the cleaned content for guaranteed inline math rendering
  return `$${cleaned.trim()}$`;
};


export default function QuizClient({ questions }: { questions: QuestionData[] }) {
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>('unanswered');
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [userAnswers, setUserAnswers] = useState<any[]>([]);
  
  const router = useRouter();

  // Stop here if no questions were loaded
  if (questions.length === 0) {
    return (
      <main className="flex min-h-screen flex-col items-center p-24">
        <h1 className="text-2xl font-bold">No questions found.</h1>
        <p>Please check your file structure or try a different selection.</p>
        <button 
          onClick={() => router.push('/question-bank')}
          className="mt-8 p-4 px-8 bg-blue-600 text-white font-bold rounded hover:bg-blue-700"
        >
          &larr; Go Back
        </button>
      </main>
    );
  }

  const question = questions[currentQ];

  // Function to handle exiting the quiz
  const handleExit = () => {
    // 💡 FIX: Use a custom modal or message box instead of window.confirm
    if (confirm('Are you sure you want to exit? Your progress will be lost.')) {
      router.push('/question-bank');
    }
  };

  // Render question/solution text (handles HTML and LaTeX)
  const renderText = (text: string | null) => {
    if (!text) return null;
    
    // Split text by $...$ (inline) and $$...$$ (block)
    const parts = text.split(/(\$\$[\s\S]+?\$\$)|(\$[^$]+\$)/g);
    
    return parts.map((part, index) => {
      if (!part) return null;
      if (part.startsWith('$$') && part.endsWith('$$')) {
        return <BlockMath key={index}>{part.slice(2, -2).trim()}</BlockMath>;
      }
      if (part.startsWith('$') && part.endsWith('$')) {
        return <InlineMath key={index}>{part.slice(1, -1).trim()}</InlineMath>;
      }
      // Use dangerouslySetInnerHTML to render image tags and regular HTML/text
      return <span key={index} dangerouslySetInnerHTML={{ __html: part }} />;
    });
  };

  // New function to clean and render option text for the Review Screen
  const renderReviewText = (text: string | null) => {
    const cleanedText = cleanAnswerText(text);
    if (!cleanedText) return null;
    
    // Now pass the cleaned string through the main rendering pipeline
    return <span className="font-semibold">{renderText(cleanedText)}</span>;
  }

  const checkAnswer = () => {
    if (!selectedOptionId) return;

    const selected = question.options.find(opt => opt.id === selectedOptionId);
    if (!selected) return;

    const isCorrect = selected.isCorrect;
    const newState = isCorrect ? 'correct' : 'incorrect';
    
    setAnswerState(newState);
    if (isCorrect) setScore(s => s + 1);

    // Save for review
    setUserAnswers(prev => [
      ...prev,
      { question, selectedOptionId, isCorrect }
    ]);
  };

  const nextQuestion = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ(q => q + 1);
      setAnswerState('unanswered');
      setSelectedOptionId(null);
    } else {
      // Finish quiz
      setIsFinished(true);
    }
  };

  // --- View 3: Results Screen ---
  if (isFinished) {
    return (
      <main className="flex min-h-screen flex-col items-center p-8 md:p-24 bg-gray-50">
        <div className="w-full max-w-4xl bg-white p-6 rounded-xl shadow-2xl">
          <h1 className="text-4xl font-extrabold mb-4 text-center text-blue-800">Quiz Complete!</h1>
          <p className="text-2xl mb-8 text-center text-gray-700">
            Your final score: <span className="font-bold text-green-600">{score} / {questions.length}</span>
          </p>
          <div className="flex justify-center">
            <button 
              onClick={() => router.push('/question-bank')}
              className="mb-8 p-4 px-8 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition duration-150"
            >
              &larr; Back to Quiz Bank
            </button>
          </div>
          
          <h2 className="text-3xl font-semibold border-b pb-2 mb-6 text-gray-800">Review Your Answers</h2>
          
          <div className="flex flex-col gap-8">
            {userAnswers.map((answer, index) => {
              const q = answer.question as QuestionData;
              const correctOpt = q.options.find(o => o.isCorrect);
              const selectedOpt = q.options.find(o => o.id === answer.selectedOptionId);

              return (
                <div key={index} className="border border-gray-200 rounded-xl p-6 shadow-lg bg-white">
                  <div className="font-bold text-xl mb-4 text-blue-700">Question {index + 1}</div>
                  <div className="text-base mb-4 prose max-w-none">{renderText(q.question.text)}</div>
                  
                  {/* --- RENDERED USER ANSWER --- */}
                  <div className={`p-3 rounded-lg border-2 ${answer.isCorrect ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
                    <p className="text-gray-700 mb-1">Your answer:</p> 
                    <div className="font-semibold text-lg inline-block">
                        {/* Use nullish coalescing to ensure renderReviewText receives string | null */}
                        {renderReviewText(selectedOpt?.text ?? null)} 
                    </div>
                    <span className="ml-2 font-bold text-sm">
                        {answer.isCorrect ? ' (Correct!)' : ' (Incorrect)'}
                    </span>
                  </div>
                  
                  {/* --- RENDERED CORRECT ANSWER (if incorrect) --- */}
                  {!answer.isCorrect && (
                    <div className="p-3 rounded-lg bg-green-50 border-2 border-green-300 mt-3">
                      <p className="text-gray-700 mb-1">Correct answer:</p> 
                      <div className="font-semibold text-lg inline-block">
                          {/* Use nullish coalescing to ensure renderReviewText receives string | null */}
                          {renderReviewText(correctOpt?.text ?? null)}
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-6 p-4 bg-gray-100 rounded-lg border border-gray-200">
                    <h4 className="font-bold text-lg mb-2 text-gray-800">Explanation:</h4>
                    <div className="text-sm prose max-w-none">{renderText(q.solution.text)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    );
  }

  // --- View 2: Quiz Screen ---
  return (
    <main className="flex min-h-screen flex-col items-center p-8 md:p-24 bg-gray-50">
      <div className="w-full max-w-4xl bg-white p-6 rounded-xl shadow-2xl">
        
        {/* --- REVISED HEADER --- */}
        <div className="mb-8 flex justify-between items-center border-b pb-4">
          <button 
            onClick={handleExit}
            className="text-gray-600 hover:text-red-500 font-medium p-2 rounded-lg hover:bg-gray-100 transition duration-150"
          >
            &larr; Exit Quiz
          </button>
          <span className="text-xl font-bold text-blue-700">Question {currentQ + 1} of {questions.length}</span>
          <span className="text-xl font-bold text-green-600">Score: {score}</span>
        </div>
        
        {/* --- Question --- */}
        <div className="text-2xl font-medium mb-8 prose max-w-none">
          {renderText(question.question.text)}
        </div>

        {/* --- Options --- */}
        <div className="flex flex-col gap-4 mb-8">
          {question.options.map((opt) => {
            let style = 'border-gray-300 hover:bg-gray-100';
            if (answerState !== 'unanswered') {
              if (opt.isCorrect) style = 'bg-green-200 border-green-400';
              else if (opt.id === selectedOptionId) style = 'bg-red-200 border-red-400';
              else style = 'border-gray-300 opacity-60';
            } else if (opt.id === selectedOptionId) {
              style = 'bg-blue-100 border-blue-400';
            }

            return (
              <button
                key={opt.id}
                onClick={() => setSelectedOptionId(opt.id)}
                disabled={answerState !== 'unanswered'}
                className={`p-4 border-2 rounded-lg text-left text-lg transition duration-150 ${style}`}
              >
                {/* 💡 Use renderText for options too, in case they contain math */}
                {renderText(opt.text)}
              </button>
            );
          })}
        </div>
        
        {/* --- Control Buttons --- */}
        <div className="flex justify-end">
          {answerState === 'unanswered' ? (
            <button 
              onClick={checkAnswer} 
              disabled={!selectedOptionId}
              className="p-4 px-8 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-400 transition duration-150"
            >
              Submit
            </button>
          ) : (
            <button 
              onClick={nextQuestion} 
              className="p-4 px-8 bg-green-600 text-white font-bold rounded-lg shadow-md hover:bg-green-700 transition duration-150"
            >
              {currentQ === questions.length - 1 ? 'Finish Quiz' : 'Next'}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}