import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEYS } from '../../services/storage';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock('../../services/supabase', () => ({
  supabase: {
    from: mocks.from,
  },
}));

import { retryCleanupDirtyBanks } from '../../services/cloudStorage';

describe('retryCleanupDirtyBanks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // 場景 A：upsert 成功 + delete 成功 → dirty 標記被移除
  it('Scenario A: upsert success + delete success -> dirty mark removed', async () => {
    const bankId = 'bank-a';
    localStorage.setItem('mindspark_dirty_banks', JSON.stringify([bankId]));
    localStorage.setItem(
      STORAGE_KEYS.BANK_PREFIX + bankId,
      JSON.stringify([
        { id: '11111111-1111-4111-8111-111111111111', question: 'Q1', options: ['A'], answer: 'A', type: 'single' },
      ])
    );

    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    const selectEqMock = vi.fn().mockResolvedValue({
      data: [{ id: '11111111-1111-4111-8111-111111111111' }, { id: 'orphan-uuid' }],
      error: null,
    });
    const selectMock = vi.fn().mockReturnValue({ eq: selectEqMock });
    const deleteEqMock = vi.fn().mockResolvedValue({ error: null });
    const deleteInMock = vi.fn().mockReturnValue({ eq: deleteEqMock });
    const deleteMock = vi.fn().mockReturnValue({ in: deleteInMock });

    mocks.from.mockReturnValue({
      upsert: upsertMock,
      select: selectMock,
      delete: deleteMock,
    });

    await retryCleanupDirtyBanks();

    expect(upsertMock).toHaveBeenCalledTimes(1);
    expect(deleteInMock).toHaveBeenCalledWith('id', ['orphan-uuid']);
    expect(deleteEqMock).toHaveBeenCalledWith('bank_id', bankId);
    expect(localStorage.getItem('mindspark_dirty_banks')).toBeNull();
  });

  // 場景 B：upsert 失敗 → bankId 保留在 dirty list，未執行 delete
  it('Scenario B: upsert failure -> retains bankId in dirty list without calling delete', async () => {
    const bankId = 'bank-b';
    localStorage.setItem('mindspark_dirty_banks', JSON.stringify([bankId]));
    localStorage.setItem(
      STORAGE_KEYS.BANK_PREFIX + bankId,
      JSON.stringify([
        { id: '11111111-1111-4111-8111-111111111111', question: 'Q1', options: ['A'], answer: 'A', type: 'single' },
      ])
    );

    const upsertMock = vi.fn().mockResolvedValue({ error: { message: 'Upsert network timeout' } });
    const deleteMock = vi.fn();

    mocks.from.mockReturnValue({
      upsert: upsertMock,
      delete: deleteMock,
    });

    await retryCleanupDirtyBanks();

    expect(upsertMock).toHaveBeenCalledTimes(1);
    expect(deleteMock).not.toHaveBeenCalled();
    const dirty = JSON.parse(localStorage.getItem('mindspark_dirty_banks') || '[]');
    expect(dirty).toContain(bankId);
  });

  // 場景 C：upsert 成功 + delete 失敗 → bankId 保留在 dirty list
  it('Scenario C: upsert success + delete failure -> retains bankId in dirty list', async () => {
    const bankId = 'bank-c';
    localStorage.setItem('mindspark_dirty_banks', JSON.stringify([bankId]));
    localStorage.setItem(
      STORAGE_KEYS.BANK_PREFIX + bankId,
      JSON.stringify([
        { id: '11111111-1111-4111-8111-111111111111', question: 'Q1', options: ['A'], answer: 'A', type: 'single' },
      ])
    );

    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    const selectEqMock = vi.fn().mockResolvedValue({
      data: [{ id: '11111111-1111-4111-8111-111111111111' }, { id: 'orphan-uuid' }],
      error: null,
    });
    const selectMock = vi.fn().mockReturnValue({ eq: selectEqMock });
    const deleteEqMock = vi.fn().mockResolvedValue({ error: { message: 'Delete constraint error' } });
    const deleteInMock = vi.fn().mockReturnValue({ eq: deleteEqMock });
    const deleteMock = vi.fn().mockReturnValue({ in: deleteInMock });

    mocks.from.mockReturnValue({
      upsert: upsertMock,
      select: selectMock,
      delete: deleteMock,
    });

    await retryCleanupDirtyBanks();

    expect(upsertMock).toHaveBeenCalledTimes(1);
    expect(deleteInMock).toHaveBeenCalledTimes(1);
    const dirty = JSON.parse(localStorage.getItem('mindspark_dirty_banks') || '[]');
    expect(dirty).toContain(bankId);
  });

  // 場景 D：本地題庫為空陣列 → 僅執行全量 delete（清理雲端所有題目）
  it('Scenario D: local questions empty array -> executes full delete of bank questions', async () => {
    const bankId = 'bank-d';
    localStorage.setItem('mindspark_dirty_banks', JSON.stringify([bankId]));
    localStorage.setItem(STORAGE_KEYS.BANK_PREFIX + bankId, JSON.stringify([]));

    const upsertMock = vi.fn();
    const deleteEqMock = vi.fn().mockResolvedValue({ error: null });
    const deleteMock = vi.fn().mockReturnValue({ eq: deleteEqMock });

    mocks.from.mockReturnValue({
      upsert: upsertMock,
      delete: deleteMock,
    });

    await retryCleanupDirtyBanks();

    expect(upsertMock).not.toHaveBeenCalled();
    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(deleteEqMock).toHaveBeenCalledWith('bank_id', bankId);
    expect(localStorage.getItem('mindspark_dirty_banks')).toBeNull();
  });

  // 場景 E：某 bankId 本地格式損毀 → 獨立隔離不中斷其他 bankId 的清理
  it('Scenario E: corrupt JSON in one bank does not block cleanup of other banks', async () => {
    const corruptBankId = 'bank-corrupt';
    const validBankId = 'bank-valid';
    localStorage.setItem('mindspark_dirty_banks', JSON.stringify([corruptBankId, validBankId]));
    localStorage.setItem(STORAGE_KEYS.BANK_PREFIX + corruptBankId, '{corrupt json');
    localStorage.setItem(
      STORAGE_KEYS.BANK_PREFIX + validBankId,
      JSON.stringify([
        { id: '22222222-2222-4222-8222-222222222222', question: 'Q2', options: ['A'], answer: 'A', type: 'single' },
      ])
    );

    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    const selectEqMock = vi.fn().mockResolvedValue({
      data: [{ id: '22222222-2222-4222-8222-222222222222' }],
      error: null,
    });
    const selectMock = vi.fn().mockReturnValue({ eq: selectEqMock });
    const deleteMock = vi.fn();

    mocks.from.mockReturnValue({
      upsert: upsertMock,
      select: selectMock,
      delete: deleteMock,
    });

    await retryCleanupDirtyBanks();

    expect(upsertMock).toHaveBeenCalledTimes(1);
    const dirty = JSON.parse(localStorage.getItem('mindspark_dirty_banks') || '[]');
    expect(dirty).toContain(corruptBankId);
    expect(dirty).not.toContain(validBankId);
  });

  // 場景 F：本地快取丟失（null）→ 記錄警告並移出 dirty 標記，嚴格禁止刪除雲端題目 (D7-001)
  it('Scenario F: missing local cache (null) logs warning and clears dirty mark without deleting cloud questions', async () => {
    const bankId = 'bank-evicted';
    localStorage.setItem('mindspark_dirty_banks', JSON.stringify([bankId]));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const deleteMock = vi.fn();
    const upsertMock = vi.fn();
    mocks.from.mockReturnValue({
      delete: deleteMock,
      upsert: upsertMock,
    });

    await retryCleanupDirtyBanks();

    expect(deleteMock).not.toHaveBeenCalled();
    expect(upsertMock).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(`Local cache missing for dirty bank ${bankId}`)
    );
    expect(localStorage.getItem('mindspark_dirty_banks')).toBeNull();
    warnSpy.mockRestore();
  });

  // 場景 G：刪除孤兒時確保查詢語句包含 eq('bank_id', bankId) 條件 (D6-001)
  it('Scenario G: orphan deletion chain enforces eq("bank_id", bankId)', async () => {
    const bankId = 'bank-g';
    localStorage.setItem('mindspark_dirty_banks', JSON.stringify([bankId]));
    localStorage.setItem(
      STORAGE_KEYS.BANK_PREFIX + bankId,
      JSON.stringify([
        { id: '33333333-3333-4333-8333-333333333333', question: 'Q3', options: ['A'], answer: 'A', type: 'single' },
      ])
    );

    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    const selectEqMock = vi.fn().mockResolvedValue({
      data: [{ id: '33333333-3333-4333-8333-333333333333' }, { id: 'orphan-123' }],
      error: null,
    });
    const selectMock = vi.fn().mockReturnValue({ eq: selectEqMock });
    const deleteEqMock = vi.fn().mockResolvedValue({ error: null });
    const deleteInMock = vi.fn().mockReturnValue({ eq: deleteEqMock });
    const deleteMock = vi.fn().mockReturnValue({ in: deleteInMock });

    mocks.from.mockReturnValue({
      upsert: upsertMock,
      select: selectMock,
      delete: deleteMock,
    });

    await retryCleanupDirtyBanks();

    expect(deleteInMock).toHaveBeenCalledWith('id', ['orphan-123']);
    expect(deleteEqMock).toHaveBeenCalledWith('bank_id', bankId);
  });
});
