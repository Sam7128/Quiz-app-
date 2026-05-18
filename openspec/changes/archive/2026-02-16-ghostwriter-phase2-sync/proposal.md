# GhostWriter Phase 2 Sync — Windows UI Automation Text Context

## Why

Phase 1 實現了手機→電腦的單向文字注入，但手機端完全不知道電腦游標附近的文字內容。這意味著使用者無法在手機上進行有效的「編輯」操作——無法看到已輸入的文字、無法判斷游標位置、無法決定刪除或修改哪些字元。Phase 2 透過 Windows UI Automation API 抓取游標周圍的文字上下文並回傳給手機，讓手機端從「盲打模式」升級為「即時同步模式」。

## What Changes

在現有 Phase 1 基礎上增加以下功能：

1. **Context Grabber Engine（上下文抓取引擎）**：新增 Python 模組 `context_grabber.py`，使用 Windows UI Automation (comtypes/ctypes) 讀取當前焦點元素的文字內容與游標位置。
2. **Context Sync Protocol（上下文同步協議）**：擴展 WebSocket 通訊協議，新增 `request_context` / `context_update` 雙向事件。
3. **Mobile Context Display（手機端上下文顯示區）**：在手機 PWA 介面新增「上下文預覽區」，即時顯示電腦游標前後的文字，讓使用者看到自己打的字。

## Capabilities

### New Capabilities

- `context-grabber`: 使用 Windows UI Automation API (IUIAutomation / ITextPattern) 抓取當前焦點視窗的文字內容、游標位置、選取範圍。
- `context-sync-protocol`: WebSocket 雙向同步協議，手機可主動請求上下文，伺服器也可在注入文字後主動推送更新。
- `mobile-context-display`: 手機端新增上下文預覽 UI，顯示游標前後的文字片段，高亮游標位置。

### Modified Capabilities

- `websocket-bridge`: 新增 `request_context` 和 `context_update` 事件處理。
- `mobile-pwa-controller`: 前端新增上下文預覽區域與自動刷新邏輯。

## Impact

- **程式碼**：新增 `context_grabber.py` 模組；修改 `server.py` 增加新事件處理器；修改前端 `app.js` / `index.html` / `style.css` 增加上下文顯示。
- **依賴**：Python 端新增 `comtypes` 依賴（Windows UI Automation COM 介面存取）。
- **系統**：需要目標應用程式支援 UI Automation Text Pattern（Notepad, Word, Chrome 等主流軟體均支援）。
- **安全**：上下文抓取僅在本機運行，不涉及外網通訊，文字資料僅在 LAN 內的 WebSocket 中傳輸。
