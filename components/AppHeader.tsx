import React from 'react';
import { AppView } from '../types';
import { User } from '@supabase/supabase-js';
import { BrainCircuit, LayoutDashboard, Settings, Users, Sparkles, User as UserIcon, LucideIcon } from 'lucide-react';

interface AppHeaderProps {
  view: AppView;
  gameMode: boolean;
  user: User | null;
  banks: { id: string; name: string }[];
  editingBankId: string | null;
  selectedQuizBankIds: string[];
  onNavigate: (view: AppView) => void;
  onOpenSettings: () => void;
  onSignOut: () => void;
  onLoginRedirect: () => void;
}

const NAV_ITEMS: { id: AppView; label: string; icon: LucideIcon }[] = [
  { id: 'dashboard', label: '首頁', icon: LayoutDashboard },
  { id: 'manager', label: '題庫', icon: BrainCircuit },
  { id: 'guide', label: 'AI 指引', icon: Sparkles },
  { id: 'social', label: '社群', icon: Users },
];

export const AppHeader: React.FC<AppHeaderProps> = ({
  view, gameMode, user, banks, editingBankId, selectedQuizBankIds,
  onNavigate, onOpenSettings, onSignOut, onLoginRedirect
}) => {
  const isGameQuiz = view === 'quiz' && gameMode;

  const subtitle = view === 'manager'
    ? (banks.find(b => b.id === editingBankId)?.name || '管理題庫')
    : (selectedQuizBankIds.length > 1
      ? `已選 ${selectedQuizBankIds.length} 個題庫`
      : banks.find(b => b.id === selectedQuizBankIds[0])?.name || '');

  return (
    <header className={`transition-all duration-300 z-50 ${isGameQuiz
      ? 'sticky top-0 bg-slate-900/90 border-b border-slate-700 backdrop-blur-md'
      : 'fixed top-4 left-4 right-4 md:left-8 md:right-8 bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-lg shadow-black/5 dark:shadow-black/20 rounded-2xl'
      }`}>
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => onNavigate('dashboard')}>
          <div className={`p-2 rounded-xl transition-transform group-hover:scale-110 shadow-lg ${isGameQuiz ? 'bg-amber-600 shadow-amber-900/20' : 'bg-gradient-to-br from-brand-500 to-accent-600 shadow-brand-500/30'}`}>
            <BrainCircuit size={20} className="text-white" />
          </div>
          <div className="flex flex-col">
            <span className={`font-bold text-lg leading-none tracking-tight ${isGameQuiz ? 'text-amber-100' : 'text-slate-800 dark:text-white'}`}>
              Mind<span className={isGameQuiz ? '' : 'text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-accent-500'}>Spark</span>
            </span>
            <span className={`text-[10px] font-medium truncate max-w-[150px] ${isGameQuiz ? 'text-amber-400/80' : 'text-slate-500 dark:text-slate-400'}`}>
              {subtitle}
            </span>
          </div>
        </div>
        <nav className="hidden md:flex items-center gap-2">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200 ${view === item.id
                ? (isGameQuiz ? 'text-amber-400 bg-amber-950/30' : 'text-brand-600 dark:text-white bg-brand-50 dark:bg-white/10 shadow-sm')
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
            >
              <item.icon size={16} className={view === item.id ? 'stroke-[2.5px]' : ''} />
              {item.label}
            </button>
          ))}

          <div className={`h-6 w-px mx-2 ${isGameQuiz ? 'bg-slate-700' : 'bg-slate-200 dark:bg-white/10'}`}></div>

          <button
            onClick={onOpenSettings}
            className={`p-2 rounded-xl transition-all ${isGameQuiz ? 'text-slate-400 hover:text-amber-400 hover:bg-amber-950/30' : 'text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-white/10'}`}
            aria-label="開啟設定"
          >
            <Settings size={20} />
          </button>

          {user ? (
            <div className="flex items-center gap-3 pl-2">
              <div className="flex flex-col items-end">
                <span className={`text-xs font-bold ${isGameQuiz ? 'text-amber-200' : 'text-slate-700 dark:text-slate-200'}`}>{user.user_metadata.full_name || user.email?.split('@')[0]}</span>
                <button onClick={onSignOut} className="text-[10px] text-red-500 hover:text-red-600 font-bold uppercase tracking-tight">登出</button>
              </div>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 shadow-sm ${isGameQuiz ? 'bg-slate-800 text-amber-400 border-slate-600' : 'bg-gradient-to-br from-slate-100 to-white dark:from-slate-800 dark:to-slate-700 text-slate-500 dark:text-slate-300 border-white dark:border-slate-600'}`}>
                <UserIcon size={18} />
              </div>
            </div>
          ) : (
            <button
              onClick={onLoginRedirect}
              className={`ml-2 px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-brand-500/20 transition-all hover:scale-105 active:scale-95 ${isGameQuiz ? 'bg-amber-600 text-white hover:bg-amber-500' : 'bg-gradient-to-r from-brand-600 to-accent-600 text-white hover:from-brand-500 hover:to-accent-500'}`}
            >
              登入雲端
            </button>
          )}
        </nav>
      </div>
    </header>
  );
};
