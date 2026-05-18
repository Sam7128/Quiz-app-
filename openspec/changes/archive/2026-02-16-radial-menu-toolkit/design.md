## Context

GhostWriter 目前專注於手機到電腦的輸入橋接。為了提升個人生產力，我們需要一個本地端的高效觸發機制，讓常用的「模板化語句」能通過極簡的手勢（滑鼠中鍵+組合鍵）快速填入。

**現有架構掃描** (v2026-02-16):
- `server.py`: Flask-SocketIO, `threading` async_mode, 單一 Python 進程。
- `injector.py`: `inject_text()` → `_inject_ascii()` / `_inject_clipboard()`，**無 thread safety**。
- `context_grabber.py`: 使用 `uiautomation` COM 介面，受益於 `UIAutomationInitializerInThread()`。
- 依賴: flask, flask-socketio, pyautogui, pyperclip, qrcode, comtypes, uiautomation。

## Goals / Non-Goals

**Goals:**
- G1: 提供一個低延遲的全域熱鍵觸發機制（事件捕獲 <16ms, UI 出現 <150ms）。
- G2: 實現一個視覺美觀（PyQt6）且易於操作的圓盤選單。
- G3: 提供一個用戶友好的配置編輯器。
- G4: 確保輸入過程不干擾用戶原本的剪貼簿（具備 mutex 保護的備份/恢復功能）。
- G5: 與 GhostWriter Server 完全解耦，可以獨立啟動和使用。

**Non-Goals:**
- NG1: 不涉及雲端同步或多人協作功能（目前僅限本地 JSON 儲存）。
- NG2: 不提供複雜的文字宏（Macro）邏輯（如自動計算日期等），僅限純文字貼上。
- NG3: 不與 GhostWriter 的 WebSocket 互動（無手機遠端選單控制）。

## Decisions

### 1. 雙進程架構 (Critical)
- **決策**：Radial Menu 作為獨立 Python 進程運行，不嵌入 Flask server 進程。
- **原因**：PyQt6 要求 `QApplication.exec()` 佔據主線程事件循環。Flask-SocketIO 的 `socketio.run()` 也佔據主線程。兩者在同一進程中無法共存。
- **通訊**：不需 IPC。兩個進程獨立運作，共用 `injector.py` 模組（import 即可）。
- **替代方案（已否決）**：
  - 在 Flask 背景線程中啟動 Qt → ❌ Qt UI 必須在主線程。
  - 用 Tkinter 替代 PyQt → ❌ Tkinter 無法做半透明/自定義繪圖。
  - 用 Web UI (Flask route) 替代桌面 UI → ❌ 無法做到全域呼出，延遲高。

### 2. 選擇 PyQt6 作為 UI 框架
- **原因**：支持高效的 2D 繪圖（QPainter）、原生視窗透明與模糊效果，且與 Python 生態整合良好。
- **替代方案**：Tkinter（功能太弱，美觀度差）、Electron（資源佔用過高，且與系統熱鍵整合較複雜）。

### 3. 使用 pynput 進行事件監聽
- **原因**：跨平台性好，API 簡潔，適合攔截組合鍵事件。
- **注意事項**：`pynput` listener 會捕獲所有鍵盤事件，包括 `pyautogui.hotkey()` 模擬的事件。必須加入「自觸發忽略」邏輯（設置一個 flag `_is_self_injecting`）。
- **替代方案**：keyboard 庫（需要管理員權限較多）、win32api（僅限 Windows，維護複雜）。

### 4. 基於剪貼簿的文字注入策略（含 Mutex）
- **原因**：這是目前處理 CJK 字元與長文本最穩定、速度最快的方法。
- **改進**：在 `injector.py` 中加入 `threading.Lock` 保護所有剪貼簿操作，防止 GhostWriter Server 和 Radial Menu 同時調用 `_inject_clipboard()` 時產生競態條件。
- **替代方案**：逐字模擬按鍵（速度極慢，且容易受輸入法狀態影響導致亂碼）。

### 5. 配置熱重載機制
- **決策**：Config Editor 儲存 JSON 後，通過 `watchdog` file watcher 或輪詢（每 2 秒）通知 Radial Menu 進程重載數據。
- **原因**：避免用戶修改配置後需重啟程式。
- **簡化方案**：直接用 `os.path.getmtime()` 輪詢（無需新增 watchdog 依賴）。

## Risks / Trade-offs

- **[Risk] 全螢幕遊戲相容性**：PyQt 視窗可能無法覆蓋某些以 Exclusive Mode 運行的全螢幕遊戲。
  - ➔ **Mitigation**: 提示用戶在遊戲中使用視窗化模式，或在設計中加入 Win32 `SetWindowPos(HWND_TOPMOST)` 調用。
- **[Risk] 殺毒軟體攔截**：監聽鍵盤滑鼠事件可能被視為惡意軟體（Keylogger）。
  - ➔ **Mitigation**: 在 README 中說明原理，並建議用戶將其加入白名單。
- **[Risk] pynput 自觸發循環**：`pynput` 會捕獲 `pyautogui` 發出的模擬按鍵，可能導致遞迴觸發。
  - ➔ **Mitigation**: 在注入期間設置 `_is_self_injecting = True` flag，listener 回調中檢查此 flag 並忽略。
- **[Trade-off] 依賴體積**：PyQt6 會增加約 100MB 的打包體積。
  - ➔ **Mitigation**: Radial Menu 是可選模組，不影響 GhostWriter Server 的輕量運行。

## Migration Plan

1. **Phase 0** (前置): 為 `injector.py` 加入 `threading.Lock`，確保 thread safety。
2. **Phase 1** (核心): 獨立開發 `radial_menu.py`（PyQt6 UI + 角度計算引擎）。
3. **Phase 2** (觸發): 整合 `pynput` 監聽器到 `hotkey_listener.py`，含自觸發忽略邏輯。
4. **Phase 3** (配置): 開發 `toolkit_config.py`（JSON 管理 + mtime 輪詢）。
5. **Phase 4** (編輯器): 開發 `config_editor.py`（QTreeWidget 編輯器）。
6. **Phase 5** (黏合): 建立 `launcher.py` 統一啟動入口，提供預設 `menu_data.json`。
