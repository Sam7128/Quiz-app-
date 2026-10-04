import { Question } from '../types';

/**
 * Internal helper to check if a value is a non-null, non-array object record.
 */
const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

/**
 * Type guard: strictly verifies whether an unknown value conforms to the Question schema.
 * Rejects invalid IDs, empty questions/options, and answers not found in options (deadlock prevention).
 */
export const isQuestion = (value: unknown): value is Question => {
  if (!isRecord(value)) {
    return false;
  }

  // id: non-empty string or finite number (includes id: 0)
  const isIdValid =
    (typeof value.id === 'string' && value.id.trim().length > 0) ||
    (typeof value.id === 'number' && Number.isFinite(value.id));
  if (!isIdValid) {
    return false;
  }

  // question: non-empty string
  if (typeof value.question !== 'string' || value.question.trim().length === 0) {
    return false;
  }

  // options: non-empty array of non-empty strings
  const options = value.options;
  if (
    !Array.isArray(options) ||
    options.length === 0 ||
    !options.every((opt): opt is string => typeof opt === 'string' && opt.trim().length > 0)
  ) {
    return false;
  }

  // answer: string or string[], must be subset of options
  const answer = value.answer;
  const isSingleAnswerValid =
    typeof answer === 'string' &&
    answer.trim().length > 0 &&
    options.includes(answer);

  const isMultipleAnswerValid =
    Array.isArray(answer) &&
    answer.length > 0 &&
    answer.every(
      (ans): ans is string => typeof ans === 'string' && ans.trim().length > 0 && options.includes(ans)
    );

  if (!isSingleAnswerValid && !isMultipleAnswerValid) {
    return false;
  }

  // Cross-validation of explicit type vs answer structure
  if (value.type === 'single' && !isSingleAnswerValid) {
    return false;
  }
  if (value.type === 'multiple' && !isMultipleAnswerValid) {
    return false;
  }

  // Optional: type ('single' | 'multiple')
  if (value.type !== undefined && value.type !== 'single' && value.type !== 'multiple') {
    return false;
  }

  // Optional: original_question_id
  if (
    value.original_question_id !== undefined &&
    !(
      (typeof value.original_question_id === 'string' && value.original_question_id.trim().length > 0) ||
      (typeof value.original_question_id === 'number' && Number.isFinite(value.original_question_id))
    )
  ) {
    return false;
  }

  // Optional: sourceQuestionKey
  if (value.sourceQuestionKey !== undefined && typeof value.sourceQuestionKey !== 'string') {
    return false;
  }

  // Optional: sourceFingerprint
  if (value.sourceFingerprint !== undefined && typeof value.sourceFingerprint !== 'string') {
    return false;
  }

  // Optional: hint (allow string or undefined)
  if (value.hint !== undefined && typeof value.hint !== 'string') {
    return false;
  }

  // Optional: explanation (allow string or undefined)
  if (value.explanation !== undefined && typeof value.explanation !== 'string') {
    return false;
  }

  // Optional: tags (allow string[] or undefined)
  if (
    value.tags !== undefined &&
    (!Array.isArray(value.tags) || !value.tags.every((t): t is string => typeof t === 'string'))
  ) {
    return false;
  }

  return true;
};

const MAX_LOGGED_WARNINGS = 5;

/**
 * Validates and filters an array of unknown values into a safe subset of Question objects.
 * Applies a warning threshold (max 5 individual logs) and aggregates excessive errors without leaking answer content.
 */
export const parseQuestions = (value: unknown, source = 'unknown'): Question[] => {
  if (!Array.isArray(value)) {
    console.warn(
      `[QuestionGuard] Expected questions array from source "${source}", received ${value === null ? 'null' : typeof value}`,
      { source }
    );
    return [];
  }

  const validQuestions: Question[] = [];
  let invalidCount = 0;

  for (let index = 0; index < value.length; index++) {
    const item = value[index];
    if (isQuestion(item)) {
      validQuestions.push(item);
    } else {
      invalidCount++;
      if (invalidCount <= MAX_LOGGED_WARNINGS) {
        const candidateId =
          isRecord(item) &&
          (typeof item.id === 'string' || (typeof item.id === 'number' && Number.isFinite(item.id)))
            ? String(item.id)
            : undefined;
        console.warn(
          `[QuestionGuard] Invalid question filtered at index ${index} from source "${source}"`,
          { source, index, ...(candidateId !== undefined ? { id: candidateId } : {}) }
        );
      }
    }
  }

  if (invalidCount > MAX_LOGGED_WARNINGS) {
    const suppressedCount = invalidCount - MAX_LOGGED_WARNINGS;
    console.warn(
      `[QuestionGuard] Aggregated warning: ${suppressedCount} additional invalid question(s) filtered from source "${source}" (total invalid: ${invalidCount})`,
      { source, totalInvalid: invalidCount, suppressedCount }
    );
  }

  return validQuestions;
};

/**
 * Type guard: checks if a question expects multiple answers.
 */
export const isMultipleAnswer = (question: Question): question is Question & { answer: string[] } => {
  return Array.isArray(question.answer);
};
