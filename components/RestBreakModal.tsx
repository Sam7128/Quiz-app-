import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coffee, ArrowRight, Play } from 'lucide-react';

interface RestBreakModalProps {
    isOpen: boolean;
    questionCount: number;
    onContinue: (dontAskAgain: boolean) => void;
    onStop?: () => void;
}

export const RestBreakModal: React.FC<RestBreakModalProps> = ({
    isOpen,
    questionCount,
    onContinue,
    onStop
}) => {
    const [dontAskAgain, setDontAskAgain] = React.useState(false);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) setDontAskAgain(false);
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    />

                    <motion.div
                        className="relative bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center border-4 border-amber-400 dark:border-amber-600"
                        initial={{ scale: 0.8, opacity: 0, y: 50 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.8, opacity: 0, y: 50 }}
                    >
                        <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/40 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Coffee className="w-10 h-10 text-amber-600 dark:text-amber-400" />
                        </div>

                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
                            休息一下吧！
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 mb-6">
                            您已經連續完成了 {questionCount} 道題目。<br />
                            適度休息能讓學習效果更好喔！
                        </p>

                        <div className="flex items-center justify-center gap-2 mb-6">
                            <input
                                type="checkbox"
                                id="dontAskAgain"
                                checked={dontAskAgain}
                                onChange={(e) => setDontAskAgain(e.target.checked)}
                                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                            />
                            <label htmlFor="dontAskAgain" className="text-sm text-slate-600 dark:text-slate-300">
                                本輪測驗不再提醒
                            </label>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={() => onContinue(dontAskAgain)}
                                className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-brand-200 dark:shadow-none transition-all flex items-center justify-center gap-2"
                            >
                                <Play size={18} /> 繼續挑戰
                            </button>

                            {onStop && (
                                <button
                                    onClick={onStop}
                                    className="w-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 font-medium py-3 px-6 rounded-xl transition-all"
                                >
                                    暫停並返回
                                </button>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
