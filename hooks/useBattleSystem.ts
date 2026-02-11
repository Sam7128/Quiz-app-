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
    DamageResult,
    CritResult,
    Monster,
} from '../types/battleTypes';
import {
    getRandomSkill,
    shouldTriggerSkill,
    getSkillTierByStreak,
} from '../constants/skillsData';
import {
    getRandomMonster,
    getMonstersByDifficulty,
    NORMAL_MONSTER_IDS,
    ELITE_MONSTER_IDS,
    BOSS_MONSTER_IDS
} from '../constants/monstersData';
import {
    getRandomDialogue,
    HERO_ATTACK_DIALOGUES,
    HERO_HURT_DIALOGUES,
    HERO_SKILL_DIALOGUES,
    HERO_VICTORY_DIALOGUES,
    MONSTER_SHIELD_DIALOGUES,
} from '../constants/battleDialogues';

// 基礎傷害設定
const BASE_MONSTER_DAMAGE = 12;
const SKILL_DAMAGE_MULTIPLIER: Record<SkillTier, number> = {
    basic: 1.5,
    intermediate: 2.0,
    advanced: 3.0,
    ultimate: 4.0,
    epic: 5.0,
    legendary: 10.0,
};

// 暴擊設定
const CRIT_CHANCE = 0.15;
const CRIT_MULTIPLIER_RANGE: [number, number] = [1.5, 3.0];

// 動畫持續時間 (ms)
const ATTACK_ANIMATION_DURATION = 800;
const HURT_ANIMATION_DURATION = 600;
const DIALOGUE_DISPLAY_DURATION = 2000;

const BATTLE_STATE_KEY = 'mindspark_battle_state';

