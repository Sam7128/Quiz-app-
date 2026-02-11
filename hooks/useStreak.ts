import { useState, useEffect, useCallback } from 'react';
import { useRepository } from '../contexts/RepositoryContext';
import { StreakData } from '../services/repository';

interface UseStreakReturn {
  streak: StreakData;
  loading: boolean;
  updateStreak: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const useStreak = (): UseStreakReturn => {
  const repository = useRepository();
  const [streak, setStreak] = useState<StreakData>({
    currentStreak: 0,
    longestStreak: 0,
    lastStudyDate: null
  });
  const [loading, setLoading] = useState(true);

  const fetchStreak = useCallback(async () => {
    setLoading(true);
    
    try {
      const data = await repository.getStreak();
      setStreak(data);
    } catch (error) {
      console.error('Error fetching streak:', error);
    } finally {
      setLoading(false);
    }
  }, [repository]);

  const updateStreak = useCallback(async () => {
    try {
      await repository.updateStreak();
      await fetchStreak();
    } catch (error) {
      console.error('Error updating streak:', error);
    }
  }, [repository, fetchStreak]);

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
