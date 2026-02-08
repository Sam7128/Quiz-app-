import { supabase } from './supabase';
import { Question } from '../types';
import { getCloudQuestions } from './cloudStorage';

export interface Challenge {
  id: string;
  challengerId: string;
  opponentId: string;
  bankId: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  challengerScore: number;
  opponentScore: number;
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

  // Get current challenge
  const { data: challenge, error: fetchError } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', challengeId)
    .single();

  if (fetchError || !challenge) {
    console.error('Error fetching challenge:', fetchError);
    return false;
  }

  // Determine which score to update
  const isChallenger = challenge.challenger_id === user.id;
  const isOpponent = challenge.opponent_id === user.id;

  if (!isChallenger && !isOpponent) {
    console.error('User is not part of this challenge');
    return false;
  }

  // Build update object
  const updateData: any = {
    updated_at: new Date().toISOString()
  };

  if (isChallenger) {
    updateData.challenger_score = score;
    updateData.current_turn = challenge.opponent_id;
  } else {
    updateData.opponent_score = score;
    updateData.current_turn = challenge.challenger_id;
  }

  // Check if both scores are submitted
  const otherScore = isChallenger ? challenge.opponent_score : challenge.challenger_score;
  if (otherScore > 0) {
    // Both scores submitted - determine winner
    updateData.status = 'completed';
    if (score > otherScore) {
      updateData.winner_id = user.id;
    } else if (otherScore > score) {
      updateData.winner_id = isChallenger ? challenge.opponent_id : challenge.challenger_id;
    }
    // If tie, winner_id remains null
  }

  const { error } = await supabase
    .from('challenges')
    .update(updateData)
    .eq('id', challengeId);

  if (error) {
    console.error('Error submitting score:', error);
    return false;
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
    .select(`
      *,
      challenger:profiles!challenger_id(username),
      opponent:profiles!opponent_id(username),
      bank:banks(title)
    `)
    .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching challenges:', error);
    return [];
  }

  return (data || []).map(item => ({
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
    challengerName: item.challenger?.username,
    opponentName: item.opponent?.username,
    bankName: item.bank?.title
  }));
};

/**
 * Get pending challenges count
 */
export const getPendingChallengesCount = async (): Promise<number> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from('challenges')
    .select('*', { count: 'exact', head: true })
    .eq('opponent_id', user.id)
    .eq('status', 'pending');

  if (error) {
    console.error('Error counting challenges:', error);
    return 0;
  }

  return count || 0;
};
