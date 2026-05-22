import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CloudStorageRepository } from '../../services/cloudRepo';
import { LocalStorageRepository } from '../../services/localRepo';
import { ChunkedPracticeSession } from '../../types/battleTypes';
import { getAllPracticeSessions, getChunkDraft, saveChunkDraft } from '../../services/storage';

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

import { syncLocalPracticeSessions } from '../../services/cloudStorage';

const createSession = (id: string, status: ChunkedPracticeSession['status'], updatedAt: number): ChunkedPracticeSession => ({
  id,
  userId: 'user-1',
  bankIds: ['bank-a'],
  bankNames: ['Bank A'],
  bankQuestionMap: { 'bank-a': ['q-1', 'q-2'] },
  chunkSize: 20,
  questionIds: ['q-1', 'q-2'],
  chunks: [
    {
      index: 0,
      questionIds: ['q-1', 'q-2'],
      status: status === 'active' ? 'pending' : 'completed',
      score: 0,
      totalQuestions: 2,
      wrongQuestionIds: [],
    },
  ],
  status,
  createdAt: updatedAt - 1000,
  updatedAt,
  dirty: false,
  retryCount: 0,
});

describe('practice session storage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('enforces guest active FIFO and total retention limits', async () => {
    const repo = new LocalStorageRepository();

    for (let index = 0; index < 6; index++) {
      await repo.savePracticeSession(createSession(`active-${index}`, 'active', Date.now() + index));
    }

    const active = await repo.getPracticeSessions();
    expect(active).toHaveLength(5);

    const allAfterActiveOverflow = getAllPracticeSessions();
    expect(allAfterActiveOverflow.some((session) => session.status === 'abandoned')).toBe(true);

    for (let index = 0; index < 7; index++) {
      await repo.savePracticeSession(createSession(`completed-${index}`, 'completed', Date.now() + 100 + index));
    }

    const all = getAllPracticeSessions();
    expect(all.length).toBeLessThanOrEqual(10);
    expect(all.filter((session) => session.status === 'active').length).toBeLessThanOrEqual(5);
  });

  it('skips outdated local session when cloud has newer version', async () => {
    const repo = new LocalStorageRepository();
    const local = createSession('session-1', 'active', Date.now() - 10_000);
    await repo.savePracticeSession(local);

    supabaseMocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const eqMock = vi.fn(async () => ({
      data: [{
        id: 'session-1',
        user_id: 'user-1',
        bank_ids: ['bank-a'],
        bank_names: ['Bank A'],
        bank_question_map: { 'bank-a': ['q-1', 'q-2'] },
        chunk_size: 20,
        question_ids: ['q-1', 'q-2'],
        chunks: local.chunks,
        status: 'active',
        created_at: new Date(local.createdAt).toISOString(),
        updated_at: new Date(local.updatedAt + 60_000).toISOString(),
      }],
      error: null,
    }));
    const selectMock = vi.fn(() => ({ eq: eqMock }));
    const upsertMock = vi.fn(async () => ({ error: null }));
    supabaseMocks.from.mockReturnValue({ select: selectMock, upsert: upsertMock });

    const result = await syncLocalPracticeSessions();
    expect(result.skipped).toBe(1);
    expect(result.uploaded).toBe(0);
    expect(result.dirty).toBe(0);
    expect(getAllPracticeSessions()).toHaveLength(1);
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it('keeps local dirty session when cloud upsert fails', async () => {
    const repo = new LocalStorageRepository();
    const local = createSession('session-2', 'active', Date.now());
    await repo.savePracticeSession(local);

    supabaseMocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const eqMock = vi.fn(async () => ({ data: [], error: null }));
    const selectMock = vi.fn(() => ({ eq: eqMock }));
    const upsertMock = vi.fn(async () => ({ error: { message: 'network down' } }));
    supabaseMocks.from.mockReturnValue({ select: selectMock, upsert: upsertMock });

    const result = await syncLocalPracticeSessions();
    expect(result.dirty).toBe(1);

    const all = getAllPracticeSessions();
    expect(all).toHaveLength(1);
    expect(all[0].dirty).toBe(true);
    expect((all[0].retryCount ?? 0) > 0).toBe(true);
  });

  it('keeps local chunk draft when cloud save removes local session cache', async () => {
    const localRepo = new LocalStorageRepository();
    const cloudRepo = new CloudStorageRepository();
    const session = createSession('session-with-draft', 'active', Date.now());
    await localRepo.savePracticeSession(session);

    saveChunkDraft({
      sessionId: session.id,
      chunkIndex: 0,
      currentQuestionIndex: 4,
      score: 4,
      wrongQuestionIds: [],
      pendingSkill: null,
      updatedAt: Date.now(),
    });

    supabaseMocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const upsertMock = vi.fn(async () => ({ error: null }));
    supabaseMocks.from.mockReturnValue({ upsert: upsertMock });

    await cloudRepo.savePracticeSession(session);

    expect(getAllPracticeSessions()).toHaveLength(0);
    expect(getChunkDraft(session.id, 0)?.currentQuestionIndex).toBe(4);
  });

  it('concurrent calls return EMPTY_SYNC_RESULT and release lock', async () => {
    supabaseMocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    
    let resolveSelect: any;
    const selectPromise = new Promise((resolve) => {
      resolveSelect = resolve;
    });

    const selectMock = vi.fn(() => ({
      eq: vi.fn().mockImplementation(async () => {
        await selectPromise;
        return { data: [], error: null };
      })
    }));
    supabaseMocks.from.mockReturnValue({ select: selectMock });

    const firstSyncPromise = syncLocalPracticeSessions();

    const secondResult = await syncLocalPracticeSessions();
    expect(secondResult).toEqual({ uploaded: 0, skipped: 0, dirty: 0 });

    resolveSelect({ data: [], error: null });
    await firstSyncPromise;

    const selectMock2 = vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ data: [], error: null })
    }));
    supabaseMocks.from.mockReturnValue({ select: selectMock2 });
    
    const thirdResult = await syncLocalPracticeSessions();
    expect(thirdResult).toEqual({ uploaded: 0, skipped: 0, dirty: 0 });
  });

  it('syncLocalPracticeSessions clears chunk drafts on newer cloud rewrite', async () => {
    const repo = new LocalStorageRepository();
    const local = createSession('session-rewrite', 'active', Date.now() - 10_000);
    await repo.savePracticeSession(local);

    saveChunkDraft({
      sessionId: 'session-rewrite',
      chunkIndex: 0,
      currentQuestionIndex: 5,
      score: 5,
      wrongQuestionIds: [],
      pendingSkill: null,
      updatedAt: Date.now(),
    });

    supabaseMocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const eqMock = vi.fn(async () => ({
      data: [{
        id: 'session-rewrite',
        user_id: 'user-1',
        bank_ids: ['bank-a'],
        bank_names: ['Bank A'],
        bank_question_map: { 'bank-a': ['q-1', 'q-2'] },
        chunk_size: 20,
        question_ids: ['q-1', 'q-2'],
        chunks: local.chunks,
        status: 'active',
        created_at: new Date(local.createdAt).toISOString(),
        updated_at: new Date(local.updatedAt + 60_000).toISOString(),
      }],
      error: null,
    }));
    supabaseMocks.from.mockReturnValue({ select: vi.fn(() => ({ eq: eqMock })) });

    const result = await syncLocalPracticeSessions();
    expect(result.skipped).toBe(1);
    expect(getChunkDraft('session-rewrite', 0)).toBeNull();
  });

  it('clock drift protection favors cloud version', async () => {
    const repo = new LocalStorageRepository();
    
    const localFuture = createSession('session-future', 'active', Date.now() + 10 * 60 * 1000);
    await repo.savePracticeSession(localFuture);

    supabaseMocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const cloudData = {
      id: 'session-future',
      user_id: 'user-1',
      bank_ids: ['bank-a'],
      bank_names: ['Bank A'],
      bank_question_map: { 'bank-a': ['q-1', 'q-2'] },
      chunk_size: 20,
      question_ids: ['q-1', 'q-2'],
      chunks: localFuture.chunks,
      status: 'active',
      created_at: new Date(localFuture.createdAt).toISOString(),
      updated_at: new Date(Date.now() - 5000).toISOString(),
    };

    const eqMock = vi.fn(async () => ({
      data: [cloudData],
      error: null,
    }));
    supabaseMocks.from.mockReturnValue({ select: vi.fn(() => ({ eq: eqMock })) });

    const result = await syncLocalPracticeSessions();
    expect(result.skipped).toBe(1);
    expect(result.uploaded).toBe(0);

    const localDrift = createSession('session-drift', 'active', Date.now() + 2 * 60 * 60 * 1000);
    await repo.savePracticeSession(localDrift);

    const cloudDriftData = {
      id: 'session-drift',
      user_id: 'user-1',
      bank_ids: ['bank-a'],
      bank_names: ['Bank A'],
      bank_question_map: { 'bank-a': ['q-1', 'q-2'] },
      chunk_size: 20,
      question_ids: ['q-1', 'q-2'],
      chunks: localDrift.chunks,
      status: 'active',
      created_at: new Date(localDrift.createdAt).toISOString(),
      updated_at: new Date(Date.now()).toISOString(),
    };

    const eqMock2 = vi.fn(async () => ({
      data: [cloudDriftData],
      error: null,
    }));
    supabaseMocks.from.mockReturnValue({ select: vi.fn(() => ({ eq: eqMock2 })) });

    const result2 = await syncLocalPracticeSessions();
    expect(result2.skipped).toBe(1);
    expect(result2.uploaded).toBe(0);
  });
});
