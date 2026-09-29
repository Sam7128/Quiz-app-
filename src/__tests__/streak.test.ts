import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('../../services/supabase', () => ({
  supabase: {
    auth: {
      getUser: mocks.getUser,
    },
    rpc: mocks.rpc,
  },
}));

import { getLocalStreak, updateCloudStreak, updateLocalStreak } from '../../services/streak';
import { getLocalDateString } from '../../utils/dateUtils';
import { STORAGE_KEYS } from '../../services/storage';

describe('updateCloudStreak', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls update_streak RPC without legacy parameters', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mocks.rpc.mockResolvedValue({ error: null });

    const ok = await updateCloudStreak();

    expect(ok).toBe(true);
    expect(mocks.rpc).toHaveBeenCalledWith('update_streak');
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });
});

describe('updateLocalStreak', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  it('initializes streak to 1 on first study', () => {
    updateLocalStreak();
    const streak = getLocalStreak();
    expect(streak.currentStreak).toBe(1);
    expect(streak.longestStreak).toBe(1);
    expect(streak.lastStudyDate).toBe(getLocalDateString());
  });

  it('does not increment streak if called multiple times on same day', () => {
    updateLocalStreak();
    updateLocalStreak();
    const streak = getLocalStreak();
    expect(streak.currentStreak).toBe(1);
    expect(streak.longestStreak).toBe(1);
  });

  it('increments streak if last study date was yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);

    localStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify({
      currentStreak: 3,
      longestStreak: 3,
      lastStudyDate: yesterdayStr
    }));

    updateLocalStreak();
    const streak = getLocalStreak();
    expect(streak.currentStreak).toBe(4);
    expect(streak.longestStreak).toBe(4);
    expect(streak.lastStudyDate).toBe(getLocalDateString());
  });

  it('resets streak to 1 if last study date was before yesterday (broken streak)', () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    localStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify({
      currentStreak: 5,
      longestStreak: 10,
      lastStudyDate: getLocalDateString(threeDaysAgo)
    }));

    updateLocalStreak();
    const streak = getLocalStreak();
    expect(streak.currentStreak).toBe(1);
    expect(streak.longestStreak).toBe(10); // preserves longest streak
    expect(streak.lastStudyDate).toBe(getLocalDateString());
  });
});

