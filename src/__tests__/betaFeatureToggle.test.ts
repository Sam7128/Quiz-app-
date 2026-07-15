import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getUserSettings, saveUserSettings } from '../../services/storage';

const store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
  removeItem: vi.fn((key: string) => { delete store[key]; }),
  clear: vi.fn(() => { for (const k of Object.keys(store)) delete store[k]; }),
  get length() { return Object.keys(store).length; },
  key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();
});

describe('Beta Feature Toggle (知識圖已畢業為一級功能，此處驗證設定持久化的向下相容性)', () => {
  it('defaults knowledgeGraph to false when no settings exist', () => {
    const settings = getUserSettings();
    expect(settings.betaFeatures?.knowledgeGraph ?? false).toBe(false);
  });

  it('persists beta toggle state', () => {
    const settings = getUserSettings();
    saveUserSettings({
      ...settings,
      betaFeatures: { knowledgeGraph: true },
    });

    const loaded = getUserSettings();
    expect(loaded.betaFeatures?.knowledgeGraph).toBe(true);
  });

  it('safely reads old settings without betaFeatures field', () => {
    store['mindspark_settings'] = JSON.stringify({ restBreakInterval: 20 });
    const settings = getUserSettings();
    expect(settings.betaFeatures).toBeUndefined();
    expect(settings.betaFeatures?.knowledgeGraph ?? false).toBe(false);
  });

  it('toggle off then on round-trips correctly', () => {
    saveUserSettings({ restBreakInterval: 20, betaFeatures: { knowledgeGraph: true } });
    expect(getUserSettings().betaFeatures?.knowledgeGraph).toBe(true);

    saveUserSettings({ restBreakInterval: 20, betaFeatures: { knowledgeGraph: false } });
    expect(getUserSettings().betaFeatures?.knowledgeGraph).toBe(false);
  });
});
