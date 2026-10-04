import React from 'react';
import { render, renderHook, act, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { STORAGE_KEYS } from '../../services/storage';
import type { BankMetadata, MistakeLog, Question } from '../../types';
import type { ChunkedPracticeSession, PracticeChunk, RecentMistakeSession } from '../../types/battleTypes';
import type { GraphNodeData } from '../../types/graphTypes';
import type { IStorageRepository } from '../../services/repository';

const howlConstructorMock = vi.fn();
const howlPlayMock = vi.fn(() => 101);
const howlStopMock = vi.fn();

vi.mock('howler', () => {
  return {
    Howl: class {
      options: Record<string, unknown>;
      constructor(options: Record<string, unknown>) {
        this.options = options;
        howlConstructorMock(options);
      }
      play = howlPlayMock;
      stop = howlStopMock;
      playing = vi.fn(() => false);
    },
  };
});

const supabaseMocks = vi.hoisted(() => ({
  from: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock('../../services/supabase', () => ({
  supabase: {
    from: supabaseMocks.from,
    auth: {
      getUser: supabaseMocks.getUser,
    },
  },
}));

vi.mock('../../hooks/useAchievements', () => ({
  useAchievements: () => ({
    unlockedIds: [],
    loading: false,
    unlockAchievement: vi.fn(),
    refresh: vi.fn(),
  }),
}));

import {
  saveCloudQuestions,
  retryCleanupDirtyBanks,
  runWithSyncLock,
  mergeChunkedPracticeSessions,
} from '../../services/cloudStorage';
import {
  clearUserDataOnSignOut,
  getUserSettings,
  saveQuestions,
  getQuestions,
  saveQuizSession,
} from '../../services/storage';
import { getLocalDateString } from '../../utils/dateUtils';
import { useQuizEngine } from '../../hooks/useQuizEngine';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useSoundEffects } from '../../hooks/useSoundEffects';
import { NodeEditPanel } from '../../components/KnowledgeGraph/NodeEditPanel';
import { recordLocalStudySession, getLocalStudyStats } from '../../services/analytics';
import { DEFAULT_SETTINGS, BattlePresentationEvent } from '../../types/battleTypes';
import { QuizCard } from '../../components/QuizCard';
import { isQuestion, parseQuestions } from '../../utils/typeGuards';

const createRepository = (questions: Question[]) => {
  const mistakeLog: MistakeLog = {};
  const saveSpacedRepetitionMock = vi.fn().mockResolvedValue(undefined);
  const logMistakeMock = vi.fn();
  const removeMistakeMock = vi.fn();

  const repo: IStorageRepository = {
    getBanks: async () => [],
    createBank: async () => ({ id: 'bank-1', name: 'B1', createdAt: 0, questionCount: 0 }),
    deleteBank: async () => {},
    updateBankFolder: async () => {},
    syncLocalToCloud: async () => ({ successIds: [], failed: [] }),
    getQuestions: async () => questions,
    saveQuestions: async () => {},
    deleteQuestionArtifacts: async () => {},
    getMistakeLog: () => mistakeLog,
    logMistake: logMistakeMock,
    removeMistake: removeMistakeMock,
    clearMistakes: () => {},
    getSpacedRepetition: async () => [],
    saveSpacedRepetitionItem: saveSpacedRepetitionMock,
    getSpacedRepetitionItem: () => null,
    clearSpacedRepetition: () => {},
    recordStudySession: async () => {},
    getStudyStats: async () => ({ studyDays: 0, totalQuestions: 0, totalCorrect: 0, accuracyRate: 0, totalDurationSeconds: 0 }),
    getDailyStats: async () => [],
    getAchievements: async () => [],
    unlockAchievement: async () => {},
    getStreak: async () => ({ currentStreak: 0, longestStreak: 0, lastStudyDate: null }),
    updateStreak: async () => {},
    getRecentMistakeSessions: (): RecentMistakeSession[] => [],
    addRecentMistakeSession: () => {},
    clearRecentMistakeSession: () => {},
    clearAllRecentMistakes: () => {},
    getPracticeSessions: async (): Promise<ChunkedPracticeSession[]> => [],
    savePracticeSession: async () => {},
    deletePracticeSession: async () => {},
    abandonPracticeSession: async () => {},
  };

  return { repo, saveSpacedRepetitionMock, logMistakeMock, removeMistakeMock };
};

describe('Adversarial Bypass & Chaos Engineering Gate (Challenger)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // =========================================================================
  // 對抗 1: 跨庫 UUID 注入攻擊 (Cross-Bank UUID Injection Attack)
  // =========================================================================
  describe('Adversarial 1: Cross-Bank UUID Injection Attack', () => {
    it('enforces .eq("bank_id", bankId) depth-in-defense so that victim bank questions are never touched', async () => {
      const victimBankId = 'bank-victim-0001';
      const attackerBankId = 'bank-attacker-9999';
      const victimQuestionId = '11111111-1111-4111-8111-111111111111';
      const attackerQuestionId = '22222222-2222-4222-8222-222222222222';
      const orphanQuestionId = '33333333-3333-4333-8333-333333333333';

      let mockDatabaseQuestions = [
        { id: victimQuestionId, bank_id: victimBankId, question_text: 'Victim Private Question' },
        { id: attackerQuestionId, bank_id: attackerBankId, question_text: 'Attacker Valid Question' },
        { id: orphanQuestionId, bank_id: attackerBankId, question_text: 'Attacker Old Question' },
      ];

      const upsertMock = vi.fn().mockResolvedValue({ error: null });

      // Attacker bank cloud returns attacker question, orphan question, and attempts to return victim UUID as orphan
      const selectEqMock = vi.fn().mockImplementation((col: string, val: string) => {
        expect(col).toBe('bank_id');
        expect(val).toBe(attackerBankId);
        return Promise.resolve({
          data: [
            { id: attackerQuestionId },
            { id: orphanQuestionId },
            { id: victimQuestionId }, // Injected cross-bank UUID in query response
          ],
          error: null,
        });
      });
      const selectMock = vi.fn().mockReturnValue({ eq: selectEqMock });

      const deleteEqMock = vi.fn().mockImplementation((col: string, val: string) => {
        expect(col).toBe('bank_id');
        // Critical: deletion MUST be constrained to attacker bank
        expect(val).toBe(attackerBankId);

        // Simulate database executing DELETE ... WHERE id IN (...) AND bank_id = val
        mockDatabaseQuestions = mockDatabaseQuestions.filter((row) => {
          return !(row.id === orphanQuestionId && row.bank_id === val);
        });

        return Promise.resolve({ error: null });
      });

      const deleteInMock = vi.fn().mockReturnValue({ eq: deleteEqMock });
      const deleteMock = vi.fn().mockReturnValue({ in: deleteInMock });

      supabaseMocks.from.mockReturnValue({
        upsert: upsertMock,
        select: selectMock,
        delete: deleteMock,
      });

      const attackerQuestions: Question[] = [
        {
          id: attackerQuestionId,
          question: 'Attacker Valid Question',
          options: ['A', 'B'],
          answer: 'A',
          type: 'single',
        },
      ];

      await saveCloudQuestions(attackerBankId, attackerQuestions);

      // Verify that delete chained .eq('bank_id', attackerBankId)
      expect(deleteInMock).toHaveBeenCalledWith('id', expect.arrayContaining([victimQuestionId, orphanQuestionId]));
      expect(deleteEqMock).toHaveBeenCalledWith('bank_id', attackerBankId);

      // Verify depth-in-defense: Victim question was NOT deleted from DB!
      const victimStillExists = mockDatabaseQuestions.some(
        (row) => row.id === victimQuestionId && row.bank_id === victimBankId
      );
      expect(victimStillExists).toBe(true);

      // Attacker orphan was deleted
      const orphanStillExists = mockDatabaseQuestions.some((row) => row.id === orphanQuestionId);
      expect(orphanStillExists).toBe(false);
    });
  });

  // =========================================================================
  // 對抗 2: 快取驅逐滅頂混沌 (Cache Eviction Total Destruction Chaos)
  // =========================================================================
  describe('Adversarial 2: Cache Eviction & Total Destruction Chaos (D7-001)', () => {
    it('safely handles null cache and malformed JSON without deleting cloud questions and syncs remaining banks', async () => {
      const nullCacheBankId = 'bank-null-evicted';
      const malformedBankId = 'bank-malformed-json';
      const validBankId = 'bank-valid';

      localStorage.setItem(
        'mindspark_dirty_banks',
        JSON.stringify([nullCacheBankId, malformedBankId, validBankId])
      );

      // nullCacheBankId has NO key in localStorage (simulating browser storage quota eviction)
      // malformedBankId has corrupt JSON
      localStorage.setItem(STORAGE_KEYS.BANK_PREFIX + malformedBankId, '{malformed json object, missing close');

      // validBankId has legitimate question data
      const validQuestionId = '44444444-4444-4444-8444-444444444444';
      localStorage.setItem(
        STORAGE_KEYS.BANK_PREFIX + validBankId,
        JSON.stringify([
          {
            id: validQuestionId,
            question: 'Valid Question',
            options: ['A', 'B'],
            answer: 'A',
            type: 'single',
          },
        ])
      );

      const upsertMock = vi.fn().mockResolvedValue({ error: null });
      const selectEqMock = vi.fn().mockImplementation((col: string, val: string) => {
        expect(val).toBe(validBankId);
        return Promise.resolve({
          data: [{ id: validQuestionId }],
          error: null,
        });
      });
      const selectMock = vi.fn().mockReturnValue({ eq: selectEqMock });
      const deleteEqMock = vi.fn().mockResolvedValue({ error: null });
      const deleteInMock = vi.fn().mockReturnValue({ eq: deleteEqMock });
      const deleteMock = vi.fn().mockImplementation(() => {
        return {
          eq: vi.fn().mockImplementation((col: string, val: string) => {
            // Absolute check: delete must NEVER be called for the null or malformed bank
            if (val === nullCacheBankId || val === malformedBankId) {
              throw new Error(`CRITICAL SECURITY FAILURE: Attempted delete on bank ${val}`);
            }
            return Promise.resolve({ error: null });
          }),
          in: deleteInMock,
        };
      });

      supabaseMocks.from.mockReturnValue({
        upsert: upsertMock,
        select: selectMock,
        delete: deleteMock,
      });

      // Execute retry cleanup - must not throw unhandled error
      await expect(retryCleanupDirtyBanks()).resolves.not.toThrow();

      // Verify that upsert was executed ONLY for the valid bank
      expect(upsertMock).toHaveBeenCalledTimes(1);
      const upsertPayload = upsertMock.mock.calls[0]?.[0];
      expect(upsertPayload[0].bank_id).toBe(validBankId);

      // Verify final dirty banks state:
      // - nullCacheBankId was pruned from dirty list (cache missing protection D7-001)
      // - validBankId was completed and removed
      // - malformedBankId remains in dirty list for subsequent retry
      const remainingDirty = JSON.parse(localStorage.getItem('mindspark_dirty_banks') || '[]');
      expect(remainingDirty).toEqual([malformedBankId]);
    });
  });

  // =========================================================================
  // 對抗 3: 極端高頻連擊 (Extreme High-Frequency Spamming Macro Attack)
  // =========================================================================
  describe('Adversarial 3: Extreme High-Frequency Spamming Macro Attack (H1 / D4-001)', () => {
    it('strictly processes exactly 1 answer and blocks the remaining 99 rapid macro calls', async () => {
      const banks: BankMetadata[] = [
        { id: 'bank-1', name: 'Bank 1', createdAt: 0, questionCount: 2 },
      ];
      const questionSet: Question[] = [
        { id: 'q-1', question: 'Q1', options: ['A', 'B'], answer: 'A', type: 'single' },
        { id: 'q-2', question: 'Q2', options: ['C', 'D'], answer: 'C', type: 'single' },
      ];

      const { repo, saveSpacedRepetitionMock, logMistakeMock } = createRepository(questionSet);

      const { result } = renderHook(() =>
        useQuizEngine({
          banks,
          selectedQuizBankIds: ['bank-1'],
          repository: repo,
          setMistakeLog: vi.fn(),
          onViewChange: vi.fn(),
          loading: false,
          toast: { warning: vi.fn() },
        })
      );

      await act(async () => {
        await result.current.startQuiz(2, 'retry_session', ['q-1', 'q-2'], ['bank-1']);
      });

      expect(result.current.quizState.currentQuestionIndex).toBe(0);

      // 100 consecutive rapid calls (1 valid + 99 spam)
      act(() => {
        result.current.handleAnswer(true, 'A');
        for (let i = 0; i < 99; i++) {
          result.current.handleAnswer(false, 'B'); // Try to corrupt score and log mistakes
        }
      });

      // Score must strictly be 1 (only the first call executed)
      expect(result.current.quizState.score).toBe(1);
      // No mistake recorded because first answer was correct and next 99 were blocked
      expect(result.current.quizState.wrongQuestionIds).toHaveLength(0);
      // SM-2 was saved exactly once
      expect(saveSpacedRepetitionMock).toHaveBeenCalledTimes(1);
      // Mistake logger was never triggered
      expect(logMistakeMock).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 對抗 4: 多分頁並發競態 (Multi-Tab Concurrent Fallback Lock Race)
  // =========================================================================
  describe('Adversarial 4: Multi-Tab Concurrent Fallback Lock Race (H3 TOCTOU)', () => {
    const originalLocks = Object.getOwnPropertyDescriptor(navigator, 'locks');

    beforeEach(() => {
      Object.defineProperty(navigator, 'locks', {
        configurable: true,
        value: undefined,
      });
    });

    afterEach(() => {
      if (originalLocks) {
        Object.defineProperty(navigator, 'locks', originalLocks);
      } else {
        Reflect.deleteProperty(navigator, 'locks');
      }
    });

    it('guarantees at most 1 out of 5 concurrent tabs acquires the fallback lock at the exact same millisecond', async () => {
      const lockName = 'adversarial_multi_tab_lock';
      const fallbackKey = 'adversarial_fallback_key';

      let activeExecutionCount = 0;
      let maxConcurrentExecutions = 0;
      let totalExecuted = 0;

      const simulateTab = async (tabId: number) => {
        return runWithSyncLock(
          async () => {
            activeExecutionCount++;
            maxConcurrentExecutions = Math.max(maxConcurrentExecutions, activeExecutionCount);
            totalExecuted++;
            // Simulate work
            await new Promise((r) => setTimeout(r, 20));
            activeExecutionCount--;
            return `tab-${tabId}-done`;
          },
          lockName,
          fallbackKey
        );
      };

      // 5 tabs start concurrently in the exact same tick
      const results = await Promise.allSettled([
        simulateTab(1),
        simulateTab(2),
        simulateTab(3),
        simulateTab(4),
        simulateTab(5),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      // Exactly 1 tab acquires the lock; all other 4 tabs are rejected
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(4);
      expect(totalExecuted).toBe(1);
      expect(maxConcurrentExecutions).toBe(1);

      // Rejections must be due to sync lock defense
      for (const rej of rejected) {
        if (rej.status === 'rejected') {
          expect(rej.reason.message).toMatch(/Sync lock held/);
        }
      }
    });
  });

  // =========================================================================
  // 對抗 5: 異常數值與存量相容 Session 合併 (Corrupt Values & Legacy Merge)
  // =========================================================================
  describe('Adversarial 5: Corrupt Values & Legacy Compatible Session Merge (D7-002)', () => {
    it('safely merges sessions with negative scores, NaN, and invalid timestamps without crashing or losing valid progress', () => {
      const corruptLocalChunk: PracticeChunk = {
        index: 0,
        questionIds: ['q-1', 'q-2'],
        status: 'completed',
        score: NaN as unknown as number,
        totalQuestions: 2,
        wrongQuestionIds: [],
        startedAt: -99999,
        completedAt: NaN as unknown as number,
      };

      const corruptLocalSession: ChunkedPracticeSession = {
        id: 'corrupt-session-1',
        userId: 'user-1',
        bankIds: ['bank-1'],
        bankNames: ['Bank 1'],
        bankQuestionMap: { 'bank-1': ['q-1', 'q-2'] },
        chunkSize: 2,
        questionIds: ['q-1', 'q-2'],
        chunks: [corruptLocalChunk],
        status: 'completed',
        createdAt: NaN as unknown as number,
        updatedAt: -500,
        dirty: false,
        retryCount: 0,
      };

      const validCloudChunk: PracticeChunk = {
        index: 0,
        questionIds: ['q-1', 'q-2'],
        status: 'completed',
        score: 2,
        totalQuestions: 2,
        wrongQuestionIds: [],
        startedAt: 1726000000000,
        completedAt: 1726000050000,
      };

      const validCloudSession: ChunkedPracticeSession = {
        id: 'corrupt-session-1',
        userId: 'user-1',
        bankIds: ['bank-1'],
        bankNames: ['Bank 1'],
        bankQuestionMap: { 'bank-1': ['q-1', 'q-2'] },
        chunkSize: 2,
        questionIds: ['q-1', 'q-2'],
        chunks: [validCloudChunk],
        status: 'completed',
        createdAt: 1726000000000,
        updatedAt: 1726000050000,
        dirty: false,
        retryCount: 0,
      };

      // Must execute cleanly without throwing
      const merged = mergeChunkedPracticeSessions(corruptLocalSession, validCloudSession);

      expect(merged.status).toBe('completed');
      expect(merged.chunks).toHaveLength(1);

      const mergedChunk = merged.chunks[0];
      expect(mergedChunk.status).toBe('completed');
      // Must preserve the valid score 2, NOT corrupted to NaN or negative
      expect(mergedChunk.score).toBe(2);
      expect(Number.isNaN(mergedChunk.score)).toBe(false);

      // Must preserve the valid completed timestamp
      expect(mergedChunk.completedAt).toBe(1726000050000);
      expect(Number.isNaN(mergedChunk.completedAt)).toBe(false);

      // Session timestamps must be valid positive numbers
      expect(merged.createdAt).toBeGreaterThan(0);
      expect(Number.isNaN(merged.createdAt)).toBe(false);
      expect(merged.updatedAt).toBeGreaterThan(0);
      expect(Number.isNaN(merged.updatedAt)).toBe(false);
    });
  });

  // =========================================================================
  // 對抗 6: 分頁瞬間關閉 (beforeunload Flush)
  // =========================================================================
  describe('Adversarial 6: Immediate Tab Close beforeunload Flush (D10-001)', () => {
    it('synchronously flushes un-debounced pending state on window beforeunload event', () => {
      const initialData: GraphNodeData = {
        title: 'Initial Unmodified Title',
        definition: 'Concept Definition',
        details: 'Concept Details',
        color: '#3b82f6',
        fontSize: 'md',
      };

      const onUpdate = vi.fn();
      const onUpdateType = vi.fn();
      const onClose = vi.fn();

      const { getByPlaceholderText } = render(
        React.createElement(NodeEditPanel, {
          nodeId: 'node-adversarial-close',
          data: initialData,
          nodeType: 'concept',
          onUpdate,
          onUpdateType,
          onClose,
        })
      );

      const input = getByPlaceholderText('概念名稱');
      fireEvent.change(input, { target: { value: 'Critical Unsaved Note' } });

      // Debounce timer (300ms) has NOT fired yet
      expect(onUpdate).not.toHaveBeenCalled();

      // Immediate browser close event
      window.dispatchEvent(new Event('beforeunload'));

      // Must synchronously flush beforeunload
      expect(onUpdate).toHaveBeenCalledTimes(1);
      expect(onUpdate).toHaveBeenCalledWith(
        'node-adversarial-close',
        expect.objectContaining({ title: 'Critical Unsaved Note' }),
        { immediateSave: true }
      );
    });
  });

  // =========================================================================
  // 對抗 7: 登出金鑰防洩與極端網路中斷 (Storage Nuke Offline Signout Bypass)
  // =========================================================================
  describe('Adversarial 7: Storage Nuke Offline Signout Bypass', () => {
    it('completely clears sensitive sessionStorage keys and non-whitelist localStorage while keeping theme and audio', () => {
      localStorage.setItem(STORAGE_KEYS.THEME, 'emerald');
      localStorage.setItem(STORAGE_KEYS.BGM_ENABLED, 'true');
      localStorage.setItem(STORAGE_KEYS.SFX_ENABLED, 'true');
      localStorage.setItem(STORAGE_KEYS.MISTAKES, JSON.stringify({ 'q-victim': 1 }));
      localStorage.setItem('mindspark_bank_secret-123', JSON.stringify([{ id: 1 }]));
      sessionStorage.setItem(STORAGE_KEYS.AI_CONFIG, JSON.stringify({ apiKey: 'sk-adversarial-secret-leak' }));

      clearUserDataOnSignOut();

      expect(localStorage.getItem(STORAGE_KEYS.THEME)).toBe('emerald');
      expect(localStorage.getItem(STORAGE_KEYS.BGM_ENABLED)).toBe('true');
      expect(localStorage.getItem(STORAGE_KEYS.SFX_ENABLED)).toBe('true');
      expect(localStorage.getItem(STORAGE_KEYS.MISTAKES)).toBeNull();
      expect(localStorage.getItem('mindspark_bank_secret-123')).toBeNull();
      expect(sessionStorage.getItem(STORAGE_KEYS.AI_CONFIG)).toBeNull();
    });
  });

  // =========================================================================
  // 對抗 8: SM-2 到期題急迫度排序防洗牌穿透 (Spaced Due Urgency Order Preservation)
  // =========================================================================
  describe('Adversarial 8: Spaced Due Urgency Order Preservation', () => {
    it('repeatedly maintains strict ascending nextReviewDate order across 10 invocations without random shuffle disruption', async () => {
      const now = Date.now();
      const banks: BankMetadata[] = [
        { id: 'b-1', name: 'Bank 1', createdAt: 0, questionCount: 4 },
      ];
      const questions: Question[] = [
        { id: 'q-a', question: 'A', options: ['1'], answer: '1', type: 'single' },
        { id: 'q-b', question: 'B', options: ['1'], answer: '1', type: 'single' },
        { id: 'q-c', question: 'C', options: ['1'], answer: '1', type: 'single' },
        { id: 'q-d', question: 'D', options: ['1'], answer: '1', type: 'single' },
      ];

      const spacedRepetition = {
        'q-a': { questionId: 'q-a', repetitions: 1, interval: 1, easinessFactor: 2.5, nextReviewDate: now - 1000 },
        'q-b': { questionId: 'q-b', repetitions: 1, interval: 1, easinessFactor: 2.5, nextReviewDate: now - 4000 }, // Most overdue
        'q-c': { questionId: 'q-c', repetitions: 1, interval: 1, easinessFactor: 2.5, nextReviewDate: now - 2000 },
        'q-d': { questionId: 'q-d', repetitions: 1, interval: 1, easinessFactor: 2.5, nextReviewDate: now - 3000 },
      };

      const expectedOrder = ['q-b', 'q-d', 'q-c', 'q-a'];

      for (let run = 0; run < 10; run++) {
        const repo: IStorageRepository = {
          ...createRepository(questions).repo,
          getBanks: async () => banks,
          getQuestions: async () => questions,
          getSpacedRepetition: async () => spacedRepetition,
        };

        const { result } = renderHook(() =>
          useQuizEngine({
            banks,
            selectedQuizBankIds: ['b-1'],
            repository: repo,
            setMistakeLog: vi.fn(),
            onViewChange: vi.fn(),
            loading: false,
            toast: { warning: vi.fn() },
          })
        );

        await act(async () => {
          await result.current.startQuiz(undefined, 'spaced_due');
        });

        const actualOrder = result.current.quizState.activeQuestions.map((q) => q.id);
        expect(actualOrder).toEqual(expectedOrder);
      }
    });
  });

  // =========================================================================
  // 對抗 9: 快捷鍵修飾鍵與 IME 複合按鍵防劫持 (Modifier & IME Shortcut Bypass)
  // =========================================================================
  describe('Adversarial 9: Modifier & IME Shortcut Bypass', () => {
    it('blocks all combinations of Ctrl, Alt, Meta, isComposing, and keyCode 229 from hijacking hotkeys', () => {
      const onSelectOption = vi.fn();
      const onSubmitOrNext = vi.fn();
      const onToggleHint = vi.fn();
      const onExit = vi.fn();

      renderHook(() => useKeyboardShortcuts({
        onSelectOption,
        onSubmitOrNext,
        onToggleHint,
        onExit
      }));

      // Ctrl + 1
      act(() => {
        document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '1', ctrlKey: true, bubbles: true }));
      });
      // Alt + Enter
      act(() => {
        document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', altKey: true, bubbles: true }));
      });
      // Meta + Escape
      act(() => {
        document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', metaKey: true, bubbles: true }));
      });
      // IME composition (isComposing = true)
      act(() => {
        document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '1', isComposing: true, bubbles: true }));
      });
      // IME keyCode 229
      const imeEvent = new KeyboardEvent('keydown', { key: '1', bubbles: true });
      Object.defineProperty(imeEvent, 'keyCode', { value: 229 });
      act(() => {
        document.body.dispatchEvent(imeEvent);
      });

      expect(onSelectOption).not.toHaveBeenCalled();
      expect(onSubmitOrNext).not.toHaveBeenCalled();
      expect(onToggleHint).not.toHaveBeenCalled();
      expect(onExit).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 對抗 10: 無效日期與邊界容錯 (Invalid Date Fallback)
  // =========================================================================
  describe('Adversarial 10: Invalid Date Fallback', () => {
    it('recovers gracefully from NaN and invalid dates without throwing RangeError', () => {
      expect(() => getLocalDateString(new Date(NaN))).not.toThrow();
      const todayFallback = new Date().toLocaleDateString('sv-SE');
      expect(getLocalDateString(new Date(NaN))).toBe(todayFallback);
      expect(getLocalDateString(new Date('invalid-date'))).toBe(todayFallback);
    });
  });

  // =========================================================================
  // 對抗 11: 負數、NaN/Infinity 異常持續時間與分數防禦 (Adversarial Duration & Score Boundary)
  // =========================================================================
  describe('Adversarial 11: Negative duration, NaN/Infinity in duration and score', () => {
    it('sanitizes NaN, Infinity, negative duration and score without throwing or corrupting stats', () => {
      recordLocalStudySession(NaN as unknown as number, -5, -300, 'quiz');
      recordLocalStudySession(Infinity as unknown as number, Infinity as unknown as number, Infinity as unknown as number, 'focus');
      recordLocalStudySession(5, 5, 120, 'quiz');

      const stats = getLocalStudyStats();
      expect(stats.totalQuestions).toBe(5);
      expect(stats.totalCorrect).toBe(5);
      expect(stats.totalDurationSeconds).toBe(120);
      expect(stats.accuracyRate).toBe(100);
      expect(Number.isFinite(stats.accuracyRate)).toBe(true);
      expect(Number.isFinite(stats.totalDurationSeconds)).toBe(true);
    });
  });

  // =========================================================================
  // 對抗 12: 0 題 Session 與 FocusTimer vs Quiz 誤判防禦 (0 Questions FocusTimer vs Quiz Misidentification)
  // =========================================================================
  describe('Adversarial 12: 0 Questions Session with FocusTimer vs Quiz Misidentification', () => {
    it('ignores 0-question short quiz abandons (<5s) but strictly preserves 0-question focus timer sessions', () => {
      // Short 0-question quiz session (<5s) should be ignored as accidental open/close
      recordLocalStudySession(0, 0, 2, 'quiz');
      let stats = getLocalStudyStats();
      expect(stats.totalDurationSeconds).toBe(0);
      expect(stats.studyDays).toBe(0);

      // 0-question focus timer session (1500s) must be recorded and never misidentified as quiz abandon
      recordLocalStudySession(0, 0, 1500, 'focus');
      stats = getLocalStudyStats();
      expect(stats.totalDurationSeconds).toBe(1500);
      expect(stats.studyDays).toBe(1);
      expect(stats.totalQuestions).toBe(0);
      expect(stats.accuracyRate).toBe(0);
    });
  });

  // =========================================================================
  // 對抗 13: 損毀、空白或惡意注入的 mindspark_settings (Corrupt / Empty Settings)
  // =========================================================================
  describe('Adversarial 13: Corrupt / Empty mindspark_settings in localStorage', () => {
    it('gracefully falls back to DEFAULT_SETTINGS when settings are malformed, null, number, or NaN', () => {
      // Empty string
      localStorage.setItem(STORAGE_KEYS.SETTINGS, '');
      expect(getUserSettings()).toEqual(DEFAULT_SETTINGS);

      // Malformed JSON
      localStorage.setItem(STORAGE_KEYS.SETTINGS, '{not valid json:');
      expect(getUserSettings()).toEqual(DEFAULT_SETTINGS);

      // String "null"
      localStorage.setItem(STORAGE_KEYS.SETTINGS, 'null');
      expect(getUserSettings()).toEqual(DEFAULT_SETTINGS);

      // Number primitive
      localStorage.setItem(STORAGE_KEYS.SETTINGS, '12345');
      expect(getUserSettings()).toEqual(DEFAULT_SETTINGS);

      // Negative or NaN restBreakInterval
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({ restBreakInterval: -100, autoAdvanceOnCorrect: 'invalid' }));
      const fallbackSettings = getUserSettings();
      expect(fallbackSettings.restBreakInterval).toBe(DEFAULT_SETTINGS.restBreakInterval);
      expect(fallbackSettings.autoAdvanceOnCorrect).toBe(false);
    });
  });

  // =========================================================================
  // 對抗 14: QuizCard 高速連擊與防二次提交 (Fast multi-click on QuizCard options and submit)
  // =========================================================================
  describe('Adversarial 14: Fast Multi-Click on QuizCard options and submit button', () => {
    it('blocks rapid double-clicks on options and triggers onAnswer exactly once', () => {
      const onAnswer = vi.fn();
      const onNext = vi.fn();
      const onExit = vi.fn();

      const sampleQuestion: Question = {
        id: 'q-single-click',
        question: 'What is the capital of Taiwan?',
        options: ['Taipei', 'Tokyo', 'Seoul', 'Beijing'],
        answer: 'Taipei',
        type: 'single',
      };

      const { getByText } = render(
        React.createElement(QuizCard, {
          question: sampleQuestion,
          currentIndex: 0,
          totalQuestions: 1,
          onAnswer,
          onNext,
          isLastQuestion: true,
          onExit,
          gameMode: false,
        })
      );

      const optionButton = getByText('Taipei').closest('button') || getByText('Taipei');

      // Rapidly click the option 10 times consecutively
      act(() => {
        for (let i = 0; i < 10; i++) {
          fireEvent.click(optionButton);
        }
      });

      // onAnswer must be called exactly once
      expect(onAnswer).toHaveBeenCalledTimes(1);
      expect(onAnswer).toHaveBeenCalledWith(true, 'Taipei');
    });
  });

  // =========================================================================
  // 對抗 15: 原型鏈污染與損毀 UTF-8 / 多重 BOM 防禦 (Prototype Pollution & Corrupt UTF-8)
  // =========================================================================
  describe('Adversarial 15: Prototype Pollution & Corrupt UTF-8 / Multi-BOM Parsing', () => {
    it('blocks prototype pollution payloads and sanitizes multi-BOM / corrupted strings without polluting Object.prototype', () => {
      const maliciousPayload = JSON.parse(
        '{"__proto__": {"isAdmin": true, "polluted": "yes"}, "id": "q-proto", "question": "Pollution test?", "options": ["A", "B"], "answer": "A"}'
      );

      // Verify Object.prototype is NOT polluted
      expect((({} as Record<string, unknown>)).isAdmin).toBeUndefined();
      expect((({} as Record<string, unknown>)).polluted).toBeUndefined();

      // parseQuestions must process safe fields without polluting prototype
      const result = parseQuestions([maliciousPayload], 'adversarial.proto');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('q-proto');
      expect((({} as Record<string, unknown>)).isAdmin).toBeUndefined();

      // Corrupted UTF-8 & Multi-BOM string handling
      const multiBomString = '\uFEFF\uFEFF\uFEFF[{"id":"q-bom","question":"BOM test","options":["A","B"],"answer":"A"}]';
      // Strip BOM and parse
      const stripped = multiBomString.replace(/^\uFEFF+/, '');
      const parsedBom = parseQuestions(JSON.parse(stripped), 'adversarial.bom');
      expect(parsedBom).toHaveLength(1);
      expect(parsedBom[0].id).toBe('q-bom');

      // Malformed non-array / corrupted binary garbage
      const corruptedGarbage = '\x00\x01\xFF\xFE\xFD';
      expect(parseQuestions(corruptedGarbage, 'adversarial.garbage')).toEqual([]);
      expect(parseQuestions(null, 'adversarial.null')).toEqual([]);
      expect(parseQuestions(undefined, 'adversarial.undefined')).toEqual([]);
      expect(parseQuestions(12345, 'adversarial.number')).toEqual([]);
    });
  });

  // =========================================================================
  // 對抗 16: 非法題庫載荷與死鎖防禦 (Invalid Question Payload & Boundary Penetration)
  // =========================================================================
  describe('Adversarial 16: Invalid Question Payload & Boundary Penetration (NaN, id: 0, subnormal floats, option mismatch)', () => {
    it('strictly validates question schema, preserving valid id: 0 / finite floats while rejecting NaN, Infinity, empty IDs, and answer mismatches', () => {
      // 1. NaN and Infinity IDs
      expect(isQuestion({ id: NaN, question: 'Valid text', options: ['A', 'B'], answer: 'A' })).toBe(false);
      expect(isQuestion({ id: Infinity, question: 'Valid text', options: ['A', 'B'], answer: 'A' })).toBe(false);
      expect(isQuestion({ id: -Infinity, question: 'Valid text', options: ['A', 'B'], answer: 'A' })).toBe(false);

      // 2. id: 0 (valid numeric ID) vs empty string / whitespace
      expect(isQuestion({ id: 0, question: 'Valid text', options: ['A', 'B'], answer: 'A' })).toBe(true);
      expect(isQuestion({ id: '', question: 'Valid text', options: ['A', 'B'], answer: 'A' })).toBe(false);
      expect(isQuestion({ id: '   ', question: 'Valid text', options: ['A', 'B'], answer: 'A' })).toBe(false);
      expect(isQuestion({ id: null, question: 'Valid text', options: ['A', 'B'], answer: 'A' })).toBe(false);

      // 3. Sub-normal float IDs (e.g. Number.MIN_VALUE = 5e-324)
      expect(isQuestion({ id: Number.MIN_VALUE, question: 'Valid text', options: ['A', 'B'], answer: 'A' })).toBe(true);

      // 4. Answer not in options (Deadlock prevention)
      expect(isQuestion({ id: 'q-mismatch-1', question: 'Valid text', options: ['A', 'B'], answer: 'C' })).toBe(false);
      expect(isQuestion({ id: 'q-mismatch-2', question: 'Valid text', options: ['A', 'B'], answer: ['A', 'C'], type: 'multiple' })).toBe(false);
      expect(isQuestion({ id: 'q-mismatch-3', question: 'Valid text', options: ['A', 'B'], answer: [] })).toBe(false);

      // 5. Empty options or options with empty strings
      expect(isQuestion({ id: 'q-opt-empty', question: 'Valid text', options: [], answer: 'A' })).toBe(false);
      expect(isQuestion({ id: 'q-opt-blank', question: 'Valid text', options: ['A', '   '], answer: 'A' })).toBe(false);

      // 6. Blank question text
      expect(isQuestion({ id: 'q-blank-text', question: '   ', options: ['A', 'B'], answer: 'A' })).toBe(false);

      // 7. saveQuestions filtering integrity
      const mixedQuestions = [
        { id: 'q-valid-1', question: 'Valid 1', options: ['A', 'B'], answer: 'A' } as Question,
        { id: NaN as unknown as string, question: 'Invalid NaN', options: ['A'], answer: 'A' } as Question,
        { id: 'q-bad-ans', question: 'Bad Answer', options: ['A', 'B'], answer: 'Z' } as Question,
        { id: 0, question: 'Valid Zero ID', options: ['A', 'B'], answer: 'B' } as unknown as Question,
      ];

      saveQuestions('adversarial-bank', mixedQuestions);
      const saved = getQuestions('adversarial-bank');
      expect(saved).toHaveLength(2);
      expect(saved[0].id).toBe('q-valid-1');
      expect(saved[1].id).toBe(0);
    });
  });

  // =========================================================================
  // 對抗 17: 音效系統高頻連擊、資源缺失與拋錯防禦 (Audio Extreme Rapid-Fire & Error Resilience)
  // =========================================================================
  describe('Adversarial 17: Audio Extreme Rapid-Fire & Howler Error Resilience', () => {
    it('handles 100 rapid battle cue and feedback calls without throwing or crashing when Howler fails', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { result } = renderHook(() => useSoundEffects());

      const sampleBattleEvent: BattlePresentationEvent = {
        eventId: 'evt-adv-1',
        correlationId: 'corr-adv',
        sequence: 1,
        kind: 'hero_attack',
        actorId: 'hero',
        targetId: 'monster',
        phase: 'impact',
        durationProfile: {
          anticipationMs: 50,
          travelMs: 50,
          impactMs: 50,
          settleMs: 50,
          safetyDeadlineMs: 500,
          reducedMotionMs: 0,
        },
        payload: { damage: 20, baseDamage: 20, isCrit: true, multiplier: 1, shieldAbsorbed: 0 },
      };

      // 1. Simulate Howler play throwing WebAudio suspension error
      howlPlayMock.mockImplementationOnce(() => {
        throw new Error('WebAudio AudioContext suspended or audio decode error');
      });

      // Must not throw unhandled exception
      expect(() => {
        act(() => {
          result.current.playBattleCue(sampleBattleEvent);
        });
      }).not.toThrow();

      // 2. Rapid spamming 50 feedback calls & 50 battle cues
      expect(() => {
        act(() => {
          for (let i = 0; i < 50; i++) {
            result.current.playQuizFeedback(i % 2 === 0 ? 'correct' : 'wrong');
            result.current.playBattleCue({
              ...sampleBattleEvent,
              eventId: `evt-adv-${i}`,
            });
          }
        });
      }).not.toThrow();

      warnSpy.mockRestore();
    });
  });

  // =========================================================================
  // 對抗 18: 儲存配額耗盡與無痕模式安全邊界防禦 (Storage Quota & Security Exception Boundary)
  // =========================================================================
  describe('Adversarial 18: Storage Quota & Private Browsing Exception Boundary Resilience', () => {
    it('gracefully degrades without throwing uncaught errors when localStorage.setItem throws QuotaExceededError or SecurityError', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('QuotaExceededError: storage limit reached', 'QuotaExceededError');
      });

      expect(() => {
        saveQuizSession({
          bankIds: ['b-1'],
          questionIds: ['q-1'],
          currentIndex: 0,
          score: 1,
          wrongQuestionIds: [],
          mode: 'random',
          savedAt: Date.now(),
        });
      }).not.toThrow();

      expect(() => {
        recordLocalStudySession(10, 8, 300, 'quiz');
      }).not.toThrow();

      setItemSpy.mockImplementation(() => {
        throw new DOMException('SecurityError: The operation is insecure.', 'SecurityError');
      });

      expect(() => {
        getUserSettings();
      }).not.toThrow();

      setItemSpy.mockRestore();
      warnSpy.mockRestore();
    });
  });
});
