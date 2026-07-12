# Spec: Knowledge Graph Code Editor

## Purpose
提供左側 Markdown 列表代碼編輯器，支援透過純文字快速建構心智圖節點結構，含行號顯示、即時解析與放射狀佈局演算法。

## ADDED Requirements

### Requirement: Markdown list editor with line numbers
系統 SHALL 在代碼編輯模式下，於畫布左側提供帶行號的文字編輯區域。編輯器 SHALL 使用等寬字體，行號 SHALL 從 1 開始遞增，並與文字內容保持垂直同步滾動。

#### Scenario: 進入代碼模式顯示編輯器
- **WHEN** 使用者切換到代碼編輯模式
- **THEN** 畫布左側 SHALL 顯示一個帶行號的文字編輯區域，佔據約 1/3 寬度

#### Scenario: 行號同步滾動
- **WHEN** 使用者在編輯區域中滾動文字
- **THEN** 左側行號 SHALL 與右側內容保持垂直同步滾動

### Requirement: Markdown to graph parsing
系統 SHALL 將編輯器中的 Markdown 縮排列表語法即時解析為心智圖的節點（GraphNode）和邊（GraphEdge）。解析規則如下：
- 每行以 `-` 或 `*` 開頭的行為有效節點行
- 縮排深度（以 2/4 空格或 Tab 為單位）決定父子層級關係
- 第一個無縮排的節點行為根節點（中央節點）
- 自動為每對父子節點生成一條 edge
- 空行和純空白行 SHALL 被忽略
- 不以 `-` 或 `*` 開頭的非空行 SHALL 被忽略但不報錯

#### Scenario: 基本列表解析
- **WHEN** 使用者輸入以下文字：
  ```
  - 核心主題
    - 子主題A
    - 子主題B
      - 孫主題B1
  ```
- **THEN** 系統 SHALL 生成 4 個節點和 3 條邊：核心主題→子主題A、核心主題→子主題B、子主題B→孫主題B1

#### Scenario: 多個根節點
- **WHEN** 使用者輸入多個無縮排的頂層項目
- **THEN** 系統 SHALL 僅以第一個頂層項目為根節點，其餘頂層項目視為根節點的直接子節點

#### Scenario: 解析容錯 — 跳躍縮排
- **WHEN** 使用者輸入縮排從 0 直接跳到 3 層的異常結構
- **THEN** 系統 SHALL 將該節點掛載到最近的祖先節點下（而非報錯或丟棄）

### Requirement: Immediate Update Preview
系統 SHALL 強制開啟即時預覽（以 500ms debounce 觸發），使用者在代碼編輯器中輸入的任何變更，SHALL 在停止輸入 500ms 後自動解析並重繪右側圖表，以確保文字狀態與畫布狀態即時同步，避免狀態分叉。

#### Scenario: 打字即時更新
- **WHEN** 使用者在代碼編輯器中輸入文字
- **THEN** 系統 SHALL 在 500ms 內防抖觸發 Markdown 解析與放射狀佈局，並即時更新畫布

### Requirement: Level-based auto coloring
系統 SHALL 根據節點的縮排層級（depth）自動分配預設顏色。同一層級的所有節點使用相同顏色。

#### Scenario: 自動配色
- **WHEN** 系統解析 Markdown 列表並生成節點
- **THEN** 根節點 SHALL 使用預設主題的第一個顏色，第一層子節點使用第二個顏色，依此類推。超出可用顏色數時 SHALL 循環使用。

#### Scenario: 使用者手動覆寫顏色
- **WHEN** 使用者在視覺模式下手動修改某節點的顏色
- **THEN** 該節點的自定義顏色 SHALL 在代碼模式解析時被層級自動配色覆寫（代碼模式始終根據最新結構重新配色）

### Requirement: Radial layout algorithm
系統 SHALL 在代碼模式下使用放射狀（radial）佈局演算法排列節點，中央節點位於畫布中心，子節點以同心圓方式向外擴展。

#### Scenario: 放射狀排列
- **WHEN** 系統解析 Markdown 文字並生成節點後
- **THEN** 根節點 SHALL 位於畫布中心，第一層子節點 SHALL 均勻分布在半徑 R1 的圓上，第二層子節點 SHALL 分布在半徑 R2 的圓上

#### Scenario: 大量子節點不重疊
- **WHEN** 某一層有超過 12 個子節點
- **THEN** 系統 SHALL 自動增大該層的半徑，確保節點不重疊

### Requirement: Graph to markdown serialization
系統 SHALL 能將現有的結構節點（不含 `type === 'sticky'` 的便利貼節點）反向序列化為 Markdown 列表文字。

#### Scenario: 視覺模式切換到代碼模式
- **WHEN** 使用者從視覺模式切換到代碼模式
- **THEN** 系統 SHALL 將當前的結構節點序列化為 Markdown 列表文字並填入編輯器，排除便利貼節點

### Requirement: Code editor node count limits
系統 SHALL 遵守 `GRAPH_LIMITS.MAX_NODES` 限制。

#### Scenario: 超出節點上限
- **WHEN** 使用者在代碼編輯器中輸入超過 200 行有效節點定義
- **THEN** 系統 SHALL 截斷超出部分並在編輯器底部顯示警告提示
