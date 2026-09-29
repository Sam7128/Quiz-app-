import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useQuizEngine } from '../../hooks/useQuizEngine';
import { IStorageRepository } from '../../services/repository';
import { BankMetadata, MistakeLog, Question, SpacedRepetitionItem } from '../../types';
import { ChunkedPracticeSession, RecentMistakeSession } from '../../types/battleTypes';

const createMockRepo = (params: {
  banks: BankMetadata[];
  bankQuestions: Record<string, Question[]>;
  spacedRepetition: Record<string, SpacedRepetitionItem>;
}) => {
  const mistakeLog: MistakeLog = {};
  const saveSpacedRepetitionMock = vi.fn().mockImplementation(async (item: SpacedRepetitionItem) => {
    params.spacedRepetition[item.questionId] = item;
  });

  const repo: IStorageRepository = {
    getBanks: async () => params.banks,
    createBank: async () => ({ id: 'bank-1', name: 'B1', createdAt: 0, questionCount: 0 }),
    deleteBank: async () => {},
    updateBankFolder: async () => {},
    syncLocalToCloud: async () => ({ successIds: [], failed: [] }),
    getQuestions: async (bankId: string) => params.bankQuestions[bankId] ?? [],
    saveQuestions: async () => {},
    deleteQuestionArtifacts: async () => {},
    getMistakeLog: () => mistakeLog,
    logMistake: vi.fn(),
    removeMistake: vi.fn(),
    clearMistakes: () => {},
    getSpacedRepetition: async () => params.spacedRepetition,
    saveSpacedRepetitionItem: saveSpacedRepetitionMock,
    getSpacedRepetitionItem: (id: string) => params.spacedRepetition[id] ?? null,
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
    getPracticeSessions: async (): Promise<ChunkedPracticeSession[]> => [],
    savePracticeSession: async () => {},
    deletePracticeSession: async () => {},
    abandonPracticeSession: async () => {},
  };

  return { repo, saveSpacedRepetitionMock };
};

