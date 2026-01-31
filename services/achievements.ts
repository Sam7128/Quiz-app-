import { supabase } from './supabase';
import { ACHIEVEMENTS } from '../constants/achievements';

const LOCAL_STORAGE_KEY = 'mindspark_achievements';

/**
 * Get unlocked achievements from cloud
 */
export const getCloudAchievements = async (): Promise<string[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('user_achievements')
    .select('achievement_id')
    .eq('user_id', user.id);

  if (error) {
    console.error('Error fetching achievements:', error);
    return [];
  }

  return (data || []).map(a => a.achievement_id);
};

/**
 * Unlock an achievement
 */
export const unlockCloudAchievement = async (achievementId: string): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('user_achievements')
    .upsert({
      user_id: user.id,
      achievement_id: achievementId
    }, {
      onConflict: 'user_id,achievement_id',
      ignoreDuplicates: true
    });

  if (error) {
    console.error('Error unlocking achievement:', error);
    return false;
  }

  return true;
};

/**
 * Get local achievements (guest mode)
 */
export const getLocalAchievements = (): string[] => {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

/**
 * Unlock local achievement
 */
export const unlockLocalAchievement = (achievementId: string): void => {
  const achievements = getLocalAchievements();
  if (!achievements.includes(achievementId)) {
    achievements.push(achievementId);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(achievements));
  }
};

/**
 * Check if achievement is unlocked
 */
export const isAchievementUnlocked = (
  achievementId: string,
  unlockedIds: string[]
): boolean => {
  return unlockedIds.includes(achievementId);
};
