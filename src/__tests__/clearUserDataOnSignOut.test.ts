import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearUserDataOnSignOut, SIGNOUT_WHITELIST, STORAGE_KEYS } from '../../services/storage';

describe('clearUserDataOnSignOut', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('(a) removes non-whitelisted mindspark_* keys from localStorage', () => {
    localStorage.setItem(STORAGE_KEYS.MISTAKES, JSON.stringify({ 'q-1': { count: 1 } }));
    localStorage.setItem(STORAGE_KEYS.QUIZ_SESSION, JSON.stringify({ bankIds: ['b1'] }));
    localStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify({ currentStreak: 5 }));
    localStorage.setItem(STORAGE_KEYS.BANKS_META, JSON.stringify([{ id: 'b1', name: 'Test' }]));

    clearUserDataOnSignOut();

    expect(localStorage.getItem(STORAGE_KEYS.MISTAKES)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.QUIZ_SESSION)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.STREAK)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.BANKS_META)).toBeNull();
  });

  it('(b) preserves whitelisted preferences (theme, bgm, sfx) in localStorage', () => {
    expect(SIGNOUT_WHITELIST.has(STORAGE_KEYS.THEME)).toBe(true);
    expect(SIGNOUT_WHITELIST.has(STORAGE_KEYS.BGM_ENABLED)).toBe(true);
    expect(SIGNOUT_WHITELIST.has(STORAGE_KEYS.SFX_ENABLED)).toBe(true);

    localStorage.setItem(STORAGE_KEYS.THEME, 'dark');
    localStorage.setItem(STORAGE_KEYS.BGM_ENABLED, 'true');
    localStorage.setItem(STORAGE_KEYS.SFX_ENABLED, 'false');
    localStorage.setItem(STORAGE_KEYS.STUDY_SESSIONS, JSON.stringify([{ sessionDate: '2026-09-29' }]));

    clearUserDataOnSignOut();

    expect(localStorage.getItem(STORAGE_KEYS.THEME)).toBe('dark');
    expect(localStorage.getItem(STORAGE_KEYS.BGM_ENABLED)).toBe('true');
    expect(localStorage.getItem(STORAGE_KEYS.SFX_ENABLED)).toBe('false');
    expect(localStorage.getItem(STORAGE_KEYS.STUDY_SESSIONS)).toBeNull();
  });

  it('(c) removes all mindspark_* keys from sessionStorage, including AI API keys', () => {
    sessionStorage.setItem(STORAGE_KEYS.AI_CONFIG, JSON.stringify({ apiKey: 'secret-key-123' }));
    sessionStorage.setItem('mindspark_temp_token', 'temp-session-token');

    clearUserDataOnSignOut();

    expect(sessionStorage.getItem(STORAGE_KEYS.AI_CONFIG)).toBeNull();
    expect(sessionStorage.getItem('mindspark_temp_token')).toBeNull();
  });

  it('(d) preserves non-mindspark_ keys in both localStorage and sessionStorage', () => {
    localStorage.setItem('external_library_key', 'keep_me');
    sessionStorage.setItem('third_party_session', 'keep_session_me');

    clearUserDataOnSignOut();

    expect(localStorage.getItem('external_library_key')).toBe('keep_me');
    expect(sessionStorage.getItem('third_party_session')).toBe('keep_session_me');
  });

  it('(e) clears dynamic prefix keys such as bank and chunk draft keys', () => {
    localStorage.setItem(`${STORAGE_KEYS.BANK_PREFIX}custom-bank-123`, JSON.stringify([{ id: 1 }]));
    localStorage.setItem(`${STORAGE_KEYS.CHUNK_DRAFT_PREFIX}:session-xyz:0`, JSON.stringify({ score: 10 }));

    clearUserDataOnSignOut();

    expect(localStorage.getItem(`${STORAGE_KEYS.BANK_PREFIX}custom-bank-123`)).toBeNull();
    expect(localStorage.getItem(`${STORAGE_KEYS.CHUNK_DRAFT_PREFIX}:session-xyz:0`)).toBeNull();
  });

  it('(f) executes safely on empty storage without throwing', () => {
    expect(() => clearUserDataOnSignOut()).not.toThrow();
  });

  it('(g) handles storage exceptions gracefully without crashing', () => {
    const errorSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const origRemove = localStorage.removeItem;
    vi.spyOn(localStorage, 'removeItem').mockImplementationOnce(() => {
      throw new Error('Access denied in private browsing');
    });

    localStorage.setItem('mindspark_throw_key', 'val');
    expect(() => clearUserDataOnSignOut()).not.toThrow();

    localStorage.removeItem = origRemove;
    errorSpy.mockRestore();
  });

  it('(h) clears sessionStorage even when localStorage enumeration throws SecurityError', () => {
    sessionStorage.setItem(STORAGE_KEYS.AI_CONFIG, JSON.stringify({ apiKey: 'sensitive-api-key-xyz' }));
    sessionStorage.setItem('mindspark_temp_key', 'temp_val');

    // Spy on Storage.prototype.key to simulate SecurityError ONLY for localStorage
    const origKey = Storage.prototype.key;
    const keySpy = vi.spyOn(Storage.prototype, 'key').mockImplementation(function (this: Storage, index: number) {
      if (this === localStorage) {
        throw new Error('SecurityError: The operation is insecure in restricted sandbox');
      }
      return origKey.call(this, index);
    });

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      expect(() => clearUserDataOnSignOut()).not.toThrow();
      // Verify that sessionStorage keys were still successfully removed
      expect(sessionStorage.getItem(STORAGE_KEYS.AI_CONFIG)).toBeNull();
      expect(sessionStorage.getItem('mindspark_temp_key')).toBeNull();
    } finally {
      keySpy.mockRestore();
      errorSpy.mockRestore();
    }
  });
});
