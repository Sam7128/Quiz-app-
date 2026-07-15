import type { GraphDocument, GraphNode, GraphNodeData, GraphEdge, GraphViewState, FontSize, GraphNodeType, ReadingMode, BackgroundOpacity, LayoutMode, GraphThemePresetId } from '@/types/graphTypes';
import { GRAPH_LIMITS, DEFAULT_VIEW_STATE, DEFAULT_NODE_COLORS, GraphErrorCode, GraphWarningCode } from '@/types/graphTypes';
import { isSafeGraphImageDataUrl } from '@/services/graphImage';

const GRAPHS_STORAGE_KEY = 'mindspark_graphs';
const GRAPH_MIGRATION_BACKUP_KEY = 'mindspark_graphs_backup_pre_v3_cleanup';

export interface MutationResult {
  success: boolean;
  error?: GraphErrorCode;
  warning?: GraphWarningCode;
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

  let graphs: unknown;
  try {
    graphs = JSON.parse(raw);
  } catch {
    throw new Error(GraphErrorCode.PARSE_FAILED);
  }

  if (!Array.isArray(graphs)) {
    throw new Error(GraphErrorCode.INVALID_FORMAT);
  }

  let migrated = false;
  const normalizedGraphs: GraphDocument[] = [];
  for (const rawGraph of graphs) {
    const normalized = normalizeGraphDocument(rawGraph);
    if (normalized) {
      normalizedGraphs.push(normalized.graph);
      migrated = migrated || normalized.migrated;
    }
  }

  if (migrated) {
    if (!localStorage.getItem(GRAPH_MIGRATION_BACKUP_KEY) && raw) {
      localStorage.setItem(GRAPH_MIGRATION_BACKUP_KEY, raw);
    }
    localStorage.setItem(GRAPHS_STORAGE_KEY, JSON.stringify(normalizedGraphs));
  }

  return normalizedGraphs;
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
        return { success: false, error: GraphErrorCode.MAX_GRAPHS_EXCEEDED };
      }
      graphs.push({ ...graph, updatedAt: new Date().toISOString() });
    }

    const jsonString = JSON.stringify(graphs);
    const byteSize = new Blob([jsonString]).size;
    const warning = byteSize > 3 * 1024 * 1024
      ? GraphWarningCode.SIZE_APPROACHING_LIMIT
      : undefined;

    localStorage.setItem(GRAPHS_STORAGE_KEY, jsonString);
    return warning ? { success: true, warning } : { success: true };
  } catch (err: unknown) {
    if (isQuotaExceeded(err)) {
      return { success: false, error: GraphErrorCode.QUOTA_EXCEEDED };
    }
    if (err instanceof Error && isGraphErrorCode(err.message)) {
      throw err;
    }
    return { success: false, error: GraphErrorCode.SAVE_ERROR };
  }
}

export function deleteGraph(id: string): MutationResult {
  const graphs = getGraphs();

  try {
    const filtered = graphs.filter((g) => g.id !== id);

    if (filtered.length === graphs.length) {
      return { success: false, error: GraphErrorCode.DELETE_NOT_FOUND };
    }

    localStorage.setItem(GRAPHS_STORAGE_KEY, JSON.stringify(filtered));
    return { success: true };
  } catch (err: unknown) {
    if (isQuotaExceeded(err)) {
      return { success: false, error: GraphErrorCode.QUOTA_EXCEEDED };
    }
    if (err instanceof Error && isGraphErrorCode(err.message)) {
      throw err;
    }
    return { success: false, error: GraphErrorCode.DELETE_ERROR };
  }
}

// ── Helpers ─────────────────────────────────────────────────────────

export function createNewGraph(name?: string): GraphDocument {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    schemaVersion: GRAPH_LIMITS.SCHEMA_VERSION,
    name: validateGraphName(name ?? '新圖表'),
    backgroundOpacity: getDefaultBackgroundOpacity(),
    layoutMode: 'free',
    theme: 'classic',
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
    const errObj = err as Record<string, unknown>;
    const name = errObj.name;
    const code = errObj.code;
    if (name === 'QuotaExceededError' || code === 22) {
      return true;
    }
  }
  if (err instanceof DOMException) {
    return err.name === 'QuotaExceededError' || err.code === 22;
  }
  return false;
}

