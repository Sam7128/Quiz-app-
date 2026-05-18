# websocket-bridge

WebSocket 即時雙向通訊橋接，透過 LAN 建立手機與電腦之間的低延遲連線。

## ADDED Requirements

### Requirement: WebSocket Server Initialization
伺服器啟動時必須在指定端口（預設 5000）上建立 WebSocket 服務，僅監聽 LAN 介面。

#### Scenario: Server starts successfully
- **WHEN** 使用者執行 `python server.py`
- **THEN** Flask-SocketIO 伺服器啟動於 `0.0.0.0:5000`
- **AND** 終端顯示伺服器 IP 位址與端口資訊
- **AND** 伺服器就緒接受 WebSocket 連線

#### Scenario: Port already in use
- **WHEN** 端口 5000 被其他程式佔用
- **THEN** 伺服器顯示錯誤訊息並建議使用替代端口
- **AND** 程式以非零退出碼結束

### Requirement: Client Connection Handling
伺服器必須處理客戶端的連線與斷線事件。

#### Scenario: Mobile client connects
- **WHEN** 手機瀏覽器透過 Socket.IO 連線至伺服器
- **THEN** 伺服器記錄連線事件（包含客戶端 IP）
- **AND** 伺服器發送 `status_update` 事件，包含 `{ "status": "connected", "hostname": "<PC名稱>" }`

#### Scenario: Mobile client disconnects
- **WHEN** 手機端斷開連線（網路中斷或關閉瀏覽器）
- **THEN** 伺服器記錄斷線事件
- **AND** 清除該客戶端的相關狀態

### Requirement: Text Input Event Processing
伺服器必須接收並處理 `text_input` 事件。

#### Scenario: Receive text in stream mode
- **WHEN** 手機發送 `text_input` 事件，payload 為 `{ "text": "A", "mode": "stream" }`
- **THEN** 伺服器將文字傳遞給 Keystroke Injection 模組
- **AND** 伺服器不回傳確認訊息（減少延遲）

#### Scenario: Receive empty text
- **WHEN** 手機發送 `text_input` 事件，payload 中 `text` 為空字串
- **THEN** 伺服器忽略該事件，不執行任何注入
