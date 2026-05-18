# context-grabber

使用 Windows UI Automation API (IUIAutomation / ITextPattern) 抓取當前焦點視窗的文字內容、游標位置、選取範圍。

## ADDED Requirements

### Requirement: Focused Element Detection
必須準確識別當前接收鍵盤輸入的焦點元素。

#### Scenario: Detect focused element in Notepad
- **WHEN** 使用者在 Notepad 中編輯文件
- **THEN** `get_cursor_context()` 正確識別 Notepad 的文字區域為焦點元素
- **AND** 回傳的 `app_name` 包含 "Notepad"

#### Scenario: No text element focused
- **WHEN** 焦點在桌面或非文字元素上（如檔案總管圖示）
- **THEN** 回傳 `{ "supported": false, "reason": "No text element focused" }`

### Requirement: Text Context Extraction
必須抓取游標前後指定數量的字元。

#### Scenario: Extract context around cursor
- **WHEN** Notepad 中有文字 "Hello World" 且游標在 "Hello" 和 " World" 之間
- **THEN** `get_cursor_context(chars_before=50, chars_after=50)` 回傳
  - `before`: "Hello"
  - `after`: " World"
  - `selected`: ""

#### Scenario: Text shorter than requested range
- **WHEN** 文字總長度小於 100 字元
- **THEN** 回傳實際可用的文字，不補空白

#### Scenario: Cursor at beginning of text
- **WHEN** 游標在文字最開頭
- **THEN** `before` 為空字串，`after` 包含游標後的字元

### Requirement: Selection Detection
必須偵測並回傳使用者選取的文字。

#### Scenario: Text is selected
- **WHEN** 使用者選取了 "World" 這個字
- **THEN** `selected` 欄位包含 "World"

### Requirement: TextPattern Fallback
不支援 ITextPattern 的應用必須優雅降級。

#### Scenario: Application without TextPattern
- **WHEN** 焦點元素不支援 UIA TextPattern（如某些遊戲或自繪 UI）
- **THEN** 回傳 `{ "supported": false, "reason": "TextPattern not available" }`
- **AND** 不拋出例外

### Requirement: Thread Safety
COM 呼叫必須在正確初始化的執行緒中執行。

#### Scenario: Called from background thread
- **WHEN** `get_cursor_context()` 從非主執行緒呼叫
- **THEN** 函式內部使用 `CoInitializeEx` 初始化 COM
- **AND** 呼叫完成後使用 `CoUninitialize` 清理
