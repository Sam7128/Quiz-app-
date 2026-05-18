import React, { useReducer, useCallback, useEffect, useRef, useState } from 'react';
import { AppView, BankMetadata } from './types';
import { MistakeDetail } from './types/battleTypes';
import { nukeAllBanks, saveGameMode } from './services/storage';
import { useAuth } from './contexts/AuthContext';
import { useRepository } from './contexts/RepositoryContext';
import { useToast } from './contexts/ToastContext';
import { useConfirm } from './hooks/useConfirm';
import { useQuizEngine } from './hooks/useQuizEngine';
import { useAchievementTracker } from './hooks/useAchievementTracker';
import { useBankManager } from './hooks/useBankManager';
import { useAppDataLoader } from './hooks/useAppDataLoader';
import { useChunkedPractice } from './hooks/useChunkedPractice';
import { ChunkMeta } from './types/battleTypes';
import { syncLocalPracticeSessions } from './services/cloudStorage';
import { AppContent } from './components/AppContent';
import { initialAppState, appReducer } from './reducers/appReducer';

const App: React.FC = () => {
  const { user, loading, signOut } = useAuth();
  const repository = useRepository();
  const toast = useToast();
  const confirmDialog = useConfirm();
  const { trackQuizCompletion } = useAchievementTracker();
  const [appState, dispatch] = useReducer(appReducer, initialAppState);
  const [isCreatingChunkSession, setIsCreatingChunkSession] = useState(false);
  const hasSyncedPracticeRef = useRef(false);

  // Data State
  const [mistakeLog, setMistakeLog] = useState(repository.getMistakeLog());
  const chunkedPracticeRef = useRef<{
    completeChunk: (payload: { chunkMeta: ChunkMeta; score: number; wrongQuestionIds: string[] }) => Promise<void>;
    updateChunkDraft: (payload: {
      currentQuestionIndex: number;
      score: number;
      wrongQuestionIds: string[];
      pendingSkill: string | null;
    }) => void;
  } | null>(null);

  const handleViewChange = useCallback((nextView: AppView) => {
    dispatch({ type: 'set_view', view: nextView });
  }, []);

  const bankManager = useBankManager({
    repository,
    dispatch,
    banks: appState.banks,
    selectedQuizBankIds: appState.selectedQuizBankIds
  });

  // Initialization & Data Loading
  const { quizPoolQuestions, editingQuestions } = useAppDataLoader({
    repository,
    dispatch,
    refreshBanksData: bankManager.refreshBanksData,
    selectedQuizBankIds: appState.selectedQuizBankIds,
    editingBankId: appState.editingBankId,
    loading
  });

  const handleChunkComplete = useCallback(async (payload: { chunkMeta: ChunkMeta; score: number; wrongQuestionIds: string[] }) => {
    await chunkedPracticeRef.current?.completeChunk(payload);
  }, []);

  const handleChunkDraftUpdate = useCallback((payload: {
    currentQuestionIndex: number;
    score: number;
    wrongQuestionIds: string[];
    pendingSkill: string | null;
  }) => {
    chunkedPracticeRef.current?.updateChunkDraft(payload);
  }, []);

  const quizEngine = useQuizEngine({
    banks: appState.banks,
    selectedQuizBankIds: appState.selectedQuizBankIds,
    repository,
    setMistakeLog,
    onViewChange: handleViewChange,
    loading,
    toast,
    onChunkComplete: handleChunkComplete,
    onChunkDraftUpdate: handleChunkDraftUpdate
  });

  const chunkedPractice = useChunkedPractice({
    repository,
    banks: appState.banks,
    selectedQuizBankIds: appState.selectedQuizBankIds,
    toast,
    onStartChunkQuiz: async ({ questionIds, bankIds, chunkMeta, draft }) => {
      await quizEngine.startQuiz(
        questionIds.length,
        'chunked',
        questionIds,
        bankIds,
        chunkMeta,
        draft ? {
          currentQuestionIndex: draft.currentQuestionIndex,
          score: draft.score,
          wrongQuestionIds: draft.wrongQuestionIds
        } : undefined
      );
      dispatch({ type: 'set_view', view: 'quiz' });
    }
  });
  chunkedPracticeRef.current = {
    completeChunk: chunkedPractice.completeChunk,
    updateChunkDraft: chunkedPractice.updateChunkDraft,
  };

  useEffect(() => {
    if (!user) {
      hasSyncedPracticeRef.current = false;
      return;
    }
    if (hasSyncedPracticeRef.current) return;
    hasSyncedPracticeRef.current = true;

    void syncLocalPracticeSessions().then((result) => {
      if (result.uploaded > 0) {
        toast.success(`已同步 ${result.uploaded} 筆分階段練習到雲端`);
      }
      if (result.dirty > 0) {
        toast.warning(`有 ${result.dirty} 筆分階段練習待重試同步`);
      }
      void chunkedPractice.loadActiveSessions();
    });
  }, [chunkedPractice, toast, user]);

  const handleCreateChunkSession = useCallback(async (chunkSize: number) => {
    setIsCreatingChunkSession(true);
    try {
      const session = await chunkedPractice.createSession(chunkSize);
      if (!session) return;
      await chunkedPractice.startChunk(session.id, 0);
    } finally {
      setIsCreatingChunkSession(false);
    }
  }, [chunkedPractice]);

  const handleContinueChunkSession = useCallback(async (sessionId: string) => {
    const restored = await chunkedPractice.restoreSession(sessionId);
    if (!restored) {
      toast.warning('目前無可繼續的階段');
    }
  }, [chunkedPractice, toast]);

  const handleAbandonChunkSession = useCallback(async (sessionId: string) => {
    if (!await confirmDialog({ title: '放棄分階段練習', message: '確定要放棄此練習嗎？已完成階段的學習紀錄會保留。' })) return;
    await chunkedPractice.abandonSession(sessionId);
    toast.info('已放棄該分階段練習');
  }, [chunkedPractice, confirmDialog, toast]);

  const handleContinueFromChunkSummary = useCallback(async () => {
    const summary = chunkedPractice.chunkSummary;
    if (!summary || !summary.hasNextChunk) {
      chunkedPractice.dismissChunkSummary();
      dispatch({ type: 'set_view', view: 'dashboard' });
      return;
    }
    chunkedPractice.dismissChunkSummary();
    await chunkedPractice.startNextChunk(summary.sessionId);
  }, [chunkedPractice]);

  const startQuizByBank = useCallback(async (bankId: string, mode: 'challenge' | 'normal' = 'normal') => {
    dispatch({ type: 'set_selected_bank_ids', bankIds: [bankId] });
    if (mode === 'challenge') {
      await quizEngine.startChallengeQuiz(crypto.randomUUID(), bankId);
    } else {
      await quizEngine.startQuiz(20, 'random', undefined, [bankId]);
    }
  }, [dispatch, quizEngine]);

  const handleToggleGameMode = useCallback(() => {
    const nextGameMode = !appState.gameMode;
    saveGameMode(nextGameMode);
    dispatch({ type: 'set_game_mode', gameMode: nextGameMode });
  }, [appState.gameMode]);

  const handleSystemNuke = useCallback(async () => {
    if (!await confirmDialog({ title: '🚨 警告', message: '這將會剷除所有本地題庫、資料夾與設定！此動作極度危險且無法復原。確定要執行嗎？' })) return;
    if (!await confirmDialog({ title: '最後確認', message: '真的要「徹底剷除」目前的全部數據並登出嗎？' })) return;

    if (user) {
      try {
        await signOut();
      } catch (e) {
        console.error("Sign out failed during nuke, proceeding with local clear", e);
      }
    }

    nukeAllBanks();
    repository.clearMistakes();
    repository.clearSpacedRepetition();

    await bankManager.refreshBanksData();
    toast.info('所有本地與連線數據經已徹底剷除。系統將重新載入。');
    window.location.reload();
  }, [bankManager, confirmDialog, repository, signOut, toast, user]);

  const handleShare = useCallback((bank: BankMetadata | null) => {
    dispatch({ type: 'set_sharing_bank', sharingBank: bank });
  }, []);

  const handleStartMistakes = useCallback(() => {
    quizEngine.startQuiz(20, 'mistake');
  }, [quizEngine]);

  return (
    <AppContent
      user={user}
      loading={loading}
      guestMode={appState.guestMode}
      state={{
        view: appState.view,
        gameMode: appState.gameMode,
        isSettingsOpen: appState.isSettingsOpen,
        sharingBank: appState.sharingBank,
        banks: appState.banks,
        folders: appState.folders,
        editingBankId: appState.editingBankId,
        selectedQuizBankIds: appState.selectedQuizBankIds,
        quizPoolQuestions,
        editingQuestions,
        mistakeLog,
      }}
      actions={{
        dispatch,
        signOut,
        handleViewChange,
        handleToggleGameMode,
        handleSystemNuke,
        handleShare,
        handleStartMistakes,
        handlePracticeMistakes: quizEngine.handlePracticeMistakes,
        handleCreateFolder: bankManager.handleCreateFolder,
        handleDeleteFolder: bankManager.handleDeleteFolder,
        handleBatchDelete: bankManager.handleBatchDelete,
        handleMoveBank: bankManager.handleMoveBank,
        handleEditingBankChange: bankManager.handleEditingBankChange,
        handleToggleQuizBank: bankManager.handleToggleQuizBank,
        handleSelectAll: bankManager.handleSelectAll,
        refreshBanksData: bankManager.refreshBanksData,
        setMistakeLog
      }}
      quizEngine={{
        ...quizEngine,
        trackQuizCompletion,
        startQuizByBank
      }}
      chunkedPractice={{
        activeSessions: chunkedPractice.activeSessions,
        chunkSizeOptions: chunkedPractice.chunkSizeOptions,
        isCreatingSession: isCreatingChunkSession,
        summary: chunkedPractice.chunkSummary,
        createSession: handleCreateChunkSession,
        continueSession: handleContinueChunkSession,
        abandonSession: handleAbandonChunkSession,
        continueFromSummary: handleContinueFromChunkSummary,
        dismissSummary: chunkedPractice.dismissChunkSummary
      }}
      repository={repository}
    />
  );
};

export default App;
