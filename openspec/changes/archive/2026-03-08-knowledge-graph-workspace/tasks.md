## 1. Foundation: 型別定義與依賴安裝

- [x] 1.1 在 `types/graphTypes.ts` 定義 `GraphDocument`（含 schemaVersion 初始值 1）、`GraphNode`（含 shape type）、`GraphEdge`（含 arrowType）、`GraphViewState` 型別介面，並定義文字欄位長度常數（TITLE_MAX=100, DEFINITION_MAX=500, DETAILS_MAX=2000, NAME_MAX=50, MERMAID_INPUT_MAX=5000）
- [x] 1.2 在 `types.ts` 的 `AppView` 型別新增 `'graph'` 值
- [x] 1.3 在 `types.ts` 的 `UserSettings` 介面新增 `betaFeatures?: { knowledgeGraph: boolean }` 欄位（使用 optional 確保向後相容）
- [x] 1.4 安裝 `@xyflow/react` 和 `@dagrejs/dagre` 依賴，驗證 React 19 peer dependency 相容性（必要時設定 npm overrides），確認 `npm ls` 無衝突且基本 mount 測試通過

## 2. Beta 功能開關系統

- [x] 2.1 在 `services/storage.ts` 新增 Beta 功能開關的讀取/寫入輔助函式（使用 `settings?.betaFeatures?.knowledgeGraph ?? false` 安全讀取）
- [x] 2.2 在 `components/Settings.tsx` 新增「🧪 實驗室功能 (Beta)」區塊，含知識圖工作區開關
- [x] 2.3 實作開關切換邏輯：切換時持久化至 localStorage，若在知識圖頁面關閉開關則自動返回 dashboard
- [x] 2.4 驗證：開關狀態在頁面重新整理後持久化

## 3. 導覽整合

- [x] 3.1 在 `reducers/appReducer.ts` 新增對 `'graph'` 視圖的支援（set_view action 接受 'graph'）
- [x] 3.2 在 `components/AppHeader.tsx` 新增條件式「🧠 知識圖」導覽按鈕（僅在 Beta 開啟時顯示）
- [x] 3.3 在 `components/MobileNav.tsx` 新增條件式「🧠 知識圖」導覽按鈕（僅在 Beta 開啟時顯示）
- [x] 3.4 在 `components/AppContent.tsx` 新增 `graph` 視圖的 `React.lazy` + `Suspense` 渲染分支，外層包裝 ErrorBoundary 處理 chunk 載入失敗（顯示「請檢查網路並重試」按鈕）
- [x] 3.5 實作 View Guardian：若 Beta 關閉但 view 為 'graph'，AppContent 強制回退至 dashboard（防繞過）
- [x] 3.6 驗證：Beta 關閉時導覽不顯示入口，開啟時桌面與手機同步顯示；chunk 載入失敗時顯示錯誤提示

## 4. 圖表資料儲存層

- [x] 4.1 建立 `services/graphStorage.ts`，實作 `getGraphs()`、`getGraphById()`、`saveGraph()`、`deleteGraph()` CRUD 函式，含 `QuotaExceededError` 捕捉（透過 `name === 'QuotaExceededError'` 或 `code === 22`）與 Toast 提示
- [x] 4.2 實作圖表數量上限檢查（最多 20 份），超限時返回錯誤訊息
- [x] 4.3 實作 debounce autosave 機制（2 秒延遲），同時綁定 `beforeunload` 和 `visibilitychange` 事件確保 iOS Safari 相容；所有立即儲存觸發點須先執行 `flushPendingEditorChanges()`（同步屬性面板 pending state）再 `persistToLocalStorage()`
- [x] 4.4 將 `mindspark_graphs` key 整合至系統清除（nuke）邏輯
- [x] 4.5 實作刪除 active graph 時的狀態收斂（先 flush → 清除 activeId → 回到列表畫面）
- [x] 4.6 實作圖表重命名驗證：trim 空白、空字串回退為「未命名圖表」、截斷至 50 字元（允許重複名稱）
- [x] 4.7 驗證：建立/修改/刪除圖表後 localStorage 正確更新，JSON 損毀時返回空陣列，空間不足時顯示警告，flush 機制在切頁時不丟資料

