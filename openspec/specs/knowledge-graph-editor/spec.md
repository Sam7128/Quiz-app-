# Spec: Knowledge Graph Editor

## Purpose
Provide a highly interactive, visual interface for students to construct and manipulate knowledge diagrams using a node-and-link canvas metaphor.

## ADDED Requirements

### Requirement: Visual node editor canvas
系統 SHALL 提供基於 @xyflow/react 的視覺化節點編輯器畫布，支援節點拖曳、縮放、平移操作。畫布 SHALL 使用受控模式 (Controlled Mode) 與 React state 整合。

#### Scenario: 畫布基本互動
- **WHEN** 使用者進入知識圖工作區的編輯模式
- **THEN** 系統 SHALL 顯示一個可縮放、可平移的畫布，已存在的節點和連線 SHALL 正確渲染

#### Scenario: 節點拖曳
- **WHEN** 使用者在桌面端拖曳一個節點
- **THEN** 節點 SHALL 跟隨滑鼠移動，並在放開後更新座標位置

### Requirement: Node CRUD via toolbar
系統 SHALL 提供工具列按鈕讓使用者新增和刪除節點。新增的節點 SHALL 出現在畫布中央可見區域。

#### Scenario: 新增節點
- **WHEN** 使用者點擊工具列的「新增節點」按鈕
- **THEN** 系統 SHALL 在畫布可見區域中央建立一個新節點，預設標題為「新概念」，預設顏色為藍色

#### Scenario: 刪除選中節點
- **WHEN** 使用者選中一個節點並點擊「刪除」按鈕或按 Delete 鍵
- **THEN** 系統 SHALL 刪除該節點及其所有連線

### Requirement: Edge creation and deletion
系統 SHALL 支援透過拖曳方式在兩個節點間建立連線，連線預設帶方向箭頭。系統 SHALL 禁止自連線（節點連向自身）。

#### Scenario: 建立帶箭頭連線
- **WHEN** 使用者從一個節點的連接點拖曳到另一個節點
- **THEN** 系統 SHALL 建立一條從源節點指向目標節點的帶箭頭連線

#### Scenario: 禁止自連線
- **WHEN** 使用者嘗試將一個節點的連接點拖曳到同一個節點
- **THEN** 系統 SHALL 阻止連線建立，不產生自連線

#### Scenario: 切換連線箭頭
- **WHEN** 使用者選中一條連線
- **THEN** 系統 SHALL 提供選項切換箭頭方向或移除箭頭

#### Scenario: 刪除連線
- **WHEN** 使用者選中一條連線並按 Delete 鍵執行刪除按鈕
- **THEN** 系統 SHALL 刪除該連線

### Requirement: Node content editing
系統 SHALL 允許使用者直接在節點上編輯文字內容，支援三層內容結構。

#### Scenario: 編輯節點標題
- **WHEN** 使用者雙擊一個節點
- **THEN** 系統 SHALL 顯示內嵌文字編輯器，允許修改標題（Level 1）

#### Scenario: 編輯節點詳細內容
- **WHEN** 使用者在節點屬性面板中編輯
- **THEN** 使用者 SHALL 能修改定義（Level 2）和補充說明（Level 3）

### Requirement: Node style customization
系統 SHALL 提供節點樣式自訂功能，包括顏色和字體大小。

#### Scenario: 修改節點顏色
- **WHEN** 使用者在屬性面板中選擇新顏色
- **THEN** 節點背景色 SHALL 立即更新為選定顏色

#### Scenario: 修改節點字體大小
- **WHEN** 使用者在屬性面板中切換字體大小（小/中/大）
- **THEN** 節點文字大小 SHALL 立即更新

#### Scenario: 便利貼文字樣式
- **WHEN** 使用者調整便利貼字體大小或粗體
- **THEN** 系統 SHALL 將設定儲存在 `data.fontSize` 與 `data.bold`，並立即套用至便利貼文字

#### Scenario: 外部圖片網址安全驗證
- **WHEN** 使用者在屬性面板輸入圖片網址
- **THEN** 系統 SHALL 僅接受具有 hostname 的 `http://` 或 `https://` URL
- **AND** 非法 URL SHALL 即時顯示警告，不寫入 GraphNodeData，也不渲染圖片

### Requirement: Drag-to-create node menu
使用者從 handle 將連線拖至空白畫布時，系統 SHALL 顯示包含方形、圓角、菱形、便利貼的 DropNodeMenu。

#### Scenario: 空白處建立節點
- **WHEN** 使用者選擇 DropNodeMenu 的形狀
- **THEN** 系統 SHALL 於 `screenToFlowPosition` 對應位置建立節點、建立帶箭頭連線並記錄 undo
- **AND** 達到 MAX_NODES 或 MAX_EDGES 時 SHALL 顯示警告並阻止變更

