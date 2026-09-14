import React from 'react';
import { render, renderHook, act, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { STORAGE_KEYS } from '../../services/storage';
import type { BankMetadata, MistakeLog, Question } from '../../types';
import type { ChunkedPracticeSession, PracticeChunk, RecentMistakeSession } from '../../types/battleTypes';
import type { GraphNodeData } from '../../types/graphTypes';
import type { IStorageRepository } from '../../services/repository';

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

import {
  saveCloudQuestions,
  retryCleanupDirtyBanks,
  runWithSyncLock,
  mergeChunkedPracticeSessions,
} from '../../services/cloudStorage';
import { useQuizEngine } from '../../hooks/useQuizEngine';
import { NodeEditPanel } from '../../components/KnowledgeGraph/NodeEditPanel';

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
});
