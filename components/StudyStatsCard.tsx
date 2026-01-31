import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Target, Clock, Calendar } from 'lucide-react';
import { useStudyStats } from '../hooks/useStudyStats';

interface StudyStatsCardProps {
  isAuthenticated: boolean;
}

export const StudyStatsCard: React.FC<StudyStatsCardProps> = ({ isAuthenticated }) => {
  const { stats, dailyStats, loading } = useStudyStats(isAuthenticated);

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
          <div className="h-32 bg-slate-100 dark:bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!stats || stats.totalQuestions === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
        <h3 className="text-slate-500 dark:text-slate-400 font-medium mb-4 flex items-center gap-2">
          <TrendingUp size={18} /> 學習統計
        </h3>
        <div className="text-center py-8 text-slate-400 dark:text-slate-500">
          <p className="text-sm">完成測驗後查看統計數據</p>
        </div>
      </div>
    );
  }

  // Format duration
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}小時${mins}分`;
    return `${mins}分鐘`;
  };

  // Format date for chart
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // Prepare chart data
  const chartData = dailyStats.map(day => ({
    date: formatDate(day.date),
    答對: day.correct,
    總題數: day.questions,
    正確率: day.questions > 0 ? Math.round((day.correct / day.questions) * 100) : 0
  }));

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
      <h3 className="text-slate-500 dark:text-slate-400 font-medium mb-4 flex items-center gap-2">
        <TrendingUp size={18} /> 學習統計 (30天)
      </h3>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-brand-50 dark:bg-brand-900/20 p-4 rounded-xl">
          <div className="flex items-center gap-2 text-brand-600 mb-1">
            <Target size={16} />
            <span className="text-xs font-bold">正確率</span>
          </div>
          <div className="text-2xl font-bold text-brand-700 dark:text-brand-300">{stats.accuracyRate}%</div>
          <div className="text-xs text-brand-400 dark:text-brand-200">{stats.totalCorrect}/{stats.totalQuestions} 題</div>
        </div>

        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl">
          <div className="flex items-center gap-2 text-indigo-600 mb-1">
            <Calendar size={16} />
            <span className="text-xs font-bold">學習天數</span>
          </div>
          <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">{stats.studyDays}</div>
          <div className="text-xs text-indigo-400 dark:text-indigo-200">天</div>
        </div>

        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl col-span-2">
          <div className="flex items-center gap-2 text-emerald-600 mb-1">
            <Clock size={16} />
            <span className="text-xs font-bold">總學習時間</span>
          </div>
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{formatDuration(stats.totalDurationSeconds)}</div>
          <div className="text-xs text-emerald-400 dark:text-emerald-200">近30天累計</div>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="h-48">
          <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-2">近7天答題趨勢</h4>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis 
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '8px', 
                  border: 'none', 
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  fontSize: '12px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="答對" 
                stroke="#10b981" 
                strokeWidth={2}
                dot={{ fill: '#10b981', strokeWidth: 0, r: 3 }}
              />
              <Line 
                type="monotone" 
                dataKey="總題數" 
                stroke="#6366f1" 
                strokeWidth={2}
                dot={{ fill: '#6366f1', strokeWidth: 0, r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
