## 1. Storage / Service 層防禦修復 (C1, C2, H3)

- [x] 1.0 **[C1-REFACTOR]** 在 `services/cloudStorage.ts` 提取輕量 helper `mapQuestionToDbRow(q: Question, bankId: string)`，統一 `saveCloudQuestions` 與 `retryCleanupDirtyBanks` 的資料組裝格式，消除型別與欄位不一致。
- [x] 1.1 **[C1]** 修改 `services/cloudStorage.ts` 的 `retryCleanupDirtyBanks`：
  - 在 `for (bankId of list)` 迴圈內，為每個 bankId 設置獨立 `try-catch` 隔離。
  - **快取缺失防護 (D7-001)**：先讀取本地題庫，若 `localQuestionsRaw === null`，代表本地快取丟失，記錄 `console.warn`，將該 bankId 移出 dirty list 並 `continue`，**嚴禁執行全量 delete**。
  - 若本地題庫存在，調用 `supabase.from('questions').upsert()` 補傳；若 upsert 失敗保留 dirty 標記並 `continue`；若本地題庫合法為空陣列 `[]` 則執行全量 delete。
- [x] 1.2 **[C1]** 確保只有在 upsert 與 delete 孤兒清理均成功後，才允許移除 dirty 標記。在所有孤兒刪除查詢（`delete().in('id', chunk)`）中**強制鏈式加上 `.eq('bank_id', bankId)`** 實現縱深防禦 (D6-001)。
- [x] 1.3 **[C1-TEST]** 新增單元測試 `src/__tests__/retryCleanupDirtyBanks.test.ts`：
  - 場景 A：upsert 成功 + delete 成功 → dirty 標記被移除
  - 場景 B：upsert 失敗 → bankId 保留在 dirty list，未執行 delete
  - 場景 C：upsert 成功 + delete 失敗 → bankId 保留在 dirty list
  - 場景 D：本地題庫為空陣列 → 僅執行全量 delete（清理雲端所有題目）
  - 場景 E：某 bankId 本地格式損毀 → 獨立隔離不中斷其他 bankId 的清理
  - 場景 F：本地快取丟失（`null`）→ 記錄警告並移出 dirty 標記，嚴格禁止刪除雲端題目
  - 場景 G：刪除孤兒時確保查詢語句包含 `eq('bank_id', bankId)` 條件
- [x] 1.4 **[C2]** 修改 `services/cloudStorage.ts` 的 `syncLocalPracticeSessions`：實作 **Chunk 級聯集合併 (Chunk-level Set Union Merge)** (D7-002)：
  - 引入 `mergeChunkedPracticeSessions(local, cloud): ChunkedPracticeSession` 輔助函式。
  - 逐一比對每個 chunk index：若 local 或 cloud 任一方該 chunk 的 status 為 `'completed'`，合併結果的 chunk status 即為 `'completed'`（保留最高分與最晚完成時間）。
  - 若兩端某 chunk 均未完成，保留具備作答進度或 `savedAt` 較新的 chunk。
  - 若合併後所有 chunks 均為 `'completed'`，推進 session status 至 `'completed'`。
  - 將合併後的 session 同時回寫本地並 upsert 至雲端。移除 1 小時漂移閾值，保留 `isLocalFuture`（`> now + 5min`）時鐘異常預警。
- [x] 1.5 **[C2]** 雲端版本回寫本地時，改採 Chunk 精確比對清理草稿（Chunk-specific Draft Reconcile）：僅調用清理合併後已完成 chunk 之草稿，嚴禁無條件全量清除，保留用戶本地未結算的 active draft。
- [x] 1.6 **[C2-TEST]** 新增單元測試 `src/__tests__/syncLocalPracticeSessions.test.ts`：
  - 場景 A：本地完成 3/5 chunks，雲端完成 1/5 → 本地 upsert 至雲端
  - 場景 B：本地完成 1/5，雲端完成 3/5 → 採用雲端版本，僅清除已完成 chunk 的 draft，未完成 chunk draft 保留
  - 場景 C：多裝置分歧作答（本地完成 Chunk 0、雲端完成 Chunk 1）→ 兩端 Chunk 0 與 1 成功聯集合併為 completed，無進度覆蓋丟失
  - 場景 D：進度相同，本地 `updatedAt` 較新 → 本地 upsert
  - 場景 E：離線 2 小時，本地進度更高 → 不被誤判為時鐘漂移，本地 upsert
  - 場景 F：`updatedAt > now + 5min` → 偵測為時鐘漂移，採用雲端版本
- [x] 1.7 **[H3]** 修改 `services/cloudStorage.ts` 的 `runWithSyncLock` localStorage fallback：在 `localStorage.setItem(fallbackKey, token)` 之後，加入 `await new Promise(r => setTimeout(r, 30 + Math.random() * 40))`，然後 `if (localStorage.getItem(fallbackKey) !== token) throw new Error('Sync lock held by another tab')`。
- [x] 1.8 **[H3-TEST]** 新增單元測試 `src/__tests__/runWithSyncLock.test.ts`：
  - 場景 A：正常取得鎖 → 回調執行成功 → 鎖釋放
  - 場景 B：另一分頁搶佔 token → double-check 偵測到 → 拋出 Error

