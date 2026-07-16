import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BankMetadata, Question } from '../types';
import { IStorageRepository } from '../services/repository';
import { ChunkDraftState, ChunkMeta, ChunkedPracticeSession, PracticeChunk } from '../types/battleTypes';
import {
  clearChunkDraft,
  clearChunkDraftsForSession,
  getChunkDraft,
  saveChunkDraft
} from '../services/storage';

const MAX_QUESTIONS_PER_SESSION = 1000;
const CHUNK_SIZE_OPTIONS = [10, 15, 20, 25, 30] as const;

interface ToastBridge {
  success: (message: string) => void;
  warning: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

interface ChunkedQuizStartPayload {
  questionIds: string[];
  bankIds: string[];
  chunkMeta: ChunkMeta;
  draft: ChunkDraftState | null;
}

interface ChunkCompletionPayload {
  chunkMeta: ChunkMeta;
  score: number;
  wrongQuestionIds: string[];
}

interface ChunkRuntimeProgress {
  currentQuestionIndex: number;
  score: number;
  wrongQuestionIds: string[];
}

interface UseChunkedPracticeOptions {
  repository: IStorageRepository;
  banks: BankMetadata[];
  selectedQuizBankIds: string[];
  toast: ToastBridge;
  onStartChunkQuiz: (payload: ChunkedQuizStartPayload) => Promise<void>;
}

interface ChunkSummaryState {
  sessionId: string;
  chunkIndex: number;
  totalChunks: number;
  score: number;
  totalQuestions: number;
  hasNextChunk: boolean;
  wrongQuestionIds: string[];
}

interface RestoreResult {
  session: ChunkedPracticeSession;
  nextChunkIndex: number;
  missingCount: number;
}

const shuffle = <T,>(items: T[]): T[] => {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[randomIndex]] = [next[randomIndex], next[index]];
  }
  return next;
};

const toQuestionId = (question: Question): string => String(question.id);

const getFirstRunnableChunkIndex = (chunks: PracticeChunk[]): number => {
  const inProgressIndex = chunks.findIndex((chunk) => chunk.status === 'in_progress' && chunk.questionIds.length > 0);
  if (inProgressIndex >= 0) return inProgressIndex;
  return chunks.findIndex((chunk) => chunk.status === 'pending' && chunk.questionIds.length > 0);
};

