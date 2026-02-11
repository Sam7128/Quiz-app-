import React from 'react';
import { AppView } from '../types';
import { LayoutDashboard, Settings, Users, FileText, LucideIcon } from 'lucide-react';

interface MobileNavProps {
  view: AppView;
  onNavigate: (view: AppView) => void;
}

const MOBILE_NAV_ITEMS: { id: AppView; label: string; icon: LucideIcon }[] = [
  { id: 'dashboard', label: '首頁', icon: LayoutDashboard },
  { id: 'manager', label: '管理', icon: Settings },
  { id: 'social', label: '社交', icon: Users },
  { id: 'guide', label: '指引', icon: FileText },
];

export const MobileNav: React.FC<MobileNavProps> = ({ view, onNavigate }) => {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-2 flex justify-around z-50 safe-area-bottom">
      {MOBILE_NAV_ITEMS.map(item => (
        <button
          key={item.id}
          onClick={() => onNavigate(item.id)}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
            view === item.id
              ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20'
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <item.icon size={20} />
          <span className="text-[10px] font-medium">{item.label}</span>
        </button>
      ))}
    </div>
  );
};