## 5. 圖表編輯器核心

- [x] 5.1 建立 `components/KnowledgeGraph/KnowledgeGraphWorkspace.tsx` 主容器（lazy 入口），包含文件列表與畫布區域
- [x] 5.2 建立 `components/KnowledgeGraph/GraphDocumentList.tsx`，顯示所有圖表文件，支援新增、選擇、刪除、重命名（雙擊名稱啟動內嵌編輯，含 50 字元限制、trim、空白回退）
- [x] 5.3 建立 `components/KnowledgeGraph/GraphCanvas.tsx`，封裝 @xyflow/react 的 `ReactFlow` 元件（受控模式）
- [x] 5.4 實作畫布基本互動：縮放、平移、節點拖曳
- [x] 5.5 驗證：能建立新圖表、切換圖表、在畫布上看到節點

## 6. 自訂節點與工具列

- [x] 6.1 建立 `components/KnowledgeGraph/GraphNodeComponent.tsx`，實作三層內容的自訂節點（title/definition/details）
- [x] 6.2 建立 `components/KnowledgeGraph/GraphToolbar.tsx`，包含新增節點、刪除選中、匯入/匯出按鈕
- [x] 6.3 實作新增節點功能（點擊按鈕在畫布中央新增，預設標題「新概念」、預設藍色）
- [x] 6.4 實作刪除節點功能（選中後 Delete 鍵或按鈕刪除，一併刪除連線；當 document.activeElement 為 INPUT/TEXTAREA 時忽略 Delete 鍵）
- [x] 6.5 實作連線建立（從節點 handle 拖曳，預設帶箭頭，禁止自連線）與刪除，支援箭頭方向切換（arrow/none/both），`both` 對應 Mermaid `<-->`
- [x] 6.6 實作連線標籤編輯（雙擊連線出現輸入框）
- [x] 6.7 驗證：可新增/刪除節點、建立/刪除帶箭頭連線、連線可加標籤

## 7. 屬性面板

- [x] 7.1 建立 `components/KnowledgeGraph/GraphPropertiesPanel.tsx`，選中節點時在側邊顯示
- [x] 7.2 實作節點顏色修改（預設 6 色選擇器）
- [x] 7.3 實作節點字體大小切換（小/中/大）
- [x] 7.4 實作節點內容編輯（三層：標題、定義、補充），含文字長度限制（100/500/2000 字元），屬性面板輸入使用 local state + 300ms debounce 再同步至畫布 state
- [x] 7.5 實作面板顯示/隱藏邏輯（選中節點顯示、點空白處隱藏）
- [x] 7.6 驗證：屬性面板正確顯示/隱藏，修改即時反映在節點上

## 8. 閱讀模式

- [x] 8.1 建立 `components/KnowledgeGraph/GraphReadingModeToggle.tsx`，提供「全部展開 / 逐步探索」切換按鈕
- [x] 8.2 實作「全部展開」模式：所有節點同時顯示完整 L1+L2+L3 內容，節點自動調整大小
- [x] 8.3 實作「逐步探索」模式：節點預設僅顯示 L1，點擊逐層展開（L1→L2→L3→收合）
- [x] 8.4 實作閱讀模式隨文件儲存（寫入 GraphViewState）
- [x] 8.5 確保手機端（≤768px）強制唯讀：隱藏編輯工具列、禁止節點拖曳（nodesDraggable:false）、禁止連線（nodesConnectable:false）、禁止 Delete 刪除、禁止雙擊編輯；允許 pan/zoom、閱讀模式切換、逐步探索點擊展開
- [x] 8.6 驗證：兩種模式正確切換，展開/收合動作順暢，模式隨文件持久化

