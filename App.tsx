import React, { useEffect, useReducer, useState, useCallback } from 'react';
import { AppAction, AppState, BankMetadata, Folder, Question, QuizState } from './types';
import {
  getQuestions,
  saveQuestions,
  getMistakeLog,
  logMistake,
  removeMistake,
  getBanksMeta,
  getCurrentBankId,
  setCurrentBankId,
  createBank,
  getFolders,
  createFolder,
  deleteFolder,
  moveBankToFolder,
  getBankFolderMap,
  updateBankFolder,
  getSpacedRepetitionItem,
  saveSpacedRepetitionItem,
  getGameMode,
  saveGameMode
} from './services/storage';
import {
  getCloudBanks,
  getCloudQuestions,
  syncLocalToCloud,
  saveCloudSpacedRepetition,
  updateCloudBankFolder
} from './services/cloudStorage';
import {
  updateSpacedRepetition,
  createSpacedRepetitionItem
} from './services/spacedRepetition';
import {
  recordStudySession,
  recordLocalStudySession
} from './services/analytics';
import {
  unlockCloudAchievement,
  unlockLocalAchievement
} from './services/achievements';
import {
  submitChallengeScore
} from './services/challenges';
import { QuizProvider } from './contexts/QuizContext';
import { DEFAULT_QUESTIONS, APP_NAME } from './constants';
import { Dashboard } from './components/Dashboard';
import { QuizCard } from './components/QuizCard';
import { BankManager } from './components/BankManager';
import { AIPromptGuide } from './components/AIPromptGuide';
import { Login } from './components/Login';
import { Settings as SettingsModal } from './components/Settings';
import { Social } from './components/Social';
import { ShareModal } from './components/ShareModal';
import { useAuth } from './contexts/AuthContext';
import { BrainCircuit, LayoutDashboard, FileText, Settings, X, RotateCcw, User as UserIcon, Users } from 'lucide-react';
import SkeletonLoader from './components/SkeletonLoader';
import { AnimatePresence, motion } from 'framer-motion';

// Fisher-Yates Shuffle
const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export const initialAppState: AppState = {
  view: 'dashboard',
  guestMode: false,
  isSettingsOpen: false,
  sharingBank: null,
  banks: [],
  folders: [],
  editingBankId: null,
  selectedQuizBankIds: [],
  gameMode: getGameMode()
};

export const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'set_view':
      return { ...state, view: action.view };
    case 'set_guest_mode':
      return { ...state, guestMode: action.guestMode };
    case 'set_settings_open':
      return { ...state, isSettingsOpen: action.isSettingsOpen };
    case 'set_sharing_bank':
      return { ...state, sharingBank: action.sharingBank };
    case 'sync_banks_data': {
      const validIds = action.banks.map(bank => bank.id);
      const preservedSelection = state.selectedQuizBankIds.filter(id => validIds.includes(id));
      const selectedQuizBankIds = preservedSelection.length > 0
        ? preservedSelection
        : (action.banks.length > 0 ? [action.banks[0].id] : []);

      return {
        ...state,
        banks: action.banks,
        folders: action.folders,
        selectedQuizBankIds
      };
    }
    case 'set_editing_bank_id':
      return { ...state, editingBankId: action.editingBankId };
    case 'toggle_quiz_bank_id': {
      const isSelected = state.selectedQuizBankIds.includes(action.bankId);
      const selectedQuizBankIds = isSelected
        ? state.selectedQuizBankIds.filter(id => id !== action.bankId)
        : [...state.selectedQuizBankIds, action.bankId];

      return { ...state, selectedQuizBankIds };
    }
    case 'set_game_mode':
      saveGameMode(action.gameMode);
      return { ...state, gameMode: action.gameMode };
    default:
      return state;
  }
};

