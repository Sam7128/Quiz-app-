## Why

目前戰鬥系統的技能特效過於簡陋（僅為靜態圖片彈出），無法提供沉浸式的遊戲體驗。用戶反饋包括：
1. 連續答對 5 題的技能只顯示簡單圖片，缺乏遊戲級動態特效
2. 30/40/50 連擊的影片技能無法正常載入播放
3. Boss 怪物太容易被秒殺（一擊必殺），缺乏挑戰性
4. 骷髏巫師等怪物圖案/動畫資源不足
5. Challenges API 存在 400 錯誤影響好友對戰功能

## What Changes

### 技能特效系統重構
- **增強 CSS/Canvas 動畫**: 為所有技能等級添加粒子系統、光效、動態動畫
- **每 5 連擊觸發小技能**: 不再只在 5/10/20/30/40/50 固定節點觸發
- **影片載入優化**: 為 30/40/50 連擊的 `.webm` 影片添加更好的 fallback 機制
- **普通攻擊特效**: 從「圖片飛出」升級為帶軌跡、爆炸效果的遊戲級特效

### 遊戲平衡調整
- **怪物分層定義**: 明確區分普通小怪 (1-2 擊)、Elite (3-4 擊)、Big Boss (5+ 擊)
- **Boss 血量提升**: 從 200-250 HP 提升至 400-600 HP
- **傷害公式調整**: 確保需要多次攻擊才能擊敗強敵

### 資源增強
- 增加骷髏巫師的攻擊/受傷/施法動畫幀
- 生成更多技能圖標和特效素材

### Bug 修復
- **BREAKING**: 修復 Supabase challenges 查詢語法錯誤 (400 Error)

## Capabilities

### New Capabilities
- `skill-effects-engine`: 遊戲級技能特效渲染引擎（粒子系統、光效、動態動畫）
- `attack-effects-system`: 增強版普通攻擊特效（軌跡、爆炸、命中反饋）

### Modified Capabilities
- `battle-system`: 調整傷害計算和怪物血量分層機制
- `video-skill-playback`: 增強影片載入和 fallback 處理

## Impact

### 受影響的檔案
- `hooks/useBattleSystem.ts` - 傷害計算、技能觸發邏輯
- `components/SkillAnimation.tsx` - 技能動畫渲染
- `components/BattleArena.tsx` - 戰鬥場景整合
- `components/AttackEffect.tsx` - 普通攻擊特效
- `constants/skillsData.ts` - 技能定義和觸發條件
- `constants/monstersData.ts` - 怪物血量和屬性
- `services/challenges.ts` - Supabase 查詢修復

### 依賴項
- 可能需要引入: `tsparticles` 或 `react-particles` (粒子特效庫)
- 可能需要引入: Canvas 2D 或 WebGL 用於高級特效

### 資源需求
- 生成新的技能特效圖像
- 增加骷髏巫師動畫幀
