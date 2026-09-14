# 最終交叉核對審計報告（第四輪獨立審計 · Claude Opus 4）

> **審計對象**：`openspec/changes/remediate-critical-sync-and-concurrency`
> **審計角色**：獨立第四位高階 AI 審計員（Claude Opus 4 · ID: `opus4-r7k2`）
> **審計日期**：2026-09-14
> **使用技能**：`openspec-verify-change`、`ponytail-audit`、`ponytail-debt`
> **交叉參照**：`audit-defect-report.md`（R1）、`audit-defect-report 2.md`（R2）、`final-audit-report.md`（R3）
> **審計原則**：所有發現均對照原始碼獨立重新驗證，不假設前三輪報告結論正確；與前輪重疊之發現已逐一重新取證並標註一致性。

---

## 0. 審計結論（Verdict）

**🟡 CONDITIONAL PASS（有條件通過）**

自動化門禁全部由本審計員於 2026-09-14T10:20 UTC+8 親自重跑確認綠燈（`tsc --noEmit` Exit 0、53 檔 348 測試全綠、`knip` Exit 0）。8 項缺陷修復（C1, C2, H1, H2, H3, P1, IW-2, M1）的核心防禦邏輯在代碼層面皆可對應到 spec scenario，修復方向正確且覆蓋率高。

**但在結案（commit）前，仍有以下阻塞與待裁決項目：**

| 類別 | 數量 | 說明 |
|------|------|------|
| 🔴 待提交確認 | 1 | tasks.md 6.1/6.2 尚未 commit（流程性，非代碼缺陷） |
| 🟠 HIGH 級資料完整性 | 2 | C2 雲端領先覆蓋 + H2 beforeunload 落盤斷鏈 |
| 🟡 WARNING | 5 | H1 恢復路徑鎖漏、H1 先鎖後驗、鎖過期 warn 缺失、M1 Toast 不可達、session status 推導邊界 |
| 📝 SUGGESTION | 2 | spec 用語落差、active-limit 裁切記錄缺失 |
| 🧹 YAGNI / 過度工程 | 5 | ponytail-audit 可削減項 |
| 📒 Ponytail 技術債 | 1 | fontWeight 雙軌寫入（2026-10-01 到期） |

---

## 1. 驗證閘門（本輪親自執行）

| 閘門 | 指令 | 結果 | 備註 |
|------|------|------|------|
| TypeScript | `npx tsc --noEmit` | ✅ Exit 0 | 零錯誤 |
| 單元測試 | `npm test -- --reporter=verbose` | ✅ Exit 0 | **53 檔 / 348 測試全部通過**（13.60s） |
| 死碼分析 | `npx knip --include files,deps,unlisted,binaries,unresolved,exports,types,duplicates` | ✅ Exit 0 | 無 unused 項 |
| 工作樹 | `git status --short` | ⚠️ 未提交 | 15 修改 + 7 新增仍在 working tree |

### 測試檔案逐一對齊

| 任務要求 | 測試檔 | 場景覆蓋 | 判定 |
|----------|--------|----------|------|
| 1.3 C1 A–G | `retryCleanupDirtyBanks.test.ts` | A–G 含快取缺失 F、`.eq('bank_id')` G | ✅ |
| 1.6 C2 A–F | `syncLocalPracticeSessions.test.ts` | A–F + 3 個 `mergeChunkedPracticeSessions` 邊界 | ✅ |
| 1.8 H3 A–B | `runWithSyncLock.test.ts` | ✅ |
| 2.2 H1 A–B | `useQuizEngineRace.test.ts` | ✅ |
| 3.2 H2 A–C | `nodeEditPanelFlush.test.ts` | ✅ |
| 4.2 P1 | `radialLayout.test.ts` | 改測 `applyAutoLayout`，零殘留 | ✅ |
| 計畫外加碼 | `remediateBypass.challenger.test.ts` | 6 個對抗向量 | ✅ |

---

## 2. `openspec-verify-change` 實作檢查

### 2.1 Completeness × Correctness × Coherence（逐缺陷驗證）

