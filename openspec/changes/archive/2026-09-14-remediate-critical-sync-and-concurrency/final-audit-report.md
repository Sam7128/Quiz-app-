# 最終獨立審計缺陷報告（第三位審計員 · Final Independent Audit）

> **審計對象**：`openspec/changes/remediate-critical-sync-and-concurrency`
> **審計角色**：獨立高階 AI 審計者（本次為第三輪獨立審計；前兩輪分別產出 `audit-defect-report.md` 與 `audit-defect-report 2.md`）
> **審計日期**：2026-09-14
> **使用技能**：`openspec-verify-change`、`ponytail-audit`、`ponytail-debt`
> **審計原則**：所有發現均由本審計員對照現行代碼獨立驗證，不假設前兩輪報告結論正確；與前輪重疊之發現已逐一重新取證。

---

## 0. 審計結論（Verdict）

**🟡 CONDITIONAL PASS（有條件通過）**

自動化門禁全部由本審計員親自重跑確認綠燈，8 項缺陷修復（C1, C2, H1, H2, H3, P1, IW-2, M1）在代碼層面皆可對應到 spec scenario。

但在結案（commit）前，仍有 **1 項流程性 CRITICAL**、**2 項 HIGH 級資料完整性 / 持久化缺口**、**6 項 WARNING** 需要負責人裁決。另附 `ponytail-audit` 5 項可收斂項與技術債帳簿 1 筆。

---

## 1. 驗證閘門（本輪親自執行，非引用前輪數字）

| 閘門 | 指令 | 結果 | 備註 |
|------|------|------|------|
| TypeScript | `npx tsc --noEmit` | ✅ Exit 0 | 無錯誤 |
| 單元測試 | `npm test` | ✅ Exit 0 | **53 檔 / 348 測試全部通過** |
| ESLint | `npm run lint` | ✅ Exit 0 | 無警告收尾 |
| 死碼分析 | `npx knip` | ✅ Exit 0 | 無 unused files / deps / exports |
| 工作樹狀態 | `git status --short` | ⚠️ 未提交 | 15 個修改檔 + 7 個新檔仍在 working tree |

測試檔對應關係（逐一核對過 describe/it 清單）：

| 任務要求 | 測試檔 | 場景覆蓋 |
|----------|--------|----------|
| 1.3 C1 場景 A–G | `src/__tests__/retryCleanupDirtyBanks.test.ts` | ✅ A–G 全部存在（含快取遺失 F、`.eq('bank_id')` 斷言 G） |
| 1.6 C2 場景 A–F | `src/__tests__/syncLocalPracticeSessions.test.ts` | ✅ A–F 全部存在，另加 3 個 `mergeChunkedPracticeSessions` 邊界測試 |
| 1.8 H3 場景 A–B | `src/__tests__/runWithSyncLock.test.ts` | ✅ |
| 2.2 H1 場景 A–B | `src/__tests__/useQuizEngineRace.test.ts` | ✅ |
| 3.2 H2 場景 A–C | `src/__tests__/nodeEditPanelFlush.test.ts` | ✅ |
| 4.2 P1 | `src/__tests__/radialLayout.test.ts` | ✅ 已改測 `applyAutoLayout`，無 `applyDagreLayout` 引用 |
| （計畫外加碼）| `src/__tests__/remediateBypass.challenger.test.ts` | ✅ 6 個對抗向量（跨庫 UUID 注入、快取驅逐、高頻連按、多分頁鎖搶佔、損毀數值合併、beforeunload） |

---

## 2. `openspec-verify-change` 實作檢查

### 2.1 Completeness（完整性）

