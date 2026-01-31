import { SpacedRepetitionItem } from '../../types';
import {
  createSpacedRepetitionItem,
  getDueQuestions,
  updateSpacedRepetition
} from '../../services/spacedRepetition';

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const BASE_TIME = new Date('2025-01-01T00:00:00.000Z').getTime();

const calculateExpectedEf = (easinessFactor: number, grade: number): number => {
  const next = easinessFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
  return Math.max(1.3, next);
};

const buildItem = (overrides: Partial<SpacedRepetitionItem> = {}): SpacedRepetitionItem => ({
  questionId: 'question-1',
  easinessFactor: 2.5,
  interval: 0,
  repetitions: 0,
  nextReviewDate: BASE_TIME,
  ...overrides
});

describe('spaced repetition (SM-2)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_TIME);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates a default spaced repetition item', () => {
    const item = createSpacedRepetitionItem('question-1');

    expect(item.questionId).toBe('question-1');
    expect(item.easinessFactor).toBe(2.5);
    expect(item.interval).toBe(0);
    expect(item.repetitions).toBe(0);
    expect(item.nextReviewDate).toBe(BASE_TIME);
    expect(item.lastReviewDate).toBeUndefined();
  });

  it('resets repetitions and interval on failed review (grade < 3)', () => {
    const item = buildItem({
      easinessFactor: 2.5,
      interval: 10,
      repetitions: 3,
      nextReviewDate: BASE_TIME - DAY_IN_MS
    });

    const updated = updateSpacedRepetition(item, 2);

    expect(updated.repetitions).toBe(0);
    expect(updated.interval).toBe(1);
    expect(updated.lastReviewDate).toBe(BASE_TIME);
    expect(updated.nextReviewDate).toBe(BASE_TIME + DAY_IN_MS);
    expect(updated.easinessFactor).toBeCloseTo(calculateExpectedEf(2.5, 2), 6);
  });

  it('increments repetitions on pass and keeps first interval at 1 day', () => {
    const item = buildItem({
      easinessFactor: 2.5,
      interval: 0,
      repetitions: 0
    });

    const updated = updateSpacedRepetition(item, 4);

    expect(updated.repetitions).toBe(1);
    expect(updated.interval).toBe(1);
    expect(updated.nextReviewDate).toBe(BASE_TIME + DAY_IN_MS);
  });

  it('sets interval to 6 days when repetitions is 1', () => {
    const item = buildItem({
      easinessFactor: 2.5,
      interval: 1,
      repetitions: 1
    });

    const updated = updateSpacedRepetition(item, 3);

    expect(updated.repetitions).toBe(2);
    expect(updated.interval).toBe(6);
    expect(updated.nextReviewDate).toBe(BASE_TIME + 6 * DAY_IN_MS);
  });

  it('uses the old easiness factor when computing interval for repetitions >= 2', () => {
    const item = buildItem({
      easinessFactor: 2.5,
      interval: 10,
      repetitions: 2
    });

    const updated = updateSpacedRepetition(item, 5);

    expect(updated.interval).toBe(25);
    expect(updated.easinessFactor).toBeCloseTo(2.6, 6);
    expect(updated.repetitions).toBe(3);
  });

  it('calculates easiness factor correctly for grades 0-5', () => {
    for (let grade = 0; grade <= 5; grade += 1) {
      const item = buildItem({
        easinessFactor: 2.5,
        interval: 1,
        repetitions: 1
      });
      const updated = updateSpacedRepetition(item, grade);

      expect(updated.easinessFactor).toBeCloseTo(calculateExpectedEf(2.5, grade), 6);
    }
  });

  it('never lets easiness factor drop below 1.3', () => {
    const item = buildItem({
      easinessFactor: 1.3,
      interval: 1,
      repetitions: 1
    });

    const updated = updateSpacedRepetition(item, 0);

    expect(updated.easinessFactor).toBe(1.3);
  });

  it('caps interval at 365 days', () => {
    const item = buildItem({
      easinessFactor: 2.0,
      interval: 300,
      repetitions: 3
    });

    const updated = updateSpacedRepetition(item, 5);

    expect(updated.interval).toBe(365);
    expect(updated.nextReviewDate).toBe(BASE_TIME + 365 * DAY_IN_MS);
  });

  it('returns only due questions based on next review date', () => {
    const items = [
      buildItem({ questionId: 'due', nextReviewDate: BASE_TIME }),
      buildItem({ questionId: 'past', nextReviewDate: BASE_TIME - DAY_IN_MS }),
      buildItem({ questionId: 'future', nextReviewDate: BASE_TIME + DAY_IN_MS })
    ];

    const due = getDueQuestions(items);

    expect(due.map(item => item.questionId)).toEqual(['due', 'past']);
  });

  it('handles multiple review sessions with mixed grades', () => {
    let item = createSpacedRepetitionItem('question-1');

    item = updateSpacedRepetition(item, 5);
    expect(item.repetitions).toBe(1);
    expect(item.interval).toBe(1);

    vi.setSystemTime(BASE_TIME + DAY_IN_MS);
    item = updateSpacedRepetition(item, 5);
    expect(item.repetitions).toBe(2);
    expect(item.interval).toBe(6);

    vi.setSystemTime(BASE_TIME + 2 * DAY_IN_MS);
    item = updateSpacedRepetition(item, 2);
    expect(item.repetitions).toBe(0);
    expect(item.interval).toBe(1);

    vi.setSystemTime(BASE_TIME + 3 * DAY_IN_MS);
    item = updateSpacedRepetition(item, 4);
    expect(item.repetitions).toBe(1);
    expect(item.interval).toBe(1);
  });

  it('rejects invalid grades', () => {
    const item = buildItem();

    expect(() => updateSpacedRepetition(item, 2.5)).toThrow('評分必須是 0 到 5 的整數');
  });
});
