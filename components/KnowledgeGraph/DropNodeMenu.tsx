import React, { useEffect } from 'react';
import { Diamond, StickyNote, Square, Squircle, X } from 'lucide-react';

export type DropNodeType = 'concept' | 'rounded' | 'diamond' | 'sticky';

interface DropNodeMenuProps {
  clientX: number;
  clientY: number;
  onSelect: (type: DropNodeType) => void;
  onClose: () => void;
}

const MENU_WIDTH = 176;
const MENU_HEIGHT = 248;

export const DropNodeMenu: React.FC<DropNodeMenuProps> = ({ clientX, clientY, onSelect, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const top = Math.max(8, Math.min(clientY, window.innerHeight - MENU_HEIGHT));
  const left = Math.max(8, Math.min(clientX, window.innerWidth - MENU_WIDTH));

  const options: Array<{ type: DropNodeType; label: string; icon: React.FC<{ size?: number; className?: string }>; className: string }> = [
    { type: 'concept', label: '方形（新概念）', icon: Square, className: 'text-slate-600' },
    { type: 'rounded', label: '圓角（新概念）', icon: Squircle, className: 'text-blue-600' },
    { type: 'diamond', label: '菱形（新概念）', icon: Diamond, className: 'text-purple-600' },
    { type: 'sticky', label: '便利貼（備忘）', icon: StickyNote, className: 'text-amber-600' },
  ];

  return (
    <div
      className="fixed inset-0 z-50"
      role="presentation"
      onPointerDown={onClose}
    >
      <div
        className="absolute bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl py-1 w-44 text-sm"
        style={{ top, left }}
        role="menu"
        aria-label="新增節點並連線"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="px-3 py-1 text-xs text-slate-400 font-medium border-b border-slate-100 dark:border-slate-700 mb-1">
          新增節點並連線
        </div>
        {options.map(({ type, label, icon: Icon, className }) => (
          <button
            key={type}
            type="button"
            role="menuitem"
            onClick={() => onSelect(type)}
            className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-2"
          >
            <Icon size={15} className={className} />
            {label}
            {type === 'concept' && <span className="sr-only">概念 (新概念)</span>}
          </button>
        ))}
        <button
          type="button"
          onClick={onClose}
          className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-red-500 dark:text-red-400 border-t border-slate-100 dark:border-slate-700 mt-1 flex items-center gap-2"
        >
          <X size={14} />
          取消
        </button>
      </div>
    </div>
  );
};
