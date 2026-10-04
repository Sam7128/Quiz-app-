import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { isQuestion, parseQuestions, isMultipleAnswer } from '../../utils/typeGuards';
import { Question } from '../../types';

describe('typeGuards: isQuestion & parseQuestions & isMultipleAnswer', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isQuestion', () => {
    it('應正確辨識合法的單選題目', () => {
      const validSingle: Question = {
        id: 'q-1',
        question: 'What is TypeScript?',
        options: ['A typed superset of JavaScript', 'A database', 'An operating system'],
        answer: 'A typed superset of JavaScript',
        type: 'single',
      };
      expect(isQuestion(validSingle)).toBe(true);
    });

    it('應正確辨識合法的多選題目', () => {
      const validMultiple: Question = {
        id: 'q-2',
        question: 'Select primitive types in JavaScript',
        options: ['string', 'number', 'boolean', 'Promise'],
        answer: ['string', 'number', 'boolean'],
        type: 'multiple',
      };
      expect(isQuestion(validMultiple)).toBe(true);
    });

    it('應允許數值 id: 0', () => {
      const questionWithZeroId = {
        id: 0,
        question: 'Is zero a valid id?',
        options: ['Yes', 'No'],
        answer: 'Yes',
      };
      expect(isQuestion(questionWithZeroId)).toBe(true);
    });

    it('應允許正負有限數值 id', () => {
      const qPositive = {
        id: 42,
        question: 'Question with positive number id',
        options: ['A', 'B'],
        answer: 'A',
      };
      const qNegative = {
        id: -1,
        question: 'Question with negative number id',
        options: ['A', 'B'],
        answer: 'A',
      };
      expect(isQuestion(qPositive)).toBe(true);
      expect(isQuestion(qNegative)).toBe(true);
    });

    it('應允許可選欄位為空字串或包含 tags', () => {
      const questionWithEmptyOptionalFields = {
        id: 'q-opt',
        question: 'Optional fields test',
        options: ['Option 1', 'Option 2'],
        answer: 'Option 1',
        hint: '',
        explanation: '',
        tags: ['frontend', 'react'],
        original_question_id: 100,
        sourceQuestionKey: 'bank-a:q-opt',
        sourceFingerprint: 'fp-12345',
      };
      expect(isQuestion(questionWithEmptyOptionalFields)).toBe(true);
    });

    it('應拒絕 null、undefined、非物件或陣列', () => {
      expect(isQuestion(null)).toBe(false);
      expect(isQuestion(undefined)).toBe(false);
      expect(isQuestion('string')).toBe(false);
      expect(isQuestion(123)).toBe(false);
      expect(isQuestion(true)).toBe(false);
      expect(isQuestion([])).toBe(false);
      expect(isQuestion({})).toBe(false);
    });

    it('應拒絕無效 id (空字串、空白字串、NaN、Infinity)', () => {
      const qEmptyId = {
        id: '',
        question: 'Valid question',
        options: ['A', 'B'],
        answer: 'A',
      };
      const qWhitespaceId = {
        id: '   ',
        question: 'Valid question',
        options: ['A', 'B'],
        answer: 'A',
      };
      const qNaNId = {
        id: NaN,
        question: 'Valid question',
        options: ['A', 'B'],
        answer: 'A',
      };
      const qInfinityId = {
        id: Infinity,
        question: 'Valid question',
        options: ['A', 'B'],
        answer: 'A',
      };
      expect(isQuestion(qEmptyId)).toBe(false);
      expect(isQuestion(qWhitespaceId)).toBe(false);
      expect(isQuestion(qNaNId)).toBe(false);
      expect(isQuestion(qInfinityId)).toBe(false);
    });

    it('應拒絕空白或非字串的 question 題幹', () => {
      const qEmpty = {
        id: '1',
        question: '',
        options: ['A', 'B'],
        answer: 'A',
      };
      const qSpaces = {
        id: '1',
        question: '   ',
        options: ['A', 'B'],
        answer: 'A',
      };
      const qNonString = {
        id: '1',
        question: 12345,
        options: ['A', 'B'],
        answer: 'A',
      };
      expect(isQuestion(qEmpty)).toBe(false);
      expect(isQuestion(qSpaces)).toBe(false);
      expect(isQuestion(qNonString)).toBe(false);
    });

    it('應拒絕空 options 陣列或非陣列', () => {
      const qEmptyOptions = {
        id: '1',
        question: 'Valid question',
        options: [],
        answer: 'A',
      };
      const qNullOptions = {
        id: '1',
        question: 'Valid question',
        options: null,
        answer: 'A',
      };
      expect(isQuestion(qEmptyOptions)).toBe(false);
      expect(isQuestion(qNullOptions)).toBe(false);
    });

    it('應拒絕 options 含有空字串、空白或非字串元素', () => {
      const qEmptyStringOpt = {
        id: '1',
        question: 'Valid question',
        options: ['A', ''],
        answer: 'A',
      };
      const qWhitespaceOpt = {
        id: '1',
        question: 'Valid question',
        options: ['A', '   '],
        answer: 'A',
      };
      const qNonStringOpt = {
        id: '1',
        question: 'Valid question',
        options: ['A', 123],
        answer: 'A',
      };
      expect(isQuestion(qEmptyStringOpt)).toBe(false);
      expect(isQuestion(qWhitespaceOpt)).toBe(false);
      expect(isQuestion(qNonStringOpt)).toBe(false);
    });

    it('應攔截答案不在 options 中的題目 (死鎖題防禦)', () => {
      const qDeadlockSingle = {
        id: 'deadlock-1',
        question: 'Single choice deadlock',
        options: ['Option A', 'Option B'],
        answer: 'Option C', // 不在 options 內
      };
      expect(isQuestion(qDeadlockSingle)).toBe(false);

      const qDeadlockMultiple = {
        id: 'deadlock-2',
        question: 'Multiple choice deadlock',
        options: ['Option A', 'Option B'],
        answer: ['Option A', 'Option C'], // Option C 不在 options 內
      };
      expect(isQuestion(qDeadlockMultiple)).toBe(false);
    });

    it('應拒絕空 answer 陣列或非字串 answer', () => {
      const qEmptyArrayAnswer = {
        id: '1',
        question: 'Valid question',
        options: ['A', 'B'],
        answer: [],
      };
      const qNumberAnswer = {
        id: '1',
        question: 'Valid question',
        options: ['A', 'B'],
        answer: 0,
      };
      expect(isQuestion(qEmptyArrayAnswer)).toBe(false);
      expect(isQuestion(qNumberAnswer)).toBe(false);
    });

    it('應拒絕非法的可選欄位型別', () => {
      const base = {
        id: '1',
        question: 'Question',
        options: ['A', 'B'],
        answer: 'A',
      };
      expect(isQuestion({ ...base, type: 'invalid_type' })).toBe(false);
      expect(isQuestion({ ...base, hint: 123 })).toBe(false);
      expect(isQuestion({ ...base, explanation: {} })).toBe(false);
      expect(isQuestion({ ...base, tags: 'not-an-array' })).toBe(false);
      expect(isQuestion({ ...base, tags: [1, 2] })).toBe(false);
      expect(isQuestion({ ...base, sourceQuestionKey: 123 })).toBe(false);
      expect(isQuestion({ ...base, sourceFingerprint: 123 })).toBe(false);
      expect(isQuestion({ ...base, original_question_id: NaN })).toBe(false);
    });

    it('應拒絕 type 與 answer 形態錯位的題目 (type=single 搭配陣列 或 type=multiple 搭配字串)', () => {
      const singleWithArrayAnswer = {
        id: 'mismatch-1',
        question: 'Single choice with array answer',
        options: ['A', 'B'],
        answer: ['A'],
        type: 'single',
      };
      const multipleWithStringAnswer = {
        id: 'mismatch-2',
        question: 'Multiple choice with string answer',
        options: ['A', 'B'],
        answer: 'A',
        type: 'multiple',
      };
      expect(isQuestion(singleWithArrayAnswer)).toBe(false);
      expect(isQuestion(multipleWithStringAnswer)).toBe(false);
    });

    it('當 type 為 undefined 時應相容字串或陣列答案 (向下相容歷史題型)', () => {
      const legacySingle = {
        id: 'legacy-1',
        question: 'Legacy question with string answer',
        options: ['A', 'B'],
        answer: 'A',
      };
      const legacyMultiple = {
        id: 'legacy-2',
        question: 'Legacy question with array answer',
        options: ['A', 'B'],
        answer: ['A', 'B'],
      };
      expect(isQuestion(legacySingle)).toBe(true);
      expect(isQuestion(legacyMultiple)).toBe(true);
    });
  });

  describe('parseQuestions', () => {
    it('若輸入非陣列，應發出警告並回傳空陣列', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const resultNull = parseQuestions(null, 'test-source');
      expect(resultNull).toEqual([]);
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0][0]).toContain('Expected questions array');

      const resultObj = parseQuestions({ questions: [] }, 'obj-source');
      expect(resultObj).toEqual([]);
      expect(warnSpy).toHaveBeenCalledTimes(2);
    });

    it('在混合陣列中應過濾掉無效題目並保留合法題目', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const valid1: Question = {
        id: 'q1',
        question: 'Valid 1',
        options: ['A', 'B'],
        answer: 'A',
      };
      const invalidDeadlock = {
        id: 'q2',
        question: 'Deadlock',
        options: ['A', 'B'],
        answer: 'Z',
      };
      const valid2: Question = {
        id: 0,
        question: 'Valid 2 with id 0',
        options: ['True', 'False'],
        answer: 'True',
      };
      const invalidNotObject = 'invalid item string';

      const input = [valid1, invalidDeadlock, valid2, invalidNotObject];
      const parsed = parseQuestions(input, 'mixed-test');

      expect(parsed).toEqual([valid1, valid2]);
      expect(warnSpy).toHaveBeenCalledTimes(2);
      expect(warnSpy.mock.calls[0][0]).toContain('Invalid question filtered at index 1');
      expect(warnSpy.mock.calls[1][0]).toContain('Invalid question filtered at index 3');
    });

    it('超過 5 則錯誤時應觸發聚合輸出 (警告日誌防洪上限 5 則)', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // 建立 8 個無效題目與 1 個合法題目
      const invalidItems = Array.from({ length: 8 }, (_, i) => ({
        id: `bad-${i}`,
        question: `Bad question ${i}`,
        options: ['A', 'B'],
        answer: 'INVALID_ANSWER', // deadlock
      }));
      const validItem: Question = {
        id: 'good-1',
        question: 'Good question',
        options: ['A', 'B'],
        answer: 'A',
      };

      const input = [...invalidItems, validItem];
      const parsed = parseQuestions(input, 'flood-source');

      expect(parsed).toEqual([validItem]);

      // 前 5 則為個別警告，第 6 則為聚合警告，總共 6 次警告呼叫
      expect(warnSpy).toHaveBeenCalledTimes(6);

      // 驗證前 5 則為個別過濾警告
      for (let i = 0; i < 5; i++) {
        expect(warnSpy.mock.calls[i][0]).toContain(`Invalid question filtered at index ${i}`);
      }

      // 驗證第 6 則為聚合警告，並包含 3 則額外抑制資訊
      const aggregateCall = warnSpy.mock.calls[5];
      expect(aggregateCall[0]).toContain('Aggregated warning');
      expect(aggregateCall[0]).toContain('3 additional invalid question(s)');
      expect(aggregateCall[0]).toContain('total invalid: 8');
    });

    it('警告日誌嚴禁輸出答案全文或機密內容', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const secretAnswer = 'SUPER_SECRET_ANSWER_TOP_CONFIDENTIAL';
      const secretPayload = {
        id: 'leak-test',
        question: 'Secret question',
        options: ['A', 'B'],
        answer: secretAnswer, // Deadlock invalid
      };

      parseQuestions([secretPayload], 'security-source');

      expect(warnSpy).toHaveBeenCalledTimes(1);
      const loggedArgs = JSON.stringify(warnSpy.mock.calls[0]);
      expect(loggedArgs).not.toContain(secretAnswer);
    });
  });

  describe('isMultipleAnswer', () => {
    it('當 answer 為字串陣列時回傳 true', () => {
      const multiQ: Question = {
        id: 'm1',
        question: 'Select multiple',
        options: ['A', 'B', 'C'],
        answer: ['A', 'B'],
      };
      expect(isMultipleAnswer(multiQ)).toBe(true);
    });

    it('當 answer 為單一字串時回傳 false', () => {
      const singleQ: Question = {
        id: 's1',
        question: 'Select single',
        options: ['A', 'B', 'C'],
        answer: 'A',
      };
      expect(isMultipleAnswer(singleQ)).toBe(false);
    });
  });
});
