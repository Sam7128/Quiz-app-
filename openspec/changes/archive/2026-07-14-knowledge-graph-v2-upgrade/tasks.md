> 2026-07-14 audit recovery：逐項重做並驗證本計畫；上方已完成項目均以實際程式碼、單元測試、build 與本地 Playwright UI smoke test 複核。knip 僅剩既有專案項目，無本輪知識圖新增死碼。

## 1. 型別系統與 Schema v3 升級
 
- [x] 1.1 在 `types/graphTypes.ts` 中新增 `GraphErrorCode` enum（包含所有驗證錯誤碼：`PARSE_FAILED`, `INVALID_FORMAT`, `MAX_GRAPHS_EXCEEDED`, `MAX_NODES_EXCEEDED`, `MAX_EDGES_EXCEEDED`, `MAX_STICKY_EXCEEDED`, `TITLE_TOO_LONG`, `DEFINITION_TOO_LONG`, `DETAILS_TOO_LONG`, `EDGE_LABEL_TOO_LONG`, `NOTES_TOO_LONG`, `STICKY_TEXT_TOO_LONG`, `QUOTA_EXCEEDED`, `SAVE_ERROR`, `DELETE_NOT_FOUND`, `DELETE_ERROR`）
- [x] 1.2 在 `types/graphTypes.ts` 的 `GraphDocument` 介面新增三個欄位：`backgroundOpacity: 'translucent' | 'solid'`、`layoutMode: 'free' | 'radial'`、`theme: string`。更新 `GRAPH_LIMITS.SCHEMA_VERSION` 為 `3`。
- [x] 1.3 在 `types/graphTypes.ts` 的 `GraphNodeData` 介面新增 `imageUrl?: string` 欄位（用於引用外部圖片網址）
- [x] 1.4 更新 `MutationResult` 介面的 `error` 欄位型別為 `GraphErrorCode | undefined`
- [x] 1.5 **驗證**：執行 `npx tsc --noEmit`，確認無型別編譯錯誤。此步驟會暫時產生 `graphStorage.ts` 的型別錯誤，將在 Task 2 中修復。
 
## 2. graphStorage.ts 錯誤碼與 Schema v3 向前相容遷移
 
- [x] 2.1 將 `graphStorage.ts` 中所有 `return { success: false, error: '...' }` 的中文字串替換為對應的 `GraphErrorCode` enum 值。
- [x] 2.2 在 `getGraphs()` 函式中引入防護：使用 safeParse 或手動型別守衛過濾資料。若遇到包含 v3 新屬性的資料，舊版 PWA 代碼載入時應能安全忽略，不致崩潰。同時在讀取時執行自動遷移：若 `graph.schemaVersion < 3`，自動補充預設值 `backgroundOpacity: 'translucent'`、`layoutMode: 'free'`、`theme: 'default'`，設定 `schemaVersion: 3`。
- [x] 2.3 更新 `createNewGraph()` 函式：新建圖表時預設包含 `backgroundOpacity: 'translucent'`、`layoutMode: 'free'`、`theme: 'default'`、`schemaVersion: 3`。
- [x] 2.4 更新 `graphStorage.test.ts`：將所有斷言中的中文字串替換為 `GraphErrorCode` enum。新增 v2 → v3 遷移與相容性測試案例。
- [x] 2.5 **驗證**：執行 `npx tsc --noEmit` + `npm test -- --run` 所有 graphStorage 測試通過。
 
## 3. 簡化經典配色重設工具
 
- [x] 3.1 於 `utils/graphColorHelper.ts` 中實作一個簡單的 BFS 層級配色重設工具 `resetClassicNodeColors(nodes, edges)`。此工具根據節點的 BFS 深度，自動將無手動自訂顏色的概念節點重設為經典配色（經典藍/綠/橘/紅/紫/粉），有手動自訂顏色者保持原樣。
- [x] 3.2 **驗證**：執行 `npx tsc --noEmit` 零錯誤。
 
## 4. GraphEditor.tsx 重構（精簡至 3 個 Hooks）
 
> ⚠️ **重要**：此階段每完成一個 Hook 的拆分，必須立即執行 `npm run build` 和 `npm test -- --run` 確認零回歸。
 
