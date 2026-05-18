import { Question, MistakeLog, BankMetadata, Folder, SpacedRepetitionItem } from '../types';

export const STORAGE_KEYS = {
  PREFIX: 'mindspark_',
  LEGACY_BANK: 'mindspark_question_bank', // For migration
  BANKS_META: 'mindspark_banks_meta',
  BANK_PREFIX: 'mindspark_bank_',
  MISTAKES: 'mindspark_mistake_log',
  CURRENT_BANK_ID: 'mindspark_current_bank_id',
  FOLDERS: 'mindspark_folders', // New key
  FOLDER_MAP: 'mindspark_bank_folder_map', // Independent map for cloud/local
  SPACED_REPETITION: 'mindspark_spaced_repetition',
  GAME_MODE: 'mindspark_game_mode',
  STUDY_SESSIONS: 'mindspark_study_sessions',
  STREAK: 'mindspark_streak',
  ACHIEVEMENTS: 'mindspark_achievements',
  AI_CONFIG: 'mindspark_ai_config',
  SOUND_SETTINGS: 'mindspark_sound_settings',
  QUIZ_SESSION: 'mindspark_quiz_session',
  SETTINGS: 'mindspark_settings',
  RECENT_MISTAKES: 'mindspark_recent_mistakes',
  GRAPHS: 'mindspark_graphs',
  PRACTICE_SESSIONS: 'mindspark_practice_sessions',
  CHUNK_DRAFT_PREFIX: 'mindspark_chunk_draft',

  // Explicit keys used outside storage service (registry)
  BGM_ENABLED: 'mindspark_bgm_enabled',
  SFX_ENABLED: 'mindspark_sfx_enabled',
  BATTLE_STATE: 'mindspark_battle_state',
  THEME: 'mindspark_theme',
};

import {
  SavedQuizProgress,
  UserSettings,
  DEFAULT_SETTINGS,
  RecentMistakeSession,
  ChunkedPracticeSession,
  ChunkDraftState
} from '../types/battleTypes';

export const getUserSettings = (): UserSettings => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return data ? JSON.parse(data) : DEFAULT_SETTINGS;
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
};

export const saveUserSettings = (settings: UserSettings) => {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
};

export const getQuizSession = (): SavedQuizProgress | null => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.QUIZ_SESSION);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
};

export const saveQuizSession = (session: SavedQuizProgress) => {
  localStorage.setItem(STORAGE_KEYS.QUIZ_SESSION, JSON.stringify(session));
};

export const clearQuizSession = () => {
  localStorage.removeItem(STORAGE_KEYS.QUIZ_SESSION);
};

const PRACTICE_ACTIVE_LIMIT = 5;
const PRACTICE_TOTAL_LIMIT = 10;

const isChunkedPracticeSession = (value: unknown): value is ChunkedPracticeSession => {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<ChunkedPracticeSession>;
  return (
    typeof candidate.id === 'string' &&
    Array.isArray(candidate.bankIds) &&
    Array.isArray(candidate.bankNames) &&
    typeof candidate.chunkSize === 'number' &&
    Array.isArray(candidate.questionIds) &&
    Array.isArray(candidate.chunks) &&
    typeof candidate.status === 'string'
  );
};

const normalizePracticeSession = (session: ChunkedPracticeSession): ChunkedPracticeSession => {
  const now = Date.now();
  return {
    ...session,
    bankQuestionMap: session.bankQuestionMap ?? {},
    dirty: session.dirty ?? false,
    retryCount: session.retryCount ?? 0,
    createdAt: typeof session.createdAt === 'number' ? session.createdAt : now,
    updatedAt: typeof session.updatedAt === 'number' ? session.updatedAt : now,
  };
};

const sortSessionsByUpdatedAtDesc = (sessions: ChunkedPracticeSession[]): ChunkedPracticeSession[] => {
  return [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);
};

