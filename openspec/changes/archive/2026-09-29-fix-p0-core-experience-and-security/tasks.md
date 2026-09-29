## 1. 基礎工具函式（無依賴，後續任務的前置條件）

- [x] 1.1 **建立 `utils/dateUtils.ts`** — 新增極簡原生 `getLocalDateString(date?: Date): string` 工具函式，使用 `(date ?? new Date()).toLocaleDateString('sv-SE')` 返回本地時區 `YYYY-MM-DD` 字串。內部加入 `isNaN(targetDate.getTime())` 守衛，若無效日期回退為當日本地日期。  
  **DoD**: 函式導出、`npx tsc --noEmit` 通過、單元測試（見 1.2）通過  
  **回滾**: 刪除檔案

- [x] 1.2 **`getLocalDateString` 單元測試** — 在 `src/__tests__/dateUtils.test.ts` 新增測試：(a) 預設參數返回本地日期、(b) 傳入指定 Date 返回正確日期、(c) 格式符合 `YYYY-MM-DD` 正則、(d) 傳入 `Invalid Date` 正常回退不拋錯。使用 `vi.useFakeTimers` 設定為 UTC+8 凌晨 01:00 驗證不歸入前一天。  
  **DoD**: `npm test -- dateUtils` 全部通過  
  **回滾**: 刪除測試檔

- [x] 1.3 **建立 `clearUserDataOnSignOut` 工具函式** — 在 `services/storage.ts` 新增導出函式 `clearUserDataOnSignOut(): void` 與 `SIGNOUT_WHITELIST` 常數（`Set(['mindspark_theme', 'mindspark_bgm_enabled', 'mindspark_sfx_enabled'])`）。  
  - 迭代 `localStorage` 所有 key，收集 `mindspark_` 前綴且不在白名單中的 key 批次移除。  
  - 迭代 `sessionStorage` 所有 key，收集 `mindspark_` 前綴的所有 key（包含 `mindspark_ai_config` 敏感金鑰）批次移除。  
  - 整個清理包裹 `try...catch` 防止無痕模式/存取限制拋錯。頂部標註 `// ponytail: [Sunset: v2.0 - 待系統全面遷移至 user-scoped IndexedDB 後，localStorage 暫存機制將正式退役]`。  
  **DoD**: 函式導出、`npx tsc --noEmit` 通過、單元測試（見 1.4）通過  
  **回滾**: 移除函式

- [x] 1.4 **`clearUserDataOnSignOut` 單元測試** — 在 `src/__tests__/clearUserDataOnSignOut.test.ts` 新增測試：(a) 清除所有非白名單 `mindspark_*` localStorage key、(b) **白名單保留** `mindspark_theme`, `mindspark_bgm_enabled`, `mindspark_sfx_enabled`、(c) 清除 `sessionStorage` 內所有 `mindspark_*` key（含 `mindspark_ai_config`）、(d) 保留非 `mindspark_` key、(e) 涵蓋動態 key 如 `mindspark_bank_uuid-123` 和 `mindspark_chunk_draft:s1:0`、(f) 空存儲不拋錯。  
  **DoD**: `npm test -- clearUserDataOnSignOut` 全部通過  
  **回滾**: 刪除測試檔

## 2. UTC 時區修復（依賴: 1.1）

- [x] 2.1 **替換 `analytics.ts` L25 的 toISOString** — 將 `const today = new Date().toISOString().split('T')[0]` 替換為 `const today = getLocalDateString()`，新增 `import { getLocalDateString } from '../utils/dateUtils'`。  
  **DoD**: `npx tsc --noEmit` 通過、`npm test` 無 regression  
  **資料流**: `recordStudySession` → Supabase `study_sessions.session_date` 寫入/查詢 — 改為本地日期後，雲端 session 歸日與用戶本地日一致  
  **回滾**: 還原為 `new Date().toISOString().split('T')[0]`

- [x] 2.2 **替換 `analytics.ts` L168 的 toISOString** — 將 `recordLocalStudySession` 中 `const today = new Date().toISOString().split('T')[0]` 替換為 `const today = getLocalDateString()`。  
  **DoD**: `npx tsc --noEmit` 通過、`npm test` 無 regression  
  **資料流**: `recordLocalStudySession` → `mindspark_study_sessions` localStorage — 改為本地日期後，本地統計歸日正確  
  **回滾**: 還原為 `new Date().toISOString().split('T')[0]`

