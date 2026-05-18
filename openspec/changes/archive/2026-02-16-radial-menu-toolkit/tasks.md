## Phase 0: 前置工作 — Thread Safety 加固

- [x] 0.1 在 `injector.py` 中加入 `threading.Lock` 保護 `_inject_clipboard()`
  - **驗證**: `pytest test_injector_mutex.py` — 多線程同時呼叫 `inject_text()` 100 次，驗證剪貼簿最終狀態正確且無 race condition (exit code 0)
- [x] 0.2 加入 `_is_self_injecting` flag，供 hotkey listener 判斷是否忽略事件
  - **驗證**: `python -c "from injector import _is_self_injecting; assert hasattr(...)"`

## Phase 1: 環境準備與基礎架構

- [x] 1.1 安裝必要依賴：`pip install PyQt6 pynput jsonschema`
  - **驗證**: `python -c "import PyQt6; import pynput; import jsonschema; print('OK')"` → exit code 0
- [x] 1.2 建立初始 `menu_data.json` 預設配置檔案（含 JSON Schema）
  - **驗證**: `python -c "import json, jsonschema; data=json.load(open('menu_data.json')); jsonschema.validate(data, json.load(open('menu_schema.json')))"` → exit code 0
- [x] 1.3 建立 `toolkit_config.py` 設定管理模組（讀取/驗證/儲存/mtime 監測）
  - **驗證**: `pytest test_toolkit_config.py` — 測試 load/save/validate/reload cycle → all pass

## Phase 2: 圓盤選單核心引擎 (純邏輯，可 100% Unit Test)

- [x] 2.1 實作 `radial_engine.py` — 扇形角度計算引擎（純數學，無 UI 依賴）
  - 函數: `calculate_sectors(items: list) -> list[SectorGeometry]`
  - 函數: `get_hovered_sector(mouse_pos, center, sectors) -> int | None`
  - **驗證**: `pytest test_radial_engine.py` — 覆蓋 3/5/8/12 個項目的角度分配、邊界角度、圓心死區 → all pass
- [x] 2.2 實作多級選單狀態管理 `menu_state.py`（純狀態機，無 UI 依賴）
  - 狀態: `ROOT → SUB_MENU → deeper...`
  - 操作: `enter_submenu(index)`, `go_back()`, `cancel()`, `confirm(index)`
  - **驗證**: `pytest test_menu_state.py` — 測試進入/退出/取消/確認所有狀態轉移路徑 → all pass

## Phase 3: 圓盤選單 UI (PyQt6)

- [x] 3.1 實作 `radial_menu_widget.py` — 基於 PyQt6 的半透明無框視窗
  - 使用 `Qt.WindowStaysOnTopHint | Qt.FramelessWindowHint | Qt.Tool`
  - 背景: `setAttribute(Qt.WA_TranslucentBackground)` + QPainter 半透明圓形
  - **驗證**: `pytest test_radial_menu_widget.py` (使用 `pytest-qt` 的 `qtbot`)
    - 驗證 `widget.isVisible()` 在 `show()` 後為 True
    - 驗證 `windowFlags` 包含預期 flags
    - ⚠️ 視覺效果（透明度、模糊）需人工 smoke test
- [x] 3.2 實作扇形繪製邏輯 (QPainter `drawPie`) + 動態高亮
  - **驗證**: `pytest test_radial_menu_widget.py::test_highlight` — 模擬 QMouseEvent，驗證 `highlighted_index` 正確更新
- [x] 3.3 實作多級選單 UI 切換動畫
  - 加入「返回」按鈕/操作（Esc 鍵或滑鼠右鍵）
  - **驗證**: `pytest test_radial_menu_widget.py::test_submenu_navigation` — 驗證 enter/back 後 widget 顯示的 items 正確
- [x] 3.4 選取確認 → 呼叫 `injector.inject_text()` + 選單隱藏
  - **驗證**: `pytest test_radial_menu_widget.py::test_selection_triggers_inject` — mock `inject_text`，驗證被呼叫且參數正確

## Phase 4: 全域事件監聽 (Hotkey Interceptor)

- [x] 4.1 實作 `hotkey_listener.py` — 基於 `pynput` 的組合鍵監聽
  - 監聽: Ctrl (held) + Middle Mouse Button (press/release)
  - 含 `_is_self_injecting` 忽略邏輯
  - **驗證**: `pytest test_hotkey_listener.py`
    - 使用 mock `pynput.mouse.Listener` + `pynput.keyboard.Listener`
    - 驗證 callback 在正確組合時觸發信號
    - 驗證 `_is_self_injecting=True` 時 callback 被忽略
    - ⚠️ 真實按鍵測試無法在 CI 環境自動化，標記為 `@pytest.mark.manual`
