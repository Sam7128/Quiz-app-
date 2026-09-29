## Why

MindSpark 五項 P0 級核心體驗與安全缺陷正阻礙產品核心價值交付：

1. **SM-2 待複習入口斷鏈**：`dueCount` 在 Dashboard 中僅作為純文字 `<div>` 展示，使用者看到「有 N 題需要複習」卻無法操作，核心認知科學賣點（間隔重複）完全沉睡。且既有測驗引擎存在洗牌覆蓋急迫度排序與題庫載入邊界缺陷。
2. **快捷鍵劫持瀏覽器原生組合鍵**：`useKeyboardShortcuts` 對 `1-4, h, H, Enter, Escape` 無條件 `preventDefault()`，導致 `Ctrl+1`（切分頁）、`Ctrl+H`（歷史紀錄）、IME 選字等被劫持。
3. **UTC 時區導致打卡倒流**：`analytics.ts` 與 `streak.ts` 使用 `toISOString().split('T')[0]` 計算日期，UTC+8 用戶在 00:00~07:59 的學習紀錄被歸入前一天，Streak 斷鏈。
4. **登出未清 Storage 資料**：`AuthContext.tsx` 的 `signOut` 僅呼叫 `supabase.auth.signOut()`，所有 `mindspark_*` localStorage 與 sessionStorage（含 AI API Key）資料殘留，且斷網拋錯會跳過清理，共用裝置存在跨帳號殘留與金鑰外洩風險。
5. **戰鬥舞台垂直溢出**：BattleArena + QuizCard 在筆電螢幕（≤768px 高度）組合高度超出 viewport，選項按鈕被擠出視窗。

## What Changes

- **新增** `spaced_due` 測驗模式：擴展 `QuizState.mode` 聯合型別，新增 Dashboard 到間隔重複測驗的無參啟動流程 (`onStartSpacedReview: () => void`)，跨全題庫載入到期題目並按 `nextReviewDate` 遞增排序（逾期最久者優先出題），同時豁免引擎端 `shuffleArray` 洗牌以保護題序。
- **修改** `useKeyboardShortcuts.ts`：新增修飾鍵（Ctrl/Alt/Meta）與 IME `isComposing` / `keyCode 229` 守衛。
- **新增** `getLocalDateString()` 工具函式：以極簡原生 `toLocaleDateString('sv-SE')` 統一本地日期字串取得方式，替換所有 `toISOString().split('T')[0]` 本地日期比對場景。
- **修改** `AuthContext.tsx` 的 `signOut`：使用 `try...finally` 保證清理，清除所有非白名單的 `mindspark_*` localStorage（白名單保留 theme/bgm/sfx）與 sessionStorage（含 AI Config/Key），並在 `onAuthStateChange('SIGNED_OUT')` 中加入防守底線。
- **修改** `BattleArena.tsx` 佈局：引入純 CSS 緊湊模式，以 `max-h-[25vh] md:max-h-[28vh]` 與壓縮角色精靈尺寸確保筆電視窗不溢出。

## Capabilities

### New Capabilities
- `spaced-due-review`: Dashboard 待複習入口至間隔重複測驗模式的完整流程，包含 `spaced_due` 模式無參啟動、全題庫到期題篩選、急迫度排序保護（防洗牌）與提交更新。
- `timezone-aware-analytics`: 提供基於客戶端本地時區的日期計算機制，確保晨讀打卡、連勝天數（Streak）及每日學習統計準確無誤。

### Modified Capabilities
- `keyboard-shortcuts-stability`: 新增修飾鍵與 IME 守衛規則。
- `client-data-integrity`: 新增登出時 localStorage 白名單清理與 sessionStorage 敏感金鑰銷毀規則、新增 `try...finally` 容錯保證、新增本地日期字串標準化規則。
- `battle-mode`: 擴充戰鬥畫面佈局規格，要求在筆電螢幕採用緊湊模式，杜絕選項垂直溢出視窗。

## Impact

- **types.ts**: `QuizState.mode` 聯合型別擴展（**BREAKING** 對型別消費者）
- **components/Dashboard.tsx**: dueCount 區域從 `<div>` 改為可點擊 `<button>`，新增無參 `onStartSpacedReview: () => void` 回調
- **hooks/useKeyboardShortcuts.ts**: `handleKeyDown` 增加修飾鍵與 IME 守衛
- **services/analytics.ts**: 2 處 `toISOString` 替換為 `getLocalDateString()`
- **services/streak.ts**: 2 處 `toISOString` 替換為 `getLocalDateString()`
- **contexts/AuthContext.tsx**: `signOut` 函式擴展為 `try...finally` + `SIGNED_OUT` 防守底線
- **services/storage.ts**: 新增 `clearUserDataOnSignOut`（清除 local/session storage，白名單保留裝置偏好）
- **components/BattleArena.tsx**: 角色精靈與舞台佈局 CSS 調整
- **hooks/useQuizEngine.ts**: `startQuiz` 新增 `spaced_due` 模式跨題庫載入、急迫度排序與豁免 `shuffleArray`
- **components/AppContent.tsx**: Dashboard props 調整與 inline 呼叫 `quizEngine.startQuiz(undefined, 'spaced_due')`
- **components/AppSessionContainer.tsx**: 封裝會話狀態並以 `user.id` 鍵控制生命週期隔離

