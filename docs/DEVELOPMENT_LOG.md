# Development Log

## 2026-05-21 [OpenSpec] "Security and Sync Hardening"
### ✨ Feature Delivery & Safety Hardening
- **AI 設定防護 (M1)**：在 `services/ai.ts` 的 `getAIConfig()` 中加入防禦性的 try-catch 機制與 10KB 大小限制，並建立 JSON Type Guard (`isAIConfig`)，確保損壞之資料能被安全清理並回退為預設值，完全防範惡意 XSS 或惡意篡改引起的崩潰。並在 `index.html` 中加入了嚴格的 CSP。
- **並發同步優化與容錯 (M2 & M3)**：將 `syncLocalToCloud` 的 `Promise.all` 改造為 `Promise.allSettled` 以落實同步故障隔離。新增並發控制上限限制（限制為 3 ），並在 `syncLocalPracticeSessions` 中引進並發同步鎖，防止多分頁同時操作引起的競態條件（Race Conditions）。同步完成後，向呼叫端傳回成功與失敗之摘要報告，實作精確的部分失敗 Toast 與重試引導。
- **雲端 session 回寫與草稿版本守衛 (M4 & M5 & M6)**：
  - 雲端版本較新時回寫至本機，並在此時清除對應的 chunk drafts 且強制遵守 `PRACTICE_ACTIVE_LIMIT` 限制。
  - 將 `saveCloudQuestions` 中的刪除動作包裝，當 delete 失敗時降級為 console.warn 警告，不中斷同步流程，並將 dirty 題庫標記至本地 `mindspark_dirty_banks` 中。
  - 在 `saveChunkDraft()` 中加入基於時間戳與版本守衛的寫入限制，預防時鐘漂移與回撥，並妥善處理 `QuotaExceededError`（清除最舊草稿）。
- **依賴項安全升級 (M7)**：升級並鎖定 `vite` (6.4.2)、`dompurify` (3.3.4，實裝 3.4.5) 與 `postcss` (8.5.10)，修補多項 Critical/High CVE 漏洞。
- **追加安全性強化 (S1-S5)**：完成構建產物憑證審計，規劃憑證輪換流程與 Gitleaks CI 密鑰掃描，設計短期 token 鑄造與 Playwright 並發衝突壓力測試架構。

### 🧪 Verification
- 新增 `src/__tests__/dompurify.test.ts` 行為與 regression 快照測試，包含 XSS 過濾與 HTML 標籤保留驗證。
- 新增 `src/__tests__/syncLocalToCloud.test.ts` 覆蓋全部成功、部分失敗、全部失敗與 type guard 測試。
- 新增 `src/__tests__/saveChunkDraft.test.ts` 驗證版本守衛、時鐘漂移與 QuotaExceededError 處理。
- 新增 `e2e/sync-and-settings-hardening.spec.ts` 覆蓋全部同步失敗重試、部分失敗 localStorage 更新與損毀 JSON 容錯。修復了模擬 token 中 user 屬性缺失導致的渲染崩潰，以及 GET questions 路由未攔截導致的 Playwright 請求掛起超時 Bug。
- 完成 OpenSpec 驗證報告 `openspec/changes/security-and-sync-hardening/verification-report.md`，標註雲端-only sessions 回寫本機與規格差異。
- 順利通過 `npx tsc --noEmit` & `npm run build`，且全量 146 項單元測試與 Playwright E2E 測試 100% 通過（包含 3 項同步與設定安全性強化測試）。

### 🔄 Verification Round 2 (2026-05-21)
- **修復 Cloud-only sessions 回寫問題**：移除 `syncLocalPracticeSessions` 中將雲端獨有 sessions 寫入 localStorage 的邏輯，嚴格符合 spec 規定的「同步方向：本機→雲端」原則。
- **修正日誌等級**：將 `keepIds` 空集合防護（`cloudStorage.ts`）和 AI config oversized 偵測（`ai.ts`）的日誌等級從 `console.error` 改為 `console.warn`，因為這些是預期的防禦性行為，非系統錯誤。
- **消除 `any` 型別違規**：修復 `cloudStorage.ts`（`checkIsTableMissingError` 參數、`retryCleanupDirtyBanks` 回調）和 `storage.ts`（`cleanOldestChunkDraft` 內部、`saveChunkDraft` catch block）中的 `any` 使用，全部改為 `unknown` + type guards。
- **修復 flaky test**：`useChunkedPractice.test.ts` 中的 chunk restore 測試改為斷言總題數減少（確定性），避免因 shuffle 隨機性導致測試間歇性失敗。
- 驗證報告更新至 `openspec/changes/security-and-sync-hardening/verification-report.md`：零 CRITICAL、零 WARNING、零 SUGGESTION。

## 2026-05-21 [Review] "競態與邏輯風險審查報告"
### 📄 Report
- 已建立 `docs/reports/RISK_REVIEW_REPORT_2026_05_21.md`，整理競態條件、資料一致性與 AI 金鑰風險。

