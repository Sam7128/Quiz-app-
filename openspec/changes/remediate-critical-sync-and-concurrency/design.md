## Context

MindSpark 2026-09-13 深度審計揭露了 2 CRITICAL + 3 HIGH + 3 MEDIUM/IW 層級缺陷，全部通過靜態檢查但在運行期極端路徑（斷網重連、連按 Enter、快速切換節點、多分頁並行、長時間離線）觸發。本設計僅覆蓋 Phase 1 中確認可局部手術修復的 8 個缺陷（C1, C2, H1, H2, H3, P1, IW-2, M1），不涉及架構重構（H4/M2 排入 Phase 2）。

經「雙軌審查（減法 Ponytail + 加法 Leak-proof）」深度校準，本計畫全面排除了「微任務假解鎖」、「無條件清草稿誤殺」、「UI-only 假鎖」、「冗餘 Ref 與虛構抽象」，實現 100% 漏桶防禦與最小複雜度。

**現有約束**：
- Service Layer + Domain Hooks 模式，元件禁止直接存取 Storage
- `runWithSyncLock`（Web Locks + localStorage fallback）已為唯一併發控制入口
- localStorage keys 以 `mindspark_` 為前綴，格式不可變更
- 零 `any`、Suspense 完善、319 測試全綠

## Goals / Non-Goals

**Goals:**
1. **C1 閉環**：提取 `mapQuestionToDbRow` 統一資料形狀；`retryCleanupDirtyBanks` 在清理孤兒前先補傳 upsert，各 bankId 獨立隔離，失敗則保留 dirty 標記
2. **C2 閉環**：Session 同步以已完成 Chunk 數量（`chunks.filter(c => c.status === 'completed').length`）為主判據，時鐘差異降為輔助；雲端覆蓋時採 Chunk 精確比對清理草稿（Chunk-specific Draft Reconcile），保留用戶 active draft
3. **H1 閉環**：`handleAnswer` 引入 `lastAnsweredQuestionIndexRef` 與 `isProcessingRef` 互斥鎖，廢棄微任務解鎖，在切題（`nextQuestion`）前徹底阻斷對同一題重複作答，防止連按 Enter 重複加分 / 錯題灌入 / SM-2 雙重評分
4. **H2 閉環**：`NodeEditPanel` debounce 善用 React `useEffect` cleanup 閉包天生捕獲之 `nodeId`，切換與 unmount 前強制 flush 並清除定時器，不引入多餘的 `prevNodeIdRef`
5. **H3 閉環**：LocalStorage fallback 鎖增加 double-check 二次驗證
6. **P1 閉環**：刪除到期 `applyDagreLayout` 別名及測試引用
7. **IW-2 閉環**：`AppContent.tsx` 內聯 `animationVariants` 外提至 Module Scope
8. **M1 閉環**：`useGraphCodeMode` 在語法錯誤時於 Hook 底層（`handleToggleEditMode`）阻斷切換至 Visual 模式，並返回 `canSwitchToVisual: boolean` 標誌供 `GraphToolbar.tsx` 禁用按鈕；修正路徑為真實存在的 `GraphEditor.tsx` 與 `GraphToolbar.tsx`

**Non-Goals:**
- H4（ConceptNode memo 深比對）— 需要架構級 quickActions 拆離，排入 Phase 2
- M2（Radial 佈局拖曳解鎖）— 需要設計互動模式切換，排入 Phase 2
- P2（fontWeight 正式下線）— 需要資料遷移腳本，排入 Phase 2
- U1/U2/U3（GraphEditor 拆分、DiamondNode、`as unknown as`）— 結構性重構

## Decisions

### D1: C1 — upsert-before-cleanup 策略、映射共用與縱深防禦
**選擇**：
1. 在 `services/cloudStorage.ts` 內部提取輕量 helper `mapQuestionToDbRow(q: Question, bankId: string)`，統一 `saveCloudQuestions` 與 `retryCleanupDirtyBanks` 的資料組裝。
2. **快取缺失防護 (D7-001 修復)**：在讀取本地題庫時，若 `localQuestionsRaw === null`，代表本地快取已被清除（Cache Eviction），系統 SHALL 記錄 `console.warn` 並直接將該 bankId 移出 `dirty_banks`，**嚴格禁止執行全量刪除**，以保護雲端既有資料不被惡意或偶發清空。
3. **錯誤隔離**：在 `retryCleanupDirtyBanks` 的 `for (bankId of list)` 迴圈內，為每個 bankId 設置獨立的 `try-catch` 異常隔離，防止單一損毀題庫（如 `JSON.parse` 失敗）中斷其餘題庫的修復處理。
4. **補傳後清理與縱深防禦 (D6-001 修復)**：若本地題庫存在，先執行 `supabase.from('questions').upsert()` 補傳；若 upsert 失敗，將 bankId 加入 `remaining` 並 `continue`；在執行孤兒題目刪除時，所有 `delete().in('id', chunk)` 必須**強制鏈式加上 `.eq('bank_id', bankId)`**，達成資料庫層與應用層雙重隔離，杜絕跨題庫/跨用戶 ID 洩漏。只有在 upsert 與 delete 均成功完成後，才將 bankId 移出 dirty list。

