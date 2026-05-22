import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BankMetadata } from '../../types';

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

import { syncLocalToCloud } from '../../services/cloudStorage';

describe('syncLocalToCloud', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-123' } } });
  });

  it('successfully syncs all banks when there are no errors', async () => {
    // Mock createCloudBank (insert into banks)
    const singleMock = vi.fn().mockResolvedValue({ data: { id: 'cloud-bank-1' }, error: null });
    const selectMock = vi.fn().mockReturnValue({ single: singleMock });
    const insertMock = vi.fn().mockReturnValue({ select: selectMock });
    
    // Mock saveCloudQuestions (upsert into questions and delete for cleanup)
    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    const notMock = vi.fn().mockResolvedValue({ error: null });
    const eqMock = vi.fn().mockReturnValue({ not: notMock });
    const deleteMock = vi.fn().mockReturnValue({ eq: eqMock });
    const selectEqMock = vi.fn().mockResolvedValue({ data: [], error: null });
    const selectMockForQuestions = vi.fn().mockReturnValue({ eq: selectEqMock });

    mocks.from.mockImplementation((table: string) => {
      if (table === 'banks') {
        return { insert: insertMock };
      }
      if (table === 'questions') {
        return { 
          upsert: upsertMock, 
          delete: deleteMock,
          select: selectMockForQuestions
        };
      }
      return {};
    });

    const localBanks: BankMetadata[] = [
      { id: 'local-1', name: 'Bank 1', createdAt: 1000, questionCount: 1 },
      { id: 'local-2', name: 'Bank 2', createdAt: 2000, questionCount: 2 },
    ];

    localStorage.setItem('mindspark_bank_local-1', JSON.stringify([{ id: 'q-1', question: 'Q1', options: ['A'], answer: 'A' }]));
    localStorage.setItem('mindspark_bank_local-2', JSON.stringify([{ id: 'q-2', question: 'Q2', options: ['B'], answer: 'B' }]));

    const result = await syncLocalToCloud(localBanks);

    expect(result.successIds).toEqual(['local-1', 'local-2']);
    expect(result.failed).toHaveLength(0);
    expect(insertMock).toHaveBeenCalledTimes(2);
    expect(upsertMock).toHaveBeenCalledTimes(2);
  });

  it('isolates failures using Promise.allSettled and returns partial failures', async () => {
    // Bank 1 succeeds, Bank 2 fails on bank creation, Bank 3 fails on question saving
    mocks.from.mockImplementation((table: string) => {
      if (table === 'banks') {
        return {
          insert: function(payload: any) {
            return {
              select: () => ({
                single: async () => {
                  const name = Array.isArray(payload) ? payload[0]?.title : payload?.title;
                  if (name === 'Bank 2') {
                    return { data: null, error: new Error('Database insertion failed') };
                  }
                  const id = name === 'Bank 1' ? 'cloud-bank-1' : 'cloud-bank-3';
                  return { data: { id }, error: null };
                }
              })
            };
          }
        };
      }
      if (table === 'questions') {
        return {
          upsert: async (toUpsert: any) => {
            const bankId = toUpsert?.[0]?.bank_id;
            if (bankId === 'cloud-bank-3') {
              return { error: { message: 'Upsert rate limit reached' } };
            }
            return { error: null };
          },
          delete: () => ({
            eq: () => ({
              not: async () => ({ error: null })
            })
          }),
          select: () => ({
            eq: async () => ({ data: [], error: null })
          })
        };
      }
      return {};
    });

    const localBanks: BankMetadata[] = [
      { id: 'local-1', name: 'Bank 1', createdAt: 1000, questionCount: 1 },
      { id: 'local-2', name: 'Bank 2', createdAt: 2000, questionCount: 1 },
      { id: 'local-3', name: 'Bank 3', createdAt: 3000, questionCount: 1 },
    ];

    localStorage.setItem('mindspark_bank_local-1', JSON.stringify([{ id: 'q-1', question: 'Q1', options: ['A'], answer: 'A' }]));
    localStorage.setItem('mindspark_bank_local-2', JSON.stringify([{ id: 'q-2', question: 'Q2', options: ['B'], answer: 'B' }]));
    localStorage.setItem('mindspark_bank_local-3', JSON.stringify([{ id: 'q-3', question: 'Q3', options: ['C'], answer: 'C' }]));

    const result = await syncLocalToCloud(localBanks);

    expect(result.successIds).toEqual(['local-1']);
    expect(result.failed).toHaveLength(2);
    expect(result.failed).toContainEqual({
      id: 'local-2',
      name: 'Bank 2',
      error: 'Failed to create bank in cloud'
    });
    expect(result.failed).toContainEqual({
      id: 'local-3',
      name: 'Bank 3',
      error: 'Failed to save cloud questions: Upsert rate limit reached'
    });
  });

  it('handles non-Error rejection reasons gracefully', async () => {
    mocks.from.mockImplementation((table: string) => {
      if (table === 'banks') {
        return {
          insert: () => ({
            select: () => ({
              single: async () => {
                // Reject with a plain string instead of an Error object
                throw 'Arbitrary string error';
              }
            })
          })
        };
      }
      return {};
    });

    const localBanks: BankMetadata[] = [
      { id: 'local-1', name: 'Bank 1', createdAt: 1000, questionCount: 1 }
    ];
    localStorage.setItem('mindspark_bank_local-1', JSON.stringify([{ id: 'q-1', question: 'Q1', options: ['A'], answer: 'A' }]));

    const result = await syncLocalToCloud(localBanks);

    expect(result.successIds).toEqual([]);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]).toEqual({
      id: 'local-1',
      name: 'Bank 1',
      error: 'Arbitrary string error'
    });
  });

  it('returns empty result when localBanks list is empty', async () => {
    const result = await syncLocalToCloud([]);
    expect(result.successIds).toEqual([]);
    expect(result.failed).toEqual([]);
  });
});
