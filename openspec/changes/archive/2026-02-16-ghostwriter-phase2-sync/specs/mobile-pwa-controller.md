# mobile-pwa-controller

## MODIFIED Requirements

### Requirement: Text Input Interface
擴展前端介面以包含上下文預覽功能。

#### Scenario: Context preview visible on page
- **WHEN** 頁面載入完成
- **THEN** 輸入框上方顯示上下文預覽區域
- **AND** 預覽區初始狀態顯示 "等待連線..." 或 "請在電腦上點選一個文字編輯區"

### Requirement: Connection Status Display
連線成功後主動請求一次上下文。

#### Scenario: Initial context load on connect
- **WHEN** Socket.IO 成功連線至伺服器
- **THEN** 手機自動發送一次 `request_context` 事件
- **AND** 預覽區顯示從電腦端取得的上下文
