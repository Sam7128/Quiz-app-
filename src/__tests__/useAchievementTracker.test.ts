import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAchievementTracker } from '../../hooks/useAchievementTracker';

// 模擬 RepositoryContext
const mockGetAchievements = vi.fn(async () => [] as string[]);
const mockUnlockAchievement = vi.fn(async () => true);

vi.mock('../../contexts/RepositoryContext', () => ({
  useRepository: () => ({
    getAchievements: mockGetAchievements,
    unlockAchievement: mockUnlockAchievement,
  }),
}));

describe('useAchievementTracker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockGetAchievements.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('應在凌晨 3 點 (03:00) 僅解鎖 early_bird，而不解鎖 night_owl', async () => {
    // 設定系統時間為 2026-06-09 03:00:00
    const mockDate = new Date('2026-06-09T03:00:00');
    vi.setSystemTime(mockDate);

    const { result } = renderHook(() => useAchievementTracker());

    await act(async () => {
      await result.current.trackQuizCompletion({ score: 4, totalQuestions: 5 });
    });

    // 應該呼叫 unlockAchievement
    expect(mockUnlockAchievement).toHaveBeenCalledWith('first_question');
    expect(mockUnlockAchievement).toHaveBeenCalledWith('early_bird');
    expect(mockUnlockAchievement).not.toHaveBeenCalledWith('night_owl');
  });

  it('應在晚上 23 點 (23:00) 僅解鎖 night_owl，而不解鎖 early_bird', async () => {
    // 設定系統時間為 2026-06-09 23:00:00
    const mockDate = new Date('2026-06-09T23:00:00');
    vi.setSystemTime(mockDate);

    const { result } = renderHook(() => useAchievementTracker());

    await act(async () => {
      await result.current.trackQuizCompletion({ score: 4, totalQuestions: 5 });
    });

    expect(mockUnlockAchievement).toHaveBeenCalledWith('first_question');
    expect(mockUnlockAchievement).toHaveBeenCalledWith('night_owl');
    expect(mockUnlockAchievement).not.toHaveBeenCalledWith('early_bird');
  });

  it('應在早上 10 點 (10:00) 既不解鎖 early_bird，亦不解鎖 night_owl', async () => {
    const mockDate = new Date('2026-06-09T10:00:00');
    vi.setSystemTime(mockDate);

    const { result } = renderHook(() => useAchievementTracker());

    await act(async () => {
      await result.current.trackQuizCompletion({ score: 4, totalQuestions: 5 });
    });

    expect(mockUnlockAchievement).toHaveBeenCalledWith('first_question');
    expect(mockUnlockAchievement).not.toHaveBeenCalledWith('early_bird');
    expect(mockUnlockAchievement).not.toHaveBeenCalledWith('night_owl');
  });
});
