import React from 'react';
import { motion } from 'framer-motion';

interface DamageNumberProps {
    damage: number;
    isCrit?: boolean;
    x?: number;
    y?: number;
    position?: 'hero' | 'monster';
}

export const DamageNumber: React.FC<DamageNumberProps> = ({
    damage,
    isCrit = false,
    x = 0,
    y = 0
}) => {
    return (
        <motion.div
            className="absolute z-50 pointer-events-none font-black select-none text-center"
            initial={{ x, y, opacity: 0, scale: 0.5 }}
            animate={{
                opacity: [0, 1, 1, 0],
                scale: isCrit ? [0.5, 2, 1.5] : [0.5, 1.5, 1],
                y: y - (isCrit ? 100 : 60),
                rotate: isCrit ? [-10, 10, -5] : 0
            }}
            transition={{ duration: 0.8, ease: "easeOut" }}
        >
            <div className="relative">
                <span
                    className={`
                        ${isCrit
                            ? 'text-yellow-400 text-6xl drop-shadow-[0_0_10px_rgba(255,215,0,0.8)]'
                            : 'text-white text-4xl drop-shadow-[0_0_5px_rgba(255,0,0,0.8)]'}
                        font-outline-2 font-black select-none text-center
                    `}
                >
                    {damage}
                </span>
                {isCrit && (
                    <motion.div
                        className="absolute -top-8 left-1/2 -translate-x-1/2 text-xl text-yellow-300 font-bold whitespace-nowrap"
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                    >
                        CRIT!
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
};
