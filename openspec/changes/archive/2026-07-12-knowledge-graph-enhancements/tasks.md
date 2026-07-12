## 1. 環境準備與依賴安裝

- [x] 1.1 安裝 TipTap 依賴：`npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder`
  - **驗證**：`npm run build` 不報錯
- [x] 1.2 更新 `vite.config.ts` 的 `manualChunks`：將 `@tiptap` 和 `prosemirror` 加入 `vendor-ui-core` chunk，防止 React context 分離
  - **驗證**：`npm run build` 成功

## 2. 資料模型與儲存擴充（types + storage）

- [x] 2.1 擴充 `types/graphTypes.ts`：
  - 擴充 `GraphDocument`：新增 `notes: Record<string, string>` 字典（以節點 title 作為 key，HTML string 為 value），取代原有的節點級 notes 欄位
  - 擴充 `GraphDocument`：新增 `editMode: 'visual' | 'code'`
  - 擴充 `GRAPH_LIMITS`：新增 `NOTES_MAX: 10000`（單一筆記字元上限）、`STICKY_TEXT_MAX: 500`（便利貼字數上限）、`MAX_STICKY_NOTES: 20`（每張圖便利貼數量上限）
  - 更新 `SCHEMA_VERSION` 從 1 到 2
  - **驗證**：`npx tsc --noEmit` 通過
  - **影響範圍**：`GraphDocument` 所有關聯元件

- [x] 2.2 更新 `services/graphStorage.ts`：
  - 在 `getGraphs()` 中加入 schema migration 邏輯（v1→v2）：
    - 建立 `notes` 字典
    - 遍歷舊節點，若舊節點中含有舊有的 definition/details 或 notes 屬性，將其轉移到 `notes[node.data.title]`
    - 將 `schemaVersion` 更新為 2
  - **Fail-fast 安全處理**：在 `getGraphs()` 中，如果 migration 拋出 QuotaExceededError 或 any 異常，**直接 throw Error**，不要吞食錯誤返回 `[]`，避免後續覆蓋並清空 localStorage
  - 更新 `createNewGraph()`：包含新欄位預設值 (`notes: {}`, `editMode: 'visual'`)
  - 更新 `validateGraphDocument()`：檢查 `nodes` 中 `type === 'sticky'` 的便利貼數量是否 ≤ `MAX_STICKY_NOTES`，若超過則拋錯
  - 新增 `saveGraph()` 大小監控：序列化後超過 3MB 時返回 warning Toast 提示
  - **驗證**：現有儲存測試通過，並補足 migration 與安全防禦測試

- [x] 2.3 新增/更新測試 `src/__tests__/graphStorage.test.ts`：
  - 測試：v1 格式能正確升級並合併 notes
  - 測試：遷移出錯時拋出 Fatal Error 且不覆寫 localStorage，不回傳 `[]`
  - 測試：單一圖表超過 20 個便利貼時 saveGraph 阻斷
  - 測試：序列化大於 3MB 時返回 size warning
  - **驗證**：`npm test -- --run src/__tests__/graphStorage.test.ts` 全部通過

## 3. 放射狀佈局演算法

- [x] 3.1 新建 `services/radialLayout.ts`：
  - 匯出 `applyRadialLayout(nodes: RFNode[], edges: RFEdge[]): RFNode[]`
  - 演算法：BFS 從根節點開始分配 depth → 同 depth 節點均分 360° → 半徑線性遞增計算座標 (`x = cx + r*cos(a)`, `y = cy + r*sin(a)`)
  - 根節點偵測：優先入度為 0 節點，否則選第一個
  - 超過 12 個同層節點時半徑自動加大，防止重疊
  - 無邊連接的孤立節點在右側垂直排列
  - **驗證**：`npx tsc --noEmit` 通過

- [x] 3.2 新建 `src/__tests__/radialLayout.test.ts`：
  - 測試：根與子節點分佈、多層級半徑遞增、同層超過 12 節點防重疊、孤立節點排列、空輸入容錯
  - **驗證**：`npm test -- --run src/__tests__/radialLayout.test.ts` 全部通過

## 4. Markdown 解析器與序列化器

- [x] 4.1 新建 `services/markdownGraphBridge.ts`：
  - 匯出 `parseMarkdownToGraph(text: string): { nodes: GraphNode[]; edges: GraphEdge[]; errors: string[] }`
  - 只解析縮排列表（`-` 或 `*` 開頭），**不支援 YAML frontmatter**（減少複雜度與過度設計）
  - 縮排層級：相容 2/4 空格或 Tab，跳躍縮排容錯掛載至最近祖先
  - 層級自動配色：根據節點深度套用 default 顏色方案
  - 超出 `MAX_NODES` 限制時截斷並回報 error
  - 匯出 `graphToMarkdown(nodes: GraphNode[], edges: GraphEdge[]): string`
  - 反向序列化：DFS 深度優先遍歷生成縮排列表
  - **過濾便利貼**：不解析或序列化 `type === 'sticky'` 的便利貼節點
  - **驗證**：`npx tsc --noEmit` 通過