- [x] 2.3 **替換 `streak.ts` L82 的 toISOString** — 將 `updateLocalStreak` 中 `const today = new Date().toISOString().split('T')[0]` 替換為 `const today = getLocalDateString()`。  
  **DoD**: `npx tsc --noEmit` 通過  
  **資料流**: `updateLocalStreak` → `mindspark_streak.lastStudyDate` 寫入/比對 — 改為本地日期後，凌晨學習不再斷鏈  
  **回滾**: 還原為 `new Date().toISOString().split('T')[0]`

- [x] 2.4 **替換 `streak.ts` L93 的 toISOString** — 將 `const yesterdayStr = yesterday.toISOString().split('T')[0]` 替換為 `const yesterdayStr = getLocalDateString(yesterday)`。  
  **DoD**: `npx tsc --noEmit` 通過  
  **資料流**: `updateLocalStreak` → streak 連續性判定 — yesterday 與 lastStudyDate 同為本地日期，比較一致  
  **回滾**: 還原為 `yesterday.toISOString().split('T')[0]`

- [x] 2.5 **UTC 修復單元驗證** — 執行 `npm test -- analytics streak`，確認既有統計與 Streak 測試無 regression 且通過本地時區判定。  
  **DoD**: 相關測試全部通過、`npx tsc --noEmit` 通過  
  **回滾**: N/A（驗證任務）

## 3. 快捷鍵修飾鍵與 IME 守衛修復（無依賴）

- [x] 3.1 **新增修飾鍵與 IME 前置守衛** — 在 `hooks/useKeyboardShortcuts.ts` 的 `handleKeyDown` 函式中，`isEditableTarget` 檢查之後（L27 行後），新增：  
  ```typescript
  if (event.ctrlKey || event.altKey || event.metaKey) return;
  if (event.isComposing || event.keyCode === 229) return;
  ```
  **DoD**: `npx tsc --noEmit` 通過  
  **回滾**: 移除這 2 行

- [x] 3.2 **快捷鍵守衛單元測試** — 在 `src/__tests__/useKeyboardShortcuts.test.ts` 新增測試案例：  
  (a) `Ctrl+1` 不觸發 `onSelectOption`、不 `preventDefault`  
  (b) `Ctrl+H` 不觸發 `onToggleHint`  
  (c) `Alt+Enter` 不觸發 `onSubmitOrNext`  
  (d) `Meta+Escape` 不觸發 `onExit`  
  (e) `isComposing=true` 時按 `1` 不觸發 handler  
  (f) `keyCode=229` 時不觸發 handler  
  (g) **regression**: 純 `1`, `Enter`, `h`, `Escape` 仍正常觸發對應 handler  
  **DoD**: `npm test -- useKeyboardShortcuts` 全部通過  
  **回滾**: 刪除新增測試案例

## 4. 登出資料隔離（依賴: 1.3）

- [x] 4.1 **修改 `AuthContext.tsx` signOut 容錯與 SIGNED_OUT 防守底線** —  
  (a) 在 `signOut` 中採用 `try...finally` 結構：`try { await supabase.auth.signOut(); } finally { clearUserDataOnSignOut(); }`，確保遠端 API 斷網或異常時仍 100% 執行本地清理。  
  (b) 在 `onAuthStateChange` 回調中新增 `if (_event === 'SIGNED_OUT') { clearUserDataOnSignOut(); }` 作為防守底線。  
  **DoD**: `npx tsc --noEmit` 通過  
  **資料流**: `signOut()` → `supabase.auth.signOut()` → `finally: clearUserDataOnSignOut()` → local+session storage 清理（白名單保留 theme/bgm/sfx） → `onAuthStateChange(SIGNED_OUT)` 防守底線 → UI 更新  
  **回滾**: 移除 `clearUserDataOnSignOut()` 調用與 SIGNED_OUT 分支

- [x] 4.2 **登出清理單元測試** — 在 `src/__tests__/authLogout.test.ts` 新增測試：  
  (a) mock `supabase.auth.signOut` 成功後，非白名單 `mindspark_*` local/session key 被清除  
  (b) 白名單 key（`mindspark_theme`, `mindspark_bgm_enabled`, `mindspark_sfx_enabled`）保留  
  (c) 非 `mindspark_*` key 保留  
  (d) `signOut` 失敗時（Supabase NetworkError/Exception），`finally` 區塊仍確保 `clearUserDataOnSignOut` 執行（容錯保證）  
  (e) `onAuthStateChange('SIGNED_OUT')` 觸發清理（防守底線驗證）  
  **DoD**: `npm test -- authLogout` 全部通過  
  **回滾**: 刪除測試檔

