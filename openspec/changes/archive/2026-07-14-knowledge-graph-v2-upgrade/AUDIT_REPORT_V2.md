# 🔒 知識圖譜 V2 升級 — 第二位獨立審計員最終審計缺陷報告（V2）

> **審計角色**：獨立第二位高階 AI（不隸屬自檢團隊）
> **審計範圍**：`openspec/changes/knowledge-graph-v2-upgrade/` 與實際 codebase
> **審計日期**：2026-07-14
> **審計工具**：`openspec-verify-change`、`ponytail-audit`、`ponytail-debt`、`knip`、`tsc --noEmit`、`npm test`、`npm run build`
> **審計結論**：🟡 **部分通過 / 仍有殘留缺陷** — 上一輪 15 項 CRITICAL 中 **13 項已修復**，但仍有 **2 舊 CRITICAL + 3 新 WARNING + 2 新 SUGGESTION + 5 項 Ponytail-Debt 違規** 待處理。建議修正殘留缺陷後再 archive。

---

## 1. 審計摘要（與 V1 對比）

| 維度 | V1 | V2 |
|------|--------|------|
| **Completeness** | 🔴 嚴重不足（7 項未實作） | 🟢 **已修復** — Tasks 39/39 真實落地 |
| **Correctness** | 🔴 規格違反嚴重 | 🟢 **已修復** — Schema v3、便利貼樣式、4 選項、上限保護皆落地 |
| **Coherence** | 🟡 部分支異 | 🟡 **殘留分歧** — `applyDagreLayout` 命名誤導、stress-test-report 過時 |
| **驗證** | tsc/test/build 綠 | ✅ tsc 零錯誤、254 tests 全綠、build 6.12s |
| **knip** | 4 + 6 + 1 + 2 新增死碼 | ✅ **本輪新增死碼已全清**（剩餘均為既有專案項目） |
| **CRITICAL 閉合率** | 15 open | **13/15 closed**（86.7%） |
| **WARNING 閉合率** | 12 open | **9/12 closed**（75%） |

---

## 2. V2 已驗證修復項目（13 CRITICAL / 9 WARNING）

### 已修復 CRITICAL（13 項）

| V1 ID | 項目 | 關鍵程式碼 | 驗證結果 |
|-------|------|-----------|---------|
| C-01 | Schema v3 升級 | `graphTypes.ts:17` `SCHEMA_VERSION=3`、L67-81 `GraphDocument` 含三欄位、`graphStorage.ts:289-326` v2→v3 遷移 + `isBackgroundOpacity`/`isLayoutMode` 守衛 | ✅ |
| C-02 | GraphErrorCode 命名對齊 | `graphTypes.ts:100-118` 採 `*_EXCEEDED` 命名，舊名保留為 `@deprecated` 別名 | ✅ |
| C-03 | `utils/graphColorHelper.ts` | 檔案存在，`resetClassicNodeColors(nodes, edges)` BFS 配色正確 | ✅ |
| C-04 | GraphEditor ≤300 行 | `GraphEditor.tsx` **282 行**（`GraphEditorInner`） | ✅ |
| C-05 | DropNodeMenu 4 選項 | `DropNodeMenu.tsx` 獨立元件，含方形/圓角/菱形/便利貼 4 選項 | ✅ |
| C-06 | MAX_NODES 上限保護 | `useGraphState.ts:73-74` `handleCreateNodeAndConnect` 有 MAX_NODES/MAX_EDGES 檢查 + toast | ✅ |
| C-07 | 便利貼 fontSize/bold | `StickyNoteNode.tsx:9-10,80,87` 渲染 fontSize/bold；`NodeEditPanel.tsx` 黏貼有 UI | ✅ |
| C-08 | 佈局切換按鈕 | `GraphToolbar.tsx:94-98` `onToggleLayoutMode` + `onApplyRadialLayout` | ✅ |
| C-09 | `backgroundOpacity` 命名與持久化 | `'translucent'\|'solid'` 與 spec 一致；`graphStorage.ts:140` 寫入 `GraphDocument` | ✅ |
| C-10 | 圖片 URL 即時驗證 | `NodeEditPanel.tsx:78-83` `isValidImageUrl` + `imageUrlError` alert | ✅ |
| C-11 | Supabase SQL migration | `supabase/migrations/20260714000000_create_knowledge_graphs.sql` 含 DDL+RLS | ✅ |
| C-12 | readingModes progressive 重置測試 | `readingModes.test.ts:69` `'resets every node expandLevel'` | ✅ |
| C-13 | graphCloudStorage 衝突測試真實性 | 測試呼叫真實 `resolveGraphConflict(local, cloud, userId, confirmMock)` | ✅ |
| C-14 | knip 本輪新增死碼清理 | knip 無 graph* 新增死碼 | ✅ |

