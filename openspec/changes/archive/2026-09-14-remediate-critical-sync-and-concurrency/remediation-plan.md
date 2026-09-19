# 審計修復計劃：Remediate Critical Sync and Concurrency (Opus 4 R4)

依據第四輪高階獨立審計報告 [`audit_opus4-r7k2.md`](audit_reports/audit_opus4-r7k2.md) 制定。本計劃採取**手術級精準（Surgical Precision）**原則，明確標示問題位置、根因機制、最小化源碼變更與無假綠燈之防禦性驗證方案。完成本計劃後，審計報告所列之所有缺陷、警告與冗餘將全數徹底解決。

---

## 審計問題全貌與修復清單

| 序號 | 等級 | 問題標題 | 涉及檔案與行號 | 解決目標 |
|---|---|---|---|---|
| **1** | 🟠 **HIGH-01** | C2 雲端領先覆蓋丟失本地高分與 in_progress 進度 | `services/cloudStorage.ts:914–945` | 本地儲存一律採用 `mergedSession`；雲端上傳依實質差異判定 |
| **2** | 🟠 **HIGH-02** | H2 `beforeunload` flush 未形成可落盤的同步鏈條 | `NodeEditPanel.tsx:48–68`<br>`GraphEditor.tsx:73–95`<br>`useGraphStorage.ts:58–123` | 建立同步落盤橋接（`immediateSave` 直接呼叫 `saveGraph`）；清理殘留 timer |
| **3** | 🟡 **WARNING-01** | H1 答題鎖在 `restoreSession` / `handleExitQuiz` 未重置 | `hooks/useQuizEngine.ts:112–142, 257–270` | 在恢復 session 與退出測驗路徑顯式重置雙鎖 Ref |
| **4** | 🟡 **WARNING-02** | H1 `handleAnswer` 先上鎖後驗證 `currentQ` 導致死鎖 | `hooks/useQuizEngine.ts:305–309` | 先驗證 `currentQ` 有效性，通過後始得獲取鎖 |
| **5** | 🟡 **WARNING-03** | H3 fallback 鎖過期接管未記錄 spec 要求的 warn | `services/cloudStorage.ts:42–47` | 偵測到超時過期鎖時加入 `console.warn` |
| **6** | 🟡 **WARNING-04**<br>+ **YAGNI-1** | M1 Toast 在 disabled 按鈕不可達 + 三重冗餘防禦 | `GraphToolbar.tsx:175–192`<br>`GraphEditor.tsx:228–234`<br>`useGraphCodeMode.ts:28` | 移除外層 div，按鈕改用 `aria-disabled` + 內部 toast，移除 Editor 冗餘檢查 |
| **7** | 🟡 **WARNING-05** | 合併後 session status 推導邊界可能產生非法狀態 | `services/cloudStorage.ts:765–772` | 嚴格限定僅在 `allCompleted` 為真時推導為 `'completed'` |
| **8** | 📝 **SUGGESTION-02** | active session 超限裁切未依 spec 記錄 sessionId | `services/storage.ts:114–121, 131–137` | 於降級/裁切時加入 `console.warn` 記錄 `sessionId` |
| **9** | 🧹 **YAGNI-2** | `keepIds` Array → Set 雙重構建 | `services/cloudStorage.ts:305–306` | 直接構建 `new Set(toUpsert.map(r => r.id))` |
| **10** | 🧹 **YAGNI-3** | `mapQuestionToDbRow` 雙重 normalize | `services/cloudStorage.ts:231–245, 285–292, 375–383` | `mapQuestionToDbRow` 僅負責欄位映射，消除內部二次正規化 |
| **11** | 🧹 **YAGNI-4** | `aborted`/`AbortError` 條件嗅探散落 | `services/cloudStorage.ts:100, 119, 817, 870, 959` | 提取 `isAbortError(err: unknown): boolean` 統一路徑 |
| **12** | 🧹 **YAGNI-5** | `ConceptNode` 存在 3 個不可達 shape key | `ConceptNode.tsx:225–234` | 移除 `diamond`、`hexagon`、`cloud`，使用精準型別 |
| **13** | 📝 **SUGGESTION-01** | Spec `savedAt` 用語與型別不一致 | `specs/practice-session-storage/spec.md:8` | 修訂 spec 描述為「其 session `updatedAt` 較新」 |
| **14** | 🔴 **PROCEDURAL** | tasks.md 6.1 / 6.2 待提交狀態確認 | `tasks.md:70–72` | 驗證通過後勾選 6.1/6.2，完成統一 Git 提交 |

---

## 手術級精準實作細節

### 模組 1：儲存與同步層 (`services/cloudStorage.ts`, `services/storage.ts`)

