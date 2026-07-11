import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useBankManager } from '../../hooks/useBankManager';
import { STORAGE_KEYS } from '../../services/storage';
import { BankMetadata } from '../../types';

// Mock dependencies
const confirmMock = vi.fn();
vi.mock('../../hooks/useConfirm', () => ({
  useConfirm: () => confirmMock,
}));

const toastMock = {
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
};
vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => toastMock,
}));

// Mock folder functions since they access localstorage or folders logic
vi.mock('../../services/storage', async (importOriginal) => {
  const original = await importOriginal<any>();
  return {
    ...original,
    getBankFolderMap: vi.fn(() => ({})),
    getFolders: vi.fn(() => []),
  };
});

describe('useBankManager refreshBanksData sync logic', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const createMockRepository = () => ({
    getBanks: vi.fn(),
    syncLocalToCloud: vi.fn(async (banks: BankMetadata[]) => {
      const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.BANKS_META) || '[]');
      banks.forEach(b => {
        const target = current.find((x: any) => x.id === b.id);
        if (target) target.cloudSyncedAt = Date.now();
      });
      localStorage.setItem(STORAGE_KEYS.BANKS_META, JSON.stringify(current));
      return { successIds: banks.map(b => b.id), failed: [] };
    }),
  } as any);

  it('scenario 1: cloud empty, local has unsynced -> confirm -> sync -> BANKS_META updated with cloudSyncedAt', async () => {
    const repo = createMockRepository();
    repo.getBanks.mockResolvedValueOnce([]).mockResolvedValueOnce([
      { id: 'bank-1', name: 'Bank 1', createdAt: 100, questionCount: 2 }
    ]);
    confirmMock.mockResolvedValueOnce(true);

    const localMeta: BankMetadata[] = [
      { id: 'bank-1', name: 'Bank 1', createdAt: 100, questionCount: 2 }
    ];
    localStorage.setItem(STORAGE_KEYS.BANKS_META, JSON.stringify(localMeta));

    const dispatch = vi.fn();
    const { result } = renderHook(() => useBankManager({
      repository: repo,
      dispatch,
      banks: [],
      selectedQuizBankIds: [],
      user: { id: 'test-user' }
    }));

    await act(async () => {
      await result.current.refreshBanksData();
    });

    expect(confirmMock).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('雲端是空的')
    }));
    expect(repo.syncLocalToCloud).toHaveBeenCalledWith([
      { id: 'bank-1', name: 'Bank 1', createdAt: 100, questionCount: 2 }
    ]);
    expect(toastMock.success).toHaveBeenCalledWith('同步完成！');

    const updatedLocal = JSON.parse(localStorage.getItem(STORAGE_KEYS.BANKS_META) || '[]');
    expect(updatedLocal[0].cloudSyncedAt).toBeGreaterThan(0);
  });

  it('scenario 2: cloud has banks, local has unsynced -> confirm message shows count -> sync -> BANKS_META updated with cloudSyncedAt', async () => {
    const repo = createMockRepository();
    repo.getBanks.mockResolvedValueOnce([
      { id: 'bank-cloud', name: 'Cloud Bank', createdAt: 50, questionCount: 5 }
    ]).mockResolvedValueOnce([
      { id: 'bank-cloud', name: 'Cloud Bank', createdAt: 50, questionCount: 5 },
      { id: 'bank-local', name: 'Local Bank', createdAt: 100, questionCount: 2 }
    ]);
    confirmMock.mockResolvedValueOnce(true);

    const localMeta: BankMetadata[] = [
      { id: 'bank-local', name: 'Local Bank', createdAt: 100, questionCount: 2 }
    ];
    localStorage.setItem(STORAGE_KEYS.BANKS_META, JSON.stringify(localMeta));

    const dispatch = vi.fn();
    const { result } = renderHook(() => useBankManager({
      repository: repo,
      dispatch,
      banks: [],
      selectedQuizBankIds: [],
      user: { id: 'test-user' }
    }));

    await act(async () => {
      await result.current.refreshBanksData();
    });

    expect(confirmMock).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('1 個新題庫尚未同步')
    }));
    expect(repo.syncLocalToCloud).toHaveBeenCalledWith([
      { id: 'bank-local', name: 'Local Bank', createdAt: 100, questionCount: 2 }
    ]);
    expect(toastMock.success).toHaveBeenCalledWith('同步完成！');

    const updatedLocal = JSON.parse(localStorage.getItem(STORAGE_KEYS.BANKS_META) || '[]');
    expect(updatedLocal[0].cloudSyncedAt).toBeGreaterThan(0);
  });

  it('scenario 3: local fully synced -> no confirm triggered', async () => {
    const repo = createMockRepository();
    repo.getBanks.mockResolvedValueOnce([
      { id: 'bank-1', name: 'Bank 1', createdAt: 100, questionCount: 2 }
    ]);

    const localMeta: BankMetadata[] = [
      { id: 'bank-1', name: 'Bank 1', createdAt: 100, questionCount: 2, cloudSyncedAt: Date.now() - 5000 }
    ];
    localStorage.setItem(STORAGE_KEYS.BANKS_META, JSON.stringify(localMeta));

    const dispatch = vi.fn();
    const { result } = renderHook(() => useBankManager({
      repository: repo,
      dispatch,
      banks: [],
      selectedQuizBankIds: [],
      user: { id: 'test-user' }
    }));

    await act(async () => {
      await result.current.refreshBanksData();
    });

    expect(confirmMock).not.toHaveBeenCalled();
    expect(repo.syncLocalToCloud).not.toHaveBeenCalled();
  });

  it('scenario 4: syncLocalToCloud fails -> BANKS_META unchanged + toast.error', async () => {
    const repo = createMockRepository();
    repo.getBanks.mockResolvedValue([]);
    repo.syncLocalToCloud.mockResolvedValueOnce({ successIds: [], failed: [{ id: 'bank-1', name: 'Bank 1', error: 'Fail' }] });
    confirmMock.mockResolvedValueOnce(true);

    const localMeta: BankMetadata[] = [
      { id: 'bank-1', name: 'Bank 1', createdAt: 100, questionCount: 2 }
    ];
    localStorage.setItem(STORAGE_KEYS.BANKS_META, JSON.stringify(localMeta));

    const dispatch = vi.fn();
    const { result } = renderHook(() => useBankManager({
      repository: repo,
      dispatch,
      banks: [],
      selectedQuizBankIds: [],
      user: { id: 'test-user' }
    }));

    await act(async () => {
      await result.current.refreshBanksData();
    });

    expect(toastMock.error).toHaveBeenCalledWith(expect.stringContaining('同步失敗'));
    const updatedLocal = JSON.parse(localStorage.getItem(STORAGE_KEYS.BANKS_META) || '[]');
    expect(updatedLocal[0].cloudSyncedAt).toBeUndefined();
  });

  it('scenario 5: user not logged in -> no confirm triggered regardless of unsynced banks', async () => {
    const repo = createMockRepository();
    repo.getBanks.mockResolvedValue([]);
    
    const localMeta: BankMetadata[] = [
      { id: 'bank-1', name: 'Bank 1', createdAt: 100, questionCount: 2 }
    ];
    localStorage.setItem(STORAGE_KEYS.BANKS_META, JSON.stringify(localMeta));

    const dispatch = vi.fn();
    const { result } = renderHook(() => useBankManager({
      repository: repo,
      dispatch,
      banks: [],
      selectedQuizBankIds: [],
      user: null
    }));

    await act(async () => {
      await result.current.refreshBanksData();
    });

    expect(confirmMock).not.toHaveBeenCalled();
    expect(repo.syncLocalToCloud).not.toHaveBeenCalled();
    const updatedLocal = JSON.parse(localStorage.getItem(STORAGE_KEYS.BANKS_META) || '[]');
    expect(updatedLocal[0].cloudSyncedAt).toBeUndefined();
  });
});
