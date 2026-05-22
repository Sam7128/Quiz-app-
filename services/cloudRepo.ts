import { BankMetadata, Question, MistakeLog, SpacedRepetitionItem, SyncLocalToCloudResult } from '../types';
import { RecentMistakeSession, ChunkedPracticeSession } from '../types/battleTypes';
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
  syncLocalToCloud,
  deleteCloudSpacedRepetition,
  getCloudPracticeSessions,
  saveCloudPracticeSession,
  deleteCloudPracticeSession,
  abandonCloudPracticeSession
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
  updateBankFolder as updateLocalBankFolder,
  deleteQuestionArtifacts as deleteLocalQuestionArtifacts,
  getPracticeSessions as getLocalPracticeSessions,
  getAllPracticeSessions,
  savePracticeSession as saveLocalPracticeSession,
  deletePracticeSession as deleteLocalPracticeSession,
  removePracticeSessionCache as removeLocalPracticeSessionCache,
  abandonPracticeSession as abandonLocalPracticeSession
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
    if (!id) {
      throw new Error('建立雲端題庫失敗');
    }
    return { id, name, questionCount: 0, folderId, createdAt: Date.now() };
  }

  async deleteBank(bankId: string): Promise<void> {
    await deleteCloudBank(bankId);
  }

  async updateBankFolder(bankId: string, folderId: string | undefined): Promise<void> {
    updateLocalBankFolder(bankId, folderId);
    await updateCloudBankFolder(bankId, folderId);
  }

  async syncLocalToCloud(localBanks: BankMetadata[]): Promise<SyncLocalToCloudResult> {
    return await syncLocalToCloud(localBanks);
  }

  async getQuestions(bankId: string): Promise<Question[]> {
    return getCloudQuestions(bankId);
  }

  async saveQuestions(bankId: string, questions: Question[]): Promise<void> {
    await saveCloudQuestions(bankId, questions);
  }

  async deleteQuestionArtifacts(questionId: string): Promise<void> {
    deleteLocalQuestionArtifacts(questionId);
    await deleteCloudSpacedRepetition(questionId);
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

  async getPracticeSessions(): Promise<ChunkedPracticeSession[]> {
    const cloudSessions = await getCloudPracticeSessions();
    if (cloudSessions.length > 0) {
      return cloudSessions.filter((session) => session.status === 'active');
    }
    return getLocalPracticeSessions();
  }

  async savePracticeSession(session: ChunkedPracticeSession): Promise<void> {
    try {
      await saveCloudPracticeSession(session);
      removeLocalPracticeSessionCache(session.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'cloud save failed';
      saveLocalPracticeSession({
        ...session,
        dirty: true,
        retryCount: (session.retryCount ?? 0) + 1,
        lastSyncError: message,
        updatedAt: Date.now(),
      });
      console.error('Cloud practice session save failed, fallback to local dirty session', error);
    }
  }

  async deletePracticeSession(sessionId: string): Promise<void> {
    await deleteCloudPracticeSession(sessionId);
    deleteLocalPracticeSession(sessionId);
  }

  async abandonPracticeSession(sessionId: string): Promise<void> {
    try {
      await abandonCloudPracticeSession(sessionId);
      abandonLocalPracticeSession(sessionId);
    } catch (error) {
      const local = getAllPracticeSessions().find((session) => session.id === sessionId);
      if (local) {
        const message = error instanceof Error ? error.message : 'cloud abandon failed';
        saveLocalPracticeSession({
          ...local,
          status: 'abandoned',
          dirty: true,
          retryCount: (local.retryCount ?? 0) + 1,
          lastSyncError: message,
          updatedAt: Date.now(),
        });
      } else {
        abandonLocalPracticeSession(sessionId);
      }
      console.error('Cloud abandon failed, fallback to local session', error);
    }
  }
}
