## Why

現有的知識圖（Knowledge Graph）模組僅提供基礎的節點拖曳編輯和 Mermaid 匯入匯出。使用者需要一個更高效的工作流：能夠**透過純文字快速建構心智圖**（如參考圖片中的左側代碼編輯器），同時在**點擊節點時查看和編輯豐富的筆記**（如參考影片中的右側 Notes 面板）。這兩種模式的整合將大幅提升知識整理效率，從「一個一個手動新增節點」進化為「鍵盤流快速傾倒思緒 + 視覺化精修」的雙軌工作模式。

## What Changes

- **新增「代碼編輯模式」**：左側提供帶行號的 Markdown 列表編輯器，使用者透過 `-` 加縮排即時生成右側的心智圖。預設開啟 500ms 即時同步（不設手動更新開關，避免草稿遺失與狀態分叉）。
- **新增「富文本筆記面板」**：整合 TipTap WYSIWYG 編輯器取代現有的純文字 textarea，支援 H1/H2 標題、粗體、斜體、底線、刪除線、有序/無序清單等格式。每個節點獨立擁有一個筆記，筆記數據獨立儲存在圖表級別的對照表中。
- **新增「便利貼」節點**：使用者可在畫布上新增獨立的黃色便利貼。便利貼直接作為 `type: 'sticky'` 節點存在畫布中，代碼模式解析時會自動忽略。
- **新增「筆記搜尋」功能**：在筆記面板頂部提供搜尋欄位，可跨節點搜尋所有筆記內容，點擊搜尋結果自動跳轉到對應節點。
- **雙模式切換 UI**：提供一個切換按鈕，使用者可在「視覺化編輯模式」（畫布 + 筆記面板）與「代碼編輯模式」（左側編輯器 + 右側畫布預覽）之間自由切換。
- **放射狀自動排版**：在代碼模式下，心智圖使用自定義的放射狀（radial）佈局演算法，中央節點在正中心，其他節點向外延伸。
- **層級自動配色**：代碼模式自動根據縮排層級分配節點顏色。
- **擴充資料模型**：`GraphDocument` 新增 `notes` (Record<string, string>，以 node title 為 key，防範節點改名/重建丟失) 欄位；`GraphDocument` 新增 `editMode` 狀態欄位。
- **儲存安全防禦**：Schema v1→v2 升級失敗或 localStorage 寫入配額不足時，執行 Fail-fast 拋出錯誤並由 ErrorBoundary 阻斷載入，防範覆蓋使用者舊資料。

## Capabilities

### New Capabilities
- `knowledge-graph-code-editor`: 左側 Markdown 列表代碼編輯器，含行號、即時解析、放射狀佈局演算法、層級自動配色
- `knowledge-graph-notes-panel`: 右側富文本筆記面板（TipTap 整合）、筆記搜尋功能、未歸檔筆記管理
- `knowledge-graph-sticky-notes`: 獨立便利貼節點系統（作為畫布節點）
- `knowledge-graph-dual-mode`: 雙模式切換 UI 與佈局管理

### Modified Capabilities
- `knowledge-graph-data`: 資料模型擴充（新增 `notes` 字典、`editMode` 欄位）與 Fail-fast 儲存安全防禦
- `knowledge-graph-editor`: 節點點擊行為變更（從開啟 NodeEditPanel 改為開啟 GraphNotesPanel），畫布支持渲染便利貼節點，佈局支援放射狀排版

## Impact

- **受影響的檔案**：
  - `types/graphTypes.ts`: 新增欄位至 `GraphDocument`
  - `services/graphStorage.ts`: schema migration + 新欄位持久化 + Fail-fast 安全錯誤處理
  - `components/KnowledgeGraph/*`: 幾乎所有元件都會被重構或新增
  - `package.json`: 新增 TipTap 依賴
  - `vite.config.ts`: 將 TipTap 依賴打包進 manual chunks
- **受影響的測試**：
  - `src/__tests__/graphStorage.test.ts`: 需要更新以覆蓋新欄位和 schema migration
- **不受影響的系統**：Quiz flow、Battle system、Cloud sync、所有非 KnowledgeGraph 的元件
- **新增依賴**：`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-placeholder`
