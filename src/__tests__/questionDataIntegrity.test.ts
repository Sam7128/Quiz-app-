import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createBank,
  getBanksMeta,
  getQuestions,
  saveBanksMeta,
  saveQuestions,
  STORAGE_KEYS,
} from '../../services/storage';
import { LocalStorageRepository } from '../../services/localRepo';
import { BankMetadata, Question } from '../../types';

const validQ1: Question = {
  id: 'q-valid-1',
  question: '什麼是 TypeScript？',
  options: ['語言', '編輯器', '作業系統'],
  answer: '語言',
  type: 'single',
};

const validQ2: Question = {
  id: 'q-valid-2',
  question: '哪些是 JavaScript 原始型別？',
  options: ['string', 'number', 'boolean', 'object'],
  answer: ['string', 'number', 'boolean'],
  type: 'multiple',
};

const invalidQDeadlock: Record<string, unknown> = {
  id: 'q-invalid-1',
  question: '這個題目的答案不在選項內',
  options: ['選項A', '選項B'],
  answer: '選項C', // 不在 options 中，死局題
};

const invalidQEmptyText: Record<string, unknown> = {
  id: 'q-invalid-2',
  question: '   ', // 空白題目
  options: ['A', 'B'],
  answer: 'A',
};

const invalidQEmptyOptions: Record<string, unknown> = {
  id: 'q-invalid-3',
  question: '沒有選項的題目',
  options: [],
  answer: 'A',
};

const invalidQBadId: Record<string, unknown> = {
  id: '',
  question: '缺少有效ID',
  options: ['A', 'B'],
  answer: 'A',
};

