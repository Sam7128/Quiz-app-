## Why

P0 核心體驗與安全修復（SM-2 入口打通、快捷鍵防劫持、UTC 時區、登出隔離、戰鬥佈局）已全數完成並歸檔。然而代碼庫仍存在 5 項 P1 級學習體驗與統計斷層，直接影響使用者的認知糾錯效率、刷題心流、成就系統信任度以及學習數據完整性。現在是補齊這些缺口的最佳時機：基底代碼穩定、測試覆蓋完整、無待修 P0 阻塞。

## What Changes

- **錯題選項對比**：QuizResult 結算頁面在錯題回顧中同時顯示使用者的錯誤選擇（紅字）與正確答案（綠字），取代目前只顯示正確答案的行為。需要將 `userAnswer` 資訊從 `useQuizEngine` 透過 `wrongQuestions` 傳遞到 `QuizResult`。
- **答對自動切題開關**：Settings 新增「答對自動前進」toggle，儲存至 `UserSettings`。QuizCard 在答對時依此設定延遲約 600ms 後自動呼叫 `onNext()`，答錯仍保持停留。RPG 戰鬥模式需延遲等待攻擊動畫結束再推進。
- **成就系統清理**：將 `ACHIEVEMENTS` 常數陣列中未被 `useAchievementTracker` 實作的 18 個幽靈成就標記為隱藏或移除，確保 UI 僅呈現已實作可解鎖的成就（`perfect_score`, `first_question`, `night_owl`, `early_bird`），恢復使用者對成就系統的信任感。
- **統計結算流程補齊**：確保 `onRetry`、`onRestart`、中途 `onExit`（`handleExitQuiz`）等所有退出路徑在啟動新測驗或返回首頁前，先調用 `recordStudySession` 結算上一輪的已答題數、正確數與學習時長。
- **FocusTimer 統計接入**：Dashboard 渲染 `<FocusTimer />` 時傳入 `onSessionComplete` 回呼，將專注計時器完成時長寫入學習統計（透過 `recordStudySession` 以 `questionsAnswered: 0` 記錄純專注時段）。

## Capabilities

### New Capabilities
- `wrong-answer-comparison`: 錯題回顧中的使用者選擇 vs 正確答案對比 UI，需新增 `WrongQuestionReview` 型別並改寫 `QuizResult` 渲染邏輯
- `auto-advance-on-correct`: 答對自動切題功能，需在 `UserSettings` 新增欄位、Settings UI 新增 toggle、QuizCard 讀取設定並自動推進
- `achievement-pruning`: 成就系統清理，將未實作成就從 UI 隱藏
- `study-session-settlement`: 統計結算流程全路徑閉環，確保所有退出路徑均結算
- `focus-timer-stats-binding`: FocusTimer 完成回呼綁定至學習統計記錄

### Modified Capabilities
- `battle-mode`: QuizResult 結算頁面的錯題顯示邏輯變更（新增 `userAnswer` 欄位顯示）

## Impact

- **型別定義**：`types.ts` 或 `types/battleTypes.ts` 新增 `WrongQuestionReview` 介面；`UserSettings` 新增 `autoAdvanceOnCorrect` 欄位
- **元件**：
  - `components/QuizResult.tsx`：props 與渲染邏輯變更
  - `components/QuizCard.tsx`：自動切題計時器邏輯
  - `components/Settings.tsx`：新增 toggle
  - `components/Dashboard.tsx`：FocusTimer prop 綁定
  - `components/AppContent.tsx`：退出路徑結算邏輯
  - `components/AchievementsCard.tsx` / `AchievementsModal.tsx`：僅渲染已實作成就
- **Hooks**：`hooks/useQuizEngine.ts`（handleExitQuiz 結算）
- **Constants**：`constants/achievements.ts`（標記/過濾幽靈成就）
- **Services**：`services/storage.ts`（UserSettings 讀寫的 `autoAdvanceOnCorrect` 預設值）
- **測試**：需為上述所有變更新增或更新對應單元測試
