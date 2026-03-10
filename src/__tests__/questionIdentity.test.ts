import { describe, expect, it } from 'vitest';

import type { Question } from '../../types';
import {
  analyzeImportQuestions,
  createImportedQuestion,
  mergeImportedQuestions,
  planQuestionImport
} from '../../utils/questionIdentity';

describe('question identity helpers', () => {
  it('creates imported question with fresh internal id and preserved source key', () => {
    const imported = createImportedQuestion({
      id: 'external-42',
      question: 'What is React?',
      options: ['Library', 'Language'],
      answer: 'Library',
      type: 'single',
    });

    expect(imported.id).not.toBe('external-42');
    expect(imported.original_question_id).toBe('external-42');
    expect(imported.sourceQuestionKey).toBe('external-42');
    expect(imported.sourceFingerprint).toBeTruthy();
  });

  it('preserves existing internal id when source key matches on re-import', () => {
    const existing: Question[] = [
      {
        id: 'internal-1',
        sourceQuestionKey: 'external-42',
        sourceFingerprint: 'legacy-fp',
        question: '舊題目',
        options: ['A', 'B'],
        answer: 'A',
        type: 'single',
      },
    ];

    const merged = mergeImportedQuestions(existing, [
      {
        id: 'external-42',
        question: '新題目內容',
        options: ['A', 'B'],
        answer: 'B',
        type: 'single',
      },
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe('internal-1');
    expect(merged[0].question).toBe('新題目內容');
    expect(merged[0].sourceQuestionKey).toBe('external-42');
  });

  it('deduplicates imported payload by source key and keeps the latest version', () => {
    const merged = mergeImportedQuestions([], [
      {
        id: 'external-7',
        question: 'Q1',
        options: ['A', 'B'],
        answer: 'A',
        type: 'single',
      },
      {
        id: 'external-7',
        question: 'Q1 updated',
        options: ['A', 'B'],
        answer: 'B',
        type: 'single',
      },
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0].question).toBe('Q1 updated');
    expect(merged[0].sourceQuestionKey).toBe('external-7');
  });

  it('analyzes import counts for pre-import summary', () => {
    const analysis = analyzeImportQuestions(
      [
        {
          id: 'internal-1',
          sourceQuestionKey: 'external-42',
          sourceFingerprint: 'legacy-fp',
          question: '舊題目',
          options: ['A', 'B'],
          answer: 'A',
          type: 'single',
        },
      ],
      [
        {
          id: 'external-42',
          question: '更新題目',
          options: ['A', 'B'],
          answer: 'B',
          type: 'single',
        },
        {
          id: 'external-42',
          question: '更新題目 duplicate',
          options: ['A', 'B'],
          answer: 'B',
          type: 'single',
        },
        {
          id: 'external-99',
          question: '新題目',
          options: ['A', 'B'],
          answer: 'A',
          type: 'single',
        },
      ],
      'merge'
    );

    expect(analysis).toEqual({
      rawCount: 3,
      duplicateSourceKeyMergedCount: 1,
      duplicateFingerprintMergedCount: 0,
      dedupedCount: 2,
      matchedExistingCount: 1,
      newQuestionCount: 1,
      updatedQuestionCount: 1,
      skippedMatchedCount: 0,
      removedQuestionCount: 0,
      finalQuestionCount: 2,
    });
  });

  it('supports append mode without overwriting existing matched questions', () => {
    const existing: Question[] = [
      {
        id: 'internal-1',
        sourceQuestionKey: 'external-42',
        sourceFingerprint: 'legacy-fp',
        question: '舊題目',
        options: ['A', 'B'],
        answer: 'A',
        type: 'single',
      },
    ];

    const result = planQuestionImport(
      existing,
      [
        {
          id: 'external-42',
          question: '不應覆蓋舊題',
          options: ['A', 'B'],
          answer: 'B',
          type: 'single',
        },
        {
          id: 'external-99',
          question: '真正新增題目',
          options: ['A', 'B'],
          answer: 'A',
          type: 'single',
        },
      ],
      'append'
    );

    expect(result.questions).toHaveLength(2);
    expect(result.questions[0].question).toBe('舊題目');
    expect(result.questions[1].question).toBe('真正新增題目');
    expect(result.analysis).toEqual({
      rawCount: 2,
      duplicateSourceKeyMergedCount: 0,
      duplicateFingerprintMergedCount: 0,
      dedupedCount: 2,
      matchedExistingCount: 1,
      newQuestionCount: 1,
      updatedQuestionCount: 0,
      skippedMatchedCount: 1,
      removedQuestionCount: 0,
      finalQuestionCount: 2,
    });
  });
});
