# mobile-pwa-controller

由 Python 後端託管的 PWA 網頁應用，提供手機端輸入介面，支援系統原生輸入法。

## ADDED Requirements

### Requirement: PWA Static File Hosting
Python 後端必須將 `static/` 目錄下的前端檔案作為靜態網站託管。

#### Scenario: Access the PWA
- **WHEN** 手機瀏覽器訪問 `http://<PC_IP>:5000/`
- **THEN** 伺服器回傳 `static/index.html`
- **AND** 頁面正確載入所有 CSS 和 JS 資源

#### Scenario: PWA installable
- **WHEN** 手機瀏覽器載入頁面
- **THEN** `manifest.json` 可被讀取
- **AND** 瀏覽器顯示「加入主畫面」提示

### Requirement: Text Input Interface
前端必須提供直覺的文字輸入介面。

#### Scenario: Stream mode input
- **WHEN** 使用者在輸入框中透過任意 IME（手寫、語音、拼音）輸入文字
- **THEN** 每次輸入變化立即透過 Socket.IO 發送 `text_input` 事件
- **AND** 事件 payload 包含新增的文字內容
- **AND** 輸入框在發送後清空，準備接收下一段輸入

### Requirement: Connection Status Display
前端必須即時顯示與後端的連線狀態。

#### Scenario: Connected state
- **WHEN** Socket.IO 成功連線至伺服器
- **THEN** 介面顯示綠色狀態指示器
- **AND** 顯示已連線的電腦名稱

#### Scenario: Disconnected state
- **WHEN** Socket.IO 連線中斷
- **THEN** 介面顯示紅色狀態指示器
- **AND** 顯示「連線中斷」訊息
- **AND** Socket.IO 自動嘗試重新連線

### Requirement: Responsive Mobile Design
前端介面必須針對手機螢幕最佳化。

#### Scenario: Mobile viewport
- **WHEN** 頁面在手機瀏覽器中載入
- **THEN** 介面填滿螢幕寬度
- **AND** 輸入框足夠大，方便觸控操作
- **AND** 自動彈出軟體鍵盤

### Requirement: Zero External Dependencies
前端不得載入任何外部 CDN 或第三方資源。

#### Scenario: Offline LAN operation
- **WHEN** 電腦與手機處於無外網的封閉 LAN 環境
- **THEN** PWA 所有功能正常運作
- **AND** 不向任何外部伺服器發送請求
