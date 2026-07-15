# Spec: Graph Editor Refactor

## Purpose
Define the modular editor boundaries, error-code contract, and non-invasive code/visual style preservation behavior.

### Requirement: GraphEditor modular hook decomposition
`GraphEditor.tsx` 的 `GraphEditorInner` 元件 SHALL 被重構為 3 個獨立的自訂 Hooks，每個 Hook 負責明確的領域。

#### Scenario: Hook 拆分完整性
- **WHEN** 重構完成
- **THEN** `GraphEditorInner` 元件本身 SHALL 僅包含 JSX 渲染和事件綁定邏輯（不超過 300 行）
- **AND** 以下 Hooks SHALL 各自存在於獨立檔案中：
  - `hooks/useGraphState.ts` (管理節點連線狀態、歷史歷史記錄與 undo/redo)
  - `hooks/useGraphCodeMode.ts` (管理 Markdown 原始代碼與畫布轉換)
  - `hooks/useGraphStorage.ts` (管理本地儲存、雲端同步與衝突另存)
- **AND** 每個 Hook 檔案 SHALL 不超過 150 行

#### Scenario: 重構後功能不變
- **WHEN** 重構完成
- **THEN** 所有既有的單元測試 SHALL 仍然通過
- **AND** `npm run build` SHALL 成功
- **AND** 所有既有的 UI 行為與重構前完全一致

### Requirement: Error code system
`graphStorage.ts` SHALL 使用 `GraphErrorCode` enum 取代硬編碼的中文字串作為 `MutationResult.error` 的值。

#### Scenario: 錯誤碼返回
- **GIVEN** 圖表操作觸發了驗證錯誤
- **WHEN** `saveGraph`、`deleteGraph` 或 `validateGraphDocument` 返回錯誤
- **THEN** `MutationResult.error` SHALL 為 `GraphErrorCode` enum值（例如 `'MAX_NODES_EXCEEDED'`）
- **AND** UI 層（`KnowledgeGraphWorkspace.tsx`）SHALL 負責將 error code 翻譯為使用者可見的中文訊息

### Requirement: Non-intrusive ancestor path mapping
`handleCodeChange` 中的節點屬性還原邏輯 SHALL 使用「祖先路徑（Ancestor Path）」複合鍵來匹配與映射節點，不往 Markdown 原始代碼中寫入任何 UUID。

#### Scenario: 代碼與視覺模式互轉路徑匹配
- **GIVEN** Markdown 代碼中包含同名節點，或使用者在代碼模式中修改了縮排層級
- **WHEN** 系統重新解析 Markdown 原始代碼並轉換回視覺圖表
- **THEN** 系統 SHALL 根據節點在樹狀結構中的完整路徑（如 `Root:Child:Grandchild`）計算出 Ancestor Path
- **AND** 當新解析節點的 Ancestor Path 與先前記錄匹配時，精準保留該節點的自訂顏色、形狀與字體大小等屬性
- **AND** 屬性 SHALL NOT 遺失或互相覆蓋
- **AND** Mermaid 或 Markdown 代碼中 SHALL 不包含任何 UUID 或雜亂註解，保障代碼純淨

#### Scenario: 重命名級聯失效防禦（Heuristic Match）
- **GIVEN** 使用者在代碼編輯器中手動微調或改錯字，修改了高層級父節點的名稱
- **WHEN** 切回視覺模式進行路徑比對時
- **THEN** 系統 SHALL 計算原路徑與新路徑的「編輯距離（Levenshtein distance）」
- **AND** 若編輯距離 ≤ 2 且節點深度與子樹層級相同，系統 SHALL 自動繼承舊節點的視覺樣式與座標，防範整棵子樹排版無預警被全部重設
- **AND** 系統 SHALL 在代碼編輯 UI 旁明確顯示提示：「重命名父節點會重設其子分支樣式；建議在視覺編輯中重命名以保留樣式。」

#### Scenario: 重複路徑與破損容錯
- **GIVEN** 新解析的樹狀結構在同一分支下出現了完全同名的節點（重複路徑）
- **WHEN** 系統進行屬性映射對照
- **THEN** 系統 SHALL 退回解析順序的 first-match 策略來分配自訂屬性
- **AND** 系統 SHALL 自動產生全新 UUID 分配給每個節點，防止重複 UUID 導致 Key 衝突崩潰
- **AND** 系統 SHALL 於解析到重複路徑時在 UI 上彈出輕量提示或在 console 輸出警告，引導使用者微調命名以確保樣式繼承的唯一性

### Requirement: Code mode color preservation policy
當使用者在程式碼模式修改節點結構後切回視覺模式時，系統 SHALL 保留使用者自訂的顏色。

#### Scenario: 保留自訂顏色
- **GIVEN** 使用者手動將節點 A 設為紅色
- **WHEN** 使用者切換到代碼模式，修改節點 A 的子項目後切回
- **THEN** 節點 A 的顏色 SHALL 仍為紅色
- **AND** 只有新產生的節點 SHALL 套用預設配色

## Verification
- 單元測試：驗證拆分後的 3 個 Hook 獨立功能
- 單元測試：驗證 `GraphErrorCode` enum 在 graphStorage 中的使用
- 單元測試：驗證無侵入 Ancestor Path 與 Heuristic 編輯距離匹配對照，確認微調名稱及層級變更下自訂屬性 100% 保留且不污染代碼
- `npx tsc --noEmit` 零錯誤
- `npm run build` 通過
- `npm test` 通過

