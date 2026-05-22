import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useQuizEngine } from '../../hooks/useQuizEngine';
import { IStorageRepository } from '../../services/repository';
import { BankMetadata, MistakeLog, Question } from '../../types';
import { ChunkMeta, ChunkedPracticeSession, RecentMistakeSession } from '../../types/battleTypes';

const createRepository = (questions: Question[]): IStorageRepository => {
  const mistakeLog: MistakeLog = {};
  return {
    getBanks: async () => [],
    createBank: async () => ({ id: 'bank-1', name: 'B1', createdAt: 0, questionCount: 0 }),
    deleteBank: async () => {},
    updateBankFolder: async () => {},
    syncLocalToCloud: async () => ({ successIds: [], failed: [] }),
    getQuestions: async () => questions,
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
    getPracticeSessions: async (): Promise<ChunkedPracticeSession[]> => [],
    savePracticeSession: async () => {},
    deletePracticeSession: async () => {},
    abandonPracticeSession: async () => {},
  };
};

describe('useQuizEngine chunked mode', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const banks: BankMetadata[] = [
    { id: 'bank-1', name: 'Bank 1', createdAt: 0, questionCount: 3 },
  ];

  const questionSet: Question[] = [
    { id: 'q-1', question: 'Q1', options: ['A', 'B'], answer: 'A', type: 'single' },
    { id: 'q-2', question: 'Q2', options: ['C', 'D'], answer: 'C', type: 'single' },
    { id: 'q-3', question: 'Q3', options: ['E', 'F'], answer: 'E', type: 'single' },
  ];

  it('loads chunk subset in provided order and skips quiz session persistence', async () => {
    const repository = createRepository(questionSet);
    const onViewChange = vi.fn();
    const onChunkComplete = vi.fn();
    const onChunkDraftUpdate = vi.fn();
    const chunkMeta: ChunkMeta = { chunkIndex: 1, totalChunks: 3, sessionId: 'session-1' };

    const { result } = renderHook(() =>
      useQuizEngine({
        banks,
        selectedQuizBankIds: ['bank-1'],
        repository,
        setMistakeLog: vi.fn(),
        onViewChange,
        loading: false,
        toast: { warning: vi.fn() },
        onChunkComplete,
        onChunkDraftUpdate,
      })
    );

    await act(async () => {
      await result.current.startQuiz(2, 'chunked', ['q-3', 'q-1'], ['bank-1'], chunkMeta);
    });

    expect(result.current.quizState.mode).toBe('chunked');
    expect(result.current.quizState.activeQuestions.map((question) => String(question.id))).toEqual(['q-3', 'q-1']);
    expect(localStorage.getItem('mindspark_quiz_session')).toBeNull();
    expect(onViewChange).toHaveBeenCalledWith('quiz');
    expect(onChunkDraftUpdate).toHaveBeenCalled();
  });

  it('triggers onChunkComplete once when chunk quiz finishes', async () => {
    const repository = createRepository(questionSet);
    const onChunkComplete = vi.fn();
    const chunkMeta: ChunkMeta = { chunkIndex: 0, totalChunks: 2, sessionId: 'session-2' };

    const { result } = renderHook(() =>
      useQuizEngine({
        banks,
        selectedQuizBankIds: ['bank-1'],
        repository,
        setMistakeLog: vi.fn(),
        onViewChange: vi.fn(),
        loading: false,
        toast: { warning: vi.fn() },
        onChunkComplete,
      })
    );

    await act(async () => {
      await result.current.startQuiz(2, 'chunked', ['q-1', 'q-2'], ['bank-1'], chunkMeta);
    });

    act(() => {
      result.current.handleAnswer(true, 'A');
      result.current.nextQuestion();
    });
    act(() => {
      result.current.handleAnswer(true, 'C');
      result.current.nextQuestion();
    });

    expect(result.current.quizState.isFinished).toBe(true);
    expect(onChunkComplete).toHaveBeenCalledTimes(1);
    expect(onChunkComplete).toHaveBeenCalledWith({
      chunkMeta,
      score: 2,
      wrongQuestionIds: [],
    });
  });

  it('throws when chunked mode starts without chunkMeta', async () => {
    const repository = createRepository(questionSet);
    const { result } = renderHook(() =>
      useQuizEngine({
        banks,
        selectedQuizBankIds: ['bank-1'],
        repository,
        setMistakeLog: vi.fn(),
        onViewChange: vi.fn(),
        loading: false,
        toast: { warning: vi.fn() },
      })
    );

    await expect(
      result.current.startQuiz(2, 'chunked', ['q-1', 'q-2'], ['bank-1'])
    ).rejects.toThrow('chunked 模式必須提供 chunkMeta');
  });
});
