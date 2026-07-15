# Project: knowledge-graph-v2-upgrade

## Architecture
- **模組與邊界**：
  - `types/graphTypes.ts`：資料結構、`GraphErrorCode` 列舉與規格定義。
  - `services/graphStorage.ts`：LocalStorage 持久化、資料遷移、錯誤處理與 Supabase 雲端同步/自動重試邏輯。
  - `services/radialLayout.ts`：BFS 放射狀畫布自動佈局。
  - `services/markdownGraphBridge.ts`：Markdown 縮排列表解析與 DFS 反向序列化（忽略便利貼）。
  - `components/KnowledgeGraph/`：UI 元件（GraphEditor.tsx、視覺與代碼雙模式切換、TipTap 富文本、便利貼、不透明度調整、衝突 ConfirmDialog 等）。
  - `hooks/`：
    - `useGraphState.ts`：Graph 狀態管理（節點、邊、選取狀態等）。
    - `useGraphCodeMode.ts`：處理 Code 模式與 Visual 模式的轉換及 Ancestor Path 匹配。
    - `useGraphStorage.ts`：處理 Local/Supabase 讀取、寫入與同步（LWW, online 事件監聽, dirty logs）。
- **資料流**：
  - Markdown 列表文本 (Code Editor) --(parse)--> 結構節點 (Radial Layout) --(merge with stickies)--> React Flow 節點 -> 畫布繪製
  - 畫布編輯 (Concept Nodes) --(serialize)--> Markdown 列表文本 (Code Editor)
  - 節點樣式匹配：使用 Ancestor Path (`Parent:Child:Grandchild`) + Levenshtein 距離 (<= 2) 匹配，保留自定義顏色、字型、形狀與位置。
  - 雲端同步：本地與雲端同步使用 Last-Write-Wins。衝突時彈出 ConfirmDialog（保留本地、保留雲端、另存副本）。

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M0 | E2E Testing Track Setup | 設計 Category-Partition 4-tier 測試，編寫 E2E 測試與驗證基礎，發布 `TEST_READY.md` | 無 | DONE |
| M1 | GraphEditor Refactoring & Error Code | 重構 GraphEditor（<= 300 行），拆分出三個 hooks（<= 150 行）。實作 GraphErrorCode 與 Ancestor Path 匹配。 | M0 | DONE |
| M2 | Bug Fixes & Visual Features | 修正 Diamond 變形與 handles、閱讀模式狀態傳遞與連線拖曳。實作 DropNodeMenu、背景不透明度、經典配色與圖片 URL 安全 XSS 防護。 | M1 | PLANNED |
| M3 | Supabase Sync & Retry | 同步至 Supabase `knowledge_graphs`、衝突 ConfirmDialog、離線 dirty-graphs 儲存與 online 自動重試。 | M2 | PLANNED |
| M4 | Beta Gate Removal & Verification | 移除 Settings 等處的 beta gate。全量測試、無 any 型別、生產建置無錯誤。 | M3 | PLANNED |

## Interface Contracts
### `types/graphTypes.ts`
- 新增 `GraphErrorCode` enum，包含寫入限制、格式錯誤、同步衝突等錯誤代碼。

### `services/graphStorage.ts`
- 更新 `saveGraph`, `getGraphs` 等函數，當發生錯誤時，回傳 `GraphErrorCode` 而非中文硬編碼字串。
- 新增 `syncGraphToSupabase(graph: GraphDocument): Promise<void>`
- 新增 `saveDirtyGraph(graphId: string): void` 和 `retryDirtyGraphs(): Promise<void>`

### `hooks/useGraphState.ts`
- `useGraphState(initialNodes: RFNode[], initialEdges: RFEdge[])`
  - 管理 React Flow 節點與邊的 state，以及選取狀態、展開級別等。

### `hooks/useGraphCodeMode.ts`
- `useGraphCodeMode(nodes: RFNode[], edges: RFEdge[])`
  - 提供 `convertToCode(nodes, edges): string`
  - 提供 `parseFromCode(code: string, originalNodes: RFNode[]): { nodes: RFNode[], edges: RFEdge[] }`，實作 Ancestor Path 匹配。

### `hooks/useGraphStorage.ts`
- `useGraphStorage(graphId: string)`
  - 提供本地與雲端儲存/讀取/同步介面，處理 LWW 與 dirty sync。

## Code Layout
- `types/graphTypes.ts` (已存在，需更新)
- `services/graphStorage.ts` (已存在，需更新)
- `components/KnowledgeGraph/GraphEditor.tsx` (已存在，需重構)
- `hooks/useGraphState.ts` (新增)
- `hooks/useGraphCodeMode.ts` (新增)
- `hooks/useGraphStorage.ts` (新增)
- `components/KnowledgeGraph/DropNodeMenu.tsx` (新增)
- `components/KnowledgeGraph/ConceptNode.tsx` (已存在，需更新)
- `components/KnowledgeGraph/GraphToolbar.tsx` (已存在，需更新)
- `components/KnowledgeGraph/StickyNoteNode.tsx` (已存在，需更新)
- `components/KnowledgeGraph/KnowledgeGraphWorkspace.tsx` (已存在，需更新)
