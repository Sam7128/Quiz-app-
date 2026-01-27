export interface Question {
  id: string | number;
  question: string;
  options: string[];
  answer: string | string[];
  type?: 'single' | 'multiple';
  hint?: string;
  explanation?: string;
  tags?: string[];
}

export interface MistakeLogEntry {
  count: number;
  lastWrongAnswer: string;
  timestamp: number;
}

export interface MistakeLog {
  [questionId: string]: MistakeLogEntry;
}

export interface BankMetadata {
  id: string;
  name: string;
  createdAt: number;
  questionCount: number;
}

export type AppView = 'dashboard' | 'quiz' | 'mistakes' | 'manager' | 'guide';

export interface QuizState {
  currentQuestionIndex: number;
  score: number;
  totalQuestions: number;
  isFinished: boolean;
  activeQuestions: Question[];
  mode: 'random' | 'mistake';
}