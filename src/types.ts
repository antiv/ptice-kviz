export interface Bird {
  id: number;
  naziv_srpskom: string;
  naziv_latinskom: string;
  grupa: number;
}

export interface Question {
  correctBird: Bird;
  options: Bird[]; // Array of Bird objects for options
  audioUrl: string;
}

export interface QuizAttempt {
  question: Question;
  userAnswer: string | null; // The Serbian name selected by the user, or null
  isCorrect: boolean;
  points: number;
}
