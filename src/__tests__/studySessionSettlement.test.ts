import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useQuizEngine } from '../../hooks/useQuizEngine';
import { IStorageRepository } from '../../services/repository';
import { Question } from '../../types';

const mockQuestions: Question[] = [
  { id: 'q-1', question: 'Question 1', options: ['A', 'B', 'C', 'D'], answer: 'A' },
  { id: 'q-2', question: 'Question 2', options: ['A', 'B', 'C', 'D'], answer: 'B' },
  { id: 'q-3', question: 'Question 3', options: ['A', 'B', 'C', 'D'], answer: 'C' },
];

const createMockRepo = () => {
  const recordStudySessionMock = vi.fn().mockResolvedValue(undefined);

  const repo: IStorageRepository = {
    getBanks: async () => [{ id: 'bank-1', name: 'Bank 1', createdAt: 0, questionCount: 3 }],
    createBank: async () => ({ id: 'bank-1', name: 'B1', createdAt: 0, questionCount: 0 }),
    deleteBank: async () => {},
    updateBankFolder: async () => {},
    syncLocalToCloud: async () => ({ successIds: [], failed: [] }),
    getQuestions: async () => mockQuestions,
    saveQuestions: async () => {},
    deleteQuestionArtifacts: async () => {},
    getMistakeLog: () => ({}),
    logMistake: vi.fn(),
    removeMistake: vi.fn(),
    clearMistakes: () => {},
    getSpacedRepetition: async () => ({}),
    saveSpacedRepetitionItem: async () => {},
    getSpacedRepetitionItem: () => null,
    clearSpacedRepetition: () => {},
    recordStudySession: recordStudySessionMock,
    getStudyStats: async () => ({ studyDays: 0, totalQuestions: 0, totalCorrect: 0, accuracyRate: 0, totalDurationSeconds: 0 }),
    getDailyStats: async () => [],
    getAchievements: async () => [],
    unlockAchievement: async () => {},
    getStreak: async () => ({ currentStreak: 0, longestStreak: 0, lastStudyDate: null }),
    updateStreak: async () => {},
    getRecentMistakeSessions: () => [],
    addRecentMistakeSession: vi.fn(),
    clearRecentMistakeSession: () => {},
    clearAllRecentMistakes: () => {},
    getPracticeSessions: async () => [],
    savePracticeSession: async () => {},
    deletePracticeSession: async () => {},
    abandonPracticeSession: async () => {},
  };

  return { repo, recordStudySessionMock };
};

