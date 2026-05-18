# mobile-context-display

手機端新增上下文預覽 UI，顯示游標前後的文字片段，高亮游標位置。

## ADDED Requirements

### Requirement: Context Preview Area
手機介面新增即時上下文預覽區域。

#### Scenario: Display context with cursor indicator
- **WHEN** 收到 `context_update` 事件且 `supported` 為 `true`
- **THEN** 預覽區顯示 `before` 文字 + 游標指示符 + `after` 文字
- **AND** 游標指示符以醒目的視覺方式顯示（如閃爍豎線或高亮色）

#### Scenario: Display selected text
- **WHEN** `selected` 欄位非空
- **THEN** 預覽區中以高亮樣式顯示被選取的文字

#### Scenario: Context from unsupported app
- **WHEN** `supported` 為 `false`
- **THEN** 預覽區顯示灰色提示文字，如 "此應用不支援文字預覽"
- **AND** 顯示 `app_name`（如果有的話）

### Requirement: App Name Display
預覽區應顯示當前焦點應用的名稱。

#### Scenario: Show app name
- **WHEN** `context_update` 包含 `app_name` 欄位
- **THEN** 預覽區上方顯示應用名稱標籤（如 "Notepad"）

### Requirement: Auto-Refresh on Input
每次發送文字後自動請求上下文更新。

#### Scenario: Context updates after typing
- **WHEN** 使用者在輸入框輸入文字並發送 `text_input`
- **THEN** 手機自動接收伺服器推送的 `context_update`
- **AND** 預覽區即時更新顯示內容
