## 1. 類型定義與資料模型 (Type First)

- [x] 1.1 在 `types/battleTypes.ts` 新增 `PracticeChunk` 介面：`index`, `questionIds`, `status`, `score`, `totalQuestions`, `wrongQuestionIds`, `completedAt?`
- [x] 1.2 在 `types/battleTypes.ts` 新增 `ChunkedPracticeSession` 介面：`id`, `userId?`, `bankIds`（UUID 字串陣列，對應 DB `bank_ids UUID[]`）, `bankNames`, `bankQuestionMap`（`{ [bankId]: string[] }` 題庫→題目快照）, `chunkSize`, `questionIds`, `chunks: PracticeChunk[]`, `status: 'active' | 'completed' | 'abandoned'`, `createdAt`, `updatedAt`
- [x] 1.3 在 `types.ts` 的 `QuizState.mode` union type 新增 `'chunked'` 選項
- [x] 1.4 在 `types/battleTypes.ts` 新增 `ChunkMeta` 介面（傳遞給 QuizEngine 的 chunk 上下文）：`chunkIndex`, `totalChunks`, `sessionId`
- [x] 1.5 執行 `npx tsc --noEmit` 確認型別定義無錯誤

**驗證**: `npx tsc --noEmit` 通過，無 `any` 型別。

## 2. 資料庫 Migration

- [x] 2.1 在 `docs/migrations/` 新增 `PRACTICE_SESSIONS_MIGRATION.sql`：建立 `practice_sessions` 表（id, user_id, bank_ids UUID[], bank_names TEXT[], bank_question_map JSONB, chunk_size, question_ids, chunks JSONB, status, created_at, updated_at）
- [x] 2.2 在 migration SQL 中新增 `idx_practice_sessions_user_status` 索引
- [x] 2.5 在 migration SQL 中新增複合索引以支援排序：`idx_practice_sessions_user_status_updated_at`（`user_id, status, updated_at DESC`）
- [x] 2.3 在 migration SQL 中新增 RLS 政策：SELECT/INSERT/UPDATE/DELETE 限制 `user_id = auth.uid()`
- [x] 2.4 在 migration SQL 中啟用 RLS：`ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY`
- [x] 2.6 在 migration SQL 中確保 `updated_at` 在 UPDATE 時自動推進（例如新增 trigger：每次 UPDATE 設定 `updated_at = now()`）
- [x] 2.7 在 migration SQL 中將 `user_id` FK 設為 `ON DELETE CASCADE`

**驗證**: SQL 語法正確，使用 `IF NOT EXISTS` 確保冪等。

## 3. Storage Layer 擴展

- [x] 3.1 在 `services/storage.ts` 的 `STORAGE_KEYS` 新增 `PRACTICE_SESSIONS: 'mindspark_practice_sessions'`
- [x] 3.2 在 `services/repository.ts` 的 `IStorageRepository` 介面新增 4 個方法：`getPracticeSessions`, `savePracticeSession`, `deletePracticeSession`, `abandonPracticeSession`；並確保 `ChunkedPracticeSession` 的 `bankQuestionMap` 可被完整序列化/反序列化
- [x] 3.3 在 `services/localRepo.ts` 實作 `LocalStorageRepository` 的 practice session CRUD（含 FIFO 5 限制邏輯）
- [x] 3.4 在 `services/cloudStorage.ts` 新增雲端 API 函式：`getCloudPracticeSessions`, `saveCloudPracticeSession`, `deleteCloudPracticeSession`, `abandonCloudPracticeSession`
- [x] 3.5 在 `services/cloudRepo.ts` 實作 `CloudStorageRepository` 的 practice session CRUD（委派到 cloudStorage.ts API）
- [x] 3.6 在 `services/cloudStorage.ts` 新增 `syncLocalPracticeSessions()` — 登入時將 localStorage sessions 上傳到 Supabase（需採用 `updated_at` 的 LWW：不得以較舊 local 覆蓋較新 cloud）
- [x] 3.7 在 `services/cloudStorage.ts` / local fallback 方案中加入 `dirty` 標記與重試機制：失敗的 upsert 保留在 local 並標記待同步，於登入或 Dashboard 載入時重試並顯示同步狀態
- [x] 3.8 在 `services/localRepo.ts` 實作 Guest Retention 策略（非時間過期）：active sessions 最多 5（FIFO），且 localStorage 中總 sessions（含 abandoned/completed）最多 10，超過時從最舊的非 active 開始「物理刪除」
- [x] 3.10 在 `hooks/useChunkedPractice.ts` 新增 chunk 專屬 draft 快照（例如 `mindspark_chunk_draft:<sessionId>:<chunkIndex>`），並指定 `useChunkedPractice` 為唯一寫入者；每次答題、切題、頁面離開前 SHALL 更新 draft
- [x] 3.9 執行 `npx tsc --noEmit` 確認介面實作完整