### 已修復 WARNING（9 項）

| V1 ID | 項目 | 驗證結果 |
|-------|------|---------|
| W-02 | online 監聽 | ✅ `KnowledgeGraphWorkspace.tsx:148-184` 有 `window.addEventListener('online')` |
| W-03 | 重命名提示文案 | ✅ `GraphCodeEditor.tsx:105` 正確規範文案 |
| W-04 | `<img>` max-width 120px | ✅ 外層 `max-w-[120px]` wrapper（L92,145）+ 圖片 `max-h-[120px]` |
| W-05 | 菱形/圓角圖片顯示 | ✅ L91-93（diamond 分支）與 L144-147（concept/rounded 分支）皆有 |
| W-07 | Path 分隔符 `:` | ✅ `graphUtils.ts:113` `parts.join(':')` |
| W-08 | bgOpacity title 文案 | ✅ `GraphToolbar.tsx:123` 「約 80% 主題色」與 `${color}CC` 一致 |
| W-09 | 暗色模式新建預設 solid | ✅ `graphStorage.ts:396-401` `getDefaultBackgroundOpacity()` 偵測 `dark` class |
| W-11 | markdownGraphBridge ancestor/heuristic 測試 | ✅ `markdownGraphBridge.test.ts:148` 含 Levenshtein 匹配測試 |
| W-12 | flushSave 先比對雲端 | ✅ `graphCloudStorage.ts:185-189` 先 fetch 比對 `cloudTime > localTime`，拋 `GraphCloudConflictError` 不覆寫 |

---

## 3. CRITICAL 殘留缺陷（必須立即處理）

### C-R1：`openspec/specs/` 主規格 sync-specs 流程跳過（違反 AGENTS.md 鐵規 OPENSPEC_TASKS_CHECKLIST + Task 12.3）

- **來源**：V1 C-14
- **狀態**：❌ **未修復**
- **證據**：
  - `openspec/specs/` 目錄下 **無任何 `graph-*` capability 資料夾**
  - 應建檔但缺失的 delta spec：`graph-cloud-storage`、`graph-editor-refactor`、`graph-layout-modes`、`graph-node-interactions`、`graph-visual-themes`
  - 已做：僅 `knowledge-graph-editor/spec.md` 更新（116 行）、`knowledge-graph-data/spec.md` 新增 `Cloud graph persistence` 一段
- **影響**：AGENTS.md 鐵規明定「實作完畢結案前必須 sync delta specs 至 main specs」。5/6 個 capability 規格未 sync，archive 後規格將永久遺失，未來開發者無從查閱設計意圖。
- **建議**：執行 `/opsx-sync` 或手動補建：
  ```
  openspec/specs/graph-cloud-storage/
  openspec/specs/graph-editor-refactor/
  openspec/specs/graph-layout-modes/
  openspec/specs/graph-node-interactions/
  openspec/specs/graph-visual-themes/
  ```

### C-R2：過時審計產物未清理（違反 docs 一致原則）

