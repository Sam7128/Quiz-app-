import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChunkedPracticeSession, PracticeChunk } from '../../types/battleTypes';
import {
  getAllPracticeSessions,
  replaceAllPracticeSessions,
  saveChunkDraft,
  getChunkDraft,
} from '../../services/storage';

const supabaseMocks = vi.hoisted(() => ({
  from: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock('../../services/supabase', () => ({
  supabase: {
    from: supabaseMocks.from,
    auth: {
      getUser: supabaseMocks.getUser,
    },
  },
}));

import {
  syncLocalPracticeSessions,
  mergeChunkedPracticeSessions,
} from '../../services/cloudStorage';

const createSessionWithChunks = (
  id: string,
  chunkStatuses: Array<'pending' | 'in_progress' | 'completed'>,
  updatedAt: number
): ChunkedPracticeSession => {
  const chunks: PracticeChunk[] = chunkStatuses.map((status, index) => ({
    index,
    questionIds: [`q-${index}-1`, `q-${index}-2`],
    status,
    score: status === 'completed' ? 2 : 0,
    totalQuestions: 2,
    wrongQuestionIds: [],
    startedAt: updatedAt - 5000,
    completedAt: status === 'completed' ? updatedAt - 1000 : undefined,
  }));

  const allCompleted = chunks.every((c) => c.status === 'completed');

  return {
    id,
    userId: 'user-1',
    bankIds: ['bank-1'],
    bankNames: ['Bank 1'],
    bankQuestionMap: { 'bank-1': chunks.flatMap((c) => c.questionIds) },
    chunkSize: 2,
    questionIds: chunks.flatMap((c) => c.questionIds),
    chunks,
    status: allCompleted ? 'completed' : 'active',
    createdAt: updatedAt - 100_000,
    updatedAt,
    dirty: false,
    retryCount: 0,
  };
};

describe('syncLocalPracticeSessions (Chunk-level Set Union Merge & Reconcile)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    supabaseMocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
  });

  afterEach(() => {
    localStorage.clear();
  });

  // 場景 A：本地完成 3/5 chunks，雲端完成 1/5 → 本地 upsert 至雲端
  it('Scenario A: local completed 3/5, cloud completed 1/5 -> upserts merged version to cloud', async () => {
    const now = Date.now();
    const local = createSessionWithChunks('session-a', ['completed', 'completed', 'completed', 'pending', 'pending'], now);
    const cloud = createSessionWithChunks('session-a', ['completed', 'pending', 'pending', 'pending', 'pending'], now - 10_000);

    replaceAllPracticeSessions([local]);

    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    supabaseMocks.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [{
            id: cloud.id,
            user_id: cloud.userId,
            bank_ids: cloud.bankIds,
            bank_names: cloud.bankNames,
            bank_question_map: cloud.bankQuestionMap,
            chunk_size: cloud.chunkSize,
            question_ids: cloud.questionIds,
            chunks: cloud.chunks,
            status: cloud.status,
            created_at: new Date(cloud.createdAt).toISOString(),
            updated_at: new Date(cloud.updatedAt).toISOString(),
          }],
          error: null,
        }),
      }),
      upsert: upsertMock,
    });

    const result = await syncLocalPracticeSessions();
    expect(result.uploaded).toBe(1);
    expect(result.skipped).toBe(0);
    expect(upsertMock).toHaveBeenCalledTimes(1);
  });

  // 場景 B：本地完成 1/5，雲端完成 3/5 → 採用雲端版本，僅清除已完成 chunk 的 draft，未完成 chunk draft 保留
  it('Scenario B: local completed 1/5, cloud completed 3/5 -> adopts cloud version, clears only completed drafts, preserves active draft', async () => {
    const now = Date.now();
    const local = createSessionWithChunks('session-b', ['completed', 'pending', 'pending', 'pending', 'pending'], now - 10_000);
    const cloud = createSessionWithChunks('session-b', ['completed', 'completed', 'completed', 'pending', 'pending'], now);

    replaceAllPracticeSessions([local]);

    // Set drafts for chunk 1 (completed in cloud) and chunk 3 (pending in both, active draft)
    saveChunkDraft({
      sessionId: 'session-b',
      chunkIndex: 1,
      currentQuestionIndex: 1,
      score: 1,
      wrongQuestionIds: [],
      updatedAt: now,
    });
    saveChunkDraft({
      sessionId: 'session-b',
      chunkIndex: 3,
      currentQuestionIndex: 0,
      score: 0,
      wrongQuestionIds: [],
      updatedAt: now,
    });

    const upsertMock = vi.fn();
    supabaseMocks.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [{
            id: cloud.id,
            user_id: cloud.userId,
            bank_ids: cloud.bankIds,
            bank_names: cloud.bankNames,
            bank_question_map: cloud.bankQuestionMap,
            chunk_size: cloud.chunkSize,
            question_ids: cloud.questionIds,
            chunks: cloud.chunks,
            status: cloud.status,
            created_at: new Date(cloud.createdAt).toISOString(),
            updated_at: new Date(cloud.updatedAt).toISOString(),
          }],
          error: null,
        }),
      }),
      upsert: upsertMock,
    });

    const result = await syncLocalPracticeSessions();
    expect(result.skipped).toBe(1);
    expect(result.uploaded).toBe(0);
    expect(upsertMock).not.toHaveBeenCalled();

    // Draft for completed chunk 1 should be cleared
    expect(getChunkDraft('session-b', 1)).toBeNull();
    // Active draft for uncompleted chunk 3 should be preserved
    expect(getChunkDraft('session-b', 3)).not.toBeNull();
  });

  // 場景 C：多裝置分歧作答（本地完成 Chunk 0、雲端完成 Chunk 1）→ 兩端 Chunk 0 與 1 成功聯集合併為 completed，無進度覆蓋丟失
  it('Scenario C: divergent completion (local chunk 0, cloud chunk 1) -> unions both into completed without data loss', async () => {
    const now = Date.now();
    const local = createSessionWithChunks('session-c', ['completed', 'pending', 'pending'], now);
    const cloud = createSessionWithChunks('session-c', ['pending', 'completed', 'pending'], now - 1000);

    replaceAllPracticeSessions([local]);

    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    supabaseMocks.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [{
            id: cloud.id,
            user_id: cloud.userId,
            bank_ids: cloud.bankIds,
            bank_names: cloud.bankNames,
            bank_question_map: cloud.bankQuestionMap,
            chunk_size: cloud.chunkSize,
            question_ids: cloud.questionIds,
            chunks: cloud.chunks,
            status: cloud.status,
            created_at: new Date(cloud.createdAt).toISOString(),
            updated_at: new Date(cloud.updatedAt).toISOString(),
          }],
          error: null,
        }),
      }),
      upsert: upsertMock,
    });

    const result = await syncLocalPracticeSessions();
    expect(result.uploaded).toBe(1);

    const savedLocal = getAllPracticeSessions().find((s) => s.id === 'session-c');
    expect(savedLocal).toBeDefined();
    expect(savedLocal?.chunks[0].status).toBe('completed');
    expect(savedLocal?.chunks[1].status).toBe('completed');
    expect(savedLocal?.chunks[2].status).toBe('pending');
  });

  // 場景 D：進度相同，本地 updatedAt 較新 → 本地 upsert
  it('Scenario D: identical progress, local updatedAt is newer -> upserts to cloud', async () => {
    const now = Date.now();
    const local = createSessionWithChunks('session-d', ['completed', 'pending'], now);
    const cloud = createSessionWithChunks('session-d', ['completed', 'pending'], now - 5000);

    replaceAllPracticeSessions([local]);

    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    supabaseMocks.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [{
            id: cloud.id,
            user_id: cloud.userId,
            bank_ids: cloud.bankIds,
            bank_names: cloud.bankNames,
            bank_question_map: cloud.bankQuestionMap,
            chunk_size: cloud.chunkSize,
            question_ids: cloud.questionIds,
            chunks: cloud.chunks,
            status: cloud.status,
            created_at: new Date(cloud.createdAt).toISOString(),
            updated_at: new Date(cloud.updatedAt).toISOString(),
          }],
          error: null,
        }),
      }),
      upsert: upsertMock,
    });

    const result = await syncLocalPracticeSessions();
    expect(result.uploaded).toBe(1);
    expect(upsertMock).toHaveBeenCalledTimes(1);
  });

  // 場景 E：離線 2 小時，本地進度更高 → 不被誤判為時鐘漂移，本地 upsert
  it('Scenario E: offline for 2 hours with higher local progress -> not flagged as clock drift, upserts to cloud', async () => {
    const now = Date.now();
    // 2 hours ago for cloud, now for local
    const twoHoursAgo = now - 2 * 60 * 60 * 1000;
    const local = createSessionWithChunks('session-e', ['completed', 'completed', 'pending'], now);
    const cloud = createSessionWithChunks('session-e', ['completed', 'pending', 'pending'], twoHoursAgo);

    replaceAllPracticeSessions([local]);

    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    supabaseMocks.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [{
            id: cloud.id,
            user_id: cloud.userId,
            bank_ids: cloud.bankIds,
            bank_names: cloud.bankNames,
            bank_question_map: cloud.bankQuestionMap,
            chunk_size: cloud.chunkSize,
            question_ids: cloud.questionIds,
            chunks: cloud.chunks,
            status: cloud.status,
            created_at: new Date(cloud.createdAt).toISOString(),
            updated_at: new Date(cloud.updatedAt).toISOString(),
          }],
          error: null,
        }),
      }),
      upsert: upsertMock,
    });

    const result = await syncLocalPracticeSessions();
    expect(result.uploaded).toBe(1);
    expect(upsertMock).toHaveBeenCalledTimes(1);
  });

  // 場景 F：updatedAt > now + 5min → 偵測為時鐘漂移，採用雲端版本
  it('Scenario F: local updatedAt > now + 5min -> detects clock drift and overrides with cloud version', async () => {
    const now = Date.now();
    const futureTime = now + 10 * 60 * 1000;
    const local = createSessionWithChunks('session-f', ['completed', 'completed', 'completed'], futureTime);
    const cloud = createSessionWithChunks('session-f', ['completed', 'pending', 'pending'], now);

    replaceAllPracticeSessions([local]);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const upsertMock = vi.fn();
    supabaseMocks.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [{
            id: cloud.id,
            user_id: cloud.userId,
            bank_ids: cloud.bankIds,
            bank_names: cloud.bankNames,
            bank_question_map: cloud.bankQuestionMap,
            chunk_size: cloud.chunkSize,
            question_ids: cloud.questionIds,
            chunks: cloud.chunks,
            status: cloud.status,
            created_at: new Date(cloud.createdAt).toISOString(),
            updated_at: new Date(cloud.updatedAt).toISOString(),
          }],
          error: null,
        }),
      }),
      upsert: upsertMock,
    });

    const result = await syncLocalPracticeSessions();
    expect(result.skipped).toBe(1);
    expect(result.uploaded).toBe(0);
    expect(upsertMock).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(`Detected potential clock drift for session session-f`)
    );

    const savedLocal = getAllPracticeSessions().find((s) => s.id === 'session-f');
    expect(savedLocal?.chunks[1].status).toBe('pending'); // Cloud version adopted
    warnSpy.mockRestore();
  });

  // 場景 G：雲端領先 chunk 數，但本地 Chunk 0 分數較高 (100 vs 60) 且本地持有 Chunk 3 in_progress
  it('Scenario G: cloud leads in completed chunk count, but local Chunk 0 has higher score (100 vs 60) and local holds Chunk 3 in_progress', async () => {
    const now = Date.now();
    const local = createSessionWithChunks('session-g', ['completed', 'pending', 'pending', 'in_progress', 'pending'], now - 1000);
    local.chunks[0].score = 100;
    local.chunks[3].status = 'in_progress';

    const cloud = createSessionWithChunks('session-g', ['completed', 'completed', 'completed', 'pending', 'pending'], now);
    cloud.chunks[0].score = 60;
    cloud.chunks[1].score = 80;
    cloud.chunks[2].score = 80;

    replaceAllPracticeSessions([local]);

    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    supabaseMocks.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [{
            id: cloud.id,
            user_id: cloud.userId,
            bank_ids: cloud.bankIds,
            bank_names: cloud.bankNames,
            bank_question_map: cloud.bankQuestionMap,
            chunk_size: cloud.chunkSize,
            question_ids: cloud.questionIds,
            chunks: cloud.chunks,
            status: cloud.status,
            created_at: new Date(cloud.createdAt).toISOString(),
            updated_at: new Date(cloud.updatedAt).toISOString(),
          }],
          error: null,
        }),
      }),
      upsert: upsertMock,
    });

    const result = await syncLocalPracticeSessions();
    // 斷言觸發雲端 upsert 更新更高分數與本地進度
    expect(result.uploaded).toBe(1);
    expect(result.skipped).toBe(0);
    expect(upsertMock).toHaveBeenCalledTimes(1);

    // 斷言本地 localStorage 完整保留 Chunk 0 的 100 分與 Chunk 3 的 in_progress
    const savedLocal = getAllPracticeSessions().find((s) => s.id === 'session-g');
    expect(savedLocal).toBeDefined();
    expect(savedLocal?.chunks[0].score).toBe(100);
    expect(savedLocal?.chunks[0].status).toBe('completed');
    expect(savedLocal?.chunks[1].status).toBe('completed');
    expect(savedLocal?.chunks[2].status).toBe('completed');
    expect(savedLocal?.chunks[3].status).toBe('in_progress');
  });
});

