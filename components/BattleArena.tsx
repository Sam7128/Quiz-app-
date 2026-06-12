import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BattleState } from '../types/battleTypes';
import { DialogueBubble } from './DialogueBubble';
import { SkillAnimation } from './SkillAnimation';
import { AttackEffect } from './AttackEffect';
import { useSoundEffects } from '../hooks/useSoundEffects';
import { Zap, Trophy, Skull, Flame, Layers, ArrowRight } from 'lucide-react';

interface BattleArenaProps {
    battleState: BattleState;
    onAnimationComplete?: () => void;
}

// ... helper components (HealthBar, StreakCounter) kept same ...
// Keep HealthBar & StreakCounter definitions if they are inline or I should have copied them.
// I can view the file to copy them, OR I can just replace the imports and the rendering part.
// The user instruction "Replace FireballAttack with AttackEffect" implies I can target specific lines?
// But `FireballAttack` usage is deep inside the render.
// I will use `replace_file_content` targeting the import and the render block.

// Imports first
// Then render block:
/*
{currentAnimation?.type === 'hero_attack' && (
    <AttackEffect
        type="random" // Or decided by logic? Spec says "Unified attack effect". 
                      // Let's use 'random' for basic attacks.
        startX={50} // Approximate hero position
        startY={300}
        targetX={300} // Monster position
        targetY={100}
        damage={damageValue?} // We need damage value.
                              // BattleState doesn't explicitly store "lastDamage" for UI separate from hp change.
                              // But we can just pass 0 or a visual number if the AttackEffect handles it.
                              // AttackEffect prop `damage` is used for DamageNumber.
                              // We need to calculate or retrieve it.
                              // In `useBattleSystem` I removed `FireballAttack` passing damage explicitly from hook?
                              // No, hook sets 'hero_attack' animation.
                              // For now, let's just pass a default or try to deduce.
                              // BETTER: AttackEffect shouldn't handle DamageNumber if it's awkward.
                              // But I integrated it.
                              // `damage` is needed.
                              // Let's look at `BattleState`.
                              // I added `lastAction` etc.
                              // Maybe I should pass `15` or `12` based on base values for visual, or 0.
                              // Wait, `DamageNumber` is useful.
                              // Let's use a dummy value or modify `BattleState` to include `lastDamageAmount`?
                              // I didn't add `lastDamageAmount` to `BattleState`.
                              // I can modify `useBattleSystem` to add it, OR
                              // Just pass a visual number like "15" for now, or use `monsterMaxHp - monsterHp` diff?
                              // Diff is tricky if multiple updates.
                              // I'll stick to a visual default if actual is hard, but user wants `DamageNumber`.
                              // Let's assume standard damage for ID "hero_attack" is ~15.
        // ...
    />
)}
*/
// Actually, `useBattleSystem` handles the logic.
// I should update `BattleArena` to render `AttackEffect`.

// Let's look at `BattleArena` render loop roughly around line 350+


interface BattleArenaProps {
    battleState: BattleState;
    onAnimationComplete?: () => void;
}

// 血條元件
const HealthBar: React.FC<{
    current: number;
    max: number;
    isHero?: boolean;
    label?: string;
}> = ({ current, max, isHero = false, label }) => {
    const percentage = Math.max(0, Math.min(100, (current / max) * 100));
    const barColor = percentage > 50
        ? 'bg-gradient-to-r from-green-400 to-green-500'
        : percentage > 25
            ? 'bg-gradient-to-r from-yellow-400 to-orange-500'
            : 'bg-gradient-to-r from-red-500 to-red-600';

    return (
        <div className={`w-full ${isHero ? 'max-w-[140px]' : 'max-w-[140px]'}`}>
            {label && (
                <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{label}</span>
                    <span className="text-xs font-mono text-slate-500">{current}/{max}</span>
                </div>
            )}
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
                <motion.div
                    className={`h-full ${barColor} rounded-full`}
                    initial={{ width: '100%' }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                />
            </div>
        </div>
    );
};

// 連擊計數器
const StreakCounter: React.FC<{ streak: number; maxStreak: number }> = ({ streak, maxStreak }) => {
    const isHot = streak >= 5;
    const isOnFire = streak >= 10;
    const isLegendary = streak >= 20;

    return (
        <motion.div
            className={`
        relative px-4 py-2 rounded-xl font-bold text-center
        ${isLegendary
                    ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 text-white shadow-lg shadow-purple-500/30'
                    : isOnFire
                        ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30'
                        : isHot
                            ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-md'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }
      `}
            animate={isHot ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 0.5, repeat: isHot ? Infinity : 0, repeatDelay: 1 }}
        >
            <div className="flex items-center gap-2">
                {isOnFire && <Flame className="w-4 h-4 animate-pulse" />}
                <span className="text-lg">🔥 {streak}</span>
                {isOnFire && <Flame className="w-4 h-4 animate-pulse" />}
            </div>
            <div className="text-[10px] opacity-75">
                最高: {maxStreak}
            </div>
        </motion.div>
    );
};

