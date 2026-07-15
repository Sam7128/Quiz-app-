# 🔍 知識圖譜 V2 升級 — 獨立最終審計缺陷報告

> **審計角色**：第二位高階 AI（獨立於自檢團隊）
> **審計範圍**：`openspec/changes/knowledge-graph-v2-upgrade/`
> **審計日期**：2026-07-13
> **審計工具**：openspec-verify-change、ponytail-audit、ponytail-debt、knip、tsc、vitest
> **審計結論**：🛑 **不通過** — 共發現 **15 項 CRITICAL** + **12 項 WARNING** + **8 項 SUGGESTION**

---

## 1. 審計摘要

| 維度 | 評語 |
|------|------|
| **Completeness** | 🔴 嚴重不足 — Tasks.md 39 項子任務全標 `[x]`，但實際至少 7 項根本未實作或與要求嚴重偏離 |
| **Correctness** | 🔴 規格違反嚴重 — Schema v3 整體未做、便利貼樣式未實作、DropNodeMenu 規格 4 選項只做 2 個 |
| **Coherence** | 🟡 部分歧異 — wide-vs-narrow naming 偏離 (`opaque` vs `solid`)、path 分隔符 (`/` vs `:`) 與設計文件不符、stress-test-report 引用過時的 6-Hook 設計 |

**核心矛盾**：Tasks 全部勾選完成，但 `npx tsc --noEmit` 與 `npm test` 全綠的「健康假象」僅反映**「未實作的功能沒有對應測試」**，並非真正功能完整。

---

## 2. CRITICAL 缺陷（影響功能完整性或違反硬性規格）

### C-01：Schema v3 升級根本未實作（違反 Task 1.2 / 2.2 / 2.3 / D5 / D11）
- `types/graphTypes.ts:17` 的 `SCHEMA_VERSION` 仍為 `2`，未升為 `3`
- `GraphDocument` 介面 (line 61-72) 完全沒有 `backgroundOpacity`、`layoutMode`、`theme` 三個欄位
- `getGraphs()` (graphStorage.ts:50-79) 只有 v1 → v2 遷移，**完全沒有 v2 → v3 遷移邏輯**
- `createNewGraph()` (line 158-172) 並未預設 v3 新欄位
- **影響**：Spec `graph-visual-themes` 中「暗色模式下新建圖表預設 `'solid'`」與 `D11-001` 向後相容防護**完全沒實作**。Stress test report 第 1 名 Critical D11-001 仍是 open 狀態，未緩解。

### C-02：`GraphErrorCode` enum 命名與 Spec 不一致（違反 Task 1.1 / D6）
- Design.md D6 明確定義 8 個錯誤碼（`MAX_GRAPHS_EXCEEDED`, `MAX_NODES_EXCEEDED`, `MAX_EDGES_EXCEEDED`, `MAX_STICKY_EXCEEDED`, `TITLE_TOO_LONG`, `SAVE_ERROR`, `DELETE_NOT_FOUND`, `DELETE_ERROR`）
- 實際 graphTypes.ts:91-110 命名為 `MAX_GRAPHS_LIMIT`, `MAX_NODES_LIMIT`, `SAVE_FAILED`, `GRAPH_NOT_FOUND`, `DELETE_FAILED`
- **影響**：Coherence 違規。Spec 字面意義 (`MAX_NODES_EXCEEDED`) 與 UI 翻譯表 (KnowledgeGraphWorkspace.tsx:35 用 `MAX_NODES_LIMIT`) 不一致；未來若以 spec 對接會出現未匹配的 enum 值

### C-03：`utils/graphColorHelper.ts` 根本未建立，函式 `resetClassicNodeColors` 不存在（Task 3.1 幽靈任務）
- Task 3.1 明確要求「於 `utils/graphColorHelper.ts` 中實作 `resetClassicNodeColors(nodes, edges)`」
- 實際：`utils/graphColorHelper.ts` 檔案不存在
- 工作團隊私下**改名、搬位置**，改為 `services/radialLayout.ts:197` 中的 `applyClassicColoring`
- **影響**：Task 已標 `[x]` 但描述完全不符。GraphToolbar 採用 `onApplyClassicColoring` 命名，spec `graph-visual-themes` 中只講「重置配色」，並未禁止改名，但**「utils/graphColorHelper.ts」這條 spec 命令完全未兌現**

