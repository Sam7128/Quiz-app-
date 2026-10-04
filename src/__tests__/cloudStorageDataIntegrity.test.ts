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

import { getCloudQuestions, saveCloudQuestions } from '../../services/cloudStorage';
import { CloudStorageRepository } from '../../services/cloudRepo';

describe('Cloud Storage Data Integrity & Closed Loop Defense', () => {
  const validQ1: Question = {
    id: '11111111-1111-4111-8111-111111111111',
    question: '雲端合法題目 1',
    options: ['A', 'B', 'C'],
    answer: 'A',
    type: 'single',
  };

  const validQ2: Question = {
    id: '22222222-2222-4222-8222-222222222222',
    question: '雲端合法題目 2 (多選)',
    options: ['X', 'Y', 'Z'],
    answer: ['X', 'Y'],
    type: 'multiple',
  };

  const malformedDeadlockRow = {
    id: '33333333-3333-4333-8333-333333333333',
    bank_id: 'bank-1',
    question: '死鎖題目',
    options: ['A', 'B'],
    answer: 'C', // 答案不在 options 內
    type: 'single',
  };

  const malformedNullOptionsRow = {
    id: '44444444-4444-4444-8444-444444444444',
    bank_id: 'bank-1',
    question: '選項為 null 題目',
    options: null,
    answer: 'A',
  };

  const malformedTypeMismatchRow = {
    id: '55555555-5555-4555-8555-555555555555',
    bank_id: 'bank-1',
    question: 'type 錯位題目',
    options: ['A', 'B'],
    answer: ['A'], // type 是 single 但 answer 是 array
    type: 'single',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'test-user-1' } } });
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('getCloudQuestions read-path guard defense', () => {
    it('過濾資料庫中讀出的畸形 row (options: null、死鎖答案、type錯位) 並回傳安全 Question[]', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const eqMock = vi.fn().mockResolvedValue({
        data: [
          {
            id: validQ1.id,
            bank_id: 'bank-1',
            question: validQ1.question,
            options: validQ1.options,
            answer: validQ1.answer,
            type: validQ1.type,
          },
          malformedDeadlockRow,
          malformedNullOptionsRow,
          malformedTypeMismatchRow,
          {
            id: validQ2.id,
            bank_id: 'bank-1',
            question: validQ2.question,
            options: validQ2.options,
            answer: validQ2.answer,
            type: validQ2.type,
          },
        ],
        error: null,
      });

      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
      mocks.from.mockReturnValue({ select: selectMock });

      const questions = await getCloudQuestions('bank-1');

      expect(questions).toHaveLength(2);
      expect(questions[0]).toEqual(validQ1);
      expect(questions[1]).toEqual(validQ2);
      expect(warnSpy).toHaveBeenCalled();
    });

    it('當資料庫返回查詢錯誤時應安全降級回傳空陣列', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const eqMock = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Supabase select connection error' },
      });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
      mocks.from.mockReturnValue({ select: selectMock });

      const questions = await getCloudQuestions('bank-1');
      expect(questions).toEqual([]);
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('saveCloudQuestions write-path guard defense', () => {
    it('過濾混合傳入之無效題目，只將有效題目執行 upsert', async () => {
      const upsertMock = vi.fn().mockResolvedValue({ error: null });
      const eqMock = vi.fn().mockResolvedValue({ data: [], error: null });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
      mocks.from.mockReturnValue({
        upsert: upsertMock,
        select: selectMock,
      });

      const mixedPayload = [
        validQ1,
        {
          id: 'bad-1',
          question: '無效死鎖題',
          options: ['A', 'B'],
          answer: 'Z',
        } as unknown as Question,
        validQ2,
      ];

      await saveCloudQuestions('bank-1', mixedPayload);

      expect(upsertMock).toHaveBeenCalledTimes(1);
      const upsertPayload = upsertMock.mock.calls[0][0];
      expect(upsertPayload).toHaveLength(2);
      expect(upsertPayload[0].id).toBe(validQ1.id);
      expect(upsertPayload[1].id).toBe(validQ2.id);
    });

    it('當傳入非空但全為無效之題目陣列時，拒絕寫入且不調用 upsert/delete，防止誤刪雲端題庫', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const upsertMock = vi.fn().mockResolvedValue({ error: null });
      const deleteMock = vi.fn().mockReturnValue({ eq: vi.fn() });
      mocks.from.mockReturnValue({
        upsert: upsertMock,
        delete: deleteMock,
      });

      const allInvalidPayload = [
        { id: 'b1', question: '', options: ['A'], answer: 'A' } as unknown as Question,
        { id: 'b2', question: '死鎖', options: ['A'], answer: 'B' } as unknown as Question,
      ];

      await saveCloudQuestions('bank-1', allInvalidPayload);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('saveCloudQuestions rejected overwrite for bank "bank-1"')
      );
      expect(upsertMock).not.toHaveBeenCalled();
      expect(deleteMock).not.toHaveBeenCalled();
      // dirty bank 標記應被及時清除，避免殘留
      expect(localStorage.getItem('mindspark_dirty_banks')).toBeNull();
    });

    it('當合法傳入空陣列 [] 且 forceDeleteAll 為 false 時應拋出異常阻斷全刪', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const upsertMock = vi.fn().mockResolvedValue({ error: null });
      const deleteMock = vi.fn().mockReturnValue({ eq: vi.fn() });
      mocks.from.mockReturnValue({
        upsert: upsertMock,
        delete: deleteMock,
      });

      await expect(saveCloudQuestions('bank-1', [], false)).rejects.toThrow(
        'Prevented accidental deletion of all questions. Force flag required.'
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Attempted to delete all questions without forceDeleteAll flag')
      );
      expect(deleteMock).not.toHaveBeenCalled();
    });

    it('當傳入空陣列 [] 且 forceDeleteAll 為 true 時應正確執行全刪', async () => {
      const upsertMock = vi.fn().mockResolvedValue({ error: null });
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const deleteMock = vi.fn().mockReturnValue({ eq: eqMock });
      mocks.from.mockReturnValue({
        upsert: upsertMock,
        delete: deleteMock,
      });

      await saveCloudQuestions('bank-1', [], true);

      expect(deleteMock).toHaveBeenCalledTimes(1);
      expect(eqMock).toHaveBeenCalledWith('bank_id', 'bank-1');
      expect(localStorage.getItem('mindspark_dirty_banks')).toBeNull();
    });
  });

  describe('CloudStorageRepository integration', () => {
    it('透過 CloudStorageRepository getQuestions 與 saveQuestions 執行完整門禁保護', async () => {
      const repo = new CloudStorageRepository();

      const eqSelectMock = vi.fn().mockResolvedValue({
        data: [
          {
            id: validQ1.id,
            bank_id: 'bank-1',
            question: validQ1.question,
            options: validQ1.options,
            answer: validQ1.answer,
            type: validQ1.type,
          },
          malformedDeadlockRow,
        ],
        error: null,
      });
      const selectMock = vi.fn().mockReturnValue({ eq: eqSelectMock });
      mocks.from.mockReturnValue({ select: selectMock });

      const fetched = await repo.getQuestions('bank-1');
      expect(fetched).toEqual([validQ1]);

      const upsertMock = vi.fn().mockResolvedValue({ error: null });
      const eqFetchMock = vi.fn().mockResolvedValue({ data: [], error: null });
      const selectFetchMock = vi.fn().mockReturnValue({ eq: eqFetchMock });
      mocks.from.mockReturnValue({
        upsert: upsertMock,
        select: selectFetchMock,
      });

      await repo.saveQuestions('bank-1', [validQ1, malformedDeadlockRow as unknown as Question]);
      expect(upsertMock).toHaveBeenCalledTimes(1);
      expect(upsertMock.mock.calls[0][0]).toHaveLength(1);
      expect(upsertMock.mock.calls[0][0][0].id).toBe(validQ1.id);
    });
  });
});