- [x] 4.1 建立 `hooks/useGraphState.ts`：合併原本零碎的 state。管理 nodes/edges CRUD、連線處理（`onConnect`/`onConnectEnd`）、歷史歷史記錄 stack 與 `handleUndo`/`handleRedo`。接收必要 React Flow callback，返回 `{ nodes, edges, setNodes, setEdges, handleUndo, handleRedo, handleAddNode, handleAddSticky, handleDeleteSelected, handleUpdateNodeData, handleUpdateNodeType, onConnect, onConnectEnd }`。
- [x] 4.2 **驗證 4.1**：`npm run build` 成功 + `npm test -- --run` 所有測試通過。
- [x] 4.3 建立 `hooks/useGraphStorage.ts`：管理本地 autosave debounce、beforeunload、visibility change 監聽，並整合 Supabase 雲端同步與雙向衝突另存副本機制。
- [x] 4.4 **驗證 4.3**：`npm run build` 成功 + `npm test -- --run` 所有測試通過。
- [x] 4.5 建立 `hooks/useGraphCodeMode.ts`：管理 Markdown 原始代碼與畫布狀態的互轉，以及 Mermaid 匯出。
  - **核心匹配與重命名級聯防護**：實作無侵入「祖先路徑（Ancestor Path）」匹配。
  - 1. 當代碼與視覺模式互轉時，系統計算出節點的樹狀路徑（如 `Root:Child:Grandchild`）作為匹配鍵。
  - 2. **實作 Heuristic 相似匹配**：若路徑不匹配，進行模糊匹配檢測（當深度相同且「節點標題編輯距離 Levenshtein distance <= 2」時，將舊節點樣式繼承至新節點，緩解手動改錯字時的屬性重設）。
  - 3. **重複路徑防範**：若新解析的樹狀結構在同一分支下出現了完全同名的節點，退回解析順序的 first-match 策略，並在 console 或 UI 上發出輕量警告。不往 Markdown 中寫入任何 UUID，確保代碼純淨。
- [x] 4.6 更新 `markdownGraphBridge.ts` 與 `markdownGraphBridge.test.ts`：更新 markdown 橋接器。補充相關測試案例，驗證同名與縮排層級變動下，透過祖先路徑與 Heuristic 相似匹配方式自訂屬性 100% 保留。
- [x] 4.7 **驗證 4.5-4.6**：`npm run build` 成功 + `npm test -- --run` 所有測試通過。
- [x] 4.8 瘦身 `GraphEditor.tsx`，使其行數在 300 行以內，主要負責 UI 元件佈局與事件綁定，邏輯全權委託上述 3 個 Hooks。
- [x] 4.9 **最終驗證**：`npx tsc --noEmit` 零錯誤 + `npm run build` 成功 + `npm test -- --run` 全部通過。
 
## 5. Bug 修復
 
- [x] 5.1 **修復菱形節點變形**：在 `ConceptNode.tsx` 中，將 `diamond` 的渲染從 `rotate-45 rounded-[1.25rem]` 改為 `clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)`。移除 `contentClassName` 中的 `-rotate-45`。確認 Handle 位置（top/bottom）在菱形的頂點 and 底部頂點。調整 `min-w` 和 padding 使菱形內部文字正確居中。
- [x] 5.2 **驗證 5.1**：`npm run build` 成功。手動或 E2E 截圖驗證菱形渲染正確。
- [x] 5.3 **修復逐步探索模式**：當 `readingMode` 從 `'expand-all'` 切換為 `'progressive'` 時，將所有概念節點的 `expandLevel` 重置為 `0`。
- [x] 5.4 更新 `readingModes.test.ts`：新增測試案例驗證切換為 progressive 模式後 `expandLevel` 被重置為 0。
- [x] 5.5 **驗證 5.3-5.4**：`npm test -- --run` 所有 readingModes 測試通過。
- [x] 5.6 **修復節點間拖曳連接**：確認 React Flow Handles 正確綁定 `type="source"` and `type="target"`。
 
## 6. 新功能實作：拖曳建立節點
 
