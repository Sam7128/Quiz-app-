import { supabase } from './supabase';
import { Question, BankMetadata, SpacedRepetitionItem, SyncLocalToCloudResult } from '../types';
import { normalizeToUuid } from '../utils/uuid';
import {
  STORAGE_KEYS,
  getAllPracticeSessions,
  replaceAllPracticeSessions,
  savePracticeSession as saveLocalPracticeSession,
  clearChunkDraftsForSession,
  getBanksMeta,
  saveBanksMeta
} from './storage';
import { ensureStableQuestionId, normalizeQuestionForPersistence } from '../utils/questionIdentity';
import { ChunkedPracticeSession } from '../types/battleTypes';

// Circuit breaker for practice_sessions table missing (graceful degradation)
let isCloudPracticeAvailable = true;
let isSyncingPracticeSessions = false;

const SYNC_LOCK_NAME = 'mindspark_practice_sync';
const SYNC_LOCK_TIMEOUT_MS = 30_000;
const FALLBACK_LOCK_KEY = 'mindspark_sync_lock_ts';

const BANKS_SYNC_LOCK_NAME = 'mindspark_banks_sync';
const BANKS_FALLBACK_LOCK_KEY = 'mindspark_banks_sync_lock_ts';

const runWithSyncLock = async <T>(
  cb: () => Promise<T>,
  lockName: string = SYNC_LOCK_NAME,
  fallbackKey: string = FALLBACK_LOCK_KEY
): Promise<T> => {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
  if (locks) {
    return new Promise<T>((resolve, reject) => {
      locks.request(lockName, { mode: 'exclusive', ifAvailable: true }, async (lock) => {
        if (lock === null) {
          reject(new Error('Sync lock held'));
          return;
        }
        try {
          const result = await cb();
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });
    });
  } else {
    const raw = localStorage.getItem(fallbackKey);
    const now = Date.now();
    if (raw) {
      const ts = parseInt(raw, 10);
      if (!isNaN(ts) && now - ts < SYNC_LOCK_TIMEOUT_MS) {
        throw new Error('Sync lock held');
      }
    }
    
    const token = now.toString();
    localStorage.setItem(fallbackKey, token);
    
    try {
      return await cb();
    } finally {
      const current = localStorage.getItem(fallbackKey);
      if (current === token) {
        localStorage.removeItem(fallbackKey);
      }
    }
  }
};

const checkIsTableMissingError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const errObj = error as Record<string, unknown>;
  const msg = typeof errObj.message === 'string' ? errObj.message : '';
  const code = typeof errObj.code === 'string' ? errObj.code : '';
  const hint = typeof errObj.hint === 'string' ? errObj.hint : '';
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('banks')
      .select('*, questions(count)')
      .eq('user_id', user.id);

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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.warn('[CloudStorage] deleteCloudBank called without authenticated user.');
    return;
  }

  const { error } = await supabase
    .from('banks')
    .delete()
    .eq('id', bankId)
    .eq('user_id', user.id);

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

const addDirtyBank = (bankId: string) => {
  try {
    const raw = localStorage.getItem('mindspark_dirty_banks');
    const list = raw ? JSON.parse(raw) : [];
    if (Array.isArray(list) && !list.includes(bankId)) {
      list.push(bankId);
      localStorage.setItem('mindspark_dirty_banks', JSON.stringify(list));
    }
  } catch (e) {
    console.warn('Failed to add dirty bank to local storage:', e);
  }
};

const removeDirtyBank = (bankId: string) => {
  try {
    const raw = localStorage.getItem('mindspark_dirty_banks');
    if (!raw) return;
    const list = JSON.parse(raw);
    if (Array.isArray(list)) {
      const filtered = list.filter(id => id !== bankId);
      if (filtered.length === 0) {
        localStorage.removeItem('mindspark_dirty_banks');
      } else {
        localStorage.setItem('mindspark_dirty_banks', JSON.stringify(filtered));
      }
    }
  } catch (e) {
    console.warn('Failed to remove dirty bank from local storage:', e);
  }
};

