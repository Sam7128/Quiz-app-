import React, { useState, useCallback, useEffect } from 'react';
import type { GraphDocument } from '@/types/graphTypes';
import { GraphErrorCode, GraphWarningCode, GRAPH_LIMITS } from '@/types/graphTypes';
import { getGraphs, saveGraph, deleteGraph, createNewGraph, validateGraphName, saveGraphsRaw } from '@/services/graphStorage';
import { useToast } from '@/contexts/ToastContext';
import { GraphList } from './GraphList';
import { GraphEditor } from './GraphEditor';
import { useAuth } from '@/contexts/AuthContext';
import { useConfirm } from '@/hooks/useConfirm';
import { useGraphConflictResolver } from '@/hooks/useGraphStorage';
import {
  syncGraphsToCloud,
  uploadGraphToCloud,
  deleteGraphFromCloud,
  clearGraphDirty,
  getDirtyGraphs,
} from '@/services/graphCloudStorage';

export function translateGraphError(code: GraphErrorCode): string {
  switch (code) {
    case GraphErrorCode.PARSE_FAILED:
      return '解析圖表資料失敗，資料結構可能已損毀';
    case GraphErrorCode.INVALID_FORMAT:
      return '圖表資料格式錯誤，預期為陣列';
    case GraphErrorCode.MAX_GRAPHS_EXCEEDED:
      return `最多只能儲存 ${GRAPH_LIMITS.MAX_GRAPHS} 張圖表`;
    case GraphErrorCode.QUOTA_EXCEEDED:
      return '儲存空間不足，請刪除部分資料後再試';
    case GraphErrorCode.SAVE_ERROR:
      return '儲存圖表時發生錯誤';
    case GraphErrorCode.DELETE_NOT_FOUND:
      return '找不到要刪除的圖表';
    case GraphErrorCode.DELETE_ERROR:
      return '刪除圖表時發生錯誤';
    case GraphErrorCode.MAX_NODES_EXCEEDED:
      return `每張圖表最多只能有 ${GRAPH_LIMITS.MAX_NODES} 個節點`;
    case GraphErrorCode.MAX_EDGES_EXCEEDED:
      return `每張圖表最多只能有 ${GRAPH_LIMITS.MAX_EDGES} 條連線`;
    case GraphErrorCode.MAX_STICKY_EXCEEDED:
      return `每張圖表最多只能有 ${GRAPH_LIMITS.MAX_STICKY_NOTES} 個便利貼`;
    case GraphErrorCode.MAX_IMAGE_NODES_EXCEEDED:
      return `每張圖表最多只能有 ${GRAPH_LIMITS.MAX_IMAGE_NODES} 張圖片`;
    case GraphErrorCode.TITLE_TOO_LONG:
      return `節點標題不可超過 ${GRAPH_LIMITS.TITLE_MAX} 個字元`;
    case GraphErrorCode.DEFINITION_TOO_LONG:
      return `節點定義不可超過 ${GRAPH_LIMITS.DEFINITION_MAX} 個字元`;
    case GraphErrorCode.DETAILS_TOO_LONG:
      return `節點詳情不可超過 ${GRAPH_LIMITS.DETAILS_MAX} 個字元`;
    case GraphErrorCode.STICKY_TEXT_TOO_LONG:
      return `便利貼文字不可超過 ${GRAPH_LIMITS.STICKY_TEXT_MAX} 個字元`;
    case GraphErrorCode.EDGE_LABEL_TOO_LONG:
      return `連線標籤不可超過 ${GRAPH_LIMITS.EDGE_LABEL_MAX} 個字元`;
    case GraphErrorCode.NOTES_TOO_LONG:
      return `筆記內容不可超過 ${GRAPH_LIMITS.NOTES_MAX} 個字元`;
    case GraphErrorCode.NODE_IMAGE_URL_TOO_LONG:
      return `圖片網址不可超過 ${GRAPH_LIMITS.IMAGE_URL_MAX} 個字元`;
    case GraphErrorCode.INVALID_IMAGE_URL_PROTOCOL:
      return '圖片網址必須以 http:// 或 https:// 開頭';
    case GraphErrorCode.IMAGE_DATA_TOO_LARGE:
      return '圖片壓縮後仍超過圖表儲存上限，請先裁切或縮小圖片';
    case GraphErrorCode.INVALID_IMAGE_DATA:
      return '圖片資料格式無效，只接受安全的 PNG、JPEG 或 WebP 圖片';
    default:
      return '未知錯誤';
  }
}

export function translateGraphWarning(code: GraphWarningCode): string {
  switch (code) {
    case GraphWarningCode.SIZE_APPROACHING_LIMIT:
      return '圖表大小接近限制，請刪除部分資料';
    default:
      return '未知警示';
  }
}

