## MODIFIED Requirements

### Requirement: Node content editing
系統 SHALL 允許使用者直接在節點上編輯文字內容，支援三層內容結構。

**新增行為 (H2 修復)**：`NodeEditPanel` 的 debounce 更新邏輯 SHALL 在 `nodeId` 變更或組件卸載時，利用 React `useEffect` cleanup 閉包天然捕獲當前 `nodeId` 的特性，將該節點的 pending 更新立即 flush 出去（調用 `onUpdate(nodeId, pendingData)`），然後清除定時器並重置 `pendingUpdateRef` 為空。此防護確保快速切換節點與關閉面板時不會發生跨節點資料覆寫或遺失。

#### Scenario: 編輯節點標題
- **WHEN** 使用者雙擊一個節點
- **THEN** 系統 SHALL 顯示內嵌文字編輯器，允許修改標題（Level 1）

#### Scenario: 編輯節點詳細內容
- **WHEN** 使用者在節點屬性面板中編輯
- **THEN** 使用者 SHALL 能修改定義（Level 2）和補充說明（Level 3）

#### Scenario: 快速切換節點時 flush pending 更新
- **WHEN** 使用者在節點 A 輸入文字後快速切換至節點 B（debounce 尚未觸發）
- **THEN** 系統 SHALL 透過 cleanup 閉包立即將節點 A 的 pending 更新 flush 至 `onUpdate(nodeA.id, pendingData)`
- **AND** 系統 SHALL 清除節點 A 的 debounce 定時器
- **AND** 系統 SHALL 重置 `pendingUpdateRef` 為空物件
- **AND** 節點 B 的後續輸入 SHALL 不受節點 A 的 pending 資料影響

#### Scenario: 組件卸載時 flush pending 更新
- **WHEN** `NodeEditPanel` 因使用者取消選中節點而卸載
- **AND** 存在尚未 flush 的 pending 更新
- **THEN** 系統 SHALL 在卸載前 flush 最後的 pending 更新至該節點
- **AND** 系統 SHALL 清除 debounce 定時器

#### Scenario: 瀏覽器或分頁關閉時透過 beforeunload flush pending 更新
- **WHEN** 使用者在 `NodeEditPanel` 編輯節點文字且尚在 debounce 延遲內
- **AND** 使用者突然關閉瀏覽器分頁或重新載入頁面（觸發 `beforeunload` 事件）
- **THEN** 系統 SHALL 在頁面銷毀前立即將 `pendingUpdateRef` 中的最新編輯內容 flush 至 `onUpdate(nodeId, ...)`
- **AND** 防止因直接關閉分頁而遺失未儲存的節點文字

### Requirement: Code/visual mode style preservation
代碼與視覺模式互轉 SHALL 以完整祖先路徑（使用 `:` 分隔）匹配節點，並在路徑失配時以 Levenshtein 距離 ≤ 2、同深度的 heuristic 匹配。匹配 SHALL 保留位置、顏色、形狀、字體、圖片與邊樣式；Markdown SHALL 不包含 UUID。

**新增行為 (M1 修復)**：`useGraphCodeMode` 的 `handleToggleEditMode` SHALL 在存在語法錯誤時在 Hook 底層硬阻斷切換回 Visual 模式，並返回 `canSwitchToVisual: boolean` 標誌（值為 `codeErrors.length === 0`）。當存在語法錯誤時，`GraphToolbar` 中的模式切換按鈕 SHALL 被禁用（`disabled`），並在使用者嘗試點擊時顯示 Toast 警告「請先修正語法錯誤再切換模式」。此雙重守衛（Hook 底層防護 + UI 按鈕禁用）避免語法錯誤的代碼因快捷鍵或外部調用繞過而被舊的 Visual state 覆蓋。

#### Scenario: 父節點重命名提示
- **WHEN** 使用者在代碼模式編輯圖表
- **THEN** UI SHALL 顯示「重命名父節點會重設其子分支樣式；建議在視覺編輯中重命名以保留樣式。」提示

#### Scenario: 語法錯誤阻擋切換至 Visual 模式（Hook 與 UI 雙層阻斷）
- **WHEN** 使用者在 Code 模式中的 Markdown 存在語法錯誤（`codeErrors.length > 0`）
- **AND** 使用者嘗試透過 UI 點擊或直接呼叫 `handleToggleEditMode` 切換至 Visual 模式
- **THEN** 模式切換按鈕 SHALL 處於 disabled 狀態
- **AND** `handleToggleEditMode` SHALL 在底層提前 return 阻斷切換
- **AND** 系統 SHALL 顯示 Toast 訊息「請先修正語法錯誤再切換模式」
- **AND** 模式 SHALL 保持在 Code 模式，不執行切換

#### Scenario: 語法錯誤修正後可切換
- **WHEN** 使用者修正了 Code 模式中的所有語法錯誤（`codeErrors.length === 0`）
- **THEN** `canSwitchToVisual` SHALL 為 `true`
- **AND** 模式切換按鈕 SHALL 變為可點擊狀態
- **AND** `handleToggleEditMode` SHALL 允許切換至 Visual 模式