### C-04：`GraphEditor.tsx` 432 行遠超 Spec 300 行硬上限（違反 Task 4.8 + Spec graph-editor-refactor）
- Spec `graph-editor-refactor` Scenario「Hook 拆分完整性」明講：「`GraphEditorInner` 元件本身 SHALL 僅包含 JSX 渲染和事件綁定邏輯（不超過 300 行）」
- 實際 `components/KnowledgeGraph/GraphEditor.tsx` 共 **432 行**（line 48-409 為 GraphEditorInner）
- **額外**：`DropNodeMenu` UI 直接嵌入第 351-384 行（~34 行 JSX + handleCreateNodeAndConnect 邏輯 ~50 行），違反 Task 6.1「建立 `components/KnowledgeGraph/DropNodeMenu.tsx` 浮動選單元件」

### C-05：DropNodeMenu 只有 2 個選項，Spec 要求 4 個（違反 Task 6.1 + Spec graph-node-interactions）
- Spec `graph-node-interactions` 明定菜单 SHALL 包含「**方形**、**圓角**、**菱形**、**便利貼**」4 選項
- 實際 GraphEditor.tsx:363-376 只有「概念 (新概念)」「便利貼 (備忘)」2 個按鈕
- **影響**：使用者無法透過拖曳建立圓角與菱形節點，spec核心 scenario 未滿足

### C-06：拖曳建立節點缺少節點數量上限保護（違反 Spec graph-node-interactions）
- Spec `Scenario: 節點數量上限保護`：當達 MAX_NODES (200) 時，系統 SHALL 顯示 toast 並阻止建立
- `handleCreateNodeAndConnect` (GraphEditor.tsx:236-280) **完全沒有** `MAX_NODES` 檢查
- **影響**：使用者可透過拖曳建立超過 200 個節點， bypass 限制。graphStorage 雖在 `saveGraph → validateGraphDocument` 驗證，但 UI 已建立節點才會在 autosave 失敗，顯示延遲且體驗差

### C-07：便利貼 fontSize / bold 文字樣式完全未實作（違反 Task 8.1 + Spec）
- Task 8.1 明定「在 `StickyNoteNode.tsx` 中新增基本文字格式控制（字體大小 `'sm' | 'md' | 'lg'` 及粗體樣式），存於節點 `data.fontSize` 與 `data.bold` 中」
- `StickyNoteNode.tsx` 完全沒有使用 `data.fontSize` 也沒有 `data.bold`/`fontWeight` 渲染邏輯
- `NodeEditPanel.tsx` **只對 concept-type 節點**顯示 fontSize 選單（line 194-213），而便利貼 (`nodeType === 'sticky'`，line 97 `nodeType as string !== 'sticky'`) **完全沒有 fontSize / bold UI**
- `GraphNodeData` 中也沒有 `bold` 欄位（只有 `fontWeight`，spec 與 type 又不一致）
- **影響**：Spec 要求的便利貼格式控制 100% 未實作

### C-08：無「自由/放射狀」佈局切換按鈕，layoutMode 未持久化（違反 Task 7.2 + Spec graph-layout-modes）
- Spec `graph-layout-modes` 明定「系統 SHALL 提供自由與放射狀佈局模式讓使用者選擇，並在工具列上提供切換按鈕」
- 實際 GraphToolbar.tsx 只有「**放射狀自動排版**」按鈕（line 90，icon=RefreshCw），呼叫 `onApplyRadialLayout` 是**一次性套用排版**
- 完全沒有「自由 ↔ 放射」**模式切換按鈕**
- `GraphDocument.layoutMode` 欄位根本不存在（見 C-01），自然無法持久化
- Spec 中「`GraphDocument.layoutMode` SHALL 更新為 `'radial'`」「切回自由模式」「`layoutMode` 更新為 `'free'`」三個 scenario 全數未實作
- **影響**：Spec capability `graph-layout-modes` **整個未實作**

