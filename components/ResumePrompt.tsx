import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, Clock, BookOpen, AlertCircle } from 'lucide-react';
import { SavedQuizProgress } from '../types/battleTypes';

interface ResumePromptProps {
    isOpen: boolean;
    progress: SavedQuizProgress | null;
    onContinue: () => void;
    onRestart: () => void;
}

export const ResumePrompt: React.FC<ResumePromptProps> = ({
    isOpen,
    progress,
    onContinue,
    onRestart
}) => {
    if (!progress) return null;

    const savedAtDate = new Date(progress.savedAt).toLocaleString();

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <motion.div
                        className="relative bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl max-w-sm w-full border-4 border-brand-500"
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-brand-100 dark:bg-brand-900/40 rounded-xl">
                                <AlertCircle className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                                發現未完成的測驗
                            </h2>
                        </div>

                        <div className="space-y-4 mb-8">
                            <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                        <BookOpen size={14} /> 當前進度
                                    </span>
                                    <span className="font-bold text-slate-700 dark:text-slate-200">
                                        第 {progress.currentIndex + 1} / {progress.questionIds.length} 題
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                        <Clock size={14} /> 儲存時間
                                    </span>
                                    <span className="text-slate-600 dark:text-slate-300">
                                        {savedAtDate}
                                    </span>
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 text-center px-2">
                                您想要繼續上次的學習進度，還是重新開始一場新的測驗？
                            </p>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={onContinue}
                                className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-brand-200 dark:shadow-none transition-all flex items-center justify-center gap-2 group"
                            >
                                <Play size={18} className="group-hover:translate-x-0.5 transition-transform" />
                                繼續測驗
                            </button>

                            <button
                                onClick={onRestart}
                                className="w-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 font-medium py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
                            >
                                <RotateCcw size={18} />
                                重新開始
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
