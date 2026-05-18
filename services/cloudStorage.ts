import { supabase } from './supabase';
import { Question, BankMetadata, SpacedRepetitionItem } from '../types';
import { normalizeToUuid } from '../utils/uuid';
import {
  STORAGE_KEYS,
  getAllPracticeSessions,
  replaceAllPracticeSessions,
  savePracticeSession as saveLocalPracticeSession
} from './storage';
import { ensureStableQuestionId, normalizeQuestionForPersistence } from '../utils/questionIdentity';
import { ChunkedPracticeSession } from '../types/battleTypes';

// Circuit breaker for practice_sessions table missing (graceful degradation)
let isCloudPracticeAvailable = true;

const checkIsTableMissingError = (error: any): boolean => {
  if (!error) return false;
  const msg = typeof error.message === 'string' ? error.message : '';
  const code = typeof error.code === 'string' ? error.code : '';
  const hint = typeof error.hint === 'string' ? error.hint : '';
  return (
    code === 'PGRST205' || 
    msg.toLowerCase().includes('practice_sessions') && msg.toLowerCase().includes('not found') || 
    msg.toLowerCase().includes('schema cache') ||
    hint.toLowerCase().includes('study_sessions')
  );
};

/**
 * Cloud Storage Service (Supabase)
 * All operations here require an authenticated user.
 */

