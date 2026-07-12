# Spec: Knowledge Graph Sticky Notes

## Purpose
提供獨立的便利貼節點功能，讓使用者可以在畫布上放置不屬於心智圖結構的自由備忘文字方塊。

## ADDED Requirements

### Requirement: Sticky note creation (Canvas Integration)
系統 SHALL 允許使用者在畫布上新增獨立的便利貼節點。便利貼 SHALL 儲存在畫布的 `nodes` 陣列中，其 `type` 為 `'sticky'`。便利貼外觀具有黃色背景且無連接點 handle。

#### Scenario: 工具列新增便利貼
- **WHEN** 使用者點擊工具列的「新增便利貼」按鈕
- **THEN** 系統 SHALL 在畫布可見區域中央建立一個黃色便利貼節點（`type: 'sticky'`），預設文字為「備忘」

#### Scenario: 便利貼外觀
- **WHEN** 便利貼被渲染在畫布上
- **THEN** 便利貼 SHALL 使用黃色背景、輕微陰影效果、無連接點（Handle），視覺上明顯區別於心智圖結構節點

### Requirement: Sticky note editing
系統 SHALL 允許使用者透過雙擊便利貼來編輯其文字內容。

#### Scenario: 雙擊編輯便利貼
- **WHEN** 使用者雙擊便利貼節點
- **THEN** 便利貼 SHALL 進入編輯模式，顯示 textarea 允許修改文字，文字將直接寫入 `node.data.label` 或 `node.data.title`

#### Scenario: 便利貼文字長度限制
- **WHEN** 使用者輸入超過 500 字元的便利貼文字
- **THEN** 系統 SHALL 截斷至 500 字元

### Requirement: Sticky note deletion
系統 SHALL 允許使用者刪除便利貼。

#### Scenario: 刪除便利貼
- **WHEN** 使用者選中便利貼並按 Delete 鍵
- **THEN** 系統 SHALL 刪除該便利貼節點

### Requirement: Sticky note drag and positioning
便利貼支援自由拖曳定位。因為便利貼直接作為 `RFNode` 存於 nodes 中，其位置（x, y）由 React Flow 自然更新並隨整個 `nodes` 陣列自動持久化，不需要額外的 CRUD 計算。

### Requirement: Code editor isolation
在代碼模式的序列化與解析過程中，系統 SHALL 完全忽略 `type === 'sticky'` 的便利貼節點，確保在代碼編輯時便利貼節點維持原樣。

#### Scenario: 代碼編輯不影響便利貼
- **WHEN** 使用者在代碼模式下修改文字並觸發重排
- **THEN** 系統在解析 Markdown 時不生成便利貼，但在渲染畫布時，會將解析出的結構節點與畫布中現存的 `type === 'sticky'` 便利貼節點合併，使得便利貼位置、內容保持不變

### Requirement: Sticky notes count limit
系統 SHALL 限制每張圖表的便利貼總數不得超過 20 個。

#### Scenario: 限制便利貼上限
- **WHEN** 當前畫布已存在 20 個 `type === 'sticky'` 的節點，且使用者點擊「新增便利貼」
- **THEN** 系統 SHALL 拒絕新增並顯示警告