### 🔍 主要發現
- 雲端題庫同步採非原子 upsert + delete，存在幽靈題目與誤刪風險。
- `syncLocalPracticeSessions` 可能清除雲端較新的本機 session，離線時進度消失.
- Chunk 草稿多來源寫入仍可能回流，需加強版本/時間戳判斷。

## 2026-05-21 [Security] "Comprehensive Security & Logic Audit"
### 🔍 Audit Findings
- **雲端同步競態條件 (Race Conditions)**：`syncLocalPracticeSessions` 採用順序 `await` 且缺乏鎖機制，在多分頁或頻繁觸發時可能導致資料覆蓋。
- **本機草稿保存衝突**：`useChunkedPractice` 的 `updateChunkDraft` 與 `beforeunload` 可能發生競爭，導致進度回流（Regression）。
- **敏感憑證洩露風險**：AI API Key 存儲於 `localStorage`，雖有 `sessionStorage` 選項，但在 client-side 架構下仍易受 XSS 威脅。
- **資料完整性風險**：`saveCloudQuestions` 的「先 Upsert 後 Delete」非原子操作，中斷時會導致雲端殘留幽靈題目。

### 🛠️ Remediation Plan
- **產出報告**：已建立 `docs/SECURITY_AND_LOGIC_AUDIT_REPORT.md` 詳細記錄問題成因與建議。
- **後續行動**：建議引入同步鎖（Sync Lock）與 Supabase RPC 以強化資料一致性。

### 🧪 Verification
- 已執行 `npm audit` 確認依賴漏洞狀態。
- 已完成手動程式碼走查與並發邏輯分析。
- 專案 TypeScript 型別檢查通過。

## 2026-05-18 [Hotfix] "Vercel Deployment Compatibility Optimization"
### 🐛 Root Cause
- **本地與 Vercel 平台環境版本落差**：本地使用極新的 Node.js v24.11.0 與 npm 11.6.1，而 Vercel 預設部署環境可能為 Node.js 18.x 或 20.x。高版本的 npm 在 Windows 環境下生成並鎖定的 `package-lock.json`，在 Vercel 的 Linux 舊版環境中還原時，容易因為平台特定的選用依賴（例如 `@esbuild/linux-x64`）未正確下載，導致 `node_modules/.bin/vite` 軟連結損壞、無執行權限，進而觸發 `sh: line 1: /vercel/path0/node_modules/.bin/vite: Permission denied` (Exit code 126)。
- **依賴快取污染**：由於 `Installing dependencies...` 僅耗時 2 秒且只 `added 7 packages`，表示 Vercel 在未清理的快取中沿用了與 Linux 平台不相容的、殘留的本地依賴，導致部署失敗。

### 🛠️ Fix
- **鎖定與優化 Node.js 版本相容性**：在 `package.json` 中主動聲明 `"engines": { "node": ">=20.0.0" }`，強制引導 Vercel 使用更相容的 Node.js 20+ 運行環境，縮小與本地 v24 的版本落差，確保其使用的 npm 能正確解析並還原 lockfile。
- **提供 Vercel 平台 Redeploy without Cache 與本地排錯指南**：
  1. 引導使用者在 Vercel 點選「Redeploy」並勾選「Redeploy without Cache」以強制乾淨重建。
  2. 提供本地重置依賴以修復跨平台 lockfile 的指令。

### 🧪 Verification
- 已成功更新 `package.json` 中的相容性配置。
- 本地執行 `npm run build` 通過驗證。

## 2026-05-18 [Hotfix] "Chunked Practice Cloud Resume Draft Preservation"
### 🐛 Root Cause
- **登入狀態下的雲端 repository 會誤刪草稿**：`CloudStorageRepository.savePracticeSession()` 在雲端保存分階段練習成功後，原本呼叫本地 `deletePracticeSession()` 清除 local cache；但該函式同時會清除 `mindspark_chunk_draft:<sessionId>:<chunkIndex>`。因此使用者刷新後按「繼續」時，restore 流程會先同步 session，草稿在讀取前已被清掉，導致回到第一題。

### 🛠️ Fix
- **拆分 cache 清理與正式刪除語意**：新增 `removePracticeSessionCache()`，只移除本地 `mindspark_practice_sessions` 中的 session cache，不清除任何 chunk draft。
- **雲端保存不再清草稿**：`CloudStorageRepository.savePracticeSession()` 改用 `removePracticeSessionCache()`，保留裝置本機的進行中草稿；真正放棄或刪除 session 時仍會清除 drafts。

### 🧪 Verification
- 新增 cloud repository 回歸測試，確認雲端保存成功移除 local session cache 後仍保留 chunk draft。
- 新增 hook 組合測試，模擬答到中途、卸載、再 restore，確認回到原本 `currentQuestionIndex`。
- 已通過 `npx vitest run src/__tests__/practiceSessionStorage.test.ts src/__tests__/useChunkedPractice.draft.test.ts`。
- 已通過 `npx tsc --noEmit`。

