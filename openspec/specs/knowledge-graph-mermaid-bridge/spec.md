# Spec: Knowledge Graph Mermaid Bridge

## Purpose
Enable interoperability between textual Mermaid flowchart syntax and visual Knowledge Graph documents, allowing users to leverage AI-generated diagrams or migrate existing diagrams.

## ADDED Requirements

### Requirement: Mermaid flowchart import
系統 SHALL 支援將 Mermaid flowchart 語法的受控子集解析為 GraphDocument 的 nodes 和 edges。

#### Scenario: 匯入基本 flowchart
- **WHEN** 使用者貼上合法的 Mermaid flowchart 語法（例如 `graph TD; A[Start] --> B[End]`）
- **THEN** 系統 SHALL 解析出對應的節點和連線，並在畫布上以自動佈局呈現

#### Scenario: 支援方向宣告
- **WHEN** Mermaid 語法包含 `graph TD`、`graph LR`、`flowchart TD` 或 `flowchart LR`
- **THEN** 系統 SHALL 正確解析方向宣告並據此決定自動佈局方向（上到下或左到右）

#### Scenario: 支援多種節點語法
- **WHEN** Mermaid 語法包含 `A[text]`（方形）、`A(text)`（圓角）、`A{text}`（菱形）
- **THEN** 系統 SHALL 正確解析節點文字內容，節點形狀可透過 color 區分

#### Scenario: 支援連線語法
- **WHEN** Mermaid 語法包含 `A --> B`（單向箭頭）、`A --- B`（無箭頭）、`A -->|label| B`（帶標籤）、`A <--> B`（雙向箭頭）
- **THEN** 系統 SHALL 正確解析連線方向（對應 arrowType: arrow/none/both）、箭頭和標籤

#### Scenario: 支援 classDef 樣式
- **WHEN** Mermaid 語法包含 `classDef className fill:#color` 和 `class nodeId className`
- **THEN** 系統 SHALL 僅映射 `fill` 屬性為對應節點的 color 屬性（其餘 CSS 屬性如 stroke、font-size 等一律忽略）

### Requirement: Mermaid import validation pipeline
Mermaid 匯入 SHALL 在解析後、匯入前執行資料不變量驗證，確保匯入資料符合系統約束。

#### Scenario: 匯入時自連線過濾
- **WHEN** Mermaid 語法包含自連線（如 `A --> A`）
- **THEN** 系統 SHALL 忽略該自連線，並在預覽結果中提示「已忽略 N 條自連線」

#### Scenario: 匯入時標題長度截斷
- **WHEN** Mermaid 節點文字超過 100 個字元
- **THEN** 系統 SHALL 截斷至 100 個字元，並在預覽結果中提示「已截斷 N 個節點標題」

#### Scenario: 匯入時連線標籤長度截斷
- **WHEN** Mermaid 連線標籤超過 100 個字元
- **THEN** 系統 SHALL 截斷至 100 個字元

#### Scenario: 匯入時特殊字元正規化
- **WHEN** Mermaid 節點文字包含 HTML entities 或轉義字元
- **THEN** 系統 SHALL 解碼為純文字後存入 GraphNode.data.title

#### Scenario: 匯入驗證管線順序
- **WHEN** 匯入動作觸發
- **THEN** 系統 SHALL 依序執行：1. 解析語法 → 2. 正規化形狀/箭頭 → 3. 過濾自連線 → 4. 截斷超長文字 → 5. 產生預覽 → 6. 使用者確認後寫入

### Requirement: Mermaid import error handling
Mermaid 匯入 SHALL 提供清楚的錯誤處理和使用者回饋。

#### Scenario: 不支援的語法
- **WHEN** 使用者貼上包含 subgraph、click 事件或非 flowchart 圖表類型的 Mermaid 語法
- **THEN** 系統 SHALL 顯示明確的錯誤訊息，說明哪些語法不被支援

#### Scenario: 語法解析失敗
- **WHEN** 使用者貼上語法錯誤的 Mermaid 程式碼
- **THEN** 系統 SHALL 顯示解析錯誤位置和修正建議

#### Scenario: 匯入預覽
- **WHEN** 使用者在匯入對話框中貼上 Mermaid 語法
- **THEN** 系統 SHALL 先顯示解析結果預覽（節點數量、連線數量），讓使用者確認後再匯入

#### Scenario: 匯入至新文件或現有文件
- **WHEN** 使用者確認匯入
- **THEN** 系統 SHALL 提供選項：建立新圖表文件，或追加至現有圖表

### Requirement: Mermaid flowchart export
系統 SHALL 支援將 GraphDocument 的 nodes 和 edges 匯出為 Mermaid flowchart 語法。

#### Scenario: 基本匯出
- **WHEN** 使用者點擊「匯出 Mermaid」按鈕
- **THEN** 系統 SHALL 生成合法的 Mermaid flowchart 語法，包含所有節點和連線

#### Scenario: 匯出包含標籤
- **WHEN** 圖表中的連線帶有標籤
- **THEN** 匯出的 Mermaid 語法 SHALL 使用 `-->|label|` 格式包含連線標籤

#### Scenario: 匯出雙向箭頭
- **WHEN** 圖表中的連線 arrowType 為 'both'
- **THEN** 匯出的 Mermaid 語法 SHALL 使用 `<-->` 格式（帶標籤時為 `<-->|label|`）

#### Scenario: 匯出結果可複製
- **WHEN** 匯出結果顯示在對話框中
- **THEN** 系統 SHALL 提供「複製到剪貼簿」按鈕，支援一鍵複製

#### Scenario: Mermaid 特殊字元 escape
- **WHEN** 節點標題包含 Mermaid 保留字元（`[`, `]`, `(`, `)`, `{`, `}`, `>`, `|`, `;`）
- **THEN** 匯出的 Mermaid 語法 SHALL 對這些字元進行嚴格 escape（使用 `"text"` 語法或替換），確保匯出結果為合法 Mermaid

#### Scenario: 匯入文字長度限制
- **WHEN** 使用者貼上超過 5000 個字元的 Mermaid 語法
- **THEN** 系統 SHALL 顯示錯誤提示，拒絕解析過長輸入

#### Scenario: 匯出的 Mermaid 可重新匯入
- **WHEN** 使用者將匯出的 Mermaid 語法重新匯入
- **THEN** 系統 SHALL 正確還原所有節點和連線（座標位置可能因自動佈局而不同）

### Requirement: Mermaid import modal UI
Mermaid 匯入 SHALL 透過專屬 Modal 對話框進行，提供清晰的操作引導。

#### Scenario: 開啟匯入對話框
- **WHEN** 使用者點擊工具列的「匯入 Mermaid」按鈕
- **THEN** 系統 SHALL 顯示包含文字輸入區域的 Modal，並提供語法提示和範例

#### Scenario: Mermaid 匯入遇圖表上限
- **WHEN** 使用者選擇「建立新圖表」但已達 20 份上限
- **THEN** 系統 SHALL 阻止新建，顯示錯誤訊息建議刪除舊圖表或選擇追加至現有圖表

#### Scenario: 自動佈局
- **WHEN** Mermaid 匯入完成
- **THEN** 系統 SHALL 使用知識圖既有的 radial 佈局演算法排列節點位置，避免引入額外第三方佈局依賴
