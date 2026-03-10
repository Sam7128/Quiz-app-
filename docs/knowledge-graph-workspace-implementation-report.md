# 知識圖工作區 (Knowledge Graph Workspace) — 實作報告

> **日期**: 2026-03-08
> **變更名稱**: `knowledge-graph-workspace`
> **狀態**: ✅ 已完成 — 8 輪多模型自動驗證通過

---

## 1. 概覽

本次實作為 MindSpark 新增「知識圖工作區」功能，讓使用者能以視覺化節點圖的方式組織知識概念，並支援 Mermaid 語法匯入匯出。

### 核心功能
- 🧠 **視覺化節點編輯器** — 基於 @xyflow/react 的拖拽式知識圖
- 📝 **概念節點** — 支援標題、定義、詳細說明、顏色、字體大小
- 🔗 **連線管理** — 箭頭方向切換、標籤編輯、動畫效果
- 📖 **閱讀模式** — 漸進式 (L1→L2→L3) 與全展開模式
- 🔄 **Mermaid 雙向橋接** — 匯入/匯出 flowchart 語法
- 💾 **自動儲存** — 2 秒 debounce + 離頁/切頁 flush
- ⚙️ **Beta 功能開關** — Settings 中啟用，條件顯示導覽入口
- 📱 **手機支援** — 唯讀模式，可切換閱讀模式

---

## 2. 執行管線 (7 Phase Pipeline)

| 階段 | 技能 | 狀態 | 說明 |
|------|------|------|------|
| Phase 1 | `openspec-new-change` | ✅ | 建立 `knowledge-graph-workspace` 變更 |
| Phase 2 | `openspec-ff-change` | ✅ | 產生 proposal + design + 5 specs + tasks (55 項) |
| Phase 3 | `plan-stress-test` | ✅ | 20 個問題 + 完整測試矩陣 + 效能基準 |
| Phase 4 | `review-check` (3 輪) | ✅ | 3 模型審查，Round 3 達 2/3 PASS |
| Phase 5 | `openspec-apply-with-tests` | ✅ | 全部 55 項任務實作 + 50 個測試 |
| Phase 6 | `auto-verify` (8 輪) | ✅ | Round 8 達 2/3 PASS (Opus + GPT-5.3) |
| Phase 7 | 最終報告 | ✅ | 本文件 |

---

## 3. 檔案變更清單

### 新增檔案 (13 個)

| 檔案 | 說明 | 大小 |
|------|------|------|
| `types/graphTypes.ts` | 知識圖型別定義與限制常數 | ~80 行 |
| `services/graphStorage.ts` | CRUD 服務 (MutationResult + 限制驗證) | ~110 行 |
| `services/mermaidBridge.ts` | Mermaid 匯入/匯出橋接 | ~400 行 |
| `components/KnowledgeGraph/KnowledgeGraphWorkspace.tsx` | 主工作區 (default export) | ~90 行 |
| `components/KnowledgeGraph/GraphList.tsx` | 圖表清單 (建立/刪除/重命名) | ~130 行 |
| `components/KnowledgeGraph/GraphEditor.tsx` | 完整編輯器 | ~640 行 |
| `components/KnowledgeGraph/ConceptNode.tsx` | 自訂 ReactFlow 節點 | ~62 行 |
| `components/KnowledgeGraph/NodeEditPanel.tsx` | 節點屬性編輯面板 | ~155 行 |
| `components/KnowledgeGraph/GraphToolbar.tsx` | 工具列 | ~115 行 |
| `src/__tests__/graphStorage.test.ts` | 儲存層測試 | 17 tests |
| `src/__tests__/mermaidBridge.test.ts` | Mermaid 橋接測試 | 20 tests |
| `src/__tests__/betaFeatureToggle.test.ts` | Beta 開關測試 | 4 tests |
| `src/__tests__/readingModes.test.ts` | 閱讀模式測試 | 9 tests |

