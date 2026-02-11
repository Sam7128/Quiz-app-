import { BankMetadata, Question, MistakeLog, SpacedRepetitionItem } from '../types';
import { RecentMistakeSession } from '../types/battleTypes';
import { DailyStudyStats, IStorageRepository, StudyStats, StreakData } from './repository';
import {
  getBanksMeta,
  createBank as createLocalBank,
  deleteBank as deleteLocalBank,
  updateBankFolder as updateLocalBankFolder,
  getQuestions as getLocalQuestions,
  saveQuestions as saveLocalQuestions,
  getMistakeLog,
  logMistake,
  removeMistake,
  clearMistakes,
  getSpacedRepetition,
  saveSpacedRepetitionItem,
  getSpacedRepetitionItem,
  clearSpacedRepetition,
  getRecentMistakeSessions,
  addRecentMistakeSession,
  clearRecentMistakeSession,
  clearAllRecentMistakes
} from './storage';
import { recordLocalStudySession, getLocalDailyStats, getLocalStudyStats } from './analytics';
import { getLocalAchievements, unlockLocalAchievement } from './achievements';
import { getLocalStreak, updateLocalStreak } from './streak';

export class LocalStorageRepository implements IStorageRepository {
  async getBanks(): Promise<BankMetadata[]> {
    return getBanksMeta();
  }

  async createBank(name: string, folderId?: string): Promise<BankMetadata> {
    return createLocalBank(name, folderId);
  }

  async deleteBank(bankId: string): Promise<void> {
    deleteLocalBank(bankId);
  }

  async updateBankFolder(bankId: string, folderId: string | undefined): Promise<void> {
    updateLocalBankFolder(bankId, folderId);
  }

  async syncLocalToCloud(localBanks: BankMetadata[]): Promise<void> {
    void localBanks;
  }

  async getQuestions(bankId: string): Promise<Question[]> {
    return getLocalQuestions(bankId);
  }

  async saveQuestions(bankId: string, questions: Question[]): Promise<void> {
    saveLocalQuestions(bankId, questions);
  }

  getMistakeLog(): MistakeLog {
    return getMistakeLog();
  }

  logMistake(questionId: string | number, wrongAnswer: string): void {
    logMistake(questionId, wrongAnswer);
  }

  removeMistake(questionId: string | number): void {
    removeMistake(questionId);
  }

  clearMistakes(): void {
    clearMistakes();
  }

  async getSpacedRepetition(): Promise<Record<string, SpacedRepetitionItem>> {
    return getSpacedRepetition();
  }

  async saveSpacedRepetitionItem(item: SpacedRepetitionItem): Promise<void> {
    saveSpacedRepetitionItem(item);
  }

  getSpacedRepetitionItem(questionId: string): SpacedRepetitionItem | null {
    return getSpacedRepetitionItem(questionId);
  }

  clearSpacedRepetition(): void {
    clearSpacedRepetition();
  }

  async recordStudySession(questionsAnswered: number, correctCount: number, durationSeconds: number): Promise<void> {
    recordLocalStudySession(questionsAnswered, correctCount, durationSeconds);
  }

  async getStudyStats(): Promise<StudyStats> {
    return getLocalStudyStats();
  }

  async getDailyStats(): Promise<DailyStudyStats[]> {
    return getLocalDailyStats();
  }

  async getAchievements(): Promise<string[]> {
    return getLocalAchievements();
  }

  async unlockAchievement(achievementId: string): Promise<void> {
    unlockLocalAchievement(achievementId);
  }

  async getStreak(): Promise<StreakData> {
    return getLocalStreak();
  }

  async updateStreak(): Promise<void> {
    updateLocalStreak();
  }

  getRecentMistakeSessions(): RecentMistakeSession[] {
    return getRecentMistakeSessions();
  }

  addRecentMistakeSession(session: RecentMistakeSession): void {
    addRecentMistakeSession(session);
  }

  clearRecentMistakeSession(sessionId: string): void {
    clearRecentMistakeSession(sessionId);
  }

  clearAllRecentMistakes(): void {
    clearAllRecentMistakes();
  }
}
