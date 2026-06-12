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

---

## 分階段練習整合 (Chunked Practice Integration)

### Requirement: Battle state reset on chunk boundary
戰鬥系統 SHALL 在分階段練習模式的 Chunk 邊界（開始新 Chunk 時）重置戰鬥狀態，將每個 Chunk 視為獨立的一場戰鬥。
- 當 `QuizState.mode === 'chunked'` 且進入新的 Chunk 時，系統 SHALL 呼叫 `startBattle()` 重新初始化戰鬥。
- `streak`、`questionsAnswered` SHALL 歸零。
- `monsterPool` SHALL 重新填充（怪物可跨 Chunk 重複出現）。
- `pendingSkill` SHALL 清空。

### Requirement: Game Mode toggle during an in-progress chunk
當使用者在分階段練習的 Chunk 進行中切換 Game Mode，系統 SHALL 有明確且可預期的初始化規則，且不得影響測驗進度。

#### Scenario: Toggle game mode ON mid-chunk
- **WHEN** 使用者在 `QuizState.mode === 'chunked'` 且 Chunk status 為 `in_progress` 時，將 Game Mode 由 OFF 切換為 ON
- **THEN** 系統 SHALL 呼叫 `startBattle()` 初始化戰鬥
- **THEN** `battleState.streak`、`battleState.questionsAnswered` SHALL 從 0 開始計算（不追溯既已作答的題目）
- **THEN** Chunk 的題目進度與作答狀態 SHALL 不受影響

#### Scenario: Toggle game mode OFF mid-chunk
- **WHEN** 使用者在 `QuizState.mode === 'chunked'` 且 Chunk status 為 `in_progress` 時，將 Game Mode 由 ON 切換為 OFF
- **THEN** 測驗流程 SHALL 不受影響
- **THEN** 戰鬥狀態的持久化規則 SHALL 維持原本設計（不寫入 practice session cloud data）

#### Scenario: Battle state not persisted in practice session cloud data
- **WHEN** 系統保存分階段練習的 Chunk 完成狀態到雲端
- **THEN** `BattleState` SHALL NOT 被包含在 `PracticeChunk` 的持久化資料中
- **THEN** 戰鬥狀態 SHALL 僅存在於本地記憶體和 `mindspark_battle_state` localStorage key 中

---

## 安全防護與健全性變更

### Requirement: Battle system timers must be tracked and cleaned up on unmount
`useBattleSystem` 中所有 `setTimeout` 呼叫 SHALL 使用 `useRef` 追蹤計時器 ID，並在 hook 卸載時清理，防止記憶體洩漏。

#### Scenario: Timer cleanup on unmount during spawn animation
- **WHEN** `triggerAnswer(true)` 觸發怪物死亡動畫中的 `setTimeout(spawnNewMonster, 1500)`
- **AND** 用戶在 1500ms 內離開答題頁面
- **THEN** 計時器 SHALL 被 `clearTimeout` 取消
- **AND** `spawnNewMonster` SHALL NOT 被呼叫
- **AND** 不會產生 "Can't perform React state update on unmounted component" 警告

#### Scenario: All setTimeout calls use ref tracking
- **WHEN** `triggerAnswer` 函數內呼叫 `setTimeout`
- **THEN** 計時器 ID SHALL 被儲存至 `spawnTimerRef.current`
- **AND** 卸載清理 `useEffect` SHALL 清理 `spawnTimerRef`

### Requirement: Monster array bounds check
`getNextMonster` SHALL 在 `allMonsters` 陣列為空時提供安全的 fallback，防止 `undefined` 導致的白屏崩潰。

#### Scenario: Empty monster pool
- **WHEN** `getMonstersByDifficulty(difficulty)` 回傳空陣列
- **THEN** 系統 SHALL 嘗試 fallback 至 `getMonstersByDifficulty('normal')`
- **AND** 若仍為空，系統 SHALL 拋出明確的 Error 訊息而非 `undefined` 存取崩潰

#### Scenario: Normal monster pool available
- **WHEN** `getMonstersByDifficulty(difficulty)` 回傳非空陣列
- **THEN** 系統 SHALL 正常選擇怪物（現有行為不變）

### Requirement: Double submission prevention in QuizCard
QuizCard 的 `submitAnswer` SHALL 使用同步的 `useRef` 鎖定機制防止在 React 批量更新期間的重複提交，並保證在網路或 API 異常時能安全重置鎖定以防死鎖。

#### Scenario: Rapid double-click on single-choice option
- **WHEN** 用戶在 100ms 內對同一個選項快速點擊兩次
- **THEN** `submitAnswer` SHALL 只被有效執行一次
- **AND** 第二次點擊 SHALL 被 `isSubmittingRef.current` 檢查攔截

#### Scenario: Ref reset on question change
- **WHEN** 題目切換至下一題（`question` prop 變更）
- **THEN** `isSubmittingRef.current` SHALL 被重設為 `false`
- **AND** 用戶 SHALL 能正常提交新題目的答案

#### Scenario: Submit error lock release
- **WHEN** `submitAnswer` 執行期間發生網絡超時、API 錯誤或拋出未捕獲異常
- **THEN** 系統 SHALL 在 `catch` 或 `finally` 區塊中將 `isSubmittingRef.current` 重設為 `false`
- **AND** 用戶 SHALL 能夠重新點擊按鈕再次提交答案，UI 不會發生永久卡死

### Requirement: AI-generated question content sanitization
`generateQuestionsFromPDF` 回傳的題目 SHALL 對所有文字欄位（question, options, hint, explanation）使用 DOMPurify 進行 HTML 消毒。

#### Scenario: AI returns clean text
- **WHEN** AI 回傳的題目文字不含任何 HTML 標籤
- **THEN** DOMPurify 消毒後內容 SHALL 保持不變

#### Scenario: AI returns text with script injection
- **WHEN** AI 回傳的題目文字包含 `<script>alert('xss')</script>` 或 `<iframe>` 標籤
- **THEN** DOMPurify SHALL 移除所有危險標籤
- **AND** 回傳的題目文字 SHALL 只包含純文字內容

### Requirement: FocusTimer AudioContext cleanup
FocusTimer 的 `playNotificationSound` SHALL 在振盪器停止後關閉 `AudioContext`，防止瀏覽器 AudioContext 實例數溢出。

#### Scenario: Sound plays and context closes
- **WHEN** 番茄鐘時間到觸發音效
- **THEN** `oscillator.stop()` 後 100ms 內 SHALL 呼叫 `audioContext.close()`
- **AND** 釋放的 AudioContext 不再佔用瀏覽器配額

#### Scenario: Audio not supported
- **WHEN** 瀏覽器不支援 AudioContext
- **THEN** 系統 SHALL 靜默處理（catch 區塊記錄日誌）
- **AND** 不影響其他功能

### Requirement: Achievement time boundary correction
`useAchievementTracker` 的 `night_owl` 成就 SHALL 限定觸發時間為 22:00 ~ 23:59（不含凌晨），避免與 `early_bird` 的 0:00 ~ 5:59 時段重疊。

#### Scenario: Study at midnight (00:00-05:59)
- **WHEN** 用戶在凌晨 0:00 ~ 5:59 完成答題
- **THEN** 系統 SHALL 只觸發 `early_bird` 成就
- **AND** 系統 SHALL NOT 觸發 `night_owl` 成就

#### Scenario: Study at night (22:00-23:59)
- **WHEN** 用戶在晚上 22:00 ~ 23:59 完成答題
- **THEN** 系統 SHALL 只觸發 `night_owl` 成就
- **AND** 系統 SHALL NOT 觸發 `early_bird` 成就
