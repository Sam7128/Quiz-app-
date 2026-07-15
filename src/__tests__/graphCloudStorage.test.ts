import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { GraphDocument } from '../../types/graphTypes';
import {
  getDirtyGraphs,
  markGraphDirty,
  clearGraphDirty,
  syncGraphsToCloud,
  uploadGraphToCloud,
  deleteGraphFromCloud,
  resolveGraphConflict,
  uploadGraphToCloudSafely,
  GraphCloudConflictError,
} from '../../services/graphCloudStorage';

// ── Mock localStorage ──────────────────────────────────────────────
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete store[key];
  }),
  clear: vi.fn(() => {
    for (const k of Object.keys(store)) delete store[k];
  }),
  get length() {
    return Object.keys(store).length;
  },
  key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

// ── Mock Supabase Client ────────────────────────────────────────────
const mockSelectFn = vi.fn();
const mockUpsertFn = vi.fn();
const mockDeleteFn = vi.fn();

vi.mock('../../services/supabase', () => {
  return {
    supabase: {
      from: vi.fn((table: string) => {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => mockSelectFn(table)),
          })),
          upsert: vi.fn((data: unknown) => mockUpsertFn(table, data)),
          delete: vi.fn(() => ({
            eq: vi.fn(() => mockDeleteFn(table)),
          })),
        };
      }),
    },
  };
});

// Helper to create test GraphDocument
function makeTestGraph(id: string, name: string, updatedAt: string): GraphDocument {
  return {
    id,
    schemaVersion: 3,
    name,
    backgroundOpacity: 'translucent',
    layoutMode: 'free',
    theme: 'classic',
    nodes: [],
    edges: [],
    viewState: {
      readingMode: 'progressive',
      zoom: 1,
      panX: 0,
      panY: 0,
    },
    notes: {},
    editMode: 'visual',
    createdAt: new Date().toISOString(),
    updatedAt,
  };
}

beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();
  mockSelectFn.mockReset();
  mockUpsertFn.mockReset();
  mockDeleteFn.mockReset();
});

