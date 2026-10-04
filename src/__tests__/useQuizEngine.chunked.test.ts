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

    await act(async () => {
      result.current.handleAnswer(true, 'A');
      result.current.nextQuestion();
    });
    await act(async () => {
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

  it('Chunk 答完時自動觸發 recordStudySession 記錄該 chunk 題數與時間', async () => {
    const repository = createRepository(questionSet);
    const recordStudySessionMock = vi.fn().mockResolvedValue(undefined);
    repository.recordStudySession = recordStudySessionMock;

    const onChunkComplete = vi.fn().mockResolvedValue(undefined);
    const chunkMeta: ChunkMeta = { chunkIndex: 0, totalChunks: 2, sessionId: 'session-c02-1' };

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

    await act(async () => {
      result.current.handleAnswer(true, 'A');
      result.current.nextQuestion();
    });
    await act(async () => {
      result.current.handleAnswer(false, 'wrong');
      result.current.nextQuestion();
    });

    expect(result.current.quizState.isFinished).toBe(true);
    expect(recordStudySessionMock).toHaveBeenCalledTimes(1);
    expect(recordStudySessionMock).toHaveBeenCalledWith(
      2,
      1,
      expect.any(Number),
      'quiz'
    );
    expect(onChunkComplete).toHaveBeenCalledTimes(1);
  });

  it('點擊繼續下一 chunk 時前 chunk 已結算，新 chunk 重新計時且結算獨立不重複', async () => {
    const repository = createRepository(questionSet);
    const recordStudySessionMock = vi.fn().mockResolvedValue(undefined);
    repository.recordStudySession = recordStudySessionMock;

    const onChunkComplete = vi.fn().mockResolvedValue(undefined);
    const chunk1Meta: ChunkMeta = { chunkIndex: 0, totalChunks: 2, sessionId: 'session-c02-2' };
    const chunk2Meta: ChunkMeta = { chunkIndex: 1, totalChunks: 2, sessionId: 'session-c02-2' };

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

    // 完成 Chunk 1 (2題)
    await act(async () => {
      await result.current.startQuiz(2, 'chunked', ['q-1', 'q-2'], ['bank-1'], chunk1Meta);
    });

    await act(async () => {
      result.current.handleAnswer(true, 'A');
      result.current.nextQuestion();
    });
    await act(async () => {
      result.current.handleAnswer(true, 'C');
      result.current.nextQuestion();
    });

    expect(recordStudySessionMock).toHaveBeenCalledTimes(1);
    expect(recordStudySessionMock).toHaveBeenLastCalledWith(2, 2, expect.any(Number), 'quiz');

    // 啟動 Chunk 2 (1題)
    await act(async () => {
      await result.current.startQuiz(1, 'chunked', ['q-3'], ['bank-1'], chunk2Meta);
    });

    // Chunk 2 尚未完成時不應多調用
    expect(recordStudySessionMock).toHaveBeenCalledTimes(1);

    // 完成 Chunk 2
    await act(async () => {
      result.current.handleAnswer(true, 'E');
      result.current.nextQuestion();
    });

    expect(recordStudySessionMock).toHaveBeenCalledTimes(2);
    expect(recordStudySessionMock).toHaveBeenLastCalledWith(1, 1, expect.any(Number), 'quiz');
  });

  it('完成最後一個 chunk 時仍正確寫入學習統計', async () => {
    const repository = createRepository(questionSet);
    const recordStudySessionMock = vi.fn().mockResolvedValue(undefined);
    repository.recordStudySession = recordStudySessionMock;

    const onChunkComplete = vi.fn().mockResolvedValue(undefined);
    const lastChunkMeta: ChunkMeta = { chunkIndex: 2, totalChunks: 3, sessionId: 'session-c02-last' };

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
      await result.current.startQuiz(1, 'chunked', ['q-3'], ['bank-1'], lastChunkMeta);
    });

    await act(async () => {
      result.current.handleAnswer(true, 'E');
      result.current.nextQuestion();
    });

    expect(result.current.quizState.isFinished).toBe(true);
    expect(recordStudySessionMock).toHaveBeenCalledTimes(1);
    expect(recordStudySessionMock).toHaveBeenCalledWith(
      1,
      1,
      expect.any(Number),
      'quiz'
    );
    expect(onChunkComplete).toHaveBeenCalledWith({
      chunkMeta: lastChunkMeta,
      score: 1,
      wrongQuestionIds: [],
    });
  });

  it('Chunk 完成結算失敗時阻斷 onChunkComplete，直到結算成功始能推進', async () => {
    const repository = createRepository(questionSet);
    const recordStudySessionMock = vi.fn().mockRejectedValueOnce(new Error('Storage failure'));
    repository.recordStudySession = recordStudySessionMock;

    const onChunkComplete = vi.fn().mockResolvedValue(undefined);
    const toastWarningMock = vi.fn();
    const chunkMeta: ChunkMeta = { chunkIndex: 0, totalChunks: 2, sessionId: 'session-c02-block' };

    const { result, rerender } = renderHook(() =>
      useQuizEngine({
        banks,
        selectedQuizBankIds: ['bank-1'],
        repository,
        setMistakeLog: vi.fn(),
        onViewChange: vi.fn(),
        loading: false,
        toast: { warning: toastWarningMock },
        onChunkComplete,
      })
    );

    await act(async () => {
      await result.current.startQuiz(1, 'chunked', ['q-1'], ['bank-1'], chunkMeta);
    });

    await act(async () => {
      result.current.handleAnswer(true, 'A');
      result.current.nextQuestion();
    });

    expect(result.current.quizState.isFinished).toBe(true);
    // 第一次持久化失敗：阻斷 onChunkComplete，不觸發進度推進
    expect(recordStudySessionMock).toHaveBeenCalledTimes(1);
    expect(toastWarningMock).toHaveBeenCalledWith('分階段學習統計儲存失敗，請重試結算');
    expect(onChunkComplete).not.toHaveBeenCalled();

    // 儲存修復，重試結算
    recordStudySessionMock.mockResolvedValueOnce(undefined);

    // 觸發重新渲染以讓重設為 null 的 lastChunkCompletionRef 重新執行結算
    await act(async () => {
      rerender();
    });

    // 結算成功後，onChunkComplete 始能推進
    expect(recordStudySessionMock).toHaveBeenCalledTimes(2);
    expect(onChunkComplete).toHaveBeenCalledTimes(1);
    expect(onChunkComplete).toHaveBeenCalledWith({
      chunkMeta,
      score: 1,
      wrongQuestionIds: [],
    });
  });
});