- **來源**：V1 W-06
- **狀態**：❌ **未修復**
- **證據**：`openspec/changes/knowledge-graph-v2-upgrade/` 下仍殘留 3 份過時文件：
  - `stress-test-report.md`（272 行）— 仍講「6 個 Hook」「Supabase Storage Bucket」，與現行 `design.md`（3 Hook、URL 引用）嚴重不一致
  - `AUDIT_REPORT.md`（324 行）— V1 失敗審計報告，15 CRITICAL 多數已修復
  - `audit-defects-report.md`（60 行）— 同為過時審計產物
- **影響**：未來讀者（或下一位審計員）首次瀏覽時會被誤導。結案前應刪除或歸檔至 `docs/`。
- **建議**：
  ```bash
  rm "openspec/changes/knowledge-graph-v2-upgrade/stress-test-report.md"
  rm "openspec/changes/knowledge-graph-v2-upgrade/AUDIT_REPORT.md"
  rm "openspec/changes/knowledge-graph-v2-upgrade/audit-defects-report.md"
  # 或移至 docs/
  ```

---

## 4. WARNING 殘留 / 新增

### W-R1：`applyDagreLayout` 誤導性命名 stub（YAGNI 違反，Design D8 分歧）

- **來源**：V1 `audit-defects-report.md` WARNING
- **狀態**：🔶 **部分處理但未修正根因**
- **證據**：`graphUtils.ts:83-85`：
  ```typescript
  export function applyDagreLayout(nodes: RFNode[], edges: RFEdge[], direction: 'TB' | 'LR' = 'TB'): RFNode[] {
    void direction;  // dead parameter
    return applyRadialLayout(nodes, edges);  // 完全忽略 direction，實為 radial
  }
  ```
  `GraphEditor.tsx:104` 仍以 `applyDagreLayout(rfNodes, rfEdges, result.direction)` 呼叫。
- **影響**：
  - 函式名暗示 dagre 樹狀佈局，實際只是 `applyRadialLayout` 的別名，**嚴重誤導**
  - `direction` 參數被 suppress（`void direction`），實為 dead code
  - Spec D8 明定「剔除 dagre 依賴」，此名留存混淆
- **建議**：重新命名為 `applyAutoLayout` 並刪除 `direction` 參數；或直接以 `applyRadialLayout` 替換所有呼叫端。

### W-R2：`useGraphStorage` Hooks 職責與 Spec D4 設計分歧

- **來源**：V1 W-01
- **狀態**：🔶 **已緩解但未對齊 spec**
- **證據**：
  - `hooks/useGraphStorage.ts:116` 只負責 autosave + 雲端 upsert + `GraphCloudConflictError` markDirty（W-12 已修）
  - `resolveGraphConflict` 彈窗另存邏輯仍在 `KnowledgeGraphWorkspace.resolveConflict`（L89-139）+ `syncAndLoad`（L95-139）
- **影響**：Spec D4 + Task 4.3 明定 `useGraphStorage` 職責包含「雲端同步與衝突另存」。功能運作但職責邊界與 spec 不一致，未來重構 Workspace 易丟失衝突防護。
- **建議**：
  - 若決定保留現狀，至少補 `ponytail:` 註解標記此分歧：
    ```typescript
    // ponytail: conflict resolution lives in KnowledgeGraphWorkspace, move here when Workspace exceeds 300 lines
    ```
  - 或將 `resolveGraphConflict` 包裝為 `useGraphStorage` 的一部分

### W-R3（新）：`ConceptNode.tsx:25` `shapeType` fallback 增加防禦

- **來源**：本次審計新發現
- **狀態**：🆕 **新 WARNING**
- **證據**：`ConceptNode.tsx:25`：
  ```typescript
  const shapeType = nodeData.shapeType ?? 'concept';
  ```
  `GraphNodeData` 本身無 `shapeType` 欄位（graphTypes.ts:28-40），該欄位存在於 `ConceptNodeExtraData`（L12-16）但為非強制。若遇外部注入或遷移遺失則靜默 fallback。
