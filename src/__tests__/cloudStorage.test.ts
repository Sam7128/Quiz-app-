import { beforeEach, describe, expect, it, vi } from 'vitest';
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

import { saveCloudQuestions } from '../../services/cloudStorage';

describe('saveCloudQuestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
  });

  it('normalizes non-UUID ids and cleans up removed rows by keep list', async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    const notMock = vi.fn().mockResolvedValue({ error: null });
    const eqMock = vi.fn().mockReturnValue({ not: notMock });
    const deleteMock = vi.fn().mockReturnValue({ eq: eqMock });
    mocks.from.mockReturnValue({
      upsert: upsertMock,
      delete: deleteMock,
    });

    const fixedUuid = '123e4567-e89b-12d3-a456-426614174000';
    const generatedUuid = '223e4567-e89b-12d3-a456-426614174001';
    const randomSpy = vi.spyOn(crypto, 'randomUUID').mockReturnValue(generatedUuid);

    const questions: Question[] = [
      {
        id: fixedUuid,
        question: 'Q1',
        options: ['A', 'B'],
        answer: 'A',
        type: 'single',
      },
      {
        id: 7,
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
      expect.objectContaining({ id: fixedUuid, bank_id: 'bank-1' }),
      expect.objectContaining({ id: generatedUuid, bank_id: 'bank-1' }),
    ]);

    expect(eqMock).toHaveBeenCalledWith('bank_id', 'bank-1');
    expect(notMock).toHaveBeenCalledWith('id', 'in', `(${fixedUuid},${generatedUuid})`);
    randomSpy.mockRestore();
  });

  it('deletes all bank questions when keep list is empty', async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    const eqMock = vi.fn().mockResolvedValue({ error: null });
    const deleteMock = vi.fn().mockReturnValue({ eq: eqMock });
    mocks.from.mockReturnValue({
      upsert: upsertMock,
      delete: deleteMock,
    });

    await saveCloudQuestions('bank-empty', []);

    expect(upsertMock).toHaveBeenCalledWith([], { onConflict: 'id' });
    expect(eqMock).toHaveBeenCalledWith('bank_id', 'bank-empty');
  });
});

