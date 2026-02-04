import { supabase } from './supabase';

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string | null;
}

const LOCAL_STORAGE_KEY = 'mindspark_streak';

/**
 * Get streak data from cloud
 */
export const getCloudStreak = async (): Promise<StreakData | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('user_streaks')
    .select('current_streak, longest_streak, last_study_date')
    .eq('user_id', user.id)
    .single();

  if (error) {
    // PGRST116 means no rows found (new user or no streak yet)
    if (error.code !== 'PGRST116') {
      console.error('Error fetching streak:', error);
      return null;
    }
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

  const { error } = await supabase.rpc('update_streak', {
    p_user_id: user.id
  });

  if (error) {
    console.error('Error updating streak:', error);
    return false;
  }

  return true;
};

interface LocalStreakData {
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string | null;
}

/**
 * Get local streak data (guest mode)
 */
export const getLocalStreak = (): StreakData => {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!data) {
      return { currentStreak: 0, longestStreak: 0, lastStudyDate: null };
    }
    return JSON.parse(data);
  } catch (e) {
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

  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(streak));
};