**驗證**: `npx tsc --noEmit` 通過；LocalRepo 和 CloudRepo 都完整實作介面。

## 4. 核心 Domain Hook: `useChunkedPractice`

- [x] 4.1 建立 `hooks/useChunkedPractice.ts` 骨架：匯出 `useChunkedPractice(options)` Hook
- [x] 4.2 實作 `createSession(bankIds, chunkSize)` — 從 repository 取得題目 → 隨機打亂 → 按 chunkSize 切分 → 建立 `ChunkedPracticeSession` → 持久化
- [x] 4.3 實作 `loadActiveSessions()` — 從 repository 取得所有 active sessions → 設置到 state
- [x] 4.4 實作 `startChunk(sessionId, chunkIndex)` — 驗證 chunk 是否可開始 → 更新 chunk status 為 `in_progress` → 回傳 chunk 的 questionIds 供 QuizEngine 使用
- [x] 4.5 實作 `completeChunk(sessionId, chunkIndex, score, wrongIds)` — 標記 chunk 為 `completed` → 判斷是否所有 chunk 已完成 → 更新 session status → 持久化
- [x] 4.5a 強化 `completeChunk` 冪等：若 chunk 已為 `completed`，則 SHALL 直接 no-op（避免重複寫入與分數異常）
- [x] 4.6 實作 `abandonSession(sessionId)` — 更新 status 為 `abandoned` → 持久化
- [x] 4.7 實作 `restoreSession(sessionId)` — 驗證 question IDs 仍存在 → 找到第一個 pending/in_progress chunk → 回傳恢復資訊
- [x] 4.8 實作 question ID 驗證邏輯 — 恢復時比對快照 IDs 與題庫實際 IDs，標記缺失題目，顯示 toast
- [x] 4.8a 恢復時重算受影響 chunk 的 `totalQuestions`（刪除題目後的進度/正確率計算仍正確）
- [x] 4.8b 若某 chunk 所有題目都不存在 → 自動標記該 chunk 為 `completed`（score = 0）並跳過到下一個 chunk
- [x] 4.8c 若整個 session 驗證後沒有任何可用題目（例如來源題庫被刪除）→ session SHALL 自動標記為 `abandoned` 並顯示 toast
- [x] 4.9 在 chunk draft 恢復中保留 `currentQuestionIndex`, `score`, `wrongQuestionIds`, `pendingSkill` 等最小狀態；若 draft 缺失則回退到 chunk 第 1 題
- [x] 4.10 在 `useChunkedPractice` 中實作 draft writer 與 restore 的觸發點：每次 answer/nextQuestion/onBeforeUnload 皆同步 draft；完成 chunk 時清除 draft；restore 時優先還原 draft

**驗證**: Hook 可在 React 元件中正常呼叫；`npx tsc --noEmit` 通過。

## 5. QuizEngine 整合