export const useChunkedPractice = ({
  repository,
  banks,
  selectedQuizBankIds,
  toast,
  onStartChunkQuiz
}: UseChunkedPracticeOptions) => {
  const [activeSessions, setActiveSessions] = useState<ChunkedPracticeSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chunkSummary, setChunkSummary] = useState<ChunkSummaryState | null>(null);
  const [currentChunkMeta, setCurrentChunkMeta] = useState<ChunkMeta | null>(null);
  const latestProgressRef = useRef<ChunkRuntimeProgress | null>(null);

  const chunkSizeOptions = useMemo(() => [...CHUNK_SIZE_OPTIONS], []);

  const loadActiveSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      const sessions = await repository.getPracticeSessions();
      const ordered = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);
      setActiveSessions(ordered);
    } finally {
      setIsLoading(false);
    }
  }, [repository]);

  useEffect(() => {
    void loadActiveSessions();
  }, [loadActiveSessions]);

  const validateSessionQuestions = useCallback(async (session: ChunkedPracticeSession): Promise<RestoreResult | null> => {
    const questionPools = await Promise.all(session.bankIds.map((bankId) => repository.getQuestions(bankId)));
    const existingIds = new Set(questionPools.flat().map(toQuestionId));

    let missingCount = 0;
    let hasAnyRunnableQuestion = false;
    const updatedChunks = session.chunks.map((chunk) => {
      const filteredQuestionIds = chunk.questionIds.filter((id) => existingIds.has(id));
      missingCount += chunk.questionIds.length - filteredQuestionIds.length;
      if (filteredQuestionIds.length > 0) hasAnyRunnableQuestion = true;

      if (filteredQuestionIds.length === 0) {
        return {
          ...chunk,
          questionIds: [],
          totalQuestions: 0,
          score: chunk.status === 'completed' ? chunk.score : 0,
          wrongQuestionIds: chunk.status === 'completed' ? chunk.wrongQuestionIds : [],
          status: 'completed' as const,
          completedAt: chunk.completedAt ?? Date.now(),
        };
      }

      return {
        ...chunk,
        questionIds: filteredQuestionIds,
        totalQuestions: filteredQuestionIds.length,
      };
    });

    if (!hasAnyRunnableQuestion) {
      const abandonedSession: ChunkedPracticeSession = {
        ...session,
        status: 'abandoned',
        chunks: updatedChunks,
        updatedAt: Date.now(),
      };
      await repository.savePracticeSession(abandonedSession);
      await repository.abandonPracticeSession(session.id);
      clearChunkDraftsForSession(session.id);
      toast.warning('此練習的題目已不存在，已自動放棄');
      return null;
    }

    const nextChunkIndex = getFirstRunnableChunkIndex(updatedChunks);
    const isCompleted = updatedChunks.every((chunk) => chunk.status === 'completed');
    const normalizedSession: ChunkedPracticeSession = {
      ...session,
      chunks: updatedChunks,
      status: isCompleted ? 'completed' : 'active',
      updatedAt: Date.now(),
    };

    await repository.savePracticeSession(normalizedSession);

    if (isCompleted || nextChunkIndex < 0) {
      return null;
    }

    return {
      session: normalizedSession,
      nextChunkIndex,
      missingCount,
    };
  }, [repository, toast]);

  const createSession = useCallback(async (chunkSize: number, bankIdsOverride?: string[]): Promise<ChunkedPracticeSession | null> => {
    const sourceBankIds = (bankIdsOverride && bankIdsOverride.length > 0) ? bankIdsOverride : selectedQuizBankIds;
    const sourceBanks = banks.filter((bank) => sourceBankIds.includes(bank.id));
    if (sourceBanks.length === 0) {
      toast.warning('請先選擇至少一個題庫');
      return null;
    }

    const questionArrays = await Promise.all(sourceBanks.map((bank) => repository.getQuestions(bank.id)));
    const questionMap: Record<string, string[]> = {};
    sourceBanks.forEach((bank, index) => {
      questionMap[bank.id] = questionArrays[index].map(toQuestionId);
    });

    const allQuestionIds = questionArrays.flat().map(toQuestionId);
    if (allQuestionIds.length === 0) {
      toast.warning('目前選擇的範圍沒有題目！');
      return null;
    }

    const cappedQuestionIds = allQuestionIds.slice(0, MAX_QUESTIONS_PER_SESSION);
    if (allQuestionIds.length > MAX_QUESTIONS_PER_SESSION) {
      toast.warning(`題目過多，已限制為 ${MAX_QUESTIONS_PER_SESSION} 題後建立練習`);
    }

    const shuffled = shuffle(cappedQuestionIds);
    const chunks: PracticeChunk[] = [];
    for (let index = 0; index < shuffled.length; index += chunkSize) {
      const chunkQuestionIds = shuffled.slice(index, index + chunkSize);
      chunks.push({
        index: chunks.length,
        questionIds: chunkQuestionIds,
        status: 'pending',
        score: 0,
        totalQuestions: chunkQuestionIds.length,
        wrongQuestionIds: [],
      });
    }

    const now = Date.now();
    const session: ChunkedPracticeSession = {
      id: crypto.randomUUID(),
      bankIds: sourceBankIds,
      bankNames: sourceBanks.map((bank) => bank.name),
      bankQuestionMap: questionMap,
      chunkSize,
      questionIds: shuffled,
      chunks,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      dirty: false,
      retryCount: 0,
    };

    await repository.savePracticeSession(session);
    await loadActiveSessions();
    return session;
  }, [banks, loadActiveSessions, repository, selectedQuizBankIds, toast]);

  const startChunk = useCallback(async (sessionId: string, chunkIndex: number): Promise<boolean> => {
    const currentSessions = await repository.getPracticeSessions();
    const targetSession = currentSessions.find((session) => session.id === sessionId);
    if (!targetSession) {
      toast.warning('找不到可繼續的分階段練習');
      return false;
    }

    const validated = await validateSessionQuestions(targetSession);
    if (!validated) {
      await loadActiveSessions();
      return false;
    }

    if (validated.missingCount > 0) {
      toast.warning(`有 ${validated.missingCount} 題已不存在，已自動跳過`);
    }

    const safeChunkIndex = chunkIndex < 0 ? validated.nextChunkIndex : chunkIndex;
    if (safeChunkIndex > 0 && validated.session.chunks[safeChunkIndex - 1]?.status !== 'completed') {
      toast.warning('請先完成前一個階段');
      return false;
    }

    const chunk = validated.session.chunks[safeChunkIndex];
    if (!chunk || chunk.status === 'completed') {
      return false;
    }

    const now = Date.now();
    const updatedChunks = validated.session.chunks.map((item, index) => {
      if (index !== safeChunkIndex) return item;
      return {
        ...item,
        status: 'in_progress' as const,
        startedAt: item.startedAt ?? now,
      };
    });

    const updatedSession: ChunkedPracticeSession = {
      ...validated.session,
      chunks: updatedChunks,
      updatedAt: now,
    };

    await repository.savePracticeSession(updatedSession);
    await loadActiveSessions();

    const chunkMeta: ChunkMeta = {
      chunkIndex: safeChunkIndex,
      totalChunks: updatedChunks.length,
      sessionId: updatedSession.id,
    };
    const draft = getChunkDraft(updatedSession.id, safeChunkIndex);
    setCurrentChunkMeta(chunkMeta);
    latestProgressRef.current = draft
      ? {
          currentQuestionIndex: draft.currentQuestionIndex,
          score: draft.score,
          wrongQuestionIds: draft.wrongQuestionIds,
        }
      : null;

    await onStartChunkQuiz({
      questionIds: updatedChunks[safeChunkIndex].questionIds,
      bankIds: updatedSession.bankIds,
      chunkMeta,
      draft,
    });
    return true;
  }, [loadActiveSessions, onStartChunkQuiz, repository, toast, validateSessionQuestions]);

  const startNextChunk = useCallback(async (sessionId: string): Promise<boolean> => {
    const sessions = await repository.getPracticeSessions();
    const session = sessions.find((item) => item.id === sessionId);
    if (!session) return false;
    const nextChunkIndex = getFirstRunnableChunkIndex(session.chunks);
    if (nextChunkIndex < 0) return false;
    return startChunk(sessionId, nextChunkIndex);
  }, [repository, startChunk]);

  const completeChunk = useCallback(async ({ chunkMeta, score, wrongQuestionIds }: ChunkCompletionPayload) => {
    const sessions = await repository.getPracticeSessions();
    const session = sessions.find((item) => item.id === chunkMeta.sessionId);
    if (!session) return;
    const target = session.chunks[chunkMeta.chunkIndex];
    if (!target || target.status === 'completed') return;

    const now = Date.now();
    const updatedChunks = session.chunks.map((chunk, index) => (
      index === chunkMeta.chunkIndex
        ? {
            ...chunk,
            status: 'completed' as const,
            score,
            wrongQuestionIds,
            totalQuestions: chunk.questionIds.length,
            completedAt: now,
          }
        : chunk
    ));
    const isSessionCompleted = updatedChunks.every((chunk) => chunk.status === 'completed');

    const updatedSession: ChunkedPracticeSession = {
      ...session,
      chunks: updatedChunks,
      status: isSessionCompleted ? 'completed' : 'active',
      updatedAt: now,
    };
    await repository.savePracticeSession(updatedSession);
    clearChunkDraft(chunkMeta.sessionId, chunkMeta.chunkIndex);
    setCurrentChunkMeta(null);
    latestProgressRef.current = null;

    setChunkSummary({
      sessionId: chunkMeta.sessionId,
      chunkIndex: chunkMeta.chunkIndex,
      totalChunks: chunkMeta.totalChunks,
      score,
      totalQuestions: target.questionIds.length,
      hasNextChunk: !isSessionCompleted,
      wrongQuestionIds,
    });
    await loadActiveSessions();
  }, [loadActiveSessions, repository]);

  const abandonSession = useCallback(async (sessionId: string) => {
    await repository.abandonPracticeSession(sessionId);
    clearChunkDraftsForSession(sessionId);
    if (currentChunkMeta?.sessionId === sessionId) {
      setCurrentChunkMeta(null);
      latestProgressRef.current = null;
    }
    await loadActiveSessions();
  }, [currentChunkMeta?.sessionId, loadActiveSessions, repository]);

  const restoreSession = useCallback(async (sessionId: string): Promise<boolean> => {
    const sessions = await repository.getPracticeSessions();
    const session = sessions.find((item) => item.id === sessionId);
    if (!session) return false;

    const validated = await validateSessionQuestions(session);
    if (!validated) {
      await loadActiveSessions();
      return false;
    }

    if (validated.missingCount > 0) {
      toast.warning(`有 ${validated.missingCount} 題已不存在，已自動跳過`);
    }

    return startChunk(sessionId, validated.nextChunkIndex);
  }, [loadActiveSessions, repository, startChunk, toast, validateSessionQuestions]);

  const saveChunkDraftSafely = useCallback((sessionId: string, chunkIndex: number, progress: ChunkRuntimeProgress) => {
    // 防禦性進度保護：避免以初始狀態 (0 題且無錯誤) 覆蓋已存在的更先進草稿
    const existingDraft = getChunkDraft(sessionId, chunkIndex);
    if (
      existingDraft &&
      existingDraft.currentQuestionIndex > progress.currentQuestionIndex &&
      progress.currentQuestionIndex === 0 &&
      progress.wrongQuestionIds.length === 0
    ) {
      console.warn(
        `[ChunkPractice] Prevented draft regression: local is ${existingDraft.currentQuestionIndex}, incoming is ${progress.currentQuestionIndex}`
      );
      return;
    }

    saveChunkDraft({
      sessionId,
      chunkIndex,
      currentQuestionIndex: progress.currentQuestionIndex,
      score: progress.score,
      wrongQuestionIds: progress.wrongQuestionIds,
      updatedAt: Date.now(),
    });
  }, []);

  const updateChunkDraft = useCallback((progress: ChunkRuntimeProgress) => {
    latestProgressRef.current = progress;
    if (!currentChunkMeta) return;
    saveChunkDraftSafely(currentChunkMeta.sessionId, currentChunkMeta.chunkIndex, progress);
  }, [currentChunkMeta, saveChunkDraftSafely]);

  useEffect(() => {
    const onBeforeUnload = () => {
      if (!currentChunkMeta || !latestProgressRef.current) return;
      saveChunkDraftSafely(currentChunkMeta.sessionId, currentChunkMeta.chunkIndex, latestProgressRef.current);
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [currentChunkMeta, saveChunkDraftSafely]);

  const dismissChunkSummary = useCallback(() => {
    setChunkSummary(null);
  }, []);

  return {
    activeSessions,
    isLoading,
    chunkSizeOptions,
    chunkSummary,
    currentChunkMeta,
    createSession,
    loadActiveSessions,
    startChunk,
    startNextChunk,
    completeChunk,
    abandonSession,
    restoreSession,
    updateChunkDraft,
    dismissChunkSummary,
  };
};
