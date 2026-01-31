import { useState, useEffect, useCallback } from 'react';
import { 
  getMyChallenges, 
  acceptChallenge, 
  cancelChallenge,
  submitChallengeScore,
  ChallengeWithDetails 
} from '../services/challenges';

interface UseChallengesReturn {
  challenges: ChallengeWithDetails[];
  loading: boolean;
  pendingCount: number;
  refresh: () => Promise<void>;
  accept: (challengeId: string) => Promise<boolean>;
  decline: (challengeId: string) => Promise<boolean>;
  submitScore: (challengeId: string, score: number) => Promise<boolean>;
}

export const useChallenges = (isAuthenticated: boolean): UseChallengesReturn => {
  const [challenges, setChallenges] = useState<ChallengeWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChallenges = useCallback(async () => {
    if (!isAuthenticated) {
      setChallenges([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await getMyChallenges();
      setChallenges(data);
    } catch (error) {
      console.error('Error fetching challenges:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const accept = useCallback(async (challengeId: string): Promise<boolean> => {
    const success = await acceptChallenge(challengeId);
    if (success) {
      await fetchChallenges();
    }
    return success;
  }, [fetchChallenges]);

  const decline = useCallback(async (challengeId: string): Promise<boolean> => {
    const success = await cancelChallenge(challengeId);
    if (success) {
      await fetchChallenges();
    }
    return success;
  }, [fetchChallenges]);

  const submitScore = useCallback(async (challengeId: string, score: number): Promise<boolean> => {
    const success = await submitChallengeScore(challengeId, score);
    if (success) {
      await fetchChallenges();
    }
    return success;
  }, [fetchChallenges]);

  useEffect(() => {
    void fetchChallenges();
  }, [fetchChallenges]);

  const pendingCount = challenges.filter(c => c.status === 'pending').length;

  return {
    challenges,
    loading,
    pendingCount,
    refresh: fetchChallenges,
    accept,
    decline,
    submitScore
  };
};
