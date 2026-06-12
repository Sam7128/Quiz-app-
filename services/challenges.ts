import { supabase } from './supabase';
import { Question } from '../types';
import { getCloudQuestions } from './cloudStorage';

export interface Challenge {
  id: string;
  challengerId: string;
  opponentId: string;
  bankId: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  challengerScore: number | null;
  opponentScore: number | null;
  currentTurn: string | null;
  winnerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChallengeWithDetails extends Challenge {
  challengerName?: string;
  opponentName?: string;
  bankName?: string;
}

/**
 * Send a challenge to a friend
 */
export const sendChallenge = async (
  opponentId: string,
  bankId: string
): Promise<string | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('challenges')
    .insert({
      challenger_id: user.id,
      opponent_id: opponentId,
      bank_id: bankId,
      status: 'pending',
      current_turn: opponentId // Opponent goes first
    })
    .select()
    .single();

  if (error) {
    console.error('Error sending challenge:', error);
    return null;
  }

  return data.id;
};

/**
 * Accept a challenge
 */
export const acceptChallenge = async (challengeId: string): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('challenges')
    .update({
      status: 'active',
      updated_at: new Date().toISOString()
    })
    .eq('id', challengeId)
    .eq('opponent_id', user.id)
    .eq('status', 'pending');

  if (error) {
    console.error('Error accepting challenge:', error);
    return false;
  }

  return true;
};

/**
 * Decline/Cancel a challenge
 */
export const cancelChallenge = async (challengeId: string): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('challenges')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString()
    })
    .eq('id', challengeId)
    .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`);

  if (error) {
    console.error('Error cancelling challenge:', error);
    return false;
  }

  return true;
};

/**
 * Submit score for a challenge
 */
export const submitChallengeScore = async (
  challengeId: string,
  score: number
): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase.rpc('submit_challenge_score', {
    p_challenge_id: challengeId,
    p_score: score
  });

  if (error) {
    console.error('Error submitting score via RPC:', error);
    throw new Error(`[Challenge] Score submission failed: RPC unavailable. ${error.message}`);
  }

  return true;
};

/**
 * Get all challenges for current user
 */
export const getMyChallenges = async (): Promise<ChallengeWithDetails[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('challenges')
    .select('*')
    .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
    .order('created_at', { ascending: false });

  if (error) {
    if (error.code === 'PGRST200' || error.message?.includes('400') || ('status' in error && (error as Record<string, unknown>).status === 400)) {
      console.warn('Challenges: Schema relation mismatch. Social features may be unavailable.');
    } else {
      console.error('Error fetching challenges:', error);
    }
    return [];
  }

  // Manual Join: Fetch related data
  type ChallengeRow = {
    id: string;
    challenger_id: string;
    opponent_id: string;
    bank_id: string;
    status: 'pending' | 'active' | 'completed' | 'cancelled';
    challenger_score: number | null;
    opponent_score: number | null;
    current_turn: string | null;
    winner_id: string | null;
    created_at: string;
    updated_at: string;
  };
  const rows = (data || []) as ChallengeRow[];

  const userIds = [...new Set(rows.flatMap((c) => [c.challenger_id, c.opponent_id]))];
  const bankIds = [...new Set(rows.map((c) => c.bank_id))];

  const { data: profiles } = await supabase.from('profiles').select('id, username').in('id', userIds);
  const { data: banks } = await supabase.from('banks').select('id, title').in('id', bankIds);

  const profileMap = new Map(profiles?.map(p => [p.id, p.username]));
  const bankMap = new Map(banks?.map(b => [b.id, b.title]));

  return rows.map(item => ({
    id: item.id,
    challengerId: item.challenger_id,
    opponentId: item.opponent_id,
    bankId: item.bank_id,
    status: item.status,
    challengerScore: item.challenger_score,
    opponentScore: item.opponent_score,
    currentTurn: item.current_turn,
    winnerId: item.winner_id,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    challengerName: profileMap.get(item.challenger_id),
    opponentName: profileMap.get(item.opponent_id),
    bankName: bankMap.get(item.bank_id)
  }));
};