#### Scenario: 關閉 DropNodeMenu
- **WHEN** 使用者點擊選單外部或按 Escape
- **THEN** 系統 SHALL 關閉選單且不建立節點

### Requirement: Layout and visual theme modes
系統 SHALL 提供 `free` 與 `radial` 兩種佈局模式、背景 `translucent`/`solid` 切換與經典 BFS 配色重設。放射狀佈局 SHALL 使用既有演算法，並保留便利貼位置；自訂顏色 SHALL 不被重設。

#### Scenario: 佈局模式切換
- **WHEN** 使用者切換至 radial
- **THEN** 系統 SHALL 重新排列概念節點、保留便利貼位置、更新 `GraphDocument.layoutMode` 並記錄 undo
- **WHEN** 使用者切回 free
- **THEN** 系統 SHALL 保留目前位置並允許自由拖曳

#### Scenario: 暗色模式預設純色背景
- **WHEN** 新建圖表且 `<html>` 具有 `dark` class
- **THEN** `backgroundOpacity` SHALL 預設為 `solid`

### Requirement: Code/visual mode style preservation
代碼與視覺模式互轉 SHALL 以完整祖先路徑（使用 `:` 分隔）匹配節點，並在路徑失配時以 Levenshtein 距離 ≤ 2、同深度的 heuristic 匹配。匹配 SHALL 保留位置、顏色、形狀、字體、圖片與邊樣式；Markdown SHALL 不包含 UUID。

#### Scenario: 父節點重命名提示
- **WHEN** 使用者在代碼模式編輯圖表
- **THEN** UI SHALL 顯示「重命名父節點會重設其子分支樣式；建議在視覺編輯中重命名以保留樣式。」提示

### Requirement: Edge label editing
系統 SHALL 允許使用者為連線添加文字標籤。

#### Scenario: 添加連線標籤
- **WHEN** 使用者雙擊一條連線
- **THEN** 系統 SHALL 顯示文字輸入框，允許輸入連線標籤文字

### Requirement: Toolbar design
工具列 SHALL 採用極簡設計，僅包含核心操作按鈕，避免資訊過載。工具列 SHALL 在手機端隱藏。

#### Scenario: 桌面端工具列顯示
- **WHEN** 使用者在桌面端（螢幕寬度 > 768px）進入編輯模式
- **THEN** 工具列 SHALL 顯示以下按鈕：新增節點、刪除選中、連線模式切換、匯入 Mermaid、匯出 Mermaid

#### Scenario: 手機端隱藏工具列
- **WHEN** 使用者在手機端（螢幕寬度 ≤ 768px）瀏覽知識圖
- **THEN** 編輯工具列 SHALL 隱藏，僅顯示閱讀模式切換按鈕

### Requirement: Mobile read-only enforcement
手機端（≤768px）SHALL 在 mutation layer 層面強制唯讀，不僅僅是隱藏 UI。

#### Scenario: 手機端禁止節點拖曳
- **WHEN** 使用者在手機端嘗試拖曳節點
- **THEN** 節點 SHALL 保持原位不移動（`nodesDraggable: false`）

#### Scenario: 手機端禁止連線操作
- **WHEN** 使用者在手機端嘗試從節點 handle 拖曳建立連線
- **THEN** 系統 SHALL 不啟動連線建立（`nodesConnectable: false`）

#### Scenario: 手機端禁止刪除操作
- **WHEN** 使用者在手機端按 Delete 鍵
- **THEN** 系統 SHALL 忽略刪除操作（`elementsSelectable: false` 或攔截 delete handler）

#### Scenario: 手機端禁止雙擊編輯
- **WHEN** 使用者在手機端雙擊節點或連線
- **THEN** 系統 SHALL 不進入編輯模式（不顯示文字輸入框或屬性面板）

#### Scenario: 手機端允許的操作
- **WHEN** 使用者在手機端操作知識圖
- **THEN** 系統 SHALL 允許：pan（平移）、pinch-zoom（縮放）、切換閱讀模式、點擊節點展開內容（逐步探索模式）

### Requirement: Properties panel progressive disclosure
屬性面板 SHALL 採用漸進式揭露設計——平時隱藏，僅在使用者選中節點時顯示。

#### Scenario: 選中節點顯示屬性面板
- **WHEN** 使用者點擊選中一個節點
- **THEN** 系統 SHALL 在畫布側邊顯示屬性面板，包含顏色選擇、字體大小、內容編輯

#### Scenario: 取消選中隱藏屬性面板
- **WHEN** 使用者點擊畫布空白處
- **THEN** 屬性面板 SHALL 自動隱藏
