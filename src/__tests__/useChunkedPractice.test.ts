import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useChunkedPractice } from '../../hooks/useChunkedPractice';
import { IStorageRepository } from '../../services/repository';
import { BankMetadata, MistakeLog, Question } from '../../types';
import { ChunkedPracticeSession, RecentMistakeSession } from '../../types/battleTypes';

const createQuestions = (count: number, prefix: string): Question[] => {
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${index + 1}`,
    question: `${prefix} question ${index + 1}`,
    options: ['A', 'B', 'C', 'D'],
    answer: 'A',
    type: 'single',
  }));
};

const createRepository = (questionMap: Record<string, Question[]>) => {
  let sessions: ChunkedPracticeSession[] = [];
  const mistakeLog: MistakeLog = {};

  const repository: IStorageRepository = {
    getBanks: async () => [],
    createBank: async () => ({ id: 'bank', name: 'bank', createdAt: 0, questionCount: 0 }),
    deleteBank: async () => {},
    updateBankFolder: async () => {},
    syncLocalToCloud: async () => {},
    getQuestions: async (bankId: string) => questionMap[bankId] ?? [],
    saveQuestions: async () => {},
    deleteQuestionArtifacts: async () => {},
    getMistakeLog: () => mistakeLog,
    logMistake: () => {},
    removeMistake: () => {},
    clearMistakes: () => {},
    getSpacedRepetition: async () => [],
    saveSpacedRepetitionItem: async () => {},
    getSpacedRepetitionItem: () => null,
    clearSpacedRepetition: () => {},
    recordStudySession: async () => {},
    getStudyStats: async () => ({ studyDays: 0, totalQuestions: 0, totalCorrect: 0, accuracyRate: 0, totalDurationSeconds: 0 }),
    getDailyStats: async () => [],
    getAchievements: async () => [],
    unlockAchievement: async () => {},
    getStreak: async () => ({ currentStreak: 0, longestStreak: 0, lastStudyDate: null }),
    updateStreak: async () => {},
    getRecentMistakeSessions: (): RecentMistakeSession[] => [],
    addRecentMistakeSession: () => {},
    clearRecentMistakeSession: () => {},
    clearAllRecentMistakes: () => {},
    getPracticeSessions: async () => sessions.filter((session) => session.status === 'active'),
    savePracticeSession: async (session: ChunkedPracticeSession) => {
      sessions = [...sessions.filter((item) => item.id !== session.id), session];
    },
    deletePracticeSession: async (sessionId: string) => {
      sessions = sessions.filter((session) => session.id !== sessionId);
    },
    abandonPracticeSession: async (sessionId: string) => {
      sessions = sessions.map((session) => (
        session.id === sessionId ? { ...session, status: 'abandoned' } : session
      ));
    },
  };

  return {
    repository,
    getSessions: () => sessions,
    setQuestions: (bankId: string, questions: Question[]) => {
      questionMap[bankId] = questions;
    },
  };
};

describe('useChunkedPractice', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const banks: BankMetadata[] = [
    { id: 'bank-a', name: 'Bank A', createdAt: 0, questionCount: 0 },
  ];

  const toast = {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  };

  it('creates expected chunk groups for 60/55/8 questions', async () => {
    const scenario = async (questionCount: number, chunkSize: number): Promise<ChunkedPracticeSession> => {
      const { repository } = createRepository({ 'bank-a': createQuestions(questionCount, 'q') });
      const { result } = renderHook(() => useChunkedPractice({
        repository,
        banks,
        selectedQuizBankIds: ['bank-a'],
        toast,
        onStartChunkQuiz: vi.fn(async () => {}),
      }));

      let created: ChunkedPracticeSession | null = null;
      await act(async () => {
        created = await result.current.createSession(chunkSize);
      });
      if (!created) {
        throw new Error('session should be created');
      }
      return created;
    };

    const s60 = await scenario(60, 20);
    expect(s60.chunks.map((chunk: { totalQuestions: number }) => chunk.totalQuestions)).toEqual([20, 20, 20]);

    const s55 = await scenario(55, 20);
    expect(s55.chunks.map((chunk: { totalQuestions: number }) => chunk.totalQuestions)).toEqual([20, 20, 15]);

    const s8 = await scenario(8, 20);
    expect(s8.chunks.map((chunk: { totalQuestions: number }) => chunk.totalQuestions)).toEqual([8]);
  });

  it('completes chunk state transitions and is idempotent', async () => {
    const { repository, getSessions } = createRepository({ 'bank-a': createQuestions(40, 'q') });
    const onStartChunkQuiz = vi.fn(async () => {});

    const { result } = renderHook(() => useChunkedPractice({
      repository,
      banks,
      selectedQuizBankIds: ['bank-a'],
      toast,
      onStartChunkQuiz,
    }));

    let sessionId = '';
    await act(async () => {
      const session = await result.current.createSession(20);
      sessionId = session?.id ?? '';
    });
    await act(async () => {
      await result.current.startChunk(sessionId, 0);
    });

    await act(async () => {
      await result.current.completeChunk({
        chunkMeta: { sessionId, chunkIndex: 0, totalChunks: 2 },
        score: 18,
        wrongQuestionIds: ['q-1', 'q-2'],
      });
    });

    const afterFirstCompletion = getSessions().find((session) => session.id === sessionId);
    expect(afterFirstCompletion?.chunks[0].status).toBe('completed');
    expect(afterFirstCompletion?.status).toBe('active');
    expect(afterFirstCompletion?.chunks[0].score).toBe(18);

    await act(async () => {
      await result.current.completeChunk({
        chunkMeta: { sessionId, chunkIndex: 0, totalChunks: 2 },
        score: 0,
        wrongQuestionIds: [],
      });
    });

    const afterSecondCompletion = getSessions().find((session) => session.id === sessionId);
    expect(afterSecondCompletion?.chunks[0].score).toBe(18);
  });

  it('recalculates chunk totals when some questions are missing during restore', async () => {
    const questionMap = { 'bank-a': createQuestions(10, 'q') };
    const { repository, getSessions, setQuestions } = createRepository(questionMap);
    const onStartChunkQuiz = vi.fn(async () => {});

    const { result } = renderHook(() => useChunkedPractice({
      repository,
      banks,
      selectedQuizBankIds: ['bank-a'],
      toast,
      onStartChunkQuiz,
    }));

    let sessionId = '';
    await act(async () => {
      const session = await result.current.createSession(5);
      sessionId = session?.id ?? '';
    });

    setQuestions('bank-a', createQuestions(8, 'q'));

    await act(async () => {
      await result.current.restoreSession(sessionId);
    });

    const restored = getSessions().find((session) => session.id === sessionId);
    expect(restored?.chunks[1].totalQuestions).toBeLessThan(5);
    expect(onStartChunkQuiz).toHaveBeenCalled();
    expect(toast.warning).toHaveBeenCalled();
  });

  it('auto-completes a chunk when all questions in that chunk are missing', async () => {
    const questionMap = { 'bank-a': createQuestions(6, 'q') };
    const { repository, getSessions, setQuestions } = createRepository(questionMap);

    const { result } = renderHook(() => useChunkedPractice({
      repository,
      banks,
      selectedQuizBankIds: ['bank-a'],
      toast,
      onStartChunkQuiz: vi.fn(async () => {}),
    }));

    let sessionId = '';
    let chunk0Ids: string[] = [];
    await act(async () => {
      const session = await result.current.createSession(3);
      sessionId = session?.id ?? '';
      // Capture the actual IDs assigned to chunk 0 after shuffle
      chunk0Ids = session?.chunks[0].questionIds ?? [];
    });
    await act(async () => {
      await result.current.startChunk(sessionId, 0);
      await result.current.completeChunk({
        chunkMeta: { sessionId, chunkIndex: 0, totalChunks: 2 },
        score: 3,
        wrongQuestionIds: [],
      });
    });

    // Keep only the questions that were assigned to chunk 0 so that
    // chunk 1's questions are guaranteed to be completely missing.
    const survivingQuestions = chunk0Ids.map((id) => ({
      id,
      question: `question ${id}`,
      options: ['A', 'B', 'C', 'D'],
      answer: 'A',
      type: 'single' as const,
    }));
    setQuestions('bank-a', survivingQuestions);

    await act(async () => {
      await result.current.restoreSession(sessionId);
    });

    const updated = getSessions().find((session) => session.id === sessionId);
    expect(updated?.chunks[1].status).toBe('completed');
    expect(updated?.chunks[1].score).toBe(0);
  });

  it('auto-abandons session when all questions are missing', async () => {
    const questionMap = { 'bank-a': createQuestions(6, 'q') };
    const { repository, getSessions, setQuestions } = createRepository(questionMap);

    const { result } = renderHook(() => useChunkedPractice({
      repository,
      banks,
      selectedQuizBankIds: ['bank-a'],
      toast,
      onStartChunkQuiz: vi.fn(async () => {}),
    }));

    let sessionId = '';
    await act(async () => {
      const session = await result.current.createSession(3);
      sessionId = session?.id ?? '';
    });
    setQuestions('bank-a', []);

    let restored = true;
    await act(async () => {
      restored = await result.current.restoreSession(sessionId);
    });

    expect(restored).toBe(false);
    expect(getSessions().find((session) => session.id === sessionId)?.status).toBe('abandoned');
    expect(toast.warning).toHaveBeenCalledWith('此練習的題目已不存在，已自動放棄');
  });
});
