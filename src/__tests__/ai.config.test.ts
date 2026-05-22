import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getAIConfig, isAIConfig } from '../../services/ai';
import { STORAGE_KEYS } from '../../services/storage';

describe('AI Config Protection', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('should parse valid AI config correctly', () => {
    const validConfig = {
      provider: 'google',
      apiKey: 'test-api-key',
      model: 'gemini-1.5-flash',
      persist: true
    };
    localStorage.setItem(STORAGE_KEYS.AI_CONFIG, JSON.stringify(validConfig));

    const config = getAIConfig();
    expect(config).not.toBeNull();
    expect(config?.apiKey).toBe('test-api-key');
    expect(config?.provider).toBe('google');
  });

  it('should handle invalid JSON by returning null and clearing storage', () => {
    localStorage.setItem(STORAGE_KEYS.AI_CONFIG, '{invalid-json}');

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const config = getAIConfig();
    expect(config).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.AI_CONFIG)).toBeNull();
    expect(sessionStorage.getItem(STORAGE_KEYS.AI_CONFIG)).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should return null when storage is empty', () => {
    const config = getAIConfig();
    expect(config).toBeNull();
  });

  it('should reject config strings larger than 10KB', () => {
    const largeApiKey = 'a'.repeat(10 * 1024 + 1);
    const largeConfig = {
      provider: 'google',
      apiKey: largeApiKey,
      model: 'gemini-1.5-flash',
      persist: true
    };
    const largeString = JSON.stringify(largeConfig);
    localStorage.setItem(STORAGE_KEYS.AI_CONFIG, largeString);

    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const config = getAIConfig();
    expect(config).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.AI_CONFIG)).toBeNull();
    expect(consoleWarnSpy).toHaveBeenCalled();
  });

  it('should reject config with invalid schema structures', () => {
    const invalidSchemaConfig = {
      provider: 'unknown-provider', // invalid provider
      apiKey: 12345, // should be string
      model: 'gemini-1.5-flash'
    };
    localStorage.setItem(STORAGE_KEYS.AI_CONFIG, JSON.stringify(invalidSchemaConfig));

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const config = getAIConfig();
    expect(config).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.AI_CONFIG)).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should degrade gracefully without throwing if storage clear fails', () => {
    localStorage.setItem(STORAGE_KEYS.AI_CONFIG, '{invalid-json}');

    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('Storage locked');
    });
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const config = getAIConfig();
    expect(config).toBeNull();
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to clear corrupted storage'));
    expect(removeItemSpy).toHaveBeenCalled();
  });

  it('should correctly identify valid and invalid structures in type guard isAIConfig', () => {
    expect(isAIConfig(null)).toBe(false);
    expect(isAIConfig(undefined)).toBe(false);
    expect(isAIConfig({})).toBe(false);
    
    expect(isAIConfig({
      provider: 'google',
      apiKey: 'key',
      model: 'model'
    })).toBe(true);

    expect(isAIConfig({
      provider: 'google',
      apiKey: 123, // wrong type
      model: 'model'
    })).toBe(false);
  });
});