### 修改檔案 (8 個)

| 檔案 | 變更 |
|------|------|
| `types.ts` | 新增 `'graph'` 至 `AppView` 聯合型別 |
| `types/battleTypes.ts` | 新增 `betaFeatures?: { knowledgeGraph: boolean }` |
| `services/storage.ts` | 新增 `GRAPHS: 'mindspark_graphs'` 至 STORAGE_KEYS |
| `components/Settings.tsx` | Beta 功能開關區塊 + 描述文字「🧠 知識圖」|
| `components/AppHeader.tsx` | 動態 `getNavItems()` 含條件知識圖入口 |
| `components/MobileNav.tsx` | 動態 `getMobileNavItems()` 含條件知識圖入口 |
| `components/AppContent.tsx` | React.lazy + Suspense + View Guardian |
| `package.json` | 新增 @xyflow/react@12.10.1, @dagrejs/dagre@2.0.4 |

---

## 4. 架構決策

| ID | 決策 | 理由 |
|----|------|------|
| D1 | @xyflow/react 作為核心引擎 | MIT、React 19 相容、無 peer dep 衝突 |
| D2 | Canvas JSON 為主格式 | 直接序列化、無需第三方解析器 |
| D3 | Beta 開關存於 UserSettings | 避免 localStorage 碎片化 |
| D4 | React.lazy 代碼分割 | 首次使用，KG chunk 74.81KB (gzip 26.64KB) |
| D5 | 桌面優先、手機唯讀 | ≤768px 隱藏工具列、禁止拖拽/連線/選取 |
| D6 | Mermaid flowchart 子集 | 支援 graph/flowchart TD/LR、基本形狀、classDef，且編輯器保留節點形狀 |
| D7 | 2 秒 debounce 自動儲存 | beforeunload + visibilitychange 雙重 flush |

---

## 5. 自動驗證歷程 (8 輪)

### 修正統計

| 輪次 | 修正數 | 重點修正 |
|------|--------|----------|
| R1 | 14 | View Guardian、ConceptNode 閱讀模式、漸進點擊、手機唯讀、邊標籤編輯 |
| R2 | 8 | 手機面板防護、onPaneClick、匯入替換/追加、視窗中心新節點、dagre 方向 |
| R3 | 3 | 漸進模式回傳修正、不支援語法偵測(6種)、截斷計數修正 |
| R4 | 3 | style 前置過濾移除、QuotaExceeded toast、連線模式切換按鈕 |
| R5 | 4 | 導覽標籤「🧠 知識圖」、GraphList 上限橫幅、漸進點擊顯示面板、toast 全覆蓋 |
| R6 | 4 | 分號語法支援、行號追蹤、刪除確認、雙擊重命名 |
| R7 | 0 | 2/3 未通過（全域訊息行號問題）→ 追加修正 |
| R8 | 1 | 語義分類前綴 `[輸入檢查]`/`[全域限制]`/`[匯入摘要]` |
| **合計** | **37** | |

### 各模型通過歷程

| 輪次 | Claude Opus 4.6 | GPT-5.3-Codex | GPT-5.4 | 結果 |
|------|-----------------|---------------|---------|------|
| R1 | ❌ | ❌ | ❌ | 0/3 |
| R2 | ✅ | ❌ | ❌ | 1/3 |
| R3 | ✅ | ❌ | ❌ | 1/3 |
| R4 | ✅ | ❌ | ❌ | 1/3 |
| R5 | ✅ | ❌ | ❌ | 1/3 |
| R6 | ✅ | ❌ | ❌ | 1/3 |
| R7 | ✅ | ❌ | ❌ | 1/3 |
| **R8** | **✅** | **✅** | ❌ | **2/3 ✅** |

---

## 6. 測試覆蓋