| 缺陷 | 實作證據 | 判定 |
|------|----------|------|
| C1 | `services/cloudStorage.ts:231` `mapQuestionToDbRow` 已提取並由兩路徑共用；`retryCleanupDirtyBanks`（L248–368）具備 per-bankId `try-catch` 隔離、`localQuestionsRaw === null` 快取缺失防護（L263–266，記 warn 且禁刪雲端）、污損 JSON 隔離（L269–275）、upsert-first（L294–302）、刪除批次 `.eq('bank_id', bankId)`（L327–331）、失敗留 `remaining`（L338–341, 360–364）；`saveCloudQuestions` 具備 `forceDeleteAll` 網關（L397–401） | ✅ 通過 |
| C2 | `mergeChunkedPracticeSessions`（L694–790）：chunk 聯集、最高分 + 最晚 completedAt + 最早 startedAt、`isLocalFuture`（L899）保留、雙端回寫、草稿精確清理（L937–939） | ✅ 通過（唯見 HIGH-01） |
| H1 | `useQuizEngine.ts:302–306` 雙鎖、`nextQuestion` 解鎖（L346）、`startQuiz`（L220–221）、`handlePracticeMistakes`（L250–251）、`startChallengeQuiz`（L295–296）重置 | ✅ 通過（唯見 WARNING-03） |
| H2 | `NodeEditPanel.tsx:48–68`：deps `[nodeId, onUpdate]`、cleanup 閉包 flush + 清 timer + 重置 pending、`beforeunload` 監聽 | ✅ 通過（唯見 HIGH-02） |
| H3 | `cloudStorage.ts:49–56`：token 含隨機後綴、30–70ms 抖動、double-check 拋 `Sync lock held by another tab`；`window.__MINDSPARK_SYNC_LOCK__` 全庫零引用 | ✅ 通過（唯見 WARNING-02） |
| P1 | `graphUtils.ts` 已無 `applyDagreLayout` 與其 ponytail 註解；測試改用 `applyAutoLayout` | ✅ 通過 |
| IW-2 | `AppContent.tsx:108` `PAGE_TRANSITION_VARIANTS` 位於 component 外 module scope，L300 正確引用 | ✅ 通過 |
| M1 | `useGraphCodeMode.ts:25, 28` 底層硬阻斷 + `canSwitchToVisual` 導出；`GraphEditor.tsx:227` 傳遞；`GraphToolbar.tsx:192` disabled | ✅ 通過（唯見 WARNING-04） |

### 2.2 CRITICAL-01：回滾策略任務 6.1/6.2 尚未完成

- **位置**：`tasks.md:70–71`
- **證據**：6.1（單一 commit 提交）與 6.2 均為 `[ ]`；`git log` HEAD 仍為 `a3c9853`，全部變更留在 working tree。
- **判定**：依 verify-change guardrail，未完成任務列為 CRITICAL。考量本流程為「先審計、後由使用者裁決」，本項屬**流程性阻塞**而非代碼缺陷：在使用者裁決前**不得**將本 change 標記為 fully complete 或進入 archive。

### 2.3 HIGH-01：C2 雲端領先分支以 `cloudSession` 取代 `mergedSession`，丟失本地更高分與進行中進度

- **位置**：`services/cloudStorage.ts:934`
  ```ts
  const targetSession = shouldUploadToCloud ? mergedSession : (cloudCompletedCount > localCompletedCount ? cloudSession : mergedSession);
  ```
- **獨立重現條件**（本輪重新推導，非引用前輪）：本地完成 `{ chunk0: score 100 }`；雲端完成 `{ chunk0: score 60, chunk1, chunk2 }`。
  - `hasNewCompletedChunk` = false（merged 的已完成集合 ⊆ 雲端）；
  - `cloudCompletedCount(3) > localCompletedCount(1)` → `shouldUploadToCloud = false`；
  - `targetSession = cloudSession` → 本地 chunk0 的 **100 分被雲端 60 分覆蓋**，且本地對未完成 chunk 的 session 層進度摘要（score/wrongQuestionIds）被雲端版本取代。
- **規格衝突**：`specs/practice-session-storage/spec.md` 明定「合併產生的 session SHALL 同時回寫本機 localStorage 並 upsert 至雲端」；此分支回寫的不是合併結果。
- **緩解事實**：draft key（`mindspark_chunk_draft:*`）層的作答內容因精確清理而保留，遺失範圍限於 session-level 摘要與較高分數。
- **建議**：回寫本地一律使用 `mergedSession`；是否 upsert 雲端改由 merged 與雲端實質差異決定。補測「雲端完成更多 chunk、本地持有更高分已完成 chunk」案例。

### 2.4 HIGH-02：H2 `beforeunload` flush 未形成可落盤的同步鏈條