export const retryCleanupDirtyBanks = async (): Promise<void> => {
  try {
    const raw = localStorage.getItem('mindspark_dirty_banks');
    if (!raw) return;
    const list: unknown = JSON.parse(raw);
    if (!Array.isArray(list) || list.length === 0) return;
    
    console.info('[CloudStorage] Retrying cleanup for dirty banks:', list);
    const remaining: string[] = [];
    
    for (const bankId of list) {
      if (typeof bankId !== 'string') continue;
      try {
        const localQuestionsRaw = localStorage.getItem(STORAGE_KEYS.BANK_PREFIX + bankId);
        const localQuestions = localQuestionsRaw ? JSON.parse(localQuestionsRaw) : [];
        if (localQuestions.length > 0) {
          const keepIds = localQuestions.map((q: unknown) => normalizeToUuid(ensureStableQuestionId(q as Question).id));
          const keepIdsSet = new Set(keepIds);
          
          const { data: cloudQuestions, error: fetchError } = await supabase
            .from('questions')
            .select('id')
            .eq('bank_id', bankId);
            
          if (fetchError) {
            remaining.push(bankId);
            continue;
          }
          
          const cloudIds = (cloudQuestions ?? []).map(q => q.id);
          const toDeleteIds = cloudIds.filter(id => !keepIdsSet.has(id));
          
          if (toDeleteIds.length > 0) {
            let hasError = false;
            const batchSize = 500;
            for (let i = 0; i < toDeleteIds.length; i += batchSize) {
              const chunk = toDeleteIds.slice(i, i + batchSize);
              const { error: deleteError } = await supabase
                .from('questions')
                .delete()
                .in('id', chunk);
              if (deleteError) {
                hasError = true;
                break;
              }
            }
            if (hasError) {
              remaining.push(bankId);
            } else {
              console.info(`Retry cleanup success for bank ${bankId}`);
            }
          }
        } else {
          const { error } = await supabase.from('questions').delete().eq('bank_id', bankId);
          if (error) {
            remaining.push(bankId);
          }
        }
      } catch (e) {
        remaining.push(bankId);
      }
    }
    
    if (remaining.length > 0) {
      localStorage.setItem('mindspark_dirty_banks', JSON.stringify(remaining));
    } else {
      localStorage.removeItem('mindspark_dirty_banks');
    }
  } catch (e) {
    console.warn('Failed to retry dirty banks cleanup:', e);
  }
};

export const saveCloudQuestions = async (bankId: string, questions: Question[], forceDeleteAll: boolean = false) => {
  addDirtyBank(bankId);

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
    if (!forceDeleteAll) {
      console.warn('[CloudStorage] saveCloudQuestions: Attempted to delete all questions without forceDeleteAll flag');
      throw new Error('Prevented accidental deletion of all questions. Force flag required.');
    }
    console.info('[CloudStorage] saveCloudQuestions: keepIds is empty, will delete all questions for bank:', bankId);
    const { error: deleteAllError } = await supabase.from('questions').delete().eq('bank_id', bankId);
    if (deleteAllError) {
      console.warn('Error cleaning up cloud questions (delete all, non-fatal):', deleteAllError.message);
      addDirtyBank(bankId);
    } else {
      removeDirtyBank(bankId);
    }
    return;
  }

  // 獲取雲端該題庫現有的題目 IDs，找出需要被刪除的 orphans
  const { data: cloudQuestions, error: fetchError } = await supabase
    .from('questions')
    .select('id')
    .eq('bank_id', bankId);

  if (fetchError) {
    console.warn('Failed to fetch cloud question IDs for cleanup (non-fatal):', fetchError.message);
    addDirtyBank(bankId);
    return;
  }

  const cloudIds = (cloudQuestions ?? []).map(q => q.id);
  const keepIdsSet = new Set(keepIds);
  const toDeleteIds = cloudIds.filter(id => !keepIdsSet.has(id));

  if (toDeleteIds.length > 0) {
    console.info(`[CloudStorage] Cleaning up ${toDeleteIds.length} orphan questions from bank ${bankId}`);
    const batchSize = 500;
    let hasDeleteError = false;
    for (let i = 0; i < toDeleteIds.length; i += batchSize) {
      const chunk = toDeleteIds.slice(i, i + batchSize);
      const { error: deleteError } = await supabase
        .from('questions')
        .delete()
        .in('id', chunk);

      if (deleteError) {
        console.warn('Cloud question cleanup failed (non-fatal):', deleteError.message);
        addDirtyBank(bankId);
        hasDeleteError = true;
        break; // 出錯時中斷，剩餘留待 retry
      }
    }
    if (!hasDeleteError) {
      removeDirtyBank(bankId);
    }
  } else {
    removeDirtyBank(bankId);
  }
};

/**
 * Migration: Local -> Cloud
 */