#### 1.1 修復 HIGH-01：C2 本地回寫一律使用 `mergedSession` + 實質差異上傳
- **檔案**：`services/cloudStorage.ts`
- **位置**：行 919–945
- **現狀缺陷代碼**：
  ```ts
  const targetSession = shouldUploadToCloud
    ? mergedSession
    : (cloudCompletedCount > localCompletedCount ? cloudSession : mergedSession);
  ```
- **手術方案**：
  1. 將 `targetSession` 改為無條件使用 `mergedSession`：
     ```ts
     const targetSession = mergedSession;
     ```
  2. 強化 `shouldUploadToCloud` 條件：若本地已完成 chunk 具備更高分（`hasBetterChunkScore`）或本地持有進行中進度（`hasLocalProgress`），即使雲端完成 chunk 總數較多，亦必須 upsert 雲端，防止雲端資料落後：
     ```ts
     const hasBetterChunkScore = mergedSession.chunks.some((mc) => {
       const cc = cloudSession.chunks[mc.index];
       return cc && toValidScore(mc.score) > toValidScore(cc.score);
     });
     const hasLocalProgress = mergedSession.chunks.some((mc) => {
       const cc = cloudSession.chunks[mc.index];
       return mc.status === 'in_progress' && cc?.status !== 'in_progress' && cc?.status !== 'completed';
     });

     let shouldUploadToCloud = false;
     if (hasNewCompletedChunk || hasBetterChunkScore || hasLocalProgress) {
       shouldUploadToCloud = true;
     } else if (localCompletedCount > cloudCompletedCount) {
       shouldUploadToCloud = true;
     } else if (localCompletedCount === cloudCompletedCount) {
       shouldUploadToCloud = localSession.updatedAt > cloudSession.updatedAt;
     } else {
       shouldUploadToCloud = false;
     }
     ```

#### 1.2 修復 WARNING-05：合併後 session status 合法性保證
- **檔案**：`services/cloudStorage.ts`
- **位置**：行 765–773
- **手術方案**：
  ```ts
  const allCompleted = mergedChunks.length > 0 && mergedChunks.every((c) => c.status === 'completed');
  const mergedStatus = allCompleted
    ? 'completed'
    : (local.status === 'abandoned' && cloud.status === 'abandoned')
      ? 'abandoned'
      : 'active';
  ```
  嚴格禁止非全 chunk completed 時被 metadata 篡改為 `'completed'`。

#### 1.3 修復 WARNING-03：H3 fallback 鎖過期接管 `console.warn`
- **檔案**：`services/cloudStorage.ts`
- **位置**：行 42–47
- **手術方案**：
  ```ts
  if (raw) {
    const ts = parseInt(raw, 10);
    if (!isNaN(ts)) {
      if (now - ts < SYNC_LOCK_TIMEOUT_MS) {
        throw new Error('Sync lock held');
      }
      console.warn(`[Sync] Detected expired fallback lock (held for ${now - ts}ms). Overriding lock.`);
    }
  }
  ```

#### 1.4 清理 YAGNI-2、YAGNI-3、YAGNI-4
- **檔案**：`services/cloudStorage.ts`
- **手術方案**：
  1. 頂層定義 helper：
     ```ts
     const isAbortError = (err: unknown): boolean => {
       if (!err) return false;
       const msg = err instanceof Error ? err.message : String(err);
       return msg.includes('aborted') || msg.includes('AbortError');
     };
     ```
     取代 L100, L119, L817, L870, L959 散落的嗅探。
  2. `mapQuestionToDbRow`（L231–245）移除內部重複的 `normalizeQuestionForPersistence`，直接映射已正規化之欄位。
  3. L305–306 移除雙重陣列轉換：
     ```ts
     const keepIdsSet = new Set(toUpsert.map((r) => r.id));
     ```

#### 1.5 實現 SUGGESTION-02：active session 超限裁切記錄日誌
- **檔案**：`services/storage.ts`
- **位置**：行 113–139
- **手術方案**：
  在 `enforceGuestPracticeSessionLimits` 中：
  - 轉為 `abandoned` 時加入：
    ```ts
    console.warn(`[PracticeSession] Active session limit exceeded (${PRACTICE_ACTIVE_LIMIT}). Marking session abandoned: ${targetId}`);
    ```
  - 總數超限刪除時加入：
    ```ts
    console.warn(`[PracticeSession] Total session limit exceeded (${PRACTICE_TOTAL_LIMIT}). Pruning session: ${session.id}`);
    ```

---

### 模組 2：圖譜編輯器與卸載同步鏈 (`NodeEditPanel`, `GraphEditor`, `useGraphStorage`)

#### 2.1 修復 HIGH-02：建立 `beforeunload` 同步落盤鏈條
- **根因鏈條**：
  `NodeEditPanel` -> `onUpdate` -> React `setNodes`（非同步未 commit）-> `refs.current` 仍為舊值 -> `useGraphStorage` 內 `saveTimerRef` 為 null -> 頁面關閉時遺失 <300ms 內輸入的資料。
