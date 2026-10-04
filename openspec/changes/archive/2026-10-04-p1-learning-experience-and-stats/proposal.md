## Why

P0 核心體驗與安全修復（SM-2 入口打通、快捷鍵防劫持、UTC 時區、登出隔離、戰鬥佈局）已全數完成並歸檔。然而代碼庫仍存在 5 項 P1 級學習體驗與統計斷層，直接影響使用者的認知糾錯效率、刷題心流、成就系統信任度以及學習數據完整性：
1. 答錯時僅顯示正確答案，缺乏使用者當前選擇的對照與無障礙文字標籤，難以進行認知重構；
2. 答對時必須強制手動切題，打斷流暢心流；
3. 成就介面顯示大量未實作的「幽靈成就」，損害系統信任感且遺留過往未知成就 ID 的髒資料隱患；
4. 退出或中途結束測驗（含 Chunked Practice、RestBreak、重試錯題）缺少統計結算，導致時長與做題數漏計；
5. 番茄鐘 FocusTimer 完成專注後未沉澱學習時長至統計系統。

吸納多方架構審查（Opus、GPT 5.6 Luna、Gemini 3.7 Flash）的交叉比對精華，本變更計畫旨在以最高工程標準實現端到端閉環、無障礙支援、嚴格邊界防禦與全路徑統計持久化。

## What Changes

- **錯題選項對比與無障礙增強**：
  - QuizResult 結算頁在錯題回顧中同時以紅色醒目標示使用者錯誤選擇，以綠色標示正確答案，中立選項保持低調次要樣式。
  - 符合 WCAG Accessibility 標準：除了顏色區分外，增設明確的文字標籤（`❌ 你的選擇` / `✅ 正確答案`）與 ARIA 標籤（`aria-invalid="true"`、`aria-label`），支援色盲色弱使用者與螢幕閱讀器。
  - QuizCard 即時答題回饋同步升級：答錯時即時高亮使用者所選錯誤選項與系統正確答案。
- **答對自動切題開關與邊界防護**：
  - `UserSettings` 新增 `autoAdvanceOnCorrect`（預設關閉），附帶舊設定檔 schema 自動正規化（normalize 防禦）。
  - Settings 介面新增 Toggle 開關與說明文字。
  - QuizCard 在答對時依模式延遲自動推進（標準模式 800ms，RPG 戰鬥模式等待攻擊動畫完成後 400ms，上限 2000ms）。
  - 邊界防護：手動點擊「下一題」或按快捷鍵時立即取消自動切題計時器，防範雙重推進；最後一題答對時自動推進至結算頁（finished）而非無效下一題；元件 unmount 時自動清除定時器防止記憶體洩漏。
- **成就系統清理與雙向對齊**：
  - 建立 `IMPLEMENTED_ACHIEVEMENT_IDS` 白名單，AchievementsCard 與 AchievementsModal 僅渲染已實作成就（4 個）。
  - 保留原始 `ACHIEVEMENTS` 靜態定義供日後擴展，零破壞既有陣列。
  - 容錯防禦：過濾 localStorage 中可能殘留的已廢棄/未知成就 ID，防止 UI 出現 undefined 或崩潰；進度條與總數精確對齊白名單集合（4 個）。
  - 自動化測試雙向對齊：強制檢查 Allowlist 集合與 `useAchievementTracker` 追蹤的成就集合 100% 吻合。
- **統計結算全路徑閉環與冪等防禦**：
  - 全路徑結算覆蓋：`onRetry`、`onRestart`、`onHome`、`handleExitQuiz`（ESC 或退出彈窗）、`ChunkedPractice` 完成/放棄路徑、`RestBreakModal` 提早結束路徑，均呼叫統一結算函式。
  - 冪等性與防重複：引入 session token 與結算鎖，防止使用者快速連續點擊或重複觸發多次寫入。
  - 數據安全防禦：時長引入 `Math.max(1, Math.round(durationSeconds))` 防範 0 秒或負時長；題數為 0 或未開測時安全跳過。
