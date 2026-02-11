import { BankMetadata, Question, MistakeLog, SpacedRepetitionItem } from '../types';
import { RecentMistakeSession } from '../types/battleTypes';
import { StudyStats as AnalyticsStudyStats } from './analytics';

export type StudyStats = AnalyticsStudyStats;

export interface DailyStudyStats {
  date: string;
  questions: number;
  correct: number;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string | null;
}

/**
 * Unified storage interface for all data operations.
 * Implementations: LocalStorageRepository (guest) and CloudStorageRepository (authenticated).
 */
export interface IStorageRepository {
  // Bank Management
  getBanks(): Promise<BankMetadata[]>;
  createBank(name: string, folderId?: string): Promise<BankMetadata>;
  deleteBank(bankId: string): Promise<void>;
  updateBankFolder(bankId: string, folderId: string | undefined): Promise<void>;
  syncLocalToCloud(localBanks: BankMetadata[]): Promise<void>;

  // Questions
  getQuestions(bankId: string): Promise<Question[]>;
  saveQuestions(bankId: string, questions: Question[]): Promise<void>;

  // Mistakes
  getMistakeLog(): MistakeLog;
  logMistake(questionId: string | number, wrongAnswer: string): void;
  removeMistake(questionId: string | number): void;
  clearMistakes(): void;

  // Spaced Repetition
  getSpacedRepetition(): Promise<Record<string, SpacedRepetitionItem> | SpacedRepetitionItem[]>;
  saveSpacedRepetitionItem(item: SpacedRepetitionItem): Promise<void>;
  getSpacedRepetitionItem(questionId: string): SpacedRepetitionItem | null;
  clearSpacedRepetition(): void;

  // Analytics
  recordStudySession(questionsAnswered: number, correctCount: number, durationSeconds: number): Promise<void>;
  getStudyStats(): Promise<StudyStats>;
  getDailyStats(): Promise<DailyStudyStats[]>;

  // Achievements
  getAchievements(): Promise<string[]>;
  unlockAchievement(achievementId: string): Promise<void>;

  // Streak
  getStreak(): Promise<StreakData>;
  updateStreak(): Promise<void>;

  // Recent Mistakes
  getRecentMistakeSessions(): RecentMistakeSession[];
  addRecentMistakeSession(session: RecentMistakeSession): void;
  clearRecentMistakeSession(sessionId: string): void;
  clearAllRecentMistakes(): void;
}