- **影響**：若雲端同步資料缺 `shapeType`，菱形節點無聲降級為方形，使用者困惑且無提示。
- **建議**：考慮在 `getGraphs()` migration 中為已知菱形節點補 `shapeType`，或在 UI 降級時顯示一次 toast。

---

## 5. SUGGESTION 缺陷（YAGNI / Code Smell / 可優化）

### S-R1：`ConceptNode.tsx:122` `diamond: ''` + `// unreachable` 殘留（V1 S-08 未修復）

- **證據**：
  ```typescript
  diamond: '', // unreachable
  ```
  因 `Record<NodeShapeType, string>` 型別強迫列舉，但菱形由早期 L52 `if (isDiamond) return` 提前處理。
- **建議**：抽 `<DiamondConceptNode>` 子元件消除 `unreachable` branch。

### S-R2（新）：`useGraphCodeMode.ts:101` `setCodeErrors` dead export

- **證據**：`return { ..., setCodeErrors, ... }` 但 `GraphEditor.tsx` 解構時未取用；GraphCodeEditor 自行管理 `errors` state（L63-66）
- **建議**：移除 `setCodeErrors` 從回傳物件，或替換為 return `codeErrors` 純讀取。

---

## 6. Ponytail-Debt 技術債帳簿

### 掃描結果

```bash
grep -rnE '(#|//) ?ponytail:' . --include='*.ts' --include='*.tsx'
```
**0 hits — `No ponytail: debt. Clean ledger.`**

### 評估：clean ledger 是警訊

本次 recovery 採取了多項 **故意 shortcut**，但 **全無 `ponytail:` 標記**。依 ponytail-debt 技能規範：「每個 deliberate shortcut SHALL 用 `ponytail:` comment 命名 ceiling 與 upgrade path。未命名的 shortcut 會悄悄變成永久的。」

### Ponytail-Debt 違規登錄（5 項）

| # | 位置 | 陳述事項 | 建議 `ponytail:` 註解 |
|---|------|---------|----------------------|
| PD-1 | `graphUtils.ts:83` | `applyDagreLayout` 實為 `applyRadialLayout` 別名，`direction` 參數 dead | `// ponytail: rename to applyAutoLayout when 2nd layout algorithm added; drop direction param` |
| PD-2 | `ConceptNode.tsx:122` | 型別強迫列舉 `diamond: ''` + `unreachable` | `// ponytail: extract DiamondConceptNode subcomponent when adding 4th shape` |
| PD-3 | `hooks/useGraphStorage.ts` | 衝突另存邏輯在 Workspace 而非 Hook 內 | `// ponytail: move resolveConflict into hook when Workspace exceeds 300 lines` |
| PD-4 | `openspec/changes/` | 過時審計文件未清 | `// ponytail: delete stale audit artifacts before archive` |
| PD-5 | `hooks/useGraphCodeMode.ts:101` | `setCodeErrors` dead export | `// ponytail: remove from return when GraphCodeEditor stabilizes` |

### `no-trigger` 腐化風險

**PD-2**（diamond subcomponent）與 **PD-5**（setCodeErrors）**無明確 upgrade trigger**，屬高腐化風險，建議補上時間或事件觸發條件。

---

## 7. Ponytail-Audit 全面過度工程與死代碼審計

> 範圍：本次變更涉及之代碼庫（`components/KnowledgeGraph/`、`hooks/`、`services/`、`types/`、`utils/`、`src/__tests__/`）

