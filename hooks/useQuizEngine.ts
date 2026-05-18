import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import { AppView, BankMetadata, MistakeLog, Question, QuizState } from '../types';
import { createSpacedRepetitionItem, updateSpacedRepetition } from '../services/spacedRepetition';
import { clearQuizSession, getQuizSession, saveQuizSession, STORAGE_KEYS } from '../services/storage';
import { IStorageRepository } from '../services/repository';
import { ChunkMeta, MistakeDetail, RecentMistakeSession, SavedQuizProgress } from '../types/battleTypes';

const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

interface UseQuizEngineOptions {
  banks: BankMetadata[];
  selectedQuizBankIds: string[];
  repository: IStorageRepository;
  setMistakeLog: Dispatch<SetStateAction<MistakeLog>>;
  onViewChange: (view: AppView) => void;
  loading: boolean;
  toast: { warning: (message: string) => void };
  onChallengeStart?: (challengeId: string) => void;
  onChunkComplete?: (payload: { chunkMeta: ChunkMeta; score: number; wrongQuestionIds: string[] }) => Promise<void> | void;
  onChunkDraftUpdate?: (payload: {
    currentQuestionIndex: number;
    score: number;
    wrongQuestionIds: string[];
    pendingSkill: string | null;
  }) => void;
}

