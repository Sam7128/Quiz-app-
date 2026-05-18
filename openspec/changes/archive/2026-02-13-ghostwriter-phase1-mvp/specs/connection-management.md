# connection-management

連線管理機制，包含自動重連、連線狀態指示、以及基礎的安全握手。

## ADDED Requirements

### Requirement: Automatic Reconnection
連線中斷時，客戶端必須自動嘗試重新連線。

#### Scenario: Network temporarily lost
- **WHEN** 手機暫時離開 Wi-Fi 範圍後回來
- **THEN** Socket.IO 客戶端自動重新連線
- **AND** 重連成功後，介面恢復為「已連線」狀態
- **AND** 無需使用者手動操作

### Requirement: Server IP Discovery
首次使用時，使用者需要知道電腦的 IP 位址才能連線。

#### Scenario: Display server IP on startup
- **WHEN** Python 伺服器啟動
- **THEN** 終端機顯示所有可用的 LAN IP 位址
- **AND** 同時顯示可掃描的 QR Code（包含連線 URL）
- **AND** 使用者可在手機上掃描 QR Code 或手動輸入 IP

### Requirement: Heartbeat Monitoring
伺服器必須監控客戶端的存活狀態。

#### Scenario: Client becomes unresponsive
- **WHEN** Socket.IO 的 ping/pong 心跳超過 10 秒未收到回應
- **THEN** 伺服器判定客戶端斷線
- **AND** 清除該客戶端的狀態
- **AND** 記錄斷線事件至終端

### Requirement: Single Client Mode
Phase 1 僅支援單一客戶端連線。

#### Scenario: Second client attempts connection
- **WHEN** 已有一個手機連線中
- **AND** 第二個裝置嘗試連線
- **THEN** 伺服器接受新連線（替換舊連線）
- **AND** 向舊客戶端發送斷線通知
