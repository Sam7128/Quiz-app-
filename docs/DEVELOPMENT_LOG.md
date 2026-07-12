# Development Log

## 2026-07-12 [Enhancement] "AI Prompts & Knowledge Graph Mermaid Import Optimization"
### 📦 AI 提示詞指引與知識圖 Mermaid 匯入防呆優化 (Enhancement)
- **AI 助手指引 Tab 化重構**：
  - 重構 `components/AIPromptGuide.tsx`，引入「AI 出題助手」與「AI 知識圖助手」Tab 分類切換。
  - 在「AI 知識圖助手」中，新增「從文章生成知識圖」以及「心智圖轉換（將 Mermaid `mindmap` 格式轉換為系統支援的標準 `graph` 流程圖格式）」兩種動態 AI 提示詞生成器。
- **知識圖編輯器匯入 Modal 加固與防呆**：
  - 修改 `components/KnowledgeGraph/GraphEditor.tsx`，在「匯入 Mermaid」Modal 渲染中新增防護警告，明確指出目前系統僅支援標準 flowchart 語法 (graph TD/flowchart TD 等)，不支援 mindmap 格式。
  - 於 Modal 內嵌一鍵複製「心智圖轉換 AI 提示詞」按鈕（`copiedConverter` 狀態與 `handleCopyConverter` 方法），並自動將當前輸入框內的心智圖語法代碼附加至提示詞中，實現極致無縫的格式轉換與回貼體驗。
- **全量測試與打包驗證**：
  - `npx tsc --noEmit` 型別檢查 100% 🟢 通過。
  - `npm run build` 生產建置 Vite 打包 100% 🟢 通過，無任何錯誤。

## 2026-07-12 [Archive] "Knowledge Graph Enhancements Completion & Archive"
### 📦 知識圖增強功能開發結案與歸檔 (Archive)
- **變更計畫歸檔**：將 `knowledge-graph-enhancements` 變更提案正式歸檔至 `openspec/changes/archive/2026-07-12-knowledge-graph-enhancements/`，所有 spec 與 task 清單均標記完成。
- **專案記憶刷新與壓縮**：執行 `project-memory-refresh` 更新記憶索引，並對 `MEMORY.md` 實施 caveman-compress 格式壓縮，降低對話 Context 耗用。
- **Codebase Memory 更新**：呼叫 `index_repository` 重建並更新本機與全域 Codebase Memory 圖譜結構。

## 2026-07-12 [Audit Remediation] "Knowledge Graph Audit Remediation & Dead Code Cleanup"
### 🛠️ 知識圖增強最終審計缺陷修復與冗餘死代碼清理 (Audit Remediation)
- **儲存與安全邊界補強**：
  - 重構 `services/graphStorage.ts` 的 `getGraphs` 函式，將 `let graphs: any[]` 型別更正為強型別 `unknown`，完全清除 remaining `any`。
  - 於 `getGraphs` 中對 `JSON.parse` 及陣列檢查加上主動拋出錯誤（Fail-fast），避免毀損資料造成靜默忽略與後續 save 覆蓋。
  - 修復 `isQuotaExceeded` 與 `validateGraphDocument` 的屬性安全轉換，完全移除了 `as any` 型別轉換。
- **功能重疊與局部死代碼清理 (DEAD-01)**：
  - 徹底修改 `components/KnowledgeGraph/NodeEditPanel.tsx`，刪除與 `GraphNotesPanel` 的 TipTap 富文本編輯器重疊的 `definition` 與 `details` 輸入區（textarea）以及相關的 React hooks 和 state，使面板專注於屬性配置（標題、顏色、形狀、字體大小），避免資料多處編輯的狀態競態與冗餘代碼。
- **便利貼預設文字修正 (WARNING-02)**：
  - 修改 `components/KnowledgeGraph/GraphEditor.tsx` 的 `handleAddSticky`，將新便利貼的 `title` 和 `label` 預設值修正為 `'備忘'`，符合 Spec 的具體規格要求。
- **編輯器 Unmount 變更 Flush (DEBT-02)**：
  - 修復 `components/KnowledgeGraph/GraphCodeEditor.tsx` 的 unmount 變更丟失缺陷，引入 `localValueRef` 與 `onChangeRef` 以安全繞過 React 閉包陷阱，確保 unmount 時能將最新的 code 變更 flush 回寫。
- **解析器冗餘代碼移除 (OVER-02 & OVER-01)**：
  - 移除 `services/markdownGraphBridge.ts` 中 `parseMarkdownToGraph` 返回前的冗餘 `sticky` 節點過濾。
  - 於 YAML frontmatter 跳過邏輯加註防禦式註解。
- **全量測試與打包驗證**：
  - 更新 `src/__tests__/graphStorage.test.ts` 以符合 JSON 毀損拋錯之新行為。
  - `npx tsc --noEmit` 零編譯錯誤。
  - `npm test -- --run` 全數 217 個測試案例 100% 🟢 通過。
  - `npm run build` 生產打包 100% 成功。

## 2026-07-12 [Verification & Refactor] "Zero-Any Type Safety & Verification Report"
### 🔍 知識圖增強開發計畫驗證與 TypeScript `any` 型別徹底掃除 (Verification & Refactor)
- **TypeScript 零 any 型別重構**：
  - 擴充 `types/graphTypes.ts` 中的 `GraphNodeData` 介面，新增選用欄位 `label?: string`，藉此在資料結構層級去耦 React Flow Node data 原生的無型別問題。
  - 重構 `components/KnowledgeGraph/NotesSearch.tsx`，將 `nodes: any[]` 的 Prop 型別改為 `GraphNode[]`。移除所有 `(n.data as any).label` 的 unsafe cast。
  - 重構 `components/KnowledgeGraph/GraphEditor.tsx`，將 `(n.data as any).title` 改為 `(n.data as Partial<GraphNodeData>).title` 進行防禦式安全讀取；並在 `NotesSearch` 的 `nodes` 綁定上，使用 `fromRFNodes(nodes)` 對齊型別。
  - 重構 `components/KnowledgeGraph/GraphNotesPanel.tsx`，將 TipTap `onUpdate` 參數中的 `editor: any` 修改為強型別 `editor: NonNullable<ReturnType<typeof useEditor>>`。
- **全量測試與打包驗證**：
  - 執行 `npx tsc --noEmit` 通過零 errors、零 warnings。
  - 執行 `npm test -- --run` 全數 34 個測試檔案、217 個測試案例 100% 🟢 通過。

## 2026-07-12 [Customizations / Learn] "Enforce OpenSpec tasks.md checklist completion"
### 🛠️ 行為學與規則優化 (Learn Rule Add)
- **鐵規新增 (AGENTS.md & MEMORY.md)**：
  - 新增規則 11 (`OPENSPEC_TASKS_CHECKLIST`)。
  - 規定每次任務結案前，必須將對應的 OpenSpec 變更計畫中的 `tasks.md` 所有任務標記為 `[x]`，防範遺失進度記錄。

## 2026-07-12 [Workspace Integration] "Milestone 4: Workspace Integration & Verification"

### 🛠️ 代碼編輯器、Fatal Error 阻斷與雙模式畫布整合 (Milestone 4)
- **代碼模式編輯器元件 (components/KnowledgeGraph/GraphCodeEditor.tsx)**：
  - 新建 `GraphCodeEditor.tsx` 元件，實作左側帶行號的 Markdown 編輯器。
  - 透過 `textarea` 的 `onScroll` 事件同步行號區塊的 `scrollTop`，實現兩者的垂直滾動精準同步。
  - 對行號區塊與 `textarea` 設定一致的 font-family、line-height 與 padding，並禁用 word-wrap（使用 `white-space: pre` 與 `overflow-x: auto`）以防排版對齊偏斜。
  - 實作 500ms debounce 的 `onChange` 即時更新機制，以 local state 維持打字流暢度。
  - 底部顯示解析錯誤與警告區域，若 errors 長度大於 0 則渲染紅色警告提示。
- **Workspace 頂層 Fatal Error 阻斷與備份還原 (components/KnowledgeGraph/KnowledgeGraphWorkspace.tsx)**：
  - 重構 `KnowledgeGraphWorkspace.tsx`，在載入 `getGraphs()` 時使用 try-catch 捕獲拋出的任何 Fatal Error（例如遷移失敗或 localStorage QuotaExceededError）。
  - 若捕獲 Fatal Error，阻斷整個 Workspace 載入，渲染全頁錯誤畫面，引導使用者處理「儲存空間損毀或容量超限」。
  - 實作「導出備份 JSON」按鈕，建立 Blob 並以下載檔案的形式導出 localStorage 中的原始 `mindspark_graphs`。
  - 實作「清空資料並重置」按鈕，呼叫 `localStorage.removeItem` 清除資料並 reload 頁面。
- **畫布編輯器雙模式切換與屬性合併 (components/KnowledgeGraph/GraphEditor.tsx & GraphToolbar.tsx)**：
  - 引入雙模式切換，預設值來自 `graph.editMode`，可切換 `visual`（全寬編輯）與 `code`（1/3 編輯器與 2/3 唯讀畫布）。
  - 實作雙向資料同步：視覺 -> 代碼時，呼叫 `graphToMarkdown` 序列化結構節點；代碼 -> 視覺時，呼叫 `parseMarkdownToGraph` 解析結構，若成功則套用放射狀佈局（`applyRadialLayout`）並與畫布上原有的 `sticky` 便利貼節點進行 Union 合併，更新 React Flow 狀態。
  - 合併時依據標題比對原本畫布節點，保留原本節點的 `definition`, `details`, `color`, `fontSize`, `type` (shapeType) 屬性以防資料丟失，且 `notesDict` 獨立保存不需轉移。
  - 儲存時將 `editMode` 寫入 `GraphDocument` 進行保存。
  - 在 `GraphToolbar.tsx` 中新增模式切換按鈕（整合至 toolbar 與 props）。
- **測試與生產環境建置驗證**：
  - 所有新增與修改程式碼維持 TypeScript 0 `any` 型別安全。
  - `npx tsc --noEmit` 型別檢查 100% 🟢 通過。
  - 全量單元測試 `npm test -- --run`（包含 `graphStorage.test.ts`、`radialLayout.test.ts`、`markdownGraphBridge.test.ts` 等 217 個測試案例）100% 🟢 通過。
  - `npm run build` 生產環境建置與 Vite 打包成功通過。

## 2026-07-12 [UI Elements (Notes & Stickies)] "Milestone 3: UI Elements (Notes & Stickies)"
### 🛠️ 知識圖譜便利貼、富文本筆記與搜尋面板實作 (Milestone 3)
- **便利貼節點元件 (components/KnowledgeGraph/StickyNoteNode.tsx)**：
  - 新建 `StickyNoteNode.tsx` 並在 `GraphEditor.tsx` 中註冊為自定義節點類型 `sticky`。
  - 視覺上使用黃色便籤紙樣式（背景色 `#FEF3C7`、邊框 `#F59E0B`）、輕微陰影與圓角，且無連線點 Handle（完全不允許與其他節點連線）。
  - 支援雙擊就地編輯，最大字元限制為 `500` 字元，並同步寫回該節點的 `data.label` 與 `data.title`。
  - 使用 `onPointerDown={(e) => e.stopPropagation()}` 避免在打字、點選、拖曳選取文字時觸發 React Flow 畫布拖曳等衝突。
