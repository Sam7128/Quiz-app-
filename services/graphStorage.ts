import type { GraphDocument } from '@/types/graphTypes';
import { GRAPH_LIMITS, DEFAULT_VIEW_STATE } from '@/types/graphTypes';

const GRAPHS_STORAGE_KEY = 'mindspark_graphs';

interface MutationResult {
  success: boolean;
  error?: string;
}

// ── Read ────────────────────────────────────────────────────────────

export function getGraphs(): GraphDocument[] {
  try {
    const raw = localStorage.getItem(GRAPHS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as GraphDocument[];
  } catch {
    return [];
  }
}

export function getGraphById(id: string): GraphDocument | null {
  try {
    return getGraphs().find((g) => g.id === id) ?? null;
  } catch {
    return null;
  }
}

// ── Write ───────────────────────────────────────────────────────────

export function saveGraph(graph: GraphDocument): MutationResult {
  try {
    const validationError = validateGraphDocument(graph);
    if (validationError) {
      return { success: false, error: validationError };
    }

    const graphs = getGraphs();
    const idx = graphs.findIndex((g) => g.id === graph.id);

    if (idx >= 0) {
      graphs[idx] = { ...graph, updatedAt: new Date().toISOString() };
    } else {
      if (graphs.length >= GRAPH_LIMITS.MAX_GRAPHS) {
        return { success: false, error: `最多只能儲存 ${GRAPH_LIMITS.MAX_GRAPHS} 張圖表` };
      }
      graphs.push({ ...graph, updatedAt: new Date().toISOString() });
    }

    localStorage.setItem(GRAPHS_STORAGE_KEY, JSON.stringify(graphs));
    return { success: true };
  } catch (err: unknown) {
    if (isQuotaExceeded(err)) {
      return { success: false, error: '儲存空間不足，請刪除部分資料後再試' };
    }
    return { success: false, error: '儲存圖表時發生錯誤' };
  }
}

export function deleteGraph(id: string): MutationResult {
  try {
    const graphs = getGraphs();
    const filtered = graphs.filter((g) => g.id !== id);

    if (filtered.length === graphs.length) {
      return { success: false, error: '找不到要刪除的圖表' };
    }

    localStorage.setItem(GRAPHS_STORAGE_KEY, JSON.stringify(filtered));
    return { success: true };
  } catch {
    return { success: false, error: '刪除圖表時發生錯誤' };
  }
}

// ── Helpers ─────────────────────────────────────────────────────────

export function createNewGraph(name?: string): GraphDocument {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    schemaVersion: GRAPH_LIMITS.SCHEMA_VERSION,
    name: validateGraphName(name ?? '新圖表'),
    nodes: [],
    edges: [],
    viewState: { ...DEFAULT_VIEW_STATE },
    createdAt: now,
    updatedAt: now,
  };
}

export function validateGraphName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '未命名圖表';
  return trimmed.slice(0, GRAPH_LIMITS.NAME_MAX);
}

function isQuotaExceeded(err: unknown): boolean {
  if (err instanceof DOMException) {
    return err.name === 'QuotaExceededError' || err.code === 22;
  }
  return false;
}

function validateGraphDocument(graph: GraphDocument): string | null {
  if (graph.nodes.length > GRAPH_LIMITS.MAX_NODES) {
    return `每張圖表最多只能有 ${GRAPH_LIMITS.MAX_NODES} 個節點`;
  }

  if (graph.edges.length > GRAPH_LIMITS.MAX_EDGES) {
    return `每張圖表最多只能有 ${GRAPH_LIMITS.MAX_EDGES} 條連線`;
  }

  return null;
}
