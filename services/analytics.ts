import { supabase } from './supabase';
import { STORAGE_KEYS } from './storage';
import { isAbortError } from '../utils/isAbortError';
import { getLocalDateString } from '../utils/dateUtils';


export interface StudyStats {
  studyDays: number;
  totalQuestions: number;
  totalCorrect: number;
  accuracyRate: number;
  totalDurationSeconds: number;
}

/**
 * Record a study session
 */
export const recordStudySession = async (
  questionsAnswered: number,
  correctCount: number,
  durationSeconds: number,
  sessionType: 'quiz' | 'focus' = 'quiz'
): Promise<boolean> => {
  const safeQuestions = Number.isFinite(questionsAnswered) && questionsAnswered > 0 ? Math.floor(questionsAnswered) : 0;
  const safeCorrect = Number.isFinite(correctCount) && correctCount > 0 ? Math.floor(correctCount) : 0;
  const safeDuration = Number.isFinite(durationSeconds) && durationSeconds > 0 ? Math.floor(durationSeconds) : 0;

  if (sessionType === 'quiz' && safeQuestions === 0 && safeDuration < 5) {
    return true;
  }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const today = getLocalDateString();

  // Check if session exists for today
  const { data: sessions, error: fetchError } = await supabase
    .from('study_sessions')
    .select('*')
    .eq('user_id', user.id)
    .eq('session_date', today)
    .limit(1);

  if (fetchError) {
    console.error('Error fetching study session:', fetchError);
    return false;
  }

  const existing = sessions?.[0];

  if (existing) {
    // Update existing session
    const { error } = await supabase
      .from('study_sessions')
      .update({
        questions_answered: (Number.isFinite(existing.questions_answered) ? existing.questions_answered : 0) + safeQuestions,
        correct_count: (Number.isFinite(existing.correct_count) ? existing.correct_count : 0) + safeCorrect,
        session_duration: (Number.isFinite(existing.session_duration) ? existing.session_duration : 0) + safeDuration
      })
      .eq('id', existing.id);

    if (error) {
      console.error('Error updating study session:', error);
      return false;
    }
  } else {
    // Create new session
    const { error } = await supabase
      .from('study_sessions')
      .insert({
        user_id: user.id,
        session_date: today,
        questions_answered: safeQuestions,
        correct_count: safeCorrect,
        session_duration: safeDuration
      });

    if (error) {
      console.error('Error creating study session:', error);
      return false;
    }
  }

  return true;
};

/**
 * Get 30-day study stats
 */
export const getStudyStats = async (): Promise<StudyStats | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: statsRows, error } = await supabase
    .from('user_study_stats_30day')
    .select('*')
    .eq('user_id', user.id)
    .limit(1);

  const data = statsRows?.[0];

  if (error) {
    // PGRST116 means no rows found (not truly an error for analytics)
    if (error.code !== 'PGRST116') {
      if (isAbortError(error)) {
        console.info('Fetch study stats aborted gracefully.');
        return null;
      }
      console.error('Error fetching study stats:', error);
      return null;
    }
  }

  if (!data) {
    return {
      studyDays: 0,
      totalQuestions: 0,
      totalCorrect: 0,
      accuracyRate: 0,
      totalDurationSeconds: 0
    };
  }

  return {
    studyDays: data.study_days || 0,
    totalQuestions: data.total_questions || 0,
    totalCorrect: data.total_correct || 0,
    accuracyRate: data.accuracy_rate || 0,
    totalDurationSeconds: data.total_duration_seconds || 0
  };
};

/**
 * Get daily stats for chart (last 7 days)
 */
export const getDailyStats = async (): Promise<{ date: string; questions: number; correct: number }[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data, error } = await supabase
    .from('study_sessions')
    .select('session_date, questions_answered, correct_count')
    .eq('user_id', user.id)
    .gte('session_date', getLocalDateString(sevenDaysAgo))
    .order('session_date', { ascending: true });

  if (error) {
    console.error('Error fetching daily stats:', error);
    return [];
  }

  return (data || []).map(session => ({
    date: session.session_date,
    questions: session.questions_answered,
    correct: session.correct_count
  }));
};

