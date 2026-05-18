# Battle Mode Bugfix - Design

## Architecture Overview
此修復影響三個主要模組：
- `constants/skillsData.ts` - 技能定義與觸發邏輯
- `hooks/useBattleSystem.ts` - 戰鬥傷害計算
- `constants/monstersData.ts` - 怪物資料定義

## Design Decisions

### 1. 技能動畫類型
**決策**: 將 `sequence` 動畫類型統一為 `css`
**理由**: `SkillAnimation.tsx` 僅支持 `css` 和 `video` 兩種類型，`sequence` 未被實作

### 2. 技能觸發里程碑
**決策**: 只在等級提升點觸發技能 (5, 10, 20, 30, 40, 50)
**理由**: 減少技能觸發頻率，增強里程碑感

### 3. 傷害護盾擴展
**決策**: 將護盾機制擴展到所有怪物類型
**配置**:
- 普通怪物: 最大傷害 70% 血量
- 精英怪物: 最大傷害 50% 血量
- Boss: 最大傷害 40% 血量

### 4. 骷髏巫師視覺比例
**決策**: `visualScale` 從 1.5 調整為 1.8
**理由**: 增強 Boss 氣勢，與主角形成更明顯對比

## Data Flow
```
答題正確 → useBattleSystem.triggerAnswer()
         ↓
    shouldTriggerSkill(streak) → 判斷是否觸發技能
         ↓
    calculateDamage() → 計算傷害 (含護盾機制)
         ↓
    SkillAnimation → 渲染技能動畫
```
