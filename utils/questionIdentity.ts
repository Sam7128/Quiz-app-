import type { Question } from '../types';
import { generateUUID, isUuid } from './uuid';

export interface ImportAnalysis {
  rawCount: number;
  duplicateSourceKeyMergedCount: number;
  duplicateFingerprintMergedCount: number;
  dedupedCount: number;
  matchedExistingCount: number;
  newQuestionCount: number;
  updatedQuestionCount: number;
  skippedMatchedCount: number;
  removedQuestionCount: number;
  finalQuestionCount: number;
}

export type ImportMode = 'append' | 'merge' | 'replace';

const normalizeText = (value: string): string => {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
};

const normalizeAnswer = (answer: Question['answer']): string => {
  if (Array.isArray(answer)) {
    return [...answer]
      .map((entry) => normalizeText(entry))
      .sort()
      .join('|');
  }

  return normalizeText(answer);
};

const hashString = (value: string): string => {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `qfp_${(hash >>> 0).toString(16).padStart(8, '0')}`;
};

export const normalizeSourceQuestionKey = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
};

export const createQuestionFingerprint = (
  question: Pick<Question, 'question' | 'options' | 'answer' | 'type'>
): string => {
  const payload = [
    normalizeText(question.question),
    question.options.map((option) => normalizeText(option)).join('|'),
    normalizeAnswer(question.answer),
    question.type ?? 'single',
  ].join('::');

  return hashString(payload);
};

export const normalizeQuestionForPersistence = (question: Question): Question => {
  return {
    ...question,
    sourceQuestionKey:
      question.sourceQuestionKey ?? normalizeSourceQuestionKey(question.original_question_id),
    sourceFingerprint: createQuestionFingerprint(question),
  };
};

export const createImportedQuestion = (question: Question): Question => {
  const externalKey =
    question.sourceQuestionKey ??
    normalizeSourceQuestionKey(question.original_question_id) ??
    normalizeSourceQuestionKey(question.id);

  return {
    ...question,
    id: generateUUID(),
    original_question_id: externalKey ?? question.original_question_id,
    sourceQuestionKey: externalKey,
    sourceFingerprint: createQuestionFingerprint(question),
  };
};

const prepareImportQuestions = (
  existingQuestions: Question[],
  importedQuestions: Question[]
): {
  normalizedExisting: Question[];
  resolvedImported: Question[];
  matchedImported: Question[];
  newImported: Question[];
  duplicateSourceKeyMergedCount: number;
  duplicateFingerprintMergedCount: number;
} => {
  const normalizedExisting = existingQuestions.map((question) => normalizeQuestionForPersistence(question));

  const existingBySourceKey = new Map<string, Question>();
  const existingByFingerprint = new Map<string, Question>();

  normalizedExisting.forEach((question) => {
    if (question.sourceQuestionKey) {
      existingBySourceKey.set(question.sourceQuestionKey, question);
    }

    if (question.sourceFingerprint) {
      existingByFingerprint.set(question.sourceFingerprint, question);
    }
  });

  const importedPrepared = importedQuestions.map((question) => createImportedQuestion(question));
  const dedupedImport = new Map<string, Question>();

  importedPrepared.forEach((question) => {
      const dedupeKey = question.sourceQuestionKey ?? question.sourceFingerprint ?? generateUUID();
      dedupedImport.set(dedupeKey, question);
    });

  const resolvedImported = Array.from(dedupedImport.values()).map((question) => {
    const matchedByKey = question.sourceQuestionKey
      ? existingBySourceKey.get(question.sourceQuestionKey)
      : undefined;
    const matchedByFingerprint = question.sourceFingerprint
      ? existingByFingerprint.get(question.sourceFingerprint)
      : undefined;
    const matchedQuestion = matchedByKey ?? matchedByFingerprint;

    return normalizeQuestionForPersistence({
      ...question,
      id: matchedQuestion ? matchedQuestion.id : question.id,
      sourceQuestionKey: question.sourceQuestionKey ?? matchedQuestion?.sourceQuestionKey,
      original_question_id:
        question.original_question_id ?? matchedQuestion?.original_question_id,
    });
  });

  const existingIds = new Set(normalizedExisting.map((question) => String(question.id)));
  const matchedImported = resolvedImported.filter((question) => existingIds.has(String(question.id)));
  const newImported = resolvedImported.filter((question) => !existingIds.has(String(question.id)));

  const duplicateSourceKeyMergedCount = Array.from(
    importedPrepared.reduce<Map<string, number>>((groups, question) => {
      if (question.sourceQuestionKey) {
        groups.set(question.sourceQuestionKey, (groups.get(question.sourceQuestionKey) ?? 0) + 1);
      }
      return groups;
    }, new Map<string, number>()).values()
  )
    .filter((count) => count > 1)
    .reduce((sum, count) => sum + count - 1, 0);

  const fingerprintGroups = importedPrepared
    .filter((question) => !question.sourceQuestionKey)
    .reduce<Map<string, number>>((groups, question) => {
      if (question.sourceFingerprint) {
        groups.set(question.sourceFingerprint, (groups.get(question.sourceFingerprint) ?? 0) + 1);
      }
      return groups;
    }, new Map<string, number>());

  const duplicateFingerprintMergedCount = Array.from(fingerprintGroups.values())
    .filter((count) => count > 1)
    .reduce((sum, count) => sum + count - 1, 0);

  return {
    normalizedExisting,
    resolvedImported,
    matchedImported,
    newImported,
    duplicateSourceKeyMergedCount,
    duplicateFingerprintMergedCount,
  };
};