export const syncLocalToCloud = async (localBanks: BankMetadata[]): Promise<SyncLocalToCloudResult> => {
  return runWithSyncLock(async () => {
    // 重試髒題庫清理
    await retryCleanupDirtyBanks().catch(e => console.warn('Retry cleanup dirty banks failed:', e));

    const successIds: string[] = [];
    const failed: { id: string; name: string; error: string }[] = [];

    if (localBanks.length === 0) {
      return { successIds, failed };
    }

    // 限制同時同步的 bank 數量為 3
    const concurrencyLimit = 3;

    for (let i = 0; i < localBanks.length; i += concurrencyLimit) {
      const chunk = localBanks.slice(i, i + concurrencyLimit);

      const chunkPromises = chunk.map(async (bank) => {
        // 1. Create bank in cloud
        const cloudBankId = await createCloudBank(bank.name, bank.description || 'From local storage');
        if (!cloudBankId) {
          throw new Error('Failed to create bank in cloud');
        }
        // 2. Get local questions
        const localQuestions = JSON.parse(localStorage.getItem(STORAGE_KEYS.BANK_PREFIX + bank.id) || '[]');
        // 3. Save to cloud
        await saveCloudQuestions(cloudBankId, localQuestions);
        return { id: bank.id, cloudBankId };
      });

      const results = await Promise.allSettled(chunkPromises);

      const currentBanks = getBanksMeta();
      results.forEach((r, idx) => {
        const bank = chunk[idx];
        if (r.status === 'fulfilled') {
          successIds.push(bank.id);
          const target = currentBanks.find(b => b.id === bank.id);
          if (target) {
            target.cloudSyncedAt = Date.now();
          }
        } else {
          const reason = r.reason instanceof Error ? r.reason.message : String(r.reason);
          console.error(`Error syncing bank ${bank.name} (${bank.id}):`, reason);
          failed.push({
            id: bank.id,
            name: bank.name,
            error: reason
          });
        }
      });
      saveBanksMeta(currentBanks);
    }

    return { successIds, failed };
  }, BANKS_SYNC_LOCK_NAME, BANKS_FALLBACK_LOCK_KEY);
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

  // 1. 同步並發鎖防護
  if (isSyncingPracticeSessions) {
    console.warn('[Sync] Already syncing practice sessions, skipping');
    return EMPTY_SYNC_RESULT;
  }

  isSyncingPracticeSessions = true;

  try {
    return await runWithSyncLock(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return EMPTY_SYNC_RESULT;

      const localSessions = getAllPracticeSessions();

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

      if (localSessions.length === 0 && (!cloudRows || cloudRows.length === 0)) {
        return EMPTY_SYNC_RESULT;
      }

      const cloudMap = new Map<string, ChunkedPracticeSession>(
        ((cloudRows ?? []) as PracticeSessionRow[]).map((row) => [row.id, fromPracticeSessionRow(row)])
      );

      const updatedLocalSessions: ChunkedPracticeSession[] = [];
      const dirtySessions: ChunkedPracticeSession[] = [];
      let uploaded = 0;
      let skipped = 0;

      // 處理本地的 sessions，並跟雲端做對比
      for (const localSession of localSessions) {
        const cloudSession = cloudMap.get(localSession.id);
        
        const now = Date.now();
        const driftThreshold = 60 * 60 * 1000; // 1 小時
        let isLocalNewer = false;

        if (!cloudSession) {
          isLocalNewer = true;
        } else {
          // 時鐘漂移與異常防護
          const isLocalFuture = localSession.updatedAt > now + 5 * 60 * 1000;
          const isLocalDriftedAhead = localSession.updatedAt - cloudSession.updatedAt > driftThreshold;
          
          if (isLocalFuture || isLocalDriftedAhead) {
            console.warn(
              `[Sync] Detected potential clock drift for session ${localSession.id}. ` +
              `Local: ${new Date(localSession.updatedAt).toISOString()}, ` +
              `Cloud: ${new Date(cloudSession.updatedAt).toISOString()}. Overriding with cloud version.`
            );
            isLocalNewer = false;
          } else {
            isLocalNewer = localSession.updatedAt > cloudSession.updatedAt;
          }
        }

        if (!isLocalNewer) {
          skipped += 1;
          if (cloudSession) {
            if (cloudSession.updatedAt > localSession.updatedAt) {
              console.info(`[Sync] Cloud session is newer for ${localSession.id}. Overwriting local and clearing chunk drafts.`);
              clearChunkDraftsForSession(cloudSession.id);
            }
            updatedLocalSessions.push(cloudSession);
          } else {
            updatedLocalSessions.push(localSession);
          }
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

      // 處理「本地沒有但雲端有」的 sessions
      // 規格定義同步方向為 本機→雲端，因此 cloud-only sessions 不拉回本機
      // Cloud-only sessions 會保留在雲端不被刪除，但不會寫入 localStorage
      const localSessionIds = new Set(localSessions.map((s) => s.id));
      for (const [cloudId] of cloudMap.entries()) {
        if (!localSessionIds.has(cloudId)) {
          console.info(`[Sync] Cloud-only session ${cloudId} preserved on cloud (not pulled to local per spec).`);
          skipped += 1;
        }
      }

      replaceAllPracticeSessions(updatedLocalSessions);
      return { uploaded, skipped, dirty: dirtySessions.length };
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    if (message === 'Sync lock held') {
      console.warn('[Sync] Sync lock held, skipping syncLocalPracticeSessions');
      return EMPTY_SYNC_RESULT;
    }
    if (message.includes('aborted') || message.includes('AbortError')) {
      console.info('Sync local practice sessions aborted gracefully.');
    } else {
      console.error('Unexpected error during syncLocalPracticeSessions:', err);
    }
    return EMPTY_SYNC_RESULT;
  } finally {
    isSyncingPracticeSessions = false;
  }
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