- **FocusTimer 統計接入與生命週期安全**：
  - Dashboard 渲染 `<FocusTimer />` 時綁定 `onSessionComplete` 回呼。
  - 專注時段成功歸零完成時，以 `recordStudySession(0, 0, durationSeconds)` 寫入純專注時長；休息倒數與中途取消/unmount 不予記錄。
  - 統計防污染防禦：`getStudyStats` / `getDailyStats` 正確率計算自動排除 `questionsAnswered === 0` 的純專注時段，確保時長累加而正確率不被拉低。
  - 驗證訪客模式（LocalStorage）與登入模式（Supabase）對 0 題純時長紀錄的 schema 支援相容性。

## Capabilities

### New Capabilities
- `wrong-answer-comparison`: 錯題回顧中的使用者選擇 vs 正確答案對比 UI，包含 ARIA 無障礙標籤、文字輔助標識與 QuizCard 即時對比狀態。
- `auto-advance-on-correct`: 答對自動切題機制，涵蓋 `UserSettings` 儲存持久化、手動操作防衝突、最後一題轉場結算與戰鬥演出同步。
- `achievement-pruning`: 成就系統白名單過濾機制、歷史未知 ID 容錯清洗與 Tracker 雙向對齊檢查。
- `study-session-settlement`: 統計結算全路徑閉環（含常規、錯題重試、Chunked 練習、RestBreak 退出），具備冪等性 token 與邊界防禦。
- `focus-timer-stats-binding`: FocusTimer 生命週期安全統計寫入與純時長統計過濾防護。

### Modified Capabilities
- `battle-mode`: 戰鬥測驗答題即時反饋、結算頁面錯題對比以及自動切題與戰鬥動畫演出的精確同步。

## Impact

- **型別定義**：
  - `types/battleTypes.ts`：`UserSettings` 新增 `autoAdvanceOnCorrect?: boolean`。
  - `types.ts`：`QuizState` 新增 `userAnswerMap: Record<string, string | string[]>`。
- **元件**：
  - `components/QuizResult.tsx`：支援 `userAnswerMap`、單選三態與多選四態（選對/錯選/漏選/中立）選項標記、ARIA 輔助無障礙。
  - `components/QuizCard.tsx`：即時答題對比、自動切題計時器、手動中斷計時器、最後一題結算支援。
  - `components/Settings.tsx`：新增「答對自動切題」開關 UI 與說明。
  - `components/Dashboard.tsx`：FocusTimer `onSessionComplete` 綁定。
  - `components/AppContent.tsx`：全路徑結算封裝 `settleCurrentSession`（兩階段 CAS 門戶與冪等鎖）。
  - `components/AchievementsCard.tsx` / `AchievementsModal.tsx`：白名單過濾、未知 ID 排除、進度比例重計。
  - `components/RestBreakModal.tsx` / `components/ChunkedPractice*.tsx`：退出路徑結算呼叫。
- **Hooks & Services**：
  - `hooks/useQuizEngine.ts`：`userAnswerMap` 狀態維護、`handleExitQuiz` 結算閉環。
  - `hooks/useAchievementTracker.ts`：顯式導出 `TRACKED_ACHIEVEMENT_IDS` 集合供型別級測試比對。
  - `services/storage.ts`：`getUserSettings` normalize 防禦。
  - `services/analytics.ts`：`getStudyStats` 針對 0 題純時長紀錄的正確率過濾。
- **Constants**：
  - `constants/achievements.ts`：導出 `IMPLEMENTED_ACHIEVEMENT_IDS`。
- **品質驗證**：
  - 單元測試套件（Vitest）
  - E2E 驗證套件（Playwright）
  - 全專案 TypeScript 編譯驗證（`npx tsc --noEmit`）
  - 死代碼分析（`knip`）
