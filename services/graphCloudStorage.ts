import { supabase } from './supabase';
import type { GraphDocument } from '@/types/graphTypes';

const DIRTY_GRAPHS_KEY = 'mindspark_dirty_graphs';

interface SyncConflict {
  local: GraphDocument;
  cloud: GraphDocument;
}

export interface SyncResult {
  syncedLocal: GraphDocument[];
  conflicts: SyncConflict[];
}

let isGraphCloudAvailable = true;
const inFlightGraphSyncs = new Map<string, Promise<SyncResult>>();

export type ConflictConfirm = (options: {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}) => Promise<boolean>;

type GraphConflictAction = 'keep_local' | 'keep_local_failed' | 'use_cloud' | 'save_copy';

export interface GraphConflictResolution {
  action: GraphConflictAction;
  updatedLocal: GraphDocument;
  copyLocal?: GraphDocument;
}

export class GraphCloudConflictError extends Error {
  readonly graphId: string;

  constructor(graphId: string) {
    super(`Cloud graph is newer: ${graphId}`);
    this.name = 'GraphCloudConflictError';
    this.graphId = graphId;
  }
}

interface SupabaseGraphRow {
  id: string;
  user_id: string;
  graph_data: unknown;
  created_at: string;
  updated_at: string;
}

// ── Type Guard ──────────────────────────────────────────────────────
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isMissingGraphTableError(error: unknown): boolean {
  if (!isRecord(error)) return false;

  const code = typeof error.code === 'string' ? error.code : '';
  const message = typeof error.message === 'string' ? error.message.toLowerCase() : '';
  const hint = typeof error.hint === 'string' ? error.hint.toLowerCase() : '';
  const mentionsGraphTable = message.includes('knowledge_graphs') || hint.includes('knowledge_graphs');

  return code === 'PGRST205' || (mentionsGraphTable && message.includes('schema cache'));
}

function disableGraphCloudIfTableMissing(error: unknown): boolean {
  if (!isMissingGraphTableError(error)) return false;

  if (isGraphCloudAvailable) {
    isGraphCloudAvailable = false;
    console.warn(
      'Supabase knowledge_graphs table is missing. Gracefully degrading to local-only mode.'
    );
  }

  return true;
}

function createLocalOnlySyncResult(localGraphs: GraphDocument[]): SyncResult {
  return { syncedLocal: [...localGraphs], conflicts: [] };
}

function isGraphDocument(obj: unknown): obj is GraphDocument {
  if (!isRecord(obj)) return false;
  const doc = obj;
  return (
    typeof doc.id === 'string' &&
    typeof doc.name === 'string' &&
    Array.isArray(doc.nodes) &&
    Array.isArray(doc.edges) &&
    typeof doc.createdAt === 'string' &&
    typeof doc.updatedAt === 'string'
  );
}

