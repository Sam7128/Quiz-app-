# Spec: Knowledge Graph Editor (Delta)

## MODIFIED Requirements

### Requirement: Properties panel replacement
原有的 `NodeEditPanel`（純文字 textarea）SHALL 被替換為新的 `GraphNotesPanel`（TipTap 富文本編輯器 + 屬性編輯）。點擊節點時開啟的面板從 NodeEditPanel 改為 GraphNotesPanel。

#### Scenario: 選中節點顯示筆記面板
- **WHEN** 使用者在視覺模式下點擊選中一個結構節點
- **THEN** 系統 SHALL 在畫布右側顯示 GraphNotesPanel，包含屬性編輯（摺疊區域）和 TipTap 富文本筆記編輯器

#### Scenario: 取消選中隱藏筆記面板
- **WHEN** 使用者點擊畫布空白處
- **THEN** GraphNotesPanel SHALL 自動隱藏

### Requirement: Visual node editor canvas
系統 SHALL 提供基於 @xyflow/react 的視覺化節點編輯器畫布。畫布 SHALL 同時渲染結構節點和便利貼節點。便利貼使用 `type: 'sticky'` 的自定義節點類型。

#### Scenario: 畫布渲染便利貼
- **WHEN** 使用者進入知識圖工作區的編輯模式，且圖表中有便利貼
- **THEN** 便利貼 SHALL 以黃色方塊形式渲染在畫布上，與結構節點共存，並可自由拖曳定位

#### Scenario: 代碼模式畫布唯讀
- **WHEN** 當前處於代碼模式
- **THEN** 畫布上的所有節點（結構節點與便利貼節點）SHALL 設為唯讀且不可拖曳（`nodesDraggable: false`, `nodesConnectable: false`）

### Requirement: Toolbar design
工具列 SHALL 新增以下按鈕：
- 「新增便利貼」按鈕（StickyNote 圖標）

#### Scenario: 桌面端工具列增加便利貼按鈕
- **WHEN** 使用者在桌面端進入編輯模式
- **THEN** 工具列 SHALL 包含「新增便利貼」按鈕，與「新增節點」按鈕相鄰
