# Constants 模組

## 檔案清單

| 檔案 | 職責 |
|------|------|
| `achievements.ts` | 成就定義（ID、解鎖條件、圖示、描述） |
| `skillsData.ts` | 6 階技能系統（Fireball → Ice Arrow → ... → Meteor Shower），含 baseDamage、critChance、animationDuration |
| `monsters.ts` | 3 階怪物定義 (Normal → Elite → Boss)，含 HP、visualScale、難度 |
| `dialogues.ts` | 戰鬥對話文本 |

## 重要邏輯

- **技能觸發條件**: 在 `skillsData.ts` 中定義 milestone 陣列 `[5, 10, 20, 30, 40, 50]`
- **怪物 visualScale**: Boss 類型使用較大 scale（Skeleton Wizard: 1.8）
- **命名**: 常數使用 SCREAMING_SNAKE_CASE（`MAX_RETRIES`）
