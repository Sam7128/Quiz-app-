## Context

MindSpark 的知識圖模組基於 React Flow v12，目前架構如下：

- **核心元件**：`GraphEditor.tsx`（915 行，包含 undo/redo、autosave、code mode、mermaid modal 等所有邏輯）
- **節點元件**：`ConceptNode.tsx`（菱形使用 `rotate-45` CSS）、`StickyNoteNode.tsx`（純文字 textarea）
- **服務層**：`graphStorage.ts`（localStorage CRUD，schema v2）、`radialLayout.ts`、`markdownGraphBridge.ts`、`mermaidBridge.ts`
- **型別**：`graphTypes.ts`（`GraphDocument`、`GraphNode`、`GraphEdge` 等）
- **實驗模式閘門**：`betaFeatures.knowledgeGraph` 控制功能可見性（`Settings.tsx`、`AppContent.tsx`、`AppHeader.tsx`、`MobileNav.tsx`、`KnowledgeGraphWorkspace.tsx`）
- **雲端**：Supabase SDK 已安裝（`services/supabase.ts`），但知識圖目前僅使用 localStorage
- **測試**：`graphStorage.test.ts`、`readingModes.test.ts`、`mermaidBridge.test.ts`、`markdownGraphBridge.test.ts`、`betaFeatureToggle.test.ts`

**遺留技術債**（來自 `verification_report.md`）：
1. WARNING-01：程式碼模式顏色覆蓋與保留的矛盾
2. DEBT-03：`graphStorage.ts` 硬編碼中文驗證字串
3. DEBT-04：`GraphEditor.tsx` 巨型元件（878→915 行）
4. DEBT-05：同名節點在 `handleCodeChange` 中的屬性覆蓋衝突

## Goals / Non-Goals

**Goals:**
1. 修復所有已知 UI/UX Bug（菱形變形、逐步探索失效、連接拖曳不生效）
2. 重構 `GraphEditor.tsx` 為輕量化的 3-Hook 職責架構
3. 解決 4 項遺留技術債並聯防壓測漏洞
4. 實作拖曳建立節點、佈局切換（自由/放射狀）、純色背景、便利貼樣式
5. 實作登入用戶知識圖雲端同步（含衝突另存副本彈窗防護與斷網自動重試）
6. 支援概念節點引用外部圖片 URL（具安全性協議校驗與防禦）
7. 將知識圖從實驗模式正式畢業
8. 確保所有變更有對應的自動化測試驗證與向後相容防護

**Non-Goals:**
- 不實作多人即時協作（Realtime）
- 不實作檔案匯出（PDF/PNG/SVG）
- 不實作 Supabase Storage 圖片上傳與儲存（改為純網址引用，排除安全性與容量風險）
- 不引入新的佈局庫如 dagre 或 d3-hierarchy（僅使用自由排版與既有的放射狀佈局）
- 不修改 Quiz、Battle、Dashboard 等非知識圖模組
- 不實作知識圖分享/公開連結功能

## Decisions

### D1: 菱形節點渲染策略
**決策**：從 `rotate-45` + `-rotate-45` CSS 方案改為 `clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)` 方案。
**原因**：`rotate-45` 會導致整個盒模型旋轉，當文字較長時盒子被拉長成膠囊形。`clip-path` 只裁切外框為菱形，內容區域保持正常排版，文字可正常水平居中。

### D2: 逐步探索模式修復
**決策**：問題根因在於 `visibleNodes` memo 將 `expandLevel` 的預設值設為 `0`（`n.data.expandLevel ?? 0`），但在模式切換時未重置節點。
**修復方案**：在 `handleToggleReadingMode` 中，當切換為 `progressive` 時，將所有節點的 `expandLevel` 設為 `0`；同時確保 `readingMode` 正確注入到 `visibleNodes` 中。

### D3: 拖曳連接修復與拖曳建立節點
**決策**：利用 React Flow 的 `onConnectEnd` 回調，偵測連接線是否落在空白處。若是，使用 `screenToFlowPosition` 轉換座標，在該位置彈出 `DropNodeMenu` 浮動面板，選擇形狀（方形/圓角/菱形/便利貼）後在該位置建立新節點並自動建立連線與記錄 undo。

### D4: GraphEditor.tsx 拆分策略（合併版）
**決策**：為了避免 Hook 過於零碎化造成 Props Drilling 災難，僅拆分為 3 個職責清晰的核心 Hooks：

| Hook | 職責 | 說明 |
|------|------|------|
| `useGraphState` | 管理 nodes/edges CRUD、連接處理（onConnect/onConnectEnd）、歷史記錄 stack 與 undo/redo | 合併原 4 個 Hook (UndoRedo, NodeActions, Connection) 的狀態，避免狀態傳遞複雜度 |
| `useGraphCodeMode` | 管理 Markdown 代碼文字、解析錯誤與雙模式轉換，實作路徑複合鍵匹配 | 負責與橋接層的溝通 |
| `useGraphStorage` | 管理本地 autosave（visibility / beforeunload）、online 狀態、雲端同步與衝突處理 | 負責 I/O 儲存生命週期 |

### D5: Schema v3 遷移與安全 safeParse
**決策**：新增 `backgroundOpacity`（預設 translucent）、`layoutMode`（預設 free）與 `theme`（預設 default）到 `GraphDocument`（schemaVersion 3）。
**相容防護**：讀取時引進 Zod schema 的 `safeParse` 或型別守衛。若遇到 schema v3 資料，舊版 PWA 客戶端能平穩過濾未知欄位並賦予預設值，保障舊版客戶端不崩潰。