const App: React.FC = () => {
  const { user, loading, signOut } = useAuth();
  const [appState, dispatch] = useReducer(appReducer, initialAppState);
  const {
    view,
    guestMode,
    isSettingsOpen,
    sharingBank,
    banks,
    folders,
    editingBankId,
    selectedQuizBankIds,
    gameMode
  } = appState;

  // Data State
  const [quizPoolQuestions, setQuizPoolQuestions] = useState<Question[]>([]);
  const [editingQuestions, setEditingQuestions] = useState<Question[]>([]);
  const [mistakeLog, setMistakeLog] = useState(getMistakeLog());

  // Quiz Session State
  const [quizState, setQuizState] = useState<QuizState>({
    currentQuestionIndex: 0,
    score: 0,
    totalQuestions: 0,
    isFinished: false,
    activeQuestions: [],
    mode: 'random'
  });

  // Session tracking for analytics
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);

  // Challenge state
  const [currentChallengeId, setCurrentChallengeId] = useState<string | null>(null);

  // Refresh helper (Consolidated Logic)
  const refreshBanksData = useCallback(async () => {
    let latest: BankMetadata[] = [];

    if (user) {
      latest = await getCloudBanks();
      // Check for first-time sync opportunity
      const localMeta = getBanksMeta();
      if (localMeta.length > 0 && latest.length === 0) {
        // Avoid infinite loop by checking a flag or just asking once per session
        // For simplicity, we just ask. In a real app, use a session flag.
        if (window.confirm('偵測到您在本地端有題庫，但雲端是空的。是否要將本地題庫上傳至雲端同步？')) {
          await syncLocalToCloud(localMeta);
          latest = await getCloudBanks();
          localStorage.removeItem('mindspark_banks_meta'); // Clear local meta after sync to avoid confusion? Or keep as backup. 
          // Let's keep backup but maybe clear the prompt condition.
          // Actually, the prompt condition (local > 0 && cloud == 0) will naturally become false after sync.
          alert('同步完成！');
        }
      }
    } else {
      latest = getBanksMeta();
    }

    // Apply local folder map overlay (CRITICAL for persistence across reloads)
    const folderMap = getBankFolderMap();
    latest = latest.map(b => ({
      ...b,
      // Use local folder map if exists (including explicit null for root), otherwise keep cloud value
      folderId: Object.prototype.hasOwnProperty.call(folderMap, b.id) ? folderMap[b.id] : b.folderId
    }));

    const latestFolders = getFolders();
    dispatch({ type: 'sync_banks_data', banks: latest, folders: latestFolders });

    return latest;
  }, [user]);

  // Initialization: Auth & Initial Banks
  useEffect(() => {
    if (loading) return;

    const init = async () => {
      const loadedBanks = await refreshBanksData();

      // Set initial selection if empty
      let defaultId = getCurrentBankId();
      if (!defaultId || !loadedBanks.find(b => b.id === defaultId)) {
        defaultId = loadedBanks.length > 0 ? loadedBanks[0].id : null;
      }

      if (defaultId) {
        dispatch({ type: 'set_editing_bank_id', editingBankId: defaultId });
        setCurrentBankId(defaultId);
        // selectedQuizBankIds is handled in refreshBanksData
      }
    };

    init();
  }, [loading, user]);

  const loadQuizPool = useCallback(async () => {
    if (selectedQuizBankIds.length === 0) {
      setQuizPoolQuestions([]);
      return;
    }
    try {
      const arrays = await Promise.all(
        selectedQuizBankIds.map(id =>
          user ? getCloudQuestions(id) : Promise.resolve(getQuestions(id))
        )
      );
      setQuizPoolQuestions(arrays.flat());
    } catch (error) {
      console.error('Failed to load quiz pool questions', error);
      setQuizPoolQuestions([]);
    }
  }, [selectedQuizBankIds, user]);

  useEffect(() => {
    void loadQuizPool();
  }, [loadQuizPool]);

  const loadEditingQuestions = useCallback(async () => {
    if (!editingBankId) {
      setEditingQuestions([]);
      return;
    }
    try {
      const questions = user ? await getCloudQuestions(editingBankId) : getQuestions(editingBankId);
      setEditingQuestions(questions);
    } catch (error) {
      console.error('Failed to load editing questions', error);
      setEditingQuestions([]);
    }
  }, [editingBankId, user]);

  useEffect(() => {
    void loadEditingQuestions();
  }, [loadEditingQuestions]);

  const handleCreateFolder = useCallback((name: string) => {
    createFolder(name);
    void refreshBanksData();
  }, [refreshBanksData]);

  const handleDeleteFolder = useCallback((id: string) => {
    deleteFolder(id);
    void refreshBanksData();
  }, [refreshBanksData]);

  const handleToggleGameMode = useCallback(() => {
    dispatch({ type: 'set_game_mode', gameMode: !gameMode });
  }, [gameMode]);

  const handleMoveBank = useCallback(async (bankId: string, folderId: string | undefined) => {
    try {
      // Update local storage first (synchronous)
      updateBankFolder(bankId, folderId);

      // Sync to cloud if authenticated
      if (user) {
        await updateCloudBankFolder(bankId, folderId);
      }

      // Refresh data after all updates complete
      await refreshBanksData();
    } catch (error) {
      console.error('Error moving bank:', error);
      // Refresh anyway to ensure UI consistency
      await refreshBanksData();
    }
  }, [refreshBanksData, user]);

  const handleEditingBankChange = useCallback((id: string) => {
    dispatch({ type: 'set_editing_bank_id', editingBankId: id });
    setCurrentBankId(id);
  }, []);

  const handleToggleQuizBank = useCallback((id: string) => {
    dispatch({ type: 'toggle_quiz_bank_id', bankId: id });
  }, []);

  const startQuiz = useCallback(async (count: number, mode: 'random' | 'mistake' | 'retry_session' = 'random', specificIds?: string[]) => {
    let pool: Question[] = [];

    // Fetch all questions from selected banks
    const questionPromises = selectedQuizBankIds.map(id =>
      user ? getCloudQuestions(id) : getQuestions(id)
    );
    const questionArrays = await Promise.all(questionPromises);
    const allSelectedQuestions = questionArrays.flat();

    if (mode === 'mistake') {
      const log = getMistakeLog();
      const mistakeIds = Object.keys(log);
      pool = allSelectedQuestions.filter(q => mistakeIds.includes(String(q.id)));
    } else if (mode === 'retry_session' && specificIds) {
      pool = allSelectedQuestions.filter(q => specificIds.includes(String(q.id)));
    } else {
      pool = allSelectedQuestions;
    }

    if (pool.length === 0) {
      alert("目前選擇的範圍沒有題目！");
      return;
    }

    const shuffled = mode === 'retry_session' ? pool : shuffleArray(pool).slice(0, count);

    setQuizState({
      currentQuestionIndex: 0,
      score: 0,
      totalQuestions: shuffled.length,
      isFinished: false,
      activeQuestions: shuffled,
      mode: mode,
      wrongQuestionIds: []
    });
    setSessionStartTime(Date.now());
    dispatch({ type: 'set_view', view: mode === 'mistake' ? 'mistakes' : 'quiz' });
  }, [selectedQuizBankIds, user]);

  // Start a challenge quiz with specific bank
  const startChallengeQuiz = useCallback(async (challengeId: string, bankId: string) => {
    // Fetch questions from the challenge bank
    const questions = user ? await getCloudQuestions(bankId) : getQuestions(bankId);

    if (questions.length === 0) {
      alert("該題庫沒有題目！");
      return;
    }

    // Store current challenge ID for score submission
    setCurrentChallengeId(challengeId);

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
    dispatch({ type: 'set_view', view: 'quiz' });
  }, [user]);

  const handleAnswer = useCallback((isCorrect: boolean, selectedAnswer: string | string[]) => {
    const currentQ = quizState.activeQuestions[quizState.currentQuestionIndex];
    if (!currentQ) return;

    // SM-2 Spaced Repetition Update
    const questionId = String(currentQ.id);
    let srItem = getSpacedRepetitionItem(questionId);

    if (!srItem) {
      srItem = createSpacedRepetitionItem(questionId);
    }

    // Grade mapping: correct answers get grade 4-5, incorrect get 0-2
    const grade = isCorrect ? 4 : 1;
    const updatedSrItem = updateSpacedRepetition(srItem, grade);

    // Save to local storage
    saveSpacedRepetitionItem(updatedSrItem);

    // Save to cloud if authenticated
    if (user) {
      void saveCloudSpacedRepetition(updatedSrItem);
    }

    if (isCorrect) {
      setQuizState(prev => ({ ...prev, score: prev.score + 1 }));
      if (quizState.mode === 'mistake') {
        removeMistake(currentQ.id);
        setMistakeLog(getMistakeLog()); // Update state
      }
    } else {
      setQuizState(prev => ({ ...prev, wrongQuestionIds: [...prev.wrongQuestionIds, String(currentQ.id)] }));
      logMistake(currentQ.id, Array.isArray(selectedAnswer) ? selectedAnswer.join(', ') : selectedAnswer);
      setMistakeLog(getMistakeLog()); // Update state
    }
  }, [quizState, user]);

  const nextQuestion = useCallback(() => {
    if (quizState.currentQuestionIndex < quizState.totalQuestions - 1) {
      setQuizState(prev => ({ ...prev, currentQuestionIndex: prev.currentQuestionIndex + 1 }));
    } else {
      setQuizState(prev => ({ ...prev, isFinished: true }));
    }
  }, [quizState]);

  const handleShare = useCallback((bank: BankMetadata | null) => {
    dispatch({ type: 'set_sharing_bank', sharingBank: bank });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <SkeletonLoader variant="card" count={1} className="w-48 h-48" />
      </div>
    );
  }

  if (!user && !guestMode) return <Login onGuestMode={() => dispatch({ type: 'set_guest_mode', guestMode: true })} />;

  const animationVariants = {
    initial: { opacity: 0, x: -50 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.5 } },
    exit: { opacity: 0, x: 50, transition: { duration: 0.3 } }
  };

  const renderContent = () => {
    if (view === 'quiz' || view === 'mistakes') {
      if (quizState.isFinished) {
        return (
          <div className="max-w-md mx-auto text-center pt-10">
            <div className="bg-white p-10 rounded-3xl shadow-xl">
              <div className="w-24 h-24 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full flex items-center justify-center text-white mx-auto mb-6 shadow-lg">
                <span className="text-3xl font-bold">{Math.round((quizState.score / quizState.totalQuestions) * 100)}%</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">測驗完成！</h2>
              <p className="text-slate-500 mb-8">你在 {quizState.totalQuestions} 題中答對了 {quizState.score} 題</p>

              <div className="space-y-3">
                {quizState.wrongQuestionIds.length > 0 && (
                  <button
                    onClick={() => startQuiz(quizState.wrongQuestionIds.length, 'retry_session', quizState.wrongQuestionIds)}
                    className="w-full flex items-center justify-center gap-2 bg-amber-500 text-white py-3 rounded-xl font-medium hover:bg-amber-600 transition-colors shadow-md shadow-amber-200"
                  >
                    <RotateCcw size={18} /> 立即複習錯題 ({quizState.wrongQuestionIds.length})
                  </button>
                )}

                <button
                  onClick={() => startQuiz(quizState.totalQuestions, 'random')}
                  className="w-full flex items-center justify-center gap-2 bg-brand-600 text-white py-3 rounded-xl font-medium hover:bg-brand-500 transition-colors"
                >
                  <RotateCcw size={18} /> 再做一次 (隨機)
                </button>
                <button onClick={() => {
                  // Record study session for analytics
                  if (sessionStartTime) {
                    const durationSeconds = Math.floor((Date.now() - sessionStartTime) / 1000);
                    const correctCount = quizState.score;
                    const totalQuestions = quizState.totalQuestions;

                    if (user) {
                      void recordStudySession(totalQuestions, correctCount, durationSeconds);
                    } else {
                      recordLocalStudySession(totalQuestions, correctCount, durationSeconds);
                    }

                    // Check and unlock achievements
                    const accuracy = totalQuestions > 0 ? (correctCount / totalQuestions) : 0;

                    // Perfect score achievement
                    if (accuracy === 1 && totalQuestions >= 5) {
                      if (user) {
                        void unlockCloudAchievement('perfect_score');
                      } else {
                        unlockLocalAchievement('perfect_score');
                      }
                    }

                    // First question achievement (always unlock on any completed quiz)
                    if (user) {
                      void unlockCloudAchievement('first_question');
                    } else {
                      unlockLocalAchievement('first_question');
                    }

                    // Night owl achievement (10 PM - 6 AM)
                    const hour = new Date().getHours();
                    if (hour >= 22 || hour < 6) {
                      if (user) {
                        void unlockCloudAchievement('night_owl');
                      } else {
                        unlockLocalAchievement('night_owl');
                      }
                    }

                    // Early bird achievement (before 6 AM)
                    if (hour < 6) {
                      if (user) {
                        void unlockCloudAchievement('early_bird');
                      } else {
                        unlockLocalAchievement('early_bird');
                      }
                    }
                  }
                  setSessionStartTime(null);
                  dispatch({ type: 'set_view', view: 'dashboard' });
                }} className="w-full py-3 text-slate-600 hover:text-slate-800 font-medium transition-colors">返回首頁</button>
              </div>
            </div>
          </div>
        );
      }
      return (
        <div className="py-4">
          <QuizCard
            question={quizState.activeQuestions[quizState.currentQuestionIndex]}
            currentIndex={quizState.currentQuestionIndex}
            totalQuestions={quizState.totalQuestions}
            onAnswer={handleAnswer}
            onNext={nextQuestion}
            isLastQuestion={quizState.currentQuestionIndex === quizState.totalQuestions - 1}
            onExit={() => dispatch({ type: 'set_view', view: 'dashboard' })}
            gameMode={gameMode} // Pass global game mode setting
          />
        </div>
      );
    }

    switch (view) {
      case 'dashboard':
        return <Dashboard
          questions={quizPoolQuestions}
          mistakeLog={mistakeLog}
          banks={banks}
          folders={folders}
          selectedBankIds={selectedQuizBankIds}
          onToggleBank={handleToggleQuizBank}
          onStartQuiz={(n) => startQuiz(n, 'random')}
          onStartMistakes={() => startQuiz(20, 'mistake')}
          onShareBank={(bank) => dispatch({ type: 'set_sharing_bank', sharingBank: bank })}
          onCreateFolder={handleCreateFolder}
          onDeleteFolder={handleDeleteFolder}
          onMoveBank={handleMoveBank}
          isAuthenticated={!!user}
        />;
      case 'manager':
        return <BankManager
          currentQuestions={editingQuestions}
          currentBankId={editingBankId}
          onBankChange={handleEditingBankChange}
          onUpdateQuestions={async () => await refreshBanksData()}
          onRefreshBanks={refreshBanksData}
          onMistakesUpdate={() => setMistakeLog(getMistakeLog())}
        />;
      case 'guide': return <AIPromptGuide />;
      case 'social': return <Social />;
      default: return <div>Not Found</div>;
    }
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${view === 'quiz' && gameMode ? 'bg-dungeon-page bg-repeat bg-fixed' : 'bg-slate-50 dark:bg-slate-900'
      }`}>
      {view === 'quiz' && gameMode && <div className="fixed inset-0 bg-black/50 pointer-events-none" />}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => dispatch({ type: 'set_settings_open', isSettingsOpen: false })}
        gameMode={gameMode}
        onToggleGameMode={handleToggleGameMode}
      />
      <ShareModal
        isOpen={sharingBank !== null}
        onClose={() => dispatch({ type: 'set_sharing_bank', sharingBank: null })}
        bank={sharingBank}
      />
      <header className={`${view === 'quiz' && gameMode
        ? 'bg-slate-900 border-slate-700'
        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
        } border-b sticky top-0 z-50`}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => dispatch({ type: 'set_view', view: 'dashboard' })}>
            <div className={`${view === 'quiz' && gameMode ? 'bg-amber-600' : 'bg-brand-600'} text-white p-1.5 rounded-lg`}><BrainCircuit size={24} /></div>
            <div className="flex flex-col">
              <span className={`font-bold text-lg leading-none ${view === 'quiz' && gameMode ? 'text-amber-100' : 'text-slate-800 dark:text-slate-200'}`}>{APP_NAME}</span>
              <span className={`text-[10px] font-medium ${view === 'quiz' && gameMode ? 'text-amber-400/80' : 'text-slate-500 dark:text-slate-400'}`}>
                {view === 'manager' ? (banks.find(b => b.id === editingBankId)?.name || '管理題庫') : (selectedQuizBankIds.length > 1 ? `已選 ${selectedQuizBankIds.length} 個題庫` : banks.find(b => b.id === selectedQuizBankIds[0])?.name || '')}
              </span>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <button onClick={() => dispatch({ type: 'set_view', view: 'dashboard' })} className={`font-medium text-sm ${view === 'dashboard' ? 'text-brand-600' : (view === 'quiz' && gameMode ? 'text-slate-400 hover:text-amber-300' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200')}`}>首頁</button>
            <button onClick={() => dispatch({ type: 'set_view', view: 'manager' })} className={`font-medium text-sm ${view === 'manager' ? 'text-brand-600' : (view === 'quiz' && gameMode ? 'text-slate-400 hover:text-amber-300' : 'text-slate-500 hover:text-slate-800')}`}>題庫管理</button>
            <button onClick={() => dispatch({ type: 'set_view', view: 'guide' })} className={`font-medium text-sm ${view === 'guide' ? 'text-brand-600' : (view === 'quiz' && gameMode ? 'text-slate-400 hover:text-amber-300' : 'text-slate-500 hover:text-slate-800')}`}>AI 指引</button>
            <button onClick={() => dispatch({ type: 'set_view', view: 'social' })} className={`font-medium text-sm ${view === 'social' ? 'text-brand-600' : (view === 'quiz' && gameMode ? 'text-slate-400 hover:text-amber-300' : 'text-slate-500 hover:text-slate-800')}`}>社交</button>
            <button onClick={() => dispatch({ type: 'set_settings_open', isSettingsOpen: true })} className={`p-2 transition-colors ${view === 'quiz' && gameMode ? 'text-slate-400 hover:text-amber-400' : 'text-slate-400 hover:text-brand-600'}`} aria-label="開啟設定"><Settings size={20} /></button>
            <div className={`h-4 w-px mx-2 ${view === 'quiz' && gameMode ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end">
                  <span className={`text-xs font-bold ${view === 'quiz' && gameMode ? 'text-amber-200' : 'text-slate-700'}`}>{user.user_metadata.full_name || user.email}</span>
                  <button onClick={signOut} className="text-[10px] text-red-500 hover:text-red-600 font-bold uppercase tracking-tight">登出</button>
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${view === 'quiz' && gameMode ? 'bg-slate-800 text-amber-400 border-slate-600' : 'bg-slate-100 text-slate-500 border-slate-200'}`}><UserIcon size={18} /></div>
              </div>
            ) : (
              <button onClick={() => dispatch({ type: 'set_guest_mode', guestMode: false })} className={`text-sm font-bold ${view === 'quiz' && gameMode ? 'text-amber-400 hover:text-amber-300' : 'text-brand-600 hover:text-brand-500'}`}>登入雲端</button>
            )}
          </nav>
        </div>
      </header>
      <main className={`flex-1 max-w-6xl w-full mx-auto p-4 md:p-8 pb-24 md:pb-8 relative z-10 ${view === 'quiz' && gameMode ? 'backdrop-blur-sm bg-black/30 md:rounded-b-2xl' : ''}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            variants={animationVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <QuizProvider startChallengeQuiz={startChallengeQuiz}>
              {renderContent()}
            </QuizProvider>
          </motion.div>
        </AnimatePresence>
      </main>
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-2 flex justify-around z-50 safe-area-bottom">
        <button onClick={() => dispatch({ type: 'set_view', view: 'dashboard' })} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${view === 'dashboard' ? 'text-brand-600 bg-brand-50' : 'text-slate-400 hover:text-slate-600'}`}><LayoutDashboard size={20} /><span className="text-[10px] font-medium">首頁</span></button>
        <button onClick={() => dispatch({ type: 'set_view', view: 'manager' })} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${view === 'manager' ? 'text-brand-600 bg-brand-50' : 'text-slate-400 hover:text-slate-600'}`}><Settings size={20} /><span className="text-[10px] font-medium">管理</span></button>
        <button onClick={() => dispatch({ type: 'set_view', view: 'social' })} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${view === 'social' ? 'text-brand-600 bg-brand-50' : 'text-slate-400 hover:text-slate-600'}`}><Users size={20} /><span className="text-[10px] font-medium">社交</span></button>
        <button onClick={() => dispatch({ type: 'set_view', view: 'guide' })} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${view === 'guide' ? 'text-brand-600 bg-brand-50' : 'text-slate-400 hover:text-slate-600'}`}><FileText size={20} /><span className="text-[10px] font-medium">指引</span></button>
      </div>
    </div>
  );
};

export default App;
