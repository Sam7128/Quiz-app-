import { describe, expect, it } from 'vitest';
import { resolveNvidiaBaseUrl } from '../../services/ai';

describe('resolveNvidiaBaseUrl', () => {
  it('throws a clear error in production when baseUrl is missing', () => {
    expect(() => resolveNvidiaBaseUrl(undefined, true, 'https://app.example.com')).toThrow(
      /正式環境需設定自訂 baseUrl/
    );
  });

  it('throws a clear error in production when default nvidia url is used', () => {
    expect(() => resolveNvidiaBaseUrl('https://integrate.api.nvidia.com/v1', true, 'https://app.example.com')).toThrow(
      /正式環境需設定自訂 baseUrl/
    );
  });

  it('uses local proxy path in non-production when baseUrl is missing', () => {
    const url = resolveNvidiaBaseUrl(undefined, false, 'https://app.example.com');
    expect(url).toBe('https://app.example.com/api/nvidia');
  });

  it('uses custom baseUrl when provided', () => {
    const url = resolveNvidiaBaseUrl('https://proxy.example.com/v1', true, 'https://app.example.com');
    expect(url).toBe('https://proxy.example.com/v1');
  });
});