const enforceGuestPracticeSessionLimits = (sessions: ChunkedPracticeSession[]): ChunkedPracticeSession[] => {
  const next = sortSessionsByUpdatedAtDesc(sessions);
  const active = next
    .filter((session) => session.status === 'active')
    .sort((a, b) => a.updatedAt - b.updatedAt);

  const overflow = Math.max(0, active.length - PRACTICE_ACTIVE_LIMIT);
  for (let index = 0; index < overflow; index++) {
    const targetId = active[index]?.id;
    if (!targetId) continue;
    const target = next.find((session) => session.id === targetId);
    if (!target) continue;
    target.status = 'abandoned';
    target.updatedAt = Date.now() + index;
  }

  if (next.length <= PRACTICE_TOTAL_LIMIT) {
    return sortSessionsByUpdatedAtDesc(next);
  }

  const removable = next
    .filter((session) => session.status !== 'active')
    .sort((a, b) => a.updatedAt - b.updatedAt);

  const idsToRemove = new Set<string>();
  let remaining = next.length;
  for (const session of removable) {
    if (remaining <= PRACTICE_TOTAL_LIMIT) break;
    idsToRemove.add(session.id);
    remaining -= 1;
  }

  return sortSessionsByUpdatedAtDesc(next.filter((session) => !idsToRemove.has(session.id)));
};

const persistPracticeSessions = (sessions: ChunkedPracticeSession[]): void => {
  localStorage.setItem(STORAGE_KEYS.PRACTICE_SESSIONS, JSON.stringify(sessions));
};

export const getAllPracticeSessions = (): ChunkedPracticeSession[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRACTICE_SESSIONS);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return sortSessionsByUpdatedAtDesc(
      parsed
        .filter(isChunkedPracticeSession)
        .map((session) => normalizePracticeSession(session))
    );
  } catch (e) {
    console.error('Failed to load practice sessions', e);
    return [];
  }
};

export const replaceAllPracticeSessions = (sessions: ChunkedPracticeSession[]): void => {
  const normalized = sessions.map((session) => normalizePracticeSession(session));
  const limited = enforceGuestPracticeSessionLimits(normalized);
  persistPracticeSessions(limited);
};

export const getPracticeSessions = (): ChunkedPracticeSession[] => {
  return getAllPracticeSessions().filter((session) => session.status === 'active');
};

export const savePracticeSession = (session: ChunkedPracticeSession): ChunkedPracticeSession[] => {
  const normalized = normalizePracticeSession(session);
  const existing = getAllPracticeSessions().filter((item) => item.id !== normalized.id);
  existing.push(normalized);
  const limited = enforceGuestPracticeSessionLimits(existing);
  persistPracticeSessions(limited);
  return limited;
};

export const deletePracticeSession = (sessionId: string): void => {
  const next = getAllPracticeSessions().filter((session) => session.id !== sessionId);
  persistPracticeSessions(next);
  clearChunkDraftsForSession(sessionId);
};

export const removePracticeSessionCache = (sessionId: string): void => {
  const next = getAllPracticeSessions().filter((session) => session.id !== sessionId);
  persistPracticeSessions(next);
};

export const abandonPracticeSession = (sessionId: string): void => {
  const now = Date.now();
  const next: ChunkedPracticeSession[] = getAllPracticeSessions().map((session) => (
    session.id === sessionId
      ? { ...session, status: 'abandoned' as const, updatedAt: now }
      : session
  ));
  const limited = enforceGuestPracticeSessionLimits(next);
  persistPracticeSessions(limited);
  clearChunkDraftsForSession(sessionId);
};

export const markPracticeSessionDirty = (sessionId: string, message?: string): void => {
  const next = getAllPracticeSessions().map((session) => {
    if (session.id !== sessionId) return session;
    return {
      ...session,
      dirty: true,
      retryCount: (session.retryCount ?? 0) + 1,
      lastSyncError: message,
      updatedAt: Date.now(),
    };
  });
  persistPracticeSessions(next);
};

export const clearPracticeSessionDirty = (sessionId: string): void => {
  const next = getAllPracticeSessions().map((session) => {
    if (session.id !== sessionId) return session;
    return {
      ...session,
      dirty: false,
      retryCount: 0,
      lastSyncError: undefined,
    };
  });
  persistPracticeSessions(next);
};