- [x] 4.3 **登出 E2E 驗證** — 在現有 E2E 測試中確認登出流程不 crash。驗證登出後 localStorage 中僅剩白名單 key，且 sessionStorage 無 `mindspark_` key 殘留。  
  **DoD**: `npx playwright test` 相關測試通過  
  **回滾**: N/A（驗證任務）

## 5. SM-2 待複習入口修復（依賴: 1.1, 1.2）

- [x] 5.1 **擴展 `QuizState.mode` 型別** — 在 `types.ts:83` 將 mode 聯合型別擴展為 `'random' | 'mistake' | 'retry_session' | 'challenge' | 'chunked' | 'spaced_due'`。  
  **DoD**: `npx tsc --noEmit` 通過  
  **回滾**: 移除 `'spaced_due'`

- [x] 5.2 **`useQuizEngine` 新增 spaced_due 啟動路徑 + 全題庫題源載入 + 急迫度排序保護（防洗牌）** —  
  (a) 在 `hooks/useQuizEngine.ts` 的 `startQuiz` 函式中：當 `mode === 'spaced_due'` 時，題源題庫擴展為所有題庫 `effectiveBankIds = (await repository.getBanks()).map(b => b.id)`，載入所有題庫題目構建題庫池。  
  (b) 讀取 `repository.getSpacedRepetition()` → `getDueQuestions()` 篩選到期項目 → **按 `nextReviewDate` 遞增排序（`a.nextReviewDate - b.nextReviewDate`，逾期最久者優先出題）** → 根據排序後 `questionId` 構建出題 pool。若無到期題目，呼叫 `toast.warning('目前沒有到期的複習題目！')` 並 return。  
  (c) **豁免洗牌保護**：修改 L202-205 的切片邏輯為：  
  `const finalQuestions = (mode === 'retry_session' || mode === 'chunked' || mode === 'spaced_due') ? (count ? pool.slice(0, count) : pool) : shuffleArray(pool).slice(0, count);`  
  確保急迫度排序不被 `shuffleArray` 打亂。  
  **DoD**: `npx tsc --noEmit` 通過、單元測試（見 5.5）通過  
  **資料流**: `Dashboard button click` → `startQuiz(undefined, 'spaced_due')` → 全題庫載入 → `getDueQuestions()` → **sort by nextReviewDate ASC** → 豁免 `shuffleArray` → `quizState` 更新 → QuizCard 渲染  
  **回滾**: 移除 `'spaced_due'` 分支與洗牌豁免

- [x] 5.3 **Dashboard 新增無參 `onStartSpacedReview` prop** — 在 `DashboardProps` 介面新增 `onStartSpacedReview: () => void`。將 L172-178 的 `<div>` 替換為 `<button>` 元素，onClick 調用 `onStartSpacedReview`。新增 hover 效果、cursor-pointer、`aria-label="複習到期題目"`。  
  **DoD**: `npx tsc --noEmit` 通過、視覺上為可點擊按鈕  
  **回滾**: 還原為純 `<div>`

- [x] 5.4 **AppContent 透傳無參 spaced review 回調** — 在 `AppContent.tsx` 的 Dashboard 渲染處傳入 `onStartSpacedReview` prop，直接連結至 `quizEngine.startQuiz(undefined, 'spaced_due')`。  
  **DoD**: `npx tsc --noEmit` 通過、Dashboard → Quiz 完整導航可用  
  **資料流**: `AppContent` → `Dashboard (onStartSpacedReview)` → `quizEngine.startQuiz(undefined, 'spaced_due')` → `useQuizEngine (spaced_due)` → `QuizCard` 渲染  
  **回滾**: 移除 prop 傳遞

- [x] 5.5 **spaced_due 模式單元測試** — 在 `src/__tests__/useQuizEngine.spacedDue.test.ts` 新增測試：  
  (a) `startQuiz` 以 `spaced_due` 模式啟動時，能跨全題庫載入到期題目  
  (b) 到期題目按 `nextReviewDate` 遞增排序（逾期最久者在前），且**未被隨機洗牌**  
  (c) 無到期題目時不啟動測驗並顯示 toast  
  (d) 答題完成後 SM-2 資料正確更新  
  **DoD**: `npm test -- useQuizEngine.spacedDue` 全部通過  
  **回滾**: 刪除測試檔

## 6. 戰鬥舞台垂直溢出修復（無依賴）

