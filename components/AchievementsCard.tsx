import React, { useState } from 'react';
import { Award, Lock, ExternalLink } from 'lucide-react';
import { ACHIEVEMENTS } from '../constants/achievements';
import { useAchievements } from '../hooks/useAchievements';
import { motion } from 'framer-motion';
import { AchievementsModal } from './AchievementsModal';

interface AchievementsCardProps {
  isAuthenticated: boolean;
}

export const AchievementsCard: React.FC<AchievementsCardProps> = ({ isAuthenticated }) => {
  const { unlockedIds, loading } = useAchievements(isAuthenticated);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const totalAchievements = ACHIEVEMENTS.length;
  const unlockedCount = unlockedIds.length;
  const progress = Math.round((unlockedCount / totalAchievements) * 100);

  return (
    <>
      <div
        onClick={() => setIsModalOpen(true)}
        className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 cursor-pointer hover:shadow-md hover:border-yellow-200 dark:hover:border-yellow-900 transition-all group"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-slate-700 dark:text-slate-200 font-bold flex items-center gap-2 group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors">
            <Award size={18} className="text-yellow-500" /> 成就系統
            <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />
          </h3>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {unlockedCount}/{totalAchievements}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 mb-4">
          <motion.div
            className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>

        {/* Achievements Grid */}
        <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto custom-scrollbar">
          {ACHIEVEMENTS.slice(0, 6).map((achievement) => {
            const isUnlocked = unlockedIds.includes(achievement.id);
            return (
              <div
                key={achievement.id}
                className={`p-3 rounded-xl border transition-all ${isUnlocked
                  ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                  : 'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-700 opacity-60'
                  }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-2xl">{achievement.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-sm truncate">
                        {achievement.title}
                      </span>
                      {!isUnlocked && <Lock size={12} className="text-slate-400" />}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      {achievement.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {ACHIEVEMENTS.length > 6 && (
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center mt-3 group-hover:text-brand-500 transition-colors">
            查看全部 {ACHIEVEMENTS.length} 個成就
          </p>
        )}
      </div>

      <AchievementsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        unlockedIds={unlockedIds}
      />
    </>
  );
};
