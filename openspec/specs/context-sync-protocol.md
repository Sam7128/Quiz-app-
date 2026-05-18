# context-sync-protocol

WebSocket 雙向同步協議，手機可主動請求上下文，伺服器可在注入後主動推送更新。

## ADDED Requirements

### Requirement: Manual Context Request
手機端可主動請求電腦端抓取上下文。

#### Scenario: Phone requests context
- **WHEN** 手機發送 `request_context` 事件（空 payload）
- **THEN** 伺服器呼叫 `get_cursor_context()` 抓取上下文
- **AND** 伺服器回傳 `context_update` 事件，包含 `before`、`after`、`selected`、`app_name`、`supported`

### Requirement: Post-Injection Auto Push
文字注入完成後，伺服器自動推送更新的上下文。

#### Scenario: Context pushed after text injection
- **WHEN** 伺服器成功處理 `text_input` 事件並完成注入
- **THEN** 伺服器等待短暫延遲（50ms，讓應用程式處理輸入）
- **AND** 自動抓取上下文並推送 `context_update` 事件

### Requirement: Debounce Mechanism
連續快速輸入時，限制上下文推送頻率。

#### Scenario: Rapid consecutive inputs
- **WHEN** 使用者在 500ms 內連續輸入多個字元
- **THEN** 伺服器最多推送 1 次 `context_update`（最後一次輸入後 300ms 推送）
- **AND** 不遺漏最終狀態

### Requirement: Unsupported App Notification
當焦點轉移到不支援 TextPattern 的應用時，告知手機端。

#### Scenario: Focus moves to unsupported app
- **WHEN** 手機請求上下文但焦點在不支援的應用上
- **THEN** 伺服器回傳 `context_update` 事件，`supported` 為 `false`
- **AND** 包含 `reason` 欄位說明原因