- [x] 6.1 建立 `components/KnowledgeGraph/DropNodeMenu.tsx`：浮動形狀選單元件，包含方形、圓角、菱形、便利貼按鈕。使用絕對定位。
- [x] 6.2 完善 `useGraphState.ts` 中的 `onConnectEnd` 實作：
  - 檢查放開位置是否為 handle 元素，若非 handle，使用 `screenToFlowPosition` 計算畫布座標。
  - 觸發顯示 `DropNodeMenu`，使用者選取形狀後在該座標建立節點並自動連線與記錄 undo。
- [x] 6.3 **驗證**：`npm run build` 成功 + `npm test -- --run` 通過。
 
## 7. 新功能實作：視覺效果增強（背景與自由/放射佈局）
 
- [x] 7.1 **純色背景切換**：
  - 在 `GraphToolbar.tsx` 新增「背景模式」切換按鈕。
  - `ConceptNode.tsx` 根據 `backgroundOpacity` 決定背景不透明度：`translucent` 為 `${color}15`（約 8%），`solid` 為 `${color}CC`（約 80%）。
- [x] 7.2 **佈局切換與配色工具**：
  - 在 `GraphToolbar.tsx` 新增佈局切換按鈕（自由/放射狀）。
  - 新增「經典配色重設」按鈕，點擊時呼叫 `resetClassicNodeColors` 並記錄 undo。
  - 放射狀佈局使用現有的 `radialLayout.ts` 演算法，不額外引進第三方佈局庫。
- [x] 7.3 **驗證**：`npm run build` 成功 + `npm test -- --run` 通過。
 
## 8. 新功能實作：便利貼文字樣式與外部圖片網址安全引用
 
- [x] 8.1 **便利貼樣式**：在 `StickyNoteNode.tsx` 中新增基本文字格式控制（字體大小 `'sm' | 'md' | 'lg'` 及粗體樣式），存於節點 `data.fontSize` 與 `data.bold` 中。
- [x] 8.2 **外部圖片引用與安全驗證**：在 `NodeEditPanel.tsx` 屬性編輯面板中新增「外部圖片網址」輸入框。
  - 實作安全過濾：當貼入 URL 時，進行嚴格防禦性協議檢測，**僅允許以 `http://` 或 `https://` 開頭**的網址。
  - 對不符合協議的非法 URL（如 `javascript:` 偽協定），系統應將其標記為無效、提示使用者，並不寫入 `GraphNodeData` 也不予以渲染。
- [x] 8.3 在 `ConceptNode.tsx` 中：若 `data.imageUrl` 存在且通過協議安全檢驗，在標題下方以 `<img>` 顯示圖片（最大寬度 120px，防止撐開節點）。
- [x] 8.4 **驗證**：`npm run build` 成功 + `npm test -- --run` 通過。
 
## 9. Supabase 雲端儲存與衝突另存新檔整合
 
- [x] 9.1 建立 `services/graphCloudStorage.ts`，實作登入用戶的知識圖 JSON 同步：
  - 比對本地與雲端，使用 LWW 裁決。
  - 同步失敗時記錄到 `mindspark_dirty_graphs`（dirty fallback 機制）。
- [x] 9.2 在 `useGraphStorage` 中實作雙向衝突解決：
  - 當同步檢測到本地與雲端 `updatedAt` 不一致且兩端皆有修改時，彈出系統 `ConfirmDialog` 詢問使用者。
  - 若選擇「另存新圖表」，則複製一份本地圖表，將其名稱命名為「圖表名稱 (衝突副本)」，以新 UUID 儲存並寫入 localStorage 與 Supabase，保留使用者的本地修改成果不被覆寫。
- [x] 9.3 實作 online 監聽與自動重試：
  - 在 `KnowledgeGraphWorkspace.tsx` 或 `AppContent.tsx` 中監聽 `window.addEventListener('online')`。
  - 當網路從斷開恢復為連線時，自動重新觸發 `syncGraphsToCloud` 同步 dirty graphs。
- [x] 9.4 建立 `graphCloudStorage.test.ts`，測試衝突解決彈窗另存、LWW 與 dirty 同步。
- [x] 9.5 **驗證**：`npx tsc --noEmit` 零錯誤 + `npm run build` 成功 + `npm test -- --run` 通過。
 
