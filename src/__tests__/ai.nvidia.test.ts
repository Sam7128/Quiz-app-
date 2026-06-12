import { describe, expect, it } from 'vitest';
import { resolveNvidiaBaseUrl } from '../../services/ai';

describe('resolveNvidiaBaseUrl', () => {
  it('uses local proxy path in production when baseUrl is missing', () => {
    const url = resolveNvidiaBaseUrl(undefined, true, 'https://app.example.com');
    expect(url).toBe('https://app.example.com/api/nvidia');
  });

  it('uses local proxy path in production when default nvidia url is used', () => {
    const url = resolveNvidiaBaseUrl('https://integrate.api.nvidia.com/v1', true, 'https://app.example.com');
    expect(url).toBe('https://app.example.com/api/nvidia');
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