describe('Study Session Settlement & Idempotency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    localStorage.clear();
  });

  it('handleExitQuiz: mid-quiz exit settles answered questions and duration', async () => {
    const { repo, recordStudySessionMock } = createMockRepo();
    const trackQuizCompletionMock = vi.fn().mockResolvedValue(undefined);
    const onViewChangeMock = vi.fn();

    const { result } = renderHook(() =>
      useQuizEngine({
        banks: [{ id: 'bank-1', name: 'Bank 1', createdAt: 0, questionCount: 3 }],
        selectedQuizBankIds: ['bank-1'],
        repository: repo,
        setMistakeLog: vi.fn(),
        onViewChange: onViewChangeMock,
        loading: false,
        toast: { warning: vi.fn() },
        trackQuizCompletion: trackQuizCompletionMock,
      })
    );

    await act(async () => {
      await result.current.startQuiz(3, 'random');
    });

    // Answer first question correctly
    act(() => {
      result.current.handleAnswer(true, 'A');
    });

    // Exit quiz in the middle
    await act(async () => {
      await result.current.handleExitQuiz();
    });

    expect(recordStudySessionMock).toHaveBeenCalledTimes(1);
    expect(recordStudySessionMock).toHaveBeenCalledWith(
      1, // answeredCount (1 correct)
      1, // correctCount
      expect.any(Number), // durationSeconds
      'quiz'
    );
    expect(trackQuizCompletionMock).toHaveBeenCalledTimes(1);
    expect(trackQuizCompletionMock).toHaveBeenCalledWith({ score: 1, totalQuestions: 1 });
    expect(onViewChangeMock).toHaveBeenCalledWith('dashboard');
  });

  it('settleCurrentSession: settles onRetry and onRestart paths', async () => {
    const { repo, recordStudySessionMock } = createMockRepo();
    const trackQuizCompletionMock = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useQuizEngine({
        banks: [{ id: 'bank-1', name: 'Bank 1', createdAt: 0, questionCount: 3 }],
        selectedQuizBankIds: ['bank-1'],
        repository: repo,
        setMistakeLog: vi.fn(),
        onViewChange: vi.fn(),
        loading: false,
        toast: { warning: vi.fn() },
        trackQuizCompletion: trackQuizCompletionMock,
      })
    );

    // 1. Start quiz and complete all questions
    await act(async () => {
      await result.current.startQuiz(2, 'random');
    });

    act(() => {
      result.current.handleAnswer(true, 'A');
      result.current.nextQuestion();
    });
    act(() => {
      result.current.handleAnswer(false, 'wrong');
      result.current.nextQuestion();
    });

    expect(result.current.quizState.isFinished).toBe(true);

    // Call settleCurrentSession('retry')
    await act(async () => {
      await result.current.settleCurrentSession('retry');
    });

    expect(recordStudySessionMock).toHaveBeenCalledTimes(1);
    expect(recordStudySessionMock).toHaveBeenCalledWith(
      2, // totalQuestions
      1, // score
      expect.any(Number),
      'quiz'
    );

    // 2. Start new retry session and test onRestart path
    recordStudySessionMock.mockClear();
    await act(async () => {
      await result.current.startQuiz(1, 'retry_session', ['q-2'], ['bank-1']);
    });

    act(() => {
      result.current.handleAnswer(true, 'B');
      result.current.nextQuestion();
    });

    expect(result.current.quizState.isFinished).toBe(true);

    await act(async () => {
      await result.current.settleCurrentSession('restart');
    });

    expect(recordStudySessionMock).toHaveBeenCalledTimes(1);
    expect(recordStudySessionMock).toHaveBeenCalledWith(
      1,
      1,
      expect.any(Number),
      'quiz'
    );
  });

  it('rapid click idempotency: multiple calls within same tick only invoke recordStudySession once', async () => {
    const { repo, recordStudySessionMock } = createMockRepo();

    const { result } = renderHook(() =>
      useQuizEngine({
        banks: [{ id: 'bank-1', name: 'Bank 1', createdAt: 0, questionCount: 3 }],
        selectedQuizBankIds: ['bank-1'],
        repository: repo,
        setMistakeLog: vi.fn(),
        onViewChange: vi.fn(),
        loading: false,
        toast: { warning: vi.fn() },
      })
    );

    await act(async () => {
      await result.current.startQuiz(3, 'random');
    });

    act(() => {
      result.current.handleAnswer(true, 'A');
      result.current.nextQuestion();
    });

    // Rapidly trigger settleCurrentSession concurrently
    await act(async () => {
      await Promise.all([
        result.current.settleCurrentSession('home'),
        result.current.settleCurrentSession('home'),
        result.current.settleCurrentSession('home'),
      ]);
    });

    expect(recordStudySessionMock).toHaveBeenCalledTimes(1);
  });

  it('duration lower bound: ensures durationSeconds is at least 1', async () => {
    const { repo, recordStudySessionMock } = createMockRepo();

    const { result } = renderHook(() =>
      useQuizEngine({
        banks: [{ id: 'bank-1', name: 'Bank 1', createdAt: 0, questionCount: 3 }],
        selectedQuizBankIds: ['bank-1'],
        repository: repo,
        setMistakeLog: vi.fn(),
        onViewChange: vi.fn(),
        loading: false,
        toast: { warning: vi.fn() },
      })
    );

    await act(async () => {
      await result.current.startQuiz(3, 'random');
    });

    act(() => {
      result.current.handleAnswer(true, 'A');
    });

    // Settle immediately (0ms elapsed)
    await act(async () => {
      await result.current.settleCurrentSession('immediate');
    });

    expect(recordStudySessionMock).toHaveBeenCalledTimes(1);
    const durationArg = recordStudySessionMock.mock.calls[0][2];
    expect(durationArg).toBeGreaterThanOrEqual(1);
  });

  it('quiz 0-question < 5s touch filter: skips recording without throwing error', async () => {
    const { repo, recordStudySessionMock } = createMockRepo();

    const { result } = renderHook(() =>
      useQuizEngine({
        banks: [{ id: 'bank-1', name: 'Bank 1', createdAt: 0, questionCount: 3 }],
        selectedQuizBankIds: ['bank-1'],
        repository: repo,
        setMistakeLog: vi.fn(),
        onViewChange: vi.fn(),
        loading: false,
        toast: { warning: vi.fn() },
      })
    );

    await act(async () => {
      await result.current.startQuiz(3, 'random');
    });

    // Exit immediately without answering any questions (0 questions answered, < 5s duration)
    await act(async () => {
      await result.current.handleExitQuiz();
    });

    // Should NOT record because 0 questions answered and < 5s
    expect(recordStudySessionMock).not.toHaveBeenCalled();
  });

  it('storage exception isolation: navigation and completion proceed even when storage throws', async () => {
    const { repo, recordStudySessionMock } = createMockRepo();
    recordStudySessionMock.mockRejectedValue(new Error('QuotaExceededError: LocalStorage is full'));

    const onViewChangeMock = vi.fn();

    const { result } = renderHook(() =>
      useQuizEngine({
        banks: [{ id: 'bank-1', name: 'Bank 1', createdAt: 0, questionCount: 3 }],
        selectedQuizBankIds: ['bank-1'],
        repository: repo,
        setMistakeLog: vi.fn(),
        onViewChange: onViewChangeMock,
        loading: false,
        toast: { warning: vi.fn() },
      })
    );

    await act(async () => {
      await result.current.startQuiz(3, 'random');
    });

    act(() => {
      result.current.handleAnswer(true, 'A');
    });

    // Settle should not crash despite storage rejection
    await act(async () => {
      await expect(result.current.settleCurrentSession('home')).resolves.not.toThrow();
    });

    // handleExitQuiz proceeds to navigate to dashboard
    await act(async () => {
      await result.current.handleExitQuiz();
    });

    expect(onViewChangeMock).toHaveBeenCalledWith('dashboard');
  });

  it('storage exception allows subsequent retry to succeed (preserves retry capability)', async () => {
    const { repo, recordStudySessionMock } = createMockRepo();
    // 首次調用拋出異常
    recordStudySessionMock.mockRejectedValueOnce(new Error('QuotaExceededError'));

    const { result } = renderHook(() =>
      useQuizEngine({
        banks: [{ id: 'bank-1', name: 'Bank 1', createdAt: 0, questionCount: 3 }],
        selectedQuizBankIds: ['bank-1'],
        repository: repo,
        setMistakeLog: vi.fn(),
        onViewChange: vi.fn(),
        loading: false,
        toast: { warning: vi.fn() },
      })
    );

    await act(async () => {
      await result.current.startQuiz(3, 'random');
    });

    act(() => {
      result.current.handleAnswer(true, 'A');
    });

    // 第一次呼叫：失敗，但被容錯捕獲且不鎖定 isSettledRef
    await act(async () => {
      await result.current.settleCurrentSession('first_attempt');
    });
    expect(recordStudySessionMock).toHaveBeenCalledTimes(1);

    // 第二次重試呼叫：此時 mockResolvedValue 成功
    await act(async () => {
      await result.current.settleCurrentSession('retry_attempt');
    });

    // 驗證 retry 成功被執行，總調用次數為 2 且最終成功持久化
    expect(recordStudySessionMock).toHaveBeenCalledTimes(2);
    expect(recordStudySessionMock).toHaveBeenLastCalledWith(
      1,
      1,
      expect.any(Number),
      'quiz'
    );
  });

  it('handleExitQuiz: 首次儲存失敗時保留 sessionStartTime，第二次呼叫 handleExitQuiz 重試成功並清空 sessionStartTime', async () => {
    const { repo, recordStudySessionMock } = createMockRepo();
    recordStudySessionMock.mockRejectedValueOnce(new Error('QuotaExceededError'));

    const toastWarningMock = vi.fn();
    const onViewChangeMock = vi.fn();

    const { result } = renderHook(() =>
      useQuizEngine({
        banks: [{ id: 'bank-1', name: 'Bank 1', createdAt: 0, questionCount: 3 }],
        selectedQuizBankIds: ['bank-1'],
        repository: repo,
        setMistakeLog: vi.fn(),
        onViewChange: onViewChangeMock,
        loading: false,
        toast: { warning: toastWarningMock },
      })
    );

    await act(async () => {
      await result.current.startQuiz(3, 'random');
    });

    act(() => {
      result.current.handleAnswer(true, 'A');
    });

    const initialStartTime = result.current.sessionStartTime;
    expect(initialStartTime).not.toBeNull();

    // 第一次呼叫 handleExitQuiz：儲存失敗
    let firstExitResult: boolean | undefined;
    await act(async () => {
      firstExitResult = await result.current.handleExitQuiz();
    });

    expect(firstExitResult).toBe(false);
    expect(recordStudySessionMock).toHaveBeenCalledTimes(1);
    expect(toastWarningMock).toHaveBeenCalledWith('學習統計儲存失敗，請檢查儲存空間或稍後重試');
    // 關鍵驗證：首次失敗時保留 sessionStartTime
    expect(result.current.sessionStartTime).toBe(initialStartTime);
    expect(onViewChangeMock).toHaveBeenCalledWith('dashboard');

    // 第二次呼叫 handleExitQuiz：重試成功
    let secondExitResult: boolean | undefined;
    await act(async () => {
      secondExitResult = await result.current.handleExitQuiz();
    });

    expect(secondExitResult).toBe(true);
    expect(recordStudySessionMock).toHaveBeenCalledTimes(2);
    // 關鍵驗證：重試成功後清空 sessionStartTime
    expect(result.current.sessionStartTime).toBeNull();
  });

  it('Header 導航離開：測驗中途透過 handleHeaderNavigate 切換視圖時觸發 handleExitQuiz 結算', async () => {
    const { repo, recordStudySessionMock } = createMockRepo();
    const onViewChangeMock = vi.fn();

    const { result } = renderHook(() =>
      useQuizEngine({
        banks: [{ id: 'bank-1', name: 'Bank 1', createdAt: 0, questionCount: 3 }],
        selectedQuizBankIds: ['bank-1'],
        repository: repo,
        setMistakeLog: vi.fn(),
        onViewChange: onViewChangeMock,
        loading: false,
        toast: { warning: vi.fn() },
      })
    );

    await act(async () => {
      await result.current.startQuiz(3, 'random');
    });

    act(() => {
      result.current.handleAnswer(true, 'A');
    });

    // 模擬 AppContent 中的 handleHeaderNavigate 行為
    let currentView = 'quiz';
    const handleHeaderNavigate = async (nextView: 'dashboard' | 'manager' | 'quiz' | 'mistakes') => {
      if (currentView === 'quiz' || currentView === 'mistakes') {
        await result.current.handleExitQuiz();
      }
      onViewChangeMock(nextView);
      currentView = nextView;
    };

    await act(async () => {
      await handleHeaderNavigate('manager');
    });

    expect(recordStudySessionMock).toHaveBeenCalledTimes(1);
    expect(recordStudySessionMock).toHaveBeenCalledWith(
      1,
      1,
      expect.any(Number),
      'quiz'
    );
    expect(onViewChangeMock).toHaveBeenLastCalledWith('manager');
  });
});
