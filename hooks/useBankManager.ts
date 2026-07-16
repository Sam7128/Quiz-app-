import { useCallback, useRef } from 'react';
import type { Dispatch } from 'react';
import { AppAction, BankMetadata } from '../types';
import {
  createFolder,
  deleteFolder,
  getBankFolderMap,
  getBanksMeta,
  getFolders,
  setCurrentBankId
} from '../services/storage';
import { IStorageRepository } from '../services/repository';
import { useConfirm } from './useConfirm';
import { useToast } from '../contexts/ToastContext';

interface UseBankManagerParams {
  repository: IStorageRepository;
  dispatch: Dispatch<AppAction>;
  banks: BankMetadata[];
  selectedQuizBankIds: string[];
  user: unknown;
}

interface UseBankManagerReturn {
  refreshBanksData: () => Promise<BankMetadata[]>;
  handleCreateFolder: (name: string) => void;
  handleDeleteFolder: (id: string) => void;
  handleBatchDelete: () => Promise<void>;
  handleMoveBank: (bankId: string, folderId: string | undefined) => Promise<void>;
  handleEditingBankChange: (id: string) => void;
  handleToggleQuizBank: (id: string) => void;
  handleSelectAll: (selected: boolean) => void;
}

export const useBankManager = ({
  repository,
  dispatch,
  banks,
  selectedQuizBankIds,
  user
}: UseBankManagerParams): UseBankManagerReturn => {
  const confirmDialog = useConfirm();
  const toast = useToast();
  const isRefreshingRef = useRef(false);

  const refreshBanksData = useCallback(async () => {
    if (isRefreshingRef.current) {
      console.log('[BankManager] refreshBanksData already in progress, skipping');
      return [];
    }
    isRefreshingRef.current = true;

    try {
      let latest = await repository.getBanks();

      const localMeta = getBanksMeta();
      const unsyncedLocalMeta = localMeta.filter(b => !b.cloudSyncedAt);

      if (user && unsyncedLocalMeta.length > 0) {
        const message = latest.length === 0
          ? '偵測到您在本地端有題庫，但雲端是空的。是否要將本地題庫上傳至雲端同步？'
          : `偵測到您在本地端有 ${unsyncedLocalMeta.length} 個新題庫尚未同步至雲端。是否要上傳同步？`;

        if (await confirmDialog({ title: '同步題庫', message })) {
          try {
            const syncResult = await repository.syncLocalToCloud(unsyncedLocalMeta);
            latest = await repository.getBanks();
            if (syncResult.failed.length === 0) {
              toast.success('同步完成！');
            } else if (syncResult.successIds.length > 0) {
              toast.warning(`同步部分成功！${syncResult.successIds.length} 個題庫同步成功，${syncResult.failed.length} 個失敗。`);
            } else {
              toast.error(`同步失敗！所有 ${syncResult.failed.length} 個題庫同步失敗，請稍後重試。`);
            }
          } catch (err) {
            console.error('[BankManager] Sync failed with exception:', err);
            const msg = err instanceof Error ? err.message : String(err);
            toast.error(`同步失敗：${msg}`);
          }
        }
      }

      const folderMap = getBankFolderMap();
      latest = latest.map(b => ({
        ...b,
        folderId: Object.prototype.hasOwnProperty.call(folderMap, b.id) ? folderMap[b.id] : b.folderId
      }));

      const latestFolders = getFolders();
      dispatch({ type: 'sync_banks_data', banks: latest, folders: latestFolders });

      return latest;
    } finally {
      isRefreshingRef.current = false;
    }
  }, [confirmDialog, dispatch, repository, toast, user]);

  const handleCreateFolder = useCallback((name: string) => {
    createFolder(name);
    void refreshBanksData();
  }, [refreshBanksData]);

  const handleDeleteFolder = useCallback((id: string) => {
    deleteFolder(id);
    void refreshBanksData();
  }, [refreshBanksData]);

  const handleBatchDelete = useCallback(async () => {
    if (selectedQuizBankIds.length === 0) return;
    if (!await confirmDialog({ title: '確認刪除', message: `確定要「剷除」這 ${selectedQuizBankIds.length} 個選中的題庫嗎？此動作無法復原。` })) return;

    for (const bankId of selectedQuizBankIds) {
      await repository.deleteBank(bankId);
    }

    selectedQuizBankIds.forEach(id => {
      dispatch({ type: 'toggle_quiz_bank_id', bankId: id });
    });
    await refreshBanksData();
    toast.success('已成功剷除所選題庫。');
  }, [confirmDialog, dispatch, refreshBanksData, repository, selectedQuizBankIds, toast]);

  const handleMoveBank = useCallback(async (bankId: string, folderId: string | undefined) => {
    try {
      await repository.updateBankFolder(bankId, folderId);
      await refreshBanksData();
    } catch (error) {
      console.error('Error moving bank:', error);
      await refreshBanksData();
    }
  }, [refreshBanksData, repository]);

  const handleEditingBankChange = useCallback((id: string) => {
    dispatch({ type: 'set_editing_bank_id', editingBankId: id });
    setCurrentBankId(id);
  }, [dispatch]);

  const handleToggleQuizBank = useCallback((id: string) => {
    dispatch({ type: 'toggle_quiz_bank_id', bankId: id });
  }, [dispatch]);

  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      const allIds = banks.map(b => b.id);
      dispatch({ type: 'set_selected_bank_ids', bankIds: allIds });
    } else {
      dispatch({ type: 'set_selected_bank_ids', bankIds: [] });
    }
  }, [banks, dispatch]);

  return {
    refreshBanksData,
    handleCreateFolder,
    handleDeleteFolder,
    handleBatchDelete,
    handleMoveBank,
    handleEditingBankChange,
    handleToggleQuizBank,
    handleSelectAll
  };
};
