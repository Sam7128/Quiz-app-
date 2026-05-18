import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// import { DamageNumber } from './DamageNumber'; // Integrated into AttackEffect or kept here? 
// The plan implies AttackEffect might handle damage numbers, or specific attacks do. 
// FireballAttack handles its own. Let's make IceArrowAttack handle its own too for now, or use the new component.
// I will use the new component.
import { DamageNumber } from './DamageNumber';

interface IceArrowAttackProps {
    startX: number;
    startY: number;
    targetX: number;
    targetY: number;
    damage: number;
    isCrit?: boolean;
    onComplete?: () => void;
}

const IceShatter: React.FC<{ x: number; y: number }> = ({ x, y }) => {
    return (
        <motion.div
            className="absolute z-40 pointer-events-none"
            initial={{ x, y, translateX: "-50%", translateY: "-50%" }}
        >
            {/* 核心閃光 */}
            <motion.div
                className="absolute w-20 h-20 bg-cyan-100 rounded-full blur-md"
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: [0, 1.5], opacity: [1, 0] }}
                transition={{ duration: 0.2 }}
            />

            {/* 冰霜衝擊波 */}
            <motion.div
                className="absolute w-32 h-32 border-4 border-cyan-400 rounded-full"
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: [0, 1.2], opacity: [1, 0], borderWidth: [4, 0] }}
                transition={{ duration: 0.4 }}
            />

            {/* 冰塊碎屑 */}
            {[...Array(8)].map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute w-2 h-4 bg-cyan-300"
                    style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}
                    initial={{ scale: 1, x: 0, y: 0, rotate: 0 }}
                    animate={{
                        x: (Math.random() - 0.5) * 120,
                        y: (Math.random() - 0.5) * 120,
                        opacity: [1, 0],
                        scale: 0,
                        rotate: Math.random() * 360
                    }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                />
            ))}
        </motion.div>
    );
};

export const IceArrowAttack: React.FC<IceArrowAttackProps> = ({
    startX,
    startY,
    targetX,
    targetY,
    damage,
    isCrit,
    onComplete
}) => {
    const [phase, setPhase] = useState<'flying' | 'impact'>('flying');

    useEffect(() => {
        if (phase === 'impact') {
            const timer = setTimeout(() => {
                onComplete?.();
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [phase, onComplete]);

    // 計算角度
    const angle = Math.atan2(targetY - startY, targetX - startX) * (180 / Math.PI);

    return (
        <div className="absolute inset-0 pointer-events-none overflow-visible">
            {phase === 'flying' && (
                <motion.div
                    className="absolute w-16 h-8 z-30 flex items-center justify-center"
                    initial={{ x: startX, y: startY, opacity: 0, rotate: angle }}
                    animate={{
                        x: targetX,
                        y: targetY,
                        opacity: 1,
                    }}
                    transition={{
                        duration: 0.3, // Arrows are faster
                        ease: "linear",
                    }}
                    onAnimationComplete={() => setPhase('impact')}
                >
                    <img
                        src="/battle/skills/ice_arrow.png"
                        alt="Ice Arrow"
                        className="w-full h-full object-contain drop-shadow-[0_0_10px_rgba(0,255,255,0.8)] rotate-90"
                    />
                    <motion.div
                        className="absolute -left-8 w-24 h-4 bg-gradient-to-r from-transparent via-cyan-400 to-white opacity-60 blur-sm rounded-full"
                    />
                </motion.div>
            )}

            <AnimatePresence>
                {phase === 'impact' && (
                    <>
                        <IceShatter x={targetX} y={targetY} />
                        <DamageNumber x={targetX} y={targetY - 50} damage={damage} isCrit={isCrit} />
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};
