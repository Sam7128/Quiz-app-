import { useCallback } from 'react';
import { useRepository } from '../contexts/RepositoryContext';

interface QuizCompletionStats {
  score: number;
  totalQuestions: number;
}

interface UseAchievementTrackerReturn {
  trackQuizCompletion: (stats: QuizCompletionStats) => Promise<void>;
}

export const useAchievementTracker = (): UseAchievementTrackerReturn => {
  const repository = useRepository();

  const trackQuizCompletion = useCallback(async ({ score, totalQuestions }: QuizCompletionStats) => {
    try {
      const unlockedIds = await repository.getAchievements();
      const achievementsToUnlock: string[] = [];
      const accuracy = totalQuestions > 0 ? (score / totalQuestions) : 0;

      if (accuracy === 1 && totalQuestions >= 5 && !unlockedIds.includes('perfect_score')) {
        achievementsToUnlock.push('perfect_score');
      }

      if (!unlockedIds.includes('first_question')) {
        achievementsToUnlock.push('first_question');
      }

      const hour = new Date().getHours();
      if ((hour >= 22 || hour < 6) && !unlockedIds.includes('night_owl')) {
        achievementsToUnlock.push('night_owl');
      }

      if (hour < 6 && !unlockedIds.includes('early_bird')) {
        achievementsToUnlock.push('early_bird');
      }

      await Promise.all(achievementsToUnlock.map(id => repository.unlockAchievement(id)));
    } catch (error) {
      console.error('Error tracking achievements:', error);
    }
  }, [repository]);

  return { trackQuizCompletion };
};
