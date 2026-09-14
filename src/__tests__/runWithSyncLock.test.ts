import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runWithSyncLock } from '../../services/cloudStorage';

describe('runWithSyncLock (LocalStorage Fallback Double-Check Lock Pattern)', () => {
  const originalLocks = Object.getOwnPropertyDescriptor(navigator, 'locks');

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    // Simulate environment without native Web Locks
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: undefined,
    });
  });

  afterEach(() => {
    localStorage.clear();
    if (originalLocks) {
      Object.defineProperty(navigator, 'locks', originalLocks);
    } else {
      Reflect.deleteProperty(navigator, 'locks');
    }
  });

  // 場景 A：正常取得鎖 → 回調執行成功 → 鎖釋放
  it('Scenario A: normal acquisition -> executes callback successfully -> releases lock', async () => {
    const lockKey = 'test_fallback_lock';
    let executed = false;

    const result = await runWithSyncLock(
      async () => {
        executed = true;
        // Verify lock is held during callback execution
        expect(localStorage.getItem(lockKey)).not.toBeNull();
        return 'success';
      },
      'test_lock_name',
      lockKey
    );

    expect(executed).toBe(true);
    expect(result).toBe('success');
    // Lock token should be cleaned up after execution
    expect(localStorage.getItem(lockKey)).toBeNull();
  });

  // 場景 B：另一分頁搶佔 token → double-check 偵測到 → 拋出 Error
  it('Scenario B: another tab preempts token during delay -> double-check detects collision -> throws Error', async () => {
    const lockKey = 'test_preempted_lock';

    // Intercept localStorage.setItem: when our token is written, simulate a concurrent tab overwriting it
    const originalSetItem = localStorage.setItem.bind(localStorage);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => {
      originalSetItem(key, value);
      if (key === lockKey) {
        // Concurrent tab writes its own token right after
        originalSetItem(key, 'other-tab-token-' + Date.now());
      }
    });

    let executed = false;
    await expect(
      runWithSyncLock(
        async () => {
          executed = true;
          return 'should-not-run';
        },
        'test_preempted_lock_name',
        lockKey
      )
    ).rejects.toThrow('Sync lock held by another tab');

    expect(executed).toBe(false);
  });

  // 場景 C：存在超過 30,000ms 的過期 fallback 鎖 → 成功接管執行回調並記錄 console.warn
  it('Scenario C: overrides expired fallback lock and logs console.warn', async () => {
    const lockKey = 'test_expired_lock';
    const expiredTimestamp = Date.now() - 35_000;
    localStorage.setItem(lockKey, String(expiredTimestamp));

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    let executed = false;

    const result = await runWithSyncLock(
      async () => {
        executed = true;
        return 'override-success';
      },
      'test_expired_lock_name',
      lockKey
    );

    expect(executed).toBe(true);
    expect(result).toBe('override-success');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Sync] Detected expired fallback lock')
    );
    warnSpy.mockRestore();
  });
});
