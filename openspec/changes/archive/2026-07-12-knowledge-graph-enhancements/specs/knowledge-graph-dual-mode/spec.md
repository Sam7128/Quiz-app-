# Spec: Knowledge Graph Dual Mode

## Purpose
提供視覺化編輯模式與代碼編輯模式之間的雙模式切換介面與佈局管理，並維持資料的一致性與安全。

## ADDED Requirements

### Requirement: Mode toggle button
系統 SHALL 在知識圖編輯器的 header bar 中提供一個模式切換按鈕，使用者可以在「視覺模式」和「代碼模式」之間切換。

#### Scenario: 切換到代碼模式
- **WHEN** 使用者點擊模式切換按鈕從視覺模式切換到代碼模式
- **THEN** 介面 SHALL 變更為：左側 1/3 為代碼編輯器、右側 2/3 為畫布預覽（唯讀）

#### Scenario: 切換到視覺模式
- **WHEN** 使用者點擊模式切換按鈕從代碼模式切換回視覺模式
- **THEN** 介面 SHALL 變更為：全寬畫布（可編輯）、點擊節點可開啟右側筆記面板

#### Scenario: 切換按鈕圖標
- **WHEN** 當前處於視覺模式
- **THEN** 切換按鈕 SHALL 顯示「Code」圖標和文字
- **WHEN** 當前處於代碼模式
- **THEN** 切換按鈕 SHALL 顯示「Visual」圖標和文字

### Requirement: Layout management
系統 SHALL 根據當前模式動態調整佈局。

#### Scenario: 視覺模式佈局 - 無筆記面板
- **WHEN** 處於視覺模式且沒有選中任何節點
- **THEN** 畫布 SHALL 佔據全部可用寬度

#### Scenario: 視覺模式佈局 - 有筆記面板
- **WHEN** 處於視覺模式且使用者點擊了一個節點
- **THEN** 畫布 SHALL 縮至左側約 2/3，右側 1/3 為筆記面板

#### Scenario: 代碼模式佈局
- **WHEN** 處於代碼模式
- **THEN** 左側 1/3 為代碼編輯器，右側 2/3 為唯讀畫布預覽

### Requirement: Mode state persistence
系統 SHALL 在 `GraphDocument` 中持久化當前的編輯模式狀態。

#### Scenario: 記住上次模式
- **WHEN** 使用者在代碼模式下離開知識圖工作區，之後重新進入同一圖表
- **THEN** 系統 SHALL 自動恢復為代碼模式

### Requirement: Visual to code transition
系統 SHALL 在從視覺模式切換到代碼模式時，將當前的結構節點（排除便利貼節點）序列化為 Markdown 列表文字。

#### Scenario: 節點結構序列化
- **WHEN** 使用者從視覺模式切換到代碼模式
- **THEN** 系統 SHALL 分析 edges 建立父子關係樹，並以 Markdown 縮排列表格式輸出到左側編輯器
- **THEN** 根節點 SHALL 為無縮排的頂層項目，子節點 SHALL 根據層級遞增縮排
- **THEN** 畫布中的 `type === 'sticky'` 便利貼節點 SHALL 被序列化器忽略

#### Scenario: 筆記不受切換影響
- **WHEN** 切換到代碼模式時
- **THEN** 筆記資料仍安全地保存在 `GraphDocument.notes` 中，不需拷貝或更新

### Requirement: Code to visual transition (Immediate Sync)
系統 SHALL 在代碼模式下，透過 500ms debounce 即時同步將編輯器文字解析為結構節點，並應用放射狀佈局。同時合併原有的便利貼節點。

#### Scenario: 解析並顯示
- **WHEN** 使用者編輯 Markdown 文字或切換回視覺模式
- **THEN** 系統 SHALL 解析當前文字，生成結構節點，套用放射狀佈局，並與畫布中原有的便利貼節點（`type === 'sticky'`）合併後，渲染到畫布上

### Requirement: Mobile mode restriction
手機端 SHALL 不提供代碼模式。

#### Scenario: 手機端隱藏模式切換
- **WHEN** 使用者在手機端（≤768px）開啟知識圖編輯器
- **THEN** 模式切換按鈕 SHALL 隱藏，系統 SHALL 固定為視覺模式（唯讀）

## MODIFIED Requirements

### Requirement: Node content editing
系統 SHALL 允許使用者透過右側富文本筆記面板編輯節點的詳細內容。原有的 NodeEditPanel 中的屬性編輯（標題、顏色、形狀等）精簡後保留在筆記面板頂部的摺疊區域中。

#### Scenario: 點擊節點開啟筆記面板
- **WHEN** 使用者在視覺模式下點擊一個節點（結構節點）
- **THEN** 系統 SHALL 在畫布右側顯示筆記面板，包含：
  1. 頂部：節點屬性編輯（摺疊區域，如標題、顏色、形狀）
  2. 中部：TipTap 富文本筆記編輯器（讀寫 `notes[nodeTitle]`）
  3. 底部：字數統計