### C-09：`backgroundOpacity` 欄位與 Spec 命名不一致，且未持久化至 GraphDocument
- Spec 多處使用 `backgroundOpacity: 'translucent' | 'solid'`（graph-visual-themes Spec L22、D5）
- 實際使用 `'translucent' | 'opaque'`（graphTypes.ts:58、ConceptNode.tsx:21、GraphEditor.tsx:62、GraphToolbar.tsx:32）
- 命名差異雖功能等價但 **spec 字面值未對齊**
- `bgOpacity` 只透過 `viewState.bgOpacity` 持久化（useGraphStorage.ts:52），未寫入 Spec 要求的 `GraphDocument.backgroundOpacity` 頂層欄位
- **影響**：跨裝置雲端同步後，`backgroundOpacity` 是否保留可疑（cloud sync 看完整 doc，但 doc 結構並無 `backgroundOpacity`，僅有 `viewState.bgOpacity`，雖能同步但與 spec 文件不一致）

### C-10：NodeEditPanel 圖片網址輸入缺少客戶端即時協議驗證（違反 Task 8.2 + Spec）
- Spec `graph-cloud-storage` Scenario「引用外部圖片 URL」明定：「若檢測不通過（如貼入 `javascript:` 偽協定），系統 SHALL **警告提示**『僅支援安全 http/https 圖片網址』，並不渲染 `<img>` 以防止 XSS 漏洞」
- 實際 `NodeEditPanel.handleImageUrlChange` (line 67-71) **不進行任何協議驗證**，直接 `debouncedUpdate({ imageUrl: v })` 寫入節點
- 協議驗證**只在後端 `validateGraphDocument` (graphStorage.ts:224-226)** 進行
- **影響**：使用者輸入 `javascript:alert(1)` 時 UI **不會即時警告**，要等到 autosave 觸發後才會透過 toast 顯示錯誤。雖然 `<img>` 不會渲染（ConceptNode.tsx:133 有 `isValidImageUrl` 雙重保護），但使用者體驗與 Spec 文字要求明確不符

### C-11：Spec `graph-cloud-storage` SQL Schema 未落地（違反 D10 + Spec）
- Spec `graph-cloud-storage` `Requirement: Supabase table schema` 明定應使用以下 SQL：
  ```sql
  CREATE TABLE knowledge_graphs (...);
  CREATE INDEX idx_knowledge_graphs_user ON knowledge_graphs(user_id);
  ALTER TABLE knowledge_graphs ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Users can CRUD own graphs" ON knowledge_graphs FOR ALL USING (auth.uid() = user_id);
  ```
- **整個 SQL migration script 未出現在 codebase 中** — 沒有 `supabase/migrations/` 目錄，沒有任何 `.sql` 檔包含此 schema
- **影響**：上線時若 Supabase 上未有此資料表，所有同步將 404 失敗

### C-12：Task 5.4 「切換 progressive 重置 expandLevel 測試」未新增（違反 Task 5.4）
- `src/__tests__/readingModes.test.ts` 全 86 行，測試焦點只在 `cycleExpandLevel` 純函式（line 13-20）與 toggle
- 完全沒有任何「切換至 `progressive` 時所有節點 `expandLevel` 重置為 0」的測試
- 對應 GraphEditor.tsx:160-174 的 `handleToggleReadingMode` 重置邏輯**無測試覆蓋**
- **影響**：Bug 修復（Task 5.3）若有回歸將無法被自動測試捕獲

### C-13：`graphCloudStorage.test.ts` 衝突解決測試為「手抄假實作」而非真實實作（違反 Task 9.4）
- Test 中 `executeResolveConflict` (line 209-263) 是**完全複製貼上**的偽實作
- 使用硬編 `copy-uuid-123` (line 239) 替代 `crypto.randomUUID()`
- **完全沒有引入、呼叫或測試 `KnowledgeGraphWorkspace.resolveConflict` (KnowledgeGraphWorkspace.tsx:89-149) 的真實實作**
- **影響**：若真實實作邏輯改變或差異（例如真實實作用 `useConfirm` hook，假實作用 `confirmMock`），測試不會發現。Spec `graph-cloud-storage` Verification「驗證雲端衝突 ConfirmDialog 及另存副本邏輯」**未真正驗證到實作**

