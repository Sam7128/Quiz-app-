/**
 * 技能動畫元件
 * Skill Animation Component
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skill, SkillElement, SkillTier } from '../types/battleTypes';
import { Flame, Snowflake, Zap, Circle, Sun, Sparkles } from 'lucide-react';

interface SkillAnimationProps {
    skill: Skill;
    onComplete?: () => void;
}

// 技能元素對應的圖標和顏色
const ELEMENT_CONFIG: Record<SkillElement, { Icon: React.FC<any>; color: string; gradient: string }> = {
    fire: {
        Icon: Flame,
        color: 'text-orange-500',
        gradient: 'from-orange-500 via-red-500 to-yellow-500',
    },
    ice: {
        Icon: Snowflake,
        color: 'text-cyan-400',
        gradient: 'from-cyan-400 via-blue-400 to-indigo-400',
    },
    lightning: {
        Icon: Zap,
        color: 'text-yellow-400',
        gradient: 'from-yellow-400 via-amber-300 to-white',
    },
    void: {
        Icon: Circle,
        color: 'text-purple-600',
        gradient: 'from-purple-900 via-indigo-800 to-black',
    },
    holy: {
        Icon: Sun,
        color: 'text-amber-400',
        gradient: 'from-amber-300 via-yellow-200 to-white',
    },
    cosmic: {
        Icon: Sparkles,
        color: 'text-pink-500',
        gradient: 'from-pink-500 via-purple-500 to-indigo-600',
    },
};

// 技能等級對應的動畫強度與震動
const TIER_INTENSITY: Record<SkillTier, number> = {
    basic: 1,
    intermediate: 1.5,
    advanced: 2,
    ultimate: 3,
    epic: 4,
    legendary: 5,
};

// 螢幕震動配置
const SHAKE_CONFIG: Record<SkillTier, number[]> = {
    basic: [0, 0, 0],
    intermediate: [-2, 2, -2, 2, 0],
    advanced: [-5, 5, -5, 5, -2, 2, 0],
    ultimate: [-8, 8, -8, 8, -4, 4, -2, 2, 0],
    epic: [-10, 10, -10, 10, -5, 5, -2, 2, 0],
    legendary: [-15, 15, -15, 15, -10, 10, -5, 5, 0],
};

// 增強版粒子效果
const Particles: React.FC<{ element: SkillElement; count: number }> = ({ element, count }) => {
    const config = ELEMENT_CONFIG[element];
    const { Icon } = config;

    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute"
                    initial={{
                        x: 0,
                        y: 0,
                        scale: 0,
                        opacity: 0,
                    }}
                    animate={{
                        x: (Math.random() - 0.5) * 400, // 擴大擴散範圍
                        y: (Math.random() - 0.5) * 400,
                        scale: [0, 1.5 + Math.random(), 0],
                        opacity: [0, 1, 0],
                        rotate: Math.random() * 720,
                    }}
                    transition={{
                        duration: 1.5 + Math.random() * 1.0,
                        delay: Math.random() * 0.2, // 稍微錯開爆發
                        ease: 'easeOut',
                    }}
                >
                    <Icon className={`w-4 h-4 md:w-8 md:h-8 ${config.color} drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]`} />
                    {/* 簡單的拖尾效果 (殘影) */}
                    <motion.div
                        className={`absolute inset-0 ${config.color} opacity-50 blur-sm`}
                        animate={{ opacity: [0.5, 0] }}
                        transition={{ duration: 0.2 }}
                    >
                        <Icon className="w-full h-full" />
                    </motion.div>
                </motion.div>
            ))}
        </>
    );
};