- **鏈條證據**（本輪完整走讀）：
  1. `NodeEditPanel.tsx:49–55` `beforeunload` → `onUpdate(nodeId, pending)`
  2. → `GraphEditor.tsx:94` `setNodes(prev => ...)`（React 非同步排程）
  3. → 持久化在 `hooks/useGraphStorage.ts`：`refs.current` 於 commit 後的 effect 才更新（L54–56），autosave 為 **2 秒 debounce**（L106–109），`beforeunload` 時僅執行 `flushSaveIfNeeded`（L100–104, 112）且**只有已排程的 timer 才會 flush**。
  4. 使用者在 debounce 300ms 視窗內打字並立即關閉分頁：`onUpdate` 排程的 render 尚未 commit → `refs.current.nodes` 為舊值；且因 nodes 先前未變更，`saveTimerRef.current` 為 null → `flushSaveIfNeeded` 為 no-op。**最後不到 300ms 的輸入在頁面銷毀前不到達 localStorage。**
- **附帶觀察**：`NodeEditPanel.tsx:49–55` 的 `handleBeforeUnload` flush 時未同步 `clearTimeout(debounceRef.current)`；頁面未真的銷毀（如測試環境或取消關閉）時，殘留 timer 會以空 `{}` payload 再觸發一次 `onUpdate`。
- **測試偽綠燈**：`nodeEditPanelFlush.test.ts` 與 challenger 場景 6 的 `onUpdate` 皆為 `vi.fn()`，僅證明 callback 被呼叫，未接上真實 `GraphEditor → useGraphStorage` 持久化鏈。
- **建議**：讓 NodeEditPanel 的 beforeunload flush 與 `useGraphStorage.flushSave` 形成同步橋接（例如由 GraphEditor 將 pending 直接注入 refs 後同步 `saveGraph`），或 storage 層提供同步 flush 入口；handler 內一併清 timer。補一個接真實 storage 的整合測試。

### 2.5 WARNING-01：chunk 合併以「陣列位置」而非 `chunk.index` 對齊

- **位置**：`services/cloudStorage.ts:701–703`（`local.chunks[i]` / `cloud.chunks[i]`）、`L920`（`cloudSession.chunks[mc.index]`）。
- **判定**：`PracticeChunk.index` 欄位存在（`types/battleTypes.ts:374–383`），任務 1.4 與 spec 的文字是「逐一比對每個 chunk **index**」。在正常路徑下 chunks 由同一 `questionIds + chunkSize` 決定性生成，位置即索引，風險低；但一旦雲端資料重排或缺號（legacy / 人工修資料），位置比對會把不同 chunk 當成同一個合併，可能誤殺 draft 或覆寫成績。
- **建議**：以 `chunk.index` 建 Map 做 union；`hasNewCompletedChunk` 同步改 Map 查找。補「雲端 chunks 亂序 / 缺號」測試。

### 2.6 WARNING-02：H3 fallback 鎖過期接管未記錄規格要求的 warn

- **位置**：`services/cloudStorage.ts:42–47`。
- **判定**：讀到存在但過期（`>= 30s`）的鎖時直接覆寫，無 `console.warn`；`sync-concurrency-control/spec.md` 的「Fallback lock self-clears after timeout」場景明定 SHALL 記錄欠帳。
- **建議**：在判定 `raw` 存在但已過期的分支加入 `console.warn('[Sync] Expired fallback lock detected, taking over', { key: fallbackKey, oldTs: ts })`。

### 2.7 WARNING-03：H1 答題雙鎖在 `restoreSession` / `handleExitQuiz` 未重置（本審計新增發現，前兩輪未載）

- **位置**：`hooks/useQuizEngine.ts:112–142`（`restoreSession` 全程未重置兩個 ref）、`L257–270`（`handleExitQuiz` 亦未重置）。
- **觸發路徑**：使用者作答第 N 題後（`lastAnsweredQuestionIndexRef = N`、`isProcessingRef = true`），在反饋畫面直接退出測驗 → 之後恢復 session（`currentQuestionIndex` 恢復為 N）→ 對第 N 題的第一次 `handleAnswer` 被 L302 條件**靜默吞掉**，且只要不切題就一直被鎖。`useQuizEngine` 為 App 級 hook，ref 跨畫面存活。
- **比對 design D3**：D3 僅要求 `nextQuestion` / `startQuiz` 重置，實作已超標覆蓋 `handlePracticeMistakes` 與 `startChallengeQuiz`，唯獨恢復路徑漏網。
- **建議**：`restoreSession` 與 `handleExitQuiz` 內補 `lastAnsweredQuestionIndexRef.current = null; isProcessingRef.current = false;`；或在 `restoreSession` 內部走 `startQuiz` 的 retry_session 路徑統一重置。補對應單元測試。

