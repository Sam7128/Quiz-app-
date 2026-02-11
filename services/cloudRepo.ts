import { BankMetadata, Question, MistakeLog, SpacedRepetitionItem } from '../types';
import { RecentMistakeSession } from '../types/battleTypes';
import { DailyStudyStats, IStorageRepository, StudyStats, StreakData } from './repository';
import {
  getCloudBanks,
  createCloudBank,
  deleteCloudBank,
  updateCloudBankFolder,
  getCloudQuestions,
  saveCloudQuestions,
  getCloudSpacedRepetition,
  saveCloudSpacedRepetition,
  syncLocalToCloud
} from './cloudStorage';
import {
  getMistakeLog,
  logMistake,
  removeMistake,
  clearMistakes,
  getSpacedRepetitionItem,
  saveSpacedRepetitionItem as saveLocalSpacedRepetitionItem,
  clearSpacedRepetition,
  getRecentMistakeSessions,
  addRecentMistakeSession,
  clearRecentMistakeSession,
  clearAllRecentMistakes,
  updateBankFolder as updateLocalBankFolder
} from './storage';
import { recordStudySession, getDailyStats, getStudyStats } from './analytics';
import { getCloudAchievements, unlockCloudAchievement } from './achievements';
import { getCloudStreak, updateCloudStreak } from './streak';

export class CloudStorageRepository implements IStorageRepository {
  async getBanks(): Promise<BankMetadata[]> {
    return getCloudBanks();
  }

  async createBank(name: string, folderId?: string): Promise<BankMetadata> {
    const id = await createCloudBank(name, '', folderId);
    return { id: id || '', name, questionCount: 0, folderId, createdAt: Date.now() };
  }

  async deleteBank(bankId: string): Promise<void> {
    await deleteCloudBank(bankId);
  }

  async updateBankFolder(bankId: string, folderId: string | undefined): Promise<void> {
    updateLocalBankFolder(bankId, folderId);
    await updateCloudBankFolder(bankId, folderId);
  }

  async syncLocalToCloud(localBanks: BankMetadata[]): Promise<void> {
    await syncLocalToCloud(localBanks);
  }

  async getQuestions(bankId: string): Promise<Question[]> {
    return getCloudQuestions(bankId);
  }

  async saveQuestions(bankId: string, questions: Question[]): Promise<void> {
    await saveCloudQuestions(bankId, questions);
  }

  // Mistakes stay in localStorage even for authenticated users (device-specific learning)
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

  async getSpacedRepetition(): Promise<SpacedRepetitionItem[]> {
    return getCloudSpacedRepetition();
  }

  async saveSpacedRepetitionItem(item: SpacedRepetitionItem): Promise<void> {
    saveLocalSpacedRepetitionItem(item);
    await saveCloudSpacedRepetition(item);
  }

  // Local fallback for synchronous access
  getSpacedRepetitionItem(questionId: string): SpacedRepetitionItem | null {
    return getSpacedRepetitionItem(questionId);
  }

  clearSpacedRepetition(): void {
    clearSpacedRepetition();
  }

  async recordStudySession(questionsAnswered: number, correctCount: number, durationSeconds: number): Promise<void> {
    await recordStudySession(questionsAnswered, correctCount, durationSeconds);
  }

  async getStudyStats(): Promise<StudyStats> {
    const stats = await getStudyStats();
    return stats || {
      studyDays: 0,
      totalQuestions: 0,
      totalCorrect: 0,
      accuracyRate: 0,
      totalDurationSeconds: 0
    };
  }

  async getDailyStats(): Promise<DailyStudyStats[]> {
    return getDailyStats();
  }

  async getAchievements(): Promise<string[]> {
    return getCloudAchievements();
  }

  async unlockAchievement(achievementId: string): Promise<void> {
    await unlockCloudAchievement(achievementId);
  }

  async getStreak(): Promise<StreakData> {
    const data = await getCloudStreak();
    return data || { currentStreak: 0, longestStreak: 0, lastStudyDate: null };
  }

  async updateStreak(): Promise<void> {
    await updateCloudStreak();
  }

  // Recent mistakes stay in localStorage (device-specific)
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
