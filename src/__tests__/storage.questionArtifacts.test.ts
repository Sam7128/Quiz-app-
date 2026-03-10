import { beforeEach, describe, expect, it } from 'vitest';

import {
  deleteQuestionArtifacts,
  getMistakeLog,
  getQuizSession,
  getRecentMistakeSessions,
  getSpacedRepetitionItem,
  logMistake,
  saveQuizSession,
  saveSpacedRepetitionItem,
  STORAGE_KEYS,
} from '../../services/storage';

describe('deleteQuestionArtifacts', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('removes mistake, spaced repetition, recent mistakes, and quiz session references', () => {
    logMistake('q-1', 'wrong');
    saveSpacedRepetitionItem({
      questionId: 'q-1',
      easinessFactor: 2.5,
      interval: 1,
      repetitions: 0,
      nextReviewDate: Date.now(),
    });
    localStorage.setItem(
      STORAGE_KEYS.RECENT_MISTAKES,
      JSON.stringify([
        {
          sessionId: 'session-1',
          timestamp: Date.now(),
          bankNames: ['Bank A'],
          mistakes: [
            {
              questionId: 'q-1',
              questionText: 'Question 1',
              options: ['A', 'B'],
              userAnswer: 'A',
              correctAnswer: 'B',
            },
          ],
        },
      ])
    );
    saveQuizSession({
      bankIds: ['bank-1'],
      questionIds: ['q-1', 'q-2'],
      currentIndex: 0,
      score: 0,
      wrongQuestionIds: ['q-1'],
      savedAt: Date.now(),
    });

    deleteQuestionArtifacts('q-1');

    expect(getMistakeLog()).toEqual({});
    expect(getSpacedRepetitionItem('q-1')).toBeNull();
    expect(getRecentMistakeSessions()).toEqual([]);
    expect(getQuizSession()).toEqual(
      expect.objectContaining({
        questionIds: ['q-2'],
        wrongQuestionIds: [],
      })
    );
  });
});
