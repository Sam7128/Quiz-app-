import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useQuizEngine } from '../../hooks/useQuizEngine';
import { IStorageRepository } from '../../services/repository';
import { MistakeLog, Question, SpacedRepetitionItem } from '../../types';

const mockQuestions: Question[] = [
  {
    id: 'q-1',
    question: 'Q1',
    options: ['A', 'B', 'C'],
    answer: 'A',
  },
  {
    id: 'q-2',
    question: 'Q2',
    options: ['X', 'Y', 'Z'],
    answer: 'Y',
  },
  {
    id: 'q-multi',
    question: 'Q3 Multi',
    options: ['Opt1', 'Opt2', 'Opt3'],
    answer: ['Opt1', 'Opt2'],
    type: 'multiple',
  },
];

const createMockRepo = () => {
  const mistakeLog: MistakeLog = {};
  const spacedRepetition: Record<string, SpacedRepetitionItem> = {};

  const repo: IStorageRepository = {
    getBanks: async () => [{ id: 'bank-1', name: 'Bank 1', createdAt: 0, questionCount: 3 }],
    createBank: async () => ({ id: 'bank-1', name: 'B1', createdAt: 0, questionCount: 0 }),
    deleteBank: async () => {},
    updateBankFolder: async () => {},
    syncLocalToCloud: async () => ({ successIds: [], failed: [] }),
    getQuestions: async () => mockQuestions,
    saveQuestions: async () => {},
    deleteQuestionArtifacts: async () => {},
    getMistakeLog: () => mistakeLog,
    logMistake: vi.fn(),
    removeMistake: vi.fn(),
    clearMistakes: () => {},
    getSpacedRepetition: async () => spacedRepetition,
    saveSpacedRepetitionItem: async () => {},
    getSpacedRepetitionItem: (id: string) => spacedRepetition[id] ?? null,
    clearSpacedRepetition: () => {},
    recordStudySession: async () => {},
    getStudyStats: async () => ({ studyDays: 0, totalQuestions: 0, totalCorrect: 0, accuracyRate: 0, totalDurationSeconds: 0 }),
    getDailyStats: async () => [],
    getAchievements: async () => [],
    unlockAchievement: async () => {},
    getStreak: async () => ({ currentStreak: 0, longestStreak: 0, lastStudyDate: null }),
    updateStreak: async () => {},
    getRecentMistakeSessions: () => [],
    addRecentMistakeSession: () => {},
    clearRecentMistakeSession: () => {},
    clearAllRecentMistakes: () => {},
    getPracticeSessions: async () => [],
    savePracticeSession: async () => {},
    deletePracticeSession: async () => {},
    abandonPracticeSession: async () => {},
  };

  return repo;
};

describe('useQuizEngine - userAnswerMap State Tracking', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('初始狀態 userAnswerMap 為空物件', () => {
    const repository = createMockRepo();
    const { result } = renderHook(() =>
      useQuizEngine({
        banks: [{ id: 'bank-1', name: 'Bank 1', createdAt: 0, questionCount: 3 }],
        selectedQuizBankIds: ['bank-1'],
        repository,
        setMistakeLog: vi.fn(),
        onViewChange: vi.fn(),
        loading: false,
        toast: { warning: vi.fn() },
      })
    );

    expect(result.current.quizState.userAnswerMap).toEqual({});
  });

  it('作答單選與多選題時，同步將使用者選擇記錄於 userAnswerMap', async () => {
    const repository = createMockRepo();
    const { result } = renderHook(() =>
      useQuizEngine({
        banks: [{ id: 'bank-1', name: 'Bank 1', createdAt: 0, questionCount: 3 }],
        selectedQuizBankIds: ['bank-1'],
        repository,
        setMistakeLog: vi.fn(),
        onViewChange: vi.fn(),
        loading: false,
        toast: { warning: vi.fn() },
      })
    );

    // 開始測驗
    await act(async () => {
      await result.current.startQuiz(3, 'random');
    });

    expect(result.current.quizState.userAnswerMap).toEqual({});

    // 第 1 題作答
    const q1 = result.current.quizState.activeQuestions[0];
    act(() => {
      result.current.handleAnswer(true, 'A');
    });

    expect(result.current.quizState.userAnswerMap).toEqual({
      [String(q1.id)]: 'A',
    });

    // 切到第 2 題
    act(() => {
      result.current.nextQuestion();
    });

    // 第 2 題作答 (選錯)
    const q2 = result.current.quizState.activeQuestions[1];
    act(() => {
      result.current.handleAnswer(false, 'Z');
    });

    expect(result.current.quizState.userAnswerMap).toEqual({
      [String(q1.id)]: 'A',
      [String(q2.id)]: 'Z',
    });

    // 切到第 3 題 (多選)
    act(() => {
      result.current.nextQuestion();
    });

    const q3 = result.current.quizState.activeQuestions[2];
    act(() => {
      result.current.handleAnswer(true, ['Opt1', 'Opt2']);
    });

    expect(result.current.quizState.userAnswerMap).toEqual({
      [String(q1.id)]: 'A',
      [String(q2.id)]: 'Z',
      [String(q3.id)]: ['Opt1', 'Opt2'],
    });
  });

  it('重新啟動測驗 (startQuiz) 或錯題練習時重置 userAnswerMap 為空物件', async () => {
    const repository = createMockRepo();
    const { result } = renderHook(() =>
      useQuizEngine({
        banks: [{ id: 'bank-1', name: 'Bank 1', createdAt: 0, questionCount: 3 }],
        selectedQuizBankIds: ['bank-1'],
        repository,
        setMistakeLog: vi.fn(),
        onViewChange: vi.fn(),
        loading: false,
        toast: { warning: vi.fn() },
      })
    );

    await act(async () => {
      await result.current.startQuiz(1, 'random');
    });

    act(() => {
      result.current.handleAnswer(false, 'B');
    });

    expect(Object.keys(result.current.quizState.userAnswerMap ?? {}).length).toBe(1);

    // 重新開始測驗
    await act(async () => {
      await result.current.startQuiz(1, 'random');
    });

    expect(result.current.quizState.userAnswerMap).toEqual({});
  });
});
