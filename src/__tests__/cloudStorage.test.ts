import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import type { Question } from '../../types';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock('../../services/supabase', () => ({
  supabase: {
    from: mocks.from,
    auth: {
      getUser: mocks.getUser,
    },
  },
}));

import { runWithSyncLock, saveCloudQuestions } from '../../services/cloudStorage';

describe('runWithSyncLock', () => {
  it('returns the native Web Locks rejection so AbortError is observed instead of detached', async () => {
    const original = Object.getOwnPropertyDescriptor(navigator, 'locks');
    const abortError = new DOMException('signal is aborted without reason', 'AbortError');
    const request = vi.fn().mockRejectedValue(abortError);
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: { request, query: vi.fn().mockResolvedValue({ pending: [], held: [] }) },
    });
    try {
      await expect(runWithSyncLock(async () => 'never-runs')).rejects.toBe(abortError);
      expect(request).toHaveBeenCalledTimes(1);
    } finally {
      if (original) Object.defineProperty(navigator, 'locks', original);
      else Reflect.deleteProperty(navigator, 'locks');
    }
  });
});

describe('saveCloudQuestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('normalizes non-UUID ids and cleans up removed rows by keep list', async () => {
    const fixedUuid = '123e4567-e89b-12d3-a456-426614174000';
    const generatedUuid = '223e4567-e89b-12d3-a456-426614174001';

    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    const deleteInMock = vi.fn().mockResolvedValue({ error: null });
    const deleteMock = vi.fn().mockReturnValue({ in: deleteInMock });
    const eqMock = vi.fn().mockResolvedValue({
      data: [
        { id: fixedUuid },
        { id: generatedUuid },
        { id: 'orphan-1' },
      ],
      error: null,
    });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });

    mocks.from.mockReturnValue({
      upsert: upsertMock,
      select: selectMock,
      delete: deleteMock,
    });

    const randomSpy = vi.spyOn(crypto, 'randomUUID').mockReturnValue(generatedUuid);

    const questions: Question[] = [
      {
        id: fixedUuid,
        sourceQuestionKey: 'legacy-1',
        sourceFingerprint: 'fp-1',
        question: 'Q1',
        options: ['A', 'B'],
        answer: 'A',
        type: 'single',
      },
      {
        id: 7,
        sourceQuestionKey: 'legacy-2',
        sourceFingerprint: 'fp-2',
        question: 'Q2',
        options: ['A', 'B'],
        answer: 'B',
        type: 'single',
      },
    ];

    await saveCloudQuestions('bank-1', questions);

    expect(upsertMock).toHaveBeenCalledTimes(1);
    const upsertPayload = upsertMock.mock.calls[0][0] as Array<{ id: string; bank_id: string }>;
    expect(upsertPayload).toEqual([
      expect.objectContaining({
        id: fixedUuid,
        bank_id: 'bank-1',
        source_question_key: 'legacy-1',
        source_fingerprint: expect.stringMatching(/^qfp_/),
      }),
      expect.objectContaining({
        id: generatedUuid,
        bank_id: 'bank-1',
        source_question_key: 'legacy-2',
        source_fingerprint: expect.stringMatching(/^qfp_/),
      }),
    ]);

    expect(eqMock).toHaveBeenCalledWith('bank_id', 'bank-1');
    expect(deleteInMock).toHaveBeenCalledWith('id', ['orphan-1']);
    randomSpy.mockRestore();
  });

  it('deletes all bank questions when keep list is empty and force flag is true', async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    const deleteEqMock = vi.fn().mockResolvedValue({ error: null });
    const deleteMock = vi.fn().mockReturnValue({ eq: deleteEqMock });
    mocks.from.mockReturnValue({
      upsert: upsertMock,
      delete: deleteMock,
    });

    await saveCloudQuestions('bank-empty', [], true);

    expect(upsertMock).toHaveBeenCalledWith([], { onConflict: 'id' });
    expect(deleteEqMock).toHaveBeenCalledWith('bank_id', 'bank-empty');
  });

  it('throws error when keep list is empty and force flag is false', async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    const deleteMock = vi.fn();
    mocks.from.mockReturnValue({
      upsert: upsertMock,
      delete: deleteMock,
    });

    await expect(saveCloudQuestions('bank-empty', [], false)).rejects.toThrow(
      'Prevented accidental deletion of all questions. Force flag required.'
    );

    expect(deleteMock).not.toHaveBeenCalled();
  });

  it('deduplicates same payload ids before upsert', async () => {
    const duplicateId = '123e4567-e89b-12d3-a456-426614174000';

    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    const deleteInMock = vi.fn().mockResolvedValue({ error: null });
    const deleteMock = vi.fn().mockReturnValue({ in: deleteInMock });
    const eqMock = vi.fn().mockResolvedValue({
      data: [{ id: duplicateId }],
      error: null,
    });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });

    mocks.from.mockReturnValue({
      upsert: upsertMock,
      select: selectMock,
      delete: deleteMock,
    });

    const questions: Question[] = [
      {
        id: duplicateId,
        question: 'Q1',
        options: ['A', 'B'],
        answer: 'A',
        type: 'single',
        sourceFingerprint: 'fp-1',
      },
      {
        id: duplicateId,
        question: 'Q1 updated',
        options: ['A', 'B'],
        answer: 'B',
        type: 'single',
        sourceFingerprint: 'fp-1b',
      },
    ];

    await saveCloudQuestions('bank-dup', questions);

    expect(upsertMock).toHaveBeenCalledTimes(1);
    const upsertPayload = upsertMock.mock.calls[0][0] as Array<{ id: string; question: string }>;
    expect(upsertPayload).toHaveLength(1);
    expect(upsertPayload[0]).toEqual(expect.objectContaining({ id: duplicateId, question: 'Q1 updated' }));
  });

  it('gracefully handles cleanup select fetch error and records dirty bank', async () => {
    const fixedUuid = '123e4567-e89b-12d3-a456-426614174000';
    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    const eqMock = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Fetch failed' },
    });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });

    mocks.from.mockReturnValue({
      upsert: upsertMock,
      select: selectMock,
    });

    const questions: Question[] = [
      {
        id: fixedUuid,
        question: 'Q1',
        options: ['A', 'B'],
        answer: 'A',
        type: 'single',
      },
    ];

    await expect(saveCloudQuestions('bank-fail-fetch', questions)).resolves.not.toThrow();

    const dirtyBanks = JSON.parse(localStorage.getItem('mindspark_dirty_banks') || '[]');
    expect(dirtyBanks).toContain('bank-fail-fetch');
  });

  it('gracefully handles cleanup delete error and records dirty bank', async () => {
    const fixedUuid = '123e4567-e89b-12d3-a456-426614174000';
    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    const deleteInMock = vi.fn().mockResolvedValue({ error: { message: 'Delete failed' } });
    const deleteMock = vi.fn().mockReturnValue({ in: deleteInMock });
    const eqMock = vi.fn().mockResolvedValue({
      data: [{ id: fixedUuid }, { id: 'orphan-1' }],
      error: null,
    });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });

    mocks.from.mockReturnValue({
      upsert: upsertMock,
      select: selectMock,
      delete: deleteMock,
    });

    const questions: Question[] = [
      {
        id: fixedUuid,
        question: 'Q1',
        options: ['A', 'B'],
        answer: 'A',
        type: 'single',
      },
    ];

    await expect(saveCloudQuestions('bank-fail-delete', questions)).resolves.not.toThrow();

    const dirtyBanks = JSON.parse(localStorage.getItem('mindspark_dirty_banks') || '[]');
    expect(dirtyBanks).toContain('bank-fail-delete');
  });

  it('chunks deletion into batches of 500 when there are many orphans', async () => {
    const fixedUuid = '123e4567-e89b-12d3-a456-426614174000';
    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    const deleteInMock = vi.fn().mockResolvedValue({ error: null });
    const deleteMock = vi.fn().mockReturnValue({ in: deleteInMock });

    // Generate 1005 orphans
    const cloudIds = [{ id: fixedUuid }];
    for (let i = 0; i < 1005; i++) {
      cloudIds.push({ id: `orphan-${i}` });
    }

    const eqMock = vi.fn().mockResolvedValue({
      data: cloudIds,
      error: null,
    });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });

    mocks.from.mockReturnValue({
      upsert: upsertMock,
      select: selectMock,
      delete: deleteMock,
    });

    const questions: Question[] = [
      {
        id: fixedUuid,
        question: 'Q1',
        options: ['A', 'B'],
        answer: 'A',
        type: 'single',
      },
    ];

    await saveCloudQuestions('bank-many-orphans', questions);

    expect(deleteInMock).toHaveBeenCalledTimes(3); // 500, 500, 5
    expect(deleteInMock.mock.calls[0][1]).toHaveLength(500);
    expect(deleteInMock.mock.calls[1][1]).toHaveLength(500);
    expect(deleteInMock.mock.calls[2][1]).toHaveLength(5);
  });

  it('throws error and skips cleanup when upsert fails', async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: { message: 'Upsert failed' } });
    const selectMock = vi.fn();
    const deleteMock = vi.fn();

    mocks.from.mockReturnValue({
      upsert: upsertMock,
      select: selectMock,
      delete: deleteMock,
    });

    const questions: Question[] = [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        question: 'Q1',
        options: ['A', 'B'],
        answer: 'A',
        type: 'single',
      },
    ];

    await expect(saveCloudQuestions('bank-fail-upsert', questions)).rejects.toThrow(
      'Failed to save cloud questions: Upsert failed'
    );

    expect(selectMock).not.toHaveBeenCalled();
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it('marks bank dirty before upsert then clears on success', async () => {
    const fixedUuid = '123e4567-e89b-12d3-a456-426614174000';
    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    const eqMock = vi.fn().mockResolvedValue({
      data: [{ id: fixedUuid }],
      error: null,
    });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });

    mocks.from.mockReturnValue({
      upsert: upsertMock,
      select: selectMock,
    });

    const questions: Question[] = [
      {
        id: fixedUuid,
        question: 'Q1',
        options: ['A', 'B'],
        answer: 'A',
        type: 'single',
      },
    ];

    await saveCloudQuestions('bank-success', questions);

    const dirty = JSON.parse(localStorage.getItem('mindspark_dirty_banks') || '[]');
    expect(dirty).not.toContain('bank-success');
  });

  it('marks bank dirty and keeps it when upsert fails', async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: { message: 'Upsert failed' } });
    mocks.from.mockReturnValue({
      upsert: upsertMock,
    });

    const questions: Question[] = [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        question: 'Q1',
        options: ['A', 'B'],
        answer: 'A',
        type: 'single',
      },
    ];

    await expect(saveCloudQuestions('bank-fail', questions)).rejects.toThrow();

    const dirty = JSON.parse(localStorage.getItem('mindspark_dirty_banks') || '[]');
    expect(dirty).toContain('bank-fail');
  });
});