// CSS 動畫技能效果 (增強版)
const CSSSkillEffect: React.FC<{ skill: Skill; isFallback?: boolean }> = ({ skill, isFallback }) => {
    const config = ELEMENT_CONFIG[skill.element];
    const intensity = TIER_INTENSITY[skill.tier] * (isFallback ? 1.5 : 1); // Fallback 時增強效果
    const { Icon } = config;
    const [imgError, setImgError] = useState(false);

    return (
        <div className="relative flex items-center justify-center">
            {/* 核心閃光 (爆發瞬間) */}
            <motion.div
                className={`absolute inset-0 bg-white rounded-full blur-3xl`}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: [0, 0.8, 0], scale: [0, 2, 4] }}
                transition={{ duration: 0.5, times: [0, 0.1, 1] }}
            />

            {/* 主技能圖示/圖片 */}
            <motion.div
                className={`relative z-10 ${config.color}`}
                initial={{ scale: 0, rotate: -180, opacity: 0 }}
                animate={{
                    scale: [0, 2.0 * intensity, 1.5 * intensity],
                    rotate: [0, 360, 360],
                    opacity: 1
                }}
                transition={{
                    duration: 0.8,
                    times: [0, 0.6, 1],
                    ease: 'easeOut', // 更具衝擊力的曲線
                }}
            >
                {skill.assetPath && !imgError && skill.animationType === 'css' && !isFallback ? (
                    <img
                        src={skill.assetPath}
                        alt={skill.name}
                        className="w-32 h-32 md:w-48 md:h-48 object-contain drop-shadow-[0_0_30px_rgba(255,255,255,0.6)]"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <Icon className="w-32 h-32 md:w-64 md:h-64 drop-shadow-[0_0_30px_rgba(255,255,255,0.8)]" />
                )}
            </motion.div>

            {/* 多層光環效果 */}
            {[1, 2, 3].map((i) => (
                <motion.div
                    key={`ring-${i}`}
                    className={`absolute inset-0 -m-${16 * i} rounded-full bg-gradient-to-r ${config.gradient} opacity-20 blur-2xl`}
                    initial={{ scale: 0, rotate: 0 }}
                    animate={{
                        scale: [0, 2 + i, 3 + i],
                        opacity: [0.6, 0.3, 0],
                        rotate: i % 2 === 0 ? 180 : -180
                    }}
                    transition={{ duration: 1.5 + i * 0.2, ease: 'easeOut' }}
                />
            ))}

            {/* 強烈衝擊波 */}
            <motion.div
                className={`absolute inset-0 -m-4 rounded-full border-8 ${config.color.replace('text', 'border')}`}
                initial={{ scale: 0, opacity: 1, borderWidth: 8 }}
                animate={{ scale: [0, 5], opacity: [1, 0], borderWidth: [8, 0] }}
                transition={{ duration: 0.6, ease: 'circOut' }}
            />

            {/* 粒子效果 */}
            <div className="absolute inset-0 flex items-center justify-center">
                <Particles element={skill.element} count={Math.min(30, Math.floor(12 * intensity))} />
            </div>

            {/* 額外裝飾粒子 (Fallback 專用) */}
            {isFallback && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <Particles element={skill.element} count={20} />
                </div>
            )}
        </div>
    );
};

// 影片技能效果 (優化版 + Loading + Fallback)
const VideoSkillEffect: React.FC<{ skill: Skill; onComplete?: () => void }> = ({
    skill,
    onComplete
}) => {
    const [videoError, setVideoError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    if (videoError) {
        // 影片載入失敗時使用 CSS 動畫作為備案，並傳入 isFallback 標誌以增強效果
        return <CSSSkillEffect skill={skill} isFallback={true} />;
    }

    return (
        <div className="relative w-full h-full flex items-center justify-center">
            {/* Loading 指示器 */}
            {isLoading && (
                <div className="absolute flex flex-col items-center gap-2 text-white/80 animate-pulse">
                    <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                    <span className="text-sm font-bold tracking-widest">SUMMONING...</span>
                </div>
            )}

            <motion.div
                className="w-full h-full max-w-[800px] max-h-[600px] rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] border-2 border-white/20"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: isLoading ? 0 : 1, scale: isLoading ? 0.9 : 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.5 }}
            >
                <video
                    className="w-full h-full object-cover"
                    autoPlay
                    muted // 瀏覽器自動播放通常需要靜音
                    playsInline
                    onEnded={onComplete}
                    onLoadedData={() => setIsLoading(false)}
                    onError={() => setVideoError(true)}
                >
                    <source src={skill.assetPath} type="video/webm" />
                    <source src={skill.assetPath.replace('.webm', '.mp4')} type="video/mp4" />
                </video>
            </motion.div>
        </div>
    );
};

