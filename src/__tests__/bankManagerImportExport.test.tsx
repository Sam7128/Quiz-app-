import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { BankManager } from '../../components/BankManager';
import { Question, BankMetadata } from '../../types';
import type { IStorageRepository } from '../../services/repository';

// Mocks
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
};

vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => mockToast,
}));

const mockConfirm = vi.fn();
vi.mock('../../hooks/useConfirm', () => ({
  useConfirm: () => mockConfirm,
}));

const mockRepository: Partial<IStorageRepository> = {
  getBanks: vi.fn(),
  createBank: vi.fn(),
  deleteBank: vi.fn(),
  saveQuestions: vi.fn(),
  deleteQuestionArtifacts: vi.fn(),
  clearMistakes: vi.fn(),
};

vi.mock('../../contexts/RepositoryContext', () => ({
  useRepository: () => mockRepository,
}));

// Mock AI generator to prevent network calls
vi.mock('../../services/ai', () => ({
  generateQuestionsFromPDF: vi.fn().mockResolvedValue([]),
}));

describe('BankManager Import & Export (Phase 3: Tasks 3.1 & 3.2)', () => {
  const sampleBankId = 'bank-test-123';
  const initialBanks: BankMetadata[] = [
    { id: sampleBankId, name: '測試題庫', questionCount: 2, createdAt: Date.now() },
  ];

  const initialQuestions: Question[] = [
    {
      id: 'q-existing-1',
      question: '既有題目 1',
      options: ['選項 A', '選項 B'],
      answer: '選項 A',
      type: 'single',
    },
    {
      id: 'q-existing-2',
      question: '既有題目 2',
      options: ['選項 C', '選項 D'],
      answer: '選項 C',
      type: 'single',
    },
  ];

  const onBankChange = vi.fn();
  const onUpdateQuestions = vi.fn();
  const onRefreshBanks = vi.fn();
  const onMistakesUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (mockRepository.getBanks as ReturnType<typeof vi.fn>).mockResolvedValue(initialBanks);
    (mockRepository.saveQuestions as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    mockConfirm.mockResolvedValue(true);
  });

  const renderComponent = async (props: Partial<React.ComponentProps<typeof BankManager>> = {}) => {
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(
        <BankManager
          currentQuestions={initialQuestions}
          currentBankId={sampleBankId}
          onBankChange={onBankChange}
          onUpdateQuestions={onUpdateQuestions}
          onRefreshBanks={onRefreshBanks}
          onMistakesUpdate={onMistakesUpdate}
          {...props}
        />
      );
    });
    return result!;
  };

  describe('Task 3.1: JSON Import & Validation Gate', () => {
    it('應成功清洗 UTF-8 BOM (\\uFEFF) 並完成匯入', async () => {
      await renderComponent();

      // 切換至貼上文字頁籤
      const pasteTabBtn = screen.getByRole('button', { name: /貼上文字/i });
      fireEvent.click(pasteTabBtn);

      const textarea = screen.getByPlaceholderText(/在此貼上 AI 生成的 JSON 代碼/i);
      const bomJson = '\uFEFF' + JSON.stringify([
        {
          id: 'q-bom-1',
          question: 'BOM 題目 1',
          options: ['選項 1', '選項 2'],
          answer: '選項 1',
          type: 'single',
        },
      ]);

      fireEvent.change(textarea, { target: { value: bomJson } });

      const importBtn = screen.getByRole('button', { name: /匯入文字內容/i });
      await act(async () => {
        fireEvent.click(importBtn);
      });

      // 驗證彈出確認視窗
      expect(mockConfirm).toHaveBeenCalledTimes(1);
      expect(mockConfirm).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '匯入前檢查',
          message: expect.stringContaining('追加新題'),
        })
      );

      // 驗證儲存與更新
      expect(mockRepository.saveQuestions).toHaveBeenCalledTimes(1);
      expect(onUpdateQuestions).toHaveBeenCalledTimes(1);
      expect(mockToast.success).toHaveBeenCalledWith('成功匯入 1 題！');
    });

    it('應成功清洗多重 UTF-8 BOM (\\uFEFF\\uFEFF) 並完成匯入', async () => {
      await renderComponent();

      const pasteTabBtn = screen.getByRole('button', { name: /貼上文字/i });
      fireEvent.click(pasteTabBtn);

      const textarea = screen.getByPlaceholderText(/在此貼上 AI 生成的 JSON 代碼/i);
      const multiBomJson = '\uFEFF\uFEFF' + JSON.stringify([
        {
          id: 'q-bom-multi',
          question: '多重 BOM 題目',
          options: ['A', 'B'],
          answer: 'A',
          type: 'single',
        },
      ]);

      fireEvent.change(textarea, { target: { value: multiBomJson } });

      const importBtn = screen.getByRole('button', { name: /匯入文字內容/i });
      await act(async () => {
        fireEvent.click(importBtn);
      });

      expect(mockConfirm).toHaveBeenCalledTimes(1);
      expect(mockRepository.saveQuestions).toHaveBeenCalledTimes(1);
      expect(mockToast.success).toHaveBeenCalledWith('成功匯入 1 題！');
    });

    it('遇無效 JSON 語法時應阻斷匯入並顯示錯誤 Toast', async () => {
      await renderComponent();

      const pasteTabBtn = screen.getByRole('button', { name: /貼上文字/i });
      fireEvent.click(pasteTabBtn);

      const textarea = screen.getByPlaceholderText(/在此貼上 AI 生成的 JSON 代碼/i);
      fireEvent.change(textarea, { target: { value: '{ invalid: json syntax' } });

      const importBtn = screen.getByRole('button', { name: /匯入文字內容/i });
      await act(async () => {
        fireEvent.click(importBtn);
      });

      // 驗證不開啟確認、不儲存、不通知 parent
      expect(mockConfirm).not.toHaveBeenCalled();
      expect(mockRepository.saveQuestions).not.toHaveBeenCalled();
      expect(onUpdateQuestions).not.toHaveBeenCalled();

      // 驗證錯誤 Toast
      expect(mockToast.error).toHaveBeenCalledTimes(1);
    });

    it('非陣列 Root (如 JSON 物件) 應阻斷匯入並顯示陣列錯誤 Toast', async () => {
      await renderComponent();

      const pasteTabBtn = screen.getByRole('button', { name: /貼上文字/i });
      fireEvent.click(pasteTabBtn);

      const textarea = screen.getByPlaceholderText(/在此貼上 AI 生成的 JSON 代碼/i);
      const objectRootJson = JSON.stringify({
        id: 'q-single',
        question: '這是物件非陣列',
        options: ['A', 'B'],
        answer: 'A',
      });

      fireEvent.change(textarea, { target: { value: objectRootJson } });

      const importBtn = screen.getByRole('button', { name: /匯入文字內容/i });
      await act(async () => {
        fireEvent.click(importBtn);
      });

      expect(mockConfirm).not.toHaveBeenCalled();
      expect(mockRepository.saveQuestions).not.toHaveBeenCalled();
      expect(onUpdateQuestions).not.toHaveBeenCalled();
      expect(mockToast.error).toHaveBeenCalledWith('資料必須是 JSON 陣列 (Array)');
    });

    it('全無效題目資料陣列應阻斷匯入並顯示無有效題目 Toast', async () => {
      await renderComponent();

      const pasteTabBtn = screen.getByRole('button', { name: /貼上文字/i });
      fireEvent.click(pasteTabBtn);

      const textarea = screen.getByPlaceholderText(/在此貼上 AI 生成的 JSON 代碼/i);
      const allInvalidJson = JSON.stringify([
        { id: '', question: '' },
        { id: 'q-bad-ans', question: '答案不在選項內', options: ['A', 'B'], answer: 'C' },
        { id: 'q-no-opt', question: '無選項', options: [] },
      ]);

      fireEvent.change(textarea, { target: { value: allInvalidJson } });

      const importBtn = screen.getByRole('button', { name: /匯入文字內容/i });
      await act(async () => {
        fireEvent.click(importBtn);
      });

      expect(mockConfirm).not.toHaveBeenCalled();
      expect(mockRepository.saveQuestions).not.toHaveBeenCalled();
      expect(onUpdateQuestions).not.toHaveBeenCalled();
      expect(mockToast.error).toHaveBeenCalledWith('無有效題目可供匯入');
    });

    it('部分有效題目應自動略過不符題目，並於 Toast 提示略過題數', async () => {
      await renderComponent();

      const pasteTabBtn = screen.getByRole('button', { name: /貼上文字/i });
      fireEvent.click(pasteTabBtn);

      const textarea = screen.getByPlaceholderText(/在此貼上 AI 生成的 JSON 代碼/i);
      const mixedJson = JSON.stringify([
        {
          id: 'q-valid-1',
          question: '合法題目 1',
          options: ['A', 'B'],
          answer: 'A',
          type: 'single',
        },
        {
          id: 'q-invalid-broken',
          question: '死鎖無效題目',
          options: ['A', 'B'],
          answer: 'Z', // 不在 options 內
        },
        {
          id: 'q-valid-2',
          question: '合法題目 2',
          options: ['C', 'D'],
          answer: 'C',
          type: 'single',
        },
      ]);

      fireEvent.change(textarea, { target: { value: mixedJson } });

      const importBtn = screen.getByRole('button', { name: /匯入文字內容/i });
      await act(async () => {
        fireEvent.click(importBtn);
      });

      // 驗證進入確認視窗（共 2 題合法新題）
      expect(mockConfirm).toHaveBeenCalledTimes(1);
      expect(mockRepository.saveQuestions).toHaveBeenCalledTimes(1);
      expect(onUpdateQuestions).toHaveBeenCalledTimes(1);

      // 驗證 Toast 包含成功題數與略過題數
      expect(mockToast.success).toHaveBeenCalledWith(
        '成功匯入 2 題！（已自動略過 1 題格式不符題目）'
      );
    });

    it('使用者在確認對話框取消時不執行儲存或更新', async () => {
      mockConfirm.mockResolvedValueOnce(false);
      await renderComponent();

      const pasteTabBtn = screen.getByRole('button', { name: /貼上文字/i });
      fireEvent.click(pasteTabBtn);

      const textarea = screen.getByPlaceholderText(/在此貼上 AI 生成的 JSON 代碼/i);
      const validJson = JSON.stringify([
        {
          id: 'q-cancel',
          question: '被取消的題目',
          options: ['A', 'B'],
          answer: 'A',
          type: 'single',
        },
      ]);

      fireEvent.change(textarea, { target: { value: validJson } });

      const importBtn = screen.getByRole('button', { name: /匯入文字內容/i });
      await act(async () => {
        fireEvent.click(importBtn);
      });

      expect(mockConfirm).toHaveBeenCalledTimes(1);
      expect(mockRepository.saveQuestions).not.toHaveBeenCalled();
      expect(onUpdateQuestions).not.toHaveBeenCalled();
    });

    it('未選中題庫時應提示請先選擇題庫', async () => {
      await renderComponent({ currentBankId: null });

      // 當 currentBankId 為 null 時，右側區域會提示「請先在左側選擇一個題庫」
      expect(screen.getByText(/請先在左側選擇一個題庫/i)).toBeDefined();
    });
  });

  describe('Task 3.2: JSON Export with Blob URL, 1000ms Revoke & Debounce', () => {
    let mockCreateObjectURL: ReturnType<typeof vi.spyOn>;
    let mockRevokeObjectURL: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      vi.useFakeTimers();
      mockCreateObjectURL = vi.spyOn(URL, 'createObjectURL').mockImplementation((_blob: Blob | MediaSource) => `blob:http://localhost/${Math.random()}`);
      mockRevokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    });

    afterEach(() => {
      mockCreateObjectURL.mockRestore();
      mockRevokeObjectURL.mockRestore();
      vi.useRealTimers();
    });

    it('匯出時應使用 application/json;charset=utf-8 Blob 建立 URL 並下載', async () => {
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

      await renderComponent();

      const exportBtn = screen.getByRole('button', { name: /下載 \.JSON/i });
      await act(async () => {
        fireEvent.click(exportBtn);
      });

      // 驗證 createObjectURL 被呼叫
      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
      const passedBlob = mockCreateObjectURL.mock.calls[0][0] as Blob;
      expect(passedBlob).toBeInstanceOf(Blob);
      expect(passedBlob.type).toBe('application/json;charset=utf-8');

      // 驗證 anchor click
      expect(clickSpy).toHaveBeenCalledTimes(1);

      clickSpy.mockRestore();
    });

    it('匯出後應於 1000ms 延遲後恰好調用 URL.revokeObjectURL 釋放記憶體', async () => {
      await renderComponent();

      const exportBtn = screen.getByRole('button', { name: /下載 \.JSON/i });
      await act(async () => {
        fireEvent.click(exportBtn);
      });

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
      const generatedUrl = mockCreateObjectURL.mock.results[0].value;

      // 0ms 時尚未 revoke
      expect(mockRevokeObjectURL).not.toHaveBeenCalled();

      // 500ms 時尚未 revoke
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(mockRevokeObjectURL).not.toHaveBeenCalled();

      // 達到 1000ms 時精準執行 revoke
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(mockRevokeObjectURL).toHaveBeenCalledTimes(1);
      expect(mockRevokeObjectURL).toHaveBeenCalledWith(generatedUrl);
    });

    it('匯出按鈕在 1000ms 內應處於 disabled 狀態以防止連擊重複生成 URL', async () => {
      await renderComponent();

      const exportBtn = screen.getByRole('button', { name: /下載 \.JSON/i }) as HTMLButtonElement;

      // 初始狀態為 enabled
      expect(exportBtn.disabled).toBe(false);

      // 點擊第一次
      await act(async () => {
        fireEvent.click(exportBtn);
      });

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
      // 點擊後按鈕為 disabled
      expect(exportBtn.disabled).toBe(true);

      // 嘗試在 500ms 時連點
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(exportBtn.disabled).toBe(true);

      await act(async () => {
        fireEvent.click(exportBtn);
      });
      // 依然只呼叫 1 次，防抖生效
      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);

      // 1000ms 後恢復啟用
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(exportBtn.disabled).toBe(false);

      // 再次點擊應可正常匯出
      await act(async () => {
        fireEvent.click(exportBtn);
      });
      expect(mockCreateObjectURL).toHaveBeenCalledTimes(2);
    });

    it('匯出遇到例外時應優雅降級顯示錯誤 Toast 且不崩潰白屏', async () => {
      mockCreateObjectURL.mockImplementationOnce(() => {
        throw new Error('瀏覽器不支援 Blob URL 建立');
      });

      await renderComponent();

      const exportBtn = screen.getByRole('button', { name: /下載 \.JSON/i }) as HTMLButtonElement;
      await act(async () => {
        fireEvent.click(exportBtn);
      });

      expect(mockToast.error).toHaveBeenCalledWith('瀏覽器不支援 Blob URL 建立');

      // 1000ms 後按鈕應重置狀態
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(exportBtn.disabled).toBe(false);
    });

    it('元件卸載時應主動清除未完成的匯出定時器 (unmount cleanup)', async () => {
      const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
      const { unmount } = await renderComponent();

      const exportBtn = screen.getByRole('button', { name: /下載 \.JSON/i });
      await act(async () => {
        fireEvent.click(exportBtn);
      });

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);

      // 於定時器到期前卸載元件
      unmount();

      // 驗證 clearTimeout 被呼叫以清除註冊之定時器
      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });
  });
});
