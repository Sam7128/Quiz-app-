# 審計缺陷報告 (Audit Defect & Technical Debt Report)

> **審計對象**：`openspec/changes/remediate-critical-sync-and-concurrency`  
> **審計角色**：Project Inquisitor（獨立第二位高階 AI 審計者）  
> **審計日期**：2026-09-13  
> **使用技能**：`openspec-verify-change`、`ponytail-audit`、`ponytail-debt`  
> **審計結論**：🟡 **有條件通過（CONDITIONAL PASS — 存在 2 項架構級警告、4 項 YAGNI 過度工程與 1 項存量技術債）**

---

## 1. 執行摘要 (Executive Summary)

本報告為作為獨立的第二位高階 AI 對變更計畫 `remediate-critical-sync-and-concurrency` 進行的最終驗收與缺陷審計。
變更涉及之 8 大缺陷修復（C1, C2, H1, H2, H3, P1, IW-2, M1）已全面落實，全庫靜態型別檢驗（`tsc --noEmit` 0 錯誤）、死碼檢測（`knip` 0 警告）、生產構建（`npm run build` 通過）以及 53 個測試檔案、348 項單元與混沌對抗測試均達成 100% 通過。

然而，在深入代碼實作、運行期生命週期鏈條與 YAGNI 原則審查後，本審計揭露了 **2 項運行期與規格一致性警告 (WARNING)**、**4 項過度工程與重複包裝 (YAGNI / SHRINK)** 以及 **1 項存量 Ponytail 技術債**。

---

## 2. OpenSpec 實作檢查 (`openspec-verify-change`)

### 2.1 完整性檢查 (Completeness)
- [x] **任務清單完備性**：`tasks.md` 中 1.0 至 5.4 所有實作與驗證項目均已標記為 `[x]`。6.1/6.2 為 Git commit 策略，尚未提交（符合現狀）。
- [x] **檔案變更對齊**：所有在 `proposal.md`、`design.md`、`tasks.md` 聲明修改的 10 個核心檔案與 6 個測試檔案均確實存在並完成變更。
- [x] **測試覆蓋驗證**：新增了包括 `remediateBypass.challenger.test.ts` 在內的完整對抗測試，涵蓋了跨庫 UUID 注入、快取驅逐、高頻連按、多分頁鎖搶佔、損毀數值相容等極限路徑。

### 2.2 審計缺陷與架構警訊 (Defects & Warnings)