export const getDirtyPracticeSessions = (): ChunkedPracticeSession[] => {
  return getAllPracticeSessions().filter((session) => session.dirty === true);
};

export const getChunkDraftStorageKey = (sessionId: string, chunkIndex: number): string => {
  return `${STORAGE_KEYS.CHUNK_DRAFT_PREFIX}:${sessionId}:${chunkIndex}`;
};

const isChunkDraftState = (value: unknown): value is ChunkDraftState => {
  if (typeof value !== 'object' || value === null) return false;
  const draft = value as Partial<ChunkDraftState>;
  return (
    typeof draft.sessionId === 'string' &&
    typeof draft.chunkIndex === 'number' &&
    typeof draft.currentQuestionIndex === 'number' &&
    typeof draft.score === 'number' &&
    Array.isArray(draft.wrongQuestionIds)
  );
};

export const saveChunkDraft = (draft: ChunkDraftState): void => {
  localStorage.setItem(getChunkDraftStorageKey(draft.sessionId, draft.chunkIndex), JSON.stringify(draft));
};

export const getChunkDraft = (sessionId: string, chunkIndex: number): ChunkDraftState | null => {
  try {
    const raw = localStorage.getItem(getChunkDraftStorageKey(sessionId, chunkIndex));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isChunkDraftState(parsed) ? parsed : null;
  } catch (e) {
    console.error('Failed to parse chunk draft', e);
    return null;
  }
};

export const clearChunkDraft = (sessionId: string, chunkIndex: number): void => {
  localStorage.removeItem(getChunkDraftStorageKey(sessionId, chunkIndex));
};

export const clearChunkDraftsForSession = (sessionId: string): void => {
  const prefix = `${STORAGE_KEYS.CHUNK_DRAFT_PREFIX}:${sessionId}:`;
  const keys: string[] = [];
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index);
    if (key && key.startsWith(prefix)) {
      keys.push(key);
    }
  }
  keys.forEach((key) => localStorage.removeItem(key));
};

export const removeQuestionFromQuizSession = (questionId: string): void => {
  const session = getQuizSession();
  if (!session) return;

  const nextQuestionIds = session.questionIds.filter((id) => id !== questionId);
  const nextWrongIds = session.wrongQuestionIds.filter((id) => id !== questionId);

  if (nextQuestionIds.length === 0) {
    clearQuizSession();
    return;
  }

  saveQuizSession({
    ...session,
    questionIds: nextQuestionIds,
    wrongQuestionIds: nextWrongIds,
    currentIndex: Math.min(session.currentIndex, nextQuestionIds.length - 1),
    savedAt: Date.now(),
  });
};

// --- Game Mode ---

export const getGameMode = (): boolean => {
  const data = localStorage.getItem(STORAGE_KEYS.GAME_MODE);
  return data ? JSON.parse(data) : true; // Default to true (Game Mode ON)
};

export const saveGameMode = (enabled: boolean) => {
  localStorage.setItem(STORAGE_KEYS.GAME_MODE, JSON.stringify(enabled));
};

// --- Folder Management ---

export const getBankFolderMap = (): Record<string, string | null> => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.FOLDER_MAP);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    return {};
  }
};

export const saveBankFolderMap = (map: Record<string, string | null>) => {
  localStorage.setItem(STORAGE_KEYS.FOLDER_MAP, JSON.stringify(map));
};

export const updateBankFolder = (bankId: string, folderId: string | undefined) => {
  const map = getBankFolderMap();
  if (folderId === undefined || folderId === null) {
    // Remove from map completely when moving to root
    delete map[bankId];
  } else {
    map[bankId] = folderId;
  }
  saveBankFolderMap(map);

  // Also update local meta for consistency if user goes offline
  moveBankToFolder(bankId, folderId);
};

export const getFolders = (): Folder[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.FOLDERS);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

export const saveFolders = (folders: Folder[]) => {
  localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(folders));
};

export const createFolder = (name: string): Folder => {
  const folders = getFolders();
  const newFolder: Folder = {
    id: crypto.randomUUID(),
    name,
    createdAt: Date.now(),
  };
  saveFolders([...folders, newFolder]);
  return newFolder;
};

