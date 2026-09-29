import { beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEYS } from '../../services/storage';

// Hoisted mocks for supabase
const mocks = vi.hoisted(() => {
  let authStateCallback: ((event: string, session: unknown) => void) | null = null;
  return {
    getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    onAuthStateChange: vi.fn().mockImplementation((cb: (event: string, session: unknown) => void) => {
      authStateCallback = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    getAuthStateCallback: () => authStateCallback,
  };
});

vi.mock('../../services/supabase', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
      signOut: mocks.signOut,
    },
  },
}));

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';

describe('AuthContext - SignOut & Data Isolation', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    React.createElement(AuthProvider, null, children)
  );

  it('(a) normal signOut clears non-whitelisted storage and AI keys', async () => {
    localStorage.setItem(STORAGE_KEYS.MISTAKES, JSON.stringify({ 'q-1': 1 }));
    localStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify({ currentStreak: 5 }));
    sessionStorage.setItem(STORAGE_KEYS.AI_CONFIG, JSON.stringify({ apiKey: 'sk-secret' }));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.signOut();
    });

    expect(mocks.signOut).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(STORAGE_KEYS.MISTAKES)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.STREAK)).toBeNull();
    expect(sessionStorage.getItem(STORAGE_KEYS.AI_CONFIG)).toBeNull();
  });

  it('(b) preserves whitelisted preferences (theme, bgm, sfx) on signOut', async () => {
    localStorage.setItem(STORAGE_KEYS.THEME, 'emerald');
    localStorage.setItem(STORAGE_KEYS.BGM_ENABLED, 'true');
    localStorage.setItem(STORAGE_KEYS.SFX_ENABLED, 'true');
    localStorage.setItem(STORAGE_KEYS.STUDY_SESSIONS, JSON.stringify([{ sessionDate: '2026-09-29' }]));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.signOut();
    });

    expect(localStorage.getItem(STORAGE_KEYS.THEME)).toBe('emerald');
    expect(localStorage.getItem(STORAGE_KEYS.BGM_ENABLED)).toBe('true');
    expect(localStorage.getItem(STORAGE_KEYS.SFX_ENABLED)).toBe('true');
    expect(localStorage.getItem(STORAGE_KEYS.STUDY_SESSIONS)).toBeNull();
  });

  it('(c) preserves non-mindspark_ keys across storages', async () => {
    localStorage.setItem('other_app_pref', 'keep');
    sessionStorage.setItem('other_session_item', 'keep_session');

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.signOut();
    });

    expect(localStorage.getItem('other_app_pref')).toBe('keep');
    expect(sessionStorage.getItem('other_session_item')).toBe('keep_session');
  });

  it('(d) try...finally ensures clearUserDataOnSignOut runs even when Supabase throws', async () => {
    mocks.signOut.mockRejectedValueOnce(new Error('TypeError: Failed to fetch (Offline)'));

    localStorage.setItem(STORAGE_KEYS.MISTAKES, JSON.stringify({ 'q-2': 2 }));
    sessionStorage.setItem(STORAGE_KEYS.AI_CONFIG, JSON.stringify({ apiKey: 'sensitive' }));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      try {
        await result.current.signOut();
      } catch (err) {
        expect((err as Error).message).toContain('Failed to fetch');
      }
    });

    // Despite network error, storage must be cleared by finally block
    expect(localStorage.getItem(STORAGE_KEYS.MISTAKES)).toBeNull();
    expect(sessionStorage.getItem(STORAGE_KEYS.AI_CONFIG)).toBeNull();
  });

  it('(e) onAuthStateChange SIGNED_OUT event triggers clearUserDataOnSignOut', async () => {
    localStorage.setItem(STORAGE_KEYS.MISTAKES, JSON.stringify({ 'q-3': 3 }));
    sessionStorage.setItem(STORAGE_KEYS.AI_CONFIG, JSON.stringify({ apiKey: 'sensitive-2' }));

    await act(async () => {
      renderHook(() => useAuth(), { wrapper });
    });

    const authCb = mocks.getAuthStateCallback();
    expect(authCb).toBeDefined();

    act(() => {
      authCb?.('SIGNED_OUT', null);
    });

    expect(localStorage.getItem(STORAGE_KEYS.MISTAKES)).toBeNull();
    expect(sessionStorage.getItem(STORAGE_KEYS.AI_CONFIG)).toBeNull();
  });
});
