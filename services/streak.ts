import { supabase } from './supabase';
import { STORAGE_KEYS } from './storage';
import { isAbortError } from '../utils/isAbortError';

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string | null;
}

/**
 * Get streak data from cloud
 */
export const getCloudStreak = async (): Promise<StreakData | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: streakRows, error } = await supabase
    .from('user_streaks')
    .select('current_streak, longest_streak, last_study_date')
    .eq('user_id', user.id)
    .limit(1);

  const data = streakRows?.[0];

  if (error) {
    if (isAbortError(error)) {
      console.info('Fetch streak aborted gracefully.');
      return null;
    }
    console.error('Error fetching streak:', error);
    return null;
  }

  if (!data) {
    return { currentStreak: 0, longestStreak: 0, lastStudyDate: null };
  }

  return {
    currentStreak: data.current_streak,
    longestStreak: data.longest_streak,
    lastStudyDate: data.last_study_date
  };
};

/**
 * Update streak (call after study session)
 */
export const updateCloudStreak = async (): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase.rpc('update_streak');

  if (error) {
    console.error('Error updating streak:', error);
    return false;
  }

  return true;
};

/**
 * Get local streak data (guest mode)
 */
export const getLocalStreak = (): StreakData => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.STREAK);
    if (!data) {
      return { currentStreak: 0, longestStreak: 0, lastStudyDate: null };
    }
    return JSON.parse(data);
  } catch {
    return { currentStreak: 0, longestStreak: 0, lastStudyDate: null };
  }
};

/**
 * Update local streak (call after study session)
 */
export const updateLocalStreak = (): void => {
  const today = new Date().toISOString().split('T')[0];
  const streak = getLocalStreak();

  // If already studied today, do nothing
  if (streak.lastStudyDate === today) {
    return;
  }

  // Calculate yesterday's date
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Check if streak continues
  if (streak.lastStudyDate === yesterdayStr) {
    streak.currentStreak += 1;
    if (streak.currentStreak > streak.longestStreak) {
      streak.longestStreak = streak.currentStreak;
    }
  } else {
    // Streak broken, reset to 1
    streak.currentStreak = 1;
  }

  streak.lastStudyDate = today;

  localStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(streak));
};
