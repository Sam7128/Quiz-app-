import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useAppDataLoader } from '../../hooks/useAppDataLoader';
import { IStorageRepository } from '../../services/repository';
import { BankMetadata, Question } from '../../types';

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (err: unknown) => void;
};

const deferred = <T,>(): Deferred<T> => {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('useAppDataLoader stale response prevention', () => {
  it('does not apply an older quiz pool result after selection changes', async () => {
    const dA = deferred<Question[]>();
    const dB = deferred<Question[]>();

    const repo: Pick<IStorageRepository, 'getQuestions'> = {
      getQuestions: vi.fn((bankId: string) => {
        if (bankId === 'bankA') return dA.promise;
        if (bankId === 'bankB') return dB.promise;
        return Promise.resolve([]);
      }),
    };

    const refreshBanksData = vi.fn(async (): Promise<BankMetadata[]> => []);
    const dispatch = vi.fn();

    const { result, rerender } = renderHook(
      ({ selectedQuizBankIds }) =>
        useAppDataLoader({
          repository: repo as unknown as IStorageRepository,
          dispatch,
          refreshBanksData,
          selectedQuizBankIds,
          editingBankId: null,
          loading: true, // skip init effect
        }),
      { initialProps: { selectedQuizBankIds: ['bankA'] } }
    );

    // Switch selection before bankA resolves.
    rerender({ selectedQuizBankIds: ['bankB'] });

    dB.resolve([
      { id: 'b1', question: 'From B', options: ['B'], answer: 'B', type: 'single', explanation: 'B' },
    ]);

    await waitFor(() => {
      expect(result.current.quizPoolQuestions.map((q) => q.question)).toEqual(['From B']);
    });

    // Resolve the older request; it must NOT overwrite the pool.
    dA.resolve([
      { id: 'a1', question: 'From A', options: ['A'], answer: 'A', type: 'single', explanation: 'A' },
    ]);

    // Allow microtasks to flush.
    await new Promise((r) => setTimeout(r, 0));
    expect(result.current.quizPoolQuestions.map((q) => q.question)).toEqual(['From B']);
  });
});

