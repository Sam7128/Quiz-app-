# 變更規格 - Battle Mode Overhaul

## 新增檔案

### `components/MiniTimer.tsx`
迷你蕃茄時鐘元件，顯示於 QuizCard 頂部
- Props: `isActive`, `timeLeft`, `onToggle`
- 顯示: 🍅 圖標 + MM:SS 格式

### `components/IceArrowAttack.tsx`
冰箭攻擊動畫元件
- 使用 `/public/battle/skills/ice_arrow.png`
- Framer Motion 動畫
- Props: `startX`, `startY`, `targetX`, `targetY`, `damage`

### `components/AttackEffect.tsx`
統一攻擊特效入口：隨機選擇火球或冰箭
- Props: `type: 'fireball' | 'ice_arrow' | 'random'`

### `components/AchievementsModal.tsx`
成就詳細列表 Modal
- 分類顯示: 已解鎖 / 未解鎖
- 進度條顯示總完成度
- 點擊卡片關閉

### `components/DamageNumber.tsx`
浮動傷害數字顯示
- Props: `damage`, `isCrit`, `position`
- 暴擊時: 放大 + 金色 + "暴擊!" 文字

### `components/QuizResult.tsx`
測驗結果頁面
- 顯示得分、準確率、連擊紀錄
- 「回顧錯題」按鈕
- 錯題列表（可展開）

### `components/RestBreakModal.tsx`
休息站提示 Modal
- 🧘 「休息一下吧！」訊息
- 已完成題數統計
- 「繼續答題」/「回到首頁」按鈕

### `components/ResumePrompt.tsx`
恢復進度提示元件
- 檢測到未完成測驗時顯示
- 顯示上次進度（題數/時間）
- 「繼續」/「重新開始」按鈕

---

## 修改檔案

### `types/battleTypes.ts`
```typescript
// 新增欄位
interface BattleState {
  questionsAnswered: number;    // 已作答題數
  monsterPool: string[];        // 剩餘怪物池
  seenMonsters: string[];       // 已出現怪物
}

// 新增類型
interface CritResult {
  isCrit: boolean;
  multiplier: number;
}

interface DamageResult {
  baseDamage: number;
  critResult: CritResult;
  finalDamage: number;
  shieldAbsorbed?: number;
}

// 進度持久化
interface SavedQuizProgress {
  bankIds: string[];
  questionIds: string[];
  currentIndex: number;
  score: number;
  wrongQuestionIds: string[];
  battleState?: Partial<BattleState>;
  savedAt: number;
}

// 用戶設定
interface UserSettings {
  restBreakInterval: 20 | 30 | 0; // 0 = 關閉
}
```

### `hooks/useBattleSystem.ts`
- 新增 `calculateDamage()` - 動態傷害計算
- 新增 `rollCrit()` - 暴擊判定
- 新增 `getNextMonster()` - 輪流選怪
- 修改 `handleCorrectAnswer()` - 整合上述系統
- 修改 `spawnNewMonster()` - 基於 `questionsAnswered` 判斷 Boss

### `components/SkillAnimation.tsx`
- 修改 `CSSSkillEffect`: 支持多層粒子、漸層光環、螢幕震動。
- 修改 `VideoSkillEffect`: 新增 Loading 指示器 (`SUMMONING...`)。
- 影片載入失敗 Fallback: 使用增強版 CSS 動畫 (包含全螢幕閃光 + 強烈震動 + 加量粒子)。

### `components/BattleArena.tsx`
- 整合 `AttackEffect` 取代硬編碼 `FireballAttack`
- 新增暴擊螢幕閃光效果
- 顯示 `DamageNumber` 浮動傷害
- **怪物縮放**: 根據 `visualScale` 數據自動調整 (Boss 1.5x, Elite 1.25x)。

### `components/QuizCard.tsx`
- 頂部新增 `MiniTimer`
- 結束時回傳 `wrongQuestionIds`

### `components/AchievementsCard.tsx`
- 點擊時開啟 `AchievementsModal`

### `constants/skillsData.ts`
- **技能觸發**: 改為 `streak % 5 === 0 && streak > 0` (每 5 題觸發一次)。

### `constants/battleDialogues.ts`
新增護盾相關對話

### `constants/monstersData.ts`
- **血量分層**:
    - Boss (龍/巫師): 500-700 HP
    - Elite (骷髏戰士/獸人): 180-220 HP
- 新增 `NORMAL_MONSTER_IDS` 匯出
- 新增 `ELITE_MONSTER_IDS` 匯出

### `services/storage.ts`
- 新增 `saveQuizProgress()` - 儲存測驗進度
- 新增 `loadQuizProgress()` - 載入測驗進度
- 新增 `clearQuizProgress()` - 清除測驗進度

### `components/Settings.tsx`
- 新增「休息站間隔」選項 (20 題 / 30 題 / 關閉)

---

## 資料結構變更

### localStorage
新增:
- `mindspark_crit_count` - 累計暴擊次數
- `mindspark_boss_kills` - Boss 擊殺數
- `mindspark_quiz_progress` - 測驗進度 (SavedQuizProgress)
- `mindspark_settings` - 用戶設定 (包含 restBreakInterval)