const KnowledgeGraphWorkspace: React.FC = () => {
  const [graphs, setGraphs] = useState<GraphDocument[]>([]);
  const [selectedGraphId, setSelectedGraphId] = useState<string | null>(null);
  const [fatalError, setFatalError] = useState<unknown | null>(null);
  const [syncing, setSyncing] = useState<boolean>(false);
  const toast = useToast();
  const { user } = useAuth();
  const confirm = useConfirm();

  const safeLoadGraphs = useCallback(() => {
    try {
      setGraphs(getGraphs());
    } catch (err: unknown) {
      console.error('Fatal error loading graphs:', err);
      setFatalError(err);
    }
  }, []);

  const resolveConflict = useGraphConflictResolver(confirm);

  // Sync and load lists
  const syncAndLoad = useCallback(async () => {
    setSyncing(true);
    const localList = getGraphs();
    setGraphs(localList);

    if (!user) {
      setSyncing(false);
      return;
    }

    try {
      const { syncedLocal, conflicts } = await syncGraphsToCloud(localList, user.id);
      let finalLocalList = [...syncedLocal];

      if (conflicts.length > 0) {
        for (const conflict of conflicts) {
          const res = await resolveConflict(conflict.local, conflict.cloud, user.id);
          if (res.action === 'keep_local' || res.action === 'keep_local_failed') {
            finalLocalList = finalLocalList.map((g) =>
              g.id === conflict.local.id ? res.updatedLocal : g
            );
          } else if (res.action === 'use_cloud') {
            finalLocalList = finalLocalList.map((g) =>
              g.id === conflict.local.id ? res.updatedLocal : g
            );
          } else if (res.action === 'save_copy') {
            finalLocalList = finalLocalList.map((g) =>
              g.id === conflict.local.id ? res.updatedLocal : g
            );
            if (res.copyLocal) {
              finalLocalList.push(res.copyLocal);
            }
          }
        }
      }

      saveGraphsRaw(finalLocalList);
      setGraphs(finalLocalList);
    } catch (err) {
      console.error('Failed to sync graphs on load:', err);
      toast.warning('雲端同步失敗，已載入本地圖表');
    } finally {
      setSyncing(false);
    }
  }, [user, resolveConflict, toast]);

  // Load graphs on mount & sync when list is viewed
  useEffect(() => {
    if (!selectedGraphId) {
      syncAndLoad();
    }
  }, [selectedGraphId, syncAndLoad]);

  // Online network retry listener
  useEffect(() => {
    const handleOnline = () => {
      if (!user) return;

      if (!selectedGraphId) {
        toast.info('網路已恢復，正在自動同步...');
        syncAndLoad();
      } else {
        const dirtyIds = getDirtyGraphs();
        if (dirtyIds.length > 0) {
          const localList = getGraphs();
          toast.info('網路已恢復，正在背景同步未儲存的圖表...');
          Promise.all(
            dirtyIds.map(async (id) => {
              const g = localList.find((item) => item.id === id);
              if (g) {
                try {
                  await uploadGraphToCloud(g, user.id);
                  clearGraphDirty(id);
                } catch (e) {
                  console.error('Failed to retry sync dirty graph on online:', e);
                }
              }
            })
          ).then(() => {
            safeLoadGraphs();
          });
        }
      }
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [user, selectedGraphId, syncAndLoad, safeLoadGraphs, toast]);

  const handleCreate = useCallback(() => {
    const newGraph = createNewGraph();
    const result = saveGraph(newGraph);
    if (result.success) {
      safeLoadGraphs();
      setSelectedGraphId(newGraph.id);
    } else {
      toast.warning(result.error ? translateGraphError(result.error) : '建立圖表失敗');
    }
  }, [toast, safeLoadGraphs]);

  const handleDelete = useCallback(
    (id: string) => {
      const result = deleteGraph(id);
      if (result.success) {
        if (user) {
          deleteGraphFromCloud(id).catch((err) => {
            console.error('Failed to delete graph from cloud:', err);
          });
        }
        safeLoadGraphs();
        if (selectedGraphId === id) {
          setSelectedGraphId(null);
        }
      } else {
        toast.warning(result.error ? translateGraphError(result.error) : '刪除圖表失敗');
      }
    },
    [selectedGraphId, toast, safeLoadGraphs, user]
  );

  const handleRename = useCallback(
    (id: string, name: string) => {
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
        toast.warning(result.error ? translateGraphError(result.error) : '重新命名失敗');
      }
    },
    [toast, safeLoadGraphs]
  );

  const handleBack = useCallback(() => {
    safeLoadGraphs();
    setSelectedGraphId(null);
  }, [safeLoadGraphs]);

  if (fatalError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-2xl max-w-xl mx-auto my-12 shadow-sm">
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-red-600 dark:text-red-400 mb-6 animate-pulse">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
          儲存空間損毀或容量超限
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-8 max-w-md leading-relaxed">
          系統在載入或更新圖表時發生致命錯誤。這可能是由於瀏覽器的 localStorage
          儲存空間容量超限，或是資料結構已損毀。您可以先導出備份，然後重置儲存空間。
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

  const selectedGraph = selectedGraphId ? graphs.find((g) => g.id === selectedGraphId) : null;

  if (selectedGraph) {
    return (
      <div className="h-[calc(100vh-8rem)]">
        <GraphEditor graph={selectedGraph} onBack={handleBack} />
      </div>
    );
  }

  return (
    <div>
      {syncing && (
        <div className="bg-blue-50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-200 text-xs py-1.5 px-4 text-center border-b border-blue-100 dark:border-blue-900/30 animate-pulse">
          同步中...
        </div>
      )}
      <GraphList
        graphs={graphs}
        onSelect={setSelectedGraphId}
        onCreate={handleCreate}
        onDelete={handleDelete}
        onRename={handleRename}
      />
    </div>
  );
};

export default KnowledgeGraphWorkspace;
