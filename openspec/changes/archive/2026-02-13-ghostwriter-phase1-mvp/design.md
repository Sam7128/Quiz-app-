# GhostWriter Phase 1 MVP — Technical Design

## Context

GhostWriter 是一個全新的跨裝置輸入橋接系統。Phase 1 MVP 階段不存在任何既有程式碼。系統將由 Python 後端（PC Receiver）和瀏覽器端 PWA（Mobile Controller）兩個組件構成，透過 WebSocket 在 LAN 內通訊。

## Goals / Non-Goals

**Goals:**
- 建立穩定的 WebSocket 即時通訊管道，延遲 < 50ms
- 實現手機輸入文字即時注入電腦游標位置
- 提供可靠的連線狀態反饋機制
- 確保零外網連線、零 Telemetry

**Non-Goals (Phase 1 範圍外):**
- mDNS 自動發現（Phase 2）
- Windows UI Automation 文字抓取（Phase 2）
- Backspace/刪除/取代邏輯（Phase 3）
- 多裝置同時連線
- 加密通訊（LAN 內信任模型）

## Architecture

```
┌──────────────────────────────────┐     Wi-Fi / LAN      ┌──────────────────────────────┐
│         Mobile Phone             │◄───────────────────►│        Windows PC              │
│                                  │   WebSocket (ws://)  │                                │
│  ┌────────────────────────────┐  │                      │  ┌──────────────────────────┐  │
│  │   Browser (PWA)            │  │                      │  │   Python Backend          │  │
│  │                            │  │   "text" event       │  │   (Flask-SocketIO)        │  │
│  │   - Text Input Area        │──┼─────────────────────►│  │                            │  │
│  │   - Connection Status      │  │                      │  │   ┌──────────────────┐    │  │
│  │   - Mode Selector          │  │   "status" event     │  │   │ Event Handler    │    │  │
│  │                            │◄─┼──────────────────────┤  │   │   ↓              │    │  │
│  └────────────────────────────┘  │                      │  │   │ pyautogui.write()│    │  │
│                                  │                      │  │   │   ↓              │    │  │
│  System IME (手寫/語音/拼音)     │                      │  │   │ Active Window    │    │  │
│                                  │                      │  │   └──────────────────┘    │  │
└──────────────────────────────────┘                      │  │                            │  │
                                                          │  │   Static File Server      │  │
                                                          │  │   (serves PWA files)       │  │
                                                          │  └──────────────────────────┘  │
                                                          └──────────────────────────────┘
```

### 組件拆分

| 組件 | 技術 | 職責 |
|---|---|---|
| **PC Receiver** | Python 3.10+, Flask-SocketIO, eventlet | WebSocket 伺服器、靜態檔案託管、按鍵注入 |
| **Keystroke Engine** | pyautogui (主要), ctypes (備用) | 將接收到的文字模擬為鍵盤輸入 |
| **Mobile Controller** | 純 HTML/CSS/JS (PWA) | 手機端輸入介面，透過 Socket.IO client 連線 |

### 通訊協議

```
事件名稱           方向              Payload 結構
────────────────────────────────────────────────────
"text_input"       手機 → 電腦       { "text": "你好", "mode": "stream" }
"key_command"      手機 → 電腦       { "key": "backspace", "count": 1 }
"status_update"    電腦 → 手機       { "status": "connected", "hostname": "MY-PC" }
"error"            電腦 → 手機       { "message": "注入失敗", "code": "INJECT_ERR" }
```

## Decisions

1. **Flask-SocketIO + eventlet 而非 FastAPI + websockets**
   - 理由：Socket.IO 提供內建的自動重連、心跳機制和房間管理，大幅減少手動實作量。Flask-SocketIO 成熟穩定，且 eventlet 的非同步模型足以應對單裝置場景。

2. **pyautogui 作為按鍵注入引擎**
   - 理由：跨平台、API 簡潔。對於 CJK 字元，使用 `pyperclip` + `Ctrl+V` 模擬貼上方式注入，避免 `pyautogui.write()` 不支援非 ASCII 的問題。
   - 備用方案：若效能不足，可切換至 `ctypes` 直接呼叫 Win32 `SendInput` API。

3. **PWA 由 Python 後端直接託管**
   - 理由：消除部署複雜度。手機只需瀏覽 `http://<PC_IP>:5000` 即可取得前端頁面，無需額外的前端伺服器。

4. **CJK 字元注入策略：剪貼簿模擬**
   - 理由：`pyautogui.write()` 僅支援 ASCII。對於中文/日文/韓文字元，採用「寫入剪貼簿 → 模擬 Ctrl+V」的策略，確保所有 Unicode 字元都能正確注入。

## File Structure

```
ghostwriter/
├── server.py              # 主程式入口：Flask app + SocketIO + 靜態檔案託管
├── injector.py            # 按鍵注入引擎：pyautogui 封裝 + CJK 剪貼簿策略
├── requirements.txt       # Python 依賴清單
├── static/                # PWA 前端檔案（由 Flask 託管）
│   ├── index.html         # 主頁面
│   ├── app.js             # Socket.IO 客戶端邏輯
│   ├── style.css          # 介面樣式
│   └── manifest.json      # PWA manifest
└── README.md              # 安裝與使用說明
```

## Risks / Trade-offs

| 風險 | 等級 | 緩解策略 |
|---|---|---|
| CJK 字元注入依賴剪貼簿，可能覆蓋使用者剪貼簿內容 | 中 | 注入前備份剪貼簿、注入後還原 |
| pyautogui 在某些應用中可能被安全軟體攔截 | 低 | 提供 ctypes SendInput 備用路徑 |
| 同一 Wi-Fi 下其他裝置可能嘗試連線 | 低 | Phase 1 使用簡單的連線確認機制 |
| eventlet monkey-patching 可能與其他庫衝突 | 低 | 保持依賴最小化 |
