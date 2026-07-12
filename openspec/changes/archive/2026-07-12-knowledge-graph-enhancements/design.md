## Context

MindSpark 的 Knowledge Graph 模組目前提供基於 React Flow 的節點拖曳編輯、屬性面板（NodeEditPanel）、Mermaid 匯入匯出，以及 Dagre 樹狀自動排版。使用者希望將其升級為接近專業心智圖工具的體驗，核心需求為：
1. 左側代碼編輯器（Markdown 列表 → 即時生成圖表）
2. 右側富文本筆記面板（TipTap WYSIWYG）
3. 獨立便利貼功能
4. 筆記搜尋
5. 放射狀佈局

**現有架構約束**：
- localStorage 單一 key `mindspark_graphs` 儲存所有 GraphDocument
- Service Layer 模式：所有 I/O 透過 `services/graphStorage.ts`
- React Flow v12 + Dagre v2 已安裝
- Tailwind CSS v4 + Framer Motion 已安裝
- 嚴禁 `any` 型別

## Goals / Non-Goals

**Goals:**
- 實作雙模式切換（視覺化 / 代碼），保持介面清爽不擁擠。
- 提供 TipTap 富文本筆記面板，取代現有 NodeEditPanel 的 textarea。
- 實作放射狀佈局演算法，重現參考圖片的視覺效果。
- 實作 Markdown 列表 → 節點/邊 的即時解析器（500ms debounce，強制開啟，避免狀態分叉）。
- 實作層級自動配色（根據節點深度套用預設顏色組）。
- 實作便利貼功能與筆記搜尋（便利貼直接作為 `type: 'sticky'` 節點存在畫布中）。
- 實作 Document 級別的筆記儲存映射表，以防止改名或重新建構節點時筆記丟失。
- 完整的 schema migration，若失敗則 Fail-fast 阻斷並提示，向後相容舊資料。
- 所有新功能有對應的單元測試。

**Non-Goals:**
- 不實作多人即時協作 / Team / Present / Share 功能。
- 不實作雲端同步（知識圖目前僅 localStorage）。
- 不更改現有的 Mermaid 匯入匯出功能。
- 不修改 Quiz、Battle、Dashboard 等非知識圖模組。
- 不實作檔案匯出（PDF/PNG）功能。
- 不實作 YAML frontmatter 解析和多個主題切換（第一版僅使用 default 放射狀層級配色）。

## Decisions

### D1: TipTap 版本選擇
**決策**：使用 `@tiptap/react` v2 + `@tiptap/starter-kit` + `@tiptap/extension-placeholder`。
**原因**：TipTap v2 是最穩定的主流版本，starter-kit 包含粗體/斜體/標題/清單等基礎格式，無須安裝大量獨立 extension。

### D2: 富文本儲存格式與資料去耦 (Ponytail 核心決策)
**決策**：將筆記內容（HTML string）從個別節點的 data 中抽離，獨立以 `Record<string, string>` 字典（以節點標題 `title` 作為 key，HTML 為 value）形式儲存在 `GraphDocument.notes` 中。
**原因**：
1. **防丟失**：當使用者在代碼模式修改節點名稱或重構結構時，節點 UUID 會變，但 `GraphDocument.notes` 的內容依然保留。只要改回原標題，筆記立刻找回。
2. **極簡化同步**：代碼模式解析和反向序列化時，不需在 Markdown 文字中塞入 UUID（如 `<!-- id:xxx -->`），也不需在切換模式時拷貝資料。
3. **同名共享**：同名節點天然共享同一份概念筆記；使用者若想獨立筆記則應使用不同名稱。

### D3: 放射狀佈局演算法
**決策**：自定義 radial layout 函式，不依賴外部庫。
**原因**：Dagre 不支援放射狀佈局，而安裝 d3-hierarchy 或 elkjs 等重量級庫只為一個佈局模式不值得。自定義演算法約 80 行，邏輯簡單（BFS 層級分配 → 角度均分 → 座標計算）。
**演算法大綱**：
1. 從根節點開始 BFS，計算每個節點的層級（depth）
2. 每層按子節點數量均分 360° 角度
3. 半徑隨層級線性遞增（`radius = level * 200`）
4. 計算 `x = centerX + radius * cos(angle)`, `y = centerY + radius * sin(angle)`

