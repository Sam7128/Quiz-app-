import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AchievementsCard } from '../../components/AchievementsCard';
import { AchievementsModal } from '../../components/AchievementsModal';
import * as useAchievementsModule from '../../hooks/useAchievements';

describe('Achievement Pruning (白名單過濾與髒資料防護)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('AchievementsCard 僅展示 4 個已實作成就且進度分母為 4', () => {
    vi.spyOn(useAchievementsModule, 'useAchievements').mockReturnValue({
      unlockedIds: ['first_question', 'perfect_score'],
      loading: false,
      unlockAchievement: vi.fn(),
      refresh: vi.fn(),
    });

    render(<AchievementsCard />);

    // 應該顯示 2/4
    expect(screen.getByText('2/4')).toBeDefined();

    // 4 個已實作成就標題應在卡片中
    expect(screen.getByText('初次嘗試')).toBeDefined(); // first_question
    expect(screen.getByText('完美答題')).toBeDefined(); // perfect_score
    expect(screen.getByText('夜貓子')).toBeDefined(); // night_owl
    expect(screen.getByText('早起的鳥兒')).toBeDefined(); // early_bird

    // 未實作的幽靈成就（如 屠龍者、怪物獵人 等）不應被渲染
    expect(screen.queryByText('屠龍者')).toBeNull();
    expect(screen.queryByText('怪物獵人')).toBeNull();
    expect(screen.queryByText('小試身手')).toBeNull();
  });

  it('AchievementsCard 應自動過濾歷史未知成就 ID，不計入解鎖進度', () => {
    vi.spyOn(useAchievementsModule, 'useAchievements').mockReturnValue({
      unlockedIds: ['first_question', 'unknown_legacy_id_1', 'ghost_id_999'],
      loading: false,
      unlockAchievement: vi.fn(),
      refresh: vi.fn(),
    });

    render(<AchievementsCard />);

    // 只有 1 個合法已解鎖，所以應顯示 1/4
    expect(screen.getByText('1/4')).toBeDefined();
  });

  it('AchievementsModal 僅渲染白名單中的 4 個成就並過濾未知舊 ID', () => {
    const handleClose = vi.fn();
    const dirtyUnlockedIds = ['first_question', 'unknown_legacy_id', 'ghost_achievement'];

    render(
      <AchievementsModal
        isOpen={true}
        onClose={handleClose}
        unlockedIds={dirtyUnlockedIds}
      />
    );

    // 標題顯示已解鎖 1 / 4
    expect(screen.getByText('已解鎖 1 / 4')).toBeDefined();

    // 白名單中的 4 個成就應存在
    expect(screen.getByText('初次嘗試')).toBeDefined();
    expect(screen.getByText('完美答題')).toBeDefined();
    expect(screen.getByText('夜貓子')).toBeDefined();
    expect(screen.getByText('早起的鳥兒')).toBeDefined();

    // 幽靈成就應不存在
    expect(screen.queryByText('屠龍者')).toBeNull();
    expect(screen.queryByText('博學多聞')).toBeNull();
  });
});
