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

// 技能等級對應的動畫強度
const TIER_INTENSITY: Record<SkillTier, number> = {
    basic: 1,
    intermediate: 1.5,
    advanced: 2,
    ultimate: 3,
    epic: 4,
    legendary: 5,
};

// 粒子效果
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
                        x: (Math.random() - 0.5) * 300,
                        y: (Math.random() - 0.5) * 300,
                        scale: [0, 1 + Math.random(), 0],
                        opacity: [0, 1, 0],
                        rotate: Math.random() * 360,
                    }}
                    transition={{
                        duration: 1 + Math.random() * 0.5,
                        delay: Math.random() * 0.3,
                        ease: 'easeOut',
                    }}
                >
                    <Icon className={`w-4 h-4 md:w-6 md:h-6 ${config.color}`} />
                </motion.div>
            ))}
        </>
    );
};

// CSS 動畫技能效果
const CSSSkillEffect: React.FC<{ skill: Skill }> = ({ skill }) => {
    const config = ELEMENT_CONFIG[skill.element];
    const intensity = TIER_INTENSITY[skill.tier];
    const { Icon } = config;

    return (
        <div className="relative">
            {/* 主技能圖標 */}
            <motion.div
                className={`relative z-10 ${config.color}`}
                initial={{ scale: 0, rotate: -180 }}
                animate={{
                    scale: [0, 1.5 * intensity, 1.2 * intensity],
                    rotate: [0, 360, 360],
                }}
                transition={{
                    duration: 0.8,
                    times: [0, 0.6, 1],
                    ease: 'easeOut',
                }}
            >
                <Icon className="w-24 h-24 md:w-32 md:h-32 drop-shadow-2xl" />
            </motion.div>

            {/* 光環效果 */}
            <motion.div
                className={`absolute inset-0 -m-8 rounded-full bg-gradient-to-r ${config.gradient} opacity-30 blur-xl`}
                initial={{ scale: 0 }}
                animate={{ scale: [0, 2, 3], opacity: [0.5, 0.3, 0] }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
            />

            {/* 衝擊波 */}
            <motion.div
                className={`absolute inset-0 -m-4 rounded-full border-4 ${config.color.replace('text', 'border')}`}
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: [0, 4], opacity: [1, 0] }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
            />

            {/* 粒子效果 */}
            <div className="absolute inset-0 flex items-center justify-center">
                <Particles element={skill.element} count={Math.floor(6 * intensity)} />
            </div>
        </div>
    );
};

// 影片技能效果
const VideoSkillEffect: React.FC<{ skill: Skill; onComplete?: () => void }> = ({
    skill,
    onComplete
}) => {
    const [videoError, setVideoError] = useState(false);

    if (videoError) {
        // 影片載入失敗時使用 CSS 動畫作為備案
        return <CSSSkillEffect skill={skill} />;
    }

    return (
        <motion.div
            className="w-full h-full max-w-[400px] max-h-[300px] md:max-w-[600px] md:max-h-[400px] rounded-lg overflow-hidden shadow-2xl"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
        >
            <video
                className="w-full h-full object-cover"
                autoPlay
                muted
                playsInline
                onEnded={onComplete}
                onError={() => setVideoError(true)}
            >
                <source src={skill.assetPath} type="video/webm" />
                <source src={skill.assetPath.replace('.webm', '.mp4')} type="video/mp4" />
            </video>
        </motion.div>
    );
};

export const SkillAnimation: React.FC<SkillAnimationProps> = ({ skill, onComplete }) => {
    const [showName, setShowName] = useState(false);
    const config = ELEMENT_CONFIG[skill.element];
    const isVideo = skill.animationType === 'video';

    useEffect(() => {
        // 顯示技能名稱
        const nameTimer = setTimeout(() => setShowName(true), 200);

        // 動畫完成回調
        const completeTimer = setTimeout(() => {
            onComplete?.();
        }, skill.duration);

        return () => {
            clearTimeout(nameTimer);
            clearTimeout(completeTimer);
        };
    }, [skill.duration, onComplete]);

    return (
        <motion.div
            className="absolute inset-0 z-20 flex items-center justify-center overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            {/* 背景遮罩 */}
            <motion.div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            />

            {/* 技能效果 */}
            <div className="relative z-10 flex items-center justify-center">
                {isVideo ? (
                    <VideoSkillEffect skill={skill} onComplete={onComplete} />
                ) : (
                    <CSSSkillEffect skill={skill} />
                )}
            </div>

            {/* 技能名稱 */}
            <AnimatePresence>
                {showName && (
                    <motion.div
                        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-30"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                    >
                        <div
                            className={`
                px-6 py-3 rounded-xl
                bg-gradient-to-r ${config.gradient}
                shadow-2xl
              `}
                        >
                            <h3 className="text-xl md:text-2xl font-black text-white tracking-wider drop-shadow-lg">
                                {skill.name}
                            </h3>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 螢幕閃光效果 (高級技能) */}
            {skill.tier !== 'basic' && skill.tier !== 'intermediate' && (
                <motion.div
                    className="absolute inset-0 bg-white pointer-events-none"
                    initial={{ opacity: 0.8 }}
                    animate={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                />
            )}
        </motion.div>
    );
};

export default SkillAnimation;
