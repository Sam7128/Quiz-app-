import { Question, MistakeLog, BankMetadata } from '../types';

const STORAGE_KEYS = {
  LEGACY_BANK: 'mindspark_question_bank', // For migration
  BANKS_META: 'mindspark_banks_meta',
  BANK_PREFIX: 'mindspark_bank_',
  MISTAKES: 'mindspark_mistake_log',
  CURRENT_BANK_ID: 'mindspark_current_bank_id',
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

export const createBank = (name: string): BankMetadata => {
  const banks = getBanksMeta();
  const newBank: BankMetadata = {
    id: crypto.randomUUID(),
    name,
    createdAt: Date.now(),
    questionCount: 0
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