- [x] 4.2 建立 Qt Signal 橋接，將 pynput 事件傳遞到 Qt 主線程
  - **驗證**: `pytest test_hotkey_listener.py::test_signal_bridge` (pytest-qt) — 驗證信號被 emit

## Phase 5: 文字注入強化

- [x] 5.1 在 `injector.py` 中新增 `force_clipboard_paste(text)` 函數
  - 功能: 無論 ASCII 與否，一律使用剪貼簿策略（用於 Radial Menu 快速填入）
  - **驗證**: `pytest test_injector.py::test_force_clipboard_paste` — mock pyperclip/pyautogui，驗證呼叫序列正確
- [x] 5.2 強化剪貼簿備份/恢復邏輯（加入 retry + timeout）
  - **驗證**: `pytest test_injector.py::test_clipboard_restore` — 模擬 pyperclip.paste() 回傳原始值

## Phase 6: 配置編輯器 (Config Editor)

- [x] 6.1 實作 `config_editor.py` 主視窗 — QTreeWidget 展示菜單結構
  - **驗證**: `pytest test_config_editor.py::test_tree_display` (pytest-qt) — 驗證 tree item count 與 menu_data.json 一致
- [x] 6.2 實作 CRUD 功能（新增/刪除分類與語句）
  - **驗證**: `pytest test_config_editor.py::test_crud` — 新增→驗證 count+1, 刪除→驗證 count-1
- [x] 6.3 實作儲存功能 + mtime 輪詢連動
  - **驗證**: `pytest test_config_editor.py::test_save_and_reload` — 儲存後驗證 JSON 檔案已更新，且 toolkit_config 偵測到變更

## Phase 7: 整合與啟動器

- [x] 7.1 建立 `launcher.py` — 統一啟動入口
  - 功能: `python launcher.py` → 同時啟動 GhostWriter Server (subprocess) + Radial Menu (主線程)
  - 功能: `python launcher.py --server-only` / `python launcher.py --menu-only`
  - **驗證**: `pytest test_launcher.py` — mock subprocess.Popen，驗證兩個進程都被正確啟動
- [x] 7.2 更新 `requirements.txt`
  - **驗證**: `pip install -r requirements.txt && python -c "import PyQt6; import pynput"` → exit code 0
- [x] 7.3 更新 README.md 使用說明
  - **驗證**: `test -s ghostwriter/README.md` → 檔案非空

## Phase 8: 端對端驗收 (Manual Smoke Test)

> ⚠️ 以下測試**無法全自動化**，必須在真實 Windows 桌面環境中由人工執行。

- [x] 8.1 啟動 launcher.py，確認 GhostWriter Server + Radial Menu 同時運行
- [x] 8.2 在記事本中按 Ctrl + 中鍵，確認圓盤選單出現在滑鼠位置
- [x] 8.3 滑動選取一個項目並放開，確認文字正確注入記事本
- [x] 8.4 測試多級選單進入/返回
- [x] 8.5 測試 CJK 字元注入（中文語句）
- [x] 8.6 測試剪貼簿不被污染（選取前後剪貼簿內容相同）
- [x] 8.7 在全屏視窗模式下測試選單是否正常顯示
- [x] 8.8 同時使用手機 GhostWriter 打字 + 桌面 Radial Menu，確認無衝突

---

## 驗證覆蓋率摘要

| 類別 | 任務數 | 全自動驗證 | 部分自動 | 人工必須 |
|------|--------|-----------|---------|---------|
| Phase 0 (Thread Safety) | 2 | 2 | 0 | 0 |
| Phase 1 (環境) | 3 | 3 | 0 | 0 |
| Phase 2 (純邏輯引擎) | 2 | 2 | 0 | 0 |
| Phase 3 (PyQt UI) | 4 | 0 | 4 | 0 |
| Phase 4 (Hotkey) | 2 | 0 | 2 | 0 |
| Phase 5 (注入強化) | 2 | 2 | 0 | 0 |
| Phase 6 (Config Editor) | 3 | 1 | 2 | 0 |
| Phase 7 (整合) | 3 | 3 | 0 | 0 |
| Phase 8 (驗收) | 8 | 0 | 0 | 8 |
| **合計** | **29** | **13 (45%)** | **8 (28%)** | **8 (28%)** |