| 缺陷 | 實作證據 | 判定 |
|------|----------|------|
| **C1** | `cloudStorage.ts:231` `mapQuestionToDbRow` 已提取；L248–368 per-bankId `try-catch`、`null` 快取防護（L263-266 嚴禁刪雲端）、損毀 JSON 隔離（L269-275）、upsert-first（L294-302）、`.eq('bank_id', bankId)` 縱深防禦（L331）、失敗留 `remaining` | ✅ 通過 |
| **C2** | `mergeChunkedPracticeSessions`（L694–790）：chunk 聯集、最高分 + 最晚 completedAt + 最早 startedAt、`isLocalFuture`（L899）、草稿精確清理（L937-939） | ✅ 通過（唯見 HIGH-01） |
| **H1** | `useQuizEngine.ts:302–306` 雙鎖；`nextQuestion` L346 解鎖；`startQuiz` L220-221、`handlePracticeMistakes` L250-251、`startChallengeQuiz` L295-296 重置 | ✅ 通過（唯見 WARNING-01, WARNING-02） |
| **H2** | `NodeEditPanel.tsx:48–68` deps `[nodeId, onUpdate]`、cleanup 閉包 flush + 清 timer + 重置 pending + `beforeunload` 監聽 | ✅ 通過（唯見 HIGH-02） |
| **H3** | `cloudStorage.ts:49–56` token 含隨機後綴、30–70ms 抖動、double-check；`__MINDSPARK_SYNC_LOCK__` 全庫零引用 | ✅ 通過（唯見 WARNING-03） |
| **P1** | `graphUtils.ts` 已無 `applyDagreLayout`（`grep` 確認零殘留）；測試改用 `applyAutoLayout` | ✅ 通過 |
| **IW-2** | `AppContent.tsx:108` `PAGE_TRANSITION_VARIANTS` 位於 module scope | ✅ 通過 |
| **M1** | `useGraphCodeMode.ts:25, 28` 底層硬阻斷 + `canSwitchToVisual`；`GraphEditor.tsx:227` 傳遞；`GraphToolbar.tsx:192` disabled | ✅ 通過（唯見 WARNING-04） |

---

### 2.2 🔴 待提交確認：tasks.md 6.1 / 6.2

- **位置**：`tasks.md:70–71`
- **證據**：`git status` 顯示 15 modified + 7 untracked；`git log` HEAD 仍為前一個 commit。
- **判定**：依 `openspec-verify-change` guardrail，未完成任務列為 CRITICAL。但**此項為流程性阻塞而非代碼邏輯缺陷**——在使用者裁決前不得將本 change 標記為 fully complete 或進入 archive。6.2 為條件任務（驗證失敗才觸發），本輪驗證全數通過，建議改寫為 `N/A`。
- **四輪一致性**：✅ R1 / R2 / R3 皆標記此項。

---

### 2.3 🟠 HIGH-01：C2 雲端領先分支以 `cloudSession` 取代 `mergedSession`，可能丟失本地更高分數與 in_progress 進度

- **位置**：`services/cloudStorage.ts:934`
  ```ts
  const targetSession = shouldUploadToCloud
    ? mergedSession
    : (cloudCompletedCount > localCompletedCount ? cloudSession : mergedSession);
  ```
- **獨立重現條件**（本輪重新推導）：
  - 本地完成 `{ chunk0: score=100 }`，另有 chunk3 為 `in_progress`
  - 雲端完成 `{ chunk0: score=60, chunk1, chunk2 }`
  - `cloudCompletedCount(3) > localCompletedCount(1)` → `shouldUploadToCloud = false`
  - `targetSession = cloudSession` → **本地 chunk0 的 100 分被雲端 60 分覆蓋**；**本地 chunk3 的 in_progress 進度在 session 層面被丟棄**
- **規格衝突**：`specs/practice-session-storage/spec.md:10` 明定「合併產生的 session SHALL 同時回寫本機 localStorage 並 upsert 至雲端」；此分支回寫的不是 `mergedSession`。
- **偽綠燈分析**：
  - Scenario B 測試（`syncLocalPracticeSessions.test.ts:113`）僅檢查 draft 保留，**未驗證 session chunk 內的 score 保留與 in_progress 進度**
  - Scenario C（分歧作答）只測「本地 chunk0 + 雲端 chunk1」對稱場景，**未覆蓋不對稱的「雲端完成更多 chunk 但本地某已完成 chunk 分數更高」案例**
