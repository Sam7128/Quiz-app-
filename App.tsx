import React, { useState, useEffect, useMemo } from 'react';
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
import { DEFAULT_QUESTIONS, APP_NAME } from './constants';
import { Dashboard } from './components/Dashboard';
import { QuizCard } from './components/QuizCard';
import { BankManager } from './components/BankManager';
import { AIPromptGuide } from './components/AIPromptGuide';
import { BrainCircuit, LayoutDashboard, FileText, Settings, X, RotateCcw } from 'lucide-react';

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
  const [view, setView] = useState<AppView>('dashboard');
  
  // Bank Management State
  const [banks, setBanks] = useState<BankMetadata[]>([]);
  const [editingBankId, setEditingBankId] = useState<string | null>(null); // For Bank Manager
  
  // Quiz Selection State
  const [selectedQuizBankIds, setSelectedQuizBankIds] = useState<string[]>([]);
  
  // Data State
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

  // Initialization: Load Banks
  useEffect(() => {
    const loadedBanks = getBanksMeta();
    setBanks(loadedBanks);

    let defaultBankId = getCurrentBankId();

    // If no banks exist, create a default one
    if (loadedBanks.length === 0) {
      const defaultBank = createBank('預設題庫 (Default)');
      saveQuestions(defaultBank.id, DEFAULT_QUESTIONS);
      defaultBankId = defaultBank.id;
      setBanks([defaultBank]);
    } else if (!defaultBankId || !loadedBanks.find(b => b.id === defaultBankId)) {
      defaultBankId = loadedBanks[0].id;
    }

    // Set initial states
    if (defaultBankId) {
      setEditingBankId(defaultBankId);
      setCurrentBankId(defaultBankId);
      // By default, select the current/default bank for quizzing
      setSelectedQuizBankIds([defaultBankId]);
    }
  }, []);

  // Refresh banks helper
  const refreshBanksData = () => {
    const latestBanks = getBanksMeta();
    setBanks(latestBanks);
    // Sanitize selected IDs (remove deleted banks from selection)
    setSelectedQuizBankIds(prev => prev.filter(id => latestBanks.find(b => b.id === id)));
  };

  // Compute Questions based on selection
  const quizPoolQuestions = useMemo(() => {
    return selectedQuizBankIds.flatMap(id => getQuestions(id));
  }, [selectedQuizBankIds, banks]); // Reload when selection changes or banks are updated

  // Compute Editing Questions based on editingBankId
  const editingQuestions = useMemo(() => {
    return editingBankId ? getQuestions(editingBankId) : [];
  }, [editingBankId, banks]);

  // Update logs and banks when view changes to Dashboard
  useEffect(() => {
    if (view === 'dashboard') {
      setMistakeLog(getMistakeLog());
      refreshBanksData();
    }
  }, [view]);

  // --- Actions ---

  const handleEditingBankChange = (id: string) => {
    setEditingBankId(id);
    setCurrentBankId(id);
  };

  const handleToggleQuizBank = (id: string) => {
    setSelectedQuizBankIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(b => b !== id);
      }
      return [...prev, id];
    });
  };

  const startQuiz = (count: number, mode: 'random' | 'mistake' = 'random') => {
    let pool: Question[] = [];

    if (mode === 'mistake') {
      // For mistake mode, intersect with selected banks
      const log = getMistakeLog();
      const mistakeIds = Object.keys(log);
      pool = quizPoolQuestions.filter(q => mistakeIds.includes(String(q.id)));
    } else {
      pool = quizPoolQuestions;
    }

    if (pool.length === 0) {
      alert("目前選擇的範圍沒有題目！");
      return;
    }

    const shuffled = shuffleArray(pool).slice(0, count);
    
    setQuizState({
      currentQuestionIndex: 0,
      score: 0,
      totalQuestions: shuffled.length,
      isFinished: false,
      activeQuestions: shuffled,
      mode: mode
    });
    setView(mode === 'mistake' ? 'mistakes' : 'quiz');
  };

  const handleAnswer = (isCorrect: boolean, selectedAnswer: string | string[]) => {
    const currentQ = quizState.activeQuestions[quizState.currentQuestionIndex];
    
    if (isCorrect) {
      setQuizState(prev => ({ ...prev, score: prev.score + 1 }));
      if (quizState.mode === 'mistake') {
        removeMistake(currentQ.id);
      }
    } else {
      const wrongAnswerStr = Array.isArray(selectedAnswer) 
        ? selectedAnswer.join(', ') 
        : selectedAnswer;
      logMistake(currentQ.id, wrongAnswerStr);
    }
  };

  const nextQuestion = () => {
    if (quizState.currentQuestionIndex < quizState.totalQuestions - 1) {
      setQuizState(prev => ({ ...prev, currentQuestionIndex: prev.currentQuestionIndex + 1 }));
    } else {
      setQuizState(prev => ({ ...prev, isFinished: true }));
    }
  };

  // Called by BankManager when it updates the *Editing* bank (e.g. imports)
  const handleUpdateQuestions = (newQuestions: Question[]) => {
    refreshBanksData();
  };

  // --- Render Helpers ---

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
              <p className="text-slate-500 mb-8">
                你在 {quizState.totalQuestions} 題中答對了 {quizState.score} 題
              </p>
              <div className="space-y-3">
                <button 
                  onClick={() => startQuiz(quizState.totalQuestions, quizState.mode)}
                  className="w-full flex items-center justify-center gap-2 bg-brand-600 text-white py-3 rounded-xl font-medium hover:bg-brand-500 transition-colors"
                >
                  <RotateCcw size={18} /> 再試一次
                </button>
                <button 
                  onClick={() => setView('dashboard')}
                  className="w-full py-3 text-slate-600 hover:text-slate-800 font-medium transition-colors"
                >
                  返回首頁
                </button>
              </div>
            </div>
          </div>
        );
      }

      if (quizState.activeQuestions.length === 0) return <div>載入中...</div>;

      return (
        <div className="py-4">
           <div className="max-w-2xl mx-auto mb-8 flex items-center gap-4">
              <button onClick={() => setView('dashboard')} className="p-2 rounded-full hover:bg-slate-200 text-slate-500">
                <X size={20} />
              </button>
              <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-brand-500 transition-all duration-500 ease-out"
                  style={{ width: `${((quizState.currentQuestionIndex + 1) / quizState.totalQuestions) * 100}%` }}
                />
              </div>
              <span className="text-xs font-bold text-slate-500 min-w-[3rem]">
                {quizState.currentQuestionIndex + 1} / {quizState.totalQuestions}
              </span>
           </div>

           <QuizCard 
             question={quizState.activeQuestions[quizState.currentQuestionIndex]}
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
          onUpdateQuestions={handleUpdateQuestions} 
          onRefreshBanks={refreshBanksData}
        />;
      case 'guide':
        return <AIPromptGuide />;
      default:
        return <div>Not Found</div>;
    }
  };

  const navItemClass = (item: AppView) => 
    `flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${view === item ? 'text-brand-600 bg-brand-50' : 'text-slate-400 hover:text-slate-600'}`;

  // Find current bank name for header (Show Context based on View)
  let headerTitle = "";
  if (view === 'manager') {
    headerTitle = banks.find(b => b.id === editingBankId)?.name || '管理題庫';
  } else if (view === 'dashboard') {
     headerTitle = selectedQuizBankIds.length > 1 ? `已選 ${selectedQuizBankIds.length} 個題庫` : (banks.find(b => b.id === selectedQuizBankIds[0])?.name || '');
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('dashboard')}>
            <div className="bg-brand-600 text-white p-1.5 rounded-lg">
              <BrainCircuit size={24} />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg text-slate-800 leading-none">{APP_NAME}</span>
              {headerTitle && (
                <span className="text-[10px] text-slate-500 font-medium">{headerTitle}</span>
              )}
            </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-6">
            <button onClick={() => setView('dashboard')} className={`font-medium text-sm ${view === 'dashboard' ? 'text-brand-600' : 'text-slate-500 hover:text-slate-800'}`}>首頁</button>
            <button onClick={() => setView('manager')} className={`font-medium text-sm ${view === 'manager' ? 'text-brand-600' : 'text-slate-500 hover:text-slate-800'}`}>題庫管理</button>
            <button onClick={() => setView('guide')} className={`font-medium text-sm ${view === 'guide' ? 'text-brand-600' : 'text-slate-500 hover:text-slate-800'}`}>AI 指引</button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-8">
        {renderContent()}
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-2 flex justify-around z-50 safe-area-bottom">
        <button onClick={() => setView('dashboard')} className={navItemClass('dashboard')}>
          <LayoutDashboard size={20} />
          <span className="text-[10px] font-medium">首頁</span>
        </button>
        <button onClick={() => setView('manager')} className={navItemClass('manager')}>
          <Settings size={20} />
          <span className="text-[10px] font-medium">管理</span>
        </button>
        <button onClick={() => setView('guide')} className={navItemClass('guide')}>
          <FileText size={20} />
          <span className="text-[10px] font-medium">指引</span>
        </button>
      </div>

    </div>
  );
};

export default App;