- [x] 4.2 新建 `src/__tests__/markdownGraphBridge.test.ts`：
  - 測試：基本解析、多層縮排、跳躍縮排容錯、序列化為 Markdown、忽略便利貼節點
  - **驗證**：`npm test -- --run src/__tests__/markdownGraphBridge.test.ts` 全部通過

## 5. 便利貼節點元件

- [x] 5.1 新建 `components/KnowledgeGraph/StickyNoteNode.tsx`：
  - React Flow 自定義節點（`type: 'sticky'`）
  - 外觀：黃色背景 (`#FEF3C7`)、無連接點 Handle、帶輕微陰影和圓角
  - 雙擊進入編輯模式（顯示 textarea，字數限制 500 字元，修改直接寫回 `node.data.label`）
  - **驗證**：在畫布上能顯示黃色便利貼、可拖曳並雙擊修改文字

## 6. 富文本筆記面板與筆記搜尋

- [x] 6.1 新建 `components/KnowledgeGraph/GraphNotesPanel.tsx`：
  - TipTap 富文本編輯器，工具列支援：H1, H2, B, I, U, S, OL, UL, Clear formatting
  - **資料對照讀寫**：讀寫當前選中節點 title 對應 of `GraphDocument.notes[nodeTitle]` 欄位。改名時，修改筆記 key 值
  - Debounce 500ms 自動儲存；切換節點或 unmount 面板時 flush 儲存
  - **驗證**：在視覺模式下點擊節點開啟面板，能打字且 500ms 後自動持久化
- [x] 6.2 新建 `components/KnowledgeGraph/NotesSearch.tsx`：
  - 支援跨 `notes` 字典搜尋純文字內容（去 HTML tag），點擊搜尋結果在畫布中 fitView 聚焦並開啟筆記
  - **未歸檔筆記管理**：列出在當前節點中不存在的 `notes` key值，點擊可刪除釋放空間或將其賦予當前選中節點

## 7. 代碼編輯器元件

- [x] 7.1 新建 `components/KnowledgeGraph/GraphCodeEditor.tsx`：
  - 帶有行號與 textarea 垂直同步滾動的文字編輯器
  - **不包含 Auto-Update 開關與手動更新按鈕**，強制即時預覽（500ms debounce 自動觸發解析與重排）
  - 底部顯示錯誤/警告區域

## 8. 雙模式切換與儲存安全整合

- [x] 8.1 重構 `components/KnowledgeGraph/KnowledgeGraphWorkspace.tsx`：
  - 在載入 `getGraphs()` 時捕獲 Fatal Error，若拋出儲存異常，阻斷應用並顯示全頁錯誤畫面，提供「導出備份」與「清空資料」按鈕
- [x] 8.2 重構 `components/KnowledgeGraph/GraphEditor.tsx` — 模式切換與便利貼合併：
  - 根據 `editMode` 進行佈局切換：
    - `visual`：全寬畫布 + 可開啟 GraphNotesPanel
    - `code`：左側 GraphCodeEditor（1/3）+ 右側畫布預覽（唯讀，2/3）
  - 模式切換資料同步：
    - 視覺→代碼：反序列化 `type !== 'sticky'` 的結構節點
    - 代碼→視覺：解析 Markdown 生成新結構節點（自動放射狀佈局），並**合併**當前 nodes 陣列中所有的 `type === 'sticky'` 便利貼節點，設為新的畫布狀態
    - 模式切換時，因為筆記直接儲存在 `notes` 字典中，完全不需拷貝筆記，確保資料安全不丟失
  - 工具列：新增「新增便利貼」按鈕，點擊直接在 nodes 陣列中 append 一個 `type: 'sticky'` 節點
  - **驗證**：雙模式切換順暢，便利貼在代碼模式下不受影響，筆記在模式切換後完全保留
- [x] 8.3 更新 `GraphToolbar.tsx`、`ConceptNode.tsx` 以相容新屬性與便利貼

## 9. 完整性驗證

- [x] 9.1 執行 TypeScript 編譯檢查：`npx tsc --noEmit`（零 errors，零 `any`）
- [x] 9.2 執行所有單元測試：`npm test`（含新舊測試）
- [x] 9.3 執行 Vite 生產建置：`npm run build`
- [x] 9.4 瀏覽器手動完整功能驗證（包含手機端唯讀、大圖表容量 warning、安全邊界）
- [x] 9.5 更新 `docs/DEVELOPMENT_LOG.md`