### 2.8 WARNING-04：M1 Toast 提示路徑在 disabled 狀態下實際不可達，且防禦邏輯三重冗餘

- **位置**：`GraphToolbar.tsx:175–192`（外層 `div onClick` L177–181 + button 自身 `onClick` L186–189 + `disabled` L192）、`GraphEditor.tsx:228–234`（wrapper 再判一次）、`useGraphCodeMode.ts:28`（靜默 return）。
- **判定**：
  1. HTML 規格下 disabled button 不分派 click；外層 wrapper 是否收到事件瀏覽器不一致（jsdom 下前輪已驗證不觸發）。也就是說 **L177–181 與 L186–189 兩個 toast 分支在「按鈕被 disable」的場景下皆不可靠**；direct call hook 時又是靜默 return —— spec 要求的「顯示 Toast」在三條路徑上沒有一條是保證可達。
  2. 同一條件判斷（`editMode === 'code' && !canSwitchToVisual`）寫了 3 份。
- **核心安全仍成立**：hook 底層硬阻斷保證資料不會被覆寫；本項僅為 UX 提示失效與代碼冗餘。
- **建議**：改用 `aria-disabled`（非 `disabled`）+ 單一 onClick 分支提示；刪除其餘兩處重複判斷。補 toolbar 層測試。

### 2.9 WARNING-05：active session 超限裁切未按 spec 記錄 sessionId

- **位置**：`services/storage.ts:107–131`（`enforceGuestPracticeSessionLimits`）。
- **判定**：overflow 時僅將 session 標 `abandoned` 或直接裁掉，無任何 `console.warn/info` 記錄被裁 sessionId；`practice-session-storage` 規格場景「Active session limit is enforced on record——SHALL 記錄被裁切的 sessionId 以便追蹤」未落地。
- **命題邊界**：此為修改後 spec 的既有場景，不屬 C2 主修復路徑，但直到本輪 verify 仍不能宣稱該 capability 100% 實作。
- **建議**：在裁切處加入一行 `console.warn('[Storage] practice session trimmed:', targetId)`；或修訂 spec 移除該要求。

### 2.10 WARNING-06 / SUGGESTION-01：合併後 status 推導與 chunk 時間欄位的規格用語落差

- **WARNING-06**：`cloudStorage.ts:765–772` — 非全 completed 時，只要任一側 metadata `status === 'completed'` 即回傳 `completed`。僅在 metadata 與 chunks 不一致（legacy/損毀資料）時成立，可能產生「尚有 pending chunk 但 session completed」的非法狀態。建議以 merged chunks 為唯一判據。
- **SUGGESTION-01**：spec 寫「保留具備作答進度或 `savedAt` 較新的 chunk」，但 `PracticeChunk` 型別**沒有** `savedAt` 欄位（`battleTypes.ts:374–383`），實作以 session 級 `updatedAt` 落後比較（L754–759）。功能等價合理，但屬 spec ↔ 型別的用語分歧；建議修訂 spec 文字為「session `updatedAt` 較新」或在 chunk 上補 `savedAt`。

---

## 3. `ponytail-audit`：過度工程 / 死代碼（限本次變更波及範圍）

| Tag | 應削減項 | 替代方案 | 路徑 |
|-----|----------|----------|------|
| `delete` | `retryCleanupDirtyBanks` 內 `keepIds` / `keepIdsSet` 雙重構建，`keepIds` 僅餵給 `Set` 一次 | 直接 `const keepIdsSet = new Set(toUpsert.map(r => r.id))` | `services/cloudStorage.ts:305–306` |
| `shrink` | C1 兩路徑「先正規化 → `mapQuestionToDbRow` 內再正規化一次」的雙重 `ensureStableQuestionId` / `normalizeQuestionForPersistence` | 拆「raw mapper / normalized mapper」或在 helper 標註輸入契約，每邊界只做一次 | `services/cloudStorage.ts:231–246, 283–292, 375–383` |
| `stdlib`-style | `aborted` / `AbortError` 字串嗅探散落 6 處（L100, 119, 817, 870, 959–961 等） | 提取單一 `isAbortError(err: unknown): boolean` | `services/cloudStorage.ts` |
| `yagni` | M1 三重阻斷（Toolbar wrapper / Toolbar button / Editor wrapper） | 依 WARNING-04 收斂為單一 `aria-disabled` 分支 | `GraphToolbar.tsx:175–192`、`GraphEditor.tsx:228–234` |
| `shrink`（微） | `applyAutoLayout` 為純轉發 wrapper | 可改 `export { applyRadialLayout as applyAutoLayout } from '@/services/radialLayout'`；惟其名為 DEC-010 canonical API，保留亦可接受 | `components/KnowledgeGraph/graphUtils.ts:84–86` |