## 2. Domain Hook 防禦修復 (H1, M1)

- [x] 2.1 **[H1]** 修改 `hooks/useQuizEngine.ts` 的 `handleAnswer`：廢除 `queueMicrotask` 解鎖 (D4-001)。引入 `lastAnsweredQuestionIndexRef = useRef<number | null>(null)` 與 `isProcessingRef = useRef(false)`。在 `handleAnswer` 開頭檢查 `if (isProcessingRef.current || lastAnsweredQuestionIndexRef.current === quizState.currentQuestionIndex) return;`。上鎖並設置 `lastAnsweredQuestionIndexRef.current = quizState.currentQuestionIndex;`。在 `nextQuestion` 切題時重置 `isProcessingRef.current = false;`，在 `startQuiz` 重置 `lastAnsweredQuestionIndexRef.current = null; isProcessingRef.current = false;`。
- [x] 2.2 **[H1-TEST]** 新增單元測試 `src/__tests__/useQuizEngineRace.test.ts`：
  - 場景 A：在反饋展示期間（同一題索引下）連續快速呼叫 `handleAnswer`，斷言第二次被靜默忽略（分數僅加 1 次，錯題僅記錄 1 次，SM-2 僅評分 1 次）
  - 場景 B：調用 `nextQuestion` 切換到下一題後，下一題的 `handleAnswer` 可正常觸發
- [x] 2.3 **[M1-HOOK]** 修改 `hooks/useGraphCodeMode.ts`：在 `handleToggleEditMode` 入口處加入底層硬防禦 `if (editMode === 'code' && codeErrors.length > 0) return;`，並在返回值中導出 `canSwitchToVisual: codeErrors.length === 0`。
- [x] 2.4 **[M1-UI]** 修改 `components/KnowledgeGraph/GraphEditor.tsx` 與 `components/KnowledgeGraph/GraphToolbar.tsx`：將 `canSwitchToVisual` 傳遞至工具欄，在 `false` 時 disable 模式切換按鈕，並在點擊時顯示 toast「請先修正語法錯誤再切換模式」。

## 3. Component 防禦修復 (H2, IW-2)

- [x] 3.1 **[H2]** 修改 `components/KnowledgeGraph/NodeEditPanel.tsx`：
  - 將 cleanup `useEffect` 的依賴改為 `[nodeId, onUpdate]`。廢除 `prevNodeIdRef`，直接在 cleanup function 中利用閉包捕獲的 `nodeId`：若 `pendingUpdateRef.current` 非空，調用 `onUpdate(nodeId, pendingUpdateRef.current)` flush 資料，然後清除定時器並重置 `pendingUpdateRef.current = {}`。
  - **分頁關閉防禦 (D10-001)**：在 `useEffect` 中註冊 `window.addEventListener('beforeunload', handleBeforeUnload)`，在瀏覽器關閉或分頁關閉時立即同步觸發 pending 資料 flush。
- [x] 3.2 **[H2-TEST]** 新增單元測試 `src/__tests__/nodeEditPanelFlush.test.ts`：
  - 場景 A：在節點 A 輸入 → 快速切換至節點 B → 節點 A 的更新被正確 flush 至節點 A
  - 場景 B：組件卸載時 flush pending 更新至當前節點
  - 場景 C：觸發 `beforeunload` 事件時 flush pending 更新
- [x] 3.3 **[IW-2]** 修改 `components/AppContent.tsx`：將 L130-134 的 `const animationVariants = { ... }` 移至組件函式外部（module scope），重命名為 `const PAGE_TRANSITION_VARIANTS`。更新組件內部引用。

## 4. Ponytail 到期清理 (P1)

- [x] 4.1 **[P1]** 修改 `components/KnowledgeGraph/graphUtils.ts`：刪除 L88-92 的 `applyDagreLayout` 函式導出與 ponytail 註解。
- [x] 4.2 **[P1]** 修改 `src/__tests__/radialLayout.test.ts`：移除 `applyDagreLayout` import，將使用 `applyDagreLayout` 的測試斷言改為直接測試 `applyAutoLayout`。

## 5. 端到端驗證

- [x] 5.1 執行 `npx tsc --noEmit` — 期望 Exit Code 0
- [x] 5.2 執行 `npm test` — 期望全部測試通過（319 + 新增測試）
- [x] 5.3 執行 `npx knip` — 期望零新增死碼（`applyDagreLayout` 移除後不應再被偵測為消費中）
- [x] 5.4 更新 `MEMORY.md` — 移除 [DEC-010] `applyDagreLayout` 別名決策，更新 [RISK-008/009/010/011] 為已修復

## 6. 回滾策略

- [x] 6.1 所有變更在單一 Git commit 中提交，commit message：`fix: remediate critical sync/concurrency defects (C1,C2,H1,H2,H3,P1,IW-2,M1)`
- [x] 6.2 驗證閘門全部通過，無需回滾 (N/A)