## 10. 正式推出：移除 Beta 閘門
 
- [x] 10.1 修改 `components/KnowledgeGraph/KnowledgeGraphWorkspace.tsx`：移除 `isEnabled` betaFeatures 限制。
- [x] 10.2 修改 `components/AppContent.tsx`、`AppHeader.tsx`、`MobileNav.tsx` 移除 `betaFeatures.knowledgeGraph` 判斷。
- [x] 10.3 修改 `components/Settings.tsx` 移除知識圖 beta toggle 的 UI。
- [x] 10.4 更新 `betaFeatureToggle.test.ts`。
- [x] 10.5 **驗證**：`npm run build` 成功 + `npm test -- --run` 全部通過。
 
## 11. 顏色與樣式還原規則修正
 
- [x] 11.1 在 `hooks/useGraphCodeMode.ts` 中，確認雙模式轉換時，只要新解析節點的完整祖先路徑（Ancestor Path）或 Heuristic 相似路徑與先前記錄匹配，必定 100% 還原節點的 `color`、`fontSize`、`shape` 等自訂屬性。
- [x] 11.2 在 `useGraphCodeMode.ts` 的代碼編輯 UI 旁，實作一項溫馨提示：「在代碼模式下重命名父節點會導致子節點樣式重置；建議於視覺編輯面板中重命名節點以保留樣式。」
- [x] 11.3 更新 `openspec/specs/knowledge-graph-editor/spec.md`：補充說明「代碼與視覺模式互轉，藉由無侵入式祖先路徑與 Heuristic 相似路徑匹配精準保留樣式，及 UI 重命名提示」之規格設計。
- [x] 11.4 **驗證**：`npm test -- --run` 所有橋接測試通過。
 
## 12. 文檔與記憶更新
 
- [x] 12.1 更新 `docs/DEVELOPMENT_LOG.md` 記錄變更。
- [x] 12.2 更新 `MEMORY.md` 知識圖正式推出與祖先路徑與 Heuristic 匹配、同步衝突防護等事實。
- [x] 12.3 更新對應的各個 `spec.md` 規格。
 
## 13. 最終驗證
 
- [x] 13.1 執行 `npx tsc --noEmit` 確認無型別錯誤。
- [x] 13.2 執行 `npm run build` 確保編譯通過。
- [x] 13.3 執行 `npm test -- --run` 全部通過。
- [x] 13.4 執行 `npx -y knip --reporter compact` 確認無本輪新增死碼（輸出僅含既有專案 dead-code／unlisted dependency）。
- [x] 13.5 手動驗證：
  - 菱形節點 clip-path 渲染正確，Handle 定位無變形。
  - 切換至代碼模式，修改代碼後切回，自訂顏色、樣式 100% 保留。
  - 連線端拖曳至空白處彈出 shape 選單，點擊正常建立節點與連線。
  - 背景切換 translucent/solid 清晰可見。
  - 配色工具一鍵重設。
  - 同步衝突彈窗與另存副本功能正常。
  - online 自動重新同步 dirty 項目。
  - 外部圖片 URL 貼入安全過濾，僅允許 http/https 開頭，防禦 XSS。
  - 於代碼編輯旁顯示重命名溫馨提示。
  - 本地 Playwright UI smoke：訪客建立圖表、非法圖片 URL 即時攔截、DropNodeMenu 四形狀流程與自動連線均通過。

## 14. V2 審計收尾修正

- [x] 14.1 將 5 個 delta specs 同步建立至 `openspec/specs/` 對應 capability。
- [x] 14.2 將過時 V1 audit/stress 報告封存至 `docs/audits/knowledge-graph-v2-upgrade/`，保留原文與索引。
- [x] 14.3 將 Mermaid 匯入改用 `applyAutoLayout`；保留 deprecated alias、移除 dead `setCodeErrors`、加入 shape type guard 與 line-number memoization。
- [x] 14.4 將衝突 resolver adapter 放入 `useGraphStorage`，補足 Hook 職責；保留 schema 相容欄位的升級觸發註記。
- [x] 14.5 完成 tsc、完整測試、build、knip、OpenSpec 狀態與工作樹驗證。