describe('Question Storage Data Integrity & Closed Loop', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('getQuestions deserialization defense', () => {
    it('returns empty array when bank does not exist in localStorage', () => {
      const result = getQuestions('non-existent-bank');
      expect(result).toEqual([]);
    });

    it('returns empty array and does not throw when JSON is corrupted syntax', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      localStorage.setItem(STORAGE_KEYS.BANK_PREFIX + 'corrupt-bank', '{ corrupt json string %&*');

      const result = getQuestions('corrupt-bank');
      expect(result).toEqual([]);
      expect(warnSpy).toHaveBeenCalled();
    });

    it('returns empty array when storage payload is valid JSON but non-array', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      localStorage.setItem(STORAGE_KEYS.BANK_PREFIX + 'object-bank', JSON.stringify({ message: 'not an array' }));

      const result = getQuestions('object-bank');
      expect(result).toEqual([]);
      expect(warnSpy).toHaveBeenCalled();
    });

    it('filters out corrupted or invalid question records from mixed array', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const mixedPayload = [
        validQ1,
        invalidQDeadlock,
        null,
        'random string',
        invalidQEmptyText,
        validQ2,
        invalidQEmptyOptions,
        invalidQBadId,
      ];
      localStorage.setItem(STORAGE_KEYS.BANK_PREFIX + 'mixed-bank', JSON.stringify(mixedPayload));

      const result = getQuestions('mixed-bank');
      expect(result).toHaveLength(2);
      expect(result).toEqual([validQ1, validQ2]);
      expect(warnSpy).toHaveBeenCalled();
    });

    it('returns all questions when all items are valid', () => {
      localStorage.setItem(STORAGE_KEYS.BANK_PREFIX + 'valid-bank', JSON.stringify([validQ1, validQ2]));

      const result = getQuestions('valid-bank');
      expect(result).toEqual([validQ1, validQ2]);
    });
  });

  describe('saveQuestions validation & overwrite guard', () => {
    it('saves valid questions and updates metadata questionCount precisely', () => {
      const bank = createBank('測試題庫');
      expect(getBanksMeta()[0].questionCount).toBe(0);

      saveQuestions(bank.id, [validQ1, validQ2]);

      expect(getQuestions(bank.id)).toEqual([validQ1, validQ2]);
      expect(getBanksMeta()[0].questionCount).toBe(2);
    });

    it('filters invalid questions when saving mixed array and records accurate count', () => {
      const bank = createBank('混合測試題庫');
      const mixedQuestions = [
        validQ1,
        invalidQDeadlock as unknown as Question,
        invalidQEmptyText as unknown as Question,
      ];

      saveQuestions(bank.id, mixedQuestions);

      expect(getQuestions(bank.id)).toEqual([validQ1]);
      expect(getBanksMeta()[0].questionCount).toBe(1);
    });

    it('allows saving empty array to clear questions', () => {
      const bank = createBank('清空測試題庫');
      saveQuestions(bank.id, [validQ1]);
      expect(getQuestions(bank.id)).toHaveLength(1);
      expect(getBanksMeta()[0].questionCount).toBe(1);

      saveQuestions(bank.id, []);
      expect(getQuestions(bank.id)).toEqual([]);
      expect(getBanksMeta()[0].questionCount).toBe(0);
    });

    it('rejects overwrite and warns when incoming payload is non-empty but contains only invalid questions', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const bank = createBank('保護題庫');
      saveQuestions(bank.id, [validQ1]);
      expect(getQuestions(bank.id)).toHaveLength(1);

      const allInvalid = [
        invalidQDeadlock as unknown as Question,
        invalidQEmptyText as unknown as Question,
        invalidQBadId as unknown as Question,
      ];

      saveQuestions(bank.id, allInvalid);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('saveQuestions rejected overwrite for bank')
      );
      // Existing valid data remains intact
      expect(getQuestions(bank.id)).toEqual([validQ1]);
      expect(getBanksMeta()[0].questionCount).toBe(1);
    });

    it('rejects overwrite when incoming value is non-array invalid object', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const bank = createBank('非陣列保護題庫');
      saveQuestions(bank.id, [validQ1]);

      saveQuestions(bank.id, { foo: 'bar' } as unknown as Question[]);

      expect(warnSpy).toHaveBeenCalled();
      expect(getQuestions(bank.id)).toEqual([validQ1]);
      expect(getBanksMeta()[0].questionCount).toBe(1);
    });
  });

  describe('getBanksMeta & legacy migration integrity', () => {
    it('migrates legacy bank with valid questions safely', () => {
      localStorage.setItem(STORAGE_KEYS.LEGACY_BANK, JSON.stringify([validQ1, validQ2]));

      const banks = getBanksMeta();
      expect(banks).toHaveLength(1);
      expect(banks[0]).toEqual(
        expect.objectContaining({
          id: 'default',
          name: '預設題庫',
          questionCount: 2,
        })
      );
      expect(getQuestions('default')).toEqual([validQ1, validQ2]);
      expect(localStorage.getItem(STORAGE_KEYS.LEGACY_BANK)).toBeNull();
    });

    it('migrates legacy bank with corrupted JSON safely without crashing', () => {
      localStorage.setItem(STORAGE_KEYS.LEGACY_BANK, '{ invalid json');

      const banks = getBanksMeta();
      expect(banks).toHaveLength(1);
      expect(banks[0].questionCount).toBe(0);
      expect(getQuestions('default')).toEqual([]);
      expect(localStorage.getItem(STORAGE_KEYS.LEGACY_BANK)).toBeNull();
    });

    it('migrates legacy bank with mixed valid/invalid questions and sets accurate questionCount', () => {
      localStorage.setItem(
        STORAGE_KEYS.LEGACY_BANK,
        JSON.stringify([validQ1, invalidQDeadlock, invalidQEmptyOptions])
      );

      const banks = getBanksMeta();
      expect(banks).toHaveLength(1);
      expect(banks[0].questionCount).toBe(1);
      expect(getQuestions('default')).toEqual([validQ1]);
      expect(localStorage.getItem(STORAGE_KEYS.LEGACY_BANK)).toBeNull();
    });

    it('normalizes corrupted or non-array BANKS_META safely', () => {
      localStorage.setItem(STORAGE_KEYS.BANKS_META, 'not valid json string');
      expect(getBanksMeta()).toEqual([]);

      localStorage.setItem(STORAGE_KEYS.BANKS_META, JSON.stringify({ not: 'an array' }));
      expect(getBanksMeta()).toEqual([]);
    });

    it('normalizes invalid questionCount values in BANKS_META', () => {
      const corruptMeta = [
        { id: 'b1', name: 'Bank 1', questionCount: -5 },
        { id: 'b2', name: 'Bank 2', questionCount: NaN },
        { id: 'b3', name: 'Bank 3', questionCount: undefined },
        { id: 'b4', name: 'Bank 4', questionCount: 10 },
      ];
      saveBanksMeta(corruptMeta as unknown as BankMetadata[]);

      const loaded = getBanksMeta();
      expect(loaded).toHaveLength(4);
      expect(loaded[0].questionCount).toBe(0);
      expect(loaded[1].questionCount).toBe(0);
      expect(loaded[2].questionCount).toBe(0);
      expect(loaded[3].questionCount).toBe(10);
    });
  });

  describe('LocalStorageRepository integration', () => {
    it('provides guarded question reading and writing through repository interface', async () => {
      const repo = new LocalStorageRepository();
      const bank = await repo.createBank('Repo 題庫');

      await repo.saveQuestions(bank.id, [validQ1, invalidQDeadlock as unknown as Question]);
      const fetched = await repo.getQuestions(bank.id);

      expect(fetched).toEqual([validQ1]);
      const banks = await repo.getBanks();
      expect(banks[0].questionCount).toBe(1);
    });
  });
});
