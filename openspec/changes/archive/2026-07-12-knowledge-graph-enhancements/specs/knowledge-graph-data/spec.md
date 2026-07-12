# Spec: Knowledge Graph Data (Delta)

## MODIFIED Requirements

### Requirement: Graph data model definition
系統 SHALL 定義 `GraphDocument`、`GraphNode`、`GraphEdge`、`GraphViewState` 四個核心型別，作為知識圖的主資料結構。

**新增與修改欄位**：
- `GraphDocument` SHALL 新增 `notes` 欄位（`Record<string, string>`），用於儲存以節點標題 `title` 作為 key、TipTap HTML 格式富文本作為 value 的筆記。
- `GraphDocument` SHALL 新增 `editMode` 欄位（`'visual' | 'code'`），用於持久化編輯模式。
- 便利貼節點 SHALL 直接作為 React Flow 的節點（`type: 'sticky'`）存在於 `GraphDocument.nodes` 中，不另設獨立儲存欄位。便利貼節點的文字內容直接存於 `node.data.label` 或 `node.data.title`。

#### Scenario: GraphDocument 型別完整性
- **WHEN** 開發者建立一個新的 GraphDocument 物件
- **THEN** 物件 MUST 包含 id (string)、name (string)、nodes (GraphNode[])、edges (GraphEdge[])、viewState (GraphViewState)、createdAt (string)、updatedAt (string)、notes (Record<string, string>)、editMode ('visual' | 'code') 所有欄位

---

## ADDED Requirements

### Requirement: Schema version migration (Fail-fast)
系統 SHALL 在載入 `mindspark_graphs` 時自動偵測 `schemaVersion` 並執行向上遷移。當遷移失敗時，系統 SHALL 阻斷 UI 載入，確保資料完整。

#### Scenario: v1 到 v2 遷移
- **WHEN** 系統從 localStorage 載入 `schemaVersion === 1` 的 GraphDocument
- **THEN** 系統 SHALL 自動：
  1. 新增 `notes: {}` 欄位
  2. 遍歷舊有的 nodes，若舊 nodes 的 data 中含有 `notes`、`definition`、或 `details`，將其併入 document 級別的 `notes` 字典中，以該節點標題 `title` 作為 key
  3. 新增 `editMode: 'visual'`
  4. 將 `schemaVersion` 更新為 2
  5. 靜默寫回 localStorage

#### Scenario: 遷移失敗安全阻斷 (Fail-fast)
- **WHEN** schema migration 過程中發生 QuotaExceededError 或任何錯誤
- **THEN** 系統 SHALL 在 console 記錄錯誤、直接向外拋出異常 `throw error`、阻止 UI 載入，並在頁面展示「儲存空間已滿，載入失敗」與「備份資料」及「重置資料」的選項，**絕對不回傳空陣列 `[]`**

### Requirement: Notes storage size monitoring
系統 SHALL 監控單一圖表的 localStorage 佔用大小，在超過閾值時發出警告。

#### Scenario: 儲存大小警告
- **WHEN** 單一 GraphDocument 序列化後的 JSON 字串超過 3MB
- **THEN** 系統 SHALL 在儲存成功後顯示 Toast 警告：「此圖表資料量較大，建議精簡筆記以避免儲存空間不足」

### Requirement: Sticky notes count limits in nodes
系統 SHALL 限制每張圖表的便利貼總數。

#### Scenario: 便利貼數量上限
- **WHEN** 使用者嘗試新增便利貼，但畫布上已存在的 `type: 'sticky'` 節點數量已達 20 個
- **THEN** 系統 SHALL 阻斷新增並提示已達便利貼上限

### Requirement: Limits constants
`GRAPH_LIMITS` SHALL 新增 `NOTES_MAX: 10000`、`STICKY_TEXT_MAX: 500` 和 `MAX_STICKY_NOTES: 20` 常數。
