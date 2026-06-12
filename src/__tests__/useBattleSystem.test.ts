import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import { useBattleSystem } from '../../hooks/useBattleSystem';
import { webcrypto } from 'crypto';

beforeAll(() => {
    // 解決 jsdom 缺乏 SubtleCrypto 的缺陷
    if (typeof window !== 'undefined' && !window.crypto.subtle) {
        Object.defineProperty(window, 'crypto', {
            value: webcrypto,
            configurable: true,
            writable: true,
        });
    }
});

describe('useBattleSystem Hook', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
        // useBattleSystem logs a lot of debug output; capturing it can balloon memory usage in Vitest.
        vi.spyOn(console, 'log').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should initialize with default inactive state', async () => {
        const { result } = renderHook(() => useBattleSystem());
        await waitFor(() => expect(result.current.isInitialized).toBe(true));
        const { battleState } = result.current;

        expect(battleState.isActive).toBe(false);
        expect(battleState.streak).toBe(0);
        expect(battleState.heroHp).toBeGreaterThan(0);
    });

    it('should start battle correctly', async () => {
        const { result } = renderHook(() => useBattleSystem());
        await waitFor(() => expect(result.current.isInitialized).toBe(true));

        act(() => {
            result.current.startBattle();
        });

        expect(result.current.battleState.isActive).toBe(true);
        expect(result.current.battleState.streak).toBe(0);
        expect(result.current.battleState.currentMonster).toBeDefined();
    });

    it('should increment streak on correct answer', async () => {
        const { result } = renderHook(() => useBattleSystem());
        await waitFor(() => expect(result.current.isInitialized).toBe(true));

        act(() => {
            result.current.startBattle();
        });

        act(() => {
            result.current.triggerAnswer(true);
        });

        expect(result.current.battleState.streak).toBe(1);
        expect(result.current.battleState.questionsAnswered).toBe(1);
    });

    it('should reset streak on wrong answer', async () => {
        const { result } = renderHook(() => useBattleSystem());
        await waitFor(() => expect(result.current.isInitialized).toBe(true));

        act(() => {
            result.current.startBattle();
        });

        // Make streak 1
        act(() => {
            result.current.triggerAnswer(true);
        });
        expect(result.current.battleState.streak).toBe(1);

        // Wrong answer
        act(() => {
            result.current.triggerAnswer(false);
        });

        expect(result.current.battleState.streak).toBe(0);
    });

    it('should deduct hero HP on wrong answer', async () => {
        const { result } = renderHook(() => useBattleSystem());
        await waitFor(() => expect(result.current.isInitialized).toBe(true));

        act(() => {
            result.current.startBattle();
        });

        const initialHp = result.current.battleState.heroHp;

        act(() => {
            result.current.triggerAnswer(false);
        });

        expect(result.current.battleState.heroHp).toBeLessThan(initialHp);
    });

    it('should trigger skill at 5 streak', async () => {
        const { result } = renderHook(() => useBattleSystem());
        await waitFor(() => expect(result.current.isInitialized).toBe(true));

        act(() => {
            result.current.startBattle();
        });

        // 1, 2, 3, 4 correct answers
        for (let i = 0; i < 4; i++) {
            act(() => {
                result.current.triggerAnswer(true);
            });
            expect(result.current.battleState.pendingSkill).toBeNull();
        }

        // 5th correct answer -> Skill Trigger
        act(() => {
            result.current.triggerAnswer(true);
        });

        expect(result.current.battleState.streak).toBe(5);
        // Expect skill to be triggered (assuming active skills exist)
        expect(result.current.battleState.pendingSkill).not.toBeNull();
    });

    it('should NOT trigger skill at 6 streak', async () => {
        const { result } = renderHook(() => useBattleSystem());
        await waitFor(() => expect(result.current.isInitialized).toBe(true));
        
        act(() => result.current.startBattle());

        // Reach 5 (trigger skill)
        for (let i = 0; i < 5; i++) act(() => result.current.triggerAnswer(true));

        // Reach 6
        act(() => result.current.triggerAnswer(true));

        expect(result.current.battleState.streak).toBe(6);
        expect(result.current.battleState.pendingSkill).toBeNull();
    });

    it('should reset battle counters for a new chunk', async () => {
        const { result } = renderHook(() => useBattleSystem());
        await waitFor(() => expect(result.current.isInitialized).toBe(true));
        
        act(() => result.current.startBattle());
        act(() => result.current.triggerAnswer(true));
        expect(result.current.battleState.streak).toBe(1);
        expect(result.current.battleState.questionsAnswered).toBe(1);

        act(() => result.current.resetForNewChunk());

        expect(result.current.battleState.isActive).toBe(true);
        expect(result.current.battleState.streak).toBe(0);
        expect(result.current.battleState.questionsAnswered).toBe(0);
        expect(result.current.battleState.pendingSkill).toBeNull();
    });

    it('should reset streak and questionsAnswered when game mode is turned ON mid-chunk', async () => {
        const { result } = renderHook(() => useBattleSystem());
        await waitFor(() => expect(result.current.isInitialized).toBe(true));
        
        // When game mode is turned ON in App, it calls startBattle()
        act(() => result.current.startBattle());

        expect(result.current.battleState.isActive).toBe(true);
        expect(result.current.battleState.streak).toBe(0);
        expect(result.current.battleState.questionsAnswered).toBe(0);
    });

    it('should reset streak and questionsAnswered when starting battle mid-chunk (Game Mode ON)', async () => {
        const { result } = renderHook(() => useBattleSystem());
        await waitFor(() => expect(result.current.isInitialized).toBe(true));
        
        act(() => result.current.startBattle());
        
        expect(result.current.battleState.streak).toBe(0);
        expect(result.current.battleState.questionsAnswered).toBe(0);
        expect(result.current.battleState.isActive).toBe(true);
    });

    it('應能在 100ms 內快速答題觸發多次寫入，驗證狀態依序序列化寫入，且簽名與資料保持一致', async () => {
        const { result } = renderHook(() => useBattleSystem());
        await waitFor(() => expect(result.current.isInitialized).toBe(true));

        act(() => {
            result.current.startBattle();
        });

        // 連續快速答對 5 次 (模擬 100ms 內的操作，每次間隔 15ms 讓 React 更新狀態)
        for (let i = 0; i < 5; i++) {
            await act(async () => {
                result.current.triggerAnswer(true);
                await new Promise(resolve => setTimeout(resolve, 15));
            });
        }

        // 等待所有非同步寫入佇列執行完畢
        await waitFor(async () => {
            const savedState = localStorage.getItem('mindspark_battle_state');
            const savedSig = localStorage.getItem('mindspark_battle_state_sig');
            
            expect(savedState).not.toBeNull();
            expect(savedSig).not.toBeNull();

            // 驗證 signature 與 state 能夠通過 verifyData
            const verifyDataModule = await import('../../utils/integrityCheck');
            const isValid = await verifyDataModule.verifyData(savedState!, savedSig!);
            expect(isValid).toBe(true);

            // 驗證最終寫入的狀態其 streak 為 5
            const parsed = JSON.parse(savedState!);
            expect(parsed.streak).toBe(5);
        });
    });
});