- [x] 5.1 修改 `hooks/useQuizEngine.ts` 的 `startQuiz()` — `mode` SHALL 明確支援 `'chunked'`（建議型別引用 `QuizState['mode']`）；並新增可選參數 `chunkMeta?: ChunkMeta`（當 mode 為 `'chunked'` 時 SHALL 為必填）。當 mode 為 `'chunked'` 時：
	- SHALL 以 `specificIds` 傳入當前 Chunk 的 `questionIds`（作為 activeQuestions 的子集）
	- SHALL 以 `overrideBankIds` 傳入 Session 的 `bankIds`（避免受 Dashboard 勾選變動影響）
- [x] 5.1a 當 mode 為 `'chunked'` 時，`useChunkedPractice` SHALL 負責將當前 Chunk 的 question 子集與 draft state 傳給 `useQuizEngine`，避免由 Dashboard 直接餵入不一致資料
- [x] 5.2 修改 `useQuizEngine` 的 session save effect — 當 mode 為 `'chunked'` 時，不寫入 `mindspark_quiz_session`（由 `useChunkedPractice` 管理持久化）
- [x] 5.3 在 `useQuizEngine` 新增 `onChunkComplete` callback — 當 `isFinished` 且 mode 為 `'chunked'` 時，通知 `useChunkedPractice` 完成當前 chunk
- [x] 5.4 在 `useQuizEngine` return 值中暴露 `chunkMeta` 供 QuizCard 使用

**驗證**: 現有的 `random`, `mistake`, `retry_session`, `challenge` 模式行為不變（回歸測試）。

## 6. 戰鬥系統適配

- [x] 6.1 修改 `hooks/useBattleSystem.ts` — 新增 `resetForNewChunk()` 方法，重置 streak、questionsAnswered、monsterPool、pendingSkill
- [x] 6.2 在 `useChunkedPractice.startChunk()` 中，當 gameMode ON 時呼叫 `resetForNewChunk()` 或 `startBattle()`
- [x] 6.3 確認 `BattleState` 不被包含在 `PracticeChunk` 的持久化資料中
- [x] 6.4 實作 Chunk 進行中切換 Game Mode 規則：OFF→ON 時 SHALL `startBattle()` 且 battle counters 從 0 開始；ON→OFF 時不影響測驗進度

**驗證**: Chunk 切換時 BattleArena 重新初始化；Cloud 同步資料中不含 BattleState。

## 7. UI 元件

- [x] 7.1 建立 `components/ChunkedPracticePanel.tsx` — 階段選擇面板：選擇 chunk size、顯示預覽分組、開始按鈕
- [x] 7.2 建立 `components/ActiveSessionCard.tsx` — Dashboard 上的 active session 卡片：顯示題庫名、進度 (N/M 階段完成)、最後活動時間、「繼續」/「放棄」按鈕
- [x] 7.3 建立 `components/ChunkCompleteSummary.tsx` — 單一階段完成摘要模態：得分、正確率、「繼續下一階段」/「休息」按鈕
- [x] 7.4 修改 `components/QuizCard.tsx` 進度列 — 當 mode 為 `'chunked'` 且 `totalChunks > 1` 時，額外顯示「📦 階段 X / Y」標示（單一 chunk 時 UI 行為與普通測驗一致）
- [x] 7.5 修改 `components/AppContent.tsx` — 在 Dashboard 區域整合 `ActiveSessionCard` 列表和「新建分階段練習」入口

**驗證**: UI 元件在 Dark Mode 和 Game Mode 下外觀正確；觸控設備可正常操作。

## 8. App 層整合

- [x] 8.1 修改 `App.tsx` — 初始化 `useChunkedPractice` Hook 並傳遞到 `AppContent`
- [x] 8.2 在 `AppContent` props 中新增 chunked practice 相關的 state 和 actions
- [x] 8.3 在 `contexts/RepositoryContext.tsx` 或登入流程中，呼叫 `syncLocalPracticeSessions()` 進行登入同步
- [x] 8.4 修改 `AppAction` union type — 如果需要新增分階段練習相關的 dispatch actions

