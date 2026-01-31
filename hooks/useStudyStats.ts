import { useState, useEffect, useCallback } from 'react';
import { 
  getStudyStats, 
  getDailyStats, 
  getLocalStudyStats, 
  getLocalDailyStats,
  StudyStats 
} from '../services/analytics';

interface UseStudyStatsReturn {
  stats: StudyStats | null;
  dailyStats: { date: string; questions: number; correct: number }[];
  loading: boolean;
  refresh: () => Promise<void>;
}

export const useStudyStats = (isAuthenticated: boolean): UseStudyStatsReturn => {
  const [stats, setStats] = useState<StudyStats | null>(null);
  const [dailyStats, setDailyStats] = useState<{ date: string; questions: number; correct: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    
    try {
      if (isAuthenticated) {
        const [statsData, dailyData] = await Promise.all([
          getStudyStats(),
          getDailyStats()
        ]);
        setStats(statsData);
        setDailyStats(dailyData);
      } else {
        // Guest mode - use localStorage
        setStats(getLocalStudyStats());
        setDailyStats(getLocalDailyStats());
      }
    } catch (error) {
      console.error('Error fetching study stats:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

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