describe('useQuizEngine - spaced_due mode', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const sampleBanks: BankMetadata[] = [
    { id: 'bank-a', name: 'Bank A', createdAt: 1, questionCount: 3 },
    { id: 'bank-b', name: 'Bank B', createdAt: 2, questionCount: 2 },
  ];

  const qA1: Question = { id: 'qa-1', question: 'Question A1', options: ['1', '2'], answer: '1', type: 'single' };
  const qA2: Question = { id: 'qa-2', question: 'Question A2', options: ['1', '2'], answer: '1', type: 'single' };
  const qA3: Question = { id: 'qa-3', question: 'Question A3', options: ['1', '2'], answer: '1', type: 'single' };
  const qB1: Question = { id: 'qb-1', question: 'Question B1', options: ['1', '2'], answer: '1', type: 'single' };
  const qB2: Question = { id: 'qb-2', question: 'Question B2', options: ['1', '2'], answer: '1', type: 'single' };

  const bankQuestions: Record<string, Question[]> = {
    'bank-a': [qA1, qA2, qA3],
    'bank-b': [qB1, qB2],
  };

  it('(a) loads due questions across all banks and sets mode to spaced_due', async () => {
    const now = Date.now();
    const spacedRepetition: Record<string, SpacedRepetitionItem> = {
      'qa-1': { questionId: 'qa-1', repetitions: 1, interval: 1, easinessFactor: 2.5, nextReviewDate: now - 10000 },
      'qb-2': { questionId: 'qb-2', repetitions: 1, interval: 1, easinessFactor: 2.5, nextReviewDate: now - 5000 },
      'qa-2': { questionId: 'qa-2', repetitions: 2, interval: 6, easinessFactor: 2.5, nextReviewDate: now + 100000 }, // Not due
    };

    const { repo } = createMockRepo({ banks: sampleBanks, bankQuestions, spacedRepetition });
    const onViewChange = vi.fn();
    const toastWarning = vi.fn();

    const { result } = renderHook(() =>
      useQuizEngine({
        banks: sampleBanks,
        selectedQuizBankIds: ['bank-a'], // Even if only bank-a is selected on dashboard
        repository: repo,
        setMistakeLog: vi.fn(),
        onViewChange,
        loading: false,
        toast: { warning: toastWarning },
      })
    );

    await act(async () => {
      await result.current.startQuiz(undefined, 'spaced_due');
    });

    expect(onViewChange).toHaveBeenCalledWith('quiz');
    expect(result.current.quizState.mode).toBe('spaced_due');
    expect(result.current.quizState.totalQuestions).toBe(2);
    expect(result.current.quizState.activeQuestions.map(q => q.id)).toEqual(['qa-1', 'qb-2']);
  });

  it('(b) sorts due questions strictly by nextReviewDate ascending (urgency order)', async () => {
    const now = Date.now();
    // Intentionally unordered timestamps: overdue 30s, overdue 10s, overdue 60s
    const spacedRepetition: Record<string, SpacedRepetitionItem> = {
      'qa-1': { questionId: 'qa-1', repetitions: 1, interval: 1, easinessFactor: 2.5, nextReviewDate: now - 10000 }, // 10s ago
      'qa-2': { questionId: 'qa-2', repetitions: 1, interval: 1, easinessFactor: 2.5, nextReviewDate: now - 60000 }, // 60s ago (most overdue)
      'qb-1': { questionId: 'qb-1', repetitions: 1, interval: 1, easinessFactor: 2.5, nextReviewDate: now - 30000 }, // 30s ago
    };

    const { repo } = createMockRepo({ banks: sampleBanks, bankQuestions, spacedRepetition });
    const onViewChange = vi.fn();

    const { result } = renderHook(() =>
      useQuizEngine({
        banks: sampleBanks,
        selectedQuizBankIds: ['bank-a'],
        repository: repo,
        setMistakeLog: vi.fn(),
        onViewChange,
        loading: false,
        toast: { warning: vi.fn() },
      })
    );

    await act(async () => {
      await result.current.startQuiz(undefined, 'spaced_due');
    });

    // Expected order: qa-2 (60s ago) -> qb-1 (30s ago) -> qa-1 (10s ago)
    const questionIds = result.current.quizState.activeQuestions.map(q => q.id);
    expect(questionIds).toEqual(['qa-2', 'qb-1', 'qa-1']);
  });

  it('(c) Challenger Gate: 10 repeated runs preserve 100% identical urgency order without shuffle', async () => {
    const now = Date.now();
    const spacedRepetition: Record<string, SpacedRepetitionItem> = {
      'qa-1': { questionId: 'qa-1', repetitions: 1, interval: 1, easinessFactor: 2.5, nextReviewDate: now - 10000 },
      'qa-2': { questionId: 'qa-2', repetitions: 1, interval: 1, easinessFactor: 2.5, nextReviewDate: now - 50000 },
      'qa-3': { questionId: 'qa-3', repetitions: 1, interval: 1, easinessFactor: 2.5, nextReviewDate: now - 40000 },
      'qb-1': { questionId: 'qb-1', repetitions: 1, interval: 1, easinessFactor: 2.5, nextReviewDate: now - 30000 },
      'qb-2': { questionId: 'qb-2', repetitions: 1, interval: 1, easinessFactor: 2.5, nextReviewDate: now - 20000 },
    };

    const expectedOrder = ['qa-2', 'qa-3', 'qb-1', 'qb-2', 'qa-1'];

    for (let run = 0; run < 10; run++) {
      const { repo } = createMockRepo({ banks: sampleBanks, bankQuestions, spacedRepetition });
      const { result } = renderHook(() =>
        useQuizEngine({
          banks: sampleBanks,
          selectedQuizBankIds: ['bank-a'],
          repository: repo,
          setMistakeLog: vi.fn(),
          onViewChange: vi.fn(),
          loading: false,
          toast: { warning: vi.fn() },
        })
      );

      await act(async () => {
        await result.current.startQuiz(undefined, 'spaced_due');
      });

      const order = result.current.quizState.activeQuestions.map(q => q.id);
      expect(order).toEqual(expectedOrder);
    }
  });

  it('(d) shows toast warning and does not start quiz when no questions are due', async () => {
    const now = Date.now();
    // All items are in the future
    const spacedRepetition: Record<string, SpacedRepetitionItem> = {
      'qa-1': { questionId: 'qa-1', repetitions: 1, interval: 1, easinessFactor: 2.5, nextReviewDate: now + 50000 },
      'qb-1': { questionId: 'qb-1', repetitions: 1, interval: 1, easinessFactor: 2.5, nextReviewDate: now + 60000 },
    };

    const { repo } = createMockRepo({ banks: sampleBanks, bankQuestions, spacedRepetition });
    const onViewChange = vi.fn();
    const toastWarning = vi.fn();

    const { result } = renderHook(() =>
      useQuizEngine({
        banks: sampleBanks,
        selectedQuizBankIds: ['bank-a'],
        repository: repo,
        setMistakeLog: vi.fn(),
        onViewChange,
        loading: false,
        toast: { warning: toastWarning },
      })
    );

    await act(async () => {
      await result.current.startQuiz(undefined, 'spaced_due');
    });

    expect(toastWarning).toHaveBeenCalledWith('目前沒有到期的複習題目！');
    expect(onViewChange).not.toHaveBeenCalled();
    expect(result.current.quizState.activeQuestions).toHaveLength(0);
  });

  it('(e) answering a question in spaced_due mode updates SM-2 spaced repetition state', async () => {
    const now = Date.now();
    const spacedRepetition: Record<string, SpacedRepetitionItem> = {
      'qa-1': { questionId: 'qa-1', repetitions: 1, interval: 1, easinessFactor: 2.5, nextReviewDate: now - 10000 },
    };

    const { repo, saveSpacedRepetitionMock } = createMockRepo({ banks: sampleBanks, bankQuestions, spacedRepetition });

    const { result } = renderHook(() =>
      useQuizEngine({
        banks: sampleBanks,
        selectedQuizBankIds: ['bank-a'],
        repository: repo,
        setMistakeLog: vi.fn(),
        onViewChange: vi.fn(),
        loading: false,
        toast: { warning: vi.fn() },
      })
    );

    await act(async () => {
      await result.current.startQuiz(undefined, 'spaced_due');
    });

    // Answer correctly
    act(() => {
      result.current.handleAnswer(true, '1');
    });

    expect(result.current.quizState.score).toBe(1);
    expect(saveSpacedRepetitionMock).toHaveBeenCalled();
    const savedItem = saveSpacedRepetitionMock.mock.calls[0][0] as SpacedRepetitionItem;
    expect(savedItem.questionId).toBe('qa-1');
    expect(savedItem.repetitions).toBe(2);
    expect(savedItem.nextReviewDate).toBeGreaterThan(now);
  });
});
