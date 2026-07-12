# Spec: Knowledge Graph Notes Panel

## Purpose
提供右側富文本筆記面板，整合 TipTap WYSIWYG 編輯器，支援透過節點標題對照的富文本筆記，以及跨節點筆記搜尋與未歸檔筆記管理功能。

## ADDED Requirements

### Requirement: Rich text notes panel with TipTap
系統 SHALL 在使用者點擊畫布中的節點時，於畫布右側滑出一個富文本筆記面板。面板 SHALL 使用 TipTap 編輯器，支援以下格式：H1 標題、H2 標題、粗體、斜體、底線、刪除線、有序清單、無序清單、清除格式。

#### Scenario: 點擊節點開啟筆記面板
- **WHEN** 使用者在視覺模式下點擊畫布上的一個結構節點
- **THEN** 右側 SHALL 滑出筆記面板，顯示該節點的標題和已儲存的富文本筆記（透過 `notes[nodeTitle]` 讀取）

#### Scenario: 點擊不同節點切換筆記
- **WHEN** 使用者在已開啟筆記面板的狀態下點擊另一個節點
- **THEN** 面板 SHALL 自動切換顯示新節點的筆記內容，前一個節點的修改 SHALL 已自動儲存到 `notes` 字典中

#### Scenario: 點擊空白處關閉筆記面板
- **WHEN** 使用者在視覺模式下點擊畫布空白處
- **THEN** 右側筆記面板 SHALL 自動收合隱藏

### Requirement: Notes panel toolbar
筆記面板 SHALL 在 TipTap 編輯區域上方提供一排格式工具列，包含以下按鈕：
- H1 標題、H2 標題
- 粗體 (B)、斜體 (I)、底線 (U)、刪除線 (S)
- 有序清單、無序清單
- 清除格式

### Requirement: Notes auto-save
筆記面板的內容修改 SHALL 使用 debounce 策略（500ms）自動儲存到 `GraphDocument.notes[nodeTitle]` 欄位中。

#### Scenario: 自動儲存筆記
- **WHEN** 使用者在筆記面板中修改文字後停止輸入 500ms
- **THEN** 系統 SHALL 自動將 TipTap 的 HTML 輸出儲存到 `notes` 字典中對應標題的欄位

#### Scenario: 切換節點前自動儲存
- **WHEN** 使用者在編輯筆記的途中點擊另一個節點
- **THEN** 系統 SHALL 在切換前立即儲存當前筆記（不等待 debounce）

### Requirement: Notes content length limit
每個節點的筆記 SHALL 有最大長度限制 `NOTES_MAX: 10000` 字元（HTML 格式）。

### Requirement: Cross-node notes search
系統 SHALL 在筆記面板頂部提供搜尋欄位，支援跨 `notes` 字典進行關鍵字搜尋。

#### Scenario: 搜尋筆記
- **WHEN** 使用者在搜尋欄位輸入關鍵字
- **THEN** 系統 SHALL 即時顯示所有包含該關鍵字的節點列表，每個結果 SHALL 顯示節點標題和匹配的筆記片段

#### Scenario: 搜尋結果跳轉
- **WHEN** 使用者點擊搜尋結果中的某個節點
- **THEN** 系統 SHALL 關閉搜尋結果、在畫布上聚焦（fitView）到該節點、並在筆記面板中開啟該節點的筆記

### Requirement: Unassigned notes management
系統 SHALL 管理「未歸檔筆記」（存在於 `notes` 字典中但當前 nodes 列表中沒有任何節點與之標題匹配的筆記）。

#### Scenario: 顯示未歸檔筆記
- **WHEN** 使用者在搜尋面板或筆記面板底部檢視未歸檔筆記
- **THEN** 系統 SHALL 列出所有無對應節點的標題和筆記摘要

#### Scenario: 刪除或重聯未歸檔筆記
- **WHEN** 使用者選擇某個未歸檔筆記並點擊「賦予當前節點」
- **THEN** 系統 SHALL 將該筆記移至當前選中節點的標題下
- **WHEN** 使用者點擊「刪除」未歸檔筆記
- **THEN** 系統 SHALL 自 `notes` 字典中移除該 entry 以釋放空間
