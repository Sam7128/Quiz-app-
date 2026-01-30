import { Question, MistakeLog, BankMetadata, Folder } from '../types';

const STORAGE_KEYS = {
  LEGACY_BANK: 'mindspark_question_bank', // For migration
  BANKS_META: 'mindspark_banks_meta',
  BANK_PREFIX: 'mindspark_bank_',
  MISTAKES: 'mindspark_mistake_log',
  CURRENT_BANK_ID: 'mindspark_current_bank_id',
  FOLDERS: 'mindspark_folders', // New key
  FOLDER_MAP: 'mindspark_bank_folder_map', // Independent map for cloud/local
};

// --- Folder Management ---

export const getBankFolderMap = (): Record<string, string> => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.FOLDER_MAP);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    return {};
  }
};

export const saveBankFolderMap = (map: Record<string, string>) => {
  localStorage.setItem(STORAGE_KEYS.FOLDER_MAP, JSON.stringify(map));
};

export const updateBankFolder = (bankId: string, folderId: string | undefined) => {
  const map = getBankFolderMap();
  if (folderId) {
    map[bankId] = folderId;
  } else {
    delete map[bankId];
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