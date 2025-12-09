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
  questionNumber?: number;
  topic?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
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
  interviewId: string;
  totalQuestions: number;
}

export interface InterviewStartPayload {
  experience_years: number;
  subject: string;
  difficulty: 'easy' | 'medium' | 'hard';
  num_questions: number;
}

export interface InterviewStartResponse {
  interview_id: string;
  first_question: {
    question_number: number;
    question: string;
    difficulty: 'easy' | 'medium' | 'hard';
    topic: string;
  };
  total_questions: number;
  config: InterviewStartPayload;
}

export interface AnswerQuestionResponse {
  evaluation: {
    score: number;
    correctness: string;
    depth: string;
    clarity: string;
    practical_understanding: string;
    strengths: string[];
    areas_for_improvement: string[];
    feedback: string;
  };
  next_question?: {
    question_number: number;
    question: string;
    difficulty: 'easy' | 'medium' | 'hard';
    topic: string;
  };
  is_complete: boolean;
  questions_remaining: number;
  current_question_num: number;
}

export interface QuestionBreakdown {
  question_number: number;
  question: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  answer_summary: string;
  score: number;
  feedback: string;
}

export interface InterviewReport {
  interview_id: string;
  overall_score: number;
  total_questions: number;
  questions_answered: number;
  experience_years: number;
  subject: string;
  detailed_feedback: string;
  strong_areas: string[];
  weak_areas: string[];
  question_wise_breakdown: QuestionBreakdown[];
  recommendations: string[];
  hire_recommendation: string;
}

