import { Question } from '../types';

/**
 * Type guard: checks if a question expects multiple answers.
 */
export const isMultipleAnswer = (question: Question): question is Question & { answer: string[] } => {
  return Array.isArray(question.answer);
};