// 角色立繪
const CharacterSprite: React.FC<{
    imagePath: string;
    name: string;
    isHurt?: boolean;
    isAttacking?: boolean;
    isHero?: boolean;
    forwardRef?: React.RefObject<HTMLDivElement | null>;
    className?: string;
    style?: React.CSSProperties;
}> = ({ imagePath, name, isHurt, isAttacking, isHero, forwardRef, className, style }) => {
    return (
        <motion.div
            ref={forwardRef}
            className={`relative ${className || ''}`}
            style={style}
            animate={
                isHurt
                    ? { x: [0, -10, 10, -5, 5, 0], opacity: [1, 0.5, 1] }
                    : isAttacking
                        ? { x: isHero ? [0, 30, 0] : [0, -30, 0], scale: [1, 1.1, 1] }
                        : {}
            }
            transition={{ duration: 0.4, ease: 'easeOut' }}
        >
            {/* 角色圖片 - 不再翻轉，保持原始方向 */}
            <div className="w-24 h-32 md:w-32 md:h-40 relative">
                <img
                    src={imagePath}
                    alt={name}
                    className={`w-full h-full object-contain drop-shadow-lg transition-all duration-300 ${isAttacking && !isHero ? 'brightness-125 sepia-0 hue-rotate-15 saturate-150 drop-shadow-[0_0_15px_rgba(168,85,247,0.6)]' : ''
                        }`}
                    onError={(e) => {
                        // 圖片載入失敗時顯示 SVG 佔位符 (避免 network error)
                        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="160" viewBox="0 0 128 160">
                            <rect width="128" height="160" fill="#cbd5e1"/>
                            <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="24" fill="#64748b">?</text>
                        </svg>`;
                        (e.target as HTMLImageElement).src = `data:image/svg+xml;base64,${btoa(svg)}`;
                    }}
                />

                {/* 受傷效果 */}
                {isHurt && (
                    <motion.div
                        className="absolute inset-0 bg-red-500/30 rounded-lg"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.5, 0] }}
                        transition={{ duration: 0.3 }}
                    />
                )}

                {/* 攻擊效果 (舊版閃電，若有火球則由 FireballAttack 取代視覺，但也可並存) */}
                {isAttacking && !isHero && (
                    <motion.div
                        className="absolute -left-4 top-1/2 transform -translate-y-1/2"
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: [0, 1, 0], scale: [0.5, 1.5, 0], x: [0, -40, -60] }}
                        transition={{ duration: 0.4 }}
                    >
                        <Zap className="w-8 h-8 text-yellow-400" />
                    </motion.div>
                )}
            </div>

            {/* 名稱標籤 */}
            <div className={`
        absolute -bottom-2 left-1/2 transform -translate-x-1/2
        px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap min-w-[60px] text-center shadow-md z-10
        ${isHero
                    ? 'bg-blue-500 text-white'
                    : 'bg-red-500 text-white'
                }
      `}>
                {name}
            </div>
        </motion.div>
    );
};

// 擊敗計數器
const DefeatCounter: React.FC<{ count: number }> = ({ count }) => (
    <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
        <Skull className="w-4 h-4" />
        <span>已擊敗: {count}</span>
    </div>
);

export const BattleArena: React.FC<BattleArenaProps> = ({
    battleState,
    onAnimationComplete,
}) => {
    const {
        streak,
        maxStreak,
        heroHp,
        heroMaxHp,
        monsterHp,
        monsterMaxHp,
        currentMonster,
        monstersDefeated,
        currentAnimation,
        currentDialogue,
        pendingSkill,
    } = battleState;

    const { playBgm, playAttackSfx, stopBgm } = useSoundEffects();

    // 用於火球定位
    const heroRef = useRef<HTMLDivElement>(null);
    const monsterRef = useRef<HTMLDivElement>(null);
    const [fireballCoords, setFireballCoords] = useState<{ startX: number; startY: number; targetX: number; targetY: number } | null>(null);

    // BGM 控制
    useEffect(() => {
        playBgm();
        return () => stopBgm();
        // 依賴項不放 playBgm/stopBgm 以免重複觸發，僅在組件掛載/卸載時執行
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 處理火球動畫觸發
    useEffect(() => {
        if (currentAnimation?.type === 'hero_attack' && heroRef.current && monsterRef.current) {
            const heroRect = heroRef.current.getBoundingClientRect();
            const monsterRect = monsterRef.current.getBoundingClientRect();
            const parentElement = heroRef.current.offsetParent as HTMLElement;

            if (parentElement) {
                const parentRect = parentElement.getBoundingClientRect();

                setFireballCoords({
                    startX: heroRect.left - parentRect.left + heroRect.width / 2,
                    startY: heroRect.top - parentRect.top + heroRect.height / 3, // 從稍微上方發射
                    targetX: monsterRect.left - parentRect.left + monsterRect.width / 2,
                    targetY: monsterRect.top - parentRect.top + monsterRect.height / 2,
                });

                // 播放音效
                playAttackSfx();
            }
        } else {
            setFireballCoords(null);
        }
    }, [currentAnimation, playAttackSfx]);

    // 如果沒有怪物，不渲染戰鬥場景
    if (!currentMonster) {
        return null;
    }

    const isHeroAttacking = currentAnimation?.type === 'hero_attack';
    const isHeroHurt = currentAnimation?.type === 'hero_hurt';
    const isMonsterAttacking = currentAnimation?.type === 'monster_attack';
    const isMonsterHurt = currentAnimation?.type === 'monster_hurt';
    const isSkillCasting = currentAnimation?.type === 'skill_cast';
    const isStageTransition = currentAnimation?.type === 'stage_transition';

    return (
        <div className="relative w-full mb-6">
            {/* 戰鬥場景背景 - 地下城風格 */}
            <div
                className="relative rounded-2xl p-4 md:p-6 overflow-hidden shadow-2xl border-4 border-slate-700 bg-black bg-dungeon bg-cover bg-center cursor-pointer"
                onClick={() => {
                    // Hack: Interact to enable audio context if blocked
                    playBgm();
                }}
            >
                {/* 背景遮罩 - 增加暗角與氛圍 */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/60 pointer-events-none"></div>

                {/* 氛圍光效 */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-10 left-10 w-32 h-32 bg-orange-600/10 rounded-full blur-[60px] animate-pulse" />
                    <div className="absolute top-10 right-10 w-32 h-32 bg-orange-600/10 rounded-full blur-[60px] animate-pulse" />
                    <div className="absolute bottom-0 w-full h-40 bg-purple-900/20 blur-3xl" />
                </div>

                {/* 頂部狀態列 */}
                <div className="relative flex justify-between items-start mb-4">
                    <DefeatCounter count={monstersDefeated} />
                    <StreakCounter streak={streak} maxStreak={maxStreak} />
                </div>

                {/* 主戰鬥區域 */}
                <div className="relative flex justify-between items-end min-h-[160px] md:min-h-[200px]">

                    {/* 主角區域 */}
                    <div className="flex flex-col items-center gap-2">
                        <AnimatePresence>
                            {currentDialogue?.speaker === 'hero' && (
                                <DialogueBubble
                                    text={currentDialogue.text}
                                    position="left"
                                />
                            )}
                        </AnimatePresence>

                        <CharacterSprite
                            imagePath="/battle/hero.png"
                            name="勇者"
                            isHurt={isHeroHurt}
                            isAttacking={isHeroAttacking || isSkillCasting}
                            isHero={true}
                            forwardRef={heroRef}
                        />

                        <HealthBar
                            current={heroHp}
                            max={heroMaxHp}
                            isHero={true}
                            label="HP"
                        />
                    </div>

                    {/* VS 標記 */}
                    <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        <motion.div
                            className="text-2xl font-black text-slate-300 dark:text-slate-600"
                            animate={isHeroAttacking || isMonsterAttacking ? { scale: [1, 1.3, 1] } : {}}
                            transition={{ duration: 0.2 }}
                        >
                            ⚔️
                        </motion.div>
                    </div>

                    {/* 怪物區域 */}
                    <div className="flex flex-col items-center gap-2">
                        <AnimatePresence>
                            {currentDialogue?.speaker === 'monster' && (
                                <DialogueBubble
                                    text={currentDialogue.text}
                                    position="right"
                                />
                            )}
                        </AnimatePresence>

                        <CharacterSprite
                            imagePath={currentMonster.imagePath}
                            name={currentMonster.name}
                            isHurt={isMonsterHurt}
                            isAttacking={isMonsterAttacking}
                            isHero={false}
                            forwardRef={monsterRef}
                            // 動態調整怪物大小：優先使用資料定義的 visualScale，預設為 1
                            className="origin-bottom"
                            style={{ transform: `scale(${currentMonster.visualScale || 1})` }}
                        />

                        <HealthBar
                            current={monsterHp}
                            max={monsterMaxHp}
                            label="HP"
                        />
                    </div>
                </div>

                {/* 攻擊特效層 (Unified AttackEffect) */}
                {isHeroAttacking && fireballCoords && (
                    <AttackEffect
                        type="random"
                        startX={fireballCoords.startX}
                        startY={fireballCoords.startY}
                        targetX={fireballCoords.targetX}
                        targetY={fireballCoords.targetY}
                        damage={battleState.lastDamage || 0}
                        isCrit={battleState.isLastHitCrit}
                    // onComplete is handled by parent timer, but we can pass void to avoid prop warning if any
                    />
                )}

                {/* 技能動畫層 */}
                <AnimatePresence>
                    {isSkillCasting && pendingSkill && (
                        <SkillAnimation
                            skill={pendingSkill}
                            onComplete={onAnimationComplete}
                        />
                    )}
                </AnimatePresence>

                {/* 勝利效果 */}
                <AnimatePresence>
                    {monsterHp <= 0 && (
                        <motion.div
                            className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm rounded-2xl"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <motion.div
                                className="flex flex-col items-center gap-2"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', bounce: 0.5 }}
                            >
                                <Trophy className="w-12 h-12 text-yellow-400" />
                                <span className="text-xl font-bold text-white">勝利！</span>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 失敗效果 */}
                <AnimatePresence>
                    {heroHp <= 0 && (
                        <motion.div
                            className="absolute inset-0 flex items-center justify-center bg-red-900/50 backdrop-blur-sm rounded-2xl"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <motion.div
                                className="flex flex-col items-center gap-2"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                            >
                                <Skull className="w-12 h-12 text-slate-300" />
                                <span className="text-xl font-bold text-white">再接再厲！</span>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 場景切換效果 (下一層) */}
                <AnimatePresence onExitComplete={onAnimationComplete}>
                    {isStageTransition && (
                        <motion.div
                            className="absolute inset-0 z-50 flex items-center justify-center bg-black"
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ duration: 0.8, ease: "easeInOut" }}
                        >
                            <div className="flex flex-col items-center gap-4">
                                <motion.div
                                    animate={{ x: [-20, 20, -20] }}
                                    transition={{ duration: 0.5, repeat: Infinity }}
                                >
                                    <Layers className="w-16 h-16 text-purple-500" />
                                </motion.div>
                                <h3 className="text-2xl font-black text-white tracking-widest uppercase">
                                    前往下一層...
                                </h3>
                                <div className="text-sm text-slate-400 font-mono">
                                    DEPTH: {monstersDefeated + 1}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};


