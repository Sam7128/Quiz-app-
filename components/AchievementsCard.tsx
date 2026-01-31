import React from 'react';
import { Award, Lock } from 'lucide-react';
import { ACHIEVEMENTS } from '../constants/achievements';
import { useAchievements } from '../hooks/useAchievements';

interface AchievementsCardProps {
  isAuthenticated: boolean;
}

export const AchievementsCard: React.FC<AchievementsCardProps> = ({ isAuthenticated }) => {
  const { unlockedIds, loading } = useAchievements(isAuthenticated);
  const totalAchievements = ACHIEVEMENTS.length;
  const unlockedCount = unlockedIds.length;
  const progress = Math.round((unlockedCount / totalAchievements) * 100);

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-slate-700 dark:text-slate-200 font-bold flex items-center gap-2">
          <Award size={18} className="text-yellow-500" /> 成就系統
        </h3>
        <div className="text-sm text-slate-500 dark:text-slate-400">
          {unlockedCount}/{totalAchievements}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 mb-4">
        <div
          className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-2 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto">
        {ACHIEVEMENTS.slice(0, 6).map((achievement) => {
          const isUnlocked = unlockedIds.includes(achievement.id);
          return (
            <div
              key={achievement.id}
              className={`p-3 rounded-xl border transition-all ${
                isUnlocked
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
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {achievement.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {ACHIEVEMENTS.length > 6 && (
        <p className="text-xs text-slate-400 dark:text-slate-500 text-center mt-3">
          還有 {ACHIEVEMENTS.length - 6} 個成就等待解鎖
        </p>
      )}
    </div>
  );
};
