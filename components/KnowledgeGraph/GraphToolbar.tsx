import React, { useRef, useState } from 'react';
import {
  Plus, Trash2, Download, Upload, Undo2, Redo2, Eye,
  ZoomIn, ZoomOut, Maximize2, Link, StickyNote, Search, FileText, Settings, Code,
  Layers, Palette, ImagePlus, Orbit, MousePointer2
} from 'lucide-react';
import type { ReadingMode, BackgroundOpacity, LayoutMode, GraphThemePresetId } from '@/types/graphTypes';
import { GRAPH_THEME_PRESETS } from '@/constants/graphThemes';

interface GraphToolbarProps {
  readingMode: ReadingMode;
  editMode: 'visual' | 'code';
  onToggleEditMode: () => void;
  onAddNode: () => void;
  onAddSticky: () => void;
  onAddImage: (file: File) => void;
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
  bgOpacity: BackgroundOpacity;
  onToggleBgOpacity: () => void;
  layoutMode: LayoutMode;
  onSelectLayoutMode: (mode: LayoutMode) => void;
  theme: GraphThemePresetId;
  onApplyTheme: (theme: GraphThemePresetId) => void;
}

export const GraphToolbar: React.FC<GraphToolbarProps> = ({
  readingMode,
  editMode,
  onToggleEditMode,
  onAddNode,
  onAddSticky,
  onAddImage,
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
  bgOpacity,
  onToggleBgOpacity,
  layoutMode,
  onSelectLayoutMode,
  theme,
  onApplyTheme,
}) => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [showThemes, setShowThemes] = useState(false);
  return (
    <div className="flex items-center gap-1 p-2 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex-wrap">
      {/* Edit tools */}
      {!readOnly && (
        <div className="flex items-center gap-1 mr-2">
          <ToolButton icon={Plus} label="新增節點" onClick={onAddNode} />
          <ToolButton icon={StickyNote} label="新增便利貼" onClick={onAddSticky} />
          <ToolButton icon={ImagePlus} label="上傳參考圖片" onClick={() => imageInputRef.current?.click()} />
          <input
            ref={imageInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onAddImage(file);
              event.target.value = '';
            }}
          />
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

          {/* Layout & theme presets */}
          <div className="flex items-center rounded-lg bg-slate-100 p-0.5 text-[11px] dark:bg-slate-700" aria-label="版面配置模式">
            <button type="button" onClick={() => onSelectLayoutMode('free')} className={`flex items-center gap-1 rounded-md px-2 py-1 ${layoutMode === 'free' ? 'bg-white text-cyan-700 shadow-sm dark:bg-slate-900 dark:text-cyan-300' : 'text-slate-500 dark:text-slate-300'}`} title="自由拖曳模式"><MousePointer2 size={13} />自由</button>
            <button type="button" onClick={() => onSelectLayoutMode('radial')} className={`flex items-center gap-1 rounded-md px-2 py-1 ${layoutMode === 'radial' ? 'bg-white text-cyan-700 shadow-sm dark:bg-slate-900 dark:text-cyan-300' : 'text-slate-500 dark:text-slate-300'}`} title="智慧放射排版"><Orbit size={13} />放射</button>
          </div>
          <div className="relative">
            <button type="button" onClick={() => setShowThemes((open) => !open)} className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700" title="配色模板" aria-label="配色模板"><Palette size={16} /></button>
            {showThemes && (
              <div className="absolute left-0 top-full z-50 mt-2 grid w-72 grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-700 dark:bg-slate-900" role="menu" aria-label="配色模板清單">
                {GRAPH_THEME_PRESETS.map((preset) => (
                  <button key={preset.id} type="button" role="menuitem" onClick={() => { onApplyTheme(preset.id); setShowThemes(false); }} className={`overflow-hidden rounded-xl border text-left transition-transform hover:-translate-y-0.5 ${theme === preset.id ? 'border-cyan-500 ring-2 ring-cyan-200 dark:ring-cyan-900' : 'border-slate-200 dark:border-slate-700'}`}>
                    <span className="flex h-4">{preset.colors.slice(0, 4).map((color) => <span key={color} className="flex-1" style={{ backgroundColor: color }} />)}</span>
                    <span className="block px-2 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200">{preset.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
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

      {/* bgOpacity Toggle */}
      <button
        onClick={onToggleBgOpacity}
        className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors mr-1.5 ${
          bgOpacity === 'solid'
            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
        }`}
        title={bgOpacity === 'solid' ? '純色底色（約 80% 主題色）' : '半透明底色'}
      >
        <Layers size={14} />
        <span className="hidden sm:inline">{bgOpacity === 'solid' ? '純色' : '半透明'}</span>
      </button>

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
        className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ml-1.5 ${
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
