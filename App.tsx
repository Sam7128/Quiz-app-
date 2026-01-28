import React, { useState, useEffect } from 'react';
import { AppView, Question, QuizState, BankMetadata } from './types';
import { 
  getQuestions, 
  saveQuestions, 
  getMistakeLog, 
  logMistake, 
  removeMistake,
  getBanksMeta,
  getCurrentBankId,
  setCurrentBankId,
  createBank
} from './services/storage';
import { 
    getCloudBanks, 
    getCloudQuestions, 
    syncLocalToCloud 
} from './services/cloudStorage';
import { DEFAULT_QUESTIONS, APP_NAME } from './constants';
import { Dashboard } from './components/Dashboard';
import { QuizCard } from './components/QuizCard';
import { BankManager } from './components/BankManager';
import { AIPromptGuide } from './components/AIPromptGuide';
import { Login } from './components/Login';
import { useAuth } from './contexts/AuthContext';
import { BrainCircuit, LayoutDashboard, FileText, Settings, X, RotateCcw, User as UserIcon } from 'lucide-react';

// Fisher-Yates Shuffle
const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const App: React.FC = () => {
  const { user, loading, signOut } = useAuth();
  const [view, setView] = useState<AppView>('dashboard');
  const [guestMode, setGuestMode] = useState(false);
  
  // Bank Management State
  const [banks, setBanks] = useState<BankMetadata[]>([]);
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  
  // Data State
  const [selectedQuizBankIds, setSelectedQuizBankIds] = useState<string[]>([]);
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

  // Initialization: Auth & Initial Banks
  useEffect(() => {
    if (loading) return;

    const initData = async () => {
      let loadedBanks: BankMetadata[] = [];
      
      if (user) {
        loadedBanks = await getCloudBanks();
        const localMeta = getBanksMeta();
        if (localMeta.length > 0 && loadedBanks.length === 0) {
            if (window.confirm('偵測到您在本地端有題庫，但雲端是空的。是否要將本地題庫上傳至雲端同步？')) {
                await syncLocalToCloud(localMeta);
                loadedBanks = await getCloudBanks();
                localStorage.clear(); 
                alert('同步完成！');
            }
        }
      } else {
        loadedBanks = getBanksMeta();
      }

      setBanks(loadedBanks);

      let defaultId = getCurrentBankId();
      if (!defaultId || !loadedBanks.find(b => b.id === defaultId)) {
        defaultId = loadedBanks.length > 0 ? loadedBanks[0].id : null;
      }

      if (defaultId) {
        setEditingBankId(defaultId);
        setCurrentBankId(defaultId);
        setSelectedQuizBankIds([defaultId]);
      }
    };

    initData();
  }, [loading, user]);

  // Load Questions for Dashboard & Manager
  useEffect(() => {
    const loadQuestions = async () => {
        if (loading) return;

        // Load Quiz Pool
        const pool: Question[] = [];
        for (const id of selectedQuizBankIds) {
            const qs = user ? await getCloudQuestions(id) : getQuestions(id);
            pool.push(...qs);
        }
        setQuizPoolQuestions(pool);

        // Load Editing Bank
        if (editingBankId) {
            const qs = user ? await getCloudQuestions(editingBankId) : getQuestions(editingBankId);
            setEditingQuestions(qs);
        }
    };
    loadQuestions();
  }, [selectedQuizBankIds, editingBankId, user, loading, banks]);

  // Refresh helper
  const refreshBanksData = async () => {
    const latest = user ? await getCloudBanks() : getBanksMeta();
    setBanks(latest);
    setSelectedQuizBankIds(prev => prev.filter(id => latest.find(b => b.id === id)));
  };

  const handleEditingBankChange = (id: string) => {
    setEditingBankId(id);
    setCurrentBankId(id);
  };

  const handleToggleQuizBank = (id: string) => {
    setSelectedQuizBankIds(prev => prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]);
  };

  const startQuiz = async (count: number, mode: 'random' | 'mistake' | 'retry_session' = 'random', specificIds?: string[]) => {
    let pool: Question[] = [];

    // Fetch all questions from selected banks
    const allSelectedQuestions: Question[] = [];
    for (const id of selectedQuizBankIds) {
        const qs = user ? await getCloudQuestions(id) : getQuestions(id);
        allSelectedQuestions.push(...qs);
    }

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
    setView(mode === 'mistake' ? 'mistakes' : 'quiz');
  };

  const handleAnswer = (isCorrect: boolean, selectedAnswer: string | string[]) => {
    const currentQ = quizState.activeQuestions[quizState.currentQuestionIndex];
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
  };

  const nextQuestion = () => {
    if (quizState.currentQuestionIndex < quizState.totalQuestions - 1) {
      setQuizState(prev => ({ ...prev, currentQuestionIndex: prev.currentQuestionIndex + 1 }));
    } else {
      setQuizState(prev => ({ ...prev, isFinished: true }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <BrainCircuit className="text-brand-600 animate-pulse" size={48} />
          <p className="text-slate-400 font-medium animate-pulse">正在準備您的學習空間...</p>
        </div>
      </div>
    );
  }

  if (!user && !guestMode) return <Login onGuestMode={() => setGuestMode(true)} />;

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
                      <button onClick={() => setView('dashboard')} className="w-full py-3 text-slate-600 hover:text-slate-800 font-medium transition-colors">返回首頁</button>
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
          selectedBankIds={selectedQuizBankIds}
          onToggleBank={handleToggleQuizBank}
          onStartQuiz={(n) => startQuiz(Math.min(n, quizPoolQuestions.length), 'random')}
          onStartMistakes={() => startQuiz(20, 'mistake')} 
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
      default: return <div>Not Found</div>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('dashboard')}>
            <div className="bg-brand-600 text-white p-1.5 rounded-lg"><BrainCircuit size={24} /></div>
            <div className="flex flex-col">
              <span className="font-bold text-lg text-slate-800 leading-none">{APP_NAME}</span>
              <span className="text-[10px] text-slate-500 font-medium">
                {view === 'manager' ? (banks.find(b => b.id === editingBankId)?.name || '管理題庫') : (selectedQuizBankIds.length > 1 ? `已選 ${selectedQuizBankIds.length} 個題庫` : banks.find(b => b.id === selectedQuizBankIds[0])?.name || '')}
              </span>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <button onClick={() => setView('dashboard')} className={`font-medium text-sm ${view === 'dashboard' ? 'text-brand-600' : 'text-slate-500 hover:text-slate-800'}`}>首頁</button>
            <button onClick={() => setView('manager')} className={`font-medium text-sm ${view === 'manager' ? 'text-brand-600' : 'text-slate-500 hover:text-slate-800'}`}>題庫管理</button>
            <button onClick={() => setView('guide')} className={`font-medium text-sm ${view === 'guide' ? 'text-brand-600' : 'text-slate-500 hover:text-slate-800'}`}>AI 指引</button>
            <div className="h-4 w-px bg-slate-200 mx-2"></div>
            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end">
                  <span className="text-xs font-bold text-slate-700">{user.user_metadata.full_name || user.email}</span>
                  <button onClick={signOut} className="text-[10px] text-red-500 hover:text-red-600 font-bold uppercase tracking-tight">登出</button>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200"><UserIcon size={18} /></div>
              </div>
            ) : (
              <button onClick={() => setGuestMode(false)} className="text-sm font-bold text-brand-600 hover:text-brand-500">登入雲端</button>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-8 pb-24 md:pb-8">{renderContent()}</main>
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-2 flex justify-around z-50 safe-area-bottom">
        <button onClick={() => setView('dashboard')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${view === 'dashboard' ? 'text-brand-600 bg-brand-50' : 'text-slate-400 hover:text-slate-600'}`}><LayoutDashboard size={20} /><span className="text-[10px] font-medium">首頁</span></button>
        <button onClick={() => setView('manager')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${view === 'manager' ? 'text-brand-600 bg-brand-50' : 'text-slate-400 hover:text-slate-600'}`}><Settings size={20} /><span className="text-[10px] font-medium">管理</span></button>
        <button onClick={() => setView('guide')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${view === 'guide' ? 'text-brand-600 bg-brand-50' : 'text-slate-400 hover:text-slate-600'}`}><FileText size={20} /><span className="text-[10px] font-medium">指引</span></button>
      </div>
    </div>
  );
};

export default App;