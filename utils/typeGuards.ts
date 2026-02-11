import { Question } from '../types';

/**
 * Type guard: checks if a question expects multiple answers.
 */
export const isMultipleAnswer = (question: Question): question is Question & { answer: string[] } => {
  return Array.isArray(question.answer);
};

/**
 * Type guard: checks if a question expects a single answer.
 */
export const isSingleAnswer = (question: Question): question is Question & { answer: string } => {
  return typeof question.answer === 'string';
};
