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
  description?: string;
}

export type AppView = 'dashboard' | 'quiz' | 'mistakes' | 'manager' | 'guide' | 'social';

export interface QuizState {
  currentQuestionIndex: number;
  score: number;
  totalQuestions: number;
  isFinished: boolean;
  activeQuestions: Question[];
  mode: 'random' | 'mistake' | 'retry_session'; // Added retry_session
  wrongQuestionIds: string[]; // Track session mistakes
}

export interface AIConfig {
  apiKey: string;
  model: string;
}

export interface UserProfile {
  id: string;
  username: string;
  avatar_url?: string;
}

export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted';
  created_at: string;
  friend_profile?: UserProfile;
}

export interface SharedBank {
  id: string;
  sender_id: string;
  receiver_id: string;
  bank_snapshot: {
    meta: BankMetadata;
    questions: Question[];
  };
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  sender_profile?: UserProfile;
}