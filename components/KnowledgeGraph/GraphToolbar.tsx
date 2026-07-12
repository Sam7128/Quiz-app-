import React, { useState } from 'react';
import {
  Plus, Trash2, Download, Upload, Undo2, Redo2, Eye,
  ZoomIn, ZoomOut, Maximize2, Link, StickyNote, Search, FileText, Settings, Code
} from 'lucide-react';
import type { ReadingMode } from '@/types/graphTypes';

interface GraphToolbarProps {
  readingMode: ReadingMode;
  editMode: 'visual' | 'code';
  onToggleEditMode: () => void;
  onAddNode: () => void;
  onAddSticky: () => void;
  onDeleteSelected: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onToggleReadingMode: () => void;
  onExportMermaid: () => void;
  onImportMermaid: () => void;
  readOnly?: boolean;
  connectMode: boolean;
  onToggleConnectMode: () => void;
  onToggleSidePanel: (panel: 'edit' | 'notes' | 'search') => void;
  activeSidePanel: 'edit' | 'notes' | 'search' | null;
  hasSelectedConcept: boolean;
}

export const GraphToolbar: React.FC<GraphToolbarProps> = ({
  readingMode,
  editMode,
  onToggleEditMode,
  onAddNode,
  onAddSticky,
  onDeleteSelected,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onZoomIn,
  onZoomOut,
  onFitView,
  onToggleReadingMode,
  onExportMermaid,
  onImportMermaid,
  readOnly = false,
  connectMode,
  onToggleConnectMode,
  onToggleSidePanel,
  activeSidePanel,
  hasSelectedConcept,
}) => {
  return (
    <div className="flex items-center gap-1 p-2 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex-wrap">
      {/* Edit tools */}
      {!readOnly && (
        <div className="flex items-center gap-1 mr-2">
          <ToolButton icon={Plus} label="新增節點" onClick={onAddNode} />
          <ToolButton icon={StickyNote} label="新增便利貼" onClick={onAddSticky} />
          <ToolButton icon={Trash2} label="刪除選取" onClick={onDeleteSelected} variant="danger" />
          <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1" />
          <button
            onClick={onToggleConnectMode}
            title={connectMode ? '連線模式（開啟）' : '連線模式（關閉）'}
            aria-label="連線模式切換"
            className={`p-1.5 rounded-lg transition-colors ${
              connectMode
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
            }`}
          >
            <Link size={16} />
          </button>
          <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1" />
          <ToolButton icon={Undo2} label="復原" onClick={onUndo} disabled={!canUndo} />
          <ToolButton icon={Redo2} label="重做" onClick={onRedo} disabled={!canRedo} />
        </div>
      )}

      {/* View tools */}
      <div className="flex items-center gap-1 mr-2">
        <ToolButton icon={ZoomIn} label="放大" onClick={onZoomIn} />
        <ToolButton icon={ZoomOut} label="縮小" onClick={onZoomOut} />
        <ToolButton icon={Maximize2} label="適應畫面" onClick={onFitView} />
      </div>

      {/* Reading mode */}
      <button
        onClick={onToggleReadingMode}
        className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
          readingMode === 'expand-all'
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
        }`}
        title={readingMode === 'expand-all' ? '全展開模式' : '逐步探索模式'}
      >
        <Eye size={14} />
        <span className="hidden sm:inline">{readingMode === 'expand-all' ? '全展開' : '逐步探索'}</span>
      </button>

      {/* Edit Mode Toggle */}
      <button
        onClick={onToggleEditMode}
        className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
          editMode === 'code'
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
        }`}
        title={editMode === 'code' ? '視覺編輯模式' : '代碼編輯模式'}
      >
        <Code size={14} />
        <span className="hidden sm:inline">{editMode === 'code' ? '代碼模式' : '視覺模式'}</span>
      </button>

      {/* Notes & Search Panel Controls */}
      <div className="flex items-center gap-1 ml-2">
        <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1" />
        <button
          onClick={() => onToggleSidePanel('search')}
          title="搜尋與管理筆記"
          aria-label="搜尋與管理筆記"
          className={`p-1.5 rounded-lg transition-colors ${
            activeSidePanel === 'search'
              ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
              : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
          }`}
        >
          <Search size={16} />
        </button>
        <button
          onClick={() => onToggleSidePanel('notes')}
          disabled={!hasSelectedConcept}
          title={hasSelectedConcept ? '編輯節點筆記' : '請先選擇一個概念節點來編輯筆記'}
          aria-label="編輯節點筆記"
          className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
            activeSidePanel === 'notes'
              ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
              : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
          }`}
        >
          <FileText size={16} />
        </button>
        {hasSelectedConcept && (
          <button
            onClick={() => onToggleSidePanel('edit')}
            title="編輯節點屬性"
            aria-label="編輯節點屬性"
            className={`p-1.5 rounded-lg transition-colors ${
              activeSidePanel === 'edit' || !activeSidePanel
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
            }`}
          >
            <Settings size={16} />
          </button>
        )}
      </div>

      {/* Mermaid */}
      <div className="flex items-center gap-1 ml-auto">
        <ToolButton icon={Download} label="匯出 Mermaid" onClick={onExportMermaid} />
        {!readOnly && (
          <ToolButton icon={Upload} label="匯入 Mermaid" onClick={onImportMermaid} />
        )}
      </div>
    </div>
  );
};

// Reusable toolbar button
interface ToolButtonProps {
  icon: React.FC<{ size?: number }>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'danger';
}

const ToolButton: React.FC<ToolButtonProps> = ({ icon: Icon, label, onClick, disabled, variant = 'default' }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={label}
    aria-label={label}
    className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
      variant === 'danger'
        ? 'hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500'
        : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
    }`}
  >
    <Icon size={16} />
  </button>
);