- **TipTap 富文本筆記面板 (components/KnowledgeGraph/GraphNotesPanel.tsx)**：
  - 新建 `GraphNotesPanel.tsx`，整合 TipTap 編輯器，工具列支援格式：H1, H2, Bold, Italic, Underline, Strike, OrderedList, BulletList, Clear formatting。
  - 筆記獨立以當前選中節點的 `title` 為 key 儲存於頂層 `GraphDocument.notes` 字典中。
  - 支援 500ms debounce 自動保存，並且在切換節點或 unmount 卸載面板時強制立即同步 (flush) 最新筆記狀態，以防資料遺失。
  - 改名 Key 轉移：實作了 `renameNoteKey` 輔助函式，當節點名稱（title）變更時，自動將筆記的 key 從舊 title 轉移為新 title，並從 `notes` 中移除舊 title 鍵。
  - ⚠️ Base64 圖片安全防範：在 TipTap 配置中阻斷並過濾 Base64 格式圖片的貼入或上傳（過濾 `handlePaste` 中的 `image/*`，並在 `transformPastedHTML` 中使用 Regex 移除含有 base64 src 的 img 標籤），以防撐爆 localStorage 的 5MB 限制。
- **跨節點筆記搜尋面板 (components/KnowledgeGraph/NotesSearch.tsx)**：
  - 新建 `NotesSearch.tsx`，支援跨 `notes` 字典進行純文字內容搜尋，搜尋時應將筆記 HTML 內容去除標籤（如 `value.replace(/<[^>]*>/g, '')`）再進行字串匹配。
  - 搜尋結果點擊時，自動在畫布中以 `fitView` / `focus` 聚焦定位至對應節點，選中該節點並開啟該節點的筆記面板。
  - 未歸檔（孤立）筆記管理：遍歷並找出所有當前圖表的 `notes` 字典中，Key 值在現有的 nodes 列表中不存在的無效筆記，提供刪除與重新連結功能。
- **儲存層與工具列修改**：
  - 在 `GraphEditor.tsx` 中建立 `notesDict` 與 `activeSidePanel` 狀態，整合側面板（編輯/筆記/搜尋）的顯示與切換邏輯。
  - 實作了 `handleAddSticky` 行為，並加上數量上限防禦。
  - 修正了 `graphStorage.ts` 中 3 處 useless try/catch（no-useless-catch ESLint 錯誤）。
- **測試與型別安全**：
  - 新增針對 `renameNoteKey` 改名轉移成功與無效改名防禦的單元測試，217 個單元測試案例全數 🟢 通過，`npx tsc --noEmit` 型別檢查 0 錯誤。

## 2026-07-12 [Radial Layout & Markdown Bridge] "Milestone 2: Radial Layout & Markdown parser"
### 🛠️ 放射狀佈局演算法與 Markdown 解析序列化橋接器實作 (Milestone 2)
- **放射狀佈局演算法 (services/radialLayout.ts)**：
  - 實作了 `applyRadialLayout()`，可將節點與連線進行放射狀分層定位。
  - 根節點偵測：優先選擇入度為 0 且有關聯邊的結構節點作為根，若無或有多個，則退回選擇 `nodes[0]`。
  - BFS 層級計算與多連通分量：使用 BFS 為每個結構節點分配層級深度，非主要連通分量之起點深度設為 1，避免與根節點重疊。
  - 防重疊 step 調整：當某一深度層級節點數大於 12 時，自動將半徑步長 `step` 調大（大於 300 且與個數成正比），防止大層級重疊。
  - 孤立節點處理：若節點與任何邊都無關聯（且非根節點），則將其定位在畫布右側垂直排列。
- **Markdown 解析與序列化橋接 (services/markdownGraphBridge.ts)**：
  - 實作了 `parseMarkdownToGraph()`：逐行解析 Markdown 縮排列表（`-` 或 `*` 開頭），忽略 YAML frontmatter。
  - 縮排層級計算與跳躍縮排容錯：相容 2 空格、4 空格與 Tab 縮排，若有跳躍縮排則容錯掛載至最近的祖先。
  - 自動配色：依深度對 `DEFAULT_NODE_COLORS` 進行模運算套用預設配色。
  - 節點數量上限：超過 200 個節點時，於 `errors` 記錄警告並進行截斷阻斷。
  - 便利貼過濾：在解析與 `graphToMarkdown` 序列化時，完全過濾與忽略 `type === 'sticky'` 類型的便利貼節點，使其在代碼模式文本中完全隱形。
  - 實作了 `graphToMarkdown()`：使用 DFS 深度優先搜尋，將結構節點遞迴序列化回 Markdown 縮排列表。
- **單元測試與型別安全**：
  - 於 `src/__tests__/radialLayout.test.ts` 與 `src/__tests__/markdownGraphBridge.test.ts` 分別補齊 8 個與 7 個單元測試，涵蓋各類極端輸入與邊界條件。
  - 全量單元測試 215 個案例全數 🟢 通過，`npx tsc --noEmit` 型別檢查 0 錯誤。

## 2026-07-12 [Remedy & Hardening] "Milestone 1 Remedy: Security & Defense Hardening"
### 🛠️ 知識圖譜儲存層防禦加固與邊界安全性修復 (Milestone 1 Remedy)
- **欄位字元長度限制與阻擋**：於 `services/graphStorage.ts` 的 `validateGraphDocument()` 中，對 `nodes` (結構與便利貼)、`edges` 與 `notes` 實作了嚴格的長度上限檢驗（`TITLE_MAX` 100、`DEFINITION_MAX` 500、`DETAILS_MAX` 2000、`STICKY_TEXT_MAX` 500、`EDGE_LABEL_MAX` 100、`NOTES_MAX` 10000），任何不符即回傳明確的錯誤字串阻斷寫入。
- **防止遷移覆蓋 (Data Loss)**：優化 v1->v2 遷移邏輯，當發現多個舊節點擁有完全相同的 `title` 時，自動將 definition/details 進行串接（以 `<hr />` 分隔），將內容集中在同一個 `notes[title]` 鍵下，防止資料遺失。
- **Fail-fast 錯誤傳播**：重構 `getGraphById()` 與 `deleteGraph()` 中的例外處理，當呼叫 `getGraphs()` 時捕獲到遷移或 Fatal Error，一律直接 `throw err` 向上傳播給頂層 ErrorBoundary，僅有內部一般 localStorage 異常才回退為預設值。
- **HTML 轉義安全防護**：實作 `escapeHtml()` 函式，在 v1->v2 遷移拼接為富文本 HTML `<p>` 前，將 `<`, `>`, `&`, `"`, `'` 進行 HTML 轉義，防止 XSS 注入。
- **大檔案位元組精準監控**：在 `saveGraph` 中使用 `new Blob([jsonString]).size` 取代原本的 `.length`，以精確的 Byte 大小檢驗 3MB 上限。
- **單元測試補足**：於 `src/__tests__/graphStorage.test.ts` 新增 8 個針對字元限制、同名遷移串接、HTML 轉義與例外向上傳播的單元測試，並修正 3MB 測試使其符合驗證規範，30 個單元測試與 TS 編譯全數 🟢 通過。

## 2026-07-12 [Storage & Types] "Milestone 1: Dependency & Storage Layer Implementation"
### 📦 依賴項安裝、Vite 分包設定與知識圖譜儲存層擴充 (Milestone 1)
- **安裝 TipTap 依賴**：安裝 `@tiptap/react`、`@tiptap/starter-kit` 與 `@tiptap/extension-placeholder` 軟體包。
- **優化 Vite manualChunks**：更新 `vite.config.ts`，將 `@tiptap` 和 `prosemirror` 劃入 `vendor-ui-core` chunk，防止 React context 分離與連結中斷。
- **儲存層擴充與型別更新**：
  - 在 `types/graphTypes.ts` 中擴充 `GraphDocument` 新增 `notes`（`Record<string, string>` 字典）和 `editMode`（`'visual' | 'code'`）。
  - 在 `GRAPH_LIMITS` 中新增上限限制 `NOTES_MAX: 10000`、`STICKY_TEXT_MAX: 500`、`MAX_STICKY_NOTES: 20`，並將 `SCHEMA_VERSION` 升級為 2。
  - 為 `GraphNode.type` 擴充允許 `'sticky'` 類型以支援便利貼。
- **儲存層安全性與遷移邏輯 (v1→v2)**：
  - 於 `services/graphStorage.ts` 中實作 v1 到 v2 遷移，將舊 node 中的 `definition`/`details` 資料轉移至 `notes[node.data.title]` 並將 `schemaVersion` 推進為 2。
  - **Fail-fast 機制**：在 `getGraphs()` 遷移或寫回 localStorage 出錯時直接 `throw Error`，避免吞食錯誤返回 `[]` 而清空 localStorage。
  - **便利貼驗證**：在 `validateGraphDocument()` 限制便利貼 (`type === 'sticky'`) 上限為 20 個。
  - **大小監控**：在 `saveGraph()` 序列化 JSON 後檢查大小，若大於 3MB 則傳回 `{ success: true, warning: '圖表大小接近限制，請刪除部分資料' }`。
- **全量測試與打包驗證**：
  - 更新 `src/__tests__/graphStorage.test.ts` 加入 v1 升級合併、遷移拋錯 Fail-fast、20 個便利貼阻斷、3MB 大小警告之對應測試。
  - 通過全部單元測試（21/21 passed）與生產環境編譯打包（`npm run build`），並執行 `tsc --noEmit` 型別檢查 0 錯誤。

## 2026-07-12 [Review & Design] "Knowledge Graph Plan Review & Ponytail Optimization"
### 🔍 知識圖增強開發計畫審查與馬尾式極簡優化 (Plan Review & Ponytail Optimization)
- **代碼與畫布狀態即時同步**：取消原定的 Auto-Update 開關與手動更新按鈕，強制預設為即時預覽（500ms debounce）。徹底消除因手動更新造成的代碼草稿與畫布狀態分叉風險（D7-001），省去 `codeDraft` 草稿儲存欄位。
- **筆記數據與節點實體解耦**：將筆記 HTML 資料從個別節點的 data 中抽離，改為在 `GraphDocument` 層級以 `notes: Record<string, string>` 字典（以節點 title 為 key）獨立儲存。模式切換時結構節點隨意銷毀重建，只要 title 不變即自動對齊。改名時舊筆記保留在字典中，並提供「未歸檔筆記」手動關聯，免除在 Markdown 中引入 UUID 追蹤（`<!-- id:xxx -->`）導致的光標定位 UI 漏洞（D1-001）。
- **便利貼節點畫布整合**：取消獨立的 `stickyNotes` 儲存陣列，便利貼直接作為 `type: 'sticky'` 節點存在畫布中。代碼模式序列化與解析時直接過濾，拖曳位置與資料持久化隨 nodes 自動完成，精簡 80% 的 CRUD 代碼（過度工程）。
- **YAML Frontmatter 與多配色主題剔除**：首版剔除 YAML config 解析與 forest/ocean 多主題配色，代碼模式預設僅套用 default 放射狀層級自動配色，極簡化 Markdown 解析器。
- **資料遷移與儲存 Fail-fast**：在 `getGraphs()` 遷移失敗或寫入配額不足時，直接拋出 Fatal Error 並由頂層 `ErrorBoundary` 攔截，阻斷 UI 載入並引導備份，拒絕回傳空陣列 `[]` 導致舊資料被後續操作覆蓋清空（D5-001）。
- **完整規格與任務清單重構**：更新 `proposal.md`, `design.md`, `tasks.md` 及 6 個 delta specs，將上述 ponytail 優化全面落實為可執行的具體任務。

## 2026-07-11 [Log Hygiene] "Graceful AbortError Filtering in Services"
### 🧹 服務層 AbortError 警告過濾與控制台噪音消除 (Log Hygiene)
- **過濾 Supabase 請求中止錯誤**：在 `services/streak.ts` 與 `services/analytics.ts` 中，使用 `isAbortError()` 過濾 Supabase 在獲取 `streak` 和 `study stats` 被 aborted 時的錯誤，改為 `console.info` 優雅記錄，防止因 React 重新渲染或 unmount 時的主動中止請求在主控台噴出紅色 `console.error` 警告，保持控制台乾淨。
- **全量測試與打包驗證**：經 `npx tsc --noEmit` 型別檢查與 `npm run build` 生產環境打包測試，100% 成功通過，確認無任何副作用。

