import React, { useState, useCallback, useEffect } from 'react';
import type { GraphDocument } from '@/types/graphTypes';
import { getGraphs, saveGraph, deleteGraph, createNewGraph, validateGraphName } from '@/services/graphStorage';
import { getUserSettings } from '@/services/storage';
import { useToast } from '@/contexts/ToastContext';
import { GraphList } from './GraphList';
import { GraphEditor } from './GraphEditor';

const KnowledgeGraphWorkspace: React.FC = () => {
  const [graphs, setGraphs] = useState<GraphDocument[]>([]);
  const [selectedGraphId, setSelectedGraphId] = useState<string | null>(null);
  const [fatalError, setFatalError] = useState<unknown | null>(null);
  const toast = useToast();

  // Check beta enabled
  const settings = getUserSettings();
  const isEnabled = settings.betaFeatures?.knowledgeGraph ?? false;

  const safeLoadGraphs = useCallback(() => {
    try {
      setGraphs(getGraphs());
    } catch (err: unknown) {
      console.error('Fatal error loading graphs:', err);
      setFatalError(err);
    }
  }, []);

  // Load graphs on mount
  useEffect(() => {
    safeLoadGraphs();
  }, [safeLoadGraphs]);

  const handleCreate = useCallback(() => {
    const newGraph = createNewGraph();
    const result = saveGraph(newGraph);
    if (result.success) {
      safeLoadGraphs();
      setSelectedGraphId(newGraph.id);
    } else {
      toast.warning(result.error ?? '建立圖表失敗');
    }
  }, [toast, safeLoadGraphs]);

  const handleDelete = useCallback((id: string) => {
    const result = deleteGraph(id);
    if (result.success) {
      safeLoadGraphs();
      if (selectedGraphId === id) {
        setSelectedGraphId(null);
      }
    } else {
      toast.warning(result.error ?? '刪除圖表失敗');
    }
  }, [selectedGraphId, toast, safeLoadGraphs]);

  const handleRename = useCallback((id: string, name: string) => {
    let graph: GraphDocument | undefined;
    try {
      graph = getGraphs().find((g) => g.id === id);
    } catch (err: unknown) {
      setFatalError(err);
      return;
    }
    if (!graph) return;
    const validName = validateGraphName(name);
    const result = saveGraph({ ...graph, name: validName });
    if (result.success) {
      safeLoadGraphs();
    } else {
      toast.warning(result.error ?? '重新命名失敗');
    }
  }, [toast, safeLoadGraphs]);

  const handleBack = useCallback(() => {
    // Refresh graphs list to pick up any saves from editor
    safeLoadGraphs();
    setSelectedGraphId(null);
  }, [safeLoadGraphs]);

  if (fatalError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-2xl max-w-xl mx-auto my-12 shadow-sm">
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-red-600 dark:text-red-400 mb-6 animate-pulse">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">儲存空間損毀或容量超限</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-8 max-w-md leading-relaxed">
          系統在載入或更新圖表時發生致命錯誤。這可能是由於瀏覽器的 localStorage 儲存空間容量超限，或是資料結構已損毀。您可以先導出備份，然後重置儲存空間。
        </p>
        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          <button
            onClick={() => {
              const raw = localStorage.getItem('mindspark_graphs') || '';
              const blob = new Blob([raw], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'mindspark_backup.json';
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium rounded-xl text-sm transition-all shadow-sm transform hover:-translate-y-0.5"
          >
            導出備份 JSON
          </button>
          <button
            onClick={() => {
              localStorage.removeItem('mindspark_graphs');
              window.location.reload();
            }}
            className="px-6 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-medium rounded-xl text-sm transition-all shadow-sm transform hover:-translate-y-0.5"
          >
            清空資料並重置
          </button>
        </div>
      </div>
    );
  }

  if (!isEnabled) {
    return (
      <div className="text-center py-16 text-slate-400 dark:text-slate-500">
        <p className="font-medium">知識圖功能未啟用</p>
        <p className="text-sm mt-1">請至設定 → 實驗室功能開啟</p>
      </div>
    );
  }

  const selectedGraph = selectedGraphId ? graphs.find((g) => g.id === selectedGraphId) : null;

  if (selectedGraph) {
    return (
      <div className="h-[calc(100vh-8rem)]">
        <GraphEditor graph={selectedGraph} onBack={handleBack} />
      </div>
    );
  }

  return (
    <GraphList
      graphs={graphs}
      onSelect={setSelectedGraphId}
      onCreate={handleCreate}
      onDelete={handleDelete}
      onRename={handleRename}
    />
  );
};

export default KnowledgeGraphWorkspace;