- **緩解事實**：draft 層（`mindspark_chunk_draft:*`）因精確清理而保留，損失範圍限於 session-level 摘要
- **建議**：回寫本地一律使用 `mergedSession`；是否 upsert 雲端改由 merged 與雲端實質差異決定。補測「雲端完成更多 chunk、本地持有更高分已完成 chunk + in_progress chunk」案例。
- **四輪一致性**：✅ R1-CRITICAL-02 / R2-WARNING-02 / R3-HIGH-01 皆指出；本輪獨立重現確認。

---

### 2.4 🟠 HIGH-02：H2 `beforeunload` flush 未形成可落盤的同步鏈條

- **鏈條走讀**（本輪獨立完整追蹤）：
  1. `NodeEditPanel.tsx:49–54` `beforeunload` → `onUpdate(nodeId, pending)`
  2. → `GraphEditor.tsx` `setNodes(prev => ...)` （React 非同步排程）
  3. → `useGraphStorage.ts:53–56` `refs.current` 在 commit 後 effect 才更新
  4. → `useGraphStorage.ts:100–104, 112` `flushSaveIfNeeded` 僅在 `saveTimerRef.current` 非 null 時 flush
  5. **用戶在 debounce 300ms 窗口內打字後立即關閉分頁**：`onUpdate` 排程的 render 尚未 commit → `refs.current.nodes` 為舊值；且因 nodes 先前未變更，`saveTimerRef.current` 為 null → `flushSaveIfNeeded` 為 no-op。**最後 <300ms 的輸入在頁面銷毀前不到達 localStorage。**
- **附帶問題**：`handleBeforeUnload`（L49-54）flush 時未清 `debounceRef.current`；若頁面未真銷毀（取消關閉或測試環境），殘留 timer 會以空 `{}` payload 再觸發一次 `onUpdate`。
- **偽綠燈**：`nodeEditPanelFlush.test.ts` 與 challenger 場景 6 的 `onUpdate` 皆為 `vi.fn()`，僅證明 callback 被呼叫，**未接上 `GraphEditor → useGraphStorage` 的真實持久化鏈**。
- **建議**：讓 NodeEditPanel 的 beforeunload flush 與 `useGraphStorage.flushSave` 形成同步橋接，或 storage 層提供同步 flush 入口；handler 內一併 `clearTimeout(debounceRef.current)`。
- **四輪一致性**：✅ R1-HIGH-02 / R2-WARNING-01 / R3-HIGH-02 皆指出；本輪獨立走讀全鏈條確認。

---

### 2.5 🟡 WARNING-01：H1 答題鎖在 `restoreSession` / `handleExitQuiz` 未重置

- **位置**：`useQuizEngine.ts:112–142`（`restoreSession`）、`L257–270`（`handleExitQuiz`）
- **獨立驗證**：本輪逐行走讀確認這兩個函式**均未重置** `lastAnsweredQuestionIndexRef` 和 `isProcessingRef`。
- **觸發路徑**：用戶在第 N 題答完（鎖上）後於反饋畫面直接退出 → 之後恢復 session（`currentQuestionIndex` 恢復為 N）→ 首次 `handleAnswer` 被 L302 條件靜默吞掉。
- **修復成本**：極低（各加兩行重置）。
- **四輪一致性**：R3-WARNING-03 首次發現；R1/R2 未覆蓋；**本輪獨立確認**。

### 2.6 🟡 WARNING-02：H1 `handleAnswer` 先上鎖後驗證 `currentQ`，鎖可能永久卡住

- **位置**：`useQuizEngine.ts:305–309`
  ```ts
  isProcessingRef.current = true;                          // L305
  lastAnsweredQuestionIndexRef.current = quizState.currentQuestionIndex;  // L306
  const currentQ = quizState.activeQuestions[quizState.currentQuestionIndex]; // L308
  if (!currentQ) return;  // L309 — 鎖已上，但不會被任何路徑解除
  ```