| 排名 | 標籤 | 應削減項 | 替代方案 | 路徑 |
|------|------|---------|---------|------|
| 1 | `yagni` | `applyDagreLayout` wrapper + dead `direction` param | 直接呼叫 `applyRadialLayout`，刪除 wrapper | `components/KnowledgeGraph/graphUtils.ts:83` |
| 2 | `shrink` | `GraphCodeEditor.tsx:74` `lineNumbers.join('\n')` 每次 join | 預計算 `useMemo` 或抽元件 | `components/KnowledgeGraph/GraphCodeEditor.tsx:74` |
| 3 | `yagni` | `setCodeErrors` dead export | 移除 export | `hooks/useGraphCodeMode.ts:101` |
| 4 | `delete` | `stress-test-report.md`、`AUDIT_REPORT.md`、`audit-defects-report.md` | 刪除或歸檔 | `openspec/changes/knowledge-graph-v2-upgrade/` |
| 5 | `delete` | `constants.ts`（根目錄，既有債） | 移除或合併至 `types/` | `constants.ts` |
| 6 | `delete` | `@types/dompurify` unused devDep | `npm uninstall @types/dompurify` | `package.json` |
| 7 | `shrink` | `NodeEditPanel.tsx:240` `bold`+`fontWeight` 雙欄位冗餘 | 統一 `bold: boolean` 單一來源 | `components/KnowledgeGraph/NodeEditPanel.tsx:239-241` |
| 8 | `yagni` | `GraphErrorCode` 11 個 deprecated 別名 | 若 `translateGraphError` 已全用新值則可刪 | `types/graphTypes.ts:120-141` |

**淨估計**：`-約 60 行`、`-1 wrapper 函式`、`-1 dead param`、`-3 過時審計文件`、`-1 unused devDep`、`-2 dead exports`

---

## 8. 已關閉 V1 缺陷與留存比對一覽

### V1 CRITICAL → 本輪狀態

| V1 ID | 標題 | 本輪 |
|-------|------|------|
| C-01 | Schema v3 升級未實作 | ✅ 已修復 |
| C-02 | GraphErrorCode 命名不一致 | ✅ 已修復（deprecated 別名保留） |
| C-03 | graphColorHelper 不存在 | ✅ 已修復 |
| C-04 | GraphEditor 超 300 行 | ✅ 已修復（282 行） |
| C-05 | DropNodeMenu 只有 2 選項 | ✅ 已修復（4 選項） |
| C-06 | 缺少 MAX_NODES 檢查 | ✅ 已修復 |
| C-07 | 便利貼 fontSize/bold 未實作 | ✅ 已修復 |
| C-08 | 無佈局切換按鈕 | ✅ 已修復 |
| C-09 | backgroundOpacity 命名不一致 + 未持久化 | ✅ 已修復 |
| C-10 | NodeEditPanel 缺少即時驗證 | ✅ 已修復 |
| C-11 | SQL Schema 未落地 | ✅ 已修復 |
| C-12 | progressive 重置測試未新增 | ✅ 已修復 |
| C-13 | graphCloudStorage 測試造假 | ✅ 已修復（真實 resolveGraphConflict） |
| **C-14** | openspec/specs 主規格未同步 | ❌ **未修復 → C-R1** |
| C-15 | knip 本輪新增死碼 | ✅ 已修復 |

### V1 WARNING → 本輪狀態

| V1 ID | 標題 | 本輪 |
|-------|------|------|
| W-01 | useGraphStorage 無衝突另存邏輯 | 🔶 緩解（`GraphCloudConflictError` 攔截）→ **W-R2** |
| W-02 | useGraphStorage 不含 online 監聽 | ✅ 已修復（在 Workspace 中） |
| W-03 | GraphCodeEditor 提示文案不符 | ✅ 已修復 |
| W-04 | `<img>` max-h 非 max-w | ✅ 已修復（外層 `max-w-[120px]`） |
| W-05 | 菱形/圓角無法顯示圖片 | ✅ 已修復（雙分支皆渲染） |
| W-06 | stress-test-report 與 design 不同步 | ❌ **未修復 → C-R2** |
| W-07 | Path 分隔符 `/` vs `:` | ✅ 已修復（`':'`） |
| W-08 | onToggleBgOpacity title 文案不符 | ✅ 已修復 |
| W-09 | bgOpacity 預設值與 Spec 不符 | ✅ 已修復 |
| W-10 | setCodeErrors 無人使用 | ❌ **未修復 → S-R2** |
| W-11 | markdownGraphBridge 缺測試 | ✅ 已修復 |
| W-12 | flushSave 上傳時機問題 | ✅ 已修復（先比對雲端） |