#### ⚠️ [WARNING-01] NodeEditPanel `beforeunload` Flush 與下游持久化鏈條脫節 (Architectural Disconnect)
- **問題位置**：[components/KnowledgeGraph/NodeEditPanel.tsx:48-68](file:///c:/Users/user/Desktop/Quiz-app-/components/KnowledgeGraph/NodeEditPanel.tsx#L48-L68)
- **嚴重等級**：MEDIUM / WARNING
- **問題描述**：
  `NodeEditPanel` 於 `useEffect` 中監聽 `window.beforeunload`，在分頁關閉時呼叫 `onUpdate(nodeId, pendingUpdateRef.current)`。
  然而在 React 運行架構下，`onUpdate` 實質調用的是 `setNodes(prev => ...)`（非同步狀態排程）。在瀏覽器分頁關閉的瞬間，呼叫棧立即銷毀，React **無法完成 re-render**。
  下游負責儲存的 [hooks/useGraphStorage.ts:112](file:///c:/Users/user/Desktop/Quiz-app-/hooks/useGraphStorage.ts#L112) 雖然也監聽了 `beforeunload`，但其讀取的是 `refs.current.nodes`。由於 React 未及時提交渲染，`refs.current.nodes` 依然停留在**舊的節點狀態**，導致最新輸入的文字根本無法在頁面銷毀前寫入 `localStorage`。
- **偽綠燈現象**：
  單元測試 [src/__tests__/nodeEditPanelFlush.test.ts](file:///c:/Users/user/Desktop/Quiz-app-/src/__tests__/nodeEditPanelFlush.test.ts) 與 `remediateBypass.challenger.test.ts` 僅使用 mock `onUpdate = vi.fn()` 斷言 `onUpdate` 是否被調用，測試通過但實質持久化鏈條在真實瀏覽器中斷裂。
- **改善建議**：
  若要在關閉分頁時實現真正的抗丟失，`NodeEditPanel` 的 `beforeunload` 不應僅仰賴 React 非同步 state 更新，應考慮直接觸發儲存層同步寫入，或在 `beforeunload` 處理中提供更緊密的同步橋接。

---

#### ⚠️ [WARNING-02] `syncLocalPracticeSessions` 雲端領先時捨棄本地更高分數與進度 (Data Loss in Asymmetric Merge)
- **問題位置**：[services/cloudStorage.ts:930-940](file:///c:/Users/user/Desktop/Quiz-app-/services/cloudStorage.ts#L930-L940)
- **嚴重等級**：MEDIUM / WARNING
- **問題描述**：
  在 `syncLocalPracticeSessions` 中有以下邏輯：
  ```typescript
  const targetSession = shouldUploadToCloud 
    ? mergedSession 
    : (cloudCompletedCount > localCompletedCount ? cloudSession : mergedSession);
  ```
  當雲端完成的 Chunk 數量大於本地（例如雲端完成 3 個 Chunk，本地完成 1 個 Chunk）時，系統判定 `shouldUploadToCloud = false`，並強制使用 `cloudSession` 作為回寫本地的目標。
  **極限情境**：若用戶在本地 Chunk 0 獲得了 100 分，而雲端歷史記錄的 Chunk 0 只有 60 分，此時本地 Chunk 0 的 100 分將被雲端 60 分無條件覆蓋抹殺。這與 D2 及 Proposal 聲稱的「Chunk-level Set Union Merge 保留最高分與雙向融合」產生規格分歧。
- **改善建議**：
  即使 `shouldUploadToCloud` 為 false，回寫本地的 `targetSession` 仍應始終使用 `mergedSession`，以確保本地端雙向保留最高成績；或者在雲端領先但分數落後時，觸發靜態 upsert 更新雲端分數。

---

## 3. 過度工程與死代碼審計 (`ponytail-audit`)

依據 `ponytail-audit` 規範（Tags: `delete`, `stdlib`, `native`, `yagni`, `shrink`），對本次修改範圍及周邊代碼進行檢索：

| 標籤 (Tag) | 處置目標 (What to cut) | 替代方案 (Replacement) | 涉及路徑 (Path) |
|---|---|---|---|
| `yagni` | 四重重複語法錯誤切換防禦 | 保留 Hook 底層防禦與 Toolbar 按鈕 disabled，刪除 Editor 外層 wrapper 與多餘的 Toolbar div onClick | [GraphToolbar.tsx:172-205](file:///c:/Users/user/Desktop/Quiz-app-/components/KnowledgeGraph/GraphToolbar.tsx#L172-L205) / [GraphEditor.tsx:226-234](file:///c:/Users/user/Desktop/Quiz-app-/components/KnowledgeGraph/GraphEditor.tsx#L226-L234) |
| `delete` | `retryCleanupDirtyBanks` 中的死變數 `keepIds` 與雙重 Set 轉換 | 直接宣告 `const keepIdsSet = new Set(toUpsert.map(r => r.id))` | [services/cloudStorage.ts:305-306](file:///c:/Users/user/Desktop/Quiz-app-/services/cloudStorage.ts#L305-L306) |
| `shrink` | 雙重 Question 正規化運算 | 外層已執行 `normalizeQuestionForPersistence`，進入 `mapQuestionToDbRow` 時勿重複執行，省去多餘的深拷貝與 UUID 運算 | [services/cloudStorage.ts:228-245](file:///c:/Users/user/Desktop/Quiz-app-/services/cloudStorage.ts#L228-L245) |
| `yagni` | 模組級布林鎖 `isSyncingPracticeSessions` | `runWithSyncLock` 已具備跨分頁與同進程 exclusive lock 特性，無需手動維護全域布林值狀態 | [services/cloudStorage.ts:796-802](file:///c:/Users/user/Desktop/Quiz-app-/services/cloudStorage.ts#L796-L802) |
| `stdlib` | 重複手寫 6 次以上的 `isAbort` 錯誤字串偵測 | 提取共用判斷 helper `isAbortError(err)` | [services/cloudStorage.ts:100, 119, 442, 608, 817, 959](file:///c:/Users/user/Desktop/Quiz-app-/services/cloudStorage.ts) |

**Ponytail Audit 淨減效益估算 (Net potential)**:
`net: -38 lines, 0 deps possible.`

---

## 4. 技術債帳簿調閱 (`ponytail-debt`)

依據 `ponytail-debt` 規範，對代碼庫進行 `(#|//) ?ponytail:` 全文檢索（排除文件、OpenSpec 規格與測試）：

### 4.1 現存技術債條目 (Active Debt Ledger)

```text
components/KnowledgeGraph/NodeEditPanel.tsx:262, retain fontWeight beside canonical bold for schema-v2 readers. ceiling: 2026-10-01 migration window. upgrade: schema-v2 migration window closes.
```

- **檔案與行號**：[components/KnowledgeGraph/NodeEditPanel.tsx:262](file:///c:/Users/user/Desktop/Quiz-app-/components/KnowledgeGraph/NodeEditPanel.tsx#L262)
- **簡化內容**：保留 `fontWeight` 與 `bold` 雙重寫入，避免舊版讀取者遺失加粗樣式。
- **Ceiling（上限時間）**：`2026-10-01`
- **Upgrade Trigger（重構觸發點）**：`schema-v2 migration window closes`
- **Rot Risk（靜默腐化風險）**：🟢 **極低**（具備明確到期日與觸發條件，已於 `design.md` 列入 Phase 2 P2 排程）。

### 4.2 本次變更清理項目 (Debt Purged in this Change)
- **P1 清理**：[components/KnowledgeGraph/graphUtils.ts](file:///c:/Users/user/Desktop/Quiz-app-/components/KnowledgeGraph/graphUtils.ts) 中的 `applyDagreLayout` 舊相容別名已徹底刪除，測試已轉移至 `applyAutoLayout`。

### 4.3 帳簿統計 (Ledger Summary)
`1 marker, 0 with no trigger.`

---

## 5. 審計結論與後續步驟

### 審計評級：🟡 **CONDITIONAL PASS（有條件通過）**
代碼已具備高標準之防禦性與穩定度，無破壞性變更，348 項測試與 CI 門禁全數綠燈。
建議在進入 Git Commit 結案前，由負責工程師評估以下事項：
1. **評估 WARNING-01**：是否接受 `beforeunload` 在極端關閉分頁時可能因 React 異步排程而未及時落盤的已知邊界，或在 Phase 2 補強；
2. **評估 WARNING-02**：確認當雲端完成 Chunk 數較多時，覆蓋本地分數是否為符合預期的產品行為；
3. **評估 YAGNI / SHRINK 項目**：是否在本 PR 中一次性刪除多餘的 `keepIds` 死變數與重複的 4 層 Toast 阻斷防禦，或維持現狀。

本審計員已停止一切自動化代碼修改，等待您評估裁決。