### C-14：`openspec/specs/` 主規格未同步（違反 Task 11.3 + 12.3 + OPENSPEC_TASKS_CHECKLIST）
- Task 11.3 明定「更新 `openspec/specs/knowledge-graph-editor/spec.md` 補充說明祖先路徑與 Heuristic 匹配規格設計」
- 實際：`openspec/specs/knowledge-graph-editor/spec.md` 仍停留在 **2026-05-18**，從未更新
- Task 12.3 明定「更新對應的各個 `spec.md` 規格」
- 實際：`openspec/specs/` 並未新增 `graph-cloud-storage`, `graph-editor-refactor`, `graph-layout-modes`, `graph-node-interactions`, `graph-visual-themes` 任何 capability 資料夾
- `knowledge-graph-data` (proposal 中明確 modified capability) 也未更新 v3 schema spec
- **影響**：AGENTS.md 鐵規 OPENSPEC_TASKS_CHECKLIST 明定「實作完畢結案前，必須將對應的 OpenSpec 變更計畫中的 `tasks.md` 中所有已完成的項目標記為 `[x]`」與「sync delta specs 至 main specs」，後者完全未做。專案記憶 `/opsx-sync` 步驟跳過

### C-15：knip 報告 4 個 Unused files + 6 個 Unused exports 未清（違反 Task 13.4）
- `npx -y knip --reporter compact` 報告：
  - **Unused files**: `constants.ts`（根目錄整檔無人引入）、3 個 systematic-debugging 相關檔案
  - **Unused devDependencies**: `@types/dompurify`
  - **Unused exports**: `getLevenshteinDistance`, `getPath`（graphUtils.ts），`isAchievementUnlocked`，`retryCleanupDirtyBanks`，`batchSaveCloudSpacedRepetition`，`isGraphDocument`，`getSharedBanks`，多個 storage 函式
  - **Unused exported types**: `SyncConflict`, `SupabaseGraphRow`, `Challenge`
- Task 13.4 明定「執行 `npx -y knip --reporter compact` 確認無新增死碼」
- **影響**：本次變更**新增**的死碼包含：`getLevenshteinDistance`、`getPath`、`isGraphDocument`、`SyncConflict`、`SupabaseGraphRow`（皆為本次變更新增的 graphUtils/graphCloudStorage 檔案中導出但未被外部使用的函式/型別）

---

## 3. WARNING 缺陷（設計分歧但功能運作）

### W-01：`useGraphStorage` 並未如 Task 4.3 / Spec 要求實作衝突另存新檔機制
- Task 4.3 / D4 / Spec 明定 `useGraphStorage` 職責包含「雲端同步與衝突另存」
- 實際 `hooks/useGraphStorage.ts` 109 行只負責本地 autosave + 雲端 upsert，**完全沒有衝突另存邏輯**
- 衝突另存邏輯被搬到 `KnowledgeGraphWorkspace.syncAndLoad` (line 152-196) 與 `resolveConflict` (line 89-149)
- **影響**：功能運作但 Hook 職責與 spec D4 設計分歧。若未來重構 KnowledgeGraphWorkspace 會丟失衝突防護

### W-02：`useGraphStorage` 不含 online 監聽
- 與 W-01 同理：online 監聽實作在 KnowledgeGraphWorkspace.tsx:206-241，不在 hook 內
- Spec D10 與 Task 9.3 允許在 `KnowledgeGraphWorkspace.tsx` 或 `AppContent.tsx` 中實作，此 warning 為軟性

### W-03：`GraphCodeEditor` 提示文案與 Task 11.2 / Spec 要求不符
- Spec `graph-editor-refactor` Scenario「重命名級聯失效防禦」明定系統 SHALL 顯示「**重命名父節點會重設其子分支樣式；建議在視覺編輯中重命名以保留樣式**」
- 實際 GraphCodeEditor.tsx:104-106 文案為「切換回視覺模式時，系統會以祖先路徑模糊匹配（Levenshtein 距離 ≤ 2）保留節點的位置、顏色、定義與邊樣式...」
- **這是「機制說明文案」，而非 Spec 要求的「重命名風險警告文案」**
- **影響**：使用者不會知道在代碼模式重命名父節點會導致子節點樣式重設

### W-04：`<img>` 使用 `max-h-120px` 而非 Spec 規定的「最大寬度 120px」
- Spec `graph-cloud-storage` 明定「畫布上該節點下方 SHALL 以 `<img>` 顯示圖片縮圖（**最大寬度 120px**，以防節點變形）」
- 實際 ConceptNode.tsx:138 `className="w-full h-auto max-h-[120px] object-cover"` 用最大高度
- **影響**：圖片會佔滿節點寬度（concept 節點 max-w-320px），可能比 120px 寬。雖不至於變形但與 spec 文字不符