export const planQuestionImport = (
  existingQuestions: Question[],
  importedQuestions: Question[],
  mode: ImportMode = 'replace'
): { questions: Question[]; analysis: ImportAnalysis } => {
  const prepared = prepareImportQuestions(existingQuestions, importedQuestions);

  const replacedExisting = new Map(
    prepared.normalizedExisting.map((question) => [String(question.id), question] as const)
  );
  prepared.matchedImported.forEach((question) => {
    replacedExisting.set(String(question.id), question);
  });

  let finalQuestions: Question[];
  let updatedQuestionCount = 0;
  let skippedMatchedCount = 0;
  let removedQuestionCount = 0;

  if (mode === 'append') {
    finalQuestions = [...prepared.normalizedExisting, ...prepared.newImported];
    skippedMatchedCount = prepared.matchedImported.length;
  } else if (mode === 'merge') {
    finalQuestions = [...replacedExisting.values(), ...prepared.newImported];
    updatedQuestionCount = prepared.matchedImported.length;
  } else {
    finalQuestions = prepared.resolvedImported;
    updatedQuestionCount = prepared.matchedImported.length;
    removedQuestionCount = Math.max(prepared.normalizedExisting.length - prepared.matchedImported.length, 0);
  }

  return {
    questions: finalQuestions,
    analysis: {
      rawCount: importedQuestions.length,
      duplicateSourceKeyMergedCount: prepared.duplicateSourceKeyMergedCount,
      duplicateFingerprintMergedCount: prepared.duplicateFingerprintMergedCount,
      dedupedCount:
        importedQuestions.length -
        prepared.duplicateSourceKeyMergedCount -
        prepared.duplicateFingerprintMergedCount,
      matchedExistingCount: prepared.matchedImported.length,
      newQuestionCount: prepared.newImported.length,
      updatedQuestionCount,
      skippedMatchedCount,
      removedQuestionCount,
      finalQuestionCount: finalQuestions.length,
    },
  };
};

export const mergeImportedQuestions = (
  existingQuestions: Question[],
  importedQuestions: Question[]
): Question[] => {
  return planQuestionImport(existingQuestions, importedQuestions, 'replace').questions;
};

export const analyzeImportQuestions = (
  existingQuestions: Question[],
  importedQuestions: Question[],
  mode: ImportMode = 'replace'
): ImportAnalysis => {
  return planQuestionImport(existingQuestions, importedQuestions, mode).analysis;
};

export const ensureStableQuestionId = (question: Question): Question => {
  if (typeof question.id === 'string' && question.id.trim().length > 0) {
    return normalizeQuestionForPersistence(question);
  }

  return normalizeQuestionForPersistence({
    ...question,
    id: generateUUID(),
  });
};


