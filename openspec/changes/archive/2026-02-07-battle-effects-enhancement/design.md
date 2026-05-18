# Battle Effects Enhancement - Design

## Overview

本設計文檔描述戰鬥系統增強的技術實現方案，涵蓋三層攻擊系統的特效改進。

## Architecture

### 現有架構

```
┌─────────────────┐     ┌──────────────────┐
│  QuizCard.tsx   │────▶│ useBattleSystem  │
└─────────────────┘     └──────────────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         ▼                     ▼                     ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│  AttackEffect   │   │ SkillAnimation  │   │  BattleArena    │
│  (普通攻擊)     │   │ (小/大技能)     │   │  (場景渲染)     │
└─────────────────┘   └─────────────────┘   └─────────────────┘
```

### 攻擊優先級

```
大技能 (30/40/50連) > 小技能 (5的倍數) > 普通攻擊 (每題)
```

## Decisions

### D1: 使用現有 framer-motion，不引入新依賴
**Rationale**: 項目已有 `framer-motion`，可實現所需的粒子、光環、震動效果，避免增加 bundle size。

### D2: 小技能觸發改為每 5 的倍數
**Rationale**: 讓連擊體驗更豐富，每 5 題都有獎勵反饋。
**Implementation**: 修改 `shouldTriggerSkill`: `streak % 5 === 0 && streak > 0`

### D3: Boss 血量提升至 500-700 HP
**Rationale**: 確保 Boss 戰需要 3-5 次攻擊，增加挑戰感。

### D4: 影片載入失敗時使用增強 CSS fallback
**Rationale**: 確保 30/40/50 連擊的大技能總有華麗效果，即使影片無法載入。

## Component Changes

### SkillAnimation.tsx
- 增強 `CSSSkillEffect`: 多層粒子、漸層光環、螢幕震動
- 優化 `VideoSkillEffect`: loading 狀態 + 增強 fallback

### skillsData.ts
- 修改 `shouldTriggerSkill` 函數邏輯

### monstersData.ts
- 提升 Boss 和 Elite 怪物血量

### challenges.ts
- 修復 Supabase join 語法導致的 400 錯誤

## Risks

| 風險 | 緩解措施 |
|------|----------|
| 動畫過於複雜影響效能 | 使用 GPU 加速 (transform), 限制粒子數量 |
| Boss 血量過高導致無聊 | 保持技能傷害倍率，確保連擊有意義 |