### W-05：菱形與圓角節點無法顯示外部圖片
- ConceptNode.tsx:133 條件 `shapeType === 'concept' && nodeData.imageUrl` —— 只有方形節點會渲染 `<img>`
- Spec 並未限制形狀，僅說「概念節點」可引用外部圖片
- **影響**：使用者把方形節點改為菱形後，圖片不顯示；改回方形後圖片才出現——行為不直覺

### W-06：Stress-test-report.md 與最終 design.md 不同步
- Stress test report 第 6 行仍講「拆分 6 個 Hook」、「Supabase Storage Bucket」
- Risk Register 第 1 名 (D6-001)「Storage RLS Bucket MIME 限制」在現有 design 已剔除 Storage 上傳改採 URL 引用後**整項過時**
- Risk Register 第 3 名 (D10-001) 還在講 `title:depth` 匹配，design 已改祖先路徑
- **影響**：未來讀者若參考 stress-test-report 會被誤導。文件不應保留失效的審計報告

### W-07：Path 分隔符號不一致（`/` vs Spec 文字的 `:`）
- Spec/proposal/design/原始文件多次書面 `Root:Child:Grandchild` 用 `:` 分隔
- 實際 graphUtils.ts:122 `return parts.join('/')` 用 `/`
- 雖然分隔符號僅作內部匹配使用，不影響功能，但**文件與 code 字串不同**
- **影響**：Coherence 違規，未來若要在 debug log 顯示 path 會與文件對不上

### W-08：`onToggleBgOpacity` title 文案 (`100%主題色`) 與實際 80% 不透明 (`${color}CC`) 不符
- GraphToolbar.tsx:114 title 為「不透明底色（100%主題色）」
- 實際 ConceptNode.tsx:122, 77 使用 `${nodeData.color}CC`（即 80% 不透明度），Math 並非 100%
- **影響**：對使用者誤導

### W-09：`bgOpacity` 預設值與 Spec 不符
- Spec `graph-visual-themes` Scenario「暗色模式下新建圖表預設值」明定：當系統偵測暗色模式時，新建圖表 `backgroundOpacity` SHALL 預設為 `'solid'`
- 實際 `DEFAULT_VIEW_STATE.bgOpacity = 'translucent'` (graphTypes.ts:79)
- `createNewGraph` 也不偵測暗色模式
- **影響**：暗色模式下新建圖表仍是半透明，與 spec 要求相違

### W-10：`useGraphCodeMode` 回傳 `setCodeErrors` 無人使用
- line 101 return 包含 `setCodeErrors` 但 GraphEditor 未解構使用此 setter
- 輕微 dead code，但屬本次變更範圍新增

### W-11：`markdownGraphBridge.test.ts` 未補 ancestor/heuristic/imageUrl 測試（違反 Task 4.6）
- Task 4.6 明定「更新 `markdownGraphBridge.ts` 與 `markdownGraphBridge.test.ts`...補充相關測試案例」
- `markdownGraphBridge.test.ts` 全 7 個測試，全無 `ancestor|path|heuristic|Levenshtein|imageUrl` 字樣
- Heuristic 匹配雖然有 `useGraphCodeMode.challenger.test.tsx` 測試，但 spec 額外要求橋接層測試未補

### W-12：`useGraphStorage.flushSave` 上傳時機問題
- `useGraphStorage.flushSave` (line 60) 在 `saveGraph` 成功後直接 `uploadGraphToCloud(doc, ...)`，**未先比對雲端 updatedAt**
- 若 A 裝置剛做了修改並上傳，B 裝置在不知道的情況下修改並 flushSave 時，會**直接 upsert 覆蓋 A 裝置的雲端版本**
- 真正的衝突檢測只在 `KnowledgeGraphWorkspace.syncAndLoad` 初次進入時觸發
- **影響**：在 A、B 兩裝置同時開啟同一張圖表並同時編輯的場景下，後儲存的一方會直接無聲覆蓋雲端，B 裝置的衝突另存路徑不會被觸發

---

## 4. SUGGESTION 缺陷（YAGNI/可優化）

### S-01：`constants.ts`（根目錄）整檔無人引入
- knip 報告 unused file
- **建議**：刪除或合併進 `types/` 目錄

