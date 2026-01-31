import { useState, useEffect, useCallback } from 'react';
import { 
  getCloudAchievements, 
  unlockCloudAchievement,
  getLocalAchievements,
  unlockLocalAchievement
} from '../services/achievements';

interface UseAchievementsReturn {
  unlockedIds: string[];
  loading: boolean;
  unlockAchievement: (achievementId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export const useAchievements = (isAuthenticated: boolean): UseAchievementsReturn => {
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAchievements = useCallback(async () => {
    setLoading(true);
    
    try {
      if (isAuthenticated) {
        const ids = await getCloudAchievements();
        setUnlockedIds(ids);
      } else {
        setUnlockedIds(getLocalAchievements());
      }
    } catch (error) {
      console.error('Error fetching achievements:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const unlockAchievement = useCallback(async (achievementId: string) => {
    try {
      // Check if already unlocked
      if (unlockedIds.includes(achievementId)) {
        return;
      }

      if (isAuthenticated) {
        const success = await unlockCloudAchievement(achievementId);
        if (success) {
          setUnlockedIds(prev => [...prev, achievementId]);
        }
      } else {
        unlockLocalAchievement(achievementId);
        setUnlockedIds(prev => [...prev, achievementId]);
      }
    } catch (error) {
      console.error('Error unlocking achievement:', error);
    }
  }, [isAuthenticated, unlockedIds]);

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