- **觸發條件**：`quizState` 暫時不一致時 `currentQ` 為 undefined → 鎖永久卡住 → 同題生命週期內所有後續作答被忽略。
- **建議**：先取得並驗證 `currentQ`，再上鎖；或在 L309 return 前加 `isProcessingRef.current = false`。
- **四輪一致性**：R1-WARNING-04 首次發現；R3 未提及此具體場景；**本輪獨立確認代碼確實存在此路徑**。

### 2.7 🟡 WARNING-03：H3 fallback 鎖過期接管未記錄 spec 要求的 warn

- **位置**：`services/cloudStorage.ts:42–47`
- **驗證**：讀到鎖存在但已過期（`now - ts >= 30000`）時直接覆寫，**無 `console.warn`**。
- **規格衝突**：`sync-concurrency-control/spec.md:36`「SHALL 記錄 `console.warn` 報告已偵測到過期鎖」。
- **四輪一致性**：✅ R1-WARNING-02 / R3-WARNING-02 皆指出。

### 2.8 🟡 WARNING-04：M1 Toast 提示在 disabled 按鈕上不可達 + 三重冗餘防禦

- **位置**：`GraphToolbar.tsx:175–192`、`GraphEditor.tsx:228–234`、`useGraphCodeMode.ts:28`
- **驗證**：
  - 按鈕 `disabled` 時 HTML 規格不分派 click → L186–189 的 toast 永不觸發
  - 外層 `<div onClick>` L177–181 在 disabled button 場景下瀏覽器行為不一致（jsdom 不冒泡）
  - Hook L28 僅靜默 `return`，不觸發任何 UI 回饋
  - **同一判斷條件寫了 3 份**（Hook / Editor / Toolbar）
- **核心安全仍成立**：Hook 底層硬阻斷保證資料不被覆寫，本項僅為 UX 提示失效 + 代碼冗餘。
- **四輪一致性**：✅ R1-WARNING-03 / R2-yagni / R3-WARNING-04 皆指出。

### 2.9 🟡 WARNING-05：合併後 session status 推導可能產生非法狀態

- **位置**：`services/cloudStorage.ts:765–772`
  ```ts
  const mergedStatus = allCompleted
    ? 'completed'
    : local.status === 'completed' || cloud.status === 'completed'
      ? 'completed'      // ← 非全 chunk completed，但 metadata 導致 session completed
      : ...
  ```
- **問題**：若 legacy/損毀 metadata 使一側 `status === 'completed'` 但 chunks 並非全部完成，合併結果會產生「有 pending chunk 但 session completed」的非法狀態。
- **四輪一致性**：R1-WARNING-01 / R3-WARNING-06 首次發現；本輪確認。

### 2.10 📝 SUGGESTION-01：spec `savedAt` 用語與型別不一致

- `spec.md:8` 寫「保留具備作答進度或 `savedAt` 較新的 chunk」，但 `PracticeChunk` 型別無 `savedAt` 欄位。實作以 session 級 `updatedAt` 比較（L754–759），功能等價但 spec ↔ 型別用語不一致。
- **四輪一致性**：R3-SUGGESTION-01 首次發現。

### 2.11 📝 SUGGESTION-02：active session 超限裁切未按 spec 記錄 sessionId

- **位置**：`services/storage.ts:107–135`
- `spec.md:58`「SHALL 記錄被裁切的 sessionId 以便追蹤」，但代碼僅將 session 標 abandoned 或刪除，**無任何 console.warn/info 記錄 sessionId**。
- **四輪一致性**：R1-WARNING-05 / R3-WARNING-05 皆指出。

---

## 3. 偽綠燈（False Green）深度分析

本節是對現有 348 項測試「表面斷言 vs 極端分支覆蓋」的系統性審視。

