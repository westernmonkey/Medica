export type Question = {
  _id: string;
  question: { text: string | null; image: string | null };
  options: {
    id: string;
    text: string | null;
    isCorrect: boolean;
    image: string | null;
  }[];
};

export type Player = {
  id: string;
  name: string;
  score: number;
};

export type RoundAnswer = {
  optionId: string;
  correct: boolean;
};

export type Match = {
  code: string;
  status: "waiting" | "playing" | "done";
  players: Player[];
  currentIndex: number;
  questions: Question[];
  answers: Record<string, RoundAnswer>;
  roundWinnerId: string | null;
};

export type PublicOption = {
  id: string;
  text: string | null;
  image: string | null;
};

export type PublicMatch = {
  code: string;
  status: Match["status"];
  players: Player[];
  currentIndex: number;
  total: number;
  question: {
    text: string | null;
    image: string | null;
    options: PublicOption[];
  } | null;
  answers: Record<string, RoundAnswer>;
  roundWinnerId: string | null;
  correctOptionId: string | null;
};