| 測試檔案 | 測試數 | 覆蓋範圍 |
|----------|--------|----------|
| `graphStorage.test.ts` | 17 | CRUD、驗證、圖表上限、節點/連線上限、名稱規則 |
| `mermaidBridge.test.ts` | 20 | 匯入/匯出、形狀、箭頭、classDef、HTML decode、分號、長度限制 |
| `betaFeatureToggle.test.ts` | 4 | 開關狀態、導覽條件、View Guardian |
| `readingModes.test.ts` | 9 | 漸進式 L1→L2→L3、全展開、預設值、持久化 |
| **總計** | **50** | |

全部 86 測試通過 (50 新 + 36 既有)。

---

## 7. 效能指標

| 指標 | 數值 |
|------|------|
| 建置時間 | 4.60s |
| KG chunk 大小 | 76.79 KB (gzip 27.16 KB) |
| 測試執行時間 | 2.18s (86 tests) |
| 新增依賴 | @xyflow/react (155KB gzip), @dagrejs/dagre (8KB gzip) |

---

## 8. 資料模型

```typescript
GraphDocument {
  id: string;           // crypto.randomUUID()
  schemaVersion: 1;
  name: string;         // max 50 chars
  nodes: GraphNode[];
  edges: GraphEdge[];
  viewState: GraphViewState;
  createdAt: string;    // ISO 8601
  updatedAt: string;
}

GraphNode {
  id, position: {x, y},
  data: { title(100), definition?(500), details?(2000), color, fontSize },
  type: 'concept' | 'rounded' | 'diamond'  // editor 內可保留與切換
}

GraphEdge {
  id, source, target,
  label?(100), animated?, arrowType: 'arrow' | 'none' | 'both'
}

GraphViewState {
  readingMode: 'expand-all' | 'progressive',
  zoom, panX, panY
}
```

### 限制

| 項目 | 上限 |
|------|------|
| 圖表數量 | 20 |
| 每圖節點 | 200 |
| 每圖連線 | 500 |
| 圖表名稱 | 50 字元 |
| 節點標題 | 100 字元 |
| 節點定義 | 500 字元 |
| 節點詳細 | 2000 字元 |
| 連線標籤 | 100 字元 |
| Mermaid 輸入 | 50,000 字元 |
| Mermaid 節點 | 50 個 |

---

## 9. Mermaid 支援語法

### 支援 ✅
- `graph TD` / `graph LR` / `flowchart TD` / `flowchart LR`
- 節點: `A[方形]` / `A(圓角)` / `A{菱形}`
- 連線: `-->` / `---` / `-->|標籤|` / `<-->`
- `classDef` (僅 fill 屬性 → 節點顏色)
- `class` 指派
- 分號分隔語法 (`graph TD; A --> B; B --> C`)
- HTML entities (`&amp;` → `&`)
- 行內節點定義 (`A[Start] --> B[End]`)
- 匯入後於編輯器中保留節點形狀，並可在側邊面板切換

### 不支援 ⚠️ (含修正建議)
- `subgraph` / `end`
- `click` / `callback`
- `style` / `linkStyle`
- `%%{ init: ... }%%`

---

## 10. 殘餘項目 (Deferred)

| 項目 | 優先級 | 說明 |
|------|--------|------|
| Mermaid 反斜線轉義 | Low | `\]`/`\)` 等極端轉義仍未特別處理 |
| 行內標題編輯 | v2 | 目前透過側面板 + 雙擊，v2 可加直接行內編輯 |
| 匯出為 PNG/SVG | v2 | 需要 html-to-image 或類似套件 |
| 圖表搜尋/篩選 | v2 | 當圖表數量增加時需要 |

---

## 11. 結論

知識圖工作區功能已完整實作，經過 7 階段管線（規劃 → 壓力測試 → 3 輪審查 → 實作 → 8 輪驗證）的嚴格驗證。所有 55 項任務已完成，50 個新測試通過，建置穩定。功能以 Beta 形式釋出，使用者可在設定中啟用。