| 偽綠燈場景 | 現有測試斷言 | 實際覆蓋缺口 | 風險等級 |
|-----------|-------------|-------------|---------|
| **C2 雲端領先+本地高分** | Scenario B 只驗 draft 保留 | 未驗 session chunk 內 score/in_progress 是否保留（HIGH-01 根因） | 🟠 HIGH |
| **H2 beforeunload 落盤** | `onUpdate = vi.fn()` 驗呼叫 | 未接真實 `GraphEditor → useGraphStorage` 鏈，不驗 localStorage 落盤 | 🟠 HIGH |
| **H1 恢復後鎖卡** | 無對應測試 | `restoreSession` 後對同題 `handleAnswer` 是否正常執行：**完全未測** | 🟡 WARNING |
| **H1 currentQ=undefined 鎖卡** | 無對應測試 | `quizState` 不一致時 `handleAnswer` 上鎖後 return 路徑：**完全未測** | 🟡 WARNING |
| **C2 chunk 亂序合併** | Scenario C 用對稱的 index=position | 若雲端 chunks 陣列順序與 index 欄位不一致：**完全未測** | 🟢 LOW |
| **H3 過期鎖 warn** | 無對應測試 | fallback 鎖過期時是否記錄 warn：**完全未測** | 🟢 LOW |

---

## 4. `ponytail-audit`：過度工程 / 死代碼（限本次變更波及範圍）

依 ponytail-audit 規範，以最大可削減量優先排序：

| Tag | 應削減項 | 替代方案 | 路徑 |
|-----|----------|----------|------|
| `yagni` | M1 三重防禦（Hook L28 + Editor L229-232 + Toolbar wrapper L177-181 + Toolbar button L186-189）：同一條件寫 3 份 | 保留 Hook 底層硬阻斷 + 單一 `aria-disabled` + onClick 分支提示 | `useGraphCodeMode.ts:28`、`GraphEditor.tsx:228-234`、`GraphToolbar.tsx:175-192` |
| `delete` | `retryCleanupDirtyBanks` 內 `keepIds` Array → `keepIdsSet` Set 雙重構建（`keepIds` 僅餵給 `Set` 一次） | `const keepIdsSet = new Set(toUpsert.map(r => r.id))` | `cloudStorage.ts:305-306` |
| `shrink` | C1 雙路徑在呼叫 `mapQuestionToDbRow` 前先做 `normalizeQuestionForPersistence(ensureStableQuestionId(q))`，但 `mapQuestionToDbRow` 內部又做一次——每 question 重複 normalize 2 次 | 區分 raw / normalized mapper 入口，每邊界只做一次 | `cloudStorage.ts:283-292, 375-383` vs `L231-245` |
| `stdlib` | `aborted`/`AbortError` 字串嗅探散落 ≥6 處 | 提取 `isAbortError(err: unknown): boolean` helper | `cloudStorage.ts:100, 119, 817, 870, 959` |
| `delete` | `ConceptNode` 的 `shapeClassName` map 包含 `diamond`、`hexagon`、`cloud` 三個永不可達的 key（這三種 shape 在 L143/L146 早退 return） | 移除三個不可達 key，或將 map 縮為實際消費的 shape union | `ConceptNode.tsx:225-234` |

**明確排除（非債務）**：
- `isSyncingPracticeSessions` 模組旗標 — `sync-concurrency-control/spec.md:4` 明定「得以保留作為同分頁第二重防護」，屬合規設計。

**net: ~-35 lines, -0 deps possible.**

---

## 5. `ponytail-debt`：技術債帳簿

掃描範圍：全庫源碼 `*.ts` / `*.tsx`（排除 `node_modules`、`.git`、`dist`、文件/openspec）。

| # | 位置 | 簡化內容 | Ceiling | Upgrade Trigger | Rot Risk |
|---|------|----------|---------|-----------------|----------|
| 1 | `NodeEditPanel.tsx:262` | `bold` 與 legacy `fontWeight` 雙軌寫入，維持 schema-v2 讀取相容 | 2026-10-01 | schema-v2 migration window closes | 🟢 低：日期明確、Phase 2 P2 已排 |

**統計：1 marker，0 with no trigger。**

本次 P1（`applyDagreLayout`）已清除，帳簿同步縮減。本次變更**未新增任何 ponytail 標記**。

---

## 6. 與前三輪審計的交叉核對