**理由**：
- 消除原本代碼庫不存在 `mapQuestionToDbRow` 卻聲稱復用的虛構抽象問題
- 單一 bank 損毀時具備容錯隔離，不引發整體清理掛起
- 嚴密防禦快取驅逐導致的雲端題目滅頂災難與 cross-bank ID 注入

### D2: C2 — Chunk 級聯集合併 (Set Union Merge) 與草稿精確清理策略
**選擇**：
1. 升級為 **Chunk 級聯集合併 (Chunk-level Set Union Merge)** 取代粗暴的單純純量 LWW 覆寫：
   - 引入 `mergeChunkedPracticeSessions(local, cloud): ChunkedPracticeSession` 函式。
   - 逐一比對每個 chunk index：若 local 或 cloud 任一方該 chunk 的 status 為 `'completed'`，合併結果的 chunk status 即為 `'completed'`（保留最高分與最晚完成時間）。
   - 若兩端某 chunk 均未完成，保留具備作答進度或 `savedAt` 較新的 chunk。
   - 若合併後所有 chunks 均為 `'completed'`，則 session 的 overall status 推進至 `'completed'`。
   - 合併後的 session 回寫本地 localStorage，並透過 `saveCloudPracticeSession` 同步至雲端。
2. 時鐘漂移指標：僅保留 `isLocalFuture`（本地時間超過 `now + 5min`）作為異常預警。
3. **Chunk 精確草稿清理 (Chunk-specific Draft Reconcile)**：僅清理合併後狀態已為 `'completed'` 之 chunk drafts，用戶本地正在進行中的 active draft 予以完整保留，杜絕離線在製進度被抹殺。

**理由**：
- 徹底解決 D7-002：多裝置分歧作答（例如手機完成 Chunk 0、平板完成 Chunk 1）在同步時兩端進度無損融合，任一裝置的學習成果均不會被單向覆蓋丟失。
- 零草稿誤殺，離線答題中斷可 100% 恢復。

### D3: H1 — 題目索引鎖 + 切題解鎖（徹底根除 Enter 重複作答）
**選擇**：
1. 廢除 `queueMicrotask` 解鎖設計。因用戶作答後停留在反饋畫面（1~2 秒等待下一題），微任務在微秒級（當前呼叫棧結束）即完成解鎖，用戶在反饋展示期再次按 Enter 仍會穿透觸發重複答題（解決 D4-001）。
2. 引入雙重鎖定防護：
   - `isProcessingRef = useRef(false)`：防抖與單次執行互斥
   - `lastAnsweredQuestionIndexRef = useRef<number | null>(null)`：題號作答標記
3. 在 `handleAnswer` 開頭檢查：
   ```typescript
   if (isProcessingRef.current || lastAnsweredQuestionIndexRef.current === quizState.currentQuestionIndex) {
     return;
   }
   isProcessingRef.current = true;
   lastAnsweredQuestionIndexRef.current = quizState.currentQuestionIndex;
   ```
4. 解鎖時機：
   - 答題當次不透過微任務解鎖
   - 在 `nextQuestion`（切題）時執行 `isProcessingRef.current = false`
   - 在 `startQuiz`（重啟測驗）時重置 `lastAnsweredQuestionIndexRef.current = null; isProcessingRef.current = false;`

**理由**：
- 徹底閉環：同一題目索引下絕對只允許一次作答判定，在切題前多次觸發一律靜默阻斷
- 零依賴額外定時器，代碼簡潔且防禦嚴密

