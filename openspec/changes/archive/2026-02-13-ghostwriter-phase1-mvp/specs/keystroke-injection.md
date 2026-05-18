# keystroke-injection

電腦端接收文字後，透過系統級 API 模擬鍵盤輸入，將字元注入當前焦點視窗。

## ADDED Requirements

### Requirement: ASCII Character Injection
對於 ASCII 字元（英文字母、數字、基本符號），使用 pyautogui 直接注入。

#### Scenario: Inject ASCII text
- **WHEN** 注入引擎接收到純 ASCII 文字 `"hello"`
- **THEN** 使用 `pyautogui.write("hello", interval=0.01)` 逐字注入
- **AND** 字元出現在當前焦點視窗的游標位置

#### Scenario: Inject special ASCII characters
- **WHEN** 注入引擎接收到包含特殊字元的文字 `"hello@world.com"`
- **THEN** 所有字元（包括 `@` 和 `.`）正確注入

### Requirement: CJK Character Injection (Clipboard Strategy)
對於非 ASCII 字元（中文、日文、韓文等），使用剪貼簿模擬策略注入。

#### Scenario: Inject Chinese text
- **WHEN** 注入引擎接收到中文文字 `"你好世界"`
- **THEN** 引擎備份當前剪貼簿內容
- **AND** 將 `"你好世界"` 寫入系統剪貼簿
- **AND** 模擬 `Ctrl+V` 按鍵組合
- **AND** 恢復原始剪貼簿內容
- **AND** 文字出現在當前焦點視窗的游標位置

#### Scenario: Inject mixed ASCII and CJK text
- **WHEN** 注入引擎接收到混合文字 `"Hello你好"`
- **THEN** 引擎自動偵測並使用 CJK 剪貼簿策略（因包含非 ASCII）
- **AND** 完整文字正確注入

### Requirement: Clipboard Safety
注入過程不得永久破壞使用者的剪貼簿內容。

#### Scenario: Clipboard content preserved
- **WHEN** 使用者剪貼簿中有內容 `"important data"`
- **AND** 注入引擎透過剪貼簿策略注入中文文字
- **THEN** 注入完成後，剪貼簿內容恢復為 `"important data"`

### Requirement: Injection Error Handling
注入過程中的錯誤必須被捕獲並回報。

#### Scenario: Injection fails
- **WHEN** pyautogui 注入失敗（例如系統安全軟體攔截）
- **THEN** 引擎捕獲例外
- **AND** 回傳錯誤資訊 `{ "message": "注入失敗", "code": "INJECT_ERR" }`
- **AND** 不中斷伺服器運作
