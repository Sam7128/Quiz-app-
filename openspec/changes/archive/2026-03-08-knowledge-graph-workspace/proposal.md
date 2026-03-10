## Why

MindSpark 目前的學習閉環僅涵蓋「測驗與檢驗」，缺乏「知識整理與結構化理解」的能力。學生在反覆刷題後，仍難以建立知識間的關聯脈絡。引入視覺化知識圖工作區，能將產品從「被動測驗」延伸至「主動建構」，完成從練習到內化的完整學習循環。此功能以 Beta 實驗室模式推出，不影響現有刷題體驗。

## What Changes

- 新增「🧪 實驗室功能」Beta 開關系統，讓進階功能可被安全隔離測試
- 新增 `graph` 視圖（AppView），作為獨立知識圖工作區入口
- 新增節點式視覺化編輯器（基於 @xyflow/react），支援：
  - 手動新增/刪除/編輯節點（支援 3 層內容層級：標題、核心定義、補充）
  - 手動建立/刪除帶方向箭頭的連線
  - 節點樣式自訂（顏色、大小）
  - 拖曳排版與縮放
- 新增兩種閱讀模式（頁面層級狀態）：
  - 「全部展開」：一次顯示所有節點完整內容
  - 「逐步探索」：預設只顯示標題，點擊逐層展開
- 新增 Mermaid flowchart 受控子集匯入（將 Mermaid 語法轉為可編輯 Canvas JSON）
- 新增 Mermaid flowchart 受控子集匯出（將畫布內容導出為 Mermaid 語法）
- 新增獨立的圖表資料模型（GraphDocument / GraphNode / GraphEdge），localStorage 持久化
- 使用 React.lazy + Suspense 實現 feature-level code splitting，確保圖形套件僅在進入工作區時載入
- 桌面與手機導覽同步顯示入口（僅在 Beta 開啟時可見）
- 手機端支援唯讀模式（閱讀模式），不支援編輯

### v1 明確不做

- ❌ AI 自動生成知識圖初稿
- ❌ 題庫/錯題與知識圖聯動
- ❌ 跨裝置雲端同步（圖表僅 localStorage）
- ❌ 全 Mermaid 語法相容（僅 flowchart 受控子集）
- ❌ 手機端完整編輯功能

## Capabilities

### New Capabilities

- `knowledge-graph-data`: 知識圖資料模型與儲存層——定義 GraphDocument/GraphNode/GraphEdge 型別、localStorage CRUD 操作、autosave 機制、資料清除整合
- `knowledge-graph-editor`: 視覺化節點編輯器——基於 @xyflow/react 的畫布系統，工具列、節點/連線 CRUD、樣式自訂、拖曳排版
- `knowledge-graph-reading-modes`: 閱讀模式系統——全部展開與逐步探索兩種模式的切換邏輯、節點內容分層顯示（L1/L2/L3）
- `knowledge-graph-mermaid-bridge`: Mermaid 橋接器——flowchart 子集解析器（匯入）、Canvas-to-Mermaid 轉換器（匯出）、錯誤處理與提示
- `beta-feature-toggle`: Beta 實驗室功能開關系統——設定中的開關 UI、條件式導覽入口顯示、feature flag 持久化

### Modified Capabilities

- `app-navigation`: 新增 `'graph'` 至 AppView 聯合型別，AppHeader 和 MobileNav 的導覽項目陣列新增條件式入口
- `app-settings`: Settings 元件新增「🧪 實驗室功能」區塊，擴充 UserSettings 介面加入 betaFeatures
- `app-content-routing`: AppContent 的 view switch 新增 `'graph'` 分支，引入 React.lazy + Suspense + ErrorBoundary
- `system-nuke`: nukeAllBanks 函式的清除範圍新增 `mindspark_graphs` key

## Impact

### 程式碼影響
- `types.ts`: 新增 `AppView` 的 `'graph'` 值、新增 graph 相關型別定義
- `reducers/appReducer.ts`: 新增 graph 視圖切換 action
- `components/AppHeader.tsx`: 新增 Beta 條件式導覽項目
- `components/MobileNav.tsx`: 新增 Beta 條件式導覽項目
- `components/Settings.tsx`: 新增實驗室功能區塊
- `components/AppContent.tsx`: 新增 graph view 的 lazy-loaded 渲染分支
- `services/storage.ts`: 新增 `mindspark_graphs` localStorage key，Beta 開關併入現有 `mindspark_settings` key
- 新增 `components/KnowledgeGraph/` 目錄（所有圖表相關元件）
- 新增 `services/graphStorage.ts`（圖表 CRUD）
- 新增 `services/mermaidBridge.ts`（Mermaid 雙向轉換）
- 新增 `types/graphTypes.ts`（圖表型別定義）

### 依賴影響
- 新增 `@xyflow/react` 套件（節點編輯器核心引擎）
- 新增 `@dagrejs/dagre`（自動佈局演算法，用於 Mermaid 匯入後的節點排列）
- 所有新依賴透過 React.lazy 動態載入，不影響主 bundle 大小

### 系統影響
- localStorage 新增 1 個 key（`mindspark_graphs`），Beta 開關併入現有 `mindspark_settings` key（遵循 Design Decision 3）
- 系統清除（nuke）功能需整合新 key 的清除邏輯
- 不影響 Supabase schema 或任何雲端服務
