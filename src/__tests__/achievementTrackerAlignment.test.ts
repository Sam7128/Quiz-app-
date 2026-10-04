import { describe, it, expect } from 'vitest';
import { ACHIEVEMENTS, IMPLEMENTED_ACHIEVEMENT_IDS } from '../../constants/achievements';
import { TRACKED_ACHIEVEMENT_IDS } from '../../hooks/useAchievementTracker';

describe('Achievement Tracker Alignment', () => {
  it('IMPLEMENTED_ACHIEVEMENT_IDS 與 TRACKED_ACHIEVEMENT_IDS 必須 100% 雙向對齊', () => {
    expect(IMPLEMENTED_ACHIEVEMENT_IDS.size).toBe(4);
    expect(TRACKED_ACHIEVEMENT_IDS.size).toBe(4);

    // 檢查 IMPLEMENTED 是否全都在 TRACKED 中
    for (const id of IMPLEMENTED_ACHIEVEMENT_IDS) {
      expect(TRACKED_ACHIEVEMENT_IDS.has(id)).toBe(true);
    }

    // 檢查 TRACKED 是否全都在 IMPLEMENTED 中
    for (const id of TRACKED_ACHIEVEMENT_IDS) {
      expect(IMPLEMENTED_ACHIEVEMENT_IDS.has(id)).toBe(true);
    }

    // 直接集合相等比對
    expect(Array.from(IMPLEMENTED_ACHIEVEMENT_IDS).sort()).toEqual(
      Array.from(TRACKED_ACHIEVEMENT_IDS).sort()
    );
  });

  it('所有已實作成就 ID 必須存在於 ACHIEVEMENTS 常數定義中', () => {
    const allAchievementIds = new Set(ACHIEVEMENTS.map((a) => a.id));

    for (const id of IMPLEMENTED_ACHIEVEMENT_IDS) {
      expect(allAchievementIds.has(id)).toBe(true);
    }
  });
});