### D4: H2 — React Cleanup 閉包捕獲 + beforeunload 關閉監聽
**選擇**：
1. 在 `components/KnowledgeGraph/NodeEditPanel.tsx` 中，將 `useEffect` 依賴設為 `[nodeId, onUpdate]`。
2. 廢除 `prevNodeIdRef`。利用 React `useEffect` 的 cleanup 函式天生閉包捕獲「本次 render 的 `nodeId`」特性。
3. **關閉分頁防禦 (D10-001 修復)**：在 `useEffect` 中同時註冊 `window.addEventListener('beforeunload', handleBeforeUnload)`，當用戶直接關閉分頁或瀏覽器時，同步將 `pendingUpdateRef.current` flush 至 `onUpdate(nodeId, ...)`。
   ```typescript
   useEffect(() => {
     const handleBeforeUnload = () => {
       if (Object.keys(pendingUpdateRef.current).length > 0) {
         onUpdate(nodeId, pendingUpdateRef.current);
         pendingUpdateRef.current = {};
       }
     };
     window.addEventListener('beforeunload', handleBeforeUnload);

     return () => {
       window.removeEventListener('beforeunload', handleBeforeUnload);
       if (debounceRef.current) {
         clearTimeout(debounceRef.current);
         debounceRef.current = null;
       }
       if (Object.keys(pendingUpdateRef.current).length > 0) {
         onUpdate(nodeId, pendingUpdateRef.current);
         pendingUpdateRef.current = {};
       }
     };
   }, [nodeId, onUpdate]);
   ```

**理由**：
- 消除 `prevNodeIdRef` 的時序脫鉤風險
- 切換節點、組件 unmount 或瀏覽器關閉分頁時，pending 資料必定在第一時間 flush，杜絕資料覆寫與遺失

### D5: H3 — Double-check lock pattern
**選擇**：在 `localStorage.setItem(fallbackKey, token)` 之後，等待 `30 + Math.random() * 40` ms，再次 `localStorage.getItem(fallbackKey)` 驗證 token 是否仍為自己所有。若不是，拋出 `Error('Sync lock held by another tab')`。  
**理由**：
- 隨機延遲破壞兩個分頁的同步時序對齊
- 30~70ms 足以涵蓋 localStorage 跨分頁廣播延遲
- 現代瀏覽器使用 Web Locks，僅 fallback 路徑執行

### D6: P1 — 直接刪除 + 測試更新
**選擇**：刪除 `graphUtils.ts` 中的 `applyDagreLayout` 導出函式與 ponytail 註解。更新 `radialLayout.test.ts` 移除 import 並改用 `applyAutoLayout`。  

### D7: IW-2 — Module-scope variant 提取
**選擇**：將 `animationVariants` 移至 `AppContent.tsx` 的 component function 外部（module scope），變為 `const PAGE_TRANSITION_VARIANTS = { ... }`。  

### D8: M1 — Hook 底層硬防禦 + UI 禁用雙重守衛
**選擇**：
1. 底層防禦：在 `hooks/useGraphCodeMode.ts` 的 `handleToggleEditMode` 函式入口增加硬性阻斷：
   ```typescript
   if (editMode === 'code' && codeErrors.length > 0) {
     return;
   }
   ```
   阻斷快捷鍵（如 Ctrl+E）或程式碼繞過。
2. 標誌導出：在 `useGraphCodeMode` 的返回值中增加 `canSwitchToVisual: codeErrors.length === 0`。
3. UI 呈現：修正檔案路徑至真實存在的 `components/KnowledgeGraph/GraphEditor.tsx` 與 `components/KnowledgeGraph/GraphToolbar.tsx`，傳遞並消費 `canSwitchToVisual`，在 `false` 時禁用切換按鈕並提示 Toast。

## Risks / Trade-offs

| 風險 | 嚴重度 | 緩解措施 |
|------|--------|----------|
| D1: upsert 重試在大量題目時增加網路流量 | LOW | 沿用既有分批策略（500/batch），且重試僅在啟動時觸發一次 |
| D2: 移除時鐘漂移閾值後，真正的時鐘異常 session 不再被截攔 | LOW | 保留 `isLocalFuture` 偵測（`> now + 5min`），且新增 `console.warn` 記錄進度衝突 |
| D3: 用戶快速按 Enter 切題速度過快 | LOW | 切題操作推進 `currentQuestionIndex` 並於 `nextQuestion` 解鎖，完全遵循題目生命週期，不會引發卡死 |
| D5: 30~70ms 延遲略增同步啟動時間 | NEGLIGIBLE | 僅影響 localStorage fallback 路徑（舊瀏覽器），現代瀏覽器使用 Web Locks 不受影響 |

## Migration Plan

**部署順序**：全部為客戶端代碼變更，無需後端遷移。  
**回滾策略**：Git revert 單一 commit 即可完全回滾。  
**驗證閘門**：
1. `npx tsc --noEmit` — Exit 0
2. `npm test` — 319+ 測試全數綠燈（含新增測試）
3. `npx knip` — 零新增死碼

