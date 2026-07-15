import React, { useState } from 'react';
import { Plus, Trash2, Edit3, Clock, FileText, ChevronRight } from 'lucide-react';
import type { GraphDocument } from '@/types/graphTypes';
import { GRAPH_LIMITS } from '@/types/graphTypes';

interface GraphListProps {
  graphs: GraphDocument[];
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
}

export const GraphList: React.FC<GraphListProps> = ({
  graphs, onSelect, onCreate, onDelete, onRename,
}) => {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const handleStartRename = (id: string, currentName: string) => {
    setRenamingId(id);
    setRenameValue(currentName);
  };

  const handleFinishRename = (id: string) => {
    const trimmed = renameValue.trim();
    onRename(id, trimmed.slice(0, GRAPH_LIMITS.NAME_MAX));
    setRenamingId(null);
  };

  const canCreate = graphs.length < GRAPH_LIMITS.MAX_GRAPHS;

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">知識圖工作區</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {graphs.length}/{GRAPH_LIMITS.MAX_GRAPHS} 張圖表
          </p>
        </div>
        <button
          onClick={onCreate}
          disabled={!canCreate}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm shadow-md"
        >
          <Plus size={16} /> 新建圖表
        </button>
      </div>

      {!canCreate && (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-700 dark:text-amber-400">
          已達圖表上限（{GRAPH_LIMITS.MAX_GRAPHS} 張），請刪除舊圖表後再建立新圖表。
        </div>
      )}

      {graphs.length === 0 ? (
        <div className="text-center py-16 text-slate-400 dark:text-slate-500">
          <FileText size={48} className="mx-auto mb-4 opacity-50" />
          <p className="font-medium">尚未建立任何知識圖</p>
          <p className="text-sm mt-1">點擊「新建圖表」開始第一張知識圖</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {graphs.map((graph) => (
            <div
              key={graph.id}
              className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-brand-300 dark:hover:border-brand-600 transition-colors group cursor-pointer"
              onClick={() => renamingId !== graph.id && onSelect(graph.id)}
            >
              <div className="flex-1 min-w-0">
                {renamingId === graph.id ? (
                  <input
                    autoFocus
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value.slice(0, GRAPH_LIMITS.NAME_MAX))}
                    onBlur={() => handleFinishRename(graph.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleFinishRename(graph.id);
                      if (e.key === 'Escape') setRenamingId(null);
                    }}
                    className="w-full px-2 py-1 text-sm font-semibold border border-brand-400 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <p
                    className="text-sm font-semibold text-slate-800 dark:text-white truncate cursor-text"
                    onDoubleClick={(e) => { e.stopPropagation(); handleStartRename(graph.id, graph.name); }}
                    title="雙擊可重新命名"
                  >
                    {graph.name}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 dark:text-slate-500">
                  <span>{graph.nodes.length} 節點</span>
                  <span>{graph.edges.length} 連線</span>
                  <span className="flex items-center gap-1">
                    <Clock size={10} />
                    {new Date(graph.updatedAt).toLocaleDateString('zh-TW')}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); handleStartRename(graph.id, graph.name); }}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                  title="重新命名"
                  aria-label="重新命名圖表"
                >
                  <Edit3 size={14} className="text-slate-400" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`確定要刪除圖表「${graph.name}」嗎？此操作無法復原。`)) {
                      onDelete(graph.id);
                    }
                  }}
                  className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                  title="刪除"
                  aria-label="刪除圖表"
                >
                  <Trash2 size={14} className="text-red-400" />
                </button>
              </div>
              <ChevronRight size={16} className="text-slate-300 dark:text-slate-600" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