describe('graphCloudStorage', () => {
  describe('Dirty Queue Management', () => {
    it('marks a graph dirty and retrieves it', () => {
      expect(getDirtyGraphs()).toEqual([]);
      markGraphDirty('graph-1');
      expect(getDirtyGraphs()).toEqual(['graph-1']);
      markGraphDirty('graph-1'); // duplicate check
      expect(getDirtyGraphs()).toEqual(['graph-1']);
      markGraphDirty('graph-2');
      expect(getDirtyGraphs()).toEqual(['graph-1', 'graph-2']);
    });

    it('clears a graph from dirty queue', () => {
      markGraphDirty('graph-1');
      markGraphDirty('graph-2');
      clearGraphDirty('graph-1');
      expect(getDirtyGraphs()).toEqual(['graph-2']);
      clearGraphDirty('graph-2');
      expect(getDirtyGraphs()).toEqual([]);
    });
  });

  describe('Cloud CRUD Operations', () => {
    it('uploadGraphToCloud calls supabase upsert', async () => {
      mockUpsertFn.mockResolvedValue({ error: null });
      const g = makeTestGraph('g-1', 'Cloud Graph', '2026-07-13T00:00:00Z');
      await uploadGraphToCloud(g, 'user-123');

      expect(mockUpsertFn).toHaveBeenCalledWith('knowledge_graphs', {
        id: 'g-1',
        user_id: 'user-123',
        graph_data: JSON.parse(JSON.stringify(g)),
        updated_at: '2026-07-13T00:00:00Z',
      });
    });

    it('deleteGraphFromCloud calls supabase delete', async () => {
      mockDeleteFn.mockResolvedValue({ error: null });
      await deleteGraphFromCloud('g-1');
      expect(mockDeleteFn).toHaveBeenCalledWith('knowledge_graphs');
    });

    it('autosave guard refuses to overwrite a newer cloud graph', async () => {
      const local = makeTestGraph('g-1', 'Local', '2026-07-13T01:00:00.000Z');
      const cloud = makeTestGraph('g-1', 'Cloud Newer', '2026-07-13T02:00:00.000Z');
      mockSelectFn.mockResolvedValue({ data: [{ id: 'g-1', user_id: 'user-123', graph_data: cloud }], error: null });
      mockUpsertFn.mockResolvedValue({ error: null });

      await expect(uploadGraphToCloudSafely(local, 'user-123')).rejects.toBeInstanceOf(GraphCloudConflictError);
      expect(mockUpsertFn).not.toHaveBeenCalled();
    });
  });

  describe('Sync and LWW Strategy', () => {
    it('uploads local-only graphs to cloud', async () => {
      // Setup: Cloud has nothing
      mockSelectFn.mockResolvedValue({ data: [], error: null });
      mockUpsertFn.mockResolvedValue({ error: null });

      const local = [
        makeTestGraph('g-1', 'Local 1', '2026-07-13T00:00:00.000Z'),
      ];

      const res = await syncGraphsToCloud(local, 'user-123');
      expect(res.conflicts).toHaveLength(0);
      expect(res.syncedLocal).toHaveLength(1);
      expect(mockUpsertFn).toHaveBeenCalled();
    });

    it('downloads cloud-only graphs to local', async () => {
      // Setup: Cloud has 1 graph, local has nothing
      const cloudGraph = makeTestGraph('g-cloud', 'Cloud Graph', '2026-07-13T00:00:00.000Z');
      mockSelectFn.mockResolvedValue({
        data: [{ id: 'g-cloud', user_id: 'user-123', graph_data: cloudGraph }],
        error: null,
      });

      const res = await syncGraphsToCloud([], 'user-123');
      expect(res.conflicts).toHaveLength(0);
      expect(res.syncedLocal).toHaveLength(1);
      expect(res.syncedLocal[0].id).toBe('g-cloud');
    });

    it('applies LWW: Cloud is newer -> overwrites local', async () => {
      const localGraph = makeTestGraph('g-1', 'Local', '2026-07-13T00:00:00.000Z');
      const cloudGraph = makeTestGraph('g-1', 'Cloud Newer', '2026-07-13T01:00:00.000Z');

      mockSelectFn.mockResolvedValue({
        data: [{ id: 'g-1', user_id: 'user-123', graph_data: cloudGraph }],
        error: null,
      });

      const res = await syncGraphsToCloud([localGraph], 'user-123');
      expect(res.conflicts).toHaveLength(0);
      expect(res.syncedLocal[0].name).toBe('Cloud Newer');
      expect(res.syncedLocal[0].updatedAt).toBe('2026-07-13T01:00:00.000Z');
    });

    it('applies LWW: Local is newer -> uploads to cloud', async () => {
      const localGraph = makeTestGraph('g-1', 'Local Newer', '2026-07-13T02:00:00.000Z');
      const cloudGraph = makeTestGraph('g-1', 'Cloud Old', '2026-07-13T01:00:00.000Z');

      mockSelectFn.mockResolvedValue({
        data: [{ id: 'g-1', user_id: 'user-123', graph_data: cloudGraph }],
        error: null,
      });
      mockUpsertFn.mockResolvedValue({ error: null });

      const res = await syncGraphsToCloud([localGraph], 'user-123');
      expect(res.conflicts).toHaveLength(0);
      expect(res.syncedLocal[0].name).toBe('Local Newer');
      expect(mockUpsertFn).toHaveBeenCalled();
    });

    it('detects conflict: local modified (dirty) AND cloud has different updatedAt', async () => {
      const localGraph = makeTestGraph('g-conflict', 'Local Dirty', '2026-07-13T02:00:00.000Z');
      const cloudGraph = makeTestGraph('g-conflict', 'Cloud Diff', '2026-07-13T03:00:00.000Z');

      // Mark local as dirty
      markGraphDirty('g-conflict');

      mockSelectFn.mockResolvedValue({
        data: [{ id: 'g-conflict', user_id: 'user-123', graph_data: cloudGraph }],
        error: null,
      });

      const res = await syncGraphsToCloud([localGraph], 'user-123');
      expect(res.conflicts).toHaveLength(1);
      expect(res.conflicts[0].local.name).toBe('Local Dirty');
      expect(res.conflicts[0].cloud.name).toBe('Cloud Diff');
    });

  });

  describe('Conflict Resolution Dialog Forks', () => {
    it('handles fork: Keep Local (User confirms keepLocal)', async () => {
      mockUpsertFn.mockResolvedValue({ error: null });
      markGraphDirty('g-1');

      const local = makeTestGraph('g-1', 'Local Modify', '2026-07-13T01:00:00.000Z');
      const cloud = makeTestGraph('g-1', 'Cloud Edit', '2026-07-13T02:00:00.000Z');

      const confirmMock = vi.fn().mockResolvedValue(true); // clicks Keep Local

      const res = await resolveGraphConflict(local, cloud, 'user-123', confirmMock);
      expect(res.action).toBe('keep_local');
      expect(res.updatedLocal.id).toBe('g-1');
      expect(getDirtyGraphs()).not.toContain('g-1');
      expect(mockUpsertFn).toHaveBeenCalled();
    });

    it('handles fork: Use Cloud (User cancels keepLocal, confirms useCloud)', async () => {
      markGraphDirty('g-1');

      const local = makeTestGraph('g-1', 'Local Modify', '2026-07-13T01:00:00.000Z');
      const cloud = makeTestGraph('g-1', 'Cloud Edit', '2026-07-13T02:00:00.000Z');

      const confirmMock = vi
        .fn()
        .mockResolvedValueOnce(false) // Clicks "Other Options"
        .mockResolvedValueOnce(true);  // Clicks "Use Cloud"

      const res = await resolveGraphConflict(local, cloud, 'user-123', confirmMock);
      expect(res.action).toBe('use_cloud');
      expect(res.updatedLocal.name).toBe('Cloud Edit');
      expect(getDirtyGraphs()).not.toContain('g-1');
    });

    it('handles fork: Save as Copy (User cancels keepLocal, cancels useCloud)', async () => {
      mockUpsertFn.mockResolvedValue({ error: null });
      markGraphDirty('g-1');

      const local = makeTestGraph('g-1', 'Local Modify', '2026-07-13T01:00:00.000Z');
      const cloud = makeTestGraph('g-1', 'Cloud Edit', '2026-07-13T02:00:00.000Z');

      const confirmMock = vi
        .fn()
        .mockResolvedValueOnce(false) // Clicks "Other Options"
        .mockResolvedValueOnce(false); // Clicks "Save Copy"

      const copyId = '00000000-0000-4000-8000-000000000123';
      const uuidSpy = vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(copyId);
      const res = await resolveGraphConflict(local, cloud, 'user-123', confirmMock);
      uuidSpy.mockRestore();
      expect(res.action).toBe('save_copy');
      expect(res.updatedLocal.name).toBe('Cloud Edit'); // original reverts to cloud
      expect(res.copyLocal?.name).toBe('Local Modify (衝突副本)');
      expect(getDirtyGraphs()).not.toContain('g-1');
      expect(getDirtyGraphs()).not.toContain(copyId);
      expect(mockUpsertFn).toHaveBeenCalled();
    });

    it('falls back to local-only mode when the cloud table is missing', async () => {
      const local = [makeTestGraph('g-local', 'Local Graph', '2026-07-13T00:00:00.000Z')];
      const missingTableError = {
        code: 'PGRST205',
        message: "Could not find the table 'public.knowledge_graphs' in the schema cache",
      };
      mockSelectFn.mockResolvedValue({ data: null, error: missingTableError });

      const firstSync = syncGraphsToCloud(local, 'user-123');
      const secondSync = syncGraphsToCloud(local, 'user-123');
      expect(mockSelectFn).toHaveBeenCalledTimes(1);

      await expect(firstSync).resolves.toEqual({
        syncedLocal: local,
        conflicts: [],
      });
      await expect(secondSync).resolves.toEqual({
        syncedLocal: local,
        conflicts: [],
      });
      expect(mockUpsertFn).not.toHaveBeenCalled();

      await uploadGraphToCloud(local[0], 'user-123');
      await uploadGraphToCloudSafely(local[0], 'user-123');
      await deleteGraphFromCloud(local[0].id);
      expect(mockSelectFn).toHaveBeenCalledTimes(1);
      expect(mockUpsertFn).not.toHaveBeenCalled();
      expect(mockDeleteFn).not.toHaveBeenCalled();
    });
  });
});
