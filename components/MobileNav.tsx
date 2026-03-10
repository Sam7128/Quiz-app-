import React from 'react';
import { AppView } from '../types';
import { LayoutDashboard, Settings, Users, FileText, LucideIcon, GitFork } from 'lucide-react';
import { getUserSettings } from '../services/storage';

interface MobileNavProps {
  view: AppView;
  onNavigate: (view: AppView) => void;
  onOpenSettings: () => void;
}

type NavItem =
  | { id: AppView; label: string; icon: LucideIcon }
  | { id: '__settings__'; label: string; icon: LucideIcon; isAction: true };

const BASE_MOBILE_NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: '首頁', icon: LayoutDashboard },
  { id: 'manager', label: '管理', icon: Settings },
  { id: '__settings__' as const, label: '設定', icon: Settings, isAction: true },
  { id: 'social', label: '社交', icon: Users },
  { id: 'guide', label: '指引', icon: FileText },
];

function getMobileNavItems(): NavItem[] {
  const settings = getUserSettings();
  if (settings.betaFeatures?.knowledgeGraph) {
    return [...BASE_MOBILE_NAV_ITEMS, { id: 'graph' as AppView, label: '🧠 知識圖', icon: GitFork }];
  }
  return BASE_MOBILE_NAV_ITEMS;
}

export const MobileNav: React.FC<MobileNavProps> = ({ view, onNavigate, onOpenSettings }) => {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-2 flex justify-around z-50 safe-area-bottom">
      {getMobileNavItems().map(item => (
        <button
          key={item.id}
          onClick={(e) => {
            if ('isAction' in item) {
              e.currentTarget.blur();
              onOpenSettings();
            } else {
              onNavigate(item.id);
            }
          }}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${view === item.id && !('isAction' in item)
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