export const SkillAnimation: React.FC<SkillAnimationProps> = ({ skill, onComplete }) => {
    const [showName, setShowName] = useState(false);
    const config = ELEMENT_CONFIG[skill.element];
    const isVideo = skill.animationType === 'video';

    // 獲取震動序列
    const shakeSequence = isVideo ? SHAKE_CONFIG['epic'] : SHAKE_CONFIG[skill.tier];

    useEffect(() => {
        // 顯示技能名稱
        const nameTimer = setTimeout(() => setShowName(true), 300);

        // 動畫完成回調 (Fallback 機制: 如果影片沒觸發 onEnded，這至少會保證流程繼續)
        const completeTimer = setTimeout(() => {
            onComplete?.();
        }, skill.duration + 500); // 多一點緩衝

        return () => {
            clearTimeout(nameTimer);
            clearTimeout(completeTimer);
        };
    }, [skill.duration, onComplete]);

    return (
        <motion.div
            className="absolute inset-0 z-50 flex items-center justify-center overflow-hidden pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{
                opacity: 1,
                // 螢幕震動效果
                x: shakeSequence,
                y: shakeSequence.map(v => -v)
            }}
            exit={{ opacity: 0 }}
            transition={{
                x: { duration: 0.3, times: [0, 0.2, 0.4, 0.6, 0.8, 1] },
                y: { duration: 0.3, times: [0, 0.2, 0.4, 0.6, 0.8, 1] }
            }}
        >
            {/* 背景遮罩 (加深) */}
            <motion.div
                className="absolute inset-0 bg-black/70 backdrop-blur-md"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            />

            {/* 氛圍光效 */}
            <motion.div
                className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-20 mix-blend-overlay`}
                animate={{ opacity: [0.1, 0.3, 0.1] }}
                transition={{ duration: 2, repeat: Infinity }}
            />

            {/* 技能效果 */}
            <div className="relative z-10 flex items-center justify-center w-full h-full p-4">
                {isVideo ? (
                    <VideoSkillEffect skill={skill} onComplete={onComplete} />
                ) : (
                    <CSSSkillEffect skill={skill} />
                )}
            </div>

            {/* 技能名稱 (動態滑入) */}
            <AnimatePresence>
                {showName && (
                    <motion.div
                        className="absolute bottom-16 left-1/2 transform -translate-x-1/2 z-30 w-full flex justify-center"
                        initial={{ opacity: 0, y: 50, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                    >
                        <div className="relative">
                            {/* 名稱背景光暈 */}
                            <div className={`absolute inset-0 -m-4 bg-gradient-to-r ${config.gradient} blur-xl opacity-50 rounded-full`} />

                            <div
                                className={`
                                    relative px-8 py-4 rounded-2xl
                                    bg-black/60 border border-white/20 backdrop-blur-xl
                                    shadow-[0_0_30px_rgba(0,0,0,0.5)]
                                    overflow-hidden
                                `}
                            >
                                {/* 掃光效果 */}
                                <motion.div
                                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12"
                                    initial={{ x: '-150%' }}
                                    animate={{ x: '150%' }}
                                    transition={{ duration: 1, delay: 0.2 }}
                                />

                                <h3 className={`text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r ${config.gradient} tracking-widest uppercase drop-shadow-sm`}>
                                    {skill.name}
                                </h3>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 全螢幕閃光效果 (高級技能) */}
            {(skill.tier === 'advanced' || skill.tier === 'ultimate' || skill.tier === 'epic' || skill.tier === 'legendary') && (
                <motion.div
                    className="absolute inset-0 bg-white pointer-events-none mix-blend-overlay"
                    initial={{ opacity: 0.8 }}
                    animate={{ opacity: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                />
            )}
        </motion.div>
    );
};

export default SkillAnimation;
