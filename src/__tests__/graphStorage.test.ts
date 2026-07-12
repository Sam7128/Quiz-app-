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

    // ── Milestone 1 Added Tests ─────────────────────────────────────

    it('migrates v1 format and merges notes', () => {
      const v1Graph = {
        id: 'v1-graph-id',
        schemaVersion: 1,
        name: 'V1 Graph',
        nodes: [
          {
            id: 'n-1',
            position: { x: 0, y: 0 },
            data: {
              title: 'React',
              definition: 'A library for building user interfaces',
              details: 'Created by Facebook',
              color: '#3B82F6',
              fontSize: 'md'
            },
            type: 'concept'
          },
          {
            id: 'n-2',
            position: { x: 10, y: 10 },
            data: {
              title: 'Vue',
              definition: 'The progressive framework',
              color: '#10B981',
              fontSize: 'md'
            },
            type: 'rounded'
          }
        ],
        edges: [],
        viewState: {
          readingMode: 'progressive',
          zoom: 1,
          panX: 0,
          panY: 0
        },
        createdAt: '2026-07-12T00:00:00Z',
        updatedAt: '2026-07-12T00:00:00Z'
      };

      store['mindspark_graphs'] = JSON.stringify([v1Graph]);

      const graphs = getGraphs();
      expect(graphs).toHaveLength(1);
      const migrated = graphs[0];
      
      expect(migrated.schemaVersion).toBe(2);
      expect(migrated.editMode).toBe('visual');
      expect(migrated.notes).toBeDefined();
      expect(migrated.notes['React']).toBe('<p>A library for building user interfaces</p><p>Created by Facebook</p>');
      expect(migrated.notes['Vue']).toBe('<p>The progressive framework</p>');

      // Verify localStorage is updated to v2
      const updatedRaw = store['mindspark_graphs'];
      const updatedGraphs = JSON.parse(updatedRaw);
      expect(updatedGraphs[0].schemaVersion).toBe(2);
      expect(updatedGraphs[0].notes['React']).toBe('<p>A library for building user interfaces</p><p>Created by Facebook</p>');
    });

    it('throws Fatal Error during migration failure and does not overwrite localStorage', () => {
      const v1Graph = {
        id: 'v1-graph-id',
        schemaVersion: 1,
        name: 'V1 Graph',
        nodes: [
          {
            id: 'n-1',
            position: { x: 0, y: 0 },
            data: {
              title: 'React',
              definition: 'A library for building user interfaces',
              color: '#3B82F6',
              fontSize: 'md'
            },
            type: 'concept'
          }
        ],
        edges: [],
        viewState: {
          readingMode: 'progressive',
          zoom: 1,
          panX: 0,
          panY: 0
        },
        createdAt: '2026-07-12T00:00:00Z',
        updatedAt: '2026-07-12T00:00:00Z'
      };

      const originalRaw = JSON.stringify([v1Graph]);
      store['mindspark_graphs'] = originalRaw;

      // Mock setItem to throw Error when migration tries to write it back
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new DOMException('quota exceeded', 'QuotaExceededError');
      });

      // getGraphs should throw an error, not returning []
      expect(() => getGraphs()).toThrow();

      // Verify the localStorage value is not modified or cleared
      expect(store['mindspark_graphs']).toBe(originalRaw);
    });

    it('blocks saveGraph when sticky notes exceed MAX_STICKY_NOTES', () => {
      const g = createNewGraph('Too Many Sticky Notes');
      const stickyNodes = Array.from({ length: 21 }, (_, i) => ({
        id: `s-${i}`,
        position: { x: i, y: i },
        data: { title: `Sticky ${i}`, color: '#F59E0B', fontSize: 'md' as const },
        type: 'sticky' as const,
      }));

      const oversized: GraphDocument = {
        ...g,
        nodes: stickyNodes,
      };

      const result = saveGraph(oversized);
      expect(result.success).toBe(false);
      expect(result.error).toContain('最多只能有 20 個便利貼');
    });

    it('returns warning when graph serialized size exceeds 3MB', () => {
      const g = createNewGraph('Huge Graph');
      
      // Generate multiple note items to push total size over 3MB
      // Each note item is within the 10000 characters limit.
      const largeNotes: Record<string, string> = {};
      for (let i = 0; i < 330; i++) {
        largeNotes[`note-${i}`] = 'a'.repeat(10000);
      }
      g.notes = largeNotes;

      const result = saveGraph(g);
      expect(result.success).toBe(true);
      expect(result.warning).toBe('圖表大小接近限制，請刪除部分資料');
    });

    // ── Milestone 1 Remedy Added Tests ──────────────────────────────
    it('blocks saveGraph when node title exceeds TITLE_MAX', () => {
      const g = createNewGraph('Test');
      g.nodes = [{
        id: 'n-1',
        position: { x: 0, y: 0 },
        data: { title: 'a'.repeat(101), color: '#3B82F6', fontSize: 'md' },
        type: 'concept'
      }];
      const result = saveGraph(g);
      expect(result.success).toBe(false);
      expect(result.error).toContain('節點標題不可超過');
    });

    it('blocks saveGraph when node definition exceeds DEFINITION_MAX', () => {
      const g = createNewGraph('Test');
      g.nodes = [{
        id: 'n-1',
        position: { x: 0, y: 0 },
        data: { title: 'React', definition: 'a'.repeat(501), color: '#3B82F6', fontSize: 'md' },
        type: 'concept'
      }];
      const result = saveGraph(g);
      expect(result.success).toBe(false);
      expect(result.error).toContain('節點定義不可超過');
    });

    it('blocks saveGraph when node details exceeds DETAILS_MAX', () => {
      const g = createNewGraph('Test');
      g.nodes = [{
        id: 'n-1',
        position: { x: 0, y: 0 },
        data: { title: 'React', details: 'a'.repeat(2001), color: '#3B82F6', fontSize: 'md' },
        type: 'concept'
      }];
      const result = saveGraph(g);
      expect(result.success).toBe(false);
      expect(result.error).toContain('節點詳情不可超過');
    });

    it('blocks saveGraph when sticky text exceeds STICKY_TEXT_MAX', () => {
      const g = createNewGraph('Test');
      g.nodes = [{
        id: 'n-1',
        position: { x: 0, y: 0 },
        data: { title: 'a'.repeat(501), color: '#F59E0B', fontSize: 'md' },
        type: 'sticky'
      }];
      const result = saveGraph(g);
      expect(result.success).toBe(false);
      expect(result.error).toContain('便利貼文字不可超過');
    });

    it('blocks saveGraph when edge label exceeds EDGE_LABEL_MAX', () => {
      const g = createNewGraph('Test');
      g.edges = [{
        id: 'e-1',
        source: 'n-1',
        target: 'n-2',
        label: 'a'.repeat(101),
        arrowType: 'arrow'
      }];
      const result = saveGraph(g);
      expect(result.success).toBe(false);
      expect(result.error).toContain('連線標籤不可超過');
    });

    it('blocks saveGraph when note content exceeds NOTES_MAX', () => {
      const g = createNewGraph('Test');
      g.notes = { 'React': 'a'.repeat(10001) };
      const result = saveGraph(g);
      expect(result.success).toBe(false);
      expect(result.error).toContain('筆記內容不可超過');
    });

    it('concatenates rather than overwriting notes during migration of duplicate title nodes', () => {
      const v1Graph = {
        id: 'v1-graph-id',
        schemaVersion: 1,
        name: 'V1 Graph',
        nodes: [
          {
            id: 'n-1',
            position: { x: 0, y: 0 },
            data: {
              title: 'React',
              definition: 'Definition A',
              details: 'Details A',
              color: '#3B82F6',
              fontSize: 'md'
            },
            type: 'concept'
          },
          {
            id: 'n-2',
            position: { x: 10, y: 10 },
            data: {
              title: 'React',
              definition: 'Definition B',
              details: 'Details B',
              color: '#3B82F6',
              fontSize: 'md'
            },
            type: 'concept'
          }
        ],
        edges: [],
        viewState: {
          readingMode: 'progressive',
          zoom: 1,
          panX: 0,
          panY: 0
        },
        createdAt: '2026-07-12T00:00:00Z',
        updatedAt: '2026-07-12T00:00:00Z'
      };

      store['mindspark_graphs'] = JSON.stringify([v1Graph]);

      const graphs = getGraphs();
      expect(graphs).toHaveLength(1);
      const migrated = graphs[0];

      // Note content for "React" should contain both nodes' info concatenated
      expect(migrated.notes['React']).toBe('<p>Definition A</p><p>Details A</p><hr /><p>Definition B</p><p>Details B</p>');
    });

    it('escapes HTML in definition and details during migration', () => {
      const v1Graph = {
        id: 'v1-graph-id',
        schemaVersion: 1,
        name: 'V1 Graph',
        nodes: [
          {
            id: 'n-1',
            position: { x: 0, y: 0 },
            data: {
              title: 'React',
              definition: 'A < library > & "Facebook"',
              details: 'Details \'here\'',
              color: '#3B82F6',
              fontSize: 'md'
            },
            type: 'concept'
          }
        ],
        edges: [],
        viewState: {
          readingMode: 'progressive',
          zoom: 1,
          panX: 0,
          panY: 0
        },
        createdAt: '2026-07-12T00:00:00Z',
        updatedAt: '2026-07-12T00:00:00Z'
      };

      store['mindspark_graphs'] = JSON.stringify([v1Graph]);

      const graphs = getGraphs();
      expect(graphs[0].notes['React']).toBe('<p>A &lt; library &gt; &amp; &quot;Facebook&quot;</p><p>Details &#39;here&#39;</p>');
    });

    it('throws migration error in getGraphById and deleteGraph when migration fails', () => {
      const v1Graph = {
        id: 'v1-graph-id',
        schemaVersion: 1,
        name: 'V1 Graph',
        nodes: [
          {
            id: 'n-1',
            position: { x: 0, y: 0 },
            data: { title: 'React', definition: 'A library', color: '#3B82F6', fontSize: 'md' },
            type: 'concept'
          }
        ],
        edges: [],
        viewState: {
          readingMode: 'progressive',
          zoom: 1,
          panX: 0,
          panY: 0
        },
        createdAt: '2026-07-12T00:00:00Z',
        updatedAt: '2026-07-12T00:00:00Z'
      };

      store['mindspark_graphs'] = JSON.stringify([v1Graph]);

      // Mock setItem to throw Error when migration tries to write it back
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new DOMException('quota exceeded', 'QuotaExceededError');
      });

      // getGraphById should throw error rather than returning null
      expect(() => getGraphById('v1-graph-id')).toThrow();

      // Re-mock for deleteGraph since mockImplementationOnce is exhausted
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new DOMException('quota exceeded', 'QuotaExceededError');
      });

      // deleteGraph should throw error rather than returning mutation result
      expect(() => deleteGraph('v1-graph-id')).toThrow();
    });
  });

  describe('Milestone 3 - renameNoteKey', () => {
    it('transfers note content from old title key to new title key', async () => {
      const { renameNoteKey } = await import('../../components/KnowledgeGraph/GraphNotesPanel');
      const notes = {
        'React': '<p>React is awesome</p>',
        'Vue': '<p>Vue is nice</p>',
      };

      const updated = renameNoteKey(notes, 'React', 'React Native');
      expect(updated['React Native']).toBe('<p>React is awesome</p>');
      expect(updated['React']).toBeUndefined();
      expect(updated['Vue']).toBe('<p>Vue is nice</p>');
    });

    it('returns unchanged notes if oldTitle or newTitle is empty or identical', async () => {
      const { renameNoteKey } = await import('../../components/KnowledgeGraph/GraphNotesPanel');
      const notes = {
        'React': '<p>React is awesome</p>',
      };

      expect(renameNoteKey(notes, '', 'Vue')).toEqual(notes);
      expect(renameNoteKey(notes, 'React', '')).toEqual(notes);
      expect(renameNoteKey(notes, 'React', 'React')).toEqual(notes);
    });
  });
});
