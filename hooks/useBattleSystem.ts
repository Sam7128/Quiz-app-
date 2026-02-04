/**
 * 戰鬥系統核心 Hook
 * Battle System Core Hook
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
    BattleState,
    INITIAL_BATTLE_STATE,
    UseBattleSystemReturn,
    Skill,
    SkillTier,
    BattleActionType,
    ActiveAnimation,
} from '../types/battleTypes';
import {
    getRandomSkill,
    shouldTriggerSkill,
    getSkillTierByStreak,
} from '../constants/skillsData';
import { getRandomMonster, getMonsterByProgress } from '../constants/monstersData';
import {
    getRandomDialogue,
    HERO_ATTACK_DIALOGUES,
    HERO_HURT_DIALOGUES,
    HERO_SKILL_DIALOGUES,
    HERO_VICTORY_DIALOGUES,
} from '../constants/battleDialogues';

// 基礎傷害設定
const BASE_HERO_DAMAGE = 15;
const BASE_MONSTER_DAMAGE = 12;
const SKILL_DAMAGE_MULTIPLIER: Record<SkillTier, number> = {
    basic: 1.5,
    intermediate: 2.0,
    advanced: 3.0,
    ultimate: 4.0,
    epic: 5.0,
    legendary: 10.0,
};

// 動畫持續時間 (ms)
const ATTACK_ANIMATION_DURATION = 800;
const HURT_ANIMATION_DURATION = 600;
const DIALOGUE_DISPLAY_DURATION = 2000;

export function useBattleSystem(): UseBattleSystemReturn {
    const [battleState, setBattleState] = useState<BattleState>(INITIAL_BATTLE_STATE);
    const lastDialogueRef = useRef<string>('');
    const animationTimerRef = useRef<NodeJS.Timeout | null>(null);
    const dialogueTimerRef = useRef<NodeJS.Timeout | null>(null);

    // 清理計時器
    useEffect(() => {
        return () => {
            if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
            if (dialogueTimerRef.current) clearTimeout(dialogueTimerRef.current);
        };
    }, []);

    // 設定對話並自動消失
    const setDialogue = useCallback((speaker: 'hero' | 'monster', dialogues: string[]) => {
        const text = getRandomDialogue(dialogues, lastDialogueRef.current);
        lastDialogueRef.current = text;

        setBattleState(prev => ({
            ...prev,
            currentDialogue: { speaker, text },
        }));

        // 自動清除對話
        if (dialogueTimerRef.current) clearTimeout(dialogueTimerRef.current);
        dialogueTimerRef.current = setTimeout(() => {
            setBattleState(prev => ({
                ...prev,
                currentDialogue: null,
            }));
        }, DIALOGUE_DISPLAY_DURATION);
    }, []);

    // 設定動畫並在完成後回調
    const setAnimation = useCallback((
        type: BattleActionType,
        skill?: Skill,
        onComplete?: () => void
    ) => {
        const duration = skill?.duration ?? (
            type.includes('attack') ? ATTACK_ANIMATION_DURATION : HURT_ANIMATION_DURATION
        );

        const animation: ActiveAnimation = {
            type,
            skill,
            startTime: Date.now(),
            duration,
        };

        setBattleState(prev => ({
            ...prev,
            currentAnimation: animation,
            lastAction: type,
        }));

        // 動畫完成後清除
        if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
        animationTimerRef.current = setTimeout(() => {
            setBattleState(prev => ({
                ...prev,
                currentAnimation: null,
            }));
            onComplete?.();
        }, duration);
    }, []);

    // 開始戰鬥
    const startBattle = useCallback(() => {
        const monster = getRandomMonster('normal');

        setBattleState({
            ...INITIAL_BATTLE_STATE,
            isActive: true,
            currentMonster: monster,
            monsterHp: monster.maxHp,
            monsterMaxHp: monster.maxHp,
        });
    }, []);

    // 結束戰鬥
    const endBattle = useCallback(() => {
        setBattleState(prev => ({
            ...prev,
            isActive: false,
        }));
    }, []);

    // 生成新怪物
    const spawnNewMonster = useCallback(() => {
        setBattleState(prev => {
            const newMonster = getMonsterByProgress(prev.monstersDefeated);
            return {
                ...prev,
                currentMonster: newMonster,
                monsterHp: newMonster.maxHp,
                monsterMaxHp: newMonster.maxHp,
            };
        });
    }, []);

    // 處理答對
    const handleCorrectAnswer = useCallback(() => {
        setBattleState(prev => {
            const newStreak = prev.streak + 1;
            const monster = prev.currentMonster;
            if (!monster) return prev;

            // 計算傷害
            let damage = BASE_HERO_DAMAGE;
            let triggerSkill: Skill | null = null;

            // 檢查是否觸發技能
            if (shouldTriggerSkill(newStreak)) {
                const tier = getSkillTierByStreak(newStreak);
                if (tier) {
                    triggerSkill = getRandomSkill(tier);
                    if (triggerSkill) {
                        damage *= SKILL_DAMAGE_MULTIPLIER[tier];
                    }
                }
            }

            const newMonsterHp = Math.max(0, prev.monsterHp - damage);
            const isMonsterDefeated = newMonsterHp <= 0;

            return {
                ...prev,
                streak: newStreak,
                maxStreak: Math.max(prev.maxStreak, newStreak),
                monsterHp: newMonsterHp,
                pendingSkill: triggerSkill,
                monstersDefeated: isMonsterDefeated ? prev.monstersDefeated + 1 : prev.monstersDefeated,
            };
        });

        // 播放動畫和對話
        const state = battleState;
        const newStreak = state.streak + 1;

        if (shouldTriggerSkill(newStreak)) {
            const tier = getSkillTierByStreak(newStreak);
            if (tier) {
                const skillDialogues = HERO_SKILL_DIALOGUES[tier] || HERO_ATTACK_DIALOGUES;
                setDialogue('hero', skillDialogues);

                const skill = getRandomSkill(tier);
                if (skill) {
                    setAnimation('skill_cast', skill, () => {
                        // 技能完成後檢查怪物狀態
                        setBattleState(prev => {
                            if (prev.monsterHp <= 0 && prev.currentMonster) {
                                setDialogue('hero', HERO_VICTORY_DIALOGUES);
                                setTimeout(spawnNewMonster, 1500);
                            }
                            return prev;
                        });
                    });
                }
            }
        } else {
            setDialogue('hero', HERO_ATTACK_DIALOGUES);
            setAnimation('hero_attack', undefined, () => {
                if (state.currentMonster) {
                    setDialogue('monster', state.currentMonster.hurtDialogues);
                    setAnimation('monster_hurt', undefined, () => {
                        // 檢查怪物是否被擊敗
                        setBattleState(prev => {
                            if (prev.monsterHp <= 0 && prev.currentMonster) {
                                setDialogue('monster', prev.currentMonster.defeatDialogues);
                                // Queue transition animation instead of immediate spawn
                                setTimeout(() => {
                                    setAnimation('stage_transition', undefined, spawnNewMonster);
                                }, 1000);
                            }
                            return prev;
                        });
                    });
                }
            });
        }
    }, [battleState, setAnimation, setDialogue, spawnNewMonster]);

    // 處理答錯
    const handleWrongAnswer = useCallback(() => {
        const monster = battleState.currentMonster;
        if (!monster) return;

        // 重置連擊，扣主角血
        setBattleState(prev => ({
            ...prev,
            streak: 0,
            heroHp: Math.max(0, prev.heroHp - BASE_MONSTER_DAMAGE),
        }));

        // 怪物攻擊動畫
        setDialogue('monster', monster.attackDialogues);
        setAnimation('monster_attack', undefined, () => {
            setDialogue('hero', HERO_HURT_DIALOGUES);
            setAnimation('hero_hurt', undefined, () => {
                // 檢查主角是否死亡
                setBattleState(prev => {
                    if (prev.heroHp <= 0) {
                        // 主角死亡，重置戰鬥
                        setTimeout(() => {
                            startBattle();
                        }, 2000);
                    }
                    return prev;
                });
            });
        });
    }, [battleState.currentMonster, setAnimation, setDialogue, startBattle]);

    // 觸發答題動作
    const triggerAnswer = useCallback((isCorrect: boolean) => {
        if (!battleState.isActive) {
            startBattle();
        }

        if (isCorrect) {
            handleCorrectAnswer();
        } else {
            handleWrongAnswer();
        }
    }, [battleState.isActive, handleCorrectAnswer, handleWrongAnswer, startBattle]);

    // 動畫完成回調
    const onAnimationComplete = useCallback(() => {
        setBattleState(prev => ({
            ...prev,
            currentAnimation: null,
            pendingSkill: null,
        }));
    }, []);

    // 計算當前技能等級
    const currentSkillTier = getSkillTierByStreak(battleState.streak);
    const hasPendingSkill = battleState.pendingSkill !== null;

    return {
        battleState,
        triggerAnswer,
        startBattle,
        endBattle,
        onAnimationComplete,
        hasPendingSkill,
        currentSkillTier,
    };
}

export default useBattleSystem;