- **手術方案**：
  1. **`hooks/useGraphStorage.ts`**：
     讓 `flushSave` 支援接收可選的最新節點覆蓋陣列 `overrideNodes?: RFNode[]`：
     ```ts
     const flushSave = useCallback((overrideNodes?: RFNode[]) => {
       if (saveTimerRef.current) {
         clearTimeout(saveTimerRef.current);
         saveTimerRef.current = null;
       }
       const cur = refs.current;
       const targetNodes = overrideNodes ?? cur.nodes;
       const doc: GraphDocument = {
         ...cur.graph,
         nodes: fromRFNodes(targetNodes),
         edges: fromRFEdges(cur.edges),
         notes: cur.notesDict,
         editMode: cur.editMode,
         backgroundOpacity: cur.bgOpacity,
         layoutMode: cur.layoutMode,
         theme: cur.theme,
         viewState: { ...cur.graph.viewState, readingMode: cur.readingMode, bgOpacity: cur.bgOpacity },
         updatedAt: new Date().toISOString(),
       };
       return saveGraph(doc);
     }, []);
     ```
  2. **`components/KnowledgeGraph/GraphEditor.tsx`**：
     - 維護 `nodesRef`，確保在 React commit 前持有最新值。
     - 從 `useGraphStorage` 導出 `const { flushSave } = useGraphStorage(...)`。
     - 在 `handleUpdateNodeData(nodeId, dataUpdate, options?: { immediateSave?: boolean })` 中：
       ```ts
       const nextNodes = nodesRef.current.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, ...dataUpdate } } : n);
       nodesRef.current = nextNodes;
       pushState(nodes, edges);
       setNodes(nextNodes);
       if (options?.immediateSave) {
         flushSave(nextNodes);
       }
       ```
  3. **`components/KnowledgeGraph/NodeEditPanel.tsx`**：
     - 在 `handleBeforeUnload` 中：
       ```ts
       const handleBeforeUnload = () => {
         if (debounceRef.current) {
           clearTimeout(debounceRef.current);
           debounceRef.current = null;
         }
         if (Object.keys(pendingUpdateRef.current).length > 0) {
           onUpdate(nodeId, pendingUpdateRef.current, { immediateSave: true });
           pendingUpdateRef.current = {};
         }
       };
       ```
       確保：(a) 立即同步呼叫 `saveGraph` 寫入 localStorage；(b) 清除計時器防範幽靈定時器以 `{}` 覆蓋。

#### 2.2 修復 WARNING-04 & YAGNI-1：M1 Toast 提示可達化與防禦精簡
- **檔案**：
  - `components/KnowledgeGraph/GraphToolbar.tsx:175–192`
  - `components/KnowledgeGraph/GraphEditor.tsx:228–234`