export function useBattleSystem(): UseBattleSystemReturn {
    // 狀態初始化 (嘗試從 LocalStorage 讀取)
    const [battleState, setBattleState] = useState<BattleState>(() => {
        try {
            const saved = localStorage.getItem(BATTLE_STATE_KEY);
            if (saved) return JSON.parse(saved);
        } catch (e) {
            console.error('Failed to load battle state', e);
        }
        return INITIAL_BATTLE_STATE;
    });

    // Persistence Effect
    useEffect(() => {
        // Only save if battle is active or there's some progress (HP loss, streak)
        if (battleState.isActive || battleState.heroHp < INITIAL_BATTLE_STATE.heroHp || battleState.monsterHp < INITIAL_BATTLE_STATE.monsterHp || battleState.streak > 0) {
            localStorage.setItem(BATTLE_STATE_KEY, JSON.stringify(battleState));
        } else {
            const isInitialState = JSON.stringify(battleState) === JSON.stringify(INITIAL_BATTLE_STATE);
            if (isInitialState) {
                localStorage.removeItem(BATTLE_STATE_KEY);
            }
        }
    }, [battleState]);

    // Debug Logging (DEV only)
    const prevBattleStateRef = useRef(battleState);
    useEffect(() => {
        if (import.meta.env.DEV) {
            const prev = prevBattleStateRef.current;
            const curr = battleState;

            if (prev === curr) return;

            const changes: string[] = [];
            if (prev.isActive !== curr.isActive) changes.push(`Active: ${prev.isActive} -> ${curr.isActive}`);
            if (prev.streak !== curr.streak) changes.push(`Streak: ${prev.streak} -> ${curr.streak}`);
            if (prev.heroHp !== curr.heroHp) changes.push(`HeroHP: ${prev.heroHp} -> ${curr.heroHp}`);
            if (prev.monsterHp !== curr.monsterHp) changes.push(`MonsterHP: ${prev.monsterHp} -> ${curr.monsterHp}`);
            if (prev.currentAnimation?.type !== curr.currentAnimation?.type) changes.push(`Anim: ${prev.currentAnimation?.type} -> ${curr.currentAnimation?.type}`);

            if (changes.length > 0) {
                console.groupCollapsed(`[Battle] State Change (${changes.length})`);
                changes.forEach(c => console.log(c));
                console.log('Full State:', curr);
                console.groupEnd();
            }

            prevBattleStateRef.current = curr;
        }
    }, [battleState]);

    // Clear state helper (exported or internal used by endBattle)
    const clearBattleState = useCallback(() => {
        localStorage.removeItem(BATTLE_STATE_KEY);
        setBattleState(INITIAL_BATTLE_STATE);
    }, []);

    const lastDialogueRef = useRef<string>('');
    const animationTimerRef = useRef<any>(null);
    const dialogueTimerRef = useRef<any>(null);

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

    // 輪流選怪邏輯
    const getNextMonster = useCallback((isBoss: boolean, isElite: boolean, currentPool: string[], currentSeen: string[]): { monster: Monster, newPool: string[], newSeen: string[] } => {
        let pool = [...currentPool];
        let seen = [...currentSeen];

        // 決定目標列表
        let targetList: string[] = [];
        if (isBoss) targetList = BOSS_MONSTER_IDS;
        else if (isElite) targetList = ELITE_MONSTER_IDS;
        else targetList = NORMAL_MONSTER_IDS;

        // 過濾出符合難度且在 pool 中的怪物
        let availableIds = pool.filter(id => targetList.includes(id));

        // 如果 pool 中沒有符合的怪物 (或是跨難度導致)，重置 pool
        if (availableIds.length === 0) {
            // 只重置該難度的怪物進入 pool ? 簡化起見，如果找不到就重置所有該難度的已看過怪物
            // 其實更簡單的是：維護一個全域 pool 比較複雜，這裡簡化為 "確保多樣性"
            // 我們如果發現 pool 空了，就補滿。
            // 但因為有難度區分，混合 pool 比較麻煩。
            // 這裡採用簡單策略：如果該難度還有沒看過的，就優先選。如果都看過了，就重置該難度。

            const allTargetIds = targetList;
            const seenTargetIds = seen.filter(id => allTargetIds.includes(id));

            if (seenTargetIds.length === allTargetIds.length) {
                // 全部看過了，重置該難度 seen
                seen = seen.filter(id => !allTargetIds.includes(id));
                availableIds = allTargetIds;
            } else {
                // 還有沒看過的
                availableIds = allTargetIds.filter(id => !seen.includes(id));
            }
        }

        const nextId = availableIds[Math.floor(Math.random() * availableIds.length)];

        // 查找 Monster 物件 (需優化：這裡直接用 getRandomMonster 因其實作會重新 filter，有點多餘但可接受)
        // 為了效能與正確性，我們依賴 getMonstersByDifficulty 撈所有資料再來 find
        const allMonsters = getMonstersByDifficulty(isBoss ? 'boss' : isElite ? 'elite' : 'normal');
        const monster = allMonsters.find(m => m.id === nextId) || allMonsters[0];

        // 更新 pool 與 seen
        // pool 邏輯其實可以用 "availableIds" 取代 "monsterPool" state
        // 為了符合 spec 的 "monsterPool" state 定義 (剩餘怪物池)，我們將它定義為 "所有難度剩餘未出現的"
        // 但實作上 simplest way is just track 'seen'
        if (!seen.includes(nextId)) {
            seen.push(nextId);
        }

        return { monster, newPool: [], newSeen: seen };
    }, []);

    // 開始戰鬥
    const startBattle = useCallback(() => {
        const monster = getRandomMonster('normal'); // 初始怪物

        setBattleState({
            ...INITIAL_BATTLE_STATE,
            isActive: true,
            currentMonster: monster,
            monsterHp: monster.maxHp,
            monsterMaxHp: monster.maxHp,
            // 重置 seen，但保留 pool 邏輯如果需要持久化 (這裡先簡單重置)
            seenMonsters: [monster.id],
        });
    }, []);

    // 結束戰鬥
    const endBattle = useCallback(() => {
        setBattleState(prev => ({
            ...prev,
            isActive: false,
        }));
    }, []);

    // 計算暴擊
    const rollCrit = useCallback((): CritResult => {
        const isCrit = Math.random() < CRIT_CHANCE;
        const multiplier = isCrit
            ? CRIT_MULTIPLIER_RANGE[0] + Math.random() * (CRIT_MULTIPLIER_RANGE[1] - CRIT_MULTIPLIER_RANGE[0])
            : 1.0;
        return { isCrit, multiplier };
    }, []);

    // 計算傷害
    const calculateDamage = useCallback((monster: Monster, streak: number, skillTier: SkillTier | null): DamageResult => {
        // 動畫/遊戲性平衡：
        // 基礎傷害 = 怪物血量 15% (保證約 7 刀打死)
        // 連擊加成 = 每連擊 + 2 點
        const base = Math.floor(monster.maxHp * 0.15) + (streak * 2);

        // 技能加成
        let multiplier = 1.0;
        if (skillTier) {
            multiplier = SKILL_DAMAGE_MULTIPLIER[skillTier];
        }

        // 暴擊
        const crit = rollCrit();

        let final = Math.floor(base * multiplier * crit.multiplier);

        // 護盾機制 (動態調整)
        // 根據怪物難度限制單次傷害上限，避免一擊秒殺
        let shieldAbsorbed = 0;
        if (final > monster.maxHp * 0.5) {
            // 根據怪物難度設定傷害上限
            let maxDamagePercent = 0.7; // 普通怪物: 最多 70% 血量
            if (monster.difficulty === 'elite') {
                maxDamagePercent = 0.5; // 精英怪物: 最多 50% 血量
            } else if (monster.difficulty === 'boss') {
                maxDamagePercent = 0.4; // Boss: 最多 40% 血量
            }

            const capped = Math.floor(monster.maxHp * maxDamagePercent);
            shieldAbsorbed = final - capped;
            final = capped;
        }

        return {
            baseDamage: base,
            critResult: crit,
            finalDamage: final,
            shieldAbsorbed
        };
    }, [rollCrit]);

    // 生成新怪物
    const spawnNewMonster = useCallback(() => {
        setBattleState(prev => {
            // 基於題目數判定 Boss/Elite
            // Boss: 每 10 題 (Questions Answered) -> 但這樣計算會包含打小怪的題目
            // Spec 說: "每 10 題出 Boss"
            // 原邏輯: questionsAnswered 因本次答題還沒加 1，所以這裡是檢查 nextQuestionsAnswered ?
            // 不，spawnNewMonster 是在上一隻死掉後呼叫。
            // 這時 questionsAnswered 已經是打死上一隻時的值。
            // 讓我們假設：每經過 10 題，下一隻就是 Boss。
            // 例如: 答了 10 題 -> 出 Boss. 答了 20 題 -> 出 Boss.

            // 這裡有個小問題：如果不打死怪，題目數也會增加。
            // 我們希望的是 "第 10, 20, 30... 題所遇到的怪物是 Boss" ?
            // 還是 "每做完 10 題，下一隻生出的怪是 Boss" ?
            // 採用後者：檢查 questionsAnswered 是否跨越了 10 的倍數

            // 簡化邏輯：
            // 如果 (questionsAnswered + 1) % 10 === 0 -> 下一隻是 Boss (準備迎接第 10 題)
            // 其實這樣怪怪的，因為怪物是死掉才換。
            // 比較好的體驗：
            // 當前怪物死掉後，檢查 questionsAnswered。
            // 如果 questionsAnswered >= 10 * bossKills + 10，則出 Boss。
            // 但我們沒存 bossKills。

            // 回歸簡單：
            // 用 questionsAnswered % 10 === 0 來判斷是否該出 Boss
            // 比如說剛答完第 10 題，怪物死了 -> 下一隻 (第 11 題面對的) 其實是新循環開始
            // 用 "monstersDefeated" 其實最穩，但用戶希望基於題目數。

            // 折衷方案：
            // 檢查 questionsAnswered。如果 >= 10, 20... 且上一隻不是 Boss，這隻就出 Boss？
            // 為了精確控制 "每 10 題"，我們可以在 battleState 記住 "lastBossQuestionCount"
            // 這太複雜。

            // 讓我們依據 spec: "每 10 題出 Boss"
            // 意思可能是：在第 10, 20, 30 題時，應該要面對 Boss。
            // 這意味著第 9 題打完，如果怪死了，第 10 題要出 Boss。
            // 如果第 9 題怪沒死，第 10 題還是在打小怪... 這樣就錯過了。

            // 權衡：採用 "每 10 題如果換怪，必出 Boss" + "Boss 強制出場機制" (太複雜)
            // 簡單版：根據 questionsAnswered，如果是 10 的倍數附近，優先出 Boss。
            // 或者：每 10 題 "累積進度" 滿了就出。

            // 採用方案：
            // const isBossTime = (prev.questionsAnswered % 10 === 0) 
            // 如果剛好答完第 10 題，且需要生怪 -> 出 Boss
            // 如果答完第 9 題，怪死了 -> 下一隻是第 10 題 -> 出 Boss !
            // 所以判斷點是：即將開始第 (prev.questionsAnswered + 1) 題
            const nextQuestionIndex = prev.questionsAnswered + 1;

            let isBoss = false;
            let isElite = false;

            if (nextQuestionIndex % 10 === 0 || (nextQuestionIndex > 10 && nextQuestionIndex % 10 === 1)) {
                // 第 10 題或者第 11 題 (容錯) 出 Boss
                isBoss = true;
            } else if (nextQuestionIndex % 5 === 0) {
                isElite = true;
            }

            const { monster, newSeen } = getNextMonster(isBoss, isElite, [], prev.seenMonsters);

            return {
                ...prev,
                currentMonster: monster,
                monsterHp: monster.maxHp,
                monsterMaxHp: monster.maxHp,
                seenMonsters: newSeen,
            };
        });
    }, [getNextMonster]);

    // 處理答對
    const handleCorrectAnswer = useCallback(() => {
        setBattleState(prev => {
            const newStreak = prev.streak + 1;
            const newQuestionsAnswered = prev.questionsAnswered + 1;
            const monster = prev.currentMonster;

            if (!monster) return { ...prev, streak: newStreak, questionsAnswered: newQuestionsAnswered };

            // 1. 決定技能
            let triggerSkill: Skill | null = null;
            const skillTier = getSkillTierByStreak(newStreak);

            if (shouldTriggerSkill(newStreak) && skillTier) {
                triggerSkill = getRandomSkill(skillTier);
            }

            // 2. 計算傷害
            const { finalDamage, shieldAbsorbed } = calculateDamage(monster, prev.streak, triggerSkill ? skillTier : null);

            const newMonsterHp = Math.max(0, prev.monsterHp - finalDamage);
            const isMonsterDefeated = newMonsterHp <= 0;

            // 3. 處理護盾對話 (如果沒觸發技能且有減傷)
            if ((shieldAbsorbed ?? 0) > 0 && !triggerSkill) {
                // 這裡不能直接 setDialogue (因為是 reducer)，需透過副作用處理
                // 但為了簡化，我們在下面的副作用區塊處理
            }

            return {
                ...prev,
                streak: newStreak,
                maxStreak: Math.max(prev.maxStreak, newStreak),
                monsterHp: newMonsterHp,
                pendingSkill: triggerSkill,
                monstersDefeated: isMonsterDefeated ? prev.monstersDefeated + 1 : prev.monstersDefeated,
                questionsAnswered: newQuestionsAnswered,
                // 暫存傷害結果供 UI 顯示 (需擴充 BattleState 但這裡先略過，透過副作用處理)
            };
        });

        // 副作用：動畫與對話
        // 為了取得最新的 calculation，我們在這裡重新計算一次 (或是 state 應該包含 lastDamage info)
        // 為了避免複雜，我們在 render cycle 外再算一次其實還好，randomness 會導致不一致
        // 正確做法：把 damage result 存入 state 或 ref。
        // 這裡簡化：直接在 setAnimation callback 中做。

        // 由於 rollCrit 有隨機性，我們必須確保邏輯一致
        // 改為：在 setBattleState 內部計算完後，我們無法輕易拿到結果除非存進 state
        // 讓我們把 calculateDamage 移到 setBattleState 之外？ 
        // 不行，依賴 prev state。

        // 解決方案：使用 useEffect 監聽 monsterHp 變化？ No, 太慢。
        // 實用方案：在這裡計算，然後傳給 setBattleState。

        // 重新組織 handleCorrectAnswer
        // 1. 讀取 current state (注意 stale closure，需用 ref 或 functional updates 謹慎處理)
        // 其實 useBattleSystem 的 battleState 在 deps 裡，所以可以直接讀
    }, [battleState, calculateDamage, getSkillTierByStreak, spawnNewMonster, setDialogue, setAnimation]);

    // 修正後的 handleCorrectAnswer (避免 stale closure 問題，直接使用 functional update 邏輯的變體)
    // 但因為要發送對話，我們需要知道發生的事。
    // 我們將盡量在此函數內完成計算，然後一次更新 state。
    const triggerAnswer = useCallback((isCorrect: boolean) => {
        if (!battleState.isActive) {
            startBattle();
            // 如果剛開始，無法馬上答題 (邏輯上)
            return;
        }

        if (isCorrect) {
            // 正確回答邏輯
            const monster = battleState.currentMonster;
            if (!monster) return;

            const newStreak = battleState.streak + 1;
            const newQuestionsAnswered = battleState.questionsAnswered + 1;

            // 技能判定
            let triggerSkill: Skill | null = null;
            const skillTier = getSkillTierByStreak(newStreak);
            if (shouldTriggerSkill(newStreak) && skillTier) {
                triggerSkill = getRandomSkill(skillTier);
            }

            // 傷害計算
            const { finalDamage, shieldAbsorbed, critResult } = calculateDamage(monster, battleState.streak, triggerSkill ? skillTier : null);

            const newMonsterHp = Math.max(0, battleState.monsterHp - finalDamage);
            const isMonsterDefeated = newMonsterHp <= 0;

            // 更新 State
            setBattleState(prev => ({
                ...prev,
                streak: newStreak,
                maxStreak: Math.max(prev.maxStreak, newStreak),
                monsterHp: newMonsterHp,
                pendingSkill: triggerSkill,
                monstersDefeated: isMonsterDefeated ? prev.monstersDefeated + 1 : prev.monstersDefeated,
                questionsAnswered: newQuestionsAnswered,
                lastDamage: finalDamage,
                isLastHitCrit: critResult.isCrit
            }));

            // 視覺與對話處理
            if (triggerSkill) {
                const skillDialogues = HERO_SKILL_DIALOGUES[skillTier as SkillTier] || HERO_ATTACK_DIALOGUES;
                setDialogue('hero', skillDialogues);
                setAnimation('skill_cast', triggerSkill, () => {
                    if (isMonsterDefeated) {
                        setDialogue('hero', HERO_VICTORY_DIALOGUES);
                        setTimeout(spawnNewMonster, 1500);
                    }
                });
            } else {
                // 普通攻擊
                setDialogue('hero', HERO_ATTACK_DIALOGUES);

                // 護盾對話優先於受傷對話
                if ((shieldAbsorbed ?? 0) > 0) {
                    setTimeout(() => setDialogue('monster', MONSTER_SHIELD_DIALOGUES), 500);
                }

                setAnimation('hero_attack', undefined, () => {
                    // 怪物受傷
                    if (monster) {
                        if (!isMonsterDefeated && shieldAbsorbed === 0) {
                            setDialogue('monster', monster.hurtDialogues);
                        }

                        setAnimation('monster_hurt', undefined, () => {
                            if (isMonsterDefeated) {
                                setDialogue('monster', monster.defeatDialogues);
                                setTimeout(() => {
                                    setAnimation('stage_transition', undefined, spawnNewMonster);
                                }, 1000);
                            }
                        });
                    }
                });
            }

            // 這裡可以觸發 DamageNumber 顯示 (透過 event bus 或 callback，目前先忽略，因 UI 層會根據 hp 變化顯示?)
            // Spec 提到 DamageNumber component. 我們需要傳遞 damage event。
            // 暫時透過 window event 或者 context ? 
            // 簡單解法：BattleArena 監聽 monsterHp 變化並顯示差值。
            // 但這拿不到 crit 資訊。
            // 最好是加一個 "lastDamageEvent" 到 BattleState
            // 為了不更動太多，我們可以用 window dispatchEvent (CustomEvent) 給 UI 接收
            window.dispatchEvent(new CustomEvent('battle:damage', {
                detail: { damage: finalDamage, isCrit: critResult.isCrit, position: 'monster' }
            }));

        } else {
            // handleWrongAnswer 邏輯
            const monster = battleState.currentMonster;
            if (!monster) return;

            setBattleState(prev => ({
                ...prev,
                streak: 0,
                heroHp: Math.max(0, prev.heroHp - BASE_MONSTER_DAMAGE),
                questionsAnswered: prev.questionsAnswered + 1, // 答錯也算一題
                lastDamage: BASE_MONSTER_DAMAGE,
                isLastHitCrit: false
            }));

            setDialogue('monster', monster.attackDialogues);
            setAnimation('monster_attack', undefined, () => {
                setDialogue('hero', HERO_HURT_DIALOGUES);
                setAnimation('hero_hurt', undefined, () => {
                    if (battleState.heroHp - BASE_MONSTER_DAMAGE <= 0) {
                        setTimeout(startBattle, 2000);
                    }
                });
            });

            window.dispatchEvent(new CustomEvent('battle:damage', {
                detail: { damage: BASE_MONSTER_DAMAGE, isCrit: false, position: 'hero' }
            }));
        }
    }, [battleState, calculateDamage, getSkillTierByStreak, setAnimation, setDialogue, spawnNewMonster, startBattle]);

    // 動畫完成回調
    const onAnimationComplete = useCallback(() => {
        setBattleState(prev => ({
            ...prev,
            currentAnimation: null,
            pendingSkill: null,
        }));
    }, []);

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