---

## 9. 行動建議優先級

### 🔴 結案前必做（阻擋 archive）
1. **C-R1**：執行 `/opsx-sync` 或手動補建 5 個 `graph-*` capability 資料夾進 `openspec/specs/`
2. **C-R2**：刪除 `stress-test-report.md`、`AUDIT_REPORT.md`、`audit-defects-report.md` 三份過時審計產物

### 🟡 建議本輪完成
3. **W-R1**：將 `applyDagreLayout` 重新命名為 `applyAutoLayout`，刪除 dead `direction` 參數
4. **W-R2**：至少補上 `ponytail:` 註解標記 Hook 職責妥協
5. **PD-1 ~ PD-5**：補上 5 項 `ponytail:` 註解

### 🟢 可遞延至後續迭代
6. **S-R1**：抽 `<DiamondConceptNode>` 子元件
7. **S-R2**：移除 `useGraphCodeMode` 回傳 `setCodeErrors`
8. **W-R3**：考量 `shapeType` fallback 提示
9. 清理 `constants.ts`（既有）、`@types/dompurify`（unused devDep）
10. 簡化 `NodeEditPanel` `bold`/`fontWeight` 雙欄位為單一來源
11. 評估 `GraphErrorCode` deprecated 別名可否移除

---

## 10. 審計最終結論

本次 recovery **大幅推進**：自檢團隊已實質修復 **13/15 CRITICAL** 與 **9/12 WARNING**，`tsc`/`test`/`build`/`knip` 四項驗證全綠，本輪無新增死碼。Schema v3、便利貼樣式、4 選項 DropNodeMenu、上限保護、即時 URL 驗證、SQL migration、真實衝突測試皆已真實落地。**功能完整性已達可交付水準。**

然而：
1. **OpenSpec `sync-specs` 鐵規仍漏**（C-R1）— 5 個 capability 規格未進 main specs，archive 後永久遺失
2. **過時審計產物未清**（C-R2）— 會誤導未來讀者
3. **Ponytail-Debt 帳簿全空**— 5 項故意 shortcut 無追蹤標記，違反 `ponytail-debt` 技能規範

### 審計判定

| 條件 | 判定 |
|------|------|
| 未修正 C-R1 + C-R2 | 🛑 **不通過** |
| 僅修正 C-R1 + C-R2 | 🟡 **有條件通過**（應補 ponytail: 註解後 archive） |
| 修正 C-R1 + C-R2 + W-R1 + PD-1~5 | ✅ **全部通過** |

**審計版本**：V2
**審計員**：第二位獨立高階 AI
**狀態**：🟡 等待您評估是否指示修正或直接 archive。

---

## 附錄：驗證命令

```bash
# TypeScript 型別檢查
npx tsc --noEmit

# 執行單元測試
npm test -- --run

# 生產環境建置
npm run build

# 死代碼掃描
npx -y knip --reporter compact

# Ponytail-debt 掃描
grep -rnE '(#|//) ?ponytail:' . --include='*.ts' --include='*.tsx'
```

### 驗證結果摘要

| 命令 | 結果 |
|------|------|
| `npx tsc --noEmit` | ✅ 零錯誤 |
| `npm test -- --run` | ✅ 40 files / 254 passed |
| `npm run build` | ✅ 6.12s（vendor-ui-core 1.29MB，既有 warning） |
| `npx -y knip --reporter compact` | ✅ 無本輪新增死碼 |
| Ponytail-debt grep | 0 hits（clean ledger，但 5 項應標未標） |
