# 技術設計 - Battle Mode Overhaul

## 1. 蕃茄時鐘整合

**現況**: `FocusTimer.tsx` 是獨立元件，僅在 Dashboard 顯示
**方案**: 在 `QuizCard.tsx` 頂部新增迷你蕃茄時鐘

```
┌─ QuizCard ─────────────────────┐
│ 🍅 12:34  [進度條] 題目 3/20   │
│ ─────────────────────────────  │
│ [戰鬥場景]                      │
│ [題目內容]                      │
└────────────────────────────────┘
```

**檔案變更**: 
- `components/MiniTimer.tsx` [NEW] - 迷你蕃茄時鐘元件
- `QuizCard.tsx` - 整合 MiniTimer

---

## 2. 新攻擊特效系統

**現況**: 僅有 FireballAttack，CSS 動畫為主
**方案**: 增加 `IceArrowAttack.tsx`，重構為通用 `AttackEffect` 元件

**攻擊類型**:
- 火球 (現有)
- 冰箭 (新增) - 使用 `/public/battle/skills/ice_arrow.png`
- 隨機選擇播放

**檔案變更**:
- `components/IceArrowAttack.tsx` [NEW]
- `components/AttackEffect.tsx` [NEW] - 統一攻擊特效入口
- `hooks/useBattleSystem.ts` - 攻擊類型隨機選擇

---

## 3. 成就系統改善

**現況**: `AchievementsCard.tsx` 僅顯示 6 個成就，無法展開
**方案**: 點擊卡片開啟 Modal 顯示完整列表

**新增成就** (12 → 25+):
- 戰鬥類: 首殺 Boss、連續擊敗 5 怪、單場 0 失誤
- 技能類: 觸發 5 連技能、觸發傳說技能
- 學習類: 完成 500 題、1000 題
- 時間類: 週末學習、連續 14 天

**檔案變更**:
- `components/AchievementsModal.tsx` [NEW]
- `constants/achievements.ts` - 新增成就
- `AchievementsCard.tsx` - 點擊開啟 Modal

---

## 4. Boss 機制改善

**現況**: `getMonsterByProgress(defeatedCount)` 每 10 隻怪物出 Boss
**問題**: 基於擊敗數而非題目數

**方案**: 新增 `questionsAnswered` 追蹤，每 10 題出 Boss

**傷害計算改善**:
```typescript
// 新增 Boss 護盾敘述
if (monster.difficulty === 'boss' && damageReduction > 0.3) {
  showDialogue('monster', ['護盾已啟動！', 'Bug 結界展開！']);
}
```

**檔案變更**:
- `types/battleTypes.ts` - 新增 `questionsAnswered`
- `hooks/useBattleSystem.ts` - Boss 出場邏輯

---

## 5. 怪物多樣性

**現況**: `getRandomMonster()` 純隨機
**方案**: Round-Robin 輪流制

```typescript
// 新增怪物池追蹤
monsterPool: string[];  // 剩餘未出現的怪物 ID
seenMonsters: string[]; // 本輪已出現

// 當 pool 空時重置
if (monsterPool.length === 0) {
  monsterPool = [...ALL_NORMAL_MONSTER_IDS];
}
```

**檔案變更**:
- `types/battleTypes.ts` - 新增追蹤欄位
- `hooks/useBattleSystem.ts` - 輪流選怪邏輯
- `constants/monstersData.ts` - 匯出 ID 列表

---

## 6. 傷害平衡與暴擊系統

### 6.1 動態傷害調整

**問題**: `BASE_HERO_DAMAGE = 15` 固定，怪物血量不同導致觀感差異

**方案**: 傷害 = 怪物血量比例 + 基礎值
```typescript
const baseDamage = monster.maxHp * 0.15; // 保底 15% 血
const bonusDamage = 5 + streak * 2;       // 連擊加成
const finalDamage = baseDamage + bonusDamage;
```

### 6.2 暴擊系統

```typescript
interface CritResult {
  isCrit: boolean;
  multiplier: number; // 1.5x ~ 3x
}

const CRIT_CHANCE = 0.15;  // 15% 暴擊率
const CRIT_MULTIPLIER_RANGE = [1.5, 3.0];
```

**視覺效果**:
- 暴擊時螢幕閃光
- 傷害數字變大變金色
- 播放「暴擊！」對話

### 6.3 護盾敘述

當傷害調整幅度大時，透過怪物對話包裝：
- 「我的護盾吸收了傷害！」
- 「Bug 結界展開中...」

