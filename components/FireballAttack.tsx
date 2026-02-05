import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FireballAttackProps {
    startX: number;
    startY: number;
    targetX: number;
    targetY: number;
    damage: number;
    onComplete?: () => void;
}

/**
 * 傷害數字飄出元件 (Refactored to remove inline styles)
 */
const DamageNumber: React.FC<{ x: number; y: number; damage: number }> = ({ x, y, damage }) => {
    return (
        <motion.div
            className="absolute z-50 pointer-events-none font-black text-4xl text-white drop-shadow-md"
            initial={{ x, y: y, opacity: 0, scale: 0.5 }}
            animate={{
                opacity: [0, 1, 1, 0],
                scale: [0.5, 1.5, 1],
                y: y - 80,
                rotate: [-5, 5, -5]
            }}
            transition={{ duration: 0.8, ease: "easeOut" }}
        >
            <span className="text-red-500 drop-shadow-md">{damage}</span>
        </motion.div>
    );
};

/**
 * 爆炸效果元件 (Refactored to remove inline styles)
 */
const Explosion: React.FC<{ x: number; y: number }> = ({ x, y }) => {
    return (
        <motion.div
            className="absolute z-40 pointer-events-none"
            initial={{ x, y, translateX: "-50%", translateY: "-50%" }}
        >
            {/* 核心閃光 */}
            <motion.div
                className="absolute w-20 h-20 bg-yellow-100 rounded-full blur-md"
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: [0, 1.5], opacity: [1, 0] }}
                transition={{ duration: 0.2 }}
            />

            {/* 衝擊波 */}
            <motion.div
                className="absolute w-32 h-32 border-4 border-orange-500 rounded-full"
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: [0, 1.2], opacity: [1, 0], borderWidth: [4, 0] }}
                transition={{ duration: 0.4 }}
            />

            {/* 碎屑粒子 */}
            {[...Array(6)].map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute w-3 h-3 bg-red-500 rounded-full"
                    initial={{ scale: 1, x: 0, y: 0 }}
                    animate={{
                        x: (Math.random() - 0.5) * 100,
                        y: (Math.random() - 0.5) * 100,
                        opacity: [1, 0],
                        scale: 0
                    }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                />
            ))}
        </motion.div>
    );
};

/**
 * 火球攻擊主元件
 */
export const FireballAttack: React.FC<FireballAttackProps> = ({
    startX,
    startY,
    targetX,
    targetY,
    damage,
    onComplete
}) => {
    const [phase, setPhase] = useState<'flying' | 'impact'>('flying');

    // 計算拋物線中間點
    const controlX = (startX + targetX) / 2;
    const controlY = Math.min(startY, targetY) - 150;

    useEffect(() => {
        if (phase === 'impact') {
            const timer = setTimeout(() => {
                onComplete?.();
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [phase, onComplete]);

    return (
        <div className="absolute inset-0 pointer-events-none overflow-visible">
            {phase === 'flying' && (
                <motion.div
                    className="absolute w-12 h-12 z-30 flex items-center justify-center"
                    initial={{ x: startX, y: startY, scale: 0.5, opacity: 0 }}
                    animate={{
                        x: [startX, controlX, targetX],
                        y: [startY, controlY, targetY],
                        scale: [0.5, 1.2, 1],
                        opacity: [0, 1, 1],
                        rotate: [0, 360, 720]
                    }}
                    transition={{
                        duration: 0.5,
                        ease: "easeInOut",
                        times: [0, 0.5, 1]
                    }}
                    onAnimationComplete={() => setPhase('impact')}
                >
                    <img
                        src="/battle/skills/fireball.png"
                        alt="Fireball"
                        className="w-full h-full object-contain drop-shadow-[0_0_10px_rgba(255,100,0,0.8)]"
                    />
                    <motion.div
                        className="absolute -right-4 w-16 h-8 bg-gradient-to-l from-transparent to-orange-500 opacity-50 blur-sm rounded-full"
                        style={{ transformOrigin: 'left center', transform: 'rotate(180deg)' }}
                    />
                </motion.div>
            )}

            <AnimatePresence>
                {phase === 'impact' && (
                    <>
                        <Explosion x={targetX} y={targetY} />
                        <DamageNumber x={targetX} y={targetY - 50} damage={damage} />
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};