| 前輪發現 | R1 | R2 | R3 | 本輪（R4）獨立驗證 | 結論 |
|----------|----|----|----|--------------------|------|
| 雲端領先丟本地分數 | CRITICAL-02 | WARNING-02 | HIGH-01 | ✅ 獨立重現確認 | **四輪一致，HIGH 級** |
| 位置式 chunk 比對 | HIGH-01 | — | WARNING-01 | ✅ 確認（正常路徑安全） | **三輪一致** |
| beforeunload 落盤斷鏈 | HIGH-02 | WARNING-01 | HIGH-02 | ✅ 獨立走讀全鏈確認 | **四輪一致，HIGH 級** |
| 過期鎖未 warn | WARNING-02 | — | WARNING-02 | ✅ 確認 | **三輪一致** |
| M1 toast 不可達 + 冗餘 | WARNING-03 | yagni | WARNING-04 | ✅ 確認 | **四輪一致** |
| session status 推導邊界 | WARNING-01 | — | WARNING-06 | ✅ 確認 | **三輪一致** |
| active-limit 裁切無記錄 | WARNING-05 | — | WARNING-05 | ✅ 確認 | **三輪一致** |
| restoreSession/exitQuiz 未重置鎖 | — | — | WARNING-03 | ✅ **獨立確認** | **二輪一致（R3+R4）** |
| handleAnswer 先鎖後驗 currentQ | WARNING-04 | — | — | ✅ **獨立確認** | **二輪一致（R1+R4）** |
| keepIds 雙重構建 | shrink | delete | delete | ✅ 確認 | **四輪一致** |
| isAbortError 重複 | stdlib | stdlib | stdlib | ✅ 確認 | **四輪一致** |
| 雙重 normalize | shrink | shrink | shrink | ✅ 確認 | **四輪一致** |
| ConceptNode 不可達 keys | delete | — | — | ✅ **獨立確認** | **二輪一致（R1+R4）** |
| spec savedAt 用語不一致 | — | — | SUGGESTION-01 | ✅ 確認 | **二輪一致** |

**本輪未發現任何前三輪皆遺漏的全新 CRITICAL/HIGH 級缺陷。** 所有高風險項目已被多輪一致驗證。

---

## 7. 修復優先順序建議

### 🔴 Tier 1：結案前必須裁決（阻塞封存）

| # | 問題 | 修復成本 | 建議 |
|---|------|----------|------|
| HIGH-01 | C2 `targetSession` 應一律用 `mergedSession` | 改 1 行 + 補 1 個測試 | 回寫本地一律 `mergedSession`；補不對稱分數案例測試 |
| HIGH-02 | H2 beforeunload 落盤鏈條斷裂 | 需架構橋接 | 評估 Phase 1 是否接受此已知限制，或補同步 flush 橋 |
| 待提交確認 | tasks.md 6.1 | 1 行 git commit | 全部裁決完成後統一提交 |

### 🟡 Tier 2：低成本修復，建議併入同一 commit

| # | 問題 | 修復成本 |
|---|------|----------|
| WARNING-01 | `restoreSession` / `handleExitQuiz` 補兩行鎖重置 | 4 行 + 1 測試 |
| WARNING-02 | `handleAnswer` 先驗 `currentQ` 再上鎖 | 移動 3 行 |
| WARNING-03 | fallback 鎖過期加 `console.warn` | 1 行 |

### 🟢 Tier 3：擇期清理

| # | 問題 |
|---|------|
| WARNING-04/05 | M1 Toast 路徑 + active-limit 記錄 |
| YAGNI 5 項 | 見 §4 表格 |
| SUGGESTION 2 項 | spec 用語修訂 |
| Ponytail 技術債 | fontWeight 2026-10-01 到期清理 |

---

## 8. 審計停止聲明

本審計員已依指示停止一切代碼修改操作，僅輸出本報告。
所有結論等待負責人進行最終評估與裁決。

---

> 審計檔案路徑：`openspec/changes/remediate-critical-sync-and-concurrency/audit_reports/audit_opus4-r7k2.md`
> 生成時間：2026-09-14T10:25 UTC+8
