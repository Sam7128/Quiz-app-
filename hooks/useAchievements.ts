import { useState, useEffect, useCallback } from 'react';
import { useRepository } from '../contexts/RepositoryContext';

interface UseAchievementsReturn {
  unlockedIds: string[];
  loading: boolean;
  unlockAchievement: (achievementId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export const useAchievements = (): UseAchievementsReturn => {
  const repository = useRepository();
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAchievements = useCallback(async () => {
    setLoading(true);
    
    try {
      const ids = await repository.getAchievements();
      setUnlockedIds(ids);
    } catch (error) {
      console.error('Error fetching achievements:', error);
    } finally {
      setLoading(false);
    }
  }, [repository]);

  const unlockAchievement = useCallback(async (achievementId: string) => {
    try {
      // Check if already unlocked
      if (unlockedIds.includes(achievementId)) {
        return;
      }

      await repository.unlockAchievement(achievementId);
      const ids = await repository.getAchievements();
      setUnlockedIds(ids);
    } catch (error) {
      console.error('Error unlocking achievement:', error);
    }
  }, [repository, unlockedIds]);

  useEffect(() => {
    void fetchAchievements();
  }, [fetchAchievements]);

  return {
    unlockedIds,
    loading,
    unlockAchievement,
    refresh: fetchAchievements
  };
};
