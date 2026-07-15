# Spec: Graph Visual Themes

## Purpose
Define classic color reset, background opacity modes, safe shape rendering, and external image presentation.

### Requirement: Classic color reset tool
系統 SHALL 提供一鍵重置為經典配色的工具，讓使用者快速整理節點色彩。

#### Scenario: 重置為經典配色
- **GIVEN** 使用者在視覺模式工具列
- **WHEN** 使用者點擊「重置配色」按鈕
- **THEN** 系統 SHALL 根據節點的 BFS 深度，重新套用預設的經典配色到所有無手動自訂顏色的概念節點
- **AND** 已有手動自訂顏色的概念節點與便利貼節點不受影響
- **AND** 此操作 SHALL 被記錄到 undo 歷史中

### Requirement: Dark mode solid background toggle
系統 SHALL 提供節點背景透明度切換，解決暗色模式下半透明節點不可辨識的問題。

#### Scenario: 切換為純色背景
- **GIVEN** 知識圖目前使用半透明背景（`translucent`）
- **WHEN** 使用者點擊工具列的「背景模式」切換按鈕
- **THEN** 所有概念節點的背景 SHALL 從 `${color}15`（約 8% 不透明度）變為 `${color}CC`（約 80% 不透明度）
- **AND** `GraphDocument.backgroundOpacity` SHALL 更新為 `'solid'`

#### Scenario: 暗色模式下新建圖表預設值
- **WHEN** 系統偵測到使用者處於暗色模式（`dark` class 在 `<html>` 上）
- **AND** 使用者建立一張新的知識圖
- **THEN** `backgroundOpacity` SHALL 預設為 `'solid'`

### Requirement: Fix diamond shape rendering
菱形節點 SHALL 正確渲染為 45° 旋轉的外框，而非被 `rotate-45` 拉長的膠囊形狀。

#### Scenario: 菱形節點正確顯示
- **GIVEN** 使用者將一個節點設為「菱形」形狀
- **WHEN** 畫布渲染該節點
- **THEN** 節點外框 SHALL 呈現為正菱形（45° 旋轉的正方形，使用 clip-path 實現）
- **AND** 節點內部的文字 SHALL 水平排列（不旋轉）
- **AND** 節點上的 Handle（連接點）SHALL 正確定位在菱形的上/下頂點

#### Scenario: 菱形節點的點擊區域
- **WHEN** 使用者點擊菱形節點的可見菱形區域內
- **THEN** 系統 SHALL 正確識別為點擊該節點
- **AND** 菱形外部的透明區域點擊 SHALL NOT 選中該節點

## Verification
- 視覺驗證：驗證菱形節點在亮色/暗色模式下的渲染，保證文字水平居中不旋轉
- 單元測試：驗證 `graphStorage` 的 schema v3 遷移中 `backgroundOpacity` 預設值正確
- `npm run build` 通過
- `npm test` 通過

