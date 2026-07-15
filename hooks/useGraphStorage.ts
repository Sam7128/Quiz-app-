import { useCallback, useEffect, useRef } from 'react';
import type { Edge as RFEdge, Node as RFNode } from '@xyflow/react';
import type { GraphDocument, ReadingMode, BackgroundOpacity, LayoutMode, GraphThemePresetId } from '@/types/graphTypes';
import { saveGraph } from '@/services/graphStorage';
import { fromRFNodes, fromRFEdges } from '@/components/KnowledgeGraph/graphUtils';
import { useToast } from '@/contexts/ToastContext';
import { translateGraphError } from '@/components/KnowledgeGraph/KnowledgeGraphWorkspace';
import { useAuth } from '@/contexts/AuthContext';
import {
  uploadGraphToCloudSafely,
  clearGraphDirty,
  markGraphDirty,
  GraphCloudConflictError,
  resolveGraphConflict,
  type ConflictConfirm,
  type GraphConflictResolution,
} from '@/services/graphCloudStorage';

export function useGraphConflictResolver(confirm: ConflictConfirm) {
  return useCallback(
    (local: GraphDocument, cloud: GraphDocument, userId: string): Promise<GraphConflictResolution> =>
      resolveGraphConflict(local, cloud, userId, confirm),
    [confirm]
  );
}

export function useGraphStorage(
  graph: GraphDocument,
  nodes: RFNode[],
  edges: RFEdge[],
  notesDict: Record<string, string>,
  readingMode: ReadingMode,
  editMode: 'visual' | 'code',
  bgOpacity: BackgroundOpacity = 'translucent',
  layoutMode: LayoutMode = graph.layoutMode,
  theme: GraphThemePresetId = graph.theme,
) {
  const toast = useToast();
  const { user } = useAuth();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstMountRef = useRef(true);
  const toastRef = useRef(toast);
  const userRef = useRef(user);

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const refs = useRef({ graph, nodes, edges, notesDict, readingMode, editMode, bgOpacity, layoutMode, theme });
  useEffect(() => {
    refs.current = { graph, nodes, edges, notesDict, readingMode, editMode, bgOpacity, layoutMode, theme };
  }, [graph, nodes, edges, notesDict, readingMode, editMode, bgOpacity, layoutMode, theme]);

  const flushSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const cur = refs.current;
    const doc: GraphDocument = {
      ...cur.graph,
      nodes: fromRFNodes(cur.nodes),
      edges: fromRFEdges(cur.edges),
      notes: cur.notesDict,
      editMode: cur.editMode,
      backgroundOpacity: cur.bgOpacity,
      layoutMode: cur.layoutMode,
      theme: cur.theme,
      viewState: { ...cur.graph.viewState, readingMode: cur.readingMode, bgOpacity: cur.bgOpacity },
      updatedAt: new Date().toISOString(),
    };
    
    const result = saveGraph(doc);
    if (result.success) {
      const currentUser = userRef.current;
      if (currentUser) {
        uploadGraphToCloudSafely(doc, currentUser.id)
          .then(() => {
            clearGraphDirty(doc.id);
          })
          .catch((err) => {
            if (err instanceof GraphCloudConflictError) {
              markGraphDirty(doc.id);
              toastRef.current.warning('雲端有較新版本，已停止覆寫並保留本地修改');
              return;
            }
            console.error('Failed to sync graph to cloud during autosave:', err);
            markGraphDirty(doc.id);
          });
      }
    } else if (result.error) {
      toastRef.current.warning(translateGraphError(result.error));
    }
  }, []);

  const flushSaveIfNeeded = useCallback(() => {
    if (saveTimerRef.current) {
      flushSave();
    }
  }, [flushSave]);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(flushSave, 2000);
  }, [flushSave]);

  useEffect(() => {
    const handleBeforeUnload = () => flushSaveIfNeeded();
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') flushSaveIfNeeded();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      flushSaveIfNeeded();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [flushSaveIfNeeded]);

  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }
    scheduleSave();
  }, [nodes, edges, notesDict, readingMode, editMode, bgOpacity, layoutMode, theme, scheduleSave]);

  return { flushSave };
}
