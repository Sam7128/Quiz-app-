## Why

為 GhostWriter 引入「圓盤選單工作工具包 (Radial Menu Toolkit)」，旨在解決用戶在日常工作中頻繁輸入重複語句的痛點。通過全域快捷鍵召喚可視化選單，用戶可以實現毫秒級的文字輸入，將 GhostWriter 從手機電腦橋接器升級為全能的生產力中心。

## What Changes

- **全域事件監聽**：新增後台監聽器，捕捉自定義組合鍵（如 Ctrl + 滑鼠中鍵）。
- **可視化圓盤選單**：引入基於 PyQt6 的半透明、Cyberpunk 風格圓盤選單，支持滑動選取。
- **巢狀菜單支持**：支持多級分類，允許用戶通過選單進入子分類，並可返回上層。
- **圖形化配置編輯器**：提供獨立的 GUI 介面，讓用戶無需修改代碼即可管理常用語。
- **剪貼簿整合**：選中語句後自動複製到剪貼簿並模擬貼上動作（含 mutex 保護）。

## Architecture Decision: 雙進程架構

> **關鍵架構決策**：Radial Menu 作為**獨立進程**運行，與 GhostWriter Flask-SocketIO Server 完全隔離。
> 
> - **原因**：PyQt6 要求 `QApplication.exec()` 佔據主線程事件循環，與 Flask-SocketIO 的 `threading` async_mode 不相容。在同一進程中混用會導致 UI 凍結或崩潰。
> - **通訊方式**：共用 `injector.py` 模組（直接 import），不需跨進程 IPC。Radial Menu 本身就在本機運作，直接呼叫 `inject_text()` 即可。
> - **啟動方式**：透過 `launcher.py` 同時啟動兩個進程（GhostWriter Server + Radial Menu），或用戶可單獨啟動 Radial Menu。

## Capabilities

### New Capabilities
- `radial-menu-ui`: 處理選單的繪製、角度計算、動畫效果與半透明視窗管理。
- `hotkey-interceptor`: 實現低層級的全域鍵盤與滑鼠事件監聽，確保在後台能準確觸發。
- `toolkit-config-manager`: 負責 `menu_data.json` 的解析、儲存，以及獨立編輯器的邏輯。

### Modified Capabilities
- `keystroke-injection`: 擴展現有的注入邏輯，加入 threading.Lock 保護剪貼簿操作，防止多方同時調用時產生競態條件。

## Impact

- **新增依賴**：`PyQt6`, `pynput`, `pyperclip`（已存在）, `jsonschema`（驗證用）。
- **系統資源**：後台監聽器將以低功耗模式運行，選單 UI 僅在觸發時建立（Lazy init）。
- **配置管理**：新增 `menu_data.json` 作為用戶數據檔案，受 Data Fortress 保護（原子寫入 + 備份）。
- **進程模型**：從單一 Python 進程變為可選的雙進程（GhostWriter Server + Radial Menu Toolkit）。
