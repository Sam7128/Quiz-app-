# Battle System Spec (Delta)

## Overview
調整戰鬥系統的傷害計算和怪物血量分層。

## Changes to Existing Behavior

### CHG-1: 小技能觸發頻率
**Before**: 只在 streak === 5, 10, 20, 30, 40, 50 觸發
**After**: 在 streak % 5 === 0 && streak > 0 時觸發 (每 5 的倍數)

### CHG-2: Boss 血量提升
**Before**: dragon_fire 200 HP, skeleton_wizard 250 HP
**After**: dragon_fire 500 HP, skeleton_wizard 700 HP

### CHG-3: Elite 血量提升
**Before**: skeleton_warrior 100 HP, orc_berserker 120 HP
**After**: skeleton_warrior 180 HP, orc_berserker 220 HP

## Acceptance Criteria

- [ ] 15 連擊時觸發 intermediate 技能
- [ ] 25 連擊時觸發 advanced 技能
- [ ] Boss 需要 3-5 次攻擊才能擊敗 (非一擊必殺)
