## ADDED Requirements

### Requirement: Graph data model definition
系統 SHALL 定義 `GraphDocument`、`GraphNode`、`GraphEdge`、`GraphViewState` 四個核心型別，作為知識圖的主資料結構。GraphDocument SHALL 包含唯一 id（UUID）、名稱、節點陣列、邊陣列、視圖狀態、建立時間和更新時間。

#### Scenario: GraphDocument 型別完整性
- **WHEN** 開發者建立一個新的 GraphDocument 物件
- **THEN** 物件 MUST 包含 id (string)、name (string)、nodes (GraphNode[])、edges (GraphEdge[])、viewState (GraphViewState)、createdAt (string)、updatedAt (string) 所有欄位

#### Scenario: GraphNode 型別包含三層內容
- **WHEN** 建立一個 GraphNode
- **THEN** node.data MUST 包含 title (string, 必填)、definition (string, 選填)、details (string, 選填)、color (string)、fontSize ('sm' | 'md' | 'lg')

### Requirement: Graph localStorage persistence
系統 SHALL 將所有圖表資料儲存於 localStorage key `mindspark_graphs`，格式為 JSON 序列化的 `GraphDocument[]`。

#### Scenario: 儲存圖表至 localStorage
- **WHEN** 使用者建立或修改一個圖表
- **THEN** 系統 SHALL 將完整的 GraphDocument 序列化為 JSON 並寫入 `mindspark_graphs` key

#### Scenario: 從 localStorage 載入圖表
- **WHEN** 使用者進入知識圖工作區
- **THEN** 系統 SHALL 從 `mindspark_graphs` key 讀取並反序列化所有 GraphDocument

#### Scenario: localStorage 不存在或損毀
- **WHEN** `mindspark_graphs` key 不存在或 JSON 解析失敗
- **THEN** 系統 SHALL 返回空陣列 `[]` 且不拋出錯誤

### Requirement: Graph CRUD operations
系統 SHALL 提供完整的圖表 CRUD 操作：建立、讀取、更新、刪除。

#### Scenario: 建立新圖表
- **WHEN** 使用者點擊「新增圖表」按鈕
- **THEN** 系統 SHALL 建立一個包含預設名稱、空節點陣列、空邊陣列的新 GraphDocument，並持久化至 localStorage

#### Scenario: 刪除圖表
- **WHEN** 使用者確認刪除一個圖表
- **THEN** 系統 SHALL 從 `mindspark_graphs` 中移除該 GraphDocument 並更新 localStorage

#### Scenario: 圖表數量上限
- **WHEN** 使用者嘗試建立超過 20 個圖表
- **THEN** 系統 SHALL 提示使用者已達上限，建議刪除舊圖表

### Requirement: Autosave mechanism
系統 SHALL 在每次圖表操作後自動儲存，使用 debounce 策略（2 秒延遲）避免頻繁寫入。

#### Scenario: 操作後自動儲存
- **WHEN** 使用者新增、移動、編輯或刪除節點/連線
- **THEN** 系統 SHALL 在 2 秒無新操作後自動將當前圖表狀態寫入 localStorage

#### Scenario: 離開頁面前立即儲存
- **WHEN** 使用者切換 view 或關閉瀏覽器分頁
- **THEN** 系統 SHALL 立即（不等待 debounce）將當前狀態寫入 localStorage

### Requirement: System nuke integration
系統清除（nuke）功能 SHALL 包含清除 `mindspark_graphs` key。

#### Scenario: 系統清除時刪除圖表資料
- **WHEN** 使用者執行系統清除操作
- **THEN** `mindspark_graphs` key SHALL 被從 localStorage 中移除

### Requirement: Graph document rename
系統 SHALL 允許使用者重新命名已建立的圖表文件。

#### Scenario: 重命名圖表
- **WHEN** 使用者在文件清單中雙擊圖表名稱或點擊重命名按鈕
- **THEN** 系統 SHALL 顯示內嵌文字編輯器，允許修改圖表名稱並持久化

#### Scenario: 名稱長度限制
- **WHEN** 使用者輸入超過 50 個字元的圖表名稱
- **THEN** 系統 SHALL 截斷至 50 個字元

### Requirement: Text field length limits
系統 SHALL 對節點內容欄位設定最大長度限制，防止 localStorage 膨脹。

#### Scenario: 標題長度限制
- **WHEN** 使用者輸入超過 100 個字元的節點標題
- **THEN** 系統 SHALL 阻止輸入或截斷至 100 個字元

#### Scenario: 定義長度限制
- **WHEN** 使用者輸入超過 500 個字元的節點定義
- **THEN** 系統 SHALL 阻止輸入或截斷至 500 個字元

#### Scenario: 補充長度限制
- **WHEN** 使用者輸入超過 2000 個字元的節點補充說明
- **THEN** 系統 SHALL 阻止輸入或截斷至 2000 個字元

### Requirement: localStorage quota handling
系統 SHALL 妥善處理 localStorage 配額超限的情況。

#### Scenario: 儲存時空間不足
- **WHEN** 儲存圖表時觸發 `QuotaExceededError`（透過 `DOMException.name === 'QuotaExceededError'` 或 legacy `DOMException.code === 22` 偵測）
- **THEN** 系統 SHALL 捕捉錯誤、顯示 Toast 警告使用者儲存空間已滿，建議刪除舊圖表