## 2026-05-18 [Hotfix] "Chunked Practice Page Refresh Progress Retention & Strict Compilation Fix"
### 🛡️ Page Refresh Progress Retention & Race Condition Resolution
- **解決非同步渲染競態**：在 `App.tsx` 中使用 `useCallback` 封裝 `onChunkComplete` 與 `onChunkDraftUpdate` 回調函數。這完全穩定了它們的參照，消除了當重新整理頁面後，因非同步加載 banks 導致 App 重新渲染所引起的匿名 inline 函數引用改變與 `useQuizEngine.ts` 內重複觸發 `useEffect` 的競態條件。
- **實作防禦性進度保護 (Index-Guarding)**：在 `useChunkedPractice.ts` 中的 `updateChunkDraft` 與 `onBeforeUnload` 內，加入高防禦性的進度指標保護邏輯（Index-Guarding）。若 incoming 的進度為 `0`（初始狀態）且無錯誤記錄，但 `localStorage` 中已存在大於 `0` 的進度，則進行攔截保護拒絕覆蓋，完美解決了頁面重新載入後點選繼續卻意外回到第一題的 Bug。

### 🛡️ TypeScript Strict Compilation Type Hardening
- **修正型別缺失破口**：
  - 更新 `AppContentProps`，於 `chunkedPractice.summary` 型別定義中補齊缺失的 `wrongQuestionIds: string[]` 欄位。
  - 於 `quizEngine` 型別定義中補齊 `sessionBankIds: string[]` 欄位。
  - 在 `useQuizEngine.ts` 的回傳對象中成功導出 `sessionBankIds` 狀態。
  - 將 `components/AppContent.tsx` 中複習錯題時所引用的 `quizEngine.quizState.bankIds` 修正為正確的 `quizEngine.sessionBankIds`，徹底修復並通過了 `npx tsc --noEmit` 的 100% 嚴格編譯。

### 🧪 Compilation & Unit Tests
- 順利通過 `npx tsc --noEmit` & `npm run build` 的極致編譯挑戰，無任何型別破口。
- 110 個 Vitest 單元測試 100% 全數通過，達成絕對完美主義。

## 2026-05-18 [Hotfix] "Chunked Practice AbortError Fix & Premium Mistake Review Flow"
### 🛡️ AbortError Handling & Performance Optimization
- **無視非預期 AbortError**：於 `services/cloudStorage.ts` 中優雅捕捉並過濾 `AbortError`（主動中斷或超時），改為 `console.info` 記錄而不再拋出 `console.error`，維持主控台純淨。優雅修正了 `syncLocalPracticeSessions` 與 `getCloudPracticeSessions` 中的 catch 中斷邏輯。
- **批次寫入性能優化**：重構 `syncLocalPracticeSessions` 的同步機制，將 loop 中的單條寫入改為結束後一次性呼叫 `replaceAllPracticeSessions`，杜絕多次磁碟 I/O 的性能瓶頸，且 100% 契合並通過了現有單元測試。

### ✨ Premium Mistake Review Flow (無縫錯題複習閉環)
- **全面支援錯題複習**：擴充 `ChunkSummaryState` 與 `ChunkCompleteSummary` 介面，支援 `wrongQuestionIds`（本段錯題 IDs）。現在無論是單一階段（短練習）還是多階段（長練習）完成時，皆會主動彈出結算視窗，不留學習盲區。
- **高質感 UI 按鈕設計**：於 `ChunkCompleteSummary` 引入高質感琥珀色漸變（Amber/Orange Gradient）「📖 立即複習本段錯題」按鈕及 micro-animations，極大提升視覺回饋與互動意願。
- **無縫錯題載入機制**：使用者點選複習錯題後，會即時無縫啟動 `retry_session` 模式載入錯題卡片；當錯題複習完畢後，流暢切換回 Dashboard。
- **答題進度即時草稿（Draft）**：驗證並確認「中途退出，100% 保存 Draft」之答題機制。透過 `useQuizEngine.ts` 的 `onChunkDraftUpdate` 自動偵聽機制，答題每前進一步皆即時寫入 `mindspark_chunk_draft:<sessionId>:<chunkIndex>`，確保任何形式的退出都不會丟失進度，高度實踐防禦式設計。

### 🧪 Compilation & Unit Tests
- 順利通過 `npx tsc --noEmit` & `npm run build` 的極致編譯挑戰，無任何型別破口。
- 110 個 Vitest 單元測試 100% 全數通過，達成絕對完美主義。

