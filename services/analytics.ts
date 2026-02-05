import { supabase } from './supabase';

export interface StudySession {
  id?: string;
  userId: string;
  sessionDate: string;
  questionsAnswered: number;
  correctCount: number;
  sessionDuration: number; // in seconds
}

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
  durationSeconds: number
): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const today = new Date().toISOString().split('T')[0];

  // Check if session exists for today
  const { data: sessions, error: fetchError } = await supabase
    .from('study_sessions')
    .select('*')
    .eq('user_id', user.id)
    .eq('session_date', today)
    .limit(1);

  const existing = sessions?.[0];

  if (existing) {
    // Update existing session
    const { error } = await supabase
      .from('study_sessions')
      .update({
        questions_answered: existing.questions_answered + questionsAnswered,
        correct_count: existing.correct_count + correctCount,
        session_duration: existing.session_duration + durationSeconds
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
        questions_answered: questionsAnswered,
        correct_count: correctCount,
        session_duration: durationSeconds
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
    .gte('session_date', sevenDaysAgo.toISOString().split('T')[0])
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

// Local storage keys for guest mode
const LOCAL_STORAGE_KEY = 'mindspark_study_sessions';

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
  durationSeconds: number
): void => {
  const today = new Date().toISOString().split('T')[0];
  const sessions = getLocalStudySessions();

  const existingIndex = sessions.findIndex(s => s.sessionDate === today);

  if (existingIndex >= 0) {
    sessions[existingIndex].questionsAnswered += questionsAnswered;
    sessions[existingIndex].correctCount += correctCount;
    sessions[existingIndex].sessionDuration += durationSeconds;
  } else {
    sessions.push({
      sessionDate: today,
      questionsAnswered,
      correctCount,
      sessionDuration: durationSeconds
    });
  }

  // Keep only last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const filteredSessions = sessions.filter(s =>
    new Date(s.sessionDate) >= thirtyDaysAgo
  );

  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filteredSessions));
};

/**
 * Get local study sessions
 */
export const getLocalStudySessions = (): LocalStudySession[] => {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
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

  const totalQuestions = sessions.reduce((sum, s) => sum + s.questionsAnswered, 0);
  const totalCorrect = sessions.reduce((sum, s) => sum + s.correctCount, 0);
  const totalDurationSeconds = sessions.reduce((sum, s) => sum + s.sessionDuration, 0);

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
