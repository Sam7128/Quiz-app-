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
  const toast = useToast();

  // Check beta enabled
  const settings = getUserSettings();
  const isEnabled = settings.betaFeatures?.knowledgeGraph ?? false;

  // Load graphs on mount
  useEffect(() => {
    setGraphs(getGraphs());
  }, []);

  const handleCreate = useCallback(() => {
    const newGraph = createNewGraph();
    const result = saveGraph(newGraph);
    if (result.success) {
      setGraphs(getGraphs());
      setSelectedGraphId(newGraph.id);
    } else {
      toast.warning(result.error ?? '建立圖表失敗');
    }
  }, [toast]);

  const handleDelete = useCallback((id: string) => {
    const result = deleteGraph(id);
    if (result.success) {
      setGraphs(getGraphs());
      if (selectedGraphId === id) {
        setSelectedGraphId(null);
      }
    } else {
      toast.warning(result.error ?? '刪除圖表失敗');
    }
  }, [selectedGraphId, toast]);

  const handleRename = useCallback((id: string, name: string) => {
    const graph = getGraphs().find((g) => g.id === id);
    if (!graph) return;
    const validName = validateGraphName(name);
    const result = saveGraph({ ...graph, name: validName });
    if (result.success) {
      setGraphs(getGraphs());
    } else {
      toast.warning(result.error ?? '重新命名失敗');
    }
  }, [toast]);

  const handleBack = useCallback(() => {
    // Refresh graphs list to pick up any saves from editor
    setGraphs(getGraphs());
    setSelectedGraphId(null);
  }, []);

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