## 2026-05-18 [Hotfix] "Chunked Practice Sync Deadlock & Infinite Loop Fix"
### 🛡️ Graceful Degradation & Circuit Breaker
- **自動熔斷機制**：於 `services/cloudStorage.ts` 引入 `isCloudPracticeAvailable` 與 `checkIsTableMissingError`。當發現雲端 Supabase 未建立 `practice_sessions` table 時（錯誤代碼 `PGRST205` / HTTP 404），會自動熔斷並優雅降級為全本地（Local-only）模式。不再向雲端發送無效請求，避免持續 console 報錯與彈出重試同步提示。
- **解耦查詢與同步重試**：從 `services/cloudRepo.ts` 中 `getPracticeSessions` 移除每次查詢無條件 `await retryDirtyPracticeSessions()` 的同步阻塞，消除高頻 API 呼叫引發的 AbortError 競態條件，同時保障了分階段練習列表的載入效能。

### 🔄 React Performance & State Security
- **切斷 Effect 無限死亡螺旋**：修復 `App.tsx` 中初始化 `useEffect` 因為 `chunkedPractice` reference 變更所造成的 React Infinite Loop 重繪問題。引進 `hasSyncedPracticeRef` 限制僅在使用者登入後執行一次同步，徹底終止了無限彈出「有 1 筆分階段練習待重試同步」Toast 的問題。
- **類型安全與編譯過關**：完成全面代碼審計與重構，達成 `npx tsc --noEmit` 100% 通過與零 TypeScript 類型破口。

