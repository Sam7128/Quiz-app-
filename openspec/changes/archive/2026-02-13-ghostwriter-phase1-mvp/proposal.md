# GhostWriter Phase 1 MVP — Cross-Platform Zero-Latency Input Bridge

## Why

智慧手機擁有強大的手寫辨識與語音輸入能力，但 Windows 桌面環境缺乏原生的跨裝置輸入橋接方案。現有的解決方案（如雲端剪貼簿、遠端桌面）不僅延遲高、依賴外部伺服器，更存在隱私風險。GhostWriter 旨在將手機轉化為 Windows 電腦的「外部生物特徵輸入模組」，透過純區域網路（LAN Only）通訊實現零延遲、零隱私洩露的同步輸入。

## What Changes

建立一個全新的輕量化系統，由兩個組件構成：

1. **PC Receiver（電腦端接收程式）**：基於 Python 的 WebSocket 伺服器，接收手機傳來的文字與指令，並透過系統級 API 模擬鍵盤輸入，將字元注入到游標所在位置。
2. **Mobile Controller（手機端控制器）**：由 PC Receiver 直接託管的 Web PWA 應用，手機只需開啟瀏覽器連線即可使用，無需安裝 App。

Phase 1 (MVP) 聚焦於：
- 建立穩定的 WebSocket 即時通訊連線
- 實現「串流模式」：手機輸入一個字，電腦游標處即時出現一個字
- 提供基礎的連線狀態反饋（已連線/斷線）

## Capabilities

### New Capabilities

- `websocket-bridge`: 基於 WebSocket 的即時雙向通訊橋接，手機與電腦透過 LAN 建立低延遲連線。
- `keystroke-injection`: 電腦端接收文字後，透過系統級 API（pyautogui / ctypes）模擬鍵盤輸入，將字元注入當前焦點視窗。
- `mobile-pwa-controller`: 由 Python 後端託管的 PWA 網頁應用，提供手機端輸入介面，支援系統原生輸入法（手寫、語音、拼音等）。
- `connection-management`: 連線管理機制，包含自動重連、連線狀態指示、以及基礎的安全握手。

### Modified Capabilities

（無 — 這是一個全新專案）

## Impact

- **程式碼**：全新專案，不修改任何既有程式碼。
- **依賴**：Python 端需要 `flask`, `flask-socketio`, `pyautogui`, `eventlet`；前端為純 HTML/CSS/JS，零依賴。
- **系統**：需要 Windows 防火牆允許 Python 程式監聽內網端口（預設 5000）。
- **安全**：程式碼完全透明，絕不包含任何 Telemetry 或外部 API 呼叫；所有通訊嚴格限制在 LAN 內。