export const useQuizEngine = ({
  banks,
  selectedQuizBankIds,
  repository,
  setMistakeLog,
  onViewChange,
  loading,
  toast,
  onChallengeStart,
  onChunkComplete,
  onChunkDraftUpdate
}: UseQuizEngineOptions) => {
  const [quizState, setQuizState] = useState<QuizState>({
    currentQuestionIndex: 0,
    score: 0,
    totalQuestions: 0,
    isFinished: false,
    activeQuestions: [],
    mode: 'random',
    wrongQuestionIds: []
  });
  // Bank IDs actually used by the current active quiz session.
  // This must stay consistent even when dashboard selection changes.
  const [sessionBankIds, setSessionBankIds] = useState<string[]>(selectedQuizBankIds);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [currentSessionMistakes, setCurrentSessionMistakes] = useState<MistakeDetail[]>([]);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [pendingSession, setPendingSession] = useState<SavedQuizProgress | null>(null);
  const lastChunkCompletionRef = useRef<string | null>(null);

  useEffect(() => {
    if (quizState.mode === 'chunked') {
      return;
    }
    if (quizState.activeQuestions.length > 0 && !quizState.isFinished) {
      saveQuizSession({
        bankIds: sessionBankIds,
        questionIds: quizState.activeQuestions.map(q => String(q.id)),
        currentIndex: quizState.currentQuestionIndex,
        score: quizState.score,
        wrongQuestionIds: quizState.wrongQuestionIds,
        savedAt: Date.now()
      });
    } else if (quizState.isFinished) {
      clearQuizSession();
    }
  }, [quizState, sessionBankIds]);

  useEffect(() => {
    if (
      quizState.mode === 'chunked' &&
      quizState.chunkMeta &&
      !quizState.isFinished &&
      quizState.activeQuestions.length > 0
    ) {
      onChunkDraftUpdate?.({
        currentQuestionIndex: quizState.currentQuestionIndex,
        score: quizState.score,
        wrongQuestionIds: quizState.wrongQuestionIds,
        pendingSkill: null,
      });
    }
  }, [onChunkDraftUpdate, quizState]);

  useEffect(() => {
    if (!onChunkComplete) return;
    if (quizState.mode !== 'chunked' || !quizState.chunkMeta || !quizState.isFinished) return;
    const completionId = `${quizState.chunkMeta.sessionId}:${quizState.chunkMeta.chunkIndex}`;
    if (lastChunkCompletionRef.current === completionId) return;
    lastChunkCompletionRef.current = completionId;
    void onChunkComplete({
      chunkMeta: quizState.chunkMeta,
      score: quizState.score,
      wrongQuestionIds: quizState.wrongQuestionIds,
    });
  }, [onChunkComplete, quizState]);

  const restoreSession = useCallback(async (session: SavedQuizProgress) => {
    try {
      setSessionBankIds(session.bankIds);
      const poolPromises = session.bankIds.map(id => repository.getQuestions(id));
      const pools = await Promise.all(poolPromises);
      const allQuestions = pools.flat();

      const restoredQuestions = session.questionIds
        .map(id => allQuestions.find(q => String(q.id) === id))
        .filter((q): q is Question => !!q);

      if (restoredQuestions.length > 0) {
        setQuizState({
          currentQuestionIndex: session.currentIndex,
          score: session.score,
          totalQuestions: restoredQuestions.length,
          isFinished: false,
          activeQuestions: restoredQuestions,
          mode: 'random',
          wrongQuestionIds: session.wrongQuestionIds
        });
        onViewChange('quiz');
      }
    } catch (e) {
      console.error("Failed to restore session", e);
      clearQuizSession();
    } finally {
      setShowResumePrompt(false);
      setPendingSession(null);
    }
  }, [onViewChange, repository]);

  useEffect(() => {
    if (loading) return;
    const session = getQuizSession();
    if (session && session.questionIds.length > 0 && quizState.activeQuestions.length === 0) {
      setPendingSession(session);
      setShowResumePrompt(true);
    }
  }, [loading]);

  const dismissResumePrompt = useCallback(() => {
    clearQuizSession();
    setShowResumePrompt(false);
    setPendingSession(null);
  }, []);

  const startQuiz = useCallback(async (
    count: number,
    mode: 'random' | 'mistake' | 'retry_session' | 'chunked' = 'random',
    specificIds?: string[],
    overrideBankIds?: string[],
    chunkMeta?: ChunkMeta,
    draftState?: { currentQuestionIndex: number; score: number; wrongQuestionIds: string[] }
  ) => {
    if (mode === 'chunked' && !chunkMeta) {
      throw new Error('chunked 模式必須提供 chunkMeta');
    }

    let pool: Question[] = [];

    const effectiveBankIds = overrideBankIds && overrideBankIds.length > 0
      ? overrideBankIds
      : selectedQuizBankIds;

    setSessionBankIds(effectiveBankIds);
    const questionPromises = effectiveBankIds.map(id => repository.getQuestions(id));
    const questionArrays = await Promise.all(questionPromises);
    const allSelectedQuestions = questionArrays.flat();

    if (mode === 'mistake') {
      const log = repository.getMistakeLog();
      const mistakeIds = Object.keys(log);
      pool = allSelectedQuestions.filter(q => mistakeIds.includes(String(q.id)));
    } else if ((mode === 'retry_session' || mode === 'chunked') && specificIds) {
      const questionMap = new Map(allSelectedQuestions.map((question) => [String(question.id), question]));
      pool = specificIds
        .map((id) => questionMap.get(id))
        .filter((question): question is Question => Boolean(question));
    } else {
      pool = allSelectedQuestions;
    }

    if (pool.length === 0) {
      toast.warning("目前選擇的範圍沒有題目！");
      return;
    }

    const finalQuestions = mode === 'retry_session' || mode === 'chunked'
      ? pool
      : shuffleArray(pool).slice(0, count);

    const initialIndex = draftState?.currentQuestionIndex ?? 0;
    const safeIndex = Math.min(Math.max(initialIndex, 0), Math.max(finalQuestions.length - 1, 0));
    const initialScore = draftState?.score ?? 0;
    const initialWrong = draftState?.wrongQuestionIds ?? [];

    setQuizState({
      currentQuestionIndex: safeIndex,
      score: initialScore,
      totalQuestions: finalQuestions.length,
      isFinished: false,
      activeQuestions: finalQuestions,
      mode: mode,
      wrongQuestionIds: initialWrong,
      chunkMeta,
    });
    lastChunkCompletionRef.current = null;
    setSessionStartTime(Date.now());
    setCurrentSessionMistakes([]);

    localStorage.removeItem(STORAGE_KEYS.BATTLE_STATE);

    onViewChange(mode === 'mistake' ? 'mistakes' : 'quiz');
  }, [onViewChange, repository, selectedQuizBankIds, toast]);

  const handlePracticeMistakes = useCallback((mistakes: MistakeDetail[]) => {
    const questions: Question[] = mistakes.map(m => ({
      id: m.questionId,
      question: m.questionText,
      options: m.options,
      answer: m.correctAnswer,
      explanation: "（來自錯題回顧）"
    }));

    if (questions.length === 0) return;

    setQuizState({
      currentQuestionIndex: 0,
      score: 0,
      totalQuestions: questions.length,
      isFinished: false,
      activeQuestions: questions,
      mode: 'mistake',
      wrongQuestionIds: []
    });
    setSessionStartTime(Date.now());
    setCurrentSessionMistakes([]);
    onViewChange('quiz');
  }, [onViewChange]);

  const handleExitQuiz = useCallback(() => {
    if (currentSessionMistakes.length > 0) {
      const session: RecentMistakeSession = {
        sessionId: crypto.randomUUID(),
        timestamp: Date.now(),
        bankNames: banks.filter(b => sessionBankIds.includes(b.id)).map(b => b.name),
        mistakes: currentSessionMistakes
      };
      repository.addRecentMistakeSession(session);
    }
    setSessionStartTime(null);
    onViewChange('dashboard');
    setCurrentSessionMistakes([]);
  }, [banks, currentSessionMistakes, onViewChange, repository, sessionBankIds]);

  const startChallengeQuiz = useCallback(async (challengeId: string, bankId: string) => {
    const questions = await repository.getQuestions(bankId);

    if (questions.length === 0) {
      toast.warning("該題庫沒有題目！");
      return;
    }

    onChallengeStart?.(challengeId);
    setSessionBankIds([bankId]);

    const shuffled = shuffleArray(questions);

    setQuizState({
      currentQuestionIndex: 0,
      score: 0,
      totalQuestions: shuffled.length,
      isFinished: false,
      activeQuestions: shuffled,
      mode: 'challenge',
      wrongQuestionIds: [],
      challengeId: challengeId
    });
    setSessionStartTime(Date.now());
    onViewChange('quiz');
  }, [onChallengeStart, onViewChange, repository, toast]);

  const handleAnswer = useCallback((isCorrect: boolean, selectedAnswer: string | string[]) => {
    const currentQ = quizState.activeQuestions[quizState.currentQuestionIndex];
    if (!currentQ) return;

    const questionId = String(currentQ.id);
    let srItem = repository.getSpacedRepetitionItem(questionId);

    if (!srItem) {
      srItem = createSpacedRepetitionItem(questionId);
    }

    const grade = isCorrect ? 4 : 1;
    const updatedSrItem = updateSpacedRepetition(srItem, grade);

    void repository.saveSpacedRepetitionItem(updatedSrItem);

    if (isCorrect) {
      setQuizState(prev => ({ ...prev, score: prev.score + 1 }));
      if (quizState.mode === 'mistake') {
        repository.removeMistake(currentQ.id);
        setMistakeLog(repository.getMistakeLog());
      }
    } else {
      setQuizState(prev => ({ ...prev, wrongQuestionIds: [...prev.wrongQuestionIds, String(currentQ.id)] }));
      repository.logMistake(currentQ.id, Array.isArray(selectedAnswer) ? selectedAnswer.join(', ') : selectedAnswer);
      setMistakeLog(repository.getMistakeLog());

      const mistake: MistakeDetail = {
        questionId: String(currentQ.id),
        questionText: currentQ.question,
        options: currentQ.options,
        userAnswer: selectedAnswer,
        correctAnswer: currentQ.answer
      };
      setCurrentSessionMistakes(prev => [...prev, mistake]);
    }
  }, [quizState, repository, setMistakeLog]);

  const nextQuestion = useCallback(() => {
    if (quizState.currentQuestionIndex < quizState.totalQuestions - 1) {
      setQuizState(prev => ({ ...prev, currentQuestionIndex: prev.currentQuestionIndex + 1 }));
    } else {
      setQuizState(prev => ({ ...prev, isFinished: true }));
    }
  }, [quizState]);

  return {
    quizState,
    chunkMeta: quizState.chunkMeta,
    sessionStartTime,
    sessionBankIds,
    showResumePrompt,
    pendingSession,
    restoreSession,
    dismissResumePrompt,
    startQuiz,
    handlePracticeMistakes,
    handleExitQuiz,
    startChallengeQuiz,
    handleAnswer,
    nextQuestion
  };
};
