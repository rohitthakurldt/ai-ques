export interface User {
  id: string;
  email: string;
  name: string;
}

export interface InterviewConfig {
  subject: string;
  difficulty: 'easy' | 'medium' | 'hard';
  numberOfQuestions: number;
  yearsOfExperience: number;
}

export interface Question {
  id: string;
  question: string;
  type: 'intro' | 'technical';
}

export interface Answer {
  questionId: string;
  answer: string;
  timestamp: number;
}

export interface InterviewState {
  config: InterviewConfig;
  currentQuestionIndex: number;
  questions: Question[];
  answers: Answer[];
  introAnswer: string;
  currentAnswer: string;
  introHeading: string;
}