export const deleteFolder = (folderId: string) => {
  // 1. Delete the folder
  const folders = getFolders().filter(f => f.id !== folderId);
  saveFolders(folders);

  // 1.5 Update folder map to move banks to root
  const folderMap = getBankFolderMap();
  Object.keys(folderMap).forEach(bankId => {
    if (folderMap[bankId] === folderId) {
      folderMap[bankId] = null;
    }
  });
  saveBankFolderMap(folderMap);

  // 2. Move banks in this folder back to root (remove folderId)
  const banks = getBanksMeta();
  const updatedBanks = banks.map(b => {
    if (b.folderId === folderId) {
      const { folderId: _, ...rest } = b; // Remove folderId
      return rest;
    }
    return b;
  });
  saveBanksMeta(updatedBanks);
};

// --- Bank Metadata Management ---

export const getBanksMeta = (): BankMetadata[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.BANKS_META);
    if (!data) {
      // Migration check: if legacy data exists but no meta
      const legacy = localStorage.getItem(STORAGE_KEYS.LEGACY_BANK);
      if (legacy) {
        const defaultBank: BankMetadata = {
          id: 'default',
          name: '預設題庫',
          createdAt: Date.now(),
          questionCount: JSON.parse(legacy).length
        };
        localStorage.setItem(STORAGE_KEYS.BANKS_META, JSON.stringify([defaultBank]));
        localStorage.setItem(STORAGE_KEYS.BANK_PREFIX + 'default', legacy);
        localStorage.removeItem(STORAGE_KEYS.LEGACY_BANK);
        return [defaultBank];
      }
      return [];
    }
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
};

export const saveBanksMeta = (banks: BankMetadata[]) => {
  localStorage.setItem(STORAGE_KEYS.BANKS_META, JSON.stringify(banks));
};

export const createBank = (name: string, folderId?: string): BankMetadata => {
  const banks = getBanksMeta();
  const newBank: BankMetadata = {
    id: crypto.randomUUID(),
    name,
    createdAt: Date.now(),
    questionCount: 0,
    folderId // Optional initial folder
  };
  saveBanksMeta([...banks, newBank]);
  saveQuestions(newBank.id, []);
  return newBank;
};

export const deleteBank = (bankId: string) => {
  const banks = getBanksMeta().filter(b => b.id !== bankId);
  saveBanksMeta(banks);
  localStorage.removeItem(STORAGE_KEYS.BANK_PREFIX + bankId);
};

export const moveBankToFolder = (bankId: string, folderId: string | undefined) => {
  const banks = getBanksMeta();
  const updatedBanks = banks.map(b => {
    if (b.id === bankId) {
      // Explicitly handle undefined to remove the key or set it to undefined
      if (folderId === undefined) {
        const { folderId: _, ...rest } = b;
        return rest;
      }
      return { ...b, folderId };
    }
    return b;
  });
  saveBanksMeta(updatedBanks);
};

// --- Current Active Bank ---

export const getCurrentBankId = (): string | null => {
  return localStorage.getItem(STORAGE_KEYS.CURRENT_BANK_ID);
};

export const setCurrentBankId = (id: string) => {
  localStorage.setItem(STORAGE_KEYS.CURRENT_BANK_ID, id);
};

// --- Question Data Management ---

export const getQuestions = (bankId: string): Question[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.BANK_PREFIX + bankId);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

export const saveQuestions = (bankId: string, questions: Question[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.BANK_PREFIX + bankId, JSON.stringify(questions));

    // Update count in metadata
    const banks = getBanksMeta();
    const bankIndex = banks.findIndex(b => b.id === bankId);
    if (bankIndex !== -1) {
      banks[bankIndex].questionCount = questions.length;
      saveBanksMeta(banks);
    }
  } catch (e) {
    console.error("Failed to save questions", e);
  }
};

// --- Mistake Log (Global for now, could be per bank later) ---

export const getMistakeLog = (): MistakeLog => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.MISTAKES);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    return {};
  }
};

