import { useState, useEffect, useCallback } from 'react';
import { 
  getCloudStreak, 
  updateCloudStreak,
  getLocalStreak,
  updateLocalStreak,
  StreakData
} from '../services/streak';

interface UseStreakReturn {
  streak: StreakData;
  loading: boolean;
  updateStreak: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const useStreak = (isAuthenticated: boolean): UseStreakReturn => {
  const [streak, setStreak] = useState<StreakData>({
    currentStreak: 0,
    longestStreak: 0,
    lastStudyDate: null
  });
  const [loading, setLoading] = useState(true);

  const fetchStreak = useCallback(async () => {
    setLoading(true);
    
    try {
      if (isAuthenticated) {
        const data = await getCloudStreak();
        if (data) {
          setStreak(data);
        }
      } else {
        setStreak(getLocalStreak());
      }
    } catch (error) {
      console.error('Error fetching streak:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const updateStreak = useCallback(async () => {
    try {
      if (isAuthenticated) {
        await updateCloudStreak();
      } else {
        updateLocalStreak();
      }
      await fetchStreak();
    } catch (error) {
      console.error('Error updating streak:', error);
    }
  }, [isAuthenticated, fetchStreak]);

  useEffect(() => {
    void fetchStreak();
  }, [fetchStreak]);

  return {
    streak,
    loading,
    updateStreak,
    refresh: fetchStreak
  };
};