### D6: 錯誤碼系統取代硬編碼中文字串
**決策**：在 `types/graphTypes.ts` 新增 `GraphErrorCode` enum，在 `graphStorage.ts` 中返回 error code。UI 層負責翻譯 error code → 中文。

```typescript
export enum GraphErrorCode {
  PARSE_FAILED = 'PARSE_FAILED',
  INVALID_FORMAT = 'INVALID_FORMAT',
  MAX_GRAPHS_EXCEEDED = 'MAX_GRAPHS_EXCEEDED',
  MAX_NODES_EXCEEDED = 'MAX_NODES_EXCEEDED',
  MAX_EDGES_EXCEEDED = 'MAX_EDGES_EXCEEDED',
  MAX_STICKY_EXCEEDED = 'MAX_STICKY_EXCEEDED',
  TITLE_TOO_LONG = 'TITLE_TOO_LONG',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  SAVE_ERROR = 'SAVE_ERROR',
  DELETE_NOT_FOUND = 'DELETE_NOT_FOUND',
  DELETE_ERROR = 'DELETE_ERROR',
}
```

### D7: 祖先路徑（Ancestor Path）對照方案（無侵入與重命名級聯緩解）
**決策**：徹底廢除 `title:depth` 複合鍵，亦不採用在 Markdown 內嵌 HTML 註解 UUID 的侵入性設計，100% 保持 Markdown 的純淨。改用「祖先路徑（Ancestor Path）」複合鍵。
**實作與防護細節**：
1. 每個節點以其在樹狀結構中的完整路徑（如 `Root:Child:Grandchild`）作為匹配鍵。
2. 當代碼與視覺模式互轉時，系統計算出每個節點的 Ancestor Path。
3. 只要新解析的節點其路徑與原先一致，即可 100% 精準繼承自訂配色、形狀與字體大小等屬性。
4. **重命名級聯失效緩解（Heuristic Fallback）**：為解決在代碼模式手動修改父節點名稱導致子節點路徑全部失效的痛點：
   - **啟動 Heuristic 相似匹配**：當某路徑在舊資料中找不到時，比對「標題之編輯距離（Levenshtein distance）≤ 2 且深度與子樹層級相同」的節點（防範使用者在代碼模式手動改錯字、微調名稱時，視覺樣式與座標遭到全數重置）。
   - **UI 限制與溫馨提示**：在代碼編輯介面或說明中明確提示使用者：「在代碼模式下重命名父節點會導致其底下子節點的自訂顏色與形狀重設；建議在視覺模式下點擊節點直接進行重命名，以 100% 保留所有子分支之樣式。」
5. **重複路徑防禦**：若新解析的樹狀結構在同一分支下出現了完全同名的節點（重複路徑）：
   - **Fallback 策略**：退回解析順序的 first-match 策略，確保不發生重複 UUID 導致渲染崩潰。
   - **UI/Console 輕量警告**：解析時偵測到重複路徑，在 UI 上彈出輕量提示或在 console 印出警告，引導使用者微調命名以確保樣式繼承的唯一性。

### D8: 佈局模式切換
**決策**：提供「自由拖曳（Free）」與「放射狀佈局（Radial，使用既有 `radialLayout.ts` 演算法）」。剔除樹狀佈局（dagre 依賴），避免第三方排版庫造成的 package 體積與佈局衝突風險。

### D9: 簡化顏色模板與配色
**決策**：保留經典配色（經典藍/綠/橘/紅/紫/粉），提供工具列一鍵「重置預設配色」功能（依 BFS 層級為無自訂顏色的節點設色），不實作繁複的主題配色切換，簡化 UI 與狀態複雜度。

### D10: Supabase 雲端同步與雙向衝突防護
**決策**：
1. **資料表 `knowledge_graphs`**：僅存 JSON（不含圖片），以 `user_id` + `graph_id` 為主鍵。
2. **同步與衝突解決**：登入時自動同步。若本地與雲端的 `updatedAt` 不一致且兩端皆有修改時，系統彈出 `ConfirmDialog` 提示使用者手動選擇：「保留本地版本」、「採用雲端版本」或「另存新圖表」。選擇另存時，將本地版本另存為「圖表名稱 (衝突副本)」以防資料被無聲覆寫。
3. **外部圖片網址引用（安全校驗）**：於 `GraphNodeData` 新增 `imageUrl?: string`。支援貼入圖片網址。
   - **XSS 安全防禦**：對輸入的外部 URL 進行嚴格的協議限制，**僅允許 `http://` 與 `https://` 開頭**的安全網址。
   - 若偵測到其他協議（如 `javascript:` 偽協定），系統會將其拒絕並判定為無效圖片 URL，不渲染 `<img>` 標籤，徹底封鎖 XSS 漏洞與惡意劫持。
4. **自動重試與 online 監聽**：當同步失敗進入 `mindspark_dirty_graphs` 後，在 App 層級監聽 `online` 事件，當網路重連時自動觸發重新同步，無需重整網頁。

## Risks / Trade-offs

### R1: GraphEditor 重構可能引入回歸 Bug
**緩解**：簡化為 3 個核心 Hook。每次完成一個 Hook 拆分立即執行 `npm test` 和 `npm run build`。

### R2: Schema v3 遷移可能損壞既有資料
**緩解**：引進 Zod schema safeParse 及 fail-safe 預設值，保障舊版客戶端加載時不崩溃。

### R3: 雲端同步衝突
**緩解**：引進 `ConfirmDialog` 衝突處理，允許使用者「另存新圖表 (衝突副本)」，保證離線編輯的心血 100% 不會丟失。

### R4: 斷網狀態下同步失效
**緩解**：除了 localStorage 暫存外，透過 `window.addEventListener('online')` 實現自動重連同步。