describe('mergeChunkedPracticeSessions', () => {
  it('combines completed chunks from both local and cloud', () => {
    const local = createSessionWithChunks('session-merge-1', ['completed', 'pending'], 1000);
    const cloud = createSessionWithChunks('session-merge-1', ['pending', 'completed'], 2000);

    const merged = mergeChunkedPracticeSessions(local, cloud);
    expect(merged.chunks[0].status).toBe('completed');
    expect(merged.chunks[1].status).toBe('completed');
    expect(merged.status).toBe('completed');
    expect(merged.updatedAt).toBe(2000);
  });

  it('keeps highest score and latest completedAt when both chunks completed', () => {
    const local = createSessionWithChunks('session-merge-2', ['completed'], 1000);
    local.chunks[0].score = 10;
    local.chunks[0].completedAt = 900;

    const cloud = createSessionWithChunks('session-merge-2', ['completed'], 2000);
    cloud.chunks[0].score = 8;
    cloud.chunks[0].completedAt = 1900;

    const merged = mergeChunkedPracticeSessions(local, cloud);
    expect(merged.chunks[0].score).toBe(10);
    expect(merged.chunks[0].completedAt).toBe(1900);
  });

  it('handles clock drift / invalid timestamps safely with fallback', () => {
    const local = createSessionWithChunks('session-merge-3', ['in_progress'], NaN);
    const cloud = createSessionWithChunks('session-merge-3', ['pending'], 5000);

    const merged = mergeChunkedPracticeSessions(local, cloud);
    expect(Number.isFinite(merged.createdAt)).toBe(true);
    expect(Number.isFinite(merged.updatedAt)).toBe(true);
    expect(merged.chunks[0].status).toBe('in_progress');
  });

  // 補測：損毀 metadata：單端 session 標記為 completed 但 chunks 僅 2/5 完成，合併後 session status 必須為 active
  it('corrupt metadata: single end session marked as completed but chunks only 2/5 completed -> merged session status must be active', () => {
    const local = createSessionWithChunks('session-merge-corrupt', ['completed', 'completed', 'pending', 'pending', 'pending'], 1000);
    local.status = 'completed'; // 損毀的 metadata

    const cloud = createSessionWithChunks('session-merge-corrupt', ['completed', 'pending', 'pending', 'pending', 'pending'], 2000);
    cloud.status = 'active';

    const merged = mergeChunkedPracticeSessions(local, cloud);
    expect(merged.chunks.filter((c) => c.status === 'completed')).toHaveLength(2);
    expect(merged.status).toBe('active');
  });
});

