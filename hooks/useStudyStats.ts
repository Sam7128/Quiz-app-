import { useState, useEffect, useCallback } from 'react';
import { StudyStats } from '../services/analytics';
import { useRepository } from '../contexts/RepositoryContext';

interface UseStudyStatsReturn {
  stats: StudyStats | null;
  dailyStats: { date: string; questions: number; correct: number }[];
  loading: boolean;
  refresh: () => Promise<void>;
}

export const useStudyStats = (): UseStudyStatsReturn => {
  const repository = useRepository();
  const [stats, setStats] = useState<StudyStats | null>(null);
  const [dailyStats, setDailyStats] = useState<{ date: string; questions: number; correct: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    
    try {
      const [statsData, dailyData] = await Promise.all([
        repository.getStudyStats(),
        repository.getDailyStats()
      ]);
      setStats(statsData);
      setDailyStats(dailyData);
    } catch (error) {
      console.error('Error fetching study stats:', error);
    } finally {
      setLoading(false);
    }
  }, [repository]);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  return {
    stats,
    dailyStats,
    loading,
    refresh: fetchStats
  };
};
