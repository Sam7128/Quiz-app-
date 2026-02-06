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

export interface SpacedRepetitionItem {
  questionId: string;
  easinessFactor: number; // default 2.5, min 1.3
  interval: number; // days since last review
  repetitions: number; // consecutive correct reviews (default 0)
  nextReviewDate: number; // timestamp when next review is due
  lastReviewDate?: number; // timestamp of last review
}

export interface Folder {
  id: string;
  name: string;
  createdAt: number;
}

export interface BankMetadata {
  id: string;
  name: string;
  createdAt: number;
  questionCount: number;
  description?: string;
  folderId?: string | null; // Optional reference to a parent folder
}

export type AppView = 'dashboard' | 'quiz' | 'mistakes' | 'manager' | 'guide' | 'social';

export interface AppState {
  view: AppView;
  guestMode: boolean;
  isSettingsOpen: boolean;
  sharingBank: BankMetadata | null;
  banks: BankMetadata[];
  folders: Folder[];
  editingBankId: string | null;
  selectedQuizBankIds: string[];
  gameMode: boolean;
}

export type AppAction =
  | { type: 'set_view'; view: AppView }
  | { type: 'set_guest_mode'; guestMode: boolean }
  | { type: 'set_settings_open'; isSettingsOpen: boolean }
  | { type: 'set_sharing_bank'; sharingBank: BankMetadata | null }
  | { type: 'sync_banks_data'; banks: BankMetadata[]; folders: Folder[] }
  | { type: 'set_editing_bank_id'; editingBankId: string | null }
  | { type: 'toggle_quiz_bank_id'; bankId: string }
  | { type: 'set_selected_bank_ids'; bankIds: string[] }
  | { type: 'set_game_mode'; gameMode: boolean };

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
  provider: 'google' | 'nvidia';
  apiKey: string;
  model: string;
  baseUrl?: string;
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