function validateGraphDocument(graph: GraphDocument): GraphErrorCode | null {
  if (graph.nodes.length > GRAPH_LIMITS.MAX_NODES) {
    return GraphErrorCode.MAX_NODES_EXCEEDED;
  }

  if (graph.edges.length > GRAPH_LIMITS.MAX_EDGES) {
    return GraphErrorCode.MAX_EDGES_EXCEEDED;
  }

  const stickyNodesCount = graph.nodes.filter((node) => node.type === 'sticky').length;
  if (stickyNodesCount > GRAPH_LIMITS.MAX_STICKY_NOTES) {
    return GraphErrorCode.MAX_STICKY_EXCEEDED;
  }

  const imageNodesCount = graph.nodes.filter((node) => node.type === 'image').length;
  if (imageNodesCount > GRAPH_LIMITS.MAX_IMAGE_NODES) {
    return GraphErrorCode.MAX_IMAGE_NODES_EXCEEDED;
  }

  for (const node of graph.nodes) {
    if (node.type === 'image') {
      if (!node.data.imageDataUrl || !isSafeGraphImageDataUrl(node.data.imageDataUrl)) {
        return node.data.imageDataUrl && node.data.imageDataUrl.length > GRAPH_LIMITS.IMAGE_DATA_URL_MAX
          ? GraphErrorCode.IMAGE_DATA_TOO_LARGE
          : GraphErrorCode.INVALID_IMAGE_DATA;
      }
    } else if (node.type !== 'sticky') {
      if (node.data.title && node.data.title.length > GRAPH_LIMITS.TITLE_MAX) {
        return GraphErrorCode.TITLE_TOO_LONG;
      }
      if (node.data.definition && node.data.definition.length > GRAPH_LIMITS.DEFINITION_MAX) {
        return GraphErrorCode.DEFINITION_TOO_LONG;
      }
      if (node.data.details && node.data.details.length > GRAPH_LIMITS.DETAILS_MAX) {
        return GraphErrorCode.DETAILS_TOO_LONG;
      }
      if (node.data.imageUrl) {
        if (node.data.imageUrl.length > GRAPH_LIMITS.IMAGE_URL_MAX) {
          return GraphErrorCode.NODE_IMAGE_URL_TOO_LONG;
        }
        if (!isValidImageUrl(node.data.imageUrl)) {
          return GraphErrorCode.INVALID_IMAGE_URL_PROTOCOL;
        }
      }
    } else {
      const label = node.data.label;
      const title = node.data.title;
      if (label && label.length > GRAPH_LIMITS.STICKY_TEXT_MAX) {
        return GraphErrorCode.STICKY_TEXT_TOO_LONG;
      }
      if (title && title.length > GRAPH_LIMITS.STICKY_TEXT_MAX) {
        return GraphErrorCode.STICKY_TEXT_TOO_LONG;
      }
    }
  }

  for (const edge of graph.edges) {
    if (edge.label && edge.label.length > GRAPH_LIMITS.EDGE_LABEL_MAX) {
      return GraphErrorCode.EDGE_LABEL_TOO_LONG;
    }
  }

  if (graph.notes) {
    for (const [_, value] of Object.entries(graph.notes)) {
      if (value && value.length > GRAPH_LIMITS.NOTES_MAX) {
        return GraphErrorCode.NOTES_TOO_LONG;
      }
    }
  }

  return null;
}

export function isValidImageUrl(url: string | undefined): boolean {
  if (!url) return true;
  if (url.length > GRAPH_LIMITS.IMAGE_URL_MAX) return false;
  try {
    const parsed = new URL(url);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.hostname.length > 0;
  } catch {
    return false;
  }
}

export function saveGraphsRaw(graphs: GraphDocument[]): void {
  localStorage.setItem(GRAPHS_STORAGE_KEY, JSON.stringify(graphs));
}