### S-02：graphUtils.ts 中 `getLevenshteinDistance` 與 `getPath` 為導出但只內部使用
- knip 報告 unused exports
- **建議**：移除 `export` 關鍵字，改為檔案內部 private function

### S-03：graphCloudStorage.ts 中 `isGraphDocument`、`SyncConflict`、`SupabaseGraphRow` 為導出但無外部消費
- knip 報告 unused exported types/function
- **建議**：若是防禦性 export（未來可能用到），可加 `ponytail:` 註解標記；否則改為內部使用

### S-04：`@types/dompurify` 為 unused devDependency
- knip 報告 unused devDependencies
- **建議**：`npm uninstall @types/dompurify` 移除

### S-05：`DEFAULT_VIEW_STATE.readingMode` 預設為 `'progressive'`（graphTypes.ts:75）
- 雖與 spec 不直接衝突，但讓首次開圖即入「逐步探索」模式，節點全 collapse 對新手不友善
- **建議**：考慮改為 `'expand-all'`，並在使用者切到 progressive 時才持久化

### S-06：`useGraphState.ts` 中 `handleEdgeClick` toggle marker 邏輯複雜
- line 100-105 三種狀態切換（無→箭頭→雙向→清除）if-else 嵌套，可讀性較差
- **建議**：抽取純函式 `nextArrowType(currentMarkerStart, currentMarkerEnd)`

### S-07：GraphEditor.tsx:104 使用原生 `prompt()` 取連線標籤
- 全專案其他位置皆使用 `useConfirm` 或 `GlobalModals`，此處獨家使用 browser dialog
- 與專案一貫 UI 風格不一致，且 E2E 測試 (`page.on('dialog')`) 已被 AGENTS.md 規範禁止
- **建議**：統一改用 `GlobalModals` 或 `useConfirm` with input

### S-08：`ConceptNode.tsx:110` 出現 `diamond: ''` 並標 `// unreachable`
- `shapeClassName` 滿足 `Record<NodeShapeType, string>` 型別故列空字串
- 菱形分流在 line 45 提早 `return`，但因 TS 型別滿足仍需列出
- **建議**：將菱形渲染拉成獨立 sub-component `<DiamondConceptNode>`，避免 `unreachable` 這種 code smell

---

## 5. Ponytail-Debt（技術債帳簿）

**掃描結果**：`No ponytail: debt markers found. Clean ledger.`

⚠️ **這本身是警訊**：本次變更採用「Ponytail 核心精神」（proposal.md 第 5 行明文），但**全團隊沒有使用 `ponytail:` 註解標記任何 shortcuts、deferrals 或 YAGNI 取捨**。

根據 ponytail-debt 技能規範「每個 deliberate shortcut SHALL 用 `ponytail:` comment 命名 ceiling 與 upgrade path。**未命名的 shortcut 會悄悄變成永久的**」。

**違反項目**：
1. GraphEditor.tsx 432 行超 Spec 300 行限制——未以 `ponytail: 300-line limit, refactor when adding 5th hook` 註解標記
2. `DropNodeMenu` 沒獨立成檔——未以 `ponytail: separate component, extract when GraphEditor exceeds 500 lines` 標記
3. `applyClassicColoring` 改名搬位置偏離 Task 3.1——未以 `ponytail: spec file path, update tasks.md wording when archiving` 標記
4. Schema v3 略過未實作——這是重大偏離，不應用 `ponytail:` 包裝（屬 C-01 CRITICAL）

**建議**：本次 deadlock 缺陷嚴重，與其標 `ponytail:` 註解，不如把未做的工作補完再考慮標記臨時 shortcut。

---

## 6. 統計總表

| 項目 | 計數 |
|---|---|
| CRITICAL | 15 |
| WARNING | 12 |
| SUGGESTION | 8 |
| Ponytail-debt markers | 0 (clean，但 clean 本身是警訊) |
| Knip unused files | 4 |
| Knip unused exports | 6 |
| Knip unused devDeps | 1 |
| Knip unused exported types | 2 |
| 已正確完成的高價值功能 | 圖片 XSS 後端驗證、Beta UI 移除、雲端同步 dirty queue、菱形 clip-path 修復、祖先路徑匹配演算法實作、並發衝突另存機制實作 |

---

## 7. 行動建議優先級