**明確排除（不是債）**：
- `isSyncingPracticeSessions` 模組旗標 — `sync-concurrency-control/spec.md` 明定「模組級旗標 SHALL 保留作為同分頁第二重防護」，屬合規設計，不算 YAGNI。
- `runWithSyncLock` 的 eslint-disable timing 註解 — 有正當安全註記用途。

死碼結論：`npx knip` exit 0；`applyDagreLayout` 於 runtime code 全文零殘留（僅歷史文件 / 記憶索引提及，屬合理存檔）。

**net: 约 -25 ~ -40 lines, -0 deps possible.**

---

## 4. `ponytail-debt`：技術債帳簿（現行生效中）

掃描範圍：全庫源碼（排除 `node_modules`、`.git`、`dist`、docs/openspec 文件）`(//|#)\s*ponytail:`。

| # | 位置 | 簡化內容 | Ceiling | Upgrade Trigger | Rot Risk |
|---|------|----------|---------|-----------------|----------|
| 1 | `components/KnowledgeGraph/NodeEditPanel.tsx:262` | `bold` 與 legacy `fontWeight` 雙軌寫入，維持 schema-v2 讀取相容 | 2026-10-01 migration window | schema-v2 遷移窗口關閉（design.md Non-Goals 已定 P2 排 Phase 2） | 🟢 低：日期與觸發條件明確 |

**統計：1 marker，0 with no trigger。**

本次變更之債務處置：P1（`applyDagreLayout`）已依期前清除，帳簿同步縮減；本次變更**未新增任何 ponytail 標記**。

---

## 5. 與前兩輪審計的交叉核對

| 前輪發現 | 本輪獨立驗證結果 |
|----------|------------------|
| R1-CRITICAL-02 / R2-WARNING-02：雲端領先丟本地分數 | ✅ 本輪重新證實，收錄為 HIGH-01（並補上 draft 層保留的緩解事實） |
| R1-HIGH-01：位置式 chunk 比對 | ✅ 證實，收錄為 WARNING-01（本輪評級 lower：正常路徑位置≡索引） |
| R1-HIGH-02 / R2-WARNING-01：beforeunload 落盤斷鏈 | ✅ 本輪走讀 `useGraphStorage` 完整證實，收錄為 HIGH-02，並補 timer 未清的附帶點 |
| R1-WARNING-02：過期鎖未 warn | ✅ 證實（WARNING-02） |
| R1-WARNING-03 / R2-yagni：M1 toast 不可達 + 四重防禦 | ✅ 證實並合併為 WARNING-04 |
| R1-WARNING-01：status 推導邊界 | ✅ 證實（WARNING-06） |
| R1-WARNING-05：裁切無記錄 | ✅ 證實（WARNING-05） |
| —（前兩輪皆無） | 🆕 **WARNING-03：`restoreSession` / `handleExitQuiz` 未重置 H1 答題鎖，恢復同索引題目時首次作答被靜默吞掉** |

---

## 6. 修復優先順序建議

1. **先裁決 HIGH-01 / HIGH-02**：兩者皆為資料完整性議題（分數 / 進度遺失 vs. 關閉遺失）；其餘 WARNING 為規格補強或 UX。
2. WARNING-03（H1 恢復路徑鎖）修復成本低（兩行重置 + 測試），建議一併處理。
3. WARNING-02 / 04 / 05 / 06 可在同一補丁收斂；ponytail 表內 5 項可擇期清理。
4. 全數裁決後再執行 tasks.md 6.1 單一 commit；COMMIT 前不得 archive。

## 7. 審計停止聲明

本審計員已依指示停止一切代碼修改，僅輸出本報告。
所有結論等待負責人進行最終評估與裁決。
