# websocket-bridge

## MODIFIED Requirements

### Requirement: Text Input Event Processing
在原有 `text_input` 處理邏輯後，增加自動上下文推送。

#### Scenario: Auto-push context after injection
- **WHEN** `text_input` 事件處理完成且注入成功
- **THEN** 伺服器在短暫延遲後呼叫 `get_cursor_context()`
- **AND** 將結果透過 `context_update` 事件推送給發送端

### Requirement: New Event — request_context
伺服器必須處理來自手機端的 `request_context` 事件。

#### Scenario: Handle context request
- **WHEN** 手機發送 `request_context` 事件
- **THEN** 伺服器呼叫 `get_cursor_context()` 抓取上下文
- **AND** 回傳 `context_update` 事件給請求者