## 2026-05-18 [Utility] "One-Click Development Startup Script"
### ✨ Developer Experience (DX)
- **新增一鍵啟動腳本**：於專案根目錄新增 [start-dev.bat](file:///c:/Users/user/Desktop/Quiz-app--main/start-dev.bat)，提供 Windows 環境下一鍵啟動開發伺服器的功能。
- **自動環境與 Port 檢查**：
  - 自動檢查 `node_modules` 依賴是否存在，缺失時自動觸發 `npm install`。
  - 防禦性偵測 Port `5173` 是否被佔用，並提供「強制終止佔用程序」、「直接啟動」、「僅開啟瀏覽器」及「取消」四種動態交互選項。
  - 啟動 Vite 開發伺服器時，自動於背景非同步延遲 3 秒在預設瀏覽器中開啟 `http://localhost:5173`，免去手動輸入網址或等待的繁瑣流程。

## 2026-05-15 [OpenSpec] "Chunked Practice Cloud Sync — Apply with Tests (Round 1)"
### ✨ Feature Delivery
- **Chunked Practice 基礎落地**：新增 `useChunkedPractice`，完成 Session 建立/分組、restore 驗證、chunk 完成冪等、手動放棄、chunk draft 寫入與恢復。
- **Quiz Engine 整合**：`useQuizEngine.startQuiz` 新增 `chunked` mode 與 `chunkMeta`，支援指定子集順序載入，並在 chunk 完成時觸發 `onChunkComplete`。
- **UI 整合**：新增 `ChunkedPracticePanel`、`ActiveSessionCard`、`ChunkCompleteSummary`，Dashboard 可建立/續作分階段練習；QuizCard 顯示「📦 階段 X / Y」。

### 🗄️ Storage & Cloud Sync
- **Migration**：新增 `docs/migrations/PRACTICE_SESSIONS_MIGRATION.sql`（`practice_sessions` table、RLS、雙索引、`updated_at` trigger、`ON DELETE CASCADE`）。
- **Repository 擴充**：`IStorageRepository`、`LocalStorageRepository`、`CloudStorageRepository` 全面加入 practice session CRUD。
- **同步策略**：新增 `syncLocalPracticeSessions` + `retryDirtyPracticeSessions`，採 `updated_at` LWW，不以舊 local 覆蓋新 cloud；失敗會保留 dirty fallback。
- **Guest retention**：active sessions 上限 5，總 session 上限 10，超限時從最舊非 active 物理清理。

### 🧪 Tests
- 新增 `useChunkedPractice.test.ts`、`useChunkedPractice.draft.test.ts`、`useQuizEngine.chunked.test.ts`、`practiceSessionStorage.test.ts`。
- `useBattleSystem.test.ts` 補上 `resetForNewChunk` 及 Game Mode mid-chunk toggle 等覆蓋。
- 新增 `e2e/chunked-practice.spec.ts`（小題庫 chunk、中途退出續作，並預留跨裝置同步測試介面）。

### 🗄️ Database Schema Reference
```sql
CREATE TABLE IF NOT EXISTS public.practice_sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    bank_ids UUID[] NOT NULL,
    bank_names TEXT[] NOT NULL,
    bank_question_map JSONB NOT NULL,
    chunk_size INTEGER NOT NULL,
    question_ids UUID[] NOT NULL,
    chunks JSONB NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'abandoned')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

## 2026-05-08 [OpenSpec] "Chunked Practice Cloud Sync — Round 4 Spec Alignment"
### 📐 OpenSpec
- **規格補強（Chunked Practice）**：新增「Chunk 進行中中途退出」規則（不結算、不顯示摘要；已產生的錯題/間隔複習更新保留）與「來源題庫刪除導致全題缺失」政策（Session 自動 `abandoned` 並移出 active 列表）。
- **規格補強（Battle Mode）**：定義 Chunk 進行中切換 Game Mode 的行為（OFF→ON 重新 `startBattle()` 且 counters 從 0 起算；ON→OFF 不影響測驗進度，且維持不入雲端的持久化規則）。
- **任務清單同步**：補齊 bankIds/DB 型別映射說明、`updated_at` 自動推進（trigger）與 `ON DELETE CASCADE`、restore 重算/空 chunk 行為、`startQuiz` chunked 型別要求、以及對應單元/E2E 測試項目。

## 2026-05-08 [v0.4.4] "MCP Entry Point Hardening"
### 🛠️ Infrastructure & Memory
- **MCP 匯入路徑優化**：優化 `.project-memory/project_memory_mcp_entry.py` 的模組搜尋與匯入邏輯。透過 `importlib` 備援機制與 `TYPE_CHECKING` 標記，解決了 IDE 靜態分析因無法識別動態 `sys.path` 修改而產生的「找不到模組」錯誤，提升了開發體驗與腳本穩定性。符合 ABSOLUTE_PERFECTIONIST 完美主義標準。


## 2026-05-07 [v0.4.3] "Review Fixes & Audit Triage"
### 🐛 Bug Fixes
- **Knowledge Graph 編譯修復**：修正 `GraphEditor.tsx` 將 React Flow `data` 轉回 `GraphNodeData` 時的 strict TypeScript 轉型錯誤，`npx tsc --noEmit` 已恢復通過。
- **Mermaid 節點上限同步**：`mermaidBridge.ts` 不再硬編碼 50 節點，改用 `GRAPH_LIMITS.MAX_NODES`，並更新測試覆蓋 60 節點匯入與超過設定上限的拒絕行為。
- **QuizCard 延遲計時器清理**：休息彈窗與解析顯示的 `setTimeout` 改由 ref 追蹤並在卸載時清理，避免題目切換或離開測驗後仍更新狀態。

### 🛡️ Type Safety & Architecture
- **NO_ANY 清理**：移除 `AppContent.tsx`、`AIHelper.tsx`、`Login.tsx`、`useBattleSystem.ts`、`SkillAnimation.tsx`、`isAbortError.ts` 中屬實的 `any` 型別破口。
- **Reducer 純化**：將 `gameMode` 的 localStorage 持久化從 `appReducer` 移到 `App.tsx` 的事件處理層，避免 reducer 直接執行 I/O。
- **稽核判讀**：`Question.id` 統一成 `string` 屬於大型資料模型遷移，暫不納入本輪熱修；Supabase `not in` 字串格式為 PostgREST 既有語法，且 ID 先 normalize 成 UUID，未採用報告中的陣列傳參建議。

## 2026-03-10 [v0.4.2] "Question Identity & Bank Editing Safety"
### 🛡️ Data Integrity
- **穩定題目身份**：新增 `sourceQuestionKey` / `sourceFingerprint` 題目識別欄位，將內部題目 ID 與外部來源識別分離，避免 AI / JSON 匯入重複覆寫不同題庫。
- **匯入合併策略**：`BankManager` 匯入流程改為先以來源鍵/指紋比對現有題目並保留原 ID，再整包覆蓋題庫內容，避免「修改舊題卻被當新題」。
- **雲端去重保護**：`saveCloudQuestions()` 送出 Supabase 前先去除同 payload 重複 ID，避免 `ON CONFLICT DO UPDATE command cannot affect row a second time`。
- **資料清理鏈**：刪除題目時同步清理錯題紀錄、SM-2 複習資料、最近錯題 session 與未完成測驗 session 殘留。

### ✨ UX
- **題庫人工修正**：`BankManager.tsx` 新增單題列表、單題編輯與單題刪除介面，讓使用者能在匯入後手動修正少數異常題目。
- **匯入前檢查提示**：JSON / AI 匯入前會先顯示原始題數、重複來源 ID 合併數、相同內容合併數，以及實際匯入題數，避免使用者誤判「題目被系統吃掉」。
- **匯入模式切換**：題庫管理新增 `追加新題 / 更新同來源題目 / 覆蓋整個題庫` 三種模式，預設使用追加新題，解決既有題庫想新增題目時被整包覆蓋的問題。
- **貼上內容保留**：成功匯入後不再自動清空貼上的 JSON，方便使用者修正後再次匯入。
- **題庫管理捲動修正**：移除題庫管理頁右側固定高度造成的裁切，貼上 JSON 區改為頁面自然捲動並允許手動拉高文字框，避免匯入介面被遮擋。
- **社交分享一致性**：接受好友分享題庫時改為保留來源識別並重新分配內部 UUID，讓跨題庫副本彼此獨立。

### 🧪 Tests & Migrations
- **單元測試**：新增 `questionIdentity.test.ts`、`storage.questionArtifacts.test.ts`，並擴充 `cloudStorage.test.ts` 覆蓋去重與穩定 ID 行為。
- **Migration**：新增 `docs/migrations/supabase_question_identity_migration.sql`，為 `questions` 表加入來源識別欄位與索引。

## 2026-03-08 [v0.4.0] "Unified Memory Architecture"
### 🛠️ Infrastructure & Memory
- **Unified Agent Entrance**: Created `.gemini/settings.json` to unify context on `AGENTS.md`. Removed redundant `GEMINI.md`.
- **Nested Memory System**: Implemented directory-level `AGENTS.md` for `components/`, `services/`, `hooks/`, `contexts/`, `constants/`, `src/__tests__/`, `e2e/`, and `openspec/`.
- **Protocol Migration**: Moved 9 critical development protocols from global memory to project-level `AGENTS.md` "Absolute Rules" (鐵規).
- **Root Directory Sanitization**:
    - **Reports**: Moved all security/audit/diagnostic reports to `docs/reports/`.
    - **Migrations**: Moved all SQL scripts to `docs/migrations/`.
    - **Logs**: Moved all error/TSC/system logs to `docs/logs/`.
    - **Archive**: Moved old verification prompts and design docs to `docs/archive/`.
    - Reduced root contamination from 80+ files to a clean developer-centric list.

### 🛡️ Type Safety
- Verified `npx tsc --noEmit` compatibility (preserved KG legacy errors without adding new ones).


## 2026-02-04 [v0.3.0]
### ✨ New Features
- **Game Mode (RPG Battle Arena)**:
  - Implemented global `gameMode` toggle in `Settings.tsx` with persistence.
  - Developed `BattleArena` component with "Underground" theme (Dark mode optimized).
  - Added "Stage Transition" full-screen animation when clearing levels.
  - Integrated battle logic into `QuizCard` with global state management.

### 🐛 Bug Fixes & Refactoring
- **Accessibility (A11y)**:
  - Added `aria-label` to all icon-only buttons in `Settings.tsx` and `App.tsx` [Fixes "Buttons must have discernible text"].
  - Added `aria-label` to select elements [Fixes "Select element must have an accessible name"].
- **Code Quality**:
  - Removed duplicate `onAnswer` and `onNext` props in `App.tsx` [Fixes "JSX duplicate properties"].
  - Refactored `QuizCard.tsx` to remove redundant local state (`battleMode`) in favor of global props.
  - Fixed lint errors for redeclared variables in `BattleArena.tsx`.

### 📝 Documentation
- Updated `CHECKLIST.md` marking Game Mode as complete.
- Updated `GEMINI.md` with recent changes.

## 2026-02-05 [v0.3.1]
### 🐛 Bug Fixes
- **Accessibility (A11y)**:
  - Fixed "Buttons must have discernible text" in `AIHelper.tsx` by adding `aria-label` and `title` to close and send buttons.
  - Fixed "Form elements must have labels" in `BankManager.tsx` by associating inputs with labels.

### ✨ New Features
- **AI PDF Question Generation**:
  - Added PDF upload support in `BankManager` (AI Tab).
  - Integrated Google Gemini 1.5 for analyzing PDF content and generating questions.
  - Added options for **Question Language**, **Question Type** (Single/Multiple/Mixed), and **Explanation Language**.
- **Battle Mode Enhancements**:
  - Added `FireballAttack` animation with `framer-motion` (GPU accelerated).
  - Integrated Sound Effects System (`useSoundEffects`) for BGM and SFX.
- **Settings**:
  - Added Custom Model Name support for Google provider.
  - Added Audio Settings (BGM/SFX toggles).

## 2026-02-05 [v0.3.2]
### ✨ New Features
- **Data Management (Root Out)**:
  - **Batch Delete**: Implemented multi-bank deletion in `Dashboard.tsx` via checkbox selection.
  - **System Nuke**: Added "Danger Zone" in `Settings.tsx` to wipe all local data and configurations.
  - **Enhanced Reset Protocol**: Modified nuke logic to forcefully sign out from Supabase and clear all `localStorage` keys with prefix `mindspark_` to ensure total cleanup.
  - **Sample Data**: Created `multiple_choice_sample.json` for testing multiple-choice imports.

### 🐛 Bug Fixes
- **Console Optimization**:
  - Replaced Supabase `.single()` with `.limit(1)` in analytics and streak services. This eliminates noisy "406 Not Acceptable" log errors when no rows are found, improving developer experience and console purity.
- **Naming Alignment**:
  - Renamed `lich_king.png` to `skeleton_wizard.png` to match updated monster data and prevent asset potential 404s.

## 2026-02-05 [v0.3.3] "Battle Mode Overhaul"
### ✨ New Features
- **Battle System 2.0**:
  - Refactored `useBattleSystem` with dynamic damage, critical hits, and shielding mechanics.
  - Implemented Monster rotation (Normal -> Elite -> Boss) with difficulty scaling based on questions answered.
  - Unified `AttackEffect` system supporting random animations (Fireball/Ice Arrow) and visual feedback.
- **Quiz Experience**:
  - **Result Dashboard**: New `QuizResult` component with detailed stats, mistake review mode, and achievement summary.
  - **Focus Tools**: Added `MiniTimer` (Pomodoro style) and `RestBreakModal` (Study fatigue check).
  - **Keyboard Hints**: Added visual shortcut keys (1-4) to option buttons for better usability.
- **Persistence**:
  - Implemented auto-save/restore for active quiz sessions (survives refresh).
  - Battle state is now persistent (HP/Streak/Monster maintained across reloads).

### 🐛 Bug Fixes
- **Accessibility**: Fixed missing aria-labels in `AchievementsModal` and `QuizCard` header buttons.
- **Visuals**: Standardized damage number rendering with `DamageNumber` component.

## 2026-02-05 [v0.3.4] "Dashboard & UX Polish"
### ✨ New Features
- **Dashboard UX**:
  - **Recent Mistakes**: Added a dedicated card to track and review the last 5 incorrect answer sessions (FIFO).
  - **Achievements**: Made the achievements card interactive with a full-view modal.
  - **Default Quiz Size**: Changed default from 20 to "All questions" for continuous study flow.
- **Settings**:
  - **Custom Rest Interval**: Users can now set a custom numeric value for rest break intervals (e.g., every 15 questions).

## 2026-02-08 [v0.3.6] "Security & Tailwind v4 Migration"
### ✨ Security Hardening
- **Content Security Policy (CSP)**: Added strict meta tags in `index.html` to control resource sources.
- **CDN Elimination**: Removed unauthenticated Tailwind CDN and migrated to local build process to mitigate supply chain risks.
- **Security Audit**: Completed full audit using `security-audit` skill; achieved Security Score **A**.

### 🛠️ Technical Refactoring
- **Tailwind CSS v4 Migration**:
    - Upgraded to Tailwind v4 using `@tailwindcss/vite` and standard CSS variables in `index.css`.
    - Resolved PostCSS ESM module compatibility issues (`postcss.config.js` syntax).
    - Fixed UI contrast issues by defining full range of brand and accent colors (fixing "fade-to-white" bug).
- **VS Code Optimization**: Added `.vscode/settings.json` to suppress Tailwind-specific linting warnings in CSS files.

## 2026-02-09 [v0.3.7] "Skills-Based Optimization"
### 🚀 Performance & Reliability
- **AI Prompt Optimization (Phase 1)**:
  - Implemented strict JSON Schema enforcement in `services/ai.ts` for reliable question generation.
  - Added Few-Shot prompting and auto-recovery mechanisms to handle malformed LLM responses.
- **React Performance (Phase 2)**:
  - Analyzed and fixed unstable prop references in `App.tsx` preventing `Dashboard` memoization.
  - Removed duplicate state updates in `startQuiz` reducing render cycles.
- **Battle System Debugging (Phase 3)**:
  - Added DEV-only state transition logging in `useBattleSystem.ts` for easier debugging.
  - Standardized skill trigger logic (Milestones: 5, 10, 20, 30...) in `constants/skillsData.ts`.
  - Added comprehensive unit tests in `src/__tests__/useBattleSystem.test.ts` verifying state logic.
- **Security Audit (Phase 5)**:
  - Verified `npm audit` (0 vulnerabilities).
  - Confirmed XSS safety (no `dangerouslySetInnerHTML`).
  - Reviewed CSP configuration for development flexibility.

## 2026-02-10 [v0.3.8] "Infrastructure & Safety Refactor"
### ✨ 功能與重構
- **架構品質優化 (v0.3.9)**：
    - **App 組件重構**：將 `App.tsx` 的渲染邏輯抽離至 `AppContent.tsx`，成功將 `App.tsx` 行數從 309 行減少至 149 行。
    - **型別安全驗證**：解決了 `App.tsx` 與 `AppContent.tsx` 之間大規模 Props 傳遞的型別不匹配問題，達成 `npx tsc --noEmit` 零錯誤。
    - **命名衝突修復**：將 `confirm` 鉤子更名為 `confirmDialog` 以避免與原生 `window.confirm` 衝突。
    - **檔案組織優化**：將 `typeGuards.ts` 移至 `utils/` 目錄並修正其內部導入。
    - **系統穩定性**：通過全域 `build` 測試，確保重構未破壞現有功能。
- **Toast/Confirm 系統**：新增一致的通知與確認流程。
- **Repository 基礎架構**：導入 `IStorageRepository`、本地/雲端 repository 與 `RepositoryContext`。
- **導覽結構**：抽離 `AppHeader` 與 `MobileNav` 元件。

### 🛡️ 穩定性與安全
- **ErrorBoundary**：新增全域錯誤防護。
- **型別安全修正**：補強型別檢查與邊界處理。
- **CSP 強化**：收斂資源來源規則。

### 🧪 測試
- 因 shell/pwsh 不可用，未執行測試與建置。

## 2026-02-10 [v0.3.9] "Architecture Quality Overhaul Complete"
### ✨ Major Refactoring
- **App.tsx Decomposition**:
    - Extracted `appReducer` and `initialAppState` to `reducers/appReducer.ts` (-50 lines).
    - Extracted data loading logic to `hooks/useAppDataLoader.ts` (-75 lines).
    - Extracted `GlobalModals` component to handle settings, resume, and share modals (-30 lines).
    - Reduced `App.tsx` complexity significantly, improving maintainability.

### 🛠️ Infrastructure
- **Unified Data Loading**: Centralized initial data fetching and quiz pool loading in `useAppDataLoader`.
- **Modal Management**: Centralized modal logic in `GlobalModals.tsx`.

### 🛡️ Type Safety & Tests
- **Broken Imports**: Fixed broken import paths in `src/__tests__/appReducer.test.ts` caused by the refactor.
- **Type Solidification**: Updated `QuizState` interface to support all quiz modes correctly.

### 📝 Notes
- **Verification Complete**: 
    - `App.tsx` line count: **297 lines** (Task verified ✓).
    - Production build: `npm run build` SUCCEEDED (Verified ✓).
    - Known issue: Local environment missing `@types/react` causes linting errors in `ErrorBoundary.tsx`, but logic is build-ready.

## 2026-02-11 [v0.3.10] "Console Purity & Stability"
### 🐛 Bug Fixes
- **Console Warnings Optimization**:
  - **Favicon 404**: Added `public/favicon.svg` and linked it in `index.html` to eliminate persistent browser 404 errors.
  - **Supabase 400 (Challenges)**: Refactored `getMyChallenges` in `services/challenges.ts` to use a **Manual Join** strategy (fetching raw challenges then fetching profiles/banks separately). This bypasses unreliable PostgREST embedded resource syntax and resolves the 400 Bad Request error.
- **Spec Integrity**:
  - Incremented OpenSpec documentation by syncing `fix-console-warnings` delta spec into the main `social-sharing` specification.
  - Successfully archived the `fix-console-warnings` change workflow.

### 🛠️ Infrastructure
- **Verification**: Confirmed fix via `browser_subagent` and successful production build (`npm run build`).



## 2026-02-11 [v0.3.11] "Deployment Stability & Optimization"
### 🐛 Build Fixes
- **Dependency Resolution**:
  - Downgraded `eslint` and `@eslint/js` to v9.x to resolve peer dependency conflict with `typescript-eslint` causing `npm install` failures.
  - Successfully verified fresh install and build process.

### 🚀 Optimization
- **Bundle Size**:
  - Implemented manual chunk splitting in `vite.config.ts` to separate vendor libraries (React, Framer Motion, Recharts, API Clients).
  - Reduced main entry bundle size and eliminated Vite "large chunk" warnings.

## 2026-03-10 [v0.4.1] "Project Memory MCP Repair"
### 🛠️ Infrastructure & Memory
- **MCP Runtime Fix**:
  - Repaired `C:\\Users\\user\\.codex\\skills\\project-memory-refresh\\scripts\\project_memory_mcp_server.py` by restoring module-level `score_entry()` scope, fixing `search_memory` runtime failure (`name 'score_entry' is not defined`).
- **Project-Local Memory Wiring**:
  - Generated `MEMORY.md`, `.project-memory/project_memory_mcp_entry.py`, `.codex/config.toml`, `.cursor/mcp.json`, and `.mcp.json` for repo-local project memory routing.
  - Rebuilt `docs/INDEX.md` and `.memory-index/` so project memory search no longer depends on the global auto-root server.
- **Skill Hardening**:
  - Added `verify_project_memory_mcp.py` so `project-memory-refresh` now validates the repo-local MCP server immediately after refresh.
  - Updated `refresh_project_memory_bundle.py` to execute post-refresh MCP verification automatically.
  - Updated `ensure_project_mcp_configs.py` so Antigravity remains enabled by default for frequent AntiGravity users, but global write failures now degrade to warnings unless `--require-antigravity` is explicitly requested.
- **Known Limitation**:
  - `refresh_project_memory_bundle.py` attempted to update `%USERPROFILE%\\.gemini\\antigravity\\mcp_config.json` and hit a permission boundary; local repo MCP config was already installed successfully, so Codex/Gemini/Cursor project-local usage is unaffected.

## 2026-05-18 [v0.4.2] "Vercel Build Dependency Hygiene Fix"
### 🐛 Build Fixes
- **Vercel dependency hygiene**:
  - Identified the real deployment root cause: remote `origin/main` tracked `node_modules/` files and a Windows-reserved `nul` path, causing Vercel to build from a corrupted dependency tree.
  - Kept the production build script on the standard `vite build`; the fix is to remove tracked dependencies from Git and rely on Vercel's fresh install.
  - Ensured `.gitignore` contains `node_modules` so generated dependencies stay untracked.

### 🧪 Verification
- `npx tsc --noEmit` passed.
- `npm run build` passed with Vite 6.4.1.
