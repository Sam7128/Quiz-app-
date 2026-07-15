// Knowledge Graph Type Definitions — v3

// Text field length constants
export const GRAPH_LIMITS = {
  TITLE_MAX: 100,
  DEFINITION_MAX: 500,
  DETAILS_MAX: 2000,
  NAME_MAX: 50,
  MERMAID_INPUT_MAX: 50000,
  EDGE_LABEL_MAX: 100,
  MAX_GRAPHS: 20,
  MAX_NODES: 200,
  MAX_EDGES: 500,
  NOTES_MAX: 10000,
  STICKY_TEXT_MAX: 500,
  MAX_STICKY_NOTES: 20,
  MAX_IMAGE_NODES: 4,
  SCHEMA_VERSION: 3,
  IMAGE_URL_MAX: 1000,
  IMAGE_UPLOAD_MAX_BYTES: 6 * 1024 * 1024,
  IMAGE_DATA_URL_MAX: 320_000,
} as const;

export type NodeShapeType =
  | 'concept'
  | 'square'
  | 'rounded'
  | 'pill'
  | 'circle'
  | 'diamond'
  | 'hexagon'
  | 'cloud';
export type GraphNodeType = NodeShapeType | 'sticky' | 'image';
export type ArrowType = 'arrow' | 'none' | 'both';
export type ReadingMode = 'expand-all' | 'progressive';
export type FontSize = 'sm' | 'md' | 'lg';
export type BackgroundOpacity = 'translucent' | 'solid';
export type LayoutMode = 'free' | 'radial';
export type GraphThemePresetId =
  | 'classic'
  | 'ocean'
  | 'emerald'
  | 'sunset'
  | 'lavender'
  | 'midnight';

export interface GraphNodeData {
  title: string;
  definition?: string;
  details?: string;
  color: string;
  fontSize: FontSize;
  label?: string;
  bold?: boolean;
  fontWeight?: 'normal' | 'bold';
  /** true when the user explicitly selected a custom palette color. */
  customColor?: boolean;
  imageUrl?: string;
  /** Sanitized raster data URL used by standalone draggable image nodes. */
  imageDataUrl?: string;
  imageAlt?: string;
}

export interface GraphNode {
  id: string;
  position: { x: number; y: number };
  data: GraphNodeData;
  type: GraphNodeType;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
  arrowType: ArrowType;
}

export interface GraphViewState {
  readingMode: ReadingMode;
  zoom: number;
  panX: number;
  panY: number;
  /** @deprecated v2 view-state field. Use GraphDocument.backgroundOpacity. */
  bgOpacity?: BackgroundOpacity | 'opaque';
}

export interface GraphDocument {
  id: string;
  schemaVersion: number;
  name: string;
  backgroundOpacity: BackgroundOpacity;
  layoutMode: LayoutMode;
  theme: GraphThemePresetId;
  nodes: GraphNode[];
  edges: GraphEdge[];
  viewState: GraphViewState;
  notes: Record<string, string>;
  editMode: 'visual' | 'code';
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_VIEW_STATE: GraphViewState = {
  readingMode: 'progressive',
  zoom: 1,
  panX: 0,
  panY: 0,
  bgOpacity: 'translucent',
};

export const DEFAULT_NODE_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
] as const;

export enum GraphErrorCode {
  PARSE_FAILED = 'PARSE_FAILED',
  INVALID_FORMAT = 'INVALID_FORMAT',
  MAX_GRAPHS_EXCEEDED = 'MAX_GRAPHS_EXCEEDED',
  MAX_NODES_EXCEEDED = 'MAX_NODES_EXCEEDED',
  MAX_EDGES_EXCEEDED = 'MAX_EDGES_EXCEEDED',
  MAX_STICKY_EXCEEDED = 'MAX_STICKY_EXCEEDED',
  MAX_IMAGE_NODES_EXCEEDED = 'MAX_IMAGE_NODES_EXCEEDED',
  TITLE_TOO_LONG = 'TITLE_TOO_LONG',
  DEFINITION_TOO_LONG = 'DEFINITION_TOO_LONG',
  DETAILS_TOO_LONG = 'DETAILS_TOO_LONG',
  EDGE_LABEL_TOO_LONG = 'EDGE_LABEL_TOO_LONG',
  NOTES_TOO_LONG = 'NOTES_TOO_LONG',
  STICKY_TEXT_TOO_LONG = 'STICKY_TEXT_TOO_LONG',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  SAVE_ERROR = 'SAVE_ERROR',
  DELETE_NOT_FOUND = 'DELETE_NOT_FOUND',
  DELETE_ERROR = 'DELETE_ERROR',
  NODE_IMAGE_URL_TOO_LONG = 'NODE_IMAGE_URL_TOO_LONG',
  INVALID_IMAGE_URL_PROTOCOL = 'INVALID_IMAGE_URL_PROTOCOL',
  IMAGE_DATA_TOO_LARGE = 'IMAGE_DATA_TOO_LARGE',
  INVALID_IMAGE_DATA = 'INVALID_IMAGE_DATA',

  /** @deprecated Use MAX_GRAPHS_EXCEEDED. */
  MAX_GRAPHS_LIMIT = 'MAX_GRAPHS_EXCEEDED',
  /** @deprecated Use MAX_NODES_EXCEEDED. */
  MAX_NODES_LIMIT = 'MAX_NODES_EXCEEDED',
  /** @deprecated Use MAX_EDGES_EXCEEDED. */
  MAX_EDGES_LIMIT = 'MAX_EDGES_EXCEEDED',
  /** @deprecated Use MAX_STICKY_EXCEEDED. */
  MAX_STICKY_LIMIT = 'MAX_STICKY_EXCEEDED',
  /** @deprecated Use TITLE_TOO_LONG. */
  NODE_TITLE_TOO_LONG = 'TITLE_TOO_LONG',
  /** @deprecated Use DEFINITION_TOO_LONG. */
  NODE_DEF_TOO_LONG = 'DEFINITION_TOO_LONG',
  /** @deprecated Use DETAILS_TOO_LONG. */
  NODE_DETAILS_TOO_LONG = 'DETAILS_TOO_LONG',
  /** @deprecated Use NOTES_TOO_LONG. */
  NOTE_CONTENT_TOO_LONG = 'NOTES_TOO_LONG',
  /** @deprecated Use SAVE_ERROR. */
  SAVE_FAILED = 'SAVE_ERROR',
  /** @deprecated Use DELETE_NOT_FOUND. */
  GRAPH_NOT_FOUND = 'DELETE_NOT_FOUND',
  /** @deprecated Use DELETE_ERROR. */
  DELETE_FAILED = 'DELETE_ERROR',
}

export enum GraphWarningCode {
  SIZE_APPROACHING_LIMIT = 'SIZE_APPROACHING_LIMIT',
}
