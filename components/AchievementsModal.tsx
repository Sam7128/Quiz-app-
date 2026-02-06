import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Award, CheckCircle2, Lock } from 'lucide-react';
import { ACHIEVEMENTS } from '../constants/achievements';

interface AchievementsModalProps {
    isOpen: boolean;
    onClose: () => void;
    unlockedIds: string[];
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({ isOpen, onClose, unlockedIds }) => {
    const sortedAchievements = useMemo(() => {
        return [...ACHIEVEMENTS].sort((a, b) => {
            const aUnlocked = unlockedIds.includes(a.id);
            const bUnlocked = unlockedIds.includes(b.id);
            // 解鎖的排前面
            if (aUnlocked && !bUnlocked) return -1;
            if (!aUnlocked && bUnlocked) return 1;
            return 0;
        });
    }, [unlockedIds]);

    const progress = Math.round((unlockedIds.length / ACHIEVEMENTS.length) * 100);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    {/* Modal Content */}
                    <motion.div
                        className="relative w-full max-w-4xl bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 relative">
                            <button
                                onClick={onClose}
                                className="absolute right-4 top-4 p-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full transition-colors"
                                aria-label="關閉視窗"
                            >
                                <X size={20} className="text-slate-500" />
                            </button>

                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl">
                                    <Award className="w-6 h-6 text-yellow-500" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">成就一覽</h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        已解鎖 {unlockedIds.length} / {ACHIEVEMENTS.length}
                                    </p>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-4">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-yellow-400 to-orange-500"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 1, delay: 0.2 }}
                                />
                            </div>
                        </div>

                        {/* List */}
                        <div className="p-6 overflow-y-auto custom-scrollbar grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {sortedAchievements.map((achievement, index) => {
                                const isUnlocked = unlockedIds.includes(achievement.id);
                                return (
                                    <motion.div
                                        key={achievement.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.03 }}
                                        className={`
                                            relative p-4 rounded-2xl border-2 transition-all
                                            ${isUnlocked
                                                ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800/30'
                                                : 'bg-slate-50 dark:bg-slate-700/50 border-slate-100 dark:border-slate-700 grayscale-[0.8] opacity-70'}
                                        `}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="text-3xl">{achievement.icon}</div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <h3 className={`font-bold ${isUnlocked ? 'text-slate-800 dark:text-yellow-100' : 'text-slate-500'}`}>
                                                        {achievement.title}
                                                    </h3>
                                                    {isUnlocked ? (
                                                        <CheckCircle2 size={16} className="text-green-500" />
                                                    ) : (
                                                        <Lock size={16} className="text-slate-400" />
                                                    )}
                                                </div>
                                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                                    {achievement.description}
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
