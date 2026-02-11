
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import useBattleSystem from '../../hooks/useBattleSystem';

describe('useBattleSystem Hook', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('should initialize with default inactive state', () => {
        const { result } = renderHook(() => useBattleSystem());
        const { battleState } = result.current;

        expect(battleState.isActive).toBe(false);
        expect(battleState.streak).toBe(0);
        expect(battleState.heroHp).toBeGreaterThan(0);
    });

    it('should start battle correctly', () => {
        const { result } = renderHook(() => useBattleSystem());

        act(() => {
            result.current.startBattle();
        });

        expect(result.current.battleState.isActive).toBe(true);
        expect(result.current.battleState.streak).toBe(0);
        expect(result.current.battleState.currentMonster).toBeDefined();
    });

    it('should increment streak on correct answer', () => {
        const { result } = renderHook(() => useBattleSystem());

        act(() => {
            result.current.startBattle();
        });

        act(() => {
            result.current.triggerAnswer(true);
        });

        expect(result.current.battleState.streak).toBe(1);
        expect(result.current.battleState.questionsAnswered).toBe(1);
    });

    it('should reset streak on wrong answer', () => {
        const { result } = renderHook(() => useBattleSystem());

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

    it('should deduct hero HP on wrong answer', () => {
        const { result } = renderHook(() => useBattleSystem());

        act(() => {
            result.current.startBattle();
        });

        const initialHp = result.current.battleState.heroHp;

        act(() => {
            result.current.triggerAnswer(false);
        });

        expect(result.current.battleState.heroHp).toBeLessThan(initialHp);
    });

    it('should trigger skill at 5 streak', () => {
        const { result } = renderHook(() => useBattleSystem());

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

    it('should NOT trigger skill at 6 streak', () => {
        const { result } = renderHook(() => useBattleSystem());
        act(() => result.current.startBattle());

        // Reach 5 (trigger skill)
        for (let i = 0; i < 5; i++) act(() => result.current.triggerAnswer(true));

        // Reach 6
        act(() => result.current.triggerAnswer(true));

        expect(result.current.battleState.streak).toBe(6);
        expect(result.current.battleState.pendingSkill).toBeNull();
    });
});