### 必須立即修正（CRITICAL）：
1. **C-01, C-08**：補完 Schema v3升級（`backgroundOpacity`、`layoutMode`、`theme` 三欄位）+ v2→v3 遷移 + 暗色模式預設值
2. **C-15**：執行 `npx -y knip` 並清理所有死碼（移除或加 `ponytail:` 標記）
3. **C-11**：補 SQL migration 檔（`supabase/migrations/` 目錄）含 Spec 中 CREATE TABLE + RLS
4. **C-04, C-05**：拆出 `DropNodeMenu.tsx` 為獨立元件並補齊方形/圓角/菱形/便利貼 4 個選項
5. **C-06**：補 `handleCreateNodeAndConnect` 的 `MAX_NODES` 上限檢查
6. **C-07**：補便利貼 fontSize / fontWeight UI 與渲染
7. **C-10**：在 NodeEditPanel 加入 URL 即時協議驗證 + 警告提示
8. **C-12**：在 `readingModes.test.ts` 補「切換 progressive 重置 expandLevel」測試
9. **C-13**：將 `executeResolveConflict` 真實實作抽離以供測試，或直接用 `renderHook` 測 `useConfirm` + `resolveConflict`
10. **C-14**：執行 `openspec/apply` 或手動 sync，把 delta specs 同步到 `openspec/specs/`，並更新 `knowledge-graph-editor/spec.md`

### 重大修正（WARNING）：
11. **W-03**：把 GraphCodeEditor 提示文案改為 Spec 要求的「重命名父節點會重設其子分支樣式...」
12. **W-06**：更新或刪除 `stress-test-report.md` 過時內容
13. **W-09**：Implement 暗色模式新建圖表的 `bgOpacity` 預設 `'solid'`
14. **W-12**：考慮在 `useGraphStorage.flushSave` 上傳前先比對雲端版本，避免同時開啟兩裝置時無聲覆蓋

### 建議優化（SUGGESTION）：
15. 移除 `constants.ts`、`@types/dompurify`，將 graphUtils 的 unused exports 改為 private
16. 把 `prompt()` 改為 `GlobalModals`，E2E 才能正確互動

---

## 8. 審計最終結論

本次變更**表面上有 39/39 子任務完成、241 測試全綠、build 通過**，但實際審計揭示：

1. **Schema v3 升級整體未實作** —— Task 1.2、2.2、2.3 全標 `[x]` 但 code 中沒任何 v3 痕跡
2. **至少 4 個 spec capability 的核心 scenario 未滿足** —— `graph-layout-modes`（無切換）、`graph-node-interactions`（選項減半）、`graph-visual-themes`（無暗色預設）、便利貼樣式
3. **Task 13.4「knip 無新增死碼」明顯虛報** —— 本次新增 5 項 unused exports
4. **openspec sync-specs 流程跳過** —— OPENSPEC_TASKS_CHECKLIST 鐵規違反
5. **測試健康假象** —— 缺失功能本身就沒測試覆蓋，全綠只測了存在的舊功能

**審計不通過**，建議團隊退回實作軌道，**逐項修正 CRITICAL 後重新自檢**，再考慮 archive。

---

## 9. 審計執行記錄

| 步驟 | 工具 | 結果 |
|---|---|---|
| 1. 讀取規劃文件 | proposal.md / design.md / tasks.md / 5 spec.md | 完成，全 39 任務標記 `[x]` |
| 2. 跑 tsc | `npx tsc --noEmit` | 零錯誤（但掩蓋 Schema v3 缺失） |
| 3. 跑測試 | `npm test -- --run` | 241 passed / 37 files（但測試未覆蓋缺失功能） |
| 4. 跑 build | `npm run build` | 通過但 vendor-ui-core chunk 1.29MB |
| 5. 跑 knip | `npx -y knip --reporter compact` | 4 unused files + 6 unused exports + 1 unused devDep + 2 unused types |
| 6. grep ponytail markers | 全庫 `(#|//) ?ponytail:` | 0 hits，clean ledger |
| 7. 比對 code vs spec | 14 主要檔案逐行核對 | 15 CRITICAL + 12 WARNING + 8 SUGGESTION |

---

**審計簽章**：第二位獨立高階 AI 審計員
**審計版本**：v1.0
**狀態**：🛑 不通過，等待評估
