// Knowledge Graph Type Definitions — v1

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
  SCHEMA_VERSION: 1,
} as const;

export type NodeShapeType = 'concept' | 'rounded' | 'diamond';
export type ArrowType = 'arrow' | 'none' | 'both';
export type ReadingMode = 'expand-all' | 'progressive';
export type FontSize = 'sm' | 'md' | 'lg';

export interface GraphNodeData {
  title: string;
  definition?: string;
  details?: string;
  color: string;
  fontSize: FontSize;
}

export interface GraphNode {
  id: string;
  position: { x: number; y: number };
  data: GraphNodeData;
  type: NodeShapeType;
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
}

export interface GraphDocument {
  id: string;
  schemaVersion: number;
  name: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  viewState: GraphViewState;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_VIEW_STATE: GraphViewState = {
  readingMode: 'progressive',
  zoom: 1,
  panX: 0,
  panY: 0,
};

export const DEFAULT_NODE_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
] as const;