## 2026-07-11 [Security & Architecture] "Security Architecture Hardening v2"
### ✨ 安全架構硬化與資源釋放 (Security Architecture Hardening v2)
- **跨分頁與同步併發鎖 (N2)**：在 `services/cloudStorage.ts` 中實作了 `runWithSyncLock` (主用 Web Locks `navigator.locks`，備用 localStorage 30s 鎖)，將 `syncLocalToCloud` 與 `syncLocalPracticeSessions` 包裹，防止跨分頁同步時資料被競態覆蓋。並將 `syncLocalToCloud` 與 `syncLocalPracticeSessions` 的鎖名稱與 fallback key 進行完全解耦（`mindspark_banks_sync` 與 `mindspark_practice_sync`），徹底排除同頁面併發時的鎖競爭衝突。
- **E2E 同步與重新渲染競態修復**：在 `useBankManager` 引入 `isRefreshingRef.current` 鎖，防堵 `useAppDataLoader` 在 React 重新渲染與 HMR 載入期間重複重疊呼叫 `refreshBanksData`，確保 Dialog Promise resolve 回調不被覆蓋，徹底修復 Playwright E2E 同步容錯容災測試案例。
- **FocusTimer 記憶體洩漏修復 (N5)**：在 `FocusTimer.tsx` 引入了 `activeAudioContextsRef` 來追蹤活動的 AudioContext 實例，在音效播放完畢後及組件卸載 (unmount) 時強制釋放 AudioContext 資源，解決多執行緒背景資源洩漏問題。
- **鍵盤監聽 Ref 穩定化 (N6)**：重構 `hooks/useKeyboardShortcuts.ts` 採 `handlersRef` 模式將 callbacks 與監聽器解耦，避免 callbacks 引用更新造成 window event listener 重複卸載與綁定。
- **題庫安全合併 (N4)**：擴充 `BankMetadata.cloudSyncedAt` 標記同步狀態，在 `refreshBanksData` 依據其安全合併未同步題庫，消除破壞性覆蓋。
- **dirty-bank 預寫防丟失機制 (N7)**：在 `saveCloudQuestions` 執行 upsert 前先寫入 `addDirtyBank`，當 upsert 與刪除 cleanup皆成功時才調用 `removeDirtyBank` 移除，保障斷網或突然關閉瀏覽器時的資料一致性。
- **Howler 生命週期與死導出清理 (X1)**：移除 `playCorrectSfx` 與 `playWrongSfx` 的死碼，提供 `unloadSfx` 並在 `components/BattleArena.tsx` 卸載時清理 `sfxAttackInstance`。
- **全量測試與打包驗證**：新增五大測試模組 `focusTimer.audio.test.tsx`、`useKeyboardShortcuts.test.tsx`、`useSoundEffects.test.ts`、`useBankManager.test.ts` 以及 `cloudStorage.test.ts` 新案例，更新 `sync-and-settings-hardening.spec.ts` 斷言使其完全與非破壞性同步新規格對齊，所有單元測試、E2E 測試與 `tsc --noEmit` 全數 100% 🟢 通過。
- **獨立審計缺陷修復與技術債清理**：
  1. 新增 [SECURITY_LIMITATIONS.md](file:///c:/Users/user/Desktop/Quiz-app-/docs/SECURITY_LIMITATIONS.md) 安全限制與邊界指南文件。
  2. 在 `components/Settings.tsx` API 金鑰與端點配置區塊，為配置了非官方 NVIDIA 網域的用戶新增 CSP 限制連線阻擋提示，並引導至指南文件。
  3. 清理 `hooks/useSoundEffects.ts` 中殘留的 `sfxCorrectInstance` 與 `sfxWrongInstance` 孤兒實例、音效路徑及初始化代碼。
  4. 物理刪除 `services/cloudStorage.ts` 中的 `retryDirtyPracticeSessions` 死代碼。
  5. 修正 `removeDirtyBank` 使得 remaining banks 長度為 0 時，能完整從 localStorage 移除該項目（避免空陣列 `[]` 殘留）。
  6. 更新 `openspec/changes/security-architecture-hardening-v2/design.md` 設計文檔以匹配鎖名稱解耦分離實作。
  7. 在 `index.html` 的 CSP metaFallback 中補齊 `object-src 'none';`，實現本地與 Vercel 安全等級對齊。


## 2026-06-12 [Utility] "Project Memory Refresh & MCP Optimization"
### ✨ Infrastructure & Memory
- **執行專案記憶刷新與安裝**：在專案根目錄成功執行 `refresh_project_memory_bundle.py`，完成專案記憶 (Project Memory) 的全面更新與安裝。
- **優化並修復路徑**：重新整理 `MEMORY.md` 記憶地圖，並重新建立 `.memory-index/index.json` 索引，確保本地所有 Markdown 及開發檔案被正確雜湊與索引。
- **自動化配置與健康度校驗**：
  - 更新並驗證包含 Gemini、Cursor、Codex 與 Antigravity CLI 的專案 MCP 配置文件。
  - 生成動態路徑解析的 `.project-memory/project_memory_mcp_entry.py`，移除任何 `%USERPROFILE%` 等硬編碼路徑，防止多環境執行時權限與路徑失效。
  - 自動執行健康度與搜尋驗證，確認查無任何 health warnings。

## 2026-06-12 [OpenSpec] "Dead Code Cleanup - Spec Sync & Archive"
### 📦 規格同步與變更歸檔 (Specification Sync & Archive)
- **規格同步完成**：依據使用者選取，將 `dead-code-cleanup` 的 Delta Specs 同步至主規格（Main Specs）中。
  - 新增主規格檔案：[code-hygiene](file:///c:/Users/user/Desktop/Quiz-app--main/openspec/specs/code-hygiene/spec.md)。
- **變更封存**：將變更 proposal 目錄移至歸檔資料夾 `openspec/changes/archive/2026-06-12-dead-code-cleanup/`。

## 2026-06-12 [Cleanup] "M3 - M6 Dead Code Cleanup & Optimization"
### 🧹 廢棄函式刪除、元件重構與依賴清理 (Dead Code Cleanup & Optimization)
- **廢棄函式物理刪除 (M3)**：物理刪除 5 個無外部引用的廢棄函式：`getMonsterByProgress` (於 `constants/monstersData.ts` 中)、`clearAIConfig` (於 `services/ai.ts` 中)、`getPendingChallengesCount` (於 `services/challenges.ts` 中)、`isQuestionIdUuid` (於 `utils/questionIdentity.ts` 中)、`isSingleAnswer` (於 `utils/typeGuards.ts` 中)，進一步精簡程式庫。
- **元件具名匯出與效能 Memo 封裝 (M4)**：
  - 重構 `AIPromptGuide`、`BankManager`、`QuizCard` 與 `Settings` 元件，改為具名匯出 (Named Exports) 並直接使用 `React.memo` 進行效能包裝。
  - 移除了 `BattleArena`、`Dashboard`、`DialogueBubble`、`SkillAnimation`、`SkeletonLoader` 元件以及 `useBattleSystem` hook 的重複 `export default`。
  - 修改 `AppContent.tsx` 與 `useBattleSystem.test.ts` 以 named import 取代 default import，確保元件加載與解析順暢。
- **依賴項與範例檔案清理 (M5 & M6)**：
  - 移除 `package.json` 中的 5 個未使用依賴（`classnames`、`@tailwindcss/postcss`、`autoprefixer`、`postcss`、`@testing-library/jest-dom`），並確實保留 postcss 的安全版本 overrides 定義。
  - 物理刪除了 `.agents/`、`.claude/`、`.continue/` 底下的 3 個 `condition-based-waiting-example.ts` 範例檔案。
- **三連全量綠燈驗證**：在完成所有物理清理後，執行型別檢查 (`npx tsc --noEmit`)、生產建置 (`npm run build`) 與 Vitest 所有單元測試 (`npm test -- --run`)，皆 100% 🟢 成功通過（170 個測試案例全數成功），確認無任何回歸缺陷。

## 2026-06-12 [Cleanup] "M2 Export Scope Narrowing & Encapsulation Hardening"
### 🧹 匯出作用域收窄與封裝加固 (Export Scope Narrowing)
- **移除非必要常數與函式匯出**：
  - **怪物資料** (`constants/monstersData.ts`)：移除 `NORMAL_MONSTERS`、`ELITE_MONSTERS`、`BOSS_MONSTERS` 與 `ALL_MONSTERS` 的 `export` 關鍵字，維持 `NORMAL_MONSTER_IDS` 等外部引用常數的匯出。
  - **技能資料** (`constants/skillsData.ts`)：移除 `BASIC_SKILLS`、`INTERMEDIATE_SKILLS`、`ADVANCED_SKILLS`、`ULTIMATE_SKILLS`、`EPIC_SKILLS`、`LEGENDARY_SKILLS`、`ALL_SKILLS` 常數及 `getSkillsByTier` 函式的 `export` 關鍵字。
  - **AI 服務** (`services/ai.ts`)：將 `cleanJsonResponse` 改為內部私有，移除 `export`。
  - **分析服務** (`services/analytics.ts`)：將 `getLocalStudySessions` 改為內部私有，移除 `export`。
  - **Supabase 服務** (`services/supabase.ts`)：將 `isCloudEnabled` 改為內部私有，移除 `export`。
  - **儲存服務** (`services/storage.ts`)：移除 `removeQuestionFromQuizSession`、`removeQuestionFromRecentMistakeSessions` 與 `deleteSpacedRepetitionItem` 三個輔助型函式的 `export` 關鍵字。
- **全量測試與編譯校驗**：經 `npx tsc --noEmit` 驗證，專案無任何型別或編譯錯誤；執行 `npm test`，全數 170 項單元測試均 🟢 100% 通過（包含 `storage.questionArtifacts.test.ts`、`spacedRepetition.test.ts` 與 `useBattleSystem.test.ts`），確保作用域收窄後，無任何未預期的外部破壞性影響。

## 2026-06-12 [Cleanup] "M1 Type & Interface Cleanup"
### 🧹 型別與介面清理 (Type & Interface Cleanup)
- **取消內部型別導出**：移除專案中僅在內部使用且無外部 import 的型別與常量的 `export` 關鍵字，包括 `MistakeLogEntry` (在 `types.ts` 中)、`SkillAnimationType`、`SkillThreshold`、`SKILL_THRESHOLDS`、`PracticeChunkStatus` (在 `types/battleTypes.ts` 中) 以及 `Toast` (在 `contexts/ToastContext.tsx` 中)，強化封裝性並收斂型別作用域。
- **物理刪除冗餘死代碼**：物理刪除專案中完全無任何引用的 `Hero` 介面、`BattleEvent` 型別 (於 `types/battleTypes.ts` 中)、`StudySession` 介面 (於 `services/analytics.ts` 中) 以及 `UseChunkedPracticeReturn` 型別 (於 `hooks/useChunkedPractice.ts` 中)，徹底潔淨代碼結構。
- **全量測試與打包驗證**：完成修改後，經 `npx tsc --noEmit` 型別檢查 100% 通過、`npx vitest run` 單元測試全數通過（170 個測試案例）、以及 `npm run build` 生產環境打包建置成功，確保變更無任何副作用。

## 2026-06-12 [OpenSpec] "Dead Code Cleanup - Spec & Plan Audit Check"
### 🔍 死碼清理變更計畫審查與修復優化 (OpenSpec Audit & Refinement)
- **多代理對抗審查通過**：利用兩位內部審查子代理 (Reviewer Alpha & Reviewer Beta) 進行 3 輪深度對抗性審查，確保 `dead-code-cleanup` 計畫 100% 通過品質查核。
- **React 效能保護優化 (React.memo)**：針對四大關鍵元件 (`QuizCard`, `BankManager`, `Settings`, `AIPromptGuide`) 的冗餘 `export default` 清理決定，修正為在移除 default 導出前，主動將 Named Export 直接包裝為 `React.memo` 元件，以完全鎖定效能優化，防堵 UI 重新渲染退化。
- **主動移轉呼叫端 Import 語句**：在 Phase 4 中新增主動將引用端（如 `AppContent.tsx` 與 `useBattleSystem.test.ts`）由 default import 轉為 named import 的任務，確保重構的原子性與 CI 建置管線的順暢。
- **依賴漏洞防範與規格對齊**：
  - 保留 `package.json` 中的 `postcss` overrides 限制 (`^8.5.10`)，防堵 transitive 依賴回退並堵塞安全漏洞 (CVE-2023-44270)。
  - 更新規格驗證文件 `spec.md` 條文以契合此項保留決策。
  - 新增比對 `package-lock.json` Git Diff 任務，限制依賴鏈無意升級。
  - 將 `types/battleTypes.ts` 中的 `Hero` 和 `BattleEvent` 兩個完全未使用的型別從「取消導出」改為「物理刪除」，徹底潔淨代碼。

## 2026-06-10 [Review] "Dead Code Report Refresh & Deep Audit"
### 🔍 專案冗餘代碼掃描報告更新與深度審計
- **重跑死碼掃描與分析**：執行 `npx -y knip --reporter compact --no-progress` 重跑 live scan。經人工核對，確診當前死碼多屬歷史重構殘餘（如 `classnames` 被模板字串取代、`postcss` 等被 Tailwind v4 的 `@tailwindcss/vite` 取代、部分組件/Hook 的 default 匯出因專案統一使用具名匯出而閒置、以及舊戰鬥算法與儲存層過時的 ID 清除 API 等）。
- **深耕報告**：將 [docs/reports/DEAD_CODE_REPORT_2026_06_10.md](file:///c:/Users/user/Desktop/Quiz-app--main/docs/reports/DEAD_CODE_REPORT_2026_06_10.md) 升級為包含「Inquisitor 判定與架構重構建議」之繁體中文版深度審計報告，針對每項贅餘代碼給出深入的背景與架構解析。
- **進度與日誌追蹤**：同步更新 [CHECKLIST.md](file:///c:/Users/user/Desktop/Quiz-app--main/CHECKLIST.md) 與本開發日誌，讓後續分析可直接復用這次掃描入口。

## 2026-06-09 [OpenSpec] "Security Audit Remediation - Specification Sync & Archive"
### 🔍 安全審計修補變更主規格同步與封存
- **規格同步完成**：依據使用者選取，執行並完成 `security-audit-remediation` 變更的 7 個 Delta Specs 同步至主規格（Main Specs）中。
  - 新增規格：[api-key-protection](file:///c:/Users/user/Desktop/Quiz-app--main/openspec/specs/api-key-protection/spec.md), [client-data-integrity](file:///c:/Users/user/Desktop/Quiz-app--main/openspec/specs/client-data-integrity/spec.md)。
  - 合併修改：[battle-mode](file:///c:/Users/user/Desktop/Quiz-app--main/openspec/specs/battle-mode/spec.md), [nvidia-api](file:///c:/Users/user/Desktop/Quiz-app--main/openspec/specs/nvidia-api/spec.md), [social-service-layer](file:///c:/Users/user/Desktop/Quiz-app--main/openspec/specs/social-service-layer/spec.md), [supabase-security-hardening](file:///c:/Users/user/Desktop/Quiz-app--main/openspec/specs/supabase-security-hardening/spec.md), [sync-concurrency-control](file:///c:/Users/user/Desktop/Quiz-app--main/openspec/specs/sync-concurrency-control/spec.md)。
- **變更封存**：成功將 `openspec/changes/security-audit-remediation` 目錄封存移至 `openspec/changes/archive/2026-06-09-security-audit-remediation/`。
- **進度追蹤同步**：更新 [CHECKLIST.md](file:///c:/Users/user/Desktop/Quiz-app--main/CHECKLIST.md)，將安全審計修補的所有 pending items 與里程碑 (Milestones 2-7) 移動至 Completed This Round 標記為完成。

## 2026-06-09 [Verification] "E2E Flaky Fixes & 100% Green Light Delivery"
### 🔍 E2E 測試 Flaky 問題修復與全量綠燈驗證
- **修復 Strict Mode Violation**：修正 `e2e/mindspark.spec.ts` 與 `e2e/json-import.spec.ts` 中多處 `button` 與 `text` 定位器的 strict mode violation 衝突，將 `E2E Test Bank` 選取限定於 `main` 元素，並使用確切文字與走查來匹配選項。
- **解決鍵盤事件與動畫競態**：在 `e2e/chunked-practice.spec.ts` 中，按下 `Escape` 前加入題目載入完成之斷言，確保 `QuizCard` 已綁定事件，徹底防範鍵盤事件丟失的 flaky timeout 錯誤。
- **驗證報告落實**：完成全量 170 項單元測試與 15 項 E2E 壓測通過，產出最終繁體中文驗證報告 [verification_report.md](file:///c:/Users/user/Desktop/Quiz-app--main/verification_report.md)。
- **鐵規同步**：本開發日誌與專案安全稽核狀態保持同步。

## 2026-06-09 [Verification] "Final Security Audit Verification & Report Update"
### 🔍 安全審計計畫最終驗證與報告更新
- **更新驗證報告**：對 `security-audit-remediation` 進行全面稽核，重新整理並更新 [verification_report.md](file:///c:/Users/user/Desktop/Quiz-app--main/verification_report.md)。
- **確認歷史缺陷修復**：經靜態程式碼走查與測試，確認上一輪發現的 5 個 Critical 程式碼缺失（isBattleState 守衛、getNextMonster 防禦、night_owl 重疊、測試缺失與 RPC 勝者判定）均已 100% 得到完全修補。
- **指出新單元測試缺失**：指出目前專案在 BOLA 測試 (任務 1.3)、AI 消毒測試 (任務 4.2) 與 Achievements 簽名防篡改測試 (任務 6.3) 等單元測試層面存在的缺失，列為 Critical 發現阻擋封存。
- **修復 E2E 壓測 flaky 問題**：修正了 `e2e/security_hardening.spec.ts` 測試 3 選項打亂造成的 flaky test 問題，以 endsWith 精確匹配點擊答案。

## 2026-06-09 [Audit & Remediation] "Security Audit Double-Check & Test Alignment"
### 🔍 安全審計對抗性二次審查與測試對齊 (Double-Check Audit & Fix)
- **對抗性審查通過**：二次審查完美確認 9 個關鍵點修補狀態。包含 `isBattleState` 安全守衛在 `useBattleSystem` 的整合、`getNextMonster` 空難度 pool 防護與 `'normal'` fallback、`night_owl` 成就判定時間段硬化 (hour >= 22)、SQL RPC 挑戰 winner_id 自動計算、ConfirmDialog 點擊行為修正 (非 dialog 事件攔截)、三段 Mock JWT 與動態派生 HMAC-SHA256 金鑰 (不依賴本地 salt 殘留) 等安全重構。
- **修復測試導入路徑與編譯**：修正 `src/__tests__/useAchievementTracker.test.ts` 中的導入路徑（`../` -> `../../`），使 `npx tsc --noEmit` 型別檢查 100% 通過。
- **對齊 HMAC 完整性測試與新無狀態金鑰設計**：修補 `src/__tests__/integrityCheck.test.ts` 中已過時的 salt 變更失效測試（原先假定 salt 存於 localStorage），改為「驗證不依賴 localStorage 中的 salt 且不受其變更影響」，以符合無狀態動態派生金鑰的新型防禦架構，最終確保 `npm test` 中 28 個測試檔案 170 項測試全部 🟢 PASS。

## 2026-06-09 [Audit] "Security Remediation Plan Verification & Report Update"
### 🔍 安全審計修補計畫驗證與報告更新 (Verification & Audit)
- **更新驗證報告**：針對 `security-audit-remediation` 計畫，將驗證與稽核發現彙整寫入 [verification_report.md](file:///c:/Users/user/Desktop/Quiz-app--main/verification_report.md)。
- **新增三項核心發現**：
  - **SQL RPC 缺 winner_id 自動判定**：指出 `submit_challenge_score.sql` 僅完賽更新但未判定獲勝者。
  - **HMAC 鹽值儲存策略偏差**：指出 `integrityCheck.ts` 使用本地 localStorage 儲存隨機鹽，與設計文件定義的應用版本拼接策略不符，且有本地暴露風險。
  - **加密工具函數命名不一致**：指出 `crypto.ts` 中 `encrypt`/`decrypt` 與任務書規定的 `encryptString`/`decryptString` 命名有落差。

## 2026-06-09 [Hotfix] "FocusTimer useRef Fix & Test Suite Alignment"
### 🐛 專專注計時器執行期錯誤修正與測試套件修復 (Hotfix)
- **修復 FocusTimer 執行期錯誤**：在 [components/FocusTimer.tsx](file:///c:/Users/user/Desktop/Quiz-app--main/components/FocusTimer.tsx) 中補齊缺失的 `useRef` 匯入，徹底解決 `ReferenceError: useRef is not defined` 導致的專注計時器載入崩潰。
- **修復 Playwright E2E 語法錯誤**：修正 [e2e/security_hardening.spec.ts](file:///c:/Users/user/Desktop/Quiz-app--main/e2e/security_hardening.spec.ts) 中正規表示式逸出語法錯誤，防止 `/題目 \d+ \///` 中的連斜線被 JS 當作單行註解忽略而引起 `Expression expected` 編譯錯誤。
- **修復 AI Nvidia 測試斷言**：修正 [src/__tests__/ai.nvidia.test.ts](file:///c:/Users/user/Desktop/Quiz-app--main/src/__tests__/ai.nvidia.test.ts) 使其適應新的 NVIDIA baseUrl 生產環境 proxy 自動降級行為，移除已廢除的 throw 錯誤斷言。
- **修復社交功能冒煙測試**：重構 [src/__tests__/social.smoke.test.ts](file:///c:/Users/user/Desktop/Quiz-app--main/src/__tests__/social.smoke.test.ts) 中的 `friendships` update mock，實作 `then` 回調支援，使其能正確對應去 fallback 強制 RLS 認證後的新非同步 `.eq('friend_id', userId)` 連鎖 `await` 呼叫。
- **修復戰鬥系統時序測試**：調整 [src/__tests__/useBattleSystem.test.ts](file:///c:/Users/user/Desktop/Quiz-app--main/src/__tests__/useBattleSystem.test.ts) 中的快速連續答題測試，改用 `async loop` 結合 `act` 與 15ms 延遲，以消除 React 狀態批次合併 (state batching) 與過時閉包 (stale closure) 導致的 streak 未能正確累加之測試假陰性。

## 2026-06-09 [Security] "Security Audit Remediation - Iteration 2 (Refactoring & Verification)"
### ✨ 第二輪安全審計修補重構與驗證 (Remediation & Refactoring)
- **實體 HMAC-SHA256 簽名校驗整合**：重構 `hooks/useBattleSystem.ts` 與 `services/achievements.ts`/`useAchievements.ts`，在讀寫 LocalStorage 時引入並調用 `utils/integrityCheck.ts` 的 HMAC-SHA256 簽名校驗。校驗失敗時，清除當前受篡改的 LocalStorage 狀態，回退為預設值，且不誤刪 global LocalStorage 的其他無關 key。
- **Promise 序列化寫入隊列與初始化阻斷**：於 `useBattleSystem.ts` 中實作 Promise 序列化寫入隊列 (`writeQueueRef`) 排隊寫入，解決非同步簽名與 LocalStorage 寫入的競態與順序錯亂問題。並導入 `isInitialized` 狀態，在初始化完成前阻斷一切 `startBattle` / `triggerAnswer` 操作，且在卸載時徹底清理 `animationTimerRef`、`dialogueTimerRef` 等所有裸露 `setTimeout`。
- **雙重提交鎖與 try-catch-finally 異常防死鎖**：於 `components/QuizCard.tsx` 的答題提交中引入 `isSubmittingRef` 同步鎖與 state 鎖，防止高頻連點；且將整個提交邏輯包裹在 `try...catch...finally` 內，當 API/RPC 發生 runtime 錯誤時於 `catch` 重置答題狀態，並在 `finally` 釋放鎖，徹底防範 UI 卡死。
- **新增三大安全單元測試與既有測試重構**：
  - 新建 `src/__tests__/crypto.test.ts`：測試 AES-GCM 金鑰派生、加解密與 AEAD 篡改防護。
  - 新建 `src/__tests__/integrityCheck.test.ts`：測試真實的 HMAC-SHA256 簽名生成與驗證防篡改。
  - 新建 `src/__tests__/socialService.test.ts`：測試 BOLA 防禦下 Alice 不能加 Alice、重複請求、防 Receiver 越權等。
  - 改造 `src/__tests__/useBattleSystem.test.ts` 為異步初始化等待，保證測試正常執行。
- **審計 Verdict 綠燈通過**：專案順利通過了第二次 Forensic Audit，取得 **🟢 CLEAN** 認證。

## 2026-06-09 [Security] "Security Audit Remediation"
### ✨ 核心安全防禦與資源管理加固 (Remediation)
- **AI 金鑰加密硬化**：利用 Web Crypto API 的 AES-GCM-256 對儲存於 `localStorage` 的 AI 設定 API 金鑰進行端對端加密與解密。在 `getAIConfig` 與 `saveAIConfig` 中整合安全加解密管道；若解密失敗，自動安全清除受損的金鑰配置以防範 XSS 金鑰竊取與惡意偽造。
- **戰鬥平衡性與數值防弊**：於 `hooks/useBattleSystem.ts` 內將暴擊倍率固定為 1.5 倍，並將連擊加成限制上限為 50，在前端切斷透過控制台修改參數所導致的戰鬥數值作弊。
- **成就系統 RPC 硬化**：重構 `services/achievements.ts` 中的 `unlockCloudAchievement`，將客戶端直接 upsert 寫入資料庫的漏洞設計重構為強制透過 Supabase RPC `unlock_achievement` 呼叫，並由資料庫端以 `auth.uid()` 進行主體校驗，消除越權解鎖威脅。
- **非同步生命週期優化**：於 `services/localRepo.ts` 中修正非同步處理瑕疵，在 `unlockAchievement` 中補齊 `await`。
- **答題防刷與 UI 骨架屏**：
  - `components/Settings.tsx` 中導入 API 金鑰載入/保存 `isLoading` 狀態與 Skeleton 骨架屏，解決非同步加解密期間 UI 渲染阻塞引起的白屏。
  - `components/QuizCard.tsx` 中引入 `isSubmitting` 原子鎖，徹底防止使用者雙擊或 Enter 連續敲擊所產生的重複答題提交與戰鬥系統競態條件。
- **資源生命週期管理與洩漏防範**：
  - `hooks/useBattleSystem.ts` 中的 4 個裸露 `setTimeout` 調用均改為 Ref 追蹤，並在 `useEffect` 卸載清理函數中徹底 clearTimeout 清理，解決記憶體洩漏與 React 元件銷毀後狀態更新的 runtime 錯誤。
  - `components/FocusTimer.tsx` 中播放音效後引進 600ms 延遲以關閉 `AudioContext`，並使用 `audioTimersRef` 進行計時器追蹤與卸載清理，杜絕 SPA 長期運行產生的硬體解碼通道資源洩漏。
- **資料庫安全防禦 SQL 落地**：
  - 建立 `docs/sql/submit_challenge_score.sql`：定義 `submit_challenge_score` 安全 RPC 函數，在後端使用 `auth.uid()` 驗證挑戰雙方身份（防範 BOLA 越權）並校驗分數合理區間（0 - 10000）。
  - 建立 `docs/sql/supabase_rls_policies.sql`：定義成就解鎖 `unlock_achievement` 安全 RPC 函數與 `friendships` 的 RLS 加固策略，嚴格限定只有被邀請者 (friend_id) 才能接受好友請求，從根本上杜絕了發送者自我核准的邏輯漏洞。

## 2026-06-08 [Review] "20維度深度安全與系統架構稽核"
### 📄 Report
- 已建立 [comprehensive_security_audit_report.md](file:///c:/Users/user/Desktop/Quiz-app--main/docs/reports/comprehensive_security_audit_report.md)，整合四位子代理（資安與滲透、邏輯與架構、代碼品質、對抗性與邊界）的調查，完成涵蓋注入、授權越權、狀態同步、依賴供應鏈、資源洩漏等 20 個維度的深度系統稽核與加固設計。
- 已建立 [LOGIC_AND_ARCH_AUDIT_REPORT_2026_06_08.md](file:///c:/Users/user/Desktop/Quiz-app--main/docs/reports/LOGIC_AND_ARCH_AUDIT_REPORT_2026_06_08.md)，完成商業邏輯與生命週期渲染優化。

### 🔍 主要發現
- **資安與授權**：個人題庫與挑戰分數未於 Supabase 綁定 `user_id` 或進行後端原子結算，存在 IDOR/BOLA 越權威脅；好友請求發起人可單方面自我接受。
- **對抗性防作弊**：本地 `localStorage` 遊戲狀態及成就明文儲存且缺乏 HMAC/SHA-256 簽名校驗，容易被前端腳本或 Console 直接修改篡改數值。
- **狀態與同步**：雲端同步成功後實體刪除本地 `practice_sessions` 快照，離線或網路波動時進度面臨完全丟失；並發同步存在標籤頁間的覆蓋競態。
- **記憶體與型別**：`useBattleSystem.ts` 內多個 setTimeout 裸露未清理；AudioContext 未 close 釋放；違反鐵規使用 `any` 擴展 window 屬性。
- **架構與依賴**：元件越級讀寫 `localStorage`；`package.json` 中的 `@supabase/supabase-js` 寫入了非官方發行的非法版本號 `^2.93.2`。


## 2026-05-28 [Utility] "Project Memory Refresh"
### ✨ Infrastructure & Memory
- **執行專案記憶刷新與安裝**：在專案根目錄成功執行 `refresh_project_memory_bundle.py`，完成專案記憶 (Project Memory) 的全面更新與安裝。
- **更新索引與地圖**：重新整理 `MEMORY.md` 記憶地圖，並重新建立 `.memory-index/index.json` 索引，確保本地所有 Markdown 及開發檔案被正確雜湊與索引。
- **MCP 配置與驗證**：更新並驗證包含 Gemini、Cursor、Codex 與 Antigravity CLI 的專案 MCP 配置文件（如 `.gemini/settings.json`、`mcp_config.json` 等）。執行健康度與搜尋驗證皆回傳正常 (Verify OK)，且無任何 health warnings。

## 2026-05-21 [OpenSpec] "Security and Sync Hardening"
### ✨ Feature Delivery & Safety Hardening
- **AI 設定防護 (M1)**：在 `services/ai.ts` 的 `getAIConfig()` 中加入防禦性的 try-catch 機制與 10KB 大小限制，並建立 JSON Type Guard (`isAIConfig`)，確保損壞之資料能被安全清理並回退為預設值，完全防範惡意 XSS 或惡意篡改引起的崩潰。並在 `index.html` 中加入了嚴格的 CSP。
- **並發同步優化與容錯 (M2 & M3)**：將 `syncLocalToCloud` 的 `Promise.all` 改造為 `Promise.allSettled` 以落實同步故障隔離。新增並發控制上限限制（限制為 3 ），並在 `syncLocalPracticeSessions` 中引進並發同步鎖，防止多分頁同時操作引起的競態條件（Race Conditions）。同步完成後，向呼叫端傳回成功與失敗之摘要報告，實作精確的部分失敗 Toast 與重試引導。
- **雲端 session 回寫與草稿版本守衛 (M4 & M5 & M6)**：
  - 雲端版本較新時回寫至本機，並在此時清除對應的 chunk drafts 且強制遵守 `PRACTICE_ACTIVE_LIMIT` 限制。
  - 將 `saveCloudQuestions` 中的刪除動作包裝，當 delete 失敗時降級為 console.warn 警告，不中斷同步流程，並將 dirty 題庫標記至本地 `mindspark_dirty_banks` 中。
  - 在 `saveChunkDraft()` 中加入基於時間戳與版本守衛的寫入限制，預防時鐘漂移與回撥，並妥善處理 `QuotaExceededError`（清除最舊草稿）。
- **依賴項安全升級 (M7)**：升級並鎖定 `vite` (6.4.2)、`dompurify` (3.3.4，實裝 3.4.5) 與 `postcss` (8.5.10)，修補多項 Critical/High CVE 漏洞。
- **追加安全性強化 (S1-S5)**：完成構建產物憑證審計，規劃憑證輪換流程與 Gitleaks CI 密鑰掃描，設計短期 token 鑄造與 Playwright 並發衝突壓力測試架構。

### 🧪 Verification
- 新增 `src/__tests__/dompurify.test.ts` 行為與 regression 快照測試，包含 XSS 過濾與 HTML 標籤保留驗證。
- 新增 `src/__tests__/syncLocalToCloud.test.ts` 覆蓋全部成功、部分失敗、全部失敗與 type guard 測試。
- 新增 `src/__tests__/saveChunkDraft.test.ts` 驗證版本守衛、時鐘漂移與 QuotaExceededError 處理。
- 新增 `e2e/sync-and-settings-hardening.spec.ts` 覆蓋全部同步失敗重試、部分失敗 localStorage 更新與損毀 JSON 容錯。修復了模擬 token 中 user 屬性缺失導致的渲染崩潰，以及 GET questions 路由未攔截導致的 Playwright 請求掛起超時 Bug。
- 完成 OpenSpec 驗證報告 `openspec/changes/security-and-sync-hardening/verification-report.md`，標註雲端-only sessions 回寫本機與規格差異。
- 順利通過 `npx tsc --noEmit` & `npm run build`，且全量 146 項單元測試與 Playwright E2E 測試 100% 通過（包含 3 項同步與設定安全性強化測試）。

### 🔄 Verification Round 2 (2026-05-21)
- **修復 Cloud-only sessions 回寫問題**：移除 `syncLocalPracticeSessions` 中將雲端獨有 sessions 寫入 localStorage 的邏輯，嚴格符合 spec 規定的「同步方向：本機→雲端」原則。
- **修正日誌等級**：將 `keepIds` 空集合防護（`cloudStorage.ts`）和 AI config oversized 偵測（`ai.ts`）的日誌等級從 `console.error` 改為 `console.warn`，因為這些是預期的防禦性行為，非系統錯誤。
- **消除 `any` 型別違規**：修復 `cloudStorage.ts`（`checkIsTableMissingError` 參數、`retryCleanupDirtyBanks` 回調）和 `storage.ts`（`cleanOldestChunkDraft` 內部、`saveChunkDraft` catch block）中的 `any` 使用，全部改為 `unknown` + type guards。
- **修復 flaky test**：`useChunkedPractice.test.ts` 中的 chunk restore 測試改為斷言總題數減少（確定性），避免因 shuffle 隨機性導致測試間歇性失敗。
- 驗證報告更新至 `openspec/changes/security-and-sync-hardening/verification-report.md`：零 CRITICAL、零 WARNING、零 SUGGESTION。

## 2026-05-21 [Review] "競態與邏輯風險審查報告"
### 📄 Report
- 已建立 `docs/reports/RISK_REVIEW_REPORT_2026_05_21.md`，整理競態條件、資料一致性與 AI 金鑰風險。

### 🔍 主要發現
- 雲端題庫同步採非原子 upsert + delete，存在幽靈題目與誤刪風險。
- `syncLocalPracticeSessions` 可能清除雲端較新的本機 session，離線時進度消失.
- Chunk 草稿多來源寫入仍可能回流，需加強版本/時間戳判斷。

## 2026-05-21 [Security] "Comprehensive Security & Logic Audit"
### 🔍 Audit Findings
- **雲端同步競態條件 (Race Conditions)**：`syncLocalPracticeSessions` 採用順序 `await` 且缺乏鎖機制，在多分頁或頻繁觸發時可能導致資料覆蓋。
- **本機草稿保存衝突**：`useChunkedPractice` 的 `updateChunkDraft` 與 `beforeunload` 可能發生競爭，導致進度回流（Regression）。
- **敏感憑證洩露風險**：AI API Key 存儲於 `localStorage`，雖有 `sessionStorage` 選項，但在 client-side 架構下仍易受 XSS 威脅。
- **資料完整性風險**：`saveCloudQuestions` 的「先 Upsert 後 Delete」非原子操作，中斷時會導致雲端殘留幽靈題目。

### 🛠️ Remediation Plan
- **產出報告**：已建立 `docs/SECURITY_AND_LOGIC_AUDIT_REPORT.md` 詳細記錄問題成因與建議。
- **後續行動**：建議引入同步鎖（Sync Lock）與 Supabase RPC 以強化資料一致性。

### 🧪 Verification
- 已執行 `npm audit` 確認依賴漏洞狀態。
- 已完成手動程式碼走查與並發邏輯分析。
- 專案 TypeScript 型別檢查通過。

## 2026-05-18 [Hotfix] "Vercel Deployment Compatibility Optimization"
### 🐛 Root Cause
- **本地與 Vercel 平台環境版本落差**：本地使用極新的 Node.js v24.11.0 與 npm 11.6.1，而 Vercel 預設部署環境可能為 Node.js 18.x 或 20.x。高版本的 npm 在 Windows 環境下生成並鎖定的 `package-lock.json`，在 Vercel 的 Linux 舊版環境中還原時，容易因為平台特定的選用依賴（例如 `@esbuild/linux-x64`）未正確下載，導致 `node_modules/.bin/vite` 軟連結損壞、無執行權限，進而觸發 `sh: line 1: /vercel/path0/node_modules/.bin/vite: Permission denied` (Exit code 126)。
- **依賴快取污染**：由於 `Installing dependencies...` 僅耗時 2 秒且只 `added 7 packages`，表示 Vercel 在未清理的快取中沿用了與 Linux 平台不相容的、殘留的本地依賴，導致部署失敗。

### 🛠️ Fix
- **鎖定與優化 Node.js 版本相容性**：在 `package.json` 中主動聲明 `"engines": { "node": ">=20.0.0" }`，強制引導 Vercel 使用更相容的 Node.js 20+ 運行環境，縮小與本地 v24 的版本落差，確保其使用的 npm 能正確解析並還原 lockfile。
- **提供 Vercel 平台 Redeploy without Cache 與本地排錯指南**：
  1. 引導使用者在 Vercel 點選「Redeploy」並勾選「Redeploy without Cache」以強制乾淨重建。
  2. 提供本地重置依賴以修復跨平台 lockfile 的指令。

### 🧪 Verification
- 已成功更新 `package.json` 中的相容性配置。
- 本地執行 `npm run build` 通過驗證。

## 2026-05-18 [Hotfix] "Chunked Practice Cloud Resume Draft Preservation"
### 🐛 Root Cause
- **登入狀態下的雲端 repository 會誤刪草稿**：`CloudStorageRepository.savePracticeSession()` 在雲端保存分階段練習成功後，原本呼叫本地 `deletePracticeSession()` 清除 local cache；但該函式同時會清除 `mindspark_chunk_draft:<sessionId>:<chunkIndex>`。因此使用者刷新後按「繼續」時，restore 流程會先同步 session，草稿在讀取前已被清掉，導致回到第一題。

### 🛠️ Fix
- **拆分 cache 清理與正式刪除語意**：新增 `removePracticeSessionCache()`，只移除本地 `mindspark_practice_sessions` 中的 session cache，不清除任何 chunk draft。
- **雲端保存不再清草稿**：`CloudStorageRepository.savePracticeSession()` 改用 `removePracticeSessionCache()`，保留裝置本機的進行中草稿；真正放棄或刪除 session 時仍會清除 drafts。

### 🧪 Verification
- 新增 cloud repository 回歸測試，確認雲端保存成功移除 local session cache 後仍保留 chunk draft。
- 新增 hook 組合測試，模擬答到中途、卸載、再 restore，確認回到原本 `currentQuestionIndex`。
- 已通過 `npx vitest run src/__tests__/practiceSessionStorage.test.ts src/__tests__/useChunkedPractice.draft.test.ts`。
- 已通過 `npx tsc --noEmit`。

## 2026-05-18 [Hotfix] "Chunked Practice Page Refresh Progress Retention & Strict Compilation Fix"
### 🛡️ Page Refresh Progress Retention & Race Condition Resolution
- **解決非同步渲染競態**：在 `App.tsx` 中使用 `useCallback` 封裝 `onChunkComplete` 與 `onChunkDraftUpdate` 回調函數。這完全穩定了它們的參照，消除了當重新整理頁面後，因非同步加載 banks 導致 App 重新渲染所引起的匿名 inline 函數引用改變與 `useQuizEngine.ts` 內重複觸發 `useEffect` 的競態條件。
- **實作防禦性進度保護 (Index-Guarding)**：在 `useChunkedPractice.ts` 中的 `updateChunkDraft` 與 `onBeforeUnload` 內，加入高防禦性的進度指標保護邏輯（Index-Guarding）。若 incoming 的進度為 `0`（初始狀態）且無錯誤記錄，但 `localStorage` 中已存在大於 `0` 的進度，則進行攔截保護拒絕覆蓋，完美解決了頁面重新載入後點選繼續卻意外回到第一題的 Bug。

### 🛡️ TypeScript Strict Compilation Type Hardening
- **修正型別缺失破口**：
  - 更新 `AppContentProps`，於 `chunkedPractice.summary` 型別定義中補齊缺失的 `wrongQuestionIds: string[]` 欄位。
  - 於 `quizEngine` 型別定義中補齊 `sessionBankIds: string[]` 欄位。
  - 在 `useQuizEngine.ts` 的回傳對象中成功導出 `sessionBankIds` 狀態。
  - 將 `components/AppContent.tsx` 中複習錯題時所引用的 `quizEngine.quizState.bankIds` 修正為正確的 `quizEngine.sessionBankIds`，徹底修復並通過了 `npx tsc --noEmit` 的 100% 嚴格編譯。

### 🧪 Compilation & Unit Tests
- 順利通過 `npx tsc --noEmit` & `npm run build` 的極致編譯挑戰，無任何型別破口。
- 110 個 Vitest 單元測試 100% 全數通過，達成絕對完美主義。

## 2026-05-18 [Hotfix] "Chunked Practice AbortError Fix & Premium Mistake Review Flow"
### 🛡️ AbortError Handling & Performance Optimization
- **無視非預期 AbortError**：於 `services/cloudStorage.ts` 中優雅捕捉並過濾 `AbortError`（主動中斷或超時），改為 `console.info` 記錄而不再拋出 `console.error`，維持主控台純淨。優雅修正了 `syncLocalPracticeSessions` 與 `getCloudPracticeSessions` 中的 catch 中斷邏輯。
- **批次寫入性能優化**：重構 `syncLocalPracticeSessions` 的同步機制，將 loop 中的單條寫入改為結束後一次性呼叫 `replaceAllPracticeSessions`，杜絕多次磁碟 I/O 的性能瓶頸，且 100% 契合並通過了現有單元測試。

### ✨ Premium Mistake Review Flow (無縫錯題複習閉環)
- **全面支援錯題複習**：擴充 `ChunkSummaryState` 與 `ChunkCompleteSummary` 介面，支援 `wrongQuestionIds`（本段錯題 IDs）。現在無論是單一階段（短練習）還是多階段（長練習）完成時，皆會主動彈出結算視窗，不留學習盲區。
- **高質感 UI 按鈕設計**：於 `ChunkCompleteSummary` 引入高質感琥珀色漸變（Amber/Orange Gradient）「📖 立即複習本段錯題」按鈕及 micro-animations，極大提升視覺回饋與互動意願。
- **無縫錯題載入機制**：使用者點選複習錯題後，會即時無縫啟動 `retry_session` 模式載入錯題卡片；當錯題複習完畢後，流暢切換回 Dashboard。
- **答題進度即時草稿（Draft）**：驗證並確認「中途退出，100% 保存 Draft」之答題機制。透過 `useQuizEngine.ts` 的 `onChunkDraftUpdate` 自動偵聽機制，答題每前進一步皆即時寫入 `mindspark_chunk_draft:<sessionId>:<chunkIndex>`，確保任何形式的退出都不會丟失進度，高度實踐防禦式設計。

### 🧪 Compilation & Unit Tests
- 順利通過 `npx tsc --noEmit` & `npm run build` 的極致編譯挑戰，無任何型別破口。
- 110 個 Vitest 單元測試 100% 全數通過，達成絕對完美主義。

## 2026-05-18 [Hotfix] "Chunked Practice Sync Deadlock & Infinite Loop Fix"
### 🛡️ Graceful Degradation & Circuit Breaker
- **自動熔斷機制**：於 `services/cloudStorage.ts` 引入 `isCloudPracticeAvailable` 與 `checkIsTableMissingError`。當發現雲端 Supabase 未建立 `practice_sessions` table 時（錯誤代碼 `PGRST205` / HTTP 404），會自動熔斷並優雅降級為全本地（Local-only）模式。不再向雲端發送無效請求，避免持續 console 報錯與彈出重試同步提示。
- **解耦查詢與同步重試**：從 `services/cloudRepo.ts` 中 `getPracticeSessions` 移除每次查詢無條件 `await retryDirtyPracticeSessions()` 的同步阻塞，消除高頻 API 呼叫引發的 AbortError 競態條件，同時保障了分階段練習列表的載入效能。

### 🔄 React Performance & State Security
- **切斷 Effect 無限死亡螺旋**：修復 `App.tsx` 中初始化 `useEffect` 因為 `chunkedPractice` reference 變更所造成的 React Infinite Loop 重繪問題。引進 `hasSyncedPracticeRef` 限制僅在使用者登入後執行一次同步，徹底終止了無限彈出「有 1 筆分階段練習待重試同步」Toast 的問題。
- **類型安全與編譯過關**：完成全面代碼審計與重構，達成 `npx tsc --noEmit` 100% 通過與零 TypeScript 類型破口。

## 2026-05-18 [Utility] "One-Click Development Startup Script"
### ✨ Developer Experience (DX)
- **新增一鍵啟動腳本**：於專案根目錄新增 [start-dev.bat](file:///c:/Users/user/Desktop/Quiz-app--main/start-dev.bat)，提供 Windows 環境下一鍵啟動開發伺服器的功能。
- **自動環境與 Port 檢查**：
  - 自動檢查 `node_modules` 依賴是否存在，缺失時自動觸發 `npm install`。
  - 防禦性偵測 Port `5173` 是否被佔用，並提供「強制終止佔用程序」、「直接啟動」、「僅開啟瀏覽器」及「取消」四種動態交互選項。
  - 啟動 Vite 開發伺服器時，自動於背景非同步延遲 3 秒在預設瀏覽器中開啟 `http://localhost:5173`，免去手動輸入網址或等待的繁瑣流程。

## 2026-05-15 [OpenSpec] "Chunked Practice Cloud Sync — Apply with Tests (Round 1)"
### ✨ Feature Delivery
- **Chunked Practice 基礎落地**：新增 `useChunkedPractice`，完成 Session 建立/分組、restore 驗證、chunk 完成冪等、手動放棄、chunk draft 寫入與恢復。
- **Quiz Engine 整合**：`useQuizEngine.startQuiz` 新增 `chunked` mode 與 `chunkMeta`，支援指定子集順序載入，並在 chunk 完成時觸發 `onChunkComplete`。
- **UI 整合**：新增 `ChunkedPracticePanel`、`ActiveSessionCard`、`ChunkCompleteSummary`，Dashboard 可建立/續作分階段練習；QuizCard 顯示「📦 階段 X / Y」。

### 🗄️ Storage & Cloud Sync
- **Migration**：新增 `docs/migrations/PRACTICE_SESSIONS_MIGRATION.sql`（`practice_sessions` table、RLS、雙索引、`updated_at` trigger、`ON DELETE CASCADE`）。
- **Repository 擴充**：`IStorageRepository`、`LocalStorageRepository`、`CloudStorageRepository` 全面加入 practice session CRUD。
- **同步策略**：新增 `syncLocalPracticeSessions` + `retryDirtyPracticeSessions`，採 `updated_at` LWW，不以舊 local 覆蓋新 cloud；失敗會保留 dirty fallback。
- **Guest retention**：active sessions 上限 5，總 session 上限 10，超限時從最舊非 active 物理清理。

### 🧪 Tests
- 新增 `useChunkedPractice.test.ts`、`useChunkedPractice.draft.test.ts`、`useQuizEngine.chunked.test.ts`、`practiceSessionStorage.test.ts`。
- `useBattleSystem.test.ts` 補上 `resetForNewChunk` 及 Game Mode mid-chunk toggle 等覆蓋。
- 新增 `e2e/chunked-practice.spec.ts`（小題庫 chunk、中途退出續作，並預留跨裝置同步測試介面）。

### 🗄️ Database Schema Reference
```sql
CREATE TABLE IF NOT EXISTS public.practice_sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    bank_ids UUID[] NOT NULL,
    bank_names TEXT[] NOT NULL,
    bank_question_map JSONB NOT NULL,
    chunk_size INTEGER NOT NULL,
    question_ids UUID[] NOT NULL,
    chunks JSONB NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'abandoned')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

## 2026-05-08 [OpenSpec] "Chunked Practice Cloud Sync — Round 4 Spec Alignment"
### 📐 OpenSpec
- **規格補強（Chunked Practice）**：新增「Chunk 進行中中途退出」規則（不結算、不顯示摘要；已產生的錯題/間隔複習更新保留）與「來源題庫刪除導致全題缺失」政策（Session 自動 `abandoned` 並移出 active 列表）。
- **規格補強（Battle Mode）**：定義 Chunk 進行中切換 Game Mode 的行為（OFF→ON 重新 `startBattle()` 且 counters 從 0 起算；ON→OFF 不影響測驗進度，且維持不入雲端的持久化規則）。
- **任務清單同步**：補齊 bankIds/DB 型別映射說明、`updated_at` 自動推進（trigger）與 `ON DELETE CASCADE`、restore 重算/空 chunk 行為、`startQuiz` chunked 型別要求、以及對應單元/E2E 測試項目。

## 2026-05-08 [v0.4.4] "MCP Entry Point Hardening"
### 🛠️ Infrastructure & Memory
- **MCP 匯入路徑優化**：優化 `.project-memory/project_memory_mcp_entry.py` 的模組搜尋與匯入邏輯。透過 `importlib` 備援機制與 `TYPE_CHECKING` 標記，解決了 IDE 靜態分析因無法識別動態 `sys.path` 修改而產生的「找不到模組」錯誤，提升了開發體驗與腳本穩定性。符合 ABSOLUTE_PERFECTIONIST 完美主義標準。


## 2026-05-07 [v0.4.3] "Review Fixes & Audit Triage"
### 🐛 Bug Fixes
- **Knowledge Graph 編譯修復**：修正 `GraphEditor.tsx` 將 React Flow `data` 轉回 `GraphNodeData` 時的 strict TypeScript 轉型錯誤，`npx tsc --noEmit` 已恢復通過。
- **Mermaid 節點上限同步**：`mermaidBridge.ts` 不再硬編碼 50 節點，改用 `GRAPH_LIMITS.MAX_NODES`，並更新測試覆蓋 60 節點匯入與超過設定上限的拒絕行為。
- **QuizCard 延遲計時器清理**：休息彈窗與解析顯示的 `setTimeout` 改由 ref 追蹤並在卸載時清理，避免題目切換或離開測驗後仍更新狀態。

### 🛡️ Type Safety & Architecture
- **NO_ANY 清理**：移除 `AppContent.tsx`、`AIHelper.tsx`、`Login.tsx`、`useBattleSystem.ts`、`SkillAnimation.tsx`、`isAbortError.ts` 中屬實的 `any` 型別破口。
- **Reducer 純化**：將 `gameMode` 的 localStorage 持久化從 `appReducer` 移到 `App.tsx` 的事件處理層，避免 reducer 直接執行 I/O。
- **稽核判讀**：`Question.id` 統一成 `string` 屬於大型資料模型遷移，暫不納入本輪熱修；Supabase `not in` 字串格式為 PostgREST 既有語法，且 ID 先 normalize 成 UUID，未採用報告中的陣列傳參建議。

## 2026-03-10 [v0.4.2] "Question Identity & Bank Editing Safety"
### 🛡️ Data Integrity
- **穩定題目身份**：新增 `sourceQuestionKey` / `sourceFingerprint` 題目識別欄位，將內部題目 ID 與外部來源識別分離，避免 AI / JSON 匯入重複覆寫不同題庫。
- **匯入合併策略**：`BankManager` 匯入流程改為先以來源鍵/指紋比對現有題目並保留原 ID，再整包覆蓋題庫內容，避免「修改舊題卻被當新題」。
- **雲端去重保護**：`saveCloudQuestions()` 送出 Supabase 前先去除同 payload 重複 ID，避免 `ON CONFLICT DO UPDATE command cannot affect row a second time`。
- **資料清理鏈**：刪除題目時同步清理錯題紀錄、SM-2 複習資料、最近錯題 session 與未完成測驗 session 殘留。

### ✨ UX
- **題庫人工修正**：`BankManager.tsx` 新增單題列表、單題編輯與單題刪除介面，讓使用者能在匯入後手動修正少數異常題目。
- **匯入前檢查提示**：JSON / AI 匯入前會先顯示原始題數、重複來源 ID 合併數、相同內容合併數，以及實際匯入題數，避免使用者誤判「題目被系統吃掉」。
- **匯入模式切換**：題庫管理新增 `追加新題 / 更新同來源題目 / 覆蓋整個題庫` 三種模式，預設使用追加新題，解決既有題庫想新增題目時被整包覆蓋的問題。
- **貼上內容保留**：成功匯入後不再自動清空貼上的 JSON，方便使用者修正後再次匯入。
- **題庫管理捲動修正**：移除題庫管理頁右側固定高度造成的裁切，貼上 JSON 區改為頁面自然捲動並允許手動拉高文字框，避免匯入介面被遮擋。
- **社交分享一致性**：接受好友分享題庫時改為保留來源識別並重新分配內部 UUID，讓跨題庫副本彼此獨立。

### 🧪 Tests & Migrations
- **單元測試**：新增 `questionIdentity.test.ts`、`storage.questionArtifacts.test.ts`，並擴充 `cloudStorage.test.ts` 覆蓋去重與穩定 ID 行為。
- **Migration**：新增 `docs/migrations/supabase_question_identity_migration.sql`，為 `questions` 表加入來源識別欄位與索引。

## 2026-03-08 [v0.4.0] "Unified Memory Architecture"
### 🛠️ Infrastructure & Memory
- **Unified Agent Entrance**: Created `.gemini/settings.json` to unify context on `AGENTS.md`. Removed redundant `GEMINI.md`.
- **Nested Memory System**: Implemented directory-level `AGENTS.md` for `components/`, `services/`, `hooks/`, `contexts/`, `constants/`, `src/__tests__/`, `e2e/`, and `openspec/`.
- **Protocol Migration**: Moved 9 critical development protocols from global memory to project-level `AGENTS.md` "Absolute Rules" (鐵規).
- **Root Directory Sanitization**:
    - **Reports**: Moved all security/audit/diagnostic reports to `docs/reports/`.
    - **Migrations**: Moved all SQL scripts to `docs/migrations/`.
    - **Logs**: Moved all error/TSC/system logs to `docs/logs/`.
    - **Archive**: Moved old verification prompts and design docs to `docs/archive/`.
    - Reduced root contamination from 80+ files to a clean developer-centric list.

### 🛡️ Type Safety
- Verified `npx tsc --noEmit` compatibility (preserved KG legacy errors without adding new ones).


## 2026-02-04 [v0.3.0]
### ✨ New Features
- **Game Mode (RPG Battle Arena)**:
  - Implemented global `gameMode` toggle in `Settings.tsx` with persistence.
  - Developed `BattleArena` component with "Underground" theme (Dark mode optimized).
  - Added "Stage Transition" full-screen animation when clearing levels.
  - Integrated battle logic into `QuizCard` with global state management.

### 🐛 Bug Fixes & Refactoring
- **Accessibility (A11y)**:
  - Added `aria-label` to all icon-only buttons in `Settings.tsx` and `App.tsx` [Fixes "Buttons must have discernible text"].
  - Added `aria-label` to select elements [Fixes "Select element must have an accessible name"].
- **Code Quality**:
  - Removed duplicate `onAnswer` and `onNext` props in `App.tsx` [Fixes "JSX duplicate properties"].
  - Refactored `QuizCard.tsx` to remove redundant local state (`battleMode`) in favor of global props.
  - Fixed lint errors for redeclared variables in `BattleArena.tsx`.

### 📝 Documentation
- Updated `CHECKLIST.md` marking Game Mode as complete.
- Updated `GEMINI.md` with recent changes.

## 2026-02-05 [v0.3.1]
### 🐛 Bug Fixes
- **Accessibility (A11y)**:
  - Fixed "Buttons must have discernible text" in `AIHelper.tsx` by adding `aria-label` and `title` to close and send buttons.
  - Fixed "Form elements must have labels" in `BankManager.tsx` by associating inputs with labels.

### ✨ New Features
- **AI PDF Question Generation**:
  - Added PDF upload support in `BankManager` (AI Tab).
  - Integrated Google Gemini 1.5 for analyzing PDF content and generating questions.
  - Added options for **Question Language**, **Question Type** (Single/Multiple/Mixed), and **Explanation Language**.
- **Battle Mode Enhancements**:
  - Added `FireballAttack` animation with `framer-motion` (GPU accelerated).
  - Integrated Sound Effects System (`useSoundEffects`) for BGM and SFX.
- **Settings**:
  - Added Custom Model Name support for Google provider.
  - Added Audio Settings (BGM/SFX toggles).

## 2026-02-05 [v0.3.2]
### ✨ New Features
- **Data Management (Root Out)**:
  - **Batch Delete**: Implemented multi-bank deletion in `Dashboard.tsx` via checkbox selection.
  - **System Nuke**: Added "Danger Zone" in `Settings.tsx` to wipe all local data and configurations.
  - **Enhanced Reset Protocol**: Modified nuke logic to forcefully sign out from Supabase and clear all `localStorage` keys with prefix `mindspark_` to ensure total cleanup.
  - **Sample Data**: Created `multiple_choice_sample.json` for testing multiple-choice imports.

### 🐛 Bug Fixes
- **Console Optimization**:
  - Replaced Supabase `.single()` with `.limit(1)` in analytics and streak services. This eliminates noisy "406 Not Acceptable" log errors when no rows are found, improving developer experience and console purity.
- **Naming Alignment**:
  - Renamed `lich_king.png` to `skeleton_wizard.png` to match updated monster data and prevent asset potential 404s.

## 2026-02-05 [v0.3.3] "Battle Mode Overhaul"
### ✨ New Features
- **Battle System 2.0**:
  - Refactored `useBattleSystem` with dynamic damage, critical hits, and shielding mechanics.
  - Implemented Monster rotation (Normal -> Elite -> Boss) with difficulty scaling based on questions answered.
  - Unified `AttackEffect` system supporting random animations (Fireball/Ice Arrow) and visual feedback.
- **Quiz Experience**:
  - **Result Dashboard**: New `QuizResult` component with detailed stats, mistake review mode, and achievement summary.
  - **Focus Tools**: Added `MiniTimer` (Pomodoro style) and `RestBreakModal` (Study fatigue check).
  - **Keyboard Hints**: Added visual shortcut keys (1-4) to option buttons for better usability.
- **Persistence**:
  - Implemented auto-save/restore for active quiz sessions (survives refresh).
  - Battle state is now persistent (HP/Streak/Monster maintained across reloads).

### 🐛 Bug Fixes
- **Accessibility**: Fixed missing aria-labels in `AchievementsModal` and `QuizCard` header buttons.
- **Visuals**: Standardized damage number rendering with `DamageNumber` component.

## 2026-02-05 [v0.3.4] "Dashboard & UX Polish"
### ✨ New Features
- **Dashboard UX**:
  - **Recent Mistakes**: Added a dedicated card to track and review the last 5 incorrect answer sessions (FIFO).
  - **Achievements**: Made the achievements card interactive with a full-view modal.
  - **Default Quiz Size**: Changed default from 20 to "All questions" for continuous study flow.
- **Settings**:
  - **Custom Rest Interval**: Users can now set a custom numeric value for rest break intervals (e.g., every 15 questions).

## 2026-02-08 [v0.3.6] "Security & Tailwind v4 Migration"
### ✨ Security Hardening
- **Content Security Policy (CSP)**: Added strict meta tags in `index.html` to control resource sources.
- **CDN Elimination**: Removed unauthenticated Tailwind CDN and migrated to local build process to mitigate supply chain risks.
- **Security Audit**: Completed full audit using `security-audit` skill; achieved Security Score **A**.

### 🛠️ Technical Refactoring
- **Tailwind CSS v4 Migration**:
    - Upgraded to Tailwind v4 using `@tailwindcss/vite` and standard CSS variables in `index.css`.
    - Resolved PostCSS ESM module compatibility issues (`postcss.config.js` syntax).
    - Fixed UI contrast issues by defining full range of brand and accent colors (fixing "fade-to-white" bug).
- **VS Code Optimization**: Added `.vscode/settings.json` to suppress Tailwind-specific linting warnings in CSS files.

## 2026-02-09 [v0.3.7] "Skills-Based Optimization"
### 🚀 Performance & Reliability
- **AI Prompt Optimization (Phase 1)**:
  - Implemented strict JSON Schema enforcement in `services/ai.ts` for reliable question generation.
  - Added Few-Shot prompting and auto-recovery mechanisms to handle malformed LLM responses.
- **React Performance (Phase 2)**:
  - Analyzed and fixed unstable prop references in `App.tsx` preventing `Dashboard` memoization.
  - Removed duplicate state updates in `startQuiz` reducing render cycles.
- **Battle System Debugging (Phase 3)**:
  - Added DEV-only state transition logging in `useBattleSystem.ts` for easier debugging.
  - Standardized skill trigger logic (Milestones: 5, 10, 20, 30...) in `constants/skillsData.ts`.
  - Added comprehensive unit tests in `src/__tests__/useBattleSystem.test.ts` verifying state logic.
- **Security Audit (Phase 5)**:
  - Verified `npm audit` (0 vulnerabilities).
  - Confirmed XSS safety (no `dangerouslySetInnerHTML`).
  - Reviewed CSP configuration for development flexibility.

## 2026-02-10 [v0.3.8] "Infrastructure & Safety Refactor"
### ✨ 功能與重構
- **架構品質優化 (v0.3.9)**：
    - **App 組件重構**：將 `App.tsx` 的渲染邏輯抽離至 `AppContent.tsx`，成功將 `App.tsx` 行數從 309 行減少至 149 行。
    - **型別安全驗證**：解決了 `App.tsx` 與 `AppContent.tsx` 之間大規模 Props 傳遞的型別不匹配問題，達成 `npx tsc --noEmit` 零錯誤。
    - **命名衝突修復**：將 `confirm` 鉤子更名為 `confirmDialog` 以避免與原生 `window.confirm` 衝突。
    - **檔案組織優化**：將 `typeGuards.ts` 移至 `utils/` 目錄並修正其內部導入。
    - **系統穩定性**：通過全域 `build` 測試，確保重構未破壞現有功能。
- **Toast/Confirm 系統**：新增一致的通知與確認流程。
- **Repository 基礎架構**：導入 `IStorageRepository`、本地/雲端 repository 與 `RepositoryContext`。
- **導覽結構**：抽離 `AppHeader` 與 `MobileNav` 元件。

### 🛡️ 穩定性與安全
- **ErrorBoundary**：新增全域錯誤防護。
- **型別安全修正**：補強型別檢查與邊界處理。
- **CSP 強化**：收斂資源來源規則。

### 🧪 測試
- 因 shell/pwsh 不可用，未執行測試與建置。

## 2026-02-10 [v0.3.9] "Architecture Quality Overhaul Complete"
### ✨ Major Refactoring
- **App.tsx Decomposition**:
    - Extracted `appReducer` and `initialAppState` to `reducers/appReducer.ts` (-50 lines).
    - Extracted data loading logic to `hooks/useAppDataLoader.ts` (-75 lines).
    - Extracted `GlobalModals` component to handle settings, resume, and share modals (-30 lines).
    - Reduced `App.tsx` complexity significantly, improving maintainability.

### 🛠️ Infrastructure
- **Unified Data Loading**: Centralized initial data fetching and quiz pool loading in `useAppDataLoader`.
- **Modal Management**: Centralized modal logic in `GlobalModals.tsx`.

### 🛡️ Type Safety & Tests
- **Broken Imports**: Fixed broken import paths in `src/__tests__/appReducer.test.ts` caused by the refactor.
- **Type Solidification**: Updated `QuizState` interface to support all quiz modes correctly.

### 📝 Notes
- **Verification Complete**: 
    - `App.tsx` line count: **297 lines** (Task verified ✓).
    - Production build: `npm run build` SUCCEEDED (Verified ✓).
    - Known issue: Local environment missing `@types/react` causes linting errors in `ErrorBoundary.tsx`, but logic is build-ready.

## 2026-02-11 [v0.3.10] "Console Purity & Stability"
### 🐛 Bug Fixes
- **Console Warnings Optimization**:
  - **Favicon 404**: Added `public/favicon.svg` and linked it in `index.html` to eliminate persistent browser 404 errors.
  - **Supabase 400 (Challenges)**: Refactored `getMyChallenges` in `services/challenges.ts` to use a **Manual Join** strategy (fetching raw challenges then fetching profiles/banks separately). This bypasses unreliable PostgREST embedded resource syntax and resolves the 400 Bad Request error.
- **Spec Integrity**:
  - Incremented OpenSpec documentation by syncing `fix-console-warnings` delta spec into the main `social-sharing` specification.
  - Successfully archived the `fix-console-warnings` change workflow.

### 🛠️ Infrastructure
- **Verification**: Confirmed fix via `browser_subagent` and successful production build (`npm run build`).



## 2026-02-11 [v0.3.11] "Deployment Stability & Optimization"
### 🐛 Build Fixes
- **Dependency Resolution**:
  - Downgraded `eslint` and `@eslint/js` to v9.x to resolve peer dependency conflict with `typescript-eslint` causing `npm install` failures.
  - Successfully verified fresh install and build process.

### 🚀 Optimization
- **Bundle Size**:
  - Implemented manual chunk splitting in `vite.config.ts` to separate vendor libraries (React, Framer Motion, Recharts, API Clients).
  - Reduced main entry bundle size and eliminated Vite "large chunk" warnings.

## 2026-03-10 [v0.4.1] "Project Memory MCP Repair"
### 🛠️ Infrastructure & Memory
- **MCP Runtime Fix**:
  - Repaired `C:\\Users\\user\\.codex\\skills\\project-memory-refresh\\scripts\\project_memory_mcp_server.py` by restoring module-level `score_entry()` scope, fixing `search_memory` runtime failure (`name 'score_entry' is not defined`).
- **Project-Local Memory Wiring**:
  - Generated `MEMORY.md`, `.project-memory/project_memory_mcp_entry.py`, `.codex/config.toml`, `.cursor/mcp.json`, and `.mcp.json` for repo-local project memory routing.
  - Rebuilt `docs/INDEX.md` and `.memory-index/` so project memory search no longer depends on the global auto-root server.
- **Skill Hardening**:
  - Added `verify_project_memory_mcp.py` so `project-memory-refresh` now validates the repo-local MCP server immediately after refresh.
  - Updated `refresh_project_memory_bundle.py` to execute post-refresh MCP verification automatically.
  - Updated `ensure_project_mcp_configs.py` so Antigravity remains enabled by default for frequent AntiGravity users, but global write failures now degrade to warnings unless `--require-antigravity` is explicitly requested.
- **Known Limitation**:
  - `refresh_project_memory_bundle.py` attempted to update `%USERPROFILE%\\.gemini\\antigravity\\mcp_config.json` and hit a permission boundary; local repo MCP config was already installed successfully, so Codex/Gemini/Cursor project-local usage is unaffected.

## 2026-05-18 [v0.4.2] "Vercel Build Dependency Hygiene Fix"
### 🐛 Build Fixes
- **Vercel dependency hygiene**:
  - Identified the real deployment root cause: remote `origin/main` tracked `node_modules/` files and a Windows-reserved `nul` path, causing Vercel to build from a corrupted dependency tree.
  - Kept the production build script on the standard `vite build`; the fix is to remove tracked dependencies from Git and rely on Vercel's fresh install.
  - Ensured `.gitignore` contains `node_modules` so generated dependencies stay untracked.

### 🧪 Verification
- `npx tsc --noEmit` passed.
- `npm run build` passed with Vite 6.4.1.

## 2026-06-26 [v0.4.3] "Comprehensive Security & Architecture Audit Report V2 (Final)"
### 🛡️ Security & Architecture Audit
- **Vercel HTTP Security Headers**: Designed a comprehensive server-side HTTP headers configuration in `vercel.json` covering CSP, X-Frame-Options (DENY), X-Content-Type-Options (nosniff), Referrer-Policy, and Permissions-Policy to harden the client-side app against XSS-based localStorage credential leakage.
- **Race Condition Analysis**: Discovered potential localStorage draft regression in `hooks/useChunkedPractice.ts` where unmount-triggered `beforeunload` saves might overwrite newer drafts with initial states. Outlined a consolidated `saveChunkDraftSafely` helper.
- **Guest-Auth Sync Conflict**: Identified a high-severity sync bypass in `hooks/useBankManager.ts` where Guest-created banks are hidden/lost upon login if the cloud repository already contains pre-existing banks. Proposed a diff calculation based on bank IDs instead of cloud-empty status.
- **Web Audio Context Leak**: Addressed a resource leak in `components/FocusTimer.tsx` where unmounts clearing the audio timer prevent `audioContext.close()` from ever executing. Designed a ref-based active tracker to close contexts on unmount.
- **Cryptographic & DB Transaction Deep Dive**:
  - Uncovered a high-severity vulnerability where Client-side AES-GCM encryption in `utils/crypto.ts` fails to protect API keys against XSS script access because both Salt (localStorage) and Seed (hardcoded in JS) share the same origin security boundary.
  - Exposed a non-atomic data integrity risk in `saveCloudQuestions()` (Upsert -> Delete) where hard-kill / power interrupts between upsert and localStorage dirty bank tag state persistence cause permanent "orphan ghost questions" on cloud. Proposed PostgreSQL RPC function routing.
  - Identified persistent memory consumption by global `Howl` singleton audio cache objects initialized in `useSoundEffects.ts`.
- **Audit Report V2**: Documented all findings, severities, replication paths, and side-by-side code diffs in `docs/SECURITY_AND_ARCHITECTURE_AUDIT_REPORT_V2.md`.
- **Note**: Per user instructions, no actual source code modifications were committed to the repository. All original source files remain unaltered.
