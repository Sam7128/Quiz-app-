import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useQuizEngine } from '../../hooks/useQuizEngine';
import { IStorageRepository } from '../../services/repository';
import { BankMetadata, MistakeLog, Question } from '../../types';
import { ChunkedPracticeSession, RecentMistakeSession } from '../../types/battleTypes';

const createRepository = (questions: Question[]) => {
  const mistakeLog: MistakeLog = {};
  const saveSpacedRepetitionMock = vi.fn().mockResolvedValue(undefined);
  const logMistakeMock = vi.fn();
  const removeMistakeMock = vi.fn();

  const repo: IStorageRepository = {
    getBanks: async () => [],
    createBank: async () => ({ id: 'bank-1', name: 'B1', createdAt: 0, questionCount: 0 }),
    deleteBank: async () => {},
    updateBankFolder: async () => {},
    syncLocalToCloud: async () => ({ successIds: [], failed: [] }),
    getQuestions: async () => questions,
    saveQuestions: async () => {},
    deleteQuestionArtifacts: async () => {},
    getMistakeLog: () => mistakeLog,
    logMistake: logMistakeMock,
    removeMistake: removeMistakeMock,
    clearMistakes: () => {},
    getSpacedRepetition: async () => [],
    saveSpacedRepetitionItem: saveSpacedRepetitionMock,
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

  return { repo, saveSpacedRepetitionMock, logMistakeMock, removeMistakeMock };
};

describe('useQuizEngine Race Condition Protection (H1)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const banks: BankMetadata[] = [
    { id: 'bank-1', name: 'Bank 1', createdAt: 0, questionCount: 2 },
  ];

  const questionSet: Question[] = [
    { id: 'q-1', question: 'Q1', options: ['A', 'B'], answer: 'A', type: 'single' },
    { id: 'q-2', question: 'Q2', options: ['C', 'D'], answer: 'C', type: 'single' },
  ];

  // 場景 A：在反饋展示期間（同一題索引下）連續快速呼叫 handleAnswer，斷言第二次被靜默忽略（分數僅加 1 次，錯題僅記錄 1 次，SM-2 僅評分 1 次）
  it('Scenario A: spamming handleAnswer on the same question index executes only once', async () => {
    const { repo, saveSpacedRepetitionMock } = createRepository(questionSet);

    const { result } = renderHook(() =>
      useQuizEngine({
        banks,
        selectedQuizBankIds: ['bank-1'],
        repository: repo,
        setMistakeLog: vi.fn(),
        onViewChange: vi.fn(),
        loading: false,
        toast: { warning: vi.fn() },
      })
    );

    await act(async () => {
      await result.current.startQuiz(2, 'retry_session', ['q-1', 'q-2'], ['bank-1']);
    });

    expect(result.current.quizState.currentQuestionIndex).toBe(0);

    // 連續快速呼叫 5 次 handleAnswer（模擬連按 Enter）
    act(() => {
      result.current.handleAnswer(true, 'A');
      result.current.handleAnswer(true, 'A');
      result.current.handleAnswer(true, 'A');
      result.current.handleAnswer(false, 'B');
      result.current.handleAnswer(true, 'A');
    });

    // 斷言分數僅加 1 次
    expect(result.current.quizState.score).toBe(1);
    // 斷言錯題沒有被寫入（因為第一次為 true）
    expect(result.current.quizState.wrongQuestionIds).toHaveLength(0);
    // 斷言 SM-2 僅評分 1 次
    expect(saveSpacedRepetitionMock).toHaveBeenCalledTimes(1);
  });

  // 場景 B：調用 nextQuestion 切換到下一題後，下一題的 handleAnswer 可正常觸發
  it('Scenario B: calling nextQuestion unlocks handleAnswer for the subsequent question', async () => {
    const { repo, saveSpacedRepetitionMock } = createRepository(questionSet);

    const { result } = renderHook(() =>
      useQuizEngine({
        banks,
        selectedQuizBankIds: ['bank-1'],
        repository: repo,
        setMistakeLog: vi.fn(),
        onViewChange: vi.fn(),
        loading: false,
        toast: { warning: vi.fn() },
      })
    );

    await act(async () => {
      await result.current.startQuiz(2, 'retry_session', ['q-1', 'q-2'], ['bank-1']);
    });

    // 第 0 題作答
    act(() => {
      result.current.handleAnswer(true, 'A');
    });
    expect(result.current.quizState.score).toBe(1);
    expect(saveSpacedRepetitionMock).toHaveBeenCalledTimes(1);

    // 切換至第 1 題
    act(() => {
      result.current.nextQuestion();
    });
    expect(result.current.quizState.currentQuestionIndex).toBe(1);

    // 第 1 題作答（應正常執行）
    act(() => {
      result.current.handleAnswer(true, 'C');
      // 再次連按，應被阻斷
      result.current.handleAnswer(true, 'C');
    });
    expect(result.current.quizState.score).toBe(2);
    expect(saveSpacedRepetitionMock).toHaveBeenCalledTimes(2);
  });

  // 場景 C：答完第 0 題鎖上後呼叫 handleExitQuiz，隨後以 restoreSession 恢復在第 0 題
  it('Scenario C: restoreSession and handleExitQuiz reset lock refs so answering at currentIndex 0 succeeds', async () => {
    const { repo, saveSpacedRepetitionMock } = createRepository(questionSet);

    const { result } = renderHook(() =>
      useQuizEngine({
        banks,
        selectedQuizBankIds: ['bank-1'],
        repository: repo,
        setMistakeLog: vi.fn(),
        onViewChange: vi.fn(),
        loading: false,
        toast: { warning: vi.fn() },
      })
    );

    await act(async () => {
      await result.current.startQuiz(2, 'retry_session', ['q-1', 'q-2'], ['bank-1']);
    });

    // 第 0 題作答並鎖定
    act(() => {
      result.current.handleAnswer(true, 'A');
    });
    expect(result.current.quizState.score).toBe(1);

    // 退出測驗（重置鎖 Ref）
    await act(async () => {
      await result.current.handleExitQuiz();
    });

    // 恢復 session 至第 0 題
    await act(async () => {
      await result.current.restoreSession({
        currentIndex: 0,
        score: 0,
        questionIds: ['q-1', 'q-2'],
        bankIds: ['bank-1'],
        wrongQuestionIds: [],
        savedAt: Date.now(),
      });
    });

    expect(result.current.quizState.currentQuestionIndex).toBe(0);

    // 斷言恢復後對第 0 題呼叫 handleAnswer 可正常處理，不被靜默吞掉
    act(() => {
      result.current.handleAnswer(true, 'A');
    });
    expect(result.current.quizState.score).toBe(1);
    // SM-2 再次被評分
    expect(saveSpacedRepetitionMock).toHaveBeenCalledTimes(2);
  });

  // 場景 D：activeQuestions 暫時為空時調用 handleAnswer 不會產生死鎖
  it('Scenario D: handleAnswer when activeQuestions is empty does not permanently lock the engine', async () => {
    const { repo, saveSpacedRepetitionMock } = createRepository(questionSet);

    const { result } = renderHook(() =>
      useQuizEngine({
        banks,
        selectedQuizBankIds: ['bank-1'],
        repository: repo,
        setMistakeLog: vi.fn(),
        onViewChange: vi.fn(),
        loading: false,
        toast: { warning: vi.fn() },
      })
    );

    // activeQuestions 預設為空陣列，調用 handleAnswer
    act(() => {
      result.current.handleAnswer(true, 'A');
    });

    expect(result.current.quizState.score).toBe(0);
    expect(saveSpacedRepetitionMock).not.toHaveBeenCalled();

    // 隨後啟動正常測驗
    await act(async () => {
      await result.current.startQuiz(2, 'retry_session', ['q-1', 'q-2'], ['bank-1']);
    });

    expect(result.current.quizState.currentQuestionIndex).toBe(0);

    // 答第 0 題，驗證鎖未卡死
    act(() => {
      result.current.handleAnswer(true, 'A');
    });

    expect(result.current.quizState.score).toBe(1);
    expect(saveSpacedRepetitionMock).toHaveBeenCalledTimes(1);
  });
});