export const getCloudBanks = async (): Promise<BankMetadata[]> => {
  try {
    const { data, error } = await supabase
      .from('banks')
      .select('*, questions(count)');

    if (error) {
      const isAbort = error.message?.includes('aborted') || error.message?.includes('AbortError');
      if (isAbort) {
        console.info('Fetch cloud banks aborted gracefully.');
        return [];
      }
      console.error('Error fetching cloud banks:', error);
      return [];
    }

    return (data ?? []).map(bank => ({
      id: bank.id,
      name: bank.title,
      createdAt: new Date(bank.created_at).getTime(),
      questionCount: bank.questions?.[0]?.count || 0,
      description: bank.description,
      folderId: bank.folder_id ?? undefined
    }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    if (message.includes('aborted') || message.includes('AbortError')) {
      console.info('Fetch cloud banks aborted gracefully (exception).');
    } else {
      console.error('Unexpected error fetching cloud banks:', err);
    }
    return [];
  }
};

export const createCloudBank = async (title: string, description: string = '', folderId?: string): Promise<string | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('banks')
    .insert({
      title,
      description,
      user_id: user.id,
      folder_id: folderId || null
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating cloud bank:', error);
    return null;
  }
  return data.id;
};

export const deleteCloudBank = async (bankId: string) => {
  const { error } = await supabase
    .from('banks')
    .delete()
    .eq('id', bankId);

  if (error) console.error('Error deleting cloud bank:', error);
};

export const updateCloudBankFolder = async (bankId: string, folderId: string | undefined) => {
  const { error } = await supabase
    .from('banks')
    .update({ folder_id: folderId || null })
    .eq('id', bankId);

  if (error) console.error('Error updating cloud bank folder:', error);
};

export const getCloudQuestions = async (bankId: string): Promise<Question[]> => {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('bank_id', bankId);

  if (error) {
    console.error('Error fetching cloud questions:', error);
    return [];
  }

  return data.map(q => ({
    id: q.id,
    original_question_id: q.original_question_id ?? undefined,
    sourceQuestionKey: q.source_question_key ?? undefined,
    sourceFingerprint: q.source_fingerprint ?? undefined,
    question: q.question,
    options: q.options,
    answer: q.answer,
    type: q.type,
    hint: q.hint,
    explanation: q.explanation
  }));
};

export const saveCloudQuestions = async (bankId: string, questions: Question[]) => {
  const dedupedById = new Map<string, Question>();

  questions
    .map((question) => normalizeQuestionForPersistence(ensureStableQuestionId(question)))
    .forEach((question) => {
      dedupedById.set(normalizeToUuid(question.id), question);
    });

  const normalized = Array.from(dedupedById.values()).map((q) => ({
    ...q,
    id: normalizeToUuid(q.id),
  }));

  const toUpsert = normalized.map(q => ({
    id: q.id,
    bank_id: bankId,
    original_question_id: q.original_question_id ?? null,
    source_question_key: q.sourceQuestionKey ?? null,
    source_fingerprint: q.sourceFingerprint ?? null,
    question: q.question,
    options: q.options,
    answer: q.answer,
    type: q.type,
    hint: q.hint,
    explanation: q.explanation
  }));

  const { error: upsertError } = await supabase
    .from('questions')
    .upsert(toUpsert, { onConflict: 'id' });

  if (upsertError) {
    console.error('Error saving cloud questions (upsert):', upsertError);
    throw new Error(`Failed to save cloud questions: ${upsertError.message}`);
  }

  // Cleanup rows that were removed locally: delete questions in this bank not in keep list.
  const keepIds = Array.from(new Set(normalized.map((q) => q.id))).filter((id) => typeof id === 'string' && id.length > 0);

  if (keepIds.length === 0) {
    const { error: deleteAllError } = await supabase.from('questions').delete().eq('bank_id', bankId);
    if (deleteAllError) {
      console.error('Error cleaning up cloud questions (delete all):', deleteAllError);
      throw new Error(`Failed to clean up cloud questions: ${deleteAllError.message}`);
    }
    return;
  }

  // PostgREST expects `(uuid1,uuid2,...)` formatting for uuid lists in `in` filters.
  const inList = `(${keepIds.join(',')})`;
  const { error: cleanupError } = await supabase
    .from('questions')
    .delete()
    .eq('bank_id', bankId)
    .not('id', 'in', inList);

  if (cleanupError) {
    console.error('Error cleaning up cloud questions:', cleanupError);
    throw new Error(`Failed to clean up cloud questions: ${cleanupError.message}`);
  }
};

/**
 * Migration: Local -> Cloud
 */
export const syncLocalToCloud = async (localBanks: BankMetadata[]) => {
  const uploadPromises = localBanks.map(async (bank) => {
    // 1. Create bank in cloud
    const cloudBankId = await createCloudBank(bank.name, bank.description || 'From local storage');
    if (cloudBankId) {
      // 2. Get local questions
      const localQuestions = JSON.parse(localStorage.getItem(STORAGE_KEYS.BANK_PREFIX + bank.id) || '[]');
      // 3. Save to cloud
      await saveCloudQuestions(cloudBankId, localQuestions);
    }
  });
  await Promise.all(uploadPromises);
};

type PracticeSessionStatus = 'active' | 'completed' | 'abandoned';

interface PracticeSessionRow {
  id: string;
  user_id: string;
  bank_ids: string[];
  bank_names: string[];
  bank_question_map: Record<string, string[]>;
  chunk_size: number;
  question_ids: string[];
  chunks: ChunkedPracticeSession['chunks'];
  status: PracticeSessionStatus;
  created_at: string;
  updated_at: string;
}

const toIsoTimestamp = (value: number): string => new Date(value).toISOString();

const toPracticeSessionRow = (session: ChunkedPracticeSession, userId: string): PracticeSessionRow => ({
  id: session.id,
  user_id: userId,
  bank_ids: session.bankIds,
  bank_names: session.bankNames,
  bank_question_map: session.bankQuestionMap,
  chunk_size: session.chunkSize,
  question_ids: session.questionIds,
  chunks: session.chunks,
  status: session.status,
  created_at: toIsoTimestamp(session.createdAt),
  updated_at: toIsoTimestamp(session.updatedAt),
});

const fromPracticeSessionRow = (row: PracticeSessionRow): ChunkedPracticeSession => ({
  id: row.id,
  userId: row.user_id,
  bankIds: row.bank_ids,
  bankNames: row.bank_names,
  bankQuestionMap: row.bank_question_map ?? {},
  chunkSize: row.chunk_size,
  questionIds: row.question_ids,
  chunks: row.chunks,
  status: row.status,
  createdAt: new Date(row.created_at).getTime(),
  updatedAt: new Date(row.updated_at).getTime(),
  dirty: false,
  retryCount: 0,
});

export interface PracticeSyncResult {
  uploaded: number;
  skipped: number;
  dirty: number;
}

const EMPTY_SYNC_RESULT: PracticeSyncResult = { uploaded: 0, skipped: 0, dirty: 0 };

export const getCloudPracticeSessions = async (): Promise<ChunkedPracticeSession[]> => {
  if (!isCloudPracticeAvailable) return [];

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  try {
    const { data, error } = await supabase
      .from('practice_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      const isAbort = error.message?.includes('aborted') || error.message?.includes('AbortError');
      if (isAbort) {
        console.info('Fetch cloud practice sessions aborted gracefully.');
        return [];
      }
      console.error('Error fetching cloud practice sessions:', error);
      if (checkIsTableMissingError(error)) {
        isCloudPracticeAvailable = false;
        console.warn('Supabase practice_sessions table is missing. Gracefully degrading to local-only mode.');
      }
      return [];
    }

    const rows = (data ?? []) as PracticeSessionRow[];
    return rows.map(fromPracticeSessionRow);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    if (message.includes('aborted') || message.includes('AbortError')) {
      console.info('Fetch cloud practice sessions aborted gracefully (exception).');
    } else {
      console.error('Unexpected error fetching cloud practice sessions:', err);
    }
    return [];
  }
};

export const saveCloudPracticeSession = async (session: ChunkedPracticeSession): Promise<void> => {
  if (!isCloudPracticeAvailable) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('未登入，無法儲存分階段練習');
  }

  const row = toPracticeSessionRow({ ...session, userId: user.id }, user.id);
  const { error } = await supabase
    .from('practice_sessions')
    .upsert(row, { onConflict: 'id' });

  if (error) {
    if (checkIsTableMissingError(error)) {
      isCloudPracticeAvailable = false;
      console.warn('Supabase practice_sessions table is missing during save. Gracefully degrading to local-only mode.');
      return;
    }
    throw new Error(`Failed to save cloud practice session: ${error.message}`);
  }
};

export const deleteCloudPracticeSession = async (sessionId: string): Promise<void> => {
  if (!isCloudPracticeAvailable) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('practice_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', user.id);

  if (error) {
    if (checkIsTableMissingError(error)) {
      isCloudPracticeAvailable = false;
      console.warn('Supabase practice_sessions table is missing during delete. Gracefully degrading to local-only mode.');
      return;
    }
    throw new Error(`Failed to delete cloud practice session: ${error.message}`);
  }
};

export const abandonCloudPracticeSession = async (sessionId: string): Promise<void> => {
  if (!isCloudPracticeAvailable) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('practice_sessions')
    .update({
      status: 'abandoned',
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .eq('user_id', user.id);

  if (error) {
    if (checkIsTableMissingError(error)) {
      isCloudPracticeAvailable = false;
      console.warn('Supabase practice_sessions table is missing during abandon. Gracefully degrading to local-only mode.');
      return;
    }
    throw new Error(`Failed to abandon cloud practice session: ${error.message}`);
  }
};

export const syncLocalPracticeSessions = async (): Promise<PracticeSyncResult> => {
  if (!isCloudPracticeAvailable) return EMPTY_SYNC_RESULT;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return EMPTY_SYNC_RESULT;

  const localSessions = getAllPracticeSessions();
  if (localSessions.length === 0) return EMPTY_SYNC_RESULT;

  try {
    const { data: cloudRows, error } = await supabase
      .from('practice_sessions')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      // Gracefully handle abort errors
      const isAbort = error.message?.includes('aborted') || error.message?.includes('AbortError');
      if (isAbort) {
        console.info('Fetch cloud practice sessions aborted gracefully.');
        return EMPTY_SYNC_RESULT;
      }

      console.error('Failed to fetch cloud practice sessions before sync:', error);
      if (checkIsTableMissingError(error)) {
        isCloudPracticeAvailable = false;
        console.warn('Supabase practice_sessions table is missing. Gracefully degrading local sync.');
        return EMPTY_SYNC_RESULT;
      }
      const dirtySessions = localSessions.map((session) => ({
        ...session,
        dirty: true,
        retryCount: (session.retryCount ?? 0) + 1,
        lastSyncError: error.message,
      }));
      replaceAllPracticeSessions(dirtySessions);
      return { uploaded: 0, skipped: 0, dirty: dirtySessions.length };
    }

    const cloudMap = new Map<string, ChunkedPracticeSession>(
      ((cloudRows ?? []) as PracticeSessionRow[]).map((row) => [row.id, fromPracticeSessionRow(row)])
    );

    const updatedLocalSessions: ChunkedPracticeSession[] = [];
    const dirtySessions: ChunkedPracticeSession[] = [];
    let uploaded = 0;
    let skipped = 0;

    for (const localSession of localSessions) {
      const cloudSession = cloudMap.get(localSession.id);
      const isLocalNewer = !cloudSession || localSession.updatedAt > cloudSession.updatedAt;

      if (!isLocalNewer) {
        skipped += 1;
        continue;
      }

      try {
        await saveCloudPracticeSession({ ...localSession, userId: user.id, dirty: false, retryCount: 0, lastSyncError: undefined });
        uploaded += 1;
        // 同步成功，在本地存檔為 dirty = false
        updatedLocalSessions.push({
          ...localSession,
          userId: user.id,
          dirty: false,
          retryCount: 0,
          lastSyncError: undefined
        });
      } catch (syncError) {
        const message = syncError instanceof Error ? syncError.message : 'unknown sync error';
        const isAbort = message.includes('aborted') || message.includes('AbortError');
        
        if (isAbort) {
          console.info('Save cloud practice session aborted gracefully during sync.');
          // 中斷時保留本地為 dirty 以供下次重試
          const dirtySession: ChunkedPracticeSession = {
            ...localSession,
            userId: user.id,
            dirty: true,
            retryCount: localSession.retryCount ?? 0,
            lastSyncError: 'Aborted',
          };
          updatedLocalSessions.push(dirtySession);
          dirtySessions.push(dirtySession);
          continue;
        }

        const dirtySession: ChunkedPracticeSession = {
          ...localSession,
          userId: user.id,
          dirty: true,
          retryCount: (localSession.retryCount ?? 0) + 1,
          lastSyncError: message,
        };
        dirtySessions.push(dirtySession);
        updatedLocalSessions.push(dirtySession);
      }
    }

    replaceAllPracticeSessions(updatedLocalSessions);
    return { uploaded, skipped, dirty: dirtySessions.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    if (message.includes('aborted') || message.includes('AbortError')) {
      console.info('Sync local practice sessions aborted gracefully.');
    } else {
      console.error('Unexpected error during syncLocalPracticeSessions:', err);
    }
    return EMPTY_SYNC_RESULT;
  }
};

export const retryDirtyPracticeSessions = async (): Promise<PracticeSyncResult> => {
  const dirtySessions = getAllPracticeSessions().filter((session) => session.dirty === true);
  if (dirtySessions.length === 0) return EMPTY_SYNC_RESULT;
  return syncLocalPracticeSessions();
};

/**
 * Spaced Repetition Cloud Storage
 */

export const getCloudSpacedRepetition = async (): Promise<SpacedRepetitionItem[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('question_progress')
    .select('*')
    .eq('user_id', user.id);

  if (error) {
    console.error('Error fetching spaced repetition data:', error);
    return [];
  }

  return data.map(item => ({
    questionId: item.question_id,
    easinessFactor: Number(item.easiness_factor),
    interval: item.interval,
    repetitions: item.repetitions,
    nextReviewDate: item.next_review_date,
    lastReviewDate: item.last_review_date || undefined
  }));
};

export const saveCloudSpacedRepetition = async (item: SpacedRepetitionItem): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('question_progress')
    .upsert({
      user_id: user.id,
      question_id: item.questionId,
      easiness_factor: item.easinessFactor,
      interval: item.interval,
      repetitions: item.repetitions,
      next_review_date: item.nextReviewDate,
      last_review_date: item.lastReviewDate || null
    }, {
      onConflict: 'user_id,question_id'
    });

  if (error) {
    console.error('Error saving spaced repetition data:', error);
    return false;
  }
  return true;
};

export const batchSaveCloudSpacedRepetition = async (items: SpacedRepetitionItem[]): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const toUpsert = items.map(item => ({
    user_id: user.id,
    question_id: item.questionId,
    easiness_factor: item.easinessFactor,
    interval: item.interval,
    repetitions: item.repetitions,
    next_review_date: item.nextReviewDate,
    last_review_date: item.lastReviewDate || null
  }));

  const { error } = await supabase
    .from('question_progress')
    .upsert(toUpsert, {
      onConflict: 'user_id,question_id'
    });

  if (error) {
    console.error('Error batch saving spaced repetition data:', error);
    return false;
  }
  return true;
};

export const deleteCloudSpacedRepetition = async (questionId: string): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('question_progress')
    .delete()
    .eq('user_id', user.id)
    .eq('question_id', questionId);

  if (error) {
    console.error('Error deleting spaced repetition data:', error);
    return false;
  }
  return true;
};