**檔案變更**:
- `hooks/useBattleSystem.ts` - 傷害計算重構
- `types/battleTypes.ts` - 暴擊類型
- `components/BattleArena.tsx` - 暴擊視覺效果
- `components/DamageNumber.tsx` [NEW] - 傷害數字顯示
- `constants/battleDialogues.ts` - 護盾對話

---

## 7. 錯題回顧功能

**現況**: `QuizState.wrongQuestionIds` 追蹤錯題，但測驗結束無法複習
**方案**: 結果頁新增「回顧錯題」按鈕

**流程**:
1. 測驗結束 → 顯示結果
2. 點擊「回顧錯題」
3. 展開錯題列表（題目 + 正確答案 + 解析）

**檔案變更**:
- `App.tsx` - 新增 `sessionMistakes` 狀態傳遞
- `components/QuizResult.tsx` [NEW] - 結果頁元件
- `QuizCard.tsx` - 結束時回傳錯題

---

## 8. 預設全選題目

**現況**: Dashboard 題目選擇需手動勾選
**方案**: 預設選取全部題庫

**檔案變更**:
- `components/Dashboard.tsx` - 初始化選擇邏輯

---

## 9. 技能圖片整合

**現有圖片** (`/public/battle/skills/`):
- `fireball.png`, `ice_arrow.png`, `thunder_bolt.png`
- `flame_storm.png`, `ice_barrier.png`, `thunder_hammer.png`
- `meteor_strike.png`, `absolute_zero.png`, `judgment_thunder.png`

**現況**: `SkillAnimation.tsx` 使用 lucide-react 圖標
**方案**: 改用實際圖片搭配 CSS 動畫

```tsx
// SkillAnimation.tsx
<motion.img
  src={skill.assetPath}
  className="skill-image"
  animate={{ scale: [0, 1.5, 1], rotate: [0, 360] }}
/>
```

**檔案變更**:
- `components/SkillAnimation.tsx` - 使用圖片資源

---

## 10. 休息站提示

**需求**: 每 20/30 題彈出休息提示，可在設定中自訂或關閉

**方案**: 新增 `RestBreakModal` + 設定選項

```typescript
// Settings 新增選項
interface UserSettings {
  restBreakInterval: 20 | 30 | 0; // 0 = 關閉
}
```

**觸發邏輯**:
```typescript
// QuizCard 或 App 層
if (restBreakInterval > 0 && currentIndex > 0 && currentIndex % restBreakInterval === 0) {
  showRestBreakModal();
}
```

**Modal 內容**:
- 🧘 「休息一下吧！」
- 已完成題數統計
- 「繼續答題」/「回到首頁」按鈕

**檔案變更**:
- `components/RestBreakModal.tsx` [NEW]
- `components/Settings.tsx` - 新增休息站間隔設定
- `QuizCard.tsx` / `App.tsx` - 觸發邏輯

---

## 11. 進度持久化

**問題**: 刷新/退出後進度消失
**方案**: 使用 localStorage 儲存當前測驗狀態

**儲存結構**:
```typescript
interface SavedQuizProgress {
  bankIds: string[];
  questionIds: string[];
  currentIndex: number;
  score: number;
  wrongQuestionIds: string[];
  battleState?: Partial<BattleState>;
  savedAt: number; // timestamp
}
```

**儲存時機**:
- 每答完一題
- `beforeunload` 事件

**恢復邏輯**:
1. App 啟動時檢查 `mindspark_quiz_progress`
2. 若存在且未過期 (< 24 小時)，顯示「繼續上次進度？」提示
3. 用戶選擇繼續 → 恢復狀態
4. 用戶選擇放棄 → 清除儲存

**檔案變更**:
- `services/storage.ts` - 新增 `saveQuizProgress`, `loadQuizProgress`, `clearQuizProgress`
- `App.tsx` - 啟動時檢測並顯示恢復提示
- `QuizCard.tsx` - 答題後儲存進度
- `components/ResumePrompt.tsx` [NEW] - 恢復進度提示元件

---

## 12. 數字鍵快捷

**現況**: `useKeyboardShortcuts.ts` 已支援 1-4 數字鍵
**問題**: 用戶可能不知道此功能

**方案**: 在選項旁顯示數字提示

```tsx
// QuizCard 選項按鈕
<button>
  <span className="shortcut-hint">1</span>
  {option}
</button>
```

**樣式**: 小圓角方框，類似鍵盤按鍵外觀

**檔案變更**:
- `components/QuizCard.tsx` - 選項旁顯示數字提示