interface NormalizedGraphResult {
  graph: GraphDocument;
  migrated: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFontSize(value: unknown): value is FontSize {
  return value === 'sm' || value === 'md' || value === 'lg';
}

function isReadingMode(value: unknown): value is ReadingMode {
  return value === 'expand-all' || value === 'progressive';
}

function isBackgroundOpacity(value: unknown): value is BackgroundOpacity {
  return value === 'translucent' || value === 'solid';
}

function isLayoutMode(value: unknown): value is LayoutMode {
  return value === 'free' || value === 'radial';
}

function isGraphNodeType(value: unknown): value is GraphNodeType {
  return value === 'concept'
    || value === 'square'
    || value === 'rounded'
    || value === 'pill'
    || value === 'circle'
    || value === 'diamond'
    || value === 'hexagon'
    || value === 'cloud'
    || value === 'sticky'
    || value === 'image';
}

function isGraphThemePresetId(value: unknown): value is GraphThemePresetId {
  return value === 'classic'
    || value === 'ocean'
    || value === 'emerald'
    || value === 'sunset'
    || value === 'lavender'
    || value === 'midnight';
}

function normalizeGraphDocument(value: unknown): NormalizedGraphResult | null {
  if (!isRecord(value)) return null;

  const id = typeof value.id === 'string' ? value.id : '';
  const name = typeof value.name === 'string' ? value.name : '';
  const createdAt = typeof value.createdAt === 'string' ? value.createdAt : '';
  const updatedAt = typeof value.updatedAt === 'string' ? value.updatedAt : '';
  if (!id || !name || !createdAt || !updatedAt) return null;

  const sourceVersion = typeof value.schemaVersion === 'number' ? value.schemaVersion : 1;
  const rawNodes = Array.isArray(value.nodes) ? value.nodes : [];
  const rawEdges = Array.isArray(value.edges) ? value.edges : [];
  const nodes = rawNodes.map(normalizeGraphNode).filter((node): node is GraphNode => node !== null);
  const normalizedEdges = rawEdges.map(normalizeGraphEdge).filter((edge): edge is GraphEdge => edge !== null);
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = normalizedEdges.filter((edge) => (
    edge.source !== edge.target && nodeIds.has(edge.source) && nodeIds.has(edge.target)
  ));
  const rawViewState = isRecord(value.viewState) ? value.viewState : {};
  const viewState = normalizeViewState(rawViewState);
  const rawNotes = normalizeNotes(value.notes);
  const notes = sourceVersion < 2 ? buildLegacyNotes(nodes) : rawNotes;
  const rawBackgroundOpacity = value.backgroundOpacity;
  const legacyOpacity = rawViewState.bgOpacity;
  const backgroundOpacity = isBackgroundOpacity(rawBackgroundOpacity)
    ? rawBackgroundOpacity
    : legacyOpacity === 'opaque' || legacyOpacity === 'solid'
      ? 'solid'
      : 'translucent';
  const layoutMode = isLayoutMode(value.layoutMode) ? value.layoutMode : 'free';
  const theme = isGraphThemePresetId(value.theme) ? value.theme : 'classic';
  const editMode = value.editMode === 'code' ? 'code' : 'visual';
  const graph: GraphDocument = {
    id,
    schemaVersion: GRAPH_LIMITS.SCHEMA_VERSION,
    name: validateGraphName(name),
    backgroundOpacity,
    layoutMode,
    theme,
    nodes,
    edges,
    viewState,
    notes,
    editMode,
    createdAt,
    updatedAt,
  };

  return {
    graph,
    migrated: sourceVersion < GRAPH_LIMITS.SCHEMA_VERSION
      || !isBackgroundOpacity(rawBackgroundOpacity)
      || !isLayoutMode(value.layoutMode)
      || !isGraphThemePresetId(value.theme)
      || edges.length !== normalizedEdges.length,
  };
}

function normalizeViewState(value: Record<string, unknown>): GraphViewState {
  const readingMode = isReadingMode(value.readingMode) ? value.readingMode : DEFAULT_VIEW_STATE.readingMode;
  const zoom = typeof value.zoom === 'number' && Number.isFinite(value.zoom) ? value.zoom : DEFAULT_VIEW_STATE.zoom;
  const panX = typeof value.panX === 'number' && Number.isFinite(value.panX) ? value.panX : DEFAULT_VIEW_STATE.panX;
  const panY = typeof value.panY === 'number' && Number.isFinite(value.panY) ? value.panY : DEFAULT_VIEW_STATE.panY;
  const bgOpacity = value.bgOpacity === 'opaque' ? 'solid' : isBackgroundOpacity(value.bgOpacity) ? value.bgOpacity : DEFAULT_VIEW_STATE.bgOpacity;
  return { readingMode, zoom, panX, panY, bgOpacity };
}

function normalizeGraphNode(value: unknown): GraphNode | null {
  if (!isRecord(value) || typeof value.id !== 'string' || !isRecord(value.position) || !isRecord(value.data)) return null;
  const x = typeof value.position.x === 'number' ? value.position.x : 0;
  const y = typeof value.position.y === 'number' ? value.position.y : 0;
  const data = value.data;
  const title = typeof data.title === 'string' ? data.title : '';
  const fontSize = isFontSize(data.fontSize) ? data.fontSize : 'md';
  const nodeData: GraphNodeData = {
    title,
    definition: typeof data.definition === 'string' ? data.definition : undefined,
    details: typeof data.details === 'string' ? data.details : undefined,
    color: typeof data.color === 'string' ? data.color : DEFAULT_NODE_COLORS[0],
    fontSize,
    label: typeof data.label === 'string' ? data.label : undefined,
    bold: typeof data.bold === 'boolean' ? data.bold : undefined,
    fontWeight: data.fontWeight === 'bold' ? 'bold' : data.fontWeight === 'normal' ? 'normal' : undefined,
    customColor: typeof data.customColor === 'boolean' ? data.customColor : undefined,
    imageUrl: typeof data.imageUrl === 'string' && isValidImageUrl(data.imageUrl) ? data.imageUrl : undefined,
    imageDataUrl: typeof data.imageDataUrl === 'string' && isSafeGraphImageDataUrl(data.imageDataUrl) ? data.imageDataUrl : undefined,
    imageAlt: typeof data.imageAlt === 'string' ? data.imageAlt.slice(0, GRAPH_LIMITS.TITLE_MAX) : undefined,
  };
  const type = isGraphNodeType(value.type) ? value.type : 'concept';
  return { id: value.id, position: { x, y }, data: nodeData, type };
}

function normalizeGraphEdge(value: unknown): GraphEdge | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.source !== 'string' || typeof value.target !== 'string') return null;
  const arrowType = value.arrowType === 'none' || value.arrowType === 'both' ? value.arrowType : 'arrow';
  return {
    id: value.id,
    source: value.source,
    target: value.target,
    label: typeof value.label === 'string' ? value.label : undefined,
    animated: typeof value.animated === 'boolean' ? value.animated : undefined,
    arrowType,
  };
}

function normalizeNotes(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
}

function buildLegacyNotes(nodes: GraphNode[]): Record<string, string> {
  const notes: Record<string, string> = {};
  for (const node of nodes) {
    if (!node.data.title) continue;
    const parts: string[] = [];
    if (node.data.definition) parts.push(`<p>${escapeHtml(node.data.definition)}</p>`);
    if (node.data.details) parts.push(`<p>${escapeHtml(node.data.details)}</p>`);
    const content = parts.join('');
    if (!content) continue;
    notes[node.data.title] = notes[node.data.title]
      ? `${notes[node.data.title]}<hr />${content}`
      : content;
  }
  return notes;
}

function getDefaultBackgroundOpacity(): BackgroundOpacity {
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) {
    return 'solid';
  }
  return 'translucent';
}

function isGraphErrorCode(value: string): value is GraphErrorCode {
  return Object.values(GraphErrorCode).includes(value as GraphErrorCode);
}