// ── Dirty Queue Management ──────────────────────────────────────────
export function getDirtyGraphs(): string[] {
  try {
    const raw = localStorage.getItem(DIRTY_GRAPHS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function markGraphDirty(id: string): void {
  try {
    const dirty = getDirtyGraphs();
    if (!dirty.includes(id)) {
      dirty.push(id);
      localStorage.setItem(DIRTY_GRAPHS_KEY, JSON.stringify(dirty));
    }
  } catch (err) {
    console.error('Failed to mark graph dirty:', err);
  }
}

export function clearGraphDirty(id: string): void {
  try {
    const dirty = getDirtyGraphs();
    const filtered = dirty.filter((dId) => dId !== id);
    localStorage.setItem(DIRTY_GRAPHS_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error('Failed to clear graph dirty:', err);
  }
}

export async function resolveGraphConflict(
  local: GraphDocument,
  cloud: GraphDocument,
  userId: string,
  confirm: ConflictConfirm,
): Promise<GraphConflictResolution> {
  const keepLocal = await confirm({
    title: '同步衝突',
    message: `圖表 "${local.name}" 的本地修改與雲端版本不一致。\n您要保留本地修改並覆蓋雲端嗎？`,
    confirmText: '保留本地',
    cancelText: '其他選項',
  });

  if (keepLocal) {
    try {
      await uploadGraphToCloud(local, userId);
      clearGraphDirty(local.id);
      return { action: 'keep_local', updatedLocal: local };
    } catch (err) {
      console.error('Failed to upload local graph to resolve conflict:', err);
      return { action: 'keep_local_failed', updatedLocal: local };
    }
  }

  const useCloud = await confirm({
    title: '衝突處理選項',
    message: '您想要使用雲端的版本覆蓋本地，還是另存為衝突副本以保留您的本地修改？',
    confirmText: '使用雲端版本',
    cancelText: '另存為衝突副本',
  });

  if (useCloud) {
    clearGraphDirty(local.id);
    return { action: 'use_cloud', updatedLocal: cloud };
  }

  const localCopy: GraphDocument = {
    ...local,
    id: crypto.randomUUID(),
    name: `${local.name} (衝突副本)`,
    updatedAt: new Date().toISOString(),
  };

  try {
    await uploadGraphToCloud(localCopy, userId);
    clearGraphDirty(localCopy.id);
  } catch (err) {
    console.error('Failed to upload conflict copy to cloud:', err);
    markGraphDirty(localCopy.id);
  }

  clearGraphDirty(local.id);
  return { action: 'save_copy', updatedLocal: cloud, copyLocal: localCopy };
}

// ── Cloud CRUD Operations ───────────────────────────────────────────
export async function uploadGraphToCloud(graph: GraphDocument, userId: string): Promise<void> {
  if (!isGraphCloudAvailable) return;

  const graphJson = JSON.parse(JSON.stringify(graph)) as Record<string, unknown>;
  const { error } = await supabase
    .from('knowledge_graphs')
    .upsert({
      id: graph.id,
      user_id: userId,
      graph_data: graphJson,
      updated_at: graph.updatedAt,
    });

  if (error) {
    if (disableGraphCloudIfTableMissing(error)) return;
    throw error;
  }
}

/** Autosave guard: re-check the cloud snapshot before allowing an overwrite. */
export async function uploadGraphToCloudSafely(graph: GraphDocument, userId: string): Promise<void> {
  if (!isGraphCloudAvailable) return;

  const { data, error } = await supabase
    .from('knowledge_graphs')
    .select('*')
    .eq('user_id', userId);
  if (error) {
    if (disableGraphCloudIfTableMissing(error)) return;
    throw error;
  }

  const rows = Array.isArray(data) ? data : [];
  const row = rows.find((value): value is SupabaseGraphRow => {
    if (!isRecord(value)) return false;
    return value.id === graph.id && typeof value.user_id === 'string';
  });
  if (row) {
    const cloudUpdatedAt = isGraphDocument(row.graph_data) ? row.graph_data.updatedAt : row.updated_at;
    const cloudTime = Date.parse(cloudUpdatedAt);
    const localTime = Date.parse(graph.updatedAt);
    if (Number.isFinite(cloudTime) && Number.isFinite(localTime) && cloudTime > localTime) {
      throw new GraphCloudConflictError(graph.id);
    }
  }

  await uploadGraphToCloud(graph, userId);
}

export async function deleteGraphFromCloud(id: string): Promise<void> {
  if (!isGraphCloudAvailable) return;

  const { error } = await supabase
    .from('knowledge_graphs')
    .delete()
    .eq('id', id);

  if (error) {
    if (disableGraphCloudIfTableMissing(error)) return;
    throw error;
  }
}

// ── Synchronization Logic (LWW & Conflict Detection) ────────────────
export async function syncGraphsToCloud(
  localGraphs: GraphDocument[],
  userId: string
): Promise<SyncResult> {
  if (!isGraphCloudAvailable) {
    return Promise.resolve(createLocalOnlySyncResult(localGraphs));
  }

  const existingSync = inFlightGraphSyncs.get(userId);
  if (existingSync) return existingSync;

  const syncPromise = syncGraphsToCloudInternal(localGraphs, userId);
  inFlightGraphSyncs.set(userId, syncPromise);
  syncPromise.then(
    () => {
      if (inFlightGraphSyncs.get(userId) === syncPromise) {
        inFlightGraphSyncs.delete(userId);
      }
    },
    () => {
      if (inFlightGraphSyncs.get(userId) === syncPromise) {
        inFlightGraphSyncs.delete(userId);
      }
    }
  );
  return syncPromise;
}

async function syncGraphsToCloudInternal(
  localGraphs: GraphDocument[],
  userId: string
): Promise<SyncResult> {
  const { data, error } = await supabase
    .from('knowledge_graphs')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    if (disableGraphCloudIfTableMissing(error)) {
      return createLocalOnlySyncResult(localGraphs);
    }
    throw error;
  }

  const cloudGraphsMap = new Map<string, GraphDocument>();
  if (data) {
    const rows = data as unknown as SupabaseGraphRow[];
    for (const row of rows) {
      if (isGraphDocument(row.graph_data)) {
        cloudGraphsMap.set(row.graph_data.id, row.graph_data);
      }
    }
  }

  const dirtyIds = getDirtyGraphs();
  const updatedLocalGraphs: GraphDocument[] = [...localGraphs];
  const conflicts: SyncConflict[] = [];
  const processedCloudIds = new Set<string>();

  // Compare local graphs with cloud graphs
  for (let i = 0; i < updatedLocalGraphs.length; i++) {
    const local = updatedLocalGraphs[i];
    const cloud = cloudGraphsMap.get(local.id);

    if (cloud) {
      processedCloudIds.add(local.id);
      const isDirty = dirtyIds.includes(local.id);

      if (local.updatedAt !== cloud.updatedAt) {
        if (isDirty) {
          // Conflict detected
          conflicts.push({ local, cloud });
        } else {
          // LWW strategy (No local unsynced changes)
          const localTime = new Date(local.updatedAt).getTime();
          const cloudTime = new Date(cloud.updatedAt).getTime();
          if (cloudTime > localTime) {
            updatedLocalGraphs[i] = cloud;
          } else {
            try {
              await uploadGraphToCloud(local, userId);
              clearGraphDirty(local.id);
            } catch (err) {
              console.error(`Failed to upload newer graph ${local.id}:`, err);
              markGraphDirty(local.id);
            }
          }
        }
      } else {
        // Equal timestamps, but retry if dirty
        if (isDirty) {
          try {
            await uploadGraphToCloud(local, userId);
            clearGraphDirty(local.id);
          } catch (err) {
            console.error(`Failed to upload dirty graph ${local.id}:`, err);
          }
        }
      }
    } else {
      // Local exists but not in cloud
      try {
        await uploadGraphToCloud(local, userId);
        clearGraphDirty(local.id);
      } catch (err) {
        console.error(`Failed to upload new local graph ${local.id}:`, err);
        markGraphDirty(local.id);
      }
    }
  }

  // Handle cloud graphs not present in local
  for (const [cloudId, cloudGraph] of cloudGraphsMap.entries()) {
    if (!processedCloudIds.has(cloudId)) {
      updatedLocalGraphs.push(cloudGraph);
    }
  }

  return {
    syncedLocal: updatedLocalGraphs,
    conflicts,
  };
}
