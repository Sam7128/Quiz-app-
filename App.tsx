import React, { useReducer, useCallback, useState } from 'react';
import { AppView, BankMetadata } from './types';
import { MistakeDetail } from './types/battleTypes';
import { nukeAllBanks } from './services/storage';
import { useAuth } from './contexts/AuthContext';
import { useRepository } from './contexts/RepositoryContext';
import { useToast } from './contexts/ToastContext';
import { useConfirm } from './hooks/useConfirm';
import { useQuizEngine } from './hooks/useQuizEngine';
import { useAchievementTracker } from './hooks/useAchievementTracker';
import { useBankManager } from './hooks/useBankManager';
import { useAppDataLoader } from './hooks/useAppDataLoader';
import { AppContent } from './components/AppContent';
import { initialAppState, appReducer } from './reducers/appReducer';

const App: React.FC = () => {
  const { user, loading, signOut } = useAuth();
  const repository = useRepository();
  const toast = useToast();
  const confirmDialog = useConfirm();
  const { trackQuizCompletion } = useAchievementTracker();
  const [appState, dispatch] = useReducer(appReducer, initialAppState);

  // Data State
  const [mistakeLog, setMistakeLog] = useState(repository.getMistakeLog());

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

  const quizEngine = useQuizEngine({
    banks: appState.banks,
    selectedQuizBankIds: appState.selectedQuizBankIds,
    repository,
    setMistakeLog,
    onViewChange: handleViewChange,
    loading,
    toast
  });

  const startQuizByBank = useCallback(async (bankId: string, mode: 'challenge' | 'normal' = 'normal') => {
    dispatch({ type: 'set_selected_bank_ids', bankIds: [bankId] });
    if (mode === 'challenge') {
      await quizEngine.startChallengeQuiz(crypto.randomUUID(), bankId);
    } else {
      await quizEngine.startQuiz(20, 'random', undefined, [bankId]);
    }
  }, [dispatch, quizEngine]);

  const handleToggleGameMode = useCallback(() => {
    dispatch({ type: 'set_game_mode', gameMode: !appState.gameMode });
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
      repository={repository}
    />
  );
};

export default App;
