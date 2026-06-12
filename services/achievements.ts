import { supabase } from './supabase';
import { STORAGE_KEYS } from './storage';
import { signData, verifyData } from '../utils/integrityCheck';

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

  const { error } = await supabase.rpc('unlock_achievement', {
    p_achievement_id: achievementId
  });

  if (error) {
    console.error('Error unlocking achievement via RPC:', error);
    throw new Error(`[Achievements] Unlock failed: RPC unavailable. ${error.message}`);
  }

  return true;
};

/**
 * Get local achievements (guest mode) with HMAC verification
 */
export const getLocalAchievements = async (): Promise<string[]> => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ACHIEVEMENTS);
    if (!data) return [];
    
    const signature = localStorage.getItem(STORAGE_KEYS.ACHIEVEMENTS + '_sig') || '';
    const isValid = await verifyData(data, signature);
    if (!isValid) {
      console.warn('[Security] Achievements integrity check failed! Resetting achievements.');
      localStorage.removeItem(STORAGE_KEYS.ACHIEVEMENTS);
      localStorage.removeItem(STORAGE_KEYS.ACHIEVEMENTS + '_sig');
      return [];
    }
    return JSON.parse(data);
  } catch (e) {
    console.error('[Achievements] Failed to parse local achievements:', e);
    return [];
  }
};

/**
 * Unlock local achievement with HMAC signing
 */
export const unlockLocalAchievement = async (achievementId: string): Promise<void> => {
  try {
    const achievements = await getLocalAchievements();
    if (!achievements.includes(achievementId)) {
      achievements.push(achievementId);
      const dataStr = JSON.stringify(achievements);
      const signature = await signData(dataStr);
      localStorage.setItem(STORAGE_KEYS.ACHIEVEMENTS, dataStr);
      localStorage.setItem(STORAGE_KEYS.ACHIEVEMENTS + '_sig', signature);
    }
  } catch (e) {
    console.error('[Achievements] Failed to unlock local achievement:', e);
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