## 9. Mermaid 橋接器

- [x] 9.1 建立 `services/mermaidBridge.ts`，實作 `parseMermaidToGraph()` 函式（Mermaid → Canvas JSON）
- [x] 9.2 實作 Mermaid flowchart 子集解析：方向宣告、三種節點語法（對應 concept/rounded/diamond 型別）、四種連線語法（`-->`/`---`/`-->||`/`<-->`，對應 arrowType arrow/none/arrow+label/both）、classDef 樣式（僅 fill → color），含輸入長度限制（最大 5000 字元）
- [x] 9.3 實作匯入驗證管線：解析 → 正規化形狀/箭頭 → 過濾自連線（提示已忽略數量）→ 截斷超長文字（title>100、label>100 截斷並提示）→ 解碼 HTML entities → 產生預覽 → 確認後寫入
- [x] 9.4 實作 dagre 自動佈局（將解析出的節點依方向排列，避免重疊，處理循環依賴不崩潰）
- [x] 9.5 實作解析錯誤處理：不支援語法提示、語法錯誤位置、修正建議
- [x] 9.6 實作 `exportGraphToMermaid()` 函式（Canvas JSON → Mermaid 語法），含 Mermaid 特殊字元嚴格 escape（`[`, `(`, `{`, `>`, `|` 等），`arrowType: 'both'` 匯出為 `<-->`
- [x] 9.7 建立 `components/KnowledgeGraph/MermaidImportModal.tsx`，含文字輸入、預覽（節點數/連線數/過濾提示）、新建或追加至現有圖表的模式選擇、確認匯入（遇圖表上限 20 時阻止新建並提示）
- [x] 9.8 建立 `components/KnowledgeGraph/MermaidExportModal.tsx`，含結果顯示、一鍵複製
- [x] 9.9 驗證：匯入/匯出雙向可逆（含 `<-->` round-trip），錯誤語法有清楚提示，匯入預覽正確，自連線被過濾，上限情境下新建被阻止

## 10. 測試

- [x] 10.1 撰寫 `src/__tests__/graphStorage.test.ts`：CRUD、autosave、上限、JSON 損毀處理、QuotaExceeded 處理（含 name 和 code 兩種偵測）、active graph 刪除、rename 驗證（trim/空白回退/50字元）、flush 機制
- [x] 10.2 撰寫 `src/__tests__/mermaidBridge.test.ts`：解析正確語法（含 `<-->` 雙向箭頭）、錯誤語法、特殊字元 escape、匯出再匯入一致性（含 both round-trip）、輸入長度限制、匯入驗證管線（自連線過濾、標題截斷、HTML entity 解碼）、上限情境
- [x] 10.3 撰寫 `src/__tests__/betaFeatureToggle.test.ts`：開關持久化、預設值、舊設定缺 betaFeatures 的安全回退、條件導覽、View Guardian
- [x] 10.4 撰寫 `src/__tests__/readingModes.test.ts`：模式切換、逐層展開收合、模式持久化、edge label 在兩種模式下可見
- [x] 10.5 執行 `npm run build` 確認 code splitting 正確（檢查 dist/assets/ 中知識圖 chunk 獨立存在，主 bundle 不含 @xyflow/react）
- [x] 10.6 在 vitest setup 中加入 ResizeObserver polyfill/mock
- [x] 10.7 執行 `npm test` 確認所有測試通過且無回歸

## 11. 整合與收尾

- [x] 11.1 確認深色/淺色主題下所有知識圖元件樣式正確
- [x] 11.2 確認手機端強制唯讀（禁止拖曳/連線/刪除/編輯，允許 pan/zoom/閱讀模式/展開）
- [x] 11.3 確認 Beta 開關關閉後所有知識圖入口消失
- [x] 11.4 確認系統清除（nuke）正確清除圖表資料
- [x] 11.5 執行完整的端到端手動驗證流程