interface LocalStudySession {
  sessionDate: string;
  questionsAnswered: number;
  correctCount: number;
  sessionDuration: number;
}

/**
 * Record study session for guest mode (localStorage)
 */
export const recordLocalStudySession = (
  questionsAnswered: number,
  correctCount: number,
  durationSeconds: number,
  sessionType: 'quiz' | 'focus' = 'quiz'
): void => {
  const safeQuestions = Number.isFinite(questionsAnswered) && questionsAnswered > 0 ? Math.floor(questionsAnswered) : 0;
  const safeCorrect = Number.isFinite(correctCount) && correctCount > 0 ? Math.floor(correctCount) : 0;
  const safeDuration = Number.isFinite(durationSeconds) && durationSeconds > 0 ? Math.floor(durationSeconds) : 0;

  if (sessionType === 'quiz' && safeQuestions === 0 && safeDuration < 5) {
    return;
  }
  const today = getLocalDateString();
  const sessions = getLocalStudySessions();

  const existingIndex = sessions.findIndex(s => s.sessionDate === today);

  if (existingIndex >= 0) {
    const existing = sessions[existingIndex];
    existing.questionsAnswered = (Number.isFinite(existing.questionsAnswered) && existing.questionsAnswered > 0 ? existing.questionsAnswered : 0) + safeQuestions;
    existing.correctCount = (Number.isFinite(existing.correctCount) && existing.correctCount > 0 ? existing.correctCount : 0) + safeCorrect;
    existing.sessionDuration = (Number.isFinite(existing.sessionDuration) && existing.sessionDuration > 0 ? existing.sessionDuration : 0) + safeDuration;
  } else {
    sessions.push({
      sessionDate: today,
      questionsAnswered: safeQuestions,
      correctCount: safeCorrect,
      sessionDuration: safeDuration
    });
  }

  // Keep only last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const filteredSessions = sessions.filter(s =>
    new Date(s.sessionDate) >= thirtyDaysAgo
  );

  try {
    localStorage.setItem(STORAGE_KEYS.STUDY_SESSIONS, JSON.stringify(filteredSessions));
  } catch (e) {
    console.warn('[Analytics] Failed to save local study sessions:', e);
  }
};

/**
 * Get local study sessions
 */
const getLocalStudySessions = (): LocalStudySession[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.STUDY_SESSIONS);
    if (!data) return [];
    const parsed: unknown = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/**
 * Get local study stats
 */
export const getLocalStudyStats = (): StudyStats => {
  const sessions = getLocalStudySessions();

  if (sessions.length === 0) {
    return {
      studyDays: 0,
      totalQuestions: 0,
      totalCorrect: 0,
      accuracyRate: 0,
      totalDurationSeconds: 0
    };
  }

  const totalQuestions = sessions.reduce((sum, s) => sum + (Number.isFinite(s.questionsAnswered) && s.questionsAnswered > 0 ? s.questionsAnswered : 0), 0);
  const totalCorrect = sessions.reduce((sum, s) => sum + (Number.isFinite(s.correctCount) && s.correctCount > 0 ? s.correctCount : 0), 0);
  const totalDurationSeconds = sessions.reduce((sum, s) => sum + (Number.isFinite(s.sessionDuration) && s.sessionDuration > 0 ? s.sessionDuration : 0), 0);

  return {
    studyDays: sessions.length,
    totalQuestions,
    totalCorrect,
    accuracyRate: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100 * 10) / 10 : 0,
    totalDurationSeconds
  };
};

/**
 * Get local daily stats for chart
 */
export const getLocalDailyStats = (): { date: string; questions: number; correct: number }[] => {
  const sessions = getLocalStudySessions();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  return sessions
    .filter(s => new Date(s.sessionDate) >= sevenDaysAgo)
    .sort((a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime())
    .map(s => ({
      date: s.sessionDate,
      questions: s.questionsAnswered,
      correct: s.correctCount
    }));
};
