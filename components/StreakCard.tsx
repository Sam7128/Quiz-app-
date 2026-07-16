import React from 'react';
import { Flame, Target } from 'lucide-react';
import { useStreak } from '../hooks/useStreak';

export const StreakCard: React.FC = () => {
  const { streak, loading } = useStreak();

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-orange-500 to-red-500 p-6 rounded-2xl shadow-lg text-white">
        <div className="animate-pulse space-y-3">
          <div className="h-8 bg-white/20 rounded w-1/2"></div>
          <div className="h-4 bg-white/20 rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  const hasStreak = streak.currentStreak > 0;

  return (
    <div className={`p-6 rounded-2xl shadow-lg text-white ${
      hasStreak 
        ? 'bg-gradient-to-br from-orange-500 to-red-500' 
        : 'bg-gradient-to-br from-slate-400 to-slate-500'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Flame size={24} className={hasStreak ? 'text-yellow-300' : 'text-slate-300'} />
          <span className="font-bold text-lg">學習連續</span>
        </div>
        {hasStreak && (
          <div className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold">
            🔥 進行中
          </div>
        )}
      </div>

      <div className="text-center py-2">
        <div className="text-5xl font-bold mb-2">
          {streak.currentStreak}
        </div>
        <div className="text-white/80 text-sm">
          天連續學習
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-white/20 flex items-center justify-between text-sm">
        <div className="flex items-center gap-1.5 text-white/80">
          <Target size={14} />
          <span>最高記錄</span>
        </div>
        <div className="font-bold">
          {streak.longestStreak} 天
        </div>
      </div>

      {!hasStreak && (
        <p className="mt-3 text-xs text-white/70 text-center">
          開始學習，建立你的第一個連續記錄！
        </p>
      )}
    </div>
  );
};
