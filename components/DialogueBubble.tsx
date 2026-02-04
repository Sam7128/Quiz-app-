/**
 * 對話氣泡元件
 * Dialogue Bubble Component
 */

import React from 'react';
import { motion } from 'framer-motion';

interface DialogueBubbleProps {
    text: string;
    position: 'left' | 'right';
}

export const DialogueBubble: React.FC<DialogueBubbleProps> = ({ text, position }) => {
    const isLeft = position === 'left';

    return (
        <motion.div
            className={`
        absolute z-20 max-w-[150px] md:max-w-[180px] 
        ${isLeft ? 'left-0 -top-2' : 'right-0 -top-2'}
      `}
            initial={{ opacity: 0, scale: 0.5, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
            <div
                className={`
          relative px-3 py-2 rounded-xl shadow-lg
          ${isLeft
                        ? 'bg-blue-500 text-white'
                        : 'bg-red-500 text-white'
                    }
        `}
            >
                {/* 對話內容 */}
                <p className="text-xs md:text-sm font-medium leading-tight">
                    {text}
                </p>

                {/* 對話氣泡尾巴 */}
                <div
                    className={`
            absolute bottom-0 w-3 h-3 transform rotate-45
            ${isLeft
                            ? 'left-4 -bottom-1 bg-blue-500'
                            : 'right-4 -bottom-1 bg-red-500'
                        }
          `}
                />
            </div>
        </motion.div>
    );
};

export default DialogueBubble;
