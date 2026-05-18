## MODIFIED Requirements

### Requirement: CJK Character Injection (Clipboard Strategy) — 增強版
對於非 ASCII 字元（中文、日文、韓文等）或長文本，使用剪貼簿模擬策略注入。此策略也將用於「圓盤選單」的快速文字填入，以確保速度與準確性。

**Thread Safety 新增**：所有剪貼簿操作必須由 `threading.Lock` (mutex) 保護，防止 GhostWriter Server 線程和 Radial Menu 進程同時操作剪貼簿。

#### Scenario: Inject Chinese text
- **WHEN** 注入引擎接收到中文文字 `"你好世界"`
- **THEN** 引擎獲取 `_clipboard_lock`
- **AND** 備份當前剪貼簿內容
- **AND** 將 `"你好世界"` 寫入系統剪貼簿
- **AND** 設置 `_is_self_injecting = True`
- **AND** 模擬 `Ctrl+V` 按鍵組合
- **AND** 設置 `_is_self_injecting = False`
- **AND** 恢復原始剪貼簿內容
- **AND** 釋放 `_clipboard_lock`
- **AND** 文字出現在當前焦點視窗的游標位置

#### Scenario: Inject mixed ASCII and CJK text
- **WHEN** 注入引擎接收到混合文字 `"Hello你好"`
- **THEN** 引擎自動偵測並使用 CJK 剪貼簿策略（因包含非 ASCII）
- **AND** 完整文字正確注入

#### Scenario: Rapid injection from Radial Menu
- **WHEN** 用戶從圓盤選單選擇一段長文本
- **THEN** 系統呼叫 `force_clipboard_paste(text)` 強制使用剪貼簿策略（無視內容是否為純 ASCII）
- **AND** 文字正確出現在游標位置

#### Scenario: Concurrent injection protection
- **WHEN** GhostWriter Server 和 Radial Menu 同時嘗試注入文字
- **THEN** 第二個呼叫者被 Lock 阻塞，直到第一個完成
- **AND** 兩段文字都正確注入，剪貼簿不被污染
