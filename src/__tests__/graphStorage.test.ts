import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getGraphs,
  getGraphById,
  saveGraph,
  deleteGraph,
  createNewGraph,
  validateGraphName,
} from '../../services/graphStorage';
import type { GraphDocument } from '../../types/graphTypes';
import { GRAPH_LIMITS } from '../../types/graphTypes';

// Mock localStorage
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
  removeItem: vi.fn((key: string) => { delete store[key]; }),
  clear: vi.fn(() => { for (const k of Object.keys(store)) delete store[k]; }),
  get length() { return Object.keys(store).length; },
  key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();
});

describe('graphStorage', () => {
  describe('createNewGraph', () => {
    it('creates a graph with default name', () => {
      const g = createNewGraph();
      expect(g.name).toBe('新圖表');
      expect(g.schemaVersion).toBe(GRAPH_LIMITS.SCHEMA_VERSION);
      expect(g.nodes).toEqual([]);
      expect(g.edges).toEqual([]);
      expect(g.id).toBeTruthy();
    });

    it('creates a graph with custom name', () => {
      const g = createNewGraph('我的圖表');
      expect(g.name).toBe('我的圖表');
    });
  });

  describe('validateGraphName', () => {
    it('trims whitespace', () => {
      expect(validateGraphName('  hello  ')).toBe('hello');
    });

    it('returns fallback for empty string', () => {
      expect(validateGraphName('')).toBe('未命名圖表');
      expect(validateGraphName('   ')).toBe('未命名圖表');
    });

    it('truncates to NAME_MAX', () => {
      const long = 'a'.repeat(100);
      expect(validateGraphName(long).length).toBe(GRAPH_LIMITS.NAME_MAX);
    });
  });

  describe('CRUD operations', () => {
    it('getGraphs returns empty array when no data', () => {
      expect(getGraphs()).toEqual([]);
    });

    it('getGraphs returns empty array on JSON corruption', () => {
      store['mindspark_graphs'] = 'not-valid-json{{{';
      expect(getGraphs()).toEqual([]);
    });

    it('saveGraph and getGraphs round-trip', () => {
      const g = createNewGraph('Test');
      const result = saveGraph(g);
      expect(result.success).toBe(true);

      const graphs = getGraphs();
      expect(graphs).toHaveLength(1);
      expect(graphs[0].name).toBe('Test');
    });

    it('saveGraph updates existing graph', () => {
      const g = createNewGraph('Original');
      saveGraph(g);
      saveGraph({ ...g, name: 'Updated' });

      const graphs = getGraphs();
      expect(graphs).toHaveLength(1);
      expect(graphs[0].name).toBe('Updated');
    });

    it('saveGraph enforces MAX_GRAPHS limit', () => {
      for (let i = 0; i < GRAPH_LIMITS.MAX_GRAPHS; i++) {
        saveGraph(createNewGraph(`Graph ${i}`));
      }
      const extra = createNewGraph('Too Many');
      const result = saveGraph(extra);
      expect(result.success).toBe(false);
      expect(result.error).toContain(`${GRAPH_LIMITS.MAX_GRAPHS}`);
    });

    it('saveGraph detects QuotaExceededError by name', () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        const err = new DOMException('quota exceeded', 'QuotaExceededError');
        throw err;
      });
      const g = createNewGraph('Test');
      const result = saveGraph(g);
      expect(result.success).toBe(false);
      expect(result.error).toContain('儲存空間不足');
    });

    it('saveGraph rejects documents exceeding MAX_NODES', () => {
      const g = createNewGraph('Too Many Nodes');
      const oversized: GraphDocument = {
        ...g,
        nodes: Array.from({ length: GRAPH_LIMITS.MAX_NODES + 1 }, (_, i) => ({
          id: `n-${i}`,
          position: { x: i, y: i },
          data: { title: `Node ${i}`, color: '#3B82F6', fontSize: 'md' },
          type: 'concept',
        })),
      };

      const result = saveGraph(oversized);
      expect(result.success).toBe(false);
      expect(result.error).toContain(`${GRAPH_LIMITS.MAX_NODES}`);
    });

    it('saveGraph rejects documents exceeding MAX_EDGES', () => {
      const g = createNewGraph('Too Many Edges');
      const oversized: GraphDocument = {
        ...g,
        edges: Array.from({ length: GRAPH_LIMITS.MAX_EDGES + 1 }, (_, i) => ({
          id: `e-${i}`,
          source: `n-${i}`,
          target: `n-${i + 1}`,
          arrowType: 'arrow',
        })),
      };

      const result = saveGraph(oversized);
      expect(result.success).toBe(false);
      expect(result.error).toContain(`${GRAPH_LIMITS.MAX_EDGES}`);
    });

    it('getGraphById returns correct graph', () => {
      const g = createNewGraph('Find Me');
      saveGraph(g);
      expect(getGraphById(g.id)?.name).toBe('Find Me');
    });

    it('getGraphById returns null for missing ID', () => {
      expect(getGraphById('nonexistent')).toBeNull();
    });

    it('deleteGraph removes graph', () => {
      const g = createNewGraph('Delete Me');
      saveGraph(g);
      expect(getGraphs()).toHaveLength(1);

      const result = deleteGraph(g.id);
      expect(result.success).toBe(true);
      expect(getGraphs()).toHaveLength(0);
    });

    it('deleteGraph returns error for missing graph', () => {
      const result = deleteGraph('nonexistent');
      expect(result.success).toBe(false);
      expect(result.error).toContain('找不到');
    });
  });
});