### D4: Markdown 解析器設計 (Ponytail 簡化)
**決策**：自建輕量級 Markdown 列表解析器（`parseMarkdownToGraph`），不解析 YAML frontmatter。
**原因**：我們只需要解析 `- text` 和縮排層級。自建解析器約 50 行，無外部依賴，容易測試和維護。不支援 YAML frontmatter 可簡化解析器程式碼。
**解析規則**：
1. 每行以 `-` 或 `*` 開頭的為有效節點行
2. 縮排深度（以 2 空格或 Tab 為單位）決定父子關係
3. 第一個無縮排的行為根節點（中央節點）
4. 自動生成 `parent → child` 的 edge
5. 解析時自動忽略 `type: 'sticky'` 的便利貼行（代碼模式只管理結構節點）

### D5: 雙模式切換與 Auto-Update 策略 (PonyTail 防禦)
**決策**：取消 Auto-Update 開關，強制即時預覽（500ms debounce）。
**原因**：解析與佈局計算開銷極低（100個節點約 10ms），即時同步可完全消除「未套用代碼草稿」與「畫布狀態分叉」的 🔴 CRITICAL 風險，免除 `codeDraft` 欄位和手動更新 UI。
**切換行為**：
- 視覺 → 代碼：將當前 nodes/edges 反向序列化為 Markdown 列表文字，填入左側編輯器。
- 代碼 → 視覺：即時解析後的 nodes/edges 成為新狀態。

### D6: 便利貼實作方式 (Ponytail 核心簡化)
**決策**：便利貼直接作為 `type: 'sticky'` 的 React Flow 節點存在畫布 `nodes` 中，不建立獨立的 `stickyNotes` 儲存陣列。
**原因**：
1. 直接利用 React Flow 的位置拖曳與渲染系統，不需手動同步 coordinates。
2. 儲存時自然隨著 `nodes` 序列化持久化，不需在 storage 層寫便利貼的 CRUD 程式碼。
3. 切換到代碼模式時，代碼編輯器只反序列化 `type !== 'sticky'` 的節點，忽略便利貼；代碼模式渲染時，將便利貼節點與解析出的結構節點合併傳給 React Flow，互不干涉。

### D7: Vite 打包策略
**決策**：將 TipTap 相關套件加入 `vendor-ui-core` chunk。
**原因**：防止 React 與 ProseMirror context 不同步。

### D8: Schema Migration 與 Fail-fast 安全策略 (PonyTail 安全防禦)
**決策**：`SCHEMA_VERSION` 從 1 升級到 2。在 `getGraphs()` 中檢測版本並自動遷移。
**遷移邏輯**：
1. 若 `schemaVersion === 1`：為 document 新增 `notes: {}`，並將舊 nodes 中個別的 `notes` (若有) 或其他 definition/details 合併遷移到 `notes` 字典中；新增 `editMode: 'visual'`；將 `schemaVersion` 更新為 2。
2. **Fail-fast 阻斷**：如果遷移過程拋出 QuotaExceededError 或任何錯誤，**直接 throw Error**，由頂層 ErrorBoundary 攔截並阻斷應用載入，提示磁碟空間不足，**絕對不回傳空陣列 `[]`**，防止後續儲存覆蓋並清空使用者舊資料。

## Risks / Trade-offs

| 風險 | 嚴重度 | 緩解措施 |
|------|--------|----------|
| TipTap 套件增加 bundle size | 中 | 使用 React.lazy 動態載入 KnowledgeGraph 模組；將依賴加入專屬 chunk |
| localStorage 空間不足（大量 HTML 筆記） | 中 | 設定 `NOTES_MAX: 10000` 字元/節點；寫入失敗時 Fail-fast 阻斷，避免回傳空陣列 |
| 放射狀佈局在極端情況下節點重疊 | 低 | 當子節點超過 12 個時自動增大半徑；提供 fitView 按鈕讓使用者重新縮放 |
| 代碼→視覺切換時節點位置丟失 | 中 | 代碼模式始終自動放射狀排版；視覺模式拖曳的位置在不更改結構時保留 |
| 改名時筆記未歸檔 | 低 | 筆記儲存在 `notes` 字典中，改名後原筆記仍在字典中。將在搜尋中提供「未歸檔筆記」功能供使用者檢視與重聯 |