- [x] 6.1 **BattleArena 舞台高度約束** — 修改 `components/BattleArena.tsx`:  
  (a) L603: 將 `min-h-[160px] md:min-h-[200px]` 改為 `min-h-[80px] md:min-h-[110px]`  
  (b) 在舞台容器 (L541) 新增 `max-h-[25vh] md:max-h-[28vh]`  
  (c) L278: 將角色精靈尺寸改為 `w-16 h-20 md:w-24 md:h-28`  
  (d) 確保舞台容器已有 `overflow-hidden`  
  **DoD**: `npx tsc --noEmit` 通過、`npm run build` 無錯誤、筆電解析度（1366×768）下 BattleArena + QuizCard 不超出 viewport  
  **回滾**: 還原原始 CSS class

- [x] 6.2 **戰鬥舞台佈局驗證** — 於瀏覽器 DevTools 模擬 1366×768 視窗尺寸進行測驗，驗證題幹與 4 個選項按鈕在首屏 100% 完整露出，無垂直滾動。  
  **DoD**: 1366×768 解析度下選項按鈕完整可視且可點擊  
  **回滾**: N/A（驗證任務）

## 7. 端到端整合驗證與收尾

- [x] 7.1 **全量型別檢查** — 執行 `npx tsc --noEmit`，確認零型別錯誤。  
  **DoD**: 退出碼 0

- [x] 7.2 **全量單元測試** — 執行 `npm test`，確認所有既有測試 + 新增測試通過。  
  **DoD**: 退出碼 0

- [x] 7.3 **生產建置** — 執行 `npm run build`，確認無編譯錯誤、無 chunk 大小異常。  
  **DoD**: 退出碼 0、`dist/` 產出正常

- [x] 7.4 **E2E 測試** — 執行 `npx playwright test`，確認所有既有 E2E 測試通過（含匯入、測驗、RPG 戰鬥流程）。  
  **DoD**: 退出碼 0

- [x] 7.5 **更新 `docs/DEVELOPMENT_LOG.md`** — 記錄本次 5 項 P0 修復的變更摘要、修改檔案清單與日期。  
  **DoD**: 文件已更新且內容與實際修改一致  
  **回滾**: `git revert` 文件變更

## 8. 審計缺陷精準修復（Sentinel Z8P4 結案項）

- [x] 8.1 **C1: 跨帳號記憶體隔離** — 建立 `AppSessionContainer.tsx`，在 `App.tsx` 以 `key={user ? user.id : 'guest'}` 控制會話生命週期，登出時徹底 unmount 銷毀前帳號題目與答題記憶體狀態。新增 `crossAccountIsolation.test.tsx` 整合測試，硬斷言 A 的機密題幹在 B 登入後永不出現。  
- [x] 8.2 **C2: Storage 獨立容錯清理** — 將 `services/storage.ts` 中的 `clearUserDataOnSignOut()` 拆為獨立 try-catch 區塊，防止 localStorage 列舉異常跳過 sessionStorage (AI API Key) 清理。在 `clearUserDataOnSignOut.test.ts` 新增測試案例 (h)。  
- [x] 8.3 **W1: 時區測試防同義反覆 & Asia/Taipei 釘扎** — 修改 `src/__tests__/dateUtils.test.ts`，以環境釘扎與直接調用 `getLocalDateString(testDate)` 硬斷言比對（UTC 16:30 轉台北次日 00:30），徹底消除偽證據。  
- [x] 8.4 **W2: 跨全題庫複習 Retry 錯題保留** — 在 `AppContent.tsx` 的 `QuizResult` `onRetry` 與 `onRestart` 傳入 `quizEngine.sessionBankIds`，防止全題庫複習錯題遺失。  
- [x] 8.5 **W3: Dashboard 孤兒 SR 記錄過濾 & TSC 綠燈** — 在 `Dashboard.tsx` 載入 `dueCount` 時比對現存題庫之題目 ID，過濾孤兒記錄；`dashboardDueCount.test.tsx` 專項測試通過且修正 mock 型別確保 `npx tsc --noEmit` 通過。  
- [x] 8.6 **W4 & W5: 幾何與文檔完全對齊** — `BattleArena.test.tsx` 補齊 DOM 幾何約束斷言；`e2e/battle-flow.spec.ts` 補齊 1366×768 首屏選項可視 E2E 測試；`e2e/security_hardening.spec.ts` 補齊 signOut E2E 測試；`design.md`、`proposal.md` 與 `tasks.md` 落點文字 100% 同步。
  

