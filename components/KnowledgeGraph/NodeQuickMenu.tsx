import React, { useEffect, useState } from 'react';
import { NodeToolbar, Position } from '@xyflow/react';
import { Circle, Cloud, Diamond, Hexagon, Pencil, Plus, RectangleHorizontal, Shapes, Square, Trash2 } from 'lucide-react';
import type { NodeShapeType } from '@/types/graphTypes';

export interface NodeQuickActions {
  select: () => void;
  edit: () => void;
  delete: () => void;
  addChild?: () => void;
  changeShape?: (shape: NodeShapeType) => void;
}

interface NodeQuickMenuProps {
  selected: boolean;
  shape?: NodeShapeType;
  actions?: NodeQuickActions;
}

const SHAPES: ReadonlyArray<{ value: NodeShapeType; label: string; icon: React.FC<{ size?: number }> }> = [
  { value: 'concept', label: '矩形', icon: RectangleHorizontal },
  { value: 'square', label: '方形', icon: Square },
  { value: 'rounded', label: '圓角', icon: RectangleHorizontal },
  { value: 'pill', label: '膠囊', icon: RectangleHorizontal },
  { value: 'circle', label: '圓形', icon: Circle },
  { value: 'diamond', label: '菱形', icon: Diamond },
  { value: 'hexagon', label: '六角形', icon: Hexagon },
  { value: 'cloud', label: '雲形', icon: Cloud },
];

export const NodeQuickMenu: React.FC<NodeQuickMenuProps> = ({ selected, shape, actions }) => {
  const [showShapes, setShowShapes] = useState(false);
  useEffect(() => {
    if (!selected) setShowShapes(false);
  }, [selected]);
  if (!actions) return null;

  return (
    <NodeToolbar isVisible={selected} position={Position.Top} offset={12} className="nodrag nopan">
      <div className="relative flex items-center gap-1 rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
        {showShapes && actions.changeShape && (
          <div className="absolute bottom-full left-1/2 mb-2 grid w-56 -translate-x-1/2 grid-cols-4 gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900" role="menu" aria-label="選擇節點形狀">
            {SHAPES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                role="menuitem"
                onClick={() => { actions.changeShape?.(value); setShowShapes(false); }}
                className={`flex aspect-square items-center justify-center rounded-xl transition-colors ${shape === value ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}
                title={label}
                aria-label={label}
              >
                <Icon size={22} />
              </button>
            ))}
          </div>
        )}
        <button type="button" onClick={actions.edit} className="rounded-xl p-2 text-slate-700 hover:bg-cyan-50 hover:text-cyan-700 dark:text-slate-200 dark:hover:bg-slate-800" title="編輯節點" aria-label="編輯節點"><Pencil size={17} /></button>
        {actions.changeShape && <button type="button" onClick={() => setShowShapes((open) => !open)} className={`rounded-xl p-2 ${showShapes ? 'bg-slate-800 text-white dark:bg-cyan-600' : 'text-slate-700 hover:bg-cyan-50 hover:text-cyan-700 dark:text-slate-200 dark:hover:bg-slate-800'}`} title="改變形狀" aria-label="改變形狀"><Shapes size={18} /></button>}
        {actions.addChild && <button type="button" onClick={actions.addChild} className="rounded-xl p-2 text-slate-700 hover:bg-cyan-50 hover:text-cyan-700 dark:text-slate-200 dark:hover:bg-slate-800" title="新增子節點" aria-label="新增子節點"><Plus size={19} /></button>}
        <button type="button" onClick={actions.delete} className="rounded-xl p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40" title="刪除節點" aria-label="刪除節點"><Trash2 size={18} /></button>
      </div>
    </NodeToolbar>
  );
};
