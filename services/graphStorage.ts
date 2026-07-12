import type { GraphDocument } from '@/types/graphTypes';
import { GRAPH_LIMITS, DEFAULT_VIEW_STATE } from '@/types/graphTypes';

const GRAPHS_STORAGE_KEY = 'mindspark_graphs';

export interface MutationResult {
  success: boolean;
  error?: string;
  warning?: string;
}

// ── HTML Escape Helper ──────────────────────────────────────────────
function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (match) => {
    switch (match) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return match;
    }
  });
}

// ── Read ────────────────────────────────────────────────────────────

export function getGraphs(): GraphDocument[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(GRAPHS_STORAGE_KEY);
  } catch {
    return [];
  }
  if (!raw) return [];

  let graphs: any[];
  try {
    graphs = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(graphs)) return [];

  let migrated = false;
  for (const graph of graphs) {
    if (!graph.schemaVersion || graph.schemaVersion < 2) {
      const notes: Record<string, string> = {};
      if (Array.isArray(graph.nodes)) {
        for (const node of graph.nodes) {
          if (node && node.data && node.data.title) {
            const parts: string[] = [];
            if (node.data.definition) {
              parts.push(`<p>${escapeHtml(node.data.definition)}</p>`);
            }
            if (node.data.details) {
              parts.push(`<p>${escapeHtml(node.data.details)}</p>`);
            }
            const content = parts.join('');
            if (content) {
              const key = node.data.title;
              if (notes[key]) {
                notes[key] += '<hr />' + content;
              } else {
                notes[key] = content;
              }
            }
          }
        }
      }
      graph.notes = notes;
      graph.editMode = graph.editMode || 'visual';
      graph.schemaVersion = 2;
      migrated = true;
    }
  }

  if (migrated) {
    localStorage.setItem(GRAPHS_STORAGE_KEY, JSON.stringify(graphs));
  }

  return graphs as GraphDocument[];
}

export function getGraphById(id: string): GraphDocument | null {
  return getGraphs().find((g) => g.id === id) ?? null;
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

    const jsonString = JSON.stringify(graphs);
    const byteSize = new Blob([jsonString]).size;
    const warning = byteSize > 3 * 1024 * 1024
      ? '圖表大小接近限制，請刪除部分資料'
      : undefined;

    localStorage.setItem(GRAPHS_STORAGE_KEY, jsonString);
    return warning ? { success: true, warning } : { success: true };
  } catch (err: unknown) {
    if (isQuotaExceeded(err)) {
      return { success: false, error: '儲存空間不足，請刪除部分資料後再試' };
    }
    if (err instanceof Error && err.message.includes('Migration')) {
      throw err;
    }
    return { success: false, error: '儲存圖表時發生錯誤' };
  }
}

export function deleteGraph(id: string): MutationResult {
  const graphs = getGraphs();

  try {
    const filtered = graphs.filter((g) => g.id !== id);

    if (filtered.length === graphs.length) {
      return { success: false, error: '找不到要刪除的圖表' };
    }

    localStorage.setItem(GRAPHS_STORAGE_KEY, JSON.stringify(filtered));
    return { success: true };
  } catch (err: unknown) {
    if (isQuotaExceeded(err)) {
      return { success: false, error: '儲存空間不足，請刪除部分資料後再試' };
    }
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
    notes: {},
    editMode: 'visual',
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
  if (err && typeof err === 'object') {
    const name = (err as any).name;
    const code = (err as any).code;
    if (name === 'QuotaExceededError' || code === 22) {
      return true;
    }
  }
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

  // 檢查便利貼數量上限
  const stickyNodesCount = graph.nodes.filter((node) => node.type === 'sticky').length;
  if (stickyNodesCount > GRAPH_LIMITS.MAX_STICKY_NOTES) {
    return `每張圖表最多只能有 ${GRAPH_LIMITS.MAX_STICKY_NOTES} 個便利貼`;
  }

  // 檢查節點欄位長度限制
  for (const node of graph.nodes) {
    if (node.type !== 'sticky') {
      if (node.data.title && node.data.title.length > GRAPH_LIMITS.TITLE_MAX) {
        return `節點標題不可超過 ${GRAPH_LIMITS.TITLE_MAX} 個字元`;
      }
      if (node.data.definition && node.data.definition.length > GRAPH_LIMITS.DEFINITION_MAX) {
        return `節點定義不可超過 ${GRAPH_LIMITS.DEFINITION_MAX} 個字元`;
      }
      if (node.data.details && node.data.details.length > GRAPH_LIMITS.DETAILS_MAX) {
        return `節點詳情不可超過 ${GRAPH_LIMITS.DETAILS_MAX} 個字元`;
      }
    } else {
      // 便利貼
      const label = (node.data as any).label;
      const title = node.data.title;
      if (label && label.length > GRAPH_LIMITS.STICKY_TEXT_MAX) {
        return `便利貼文字不可超過 ${GRAPH_LIMITS.STICKY_TEXT_MAX} 個字元`;
      }
      if (title && title.length > GRAPH_LIMITS.STICKY_TEXT_MAX) {
        return `便利貼文字不可超過 ${GRAPH_LIMITS.STICKY_TEXT_MAX} 個字元`;
      }
    }
  }

  // 檢查連線 edge.label 長度限制
  for (const edge of graph.edges) {
    if (edge.label && edge.label.length > GRAPH_LIMITS.EDGE_LABEL_MAX) {
      return `連線標籤不可超過 ${GRAPH_LIMITS.EDGE_LABEL_MAX} 個字元`;
    }
  }

  // 檢查 notes 字典長度限制
  if (graph.notes) {
    for (const [key, value] of Object.entries(graph.notes)) {
      if (value && value.length > GRAPH_LIMITS.NOTES_MAX) {
        return `筆記內容不可超過 ${GRAPH_LIMITS.NOTES_MAX} 個字元`;
      }
    }
  }

  return null;
}
