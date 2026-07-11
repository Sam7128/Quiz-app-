import { useCallback, useRef, useState } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useChunkedPractice } from '../../hooks/useChunkedPractice';
import { useQuizEngine } from '../../hooks/useQuizEngine';
import { IStorageRepository } from '../../services/repository';
import { AppView, BankMetadata, MistakeLog, Question } from '../../types';
import { ChunkDraftState, ChunkMeta, ChunkedPracticeSession, RecentMistakeSession } from '../../types/battleTypes';
import { getChunkDraft, saveChunkDraft } from '../../services/storage';

const createQuestions = (count: number): Question[] => {
  return Array.from({ length: count }, (_, index) => ({
    id: `q-${index + 1}`,
    question: `Q${index + 1}`,
    options: ['A', 'B'],
    answer: 'A',
    type: 'single',
  }));
};

const createRepository = (questions: Question[]) => {
  let sessions: ChunkedPracticeSession[] = [];
  const mistakeLog: MistakeLog = {};

  const repository: IStorageRepository = {
    getBanks: async () => [],
    createBank: async () => ({ id: 'bank-a', name: 'Bank A', createdAt: 0, questionCount: 0 }),
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

  return { repository };
};

describe('useChunkedPractice draft lifecycle', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const banks: BankMetadata[] = [
    { id: 'bank-a', name: 'Bank A', createdAt: 0, questionCount: 10 },
  ];

  const toast = {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  };

  it('writes draft on progress updates and clears it on chunk completion', async () => {
    const { repository } = createRepository(createQuestions(10));
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

    await act(async () => {
      await result.current.startChunk(sessionId, 0);
    });

    act(() => {
      result.current.updateChunkDraft({
        currentQuestionIndex: 2,
        score: 2,
        wrongQuestionIds: ['q-4'],
        pendingSkill: null,
      });
    });

    const draftBeforeComplete = getChunkDraft(sessionId, 0);
    expect(draftBeforeComplete?.currentQuestionIndex).toBe(2);
    expect(draftBeforeComplete?.score).toBe(2);

    await act(async () => {
      await result.current.completeChunk({
        chunkMeta: { sessionId, chunkIndex: 0, totalChunks: 2 },
        score: 4,
        wrongQuestionIds: ['q-4'],
      });
    });

    const draftAfterComplete = getChunkDraft(sessionId, 0);
    expect(draftAfterComplete).toBeNull();
  });

  it('restores from existing chunk draft when resuming session', async () => {
    const { repository } = createRepository(createQuestions(10));
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

    await act(async () => {
      await result.current.startChunk(sessionId, 0);
    });

    const manualDraft: ChunkDraftState = {
      sessionId,
      chunkIndex: 0,
      currentQuestionIndex: 3,
      score: 3,
      wrongQuestionIds: ['q-2'],
      pendingSkill: null,
      updatedAt: Date.now(),
    };
    saveChunkDraft(manualDraft);

    await act(async () => {
      await result.current.restoreSession(sessionId);
    });

    const latestCall = onStartChunkQuiz.mock.calls.at(-1);
    expect(latestCall).toBeDefined();
    if (!latestCall) {
      throw new Error('Expected start payload');
    }
    const payload = (latestCall as unknown as unknown[])[0] as { draft: ChunkDraftState | null };
    expect(payload.draft).toEqual(manualDraft);
  });

  it('persists quiz-engine progress and restores the same chunk index after remount', async () => {
    const { repository } = createRepository(createQuestions(10));
    const onViewChange = vi.fn();

    interface ChunkProgressPayload {
      currentQuestionIndex: number;
      score: number;
      wrongQuestionIds: string[];
      pendingSkill: string | null;
    }

    const useChunkedResumeHarness = () => {
      const [, setMistakeLog] = useState<MistakeLog>({});
      const chunkedPracticeRef = useRef<{
        completeChunk: (payload: { chunkMeta: ChunkMeta; score: number; wrongQuestionIds: string[] }) => Promise<void>;
        updateChunkDraft: (payload: ChunkProgressPayload) => void;
      } | null>(null);

      const handleChunkComplete = useCallback(async (payload: { chunkMeta: ChunkMeta; score: number; wrongQuestionIds: string[] }) => {
        await chunkedPracticeRef.current?.completeChunk(payload);
      }, []);

      const handleChunkDraftUpdate = useCallback((payload: ChunkProgressPayload) => {
        chunkedPracticeRef.current?.updateChunkDraft(payload);
      }, []);

      const quizEngine = useQuizEngine({
        banks,
        selectedQuizBankIds: ['bank-a'],
        repository,
        setMistakeLog,
        onViewChange: (view: AppView) => {
          onViewChange(view);
        },
        loading: false,
        toast: { warning: toast.warning },
        onChunkComplete: handleChunkComplete,
        onChunkDraftUpdate: handleChunkDraftUpdate,
      });

      const chunkedPractice = useChunkedPractice({
        repository,
        banks,
        selectedQuizBankIds: ['bank-a'],
        toast,
        onStartChunkQuiz: async ({ questionIds, bankIds, chunkMeta, draft }) => {
          await quizEngine.startQuiz(
            questionIds.length,
            'chunked',
            questionIds,
            bankIds,
            chunkMeta,
            draft
              ? {
                  currentQuestionIndex: draft.currentQuestionIndex,
                  score: draft.score,
                  wrongQuestionIds: draft.wrongQuestionIds,
                }
              : undefined
          );
        },
      });

      chunkedPracticeRef.current = {
        completeChunk: chunkedPractice.completeChunk,
        updateChunkDraft: chunkedPractice.updateChunkDraft,
      };

      return { chunkedPractice, quizEngine };
    };

    const firstRun = renderHook(() => useChunkedResumeHarness());
    let sessionId = '';

    await act(async () => {
      const session = await firstRun.result.current.chunkedPractice.createSession(5);
      sessionId = session?.id ?? '';
      await firstRun.result.current.chunkedPractice.startChunk(sessionId, 0);
    });

    await waitFor(() => {
      expect(firstRun.result.current.quizEngine.quizState.activeQuestions.length).toBe(5);
    });

    for (let step = 0; step < 4; step++) {
      act(() => {
        firstRun.result.current.quizEngine.handleAnswer(true, 'A');
        firstRun.result.current.quizEngine.nextQuestion();
      });
    }

    await waitFor(() => {
      expect(getChunkDraft(sessionId, 0)?.currentQuestionIndex).toBe(4);
    });

    firstRun.unmount();

    const secondRun = renderHook(() => useChunkedResumeHarness());
    await act(async () => {
      await secondRun.result.current.chunkedPractice.restoreSession(sessionId);
    });

    await waitFor(() => {
      expect(secondRun.result.current.quizEngine.quizState.currentQuestionIndex).toBe(4);
    });
  });

  it('preserves existing draft when beforeunload fires with null latestProgressRef', async () => {
    const { repository } = createRepository(createQuestions(10));
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

    saveChunkDraft({
      sessionId,
      chunkIndex: 0,
      currentQuestionIndex: 5,
      score: 5,
      wrongQuestionIds: [],
      pendingSkill: null,
      updatedAt: Date.now()
    });

    await act(async () => {
      await result.current.startChunk(sessionId, 0);
    });

    act(() => {
      window.dispatchEvent(new Event('beforeunload'));
    });

    expect(getChunkDraft(sessionId, 0)?.currentQuestionIndex).toBe(5);
  });
});
