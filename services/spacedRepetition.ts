import { SpacedRepetitionItem } from '../types';

const DEFAULT_EASINESS_FACTOR = 2.5;
const MIN_EASINESS_FACTOR = 1.3;
const MAX_INTERVAL_DAYS = 365;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const isValidGrade = (grade: number): boolean => Number.isInteger(grade) && grade >= 0 && grade <= 5;

const normalizeNumber = (value: number | undefined, fallback: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return value;
};

const calculateNextEasinessFactor = (easinessFactor: number, grade: number): number => {
  const next = easinessFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
  return Math.max(MIN_EASINESS_FACTOR, next);
};

const calculateNextInterval = (
  repetitions: number,
  interval: number,
  easinessFactor: number,
  grade: number
): number => {
  if (grade < 3) {
    return 1;
  }

  if (repetitions === 0) {
    return 1;
  }

  if (repetitions === 1) {
    return 6;
  }

  return interval * easinessFactor;
};

const ensureQuestionId = (questionId: string): void => {
  if (!questionId || !questionId.trim()) {
    throw new Error('題目 ID 不可為空');
  }
};

/**
 * 根據 SM-2 演算法更新複習資料。
 * - grade: 0-5 (0=完全忘記, 5=完全答對)
 */
export const updateSpacedRepetition = (
  item: SpacedRepetitionItem,
  grade: number
): SpacedRepetitionItem => {
  if (!item) {
    throw new Error('請提供有效的複習資料');
  }

  ensureQuestionId(item.questionId);

  if (!Number.isFinite(grade)) {
    throw new Error('評分必須是 0 到 5 的數字');
  }

  if (!isValidGrade(grade)) {
    throw new Error('評分必須是 0 到 5 的整數');
  }

  const now = Date.now();
  const currentEasinessFactor = normalizeNumber(item.easinessFactor, DEFAULT_EASINESS_FACTOR);
  const currentInterval = Math.max(0, normalizeNumber(item.interval, 0));
  const currentRepetitions = Math.max(0, normalizeNumber(item.repetitions, 0));

  const nextIntervalRaw = calculateNextInterval(
    currentRepetitions,
    currentInterval,
    currentEasinessFactor,
    grade
  );
  const nextInterval = Math.min(MAX_INTERVAL_DAYS, nextIntervalRaw);
  const nextEasinessFactor = calculateNextEasinessFactor(currentEasinessFactor, grade);
  const nextRepetitions = grade < 3 ? 0 : currentRepetitions + 1;

  return {
    questionId: item.questionId,
    easinessFactor: nextEasinessFactor,
    interval: nextInterval,
    repetitions: nextRepetitions,
    nextReviewDate: now + nextInterval * DAY_IN_MS,
    lastReviewDate: now,
  };
};

/**
 * 取得當前已到期的複習題目。
 */
export const getDueQuestions = (items: SpacedRepetitionItem[]): SpacedRepetitionItem[] => {
  if (!Array.isArray(items)) {
    return [];
  }

  const now = Date.now();
  return items.filter(item => Number.isFinite(item.nextReviewDate) && item.nextReviewDate <= now);
};

/**
 * 建立新題目的複習資料。
 */
export const createSpacedRepetitionItem = (questionId: string): SpacedRepetitionItem => {
  ensureQuestionId(questionId);
  const now = Date.now();

  return {
    questionId,
    easinessFactor: DEFAULT_EASINESS_FACTOR,
    interval: 0,
    repetitions: 0,
    nextReviewDate: now,
  };
};