export const logMistake = (questionId: string | number, wrongAnswer: string) => {
  const log = getMistakeLog();
  const idStr = String(questionId);

  const entry = log[idStr] || { count: 0, lastWrongAnswer: '', timestamp: 0 };

  log[idStr] = {
    count: entry.count + 1,
    lastWrongAnswer: wrongAnswer,
    timestamp: Date.now(),
  };

  localStorage.setItem(STORAGE_KEYS.MISTAKES, JSON.stringify(log));
};

export const removeMistake = (questionId: string | number) => {
  const log = getMistakeLog();
  const idStr = String(questionId);
  if (log[idStr]) {
    delete log[idStr];
    localStorage.setItem(STORAGE_KEYS.MISTAKES, JSON.stringify(log));
  }
};

export const clearMistakes = () => {
  localStorage.removeItem(STORAGE_KEYS.MISTAKES);
};

// --- Recent Mistake Sessions (FIFO 5) ---

export const getRecentMistakeSessions = (): RecentMistakeSession[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.RECENT_MISTAKES);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

export const addRecentMistakeSession = (session: RecentMistakeSession) => {
  try {
    const list = getRecentMistakeSessions();
    // Premium FIFO: Add new to start, keep max 5
    const updated = [session, ...list].slice(0, 5);
    localStorage.setItem(STORAGE_KEYS.RECENT_MISTAKES, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to add recent mistake session", e);
  }
};

export const clearRecentMistakeSession = (sessionId: string) => {
  const list = getRecentMistakeSessions().filter(s => s.sessionId !== sessionId);
  localStorage.setItem(STORAGE_KEYS.RECENT_MISTAKES, JSON.stringify(list));
};

export const removeQuestionFromRecentMistakeSessions = (questionId: string): void => {
  try {
    const list = getRecentMistakeSessions()
      .map((session) => ({
        ...session,
        mistakes: session.mistakes.filter((mistake) => mistake.questionId !== questionId),
      }))
      .filter((session) => session.mistakes.length > 0);

    localStorage.setItem(STORAGE_KEYS.RECENT_MISTAKES, JSON.stringify(list));
  } catch (e) {
    console.error('Failed to remove question from recent mistake sessions', e);
  }
};

export const clearAllRecentMistakes = () => {
  localStorage.removeItem(STORAGE_KEYS.RECENT_MISTAKES);
};

// --- Spaced Repetition (Local Storage) ---

export const getSpacedRepetition = (): Record<string, SpacedRepetitionItem> => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SPACED_REPETITION);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    console.error('Failed to get spaced repetition data', e);
    return {};
  }
};

export const saveSpacedRepetitionItem = (item: SpacedRepetitionItem): void => {
  try {
    const data = getSpacedRepetition();
    data[item.questionId] = item;
    localStorage.setItem(STORAGE_KEYS.SPACED_REPETITION, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save spaced repetition item', e);
  }
};

export const getSpacedRepetitionItem = (questionId: string): SpacedRepetitionItem | null => {
  const data = getSpacedRepetition();
  return data[questionId] || null;
};

export const deleteSpacedRepetitionItem = (questionId: string): void => {
  try {
    const data = getSpacedRepetition();
    if (data[questionId]) {
      delete data[questionId];
      localStorage.setItem(STORAGE_KEYS.SPACED_REPETITION, JSON.stringify(data));
    }
  } catch (e) {
    console.error('Failed to delete spaced repetition item', e);
  }
};

export const clearSpacedRepetition = (): void => {
  localStorage.removeItem(STORAGE_KEYS.SPACED_REPETITION);
};

export const deleteQuestionArtifacts = (questionId: string): void => {
  removeMistake(questionId);
  deleteSpacedRepetitionItem(questionId);
  removeQuestionFromRecentMistakeSessions(questionId);
  removeQuestionFromQuizSession(questionId);
};

// --- Data Nuke (The "Root Out" functionality) ---

export const nukeAllBanks = () => {
  // Ultra-comprehensive clear: remove all app-owned keys by prefix.
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(STORAGE_KEYS.PREFIX)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach(key => localStorage.removeItem(key));
};