- **手術方案**：
  1. `GraphToolbar.tsx`：移除包裹按鈕的 `<div className="inline-flex" onClick=...>`。按鈕移除 `disabled`，改為：
     ```tsx
     <button
       type="button"
       onClick={() => {
         if (editMode === 'code' && canSwitchToVisual === false) {
           toast.warning('請先修正語法錯誤再切換模式');
           return;
         }
         onToggleEditMode();
       }}
       aria-disabled={editMode === 'code' && canSwitchToVisual === false}
       className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ml-1.5 ${
         editMode === 'code' && canSwitchToVisual === false ? 'opacity-50 cursor-not-allowed' : ''
       } ...`}
     ```
  2. `GraphEditor.tsx`：移除重寫的三行 toast 檢查，直接傳入 `onToggleEditMode={handleToggleEditMode}`。
  3. `useGraphCodeMode.ts:28` 保留底層硬防禦 `if (editMode === 'code' && codeErrors.length > 0) return;`。

#### 2.3 清理 YAGNI-5：ConceptNode 不可達 shape keys
- **檔案**：`components/KnowledgeGraph/ConceptNode.tsx`
- **位置**：行 225–235
- **手術方案**：
  ```ts
  type StandardShapeType = Exclude<NodeShapeType, 'diamond' | 'hexagon' | 'cloud'>;
  const shapeClassName: Record<StandardShapeType, string> = {
    concept: 'rounded-lg min-w-[120px]',
    square: 'rounded-lg w-36 min-h-32',
    rounded: 'rounded-2xl min-w-[140px]',
    pill: 'rounded-full min-w-[160px] min-h-16',
    circle: 'rounded-full w-40 min-h-40',
  };
  ```

---

### 模組 3：測驗核心防禦 (`hooks/useQuizEngine.ts`)

#### 3.1 修復 WARNING-01：`restoreSession` 與 `handleExitQuiz` 鎖重置
- **檔案**：`hooks/useQuizEngine.ts`
- **手術方案**：
  1. 在 `restoreSession`（約 L132）：
     ```ts
     lastAnsweredQuestionIndexRef.current = null;
     isProcessingRef.current = false;
     ```
  2. 在 `handleExitQuiz`（約 L267）：
     ```ts
     lastAnsweredQuestionIndexRef.current = null;
     isProcessingRef.current = false;
     ```

#### 3.2 修復 WARNING-02：`handleAnswer` 先驗證題目後上鎖
- **檔案**：`hooks/useQuizEngine.ts`
- **位置**：行 301–310
- **手術方案**：
  將取得與驗證 `currentQ` 移至上鎖之前：
  ```ts
  const handleAnswer = useCallback((isCorrect: boolean, selectedAnswer: string | string[]) => {
    if (isProcessingRef.current || lastAnsweredQuestionIndexRef.current === quizState.currentQuestionIndex) {
      return;
    }

    const currentQ = quizState.activeQuestions[quizState.currentQuestionIndex];
    if (!currentQ) return;

    isProcessingRef.current = true;
    lastAnsweredQuestionIndexRef.current = quizState.currentQuestionIndex;
  ```

---

### 模組 4：規格書用語修訂與流程封存

#### 4.1 修復 SUGGESTION-01：Spec 用語修訂
- **檔案**：`openspec/changes/remediate-critical-sync-and-concurrency/specs/practice-session-storage/spec.md`
- **位置**：行 8
- **手術方案**：將 `savedAt` 修訂為「其 session `updatedAt` 較新的 chunk」，保持與 TypeScript 介面定義一致。

#### 4.2 結案流程：`tasks.md` 更新與單一原子提交
- **檔案**：`openspec/changes/remediate-critical-sync-and-concurrency/tasks.md`
- **手術方案**：
  - 勾選 6.1：`[x] 6.1 所有變更在單一 Git commit 中提交`
  - 勾選 6.2：`[x] 6.2 驗證閘門全部通過，無需回滾 (N/A)`
  - 執行 Git 提交：`fix: remediate critical sync/concurrency defects (C1,C2,H1,H2,H3,P1,IW-2,M1,R4-remediation)`

---

## 驗證計劃與防假綠燈單元測試

### 1. 單元測試清單 (針對本輪審計新補齊)

| 測試檔 | 測試場景 | 斷言重點（消除假綠燈） |
|---|---|---|
| `syncLocalPracticeSessions.test.ts` | 雲端領先 chunk 數，但本地 Chunk 0 分數較高 (100 vs 60) 且本地持有 Chunk 3 `in_progress` | 斷言同步後本地 localStorage 完整保留 Chunk 0 的 100 分與 Chunk 3 的 `in_progress`；斷言觸發雲端 upsert 更新更高分數 |
| `syncLocalPracticeSessions.test.ts` | 損毀 metadata：單端 session 標記為 completed 但 chunks 僅 2/5 完成 | 斷言合併後 session status 必須為 `'active'`，不可為 `'completed'` |
| `nodeEditPanelFlush.test.ts` | 整合真實 `GraphEditor` 與 `useGraphStorage`，在輸入後立即派發 `window.dispatchEvent(new Event('beforeunload'))` | 斷言 `localStorage.getItem('mindspark_graphs')` 同步包含最新輸入內容；斷言計時器被清空且無殘留回調 |
| `useQuizEngineRace.test.ts` | 答完第 0 題鎖上後呼叫 `handleExitQuiz`，隨後以 `restoreSession` 恢復在第 0 題 | 斷言恢復後對第 0 題呼叫 `handleAnswer` 可正常處理，不被靜默吞掉 |
| `useQuizEngineRace.test.ts` | `activeQuestions` 暫時為空陣列時調用 `handleAnswer` | 斷言安全返回，且隨後放入有效題目再次答題時鎖未卡死，答題成功計分 |
| `runWithSyncLock.test.ts` | 存在超過 30,000ms 的過期 fallback 鎖 | 斷言成功接管鎖執行回調，且 `console.warn` 被觸發並帶有過期鎖提示 |
| `practiceSessionStorage.test.ts` | 建立超過上限的 active sessions 與 total sessions | 斷言 `console.warn` 有被觸發並記錄被標記或裁切之 `sessionId` |

### 2. 全庫自動化門禁執行
- `npx tsc --noEmit`：期望 Exit Code 0（零型別錯誤）。
- `npm test`：期望全數通過（現有 348 測試 + 新增 7 項防假綠燈測試，全部綠燈）。
- `npx knip`：期望 Exit Code 0（零新增死碼與未導出項目）。
- `git status`：確認所有檔案變更齊全，完成乾淨提交。
