# Project: knowledge-graph-enhancements

## Architecture
- **模組與邊界**：
  - `types/graphTypes.ts`：資料結構與規格定義。
  - `services/graphStorage.ts`：LocalStorage 持久化、資料遷移與安全防禦。
  - `services/radialLayout.ts`：BFS 放射狀畫布自動佈局。
  - `services/markdownGraphBridge.ts`：Markdown 縮排列表解析與 DFS 反向序列化。
  - `components/KnowledgeGraph/`：UI 元件（視覺模式與代碼模式、TipTap 富文本、便利貼）。
- **資料流**：
  - Markdown 列表文本 (Code Editor) --(parse)--> 結構節點 (Radial Layout) --(merge with stickies)--> React Flow 節點 -> 畫布繪製
  - 畫布編輯 (Concept Nodes) --(serialize)--> Markdown 列表文本 (Code Editor)
  - 節點選取 --(title match)--> TipTap 富文本編輯 --(autosave)--> `notes` 字典 --(storage save)--> LocalStorage

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Dependency & Storage Layer | 安裝 TipTap、配置 Vite chunks、擴充 types 與 graphStorage v1->v2 遷移與 fail-fast 拋錯 | 無 | DONE (v2, Blob size, escapeHtml, throw on Fatal) |
| 2 | Radial Layout & Markdown parser | 實作 radialLayout 佈局與 markdownGraphBridge 雙向解析、過濾便利貼、層級顏色 | M1 | DONE (BFS radial, DFS markdown, filter stickies) |
| 3 | UI Elements (Notes & Stickies) | 實作 StickyNoteNode, GraphNotesPanel (TipTap) 與 NotesSearch (搜尋與未歸檔筆記) | M1, M2 | DONE (TipTap panel, base64 prevent, sticky node, search panel) |
| 4 | Workspace Integration & Verification | 實作 GraphCodeEditor、KnowledgeGraphWorkspace 錯誤處理 ErrorBoundary、GraphEditor 雙模式切換與便利貼/結構節點合併、完成全量測試與生產建置 | M3 | PLANNED |

## Interface Contracts
### `services/radialLayout.ts`
- `applyRadialLayout(nodes: RFNode[], edges: RFEdge[]): RFNode[]`
  - 傳入 React Flow 節點與邊，計算位置後傳回節點。

### `services/markdownGraphBridge.ts`
- `parseMarkdownToGraph(text: string): { nodes: GraphNode[]; edges: GraphEdge[]; errors: string[] }`
  - 將縮排列表解析為節點與邊，自動過濾並忽略 `sticky` 類型的節點。
- `graphToMarkdown(nodes: GraphNode[], edges: GraphEdge[]): string`
  - DFS 遍歷結構節點，生成 Markdown，忽略 `sticky` 類型的節點。

### `services/graphStorage.ts`
- 升級 Schema 格式：`GraphDocument` 增加 `notes: Record<string, string>` 字典，與 `editMode: 'visual' | 'code'`。
- 遷移邏輯：在 `getGraphs` 讀取 v1 時自動提取 nodes 中的 notes/definition/details，移至 v2 的頂層 `notes` 字典，key 為 title。
- 寫入檢查：`validateGraphDocument` 檢查便利貼數量上限 (20)。
- 失敗處理：若 migration 失敗，拋出 Fatal Error。

## Code Layout
- `types/graphTypes.ts` (已存在，需擴充)
- `services/graphStorage.ts` (已存在，需更新)
- `services/radialLayout.ts` (新增)
- `services/markdownGraphBridge.ts` (新增)
- `components/KnowledgeGraph/KnowledgeGraphWorkspace.tsx` (已存在，需重構)
- `components/KnowledgeGraph/GraphEditor.tsx` (已存在，需重構)
- `components/KnowledgeGraph/ConceptNode.tsx` (已存在，需更新)
- `components/KnowledgeGraph/GraphToolbar.tsx` (已存在，需更新)
- `components/KnowledgeGraph/StickyNoteNode.tsx` (新增)
- `components/KnowledgeGraph/GraphNotesPanel.tsx` (新增)
- `components/KnowledgeGraph/NotesSearch.tsx` (新增)
- `components/KnowledgeGraph/GraphCodeEditor.tsx` (新增)
- `src/__tests__/graphStorage.test.ts` (已存在，需更新)
- `src/__tests__/radialLayout.test.ts` (新增)
- `src/__tests__/markdownGraphBridge.test.ts` (新增)