**驗證**: 完整的端到端流程可運行：Dashboard → 建立 Session → 練習 Chunk → 完成 → 返回 Dashboard → 繼續下一 Chunk。

## 9. 單元測試

- [x] 9.1 建立 `src/__tests__/useChunkedPractice.test.ts` — 測試 createSession 分組邏輯（60 題/20 = 3 組、55 題/20 = 3 組、8 題/20 = 1 組）
- [x] 9.2 測試 completeChunk 狀態轉換 — pending → in_progress → completed，最後一個 chunk 完成後 session 變為 completed
- [x] 9.2a 測試 completeChunk 冪等 — 對同一 chunk 重複呼叫 completeChunk，第二次 SHALL 不改變狀態/分數且不重複寫入
- [x] 9.3 測試 question ID 驗證邏輯 — 部分題目被刪除的恢復場景（`totalQuestions` 重新計算）
- [x] 9.3a 測試 all questions in a chunk were deleted — 該 chunk 自動 completed（score = 0）並跳過
- [x] 9.3b 測試 all questions in a session were deleted（bank deleted）— session 自動 `abandoned` 且不出現在 active 列表
- [x] 9.4 測試 Guest 模式 FIFO 限制 — 第 6 個 session 創建時最舊的被 abandon
- [x] 9.5 建立 `src/__tests__/practiceSessionStorage.test.ts` — 測試 LocalRepo 和 CloudRepo 的 CRUD 操作
- [x] 9.5a 測試 Cloud save failure fallback + dirty/retry — upsert 失敗時 local fallback/dirty；下次載入重試成功後清除 dirty 並不得覆蓋較新 cloud
- [x] 9.6 測試戰鬥系統重置邏輯 — 新增 `resetForNewChunk` 的測試用例到 `useBattleSystem.test.ts`
- [x] 9.6a 測試 Chunk 進行中切換 Game Mode ON — `startBattle()` 被呼叫且 streak/questionsAnswered 從 0 開始（不追溯已作答題目）
- [x] 9.7 建立 `src/__tests__/useQuizEngine.chunked.test.ts` — 測試 `startQuiz(..., 'chunked', specificIds, overrideBankIds, chunkMeta)` 只載入指定子集且不回退/不洗牌跨 chunk
- [x] 9.8 建立 `src/__tests__/useChunkedPractice.draft.test.ts` — 測試 mid-chunk refresh/close 後能從 chunk draft 恢復，且完成 chunk 時清除 draft

**驗證**: `npm test` 全部通過；覆蓋上述所有 scenario。

## 10. E2E 測試

- [x] 10.1 建立 `e2e/chunked-practice.spec.ts` — 跨裝置（多 browser context）流程：Context A 登入並完成第一階段 → Context B 重新登入 → Dashboard 顯示同一 session 的下一個階段可繼續 → 完成第二階段
- [x] 10.2 測試 session 放棄流程 — 創建 session → 放棄 → 驗證 Dashboard 已無此 session
- [x] 10.3 測試小題庫場景 — 8 題 / chunk size 20 → 只有 1 個 chunk → 完成後 session 立即 completed
- [x] 10.4 測試中途退出流程 — 開始 Chunk 後作答數題 → 返回 Dashboard → 繼續 → chunk 從第 1 題重新開始且不顯示階段完成摘要

**驗證**: `npx playwright test e2e/chunked-practice.spec.ts` 通過。

## 11. 文件與清理

- [x] 11.1 更新 `AGENTS.md` — 新增 `useChunkedPractice` 到 Domain Hooks 列表、新增 `PRACTICE_SESSIONS` 到 localStorage Key 列表、更新模組索引
- [x] 11.2 更新 `docs/DEVELOPMENT_LOG.md` — 記錄此次變更的設計決策與影響範圍
- [x] 11.3 更新 `MEMORY.md` — 新增 chunked practice 相關的 hotspots 和 search recipes
- [x] 11.4 執行 `npm run build` 確認生產打包無錯誤

**驗證**: 文件與最新代碼狀態同步；`npm run build` 成功。
