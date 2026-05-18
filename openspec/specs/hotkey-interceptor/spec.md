## ADDED Requirements

### Requirement: 低延遲事件監聽
系統必須在後台執行一個監聽器，能夠捕捉全域的鍵盤與滑鼠事件。

**效能指標（分層定義）：**
- 事件捕獲延遲: <16ms（從物理按鍵到 callback 觸發）
- UI 出現延遲: <150ms（從 callback 觸發到選單視窗繪製完畢）

#### Scenario: 捕捉組合鍵
- **WHEN** 用戶按下自定義的組合鍵（如 Ctrl + 中鍵）
- **THEN** 系統發出 Qt Signal 以顯示圓盤選單。

### Requirement: 釋放選取機制
系統必須能夠在組合鍵中的特定鍵（如中鍵）釋放時，判定當前所選中的項目並執行輸入動作。

#### Scenario: 確認選取
- **WHEN** 用戶放開滑鼠中鍵
- **THEN** 系統判定目前滑鼠指向的選項為選中狀態。
- **AND** 如果選項為葉節點（純文字），執行注入。
- **AND** 如果選項為分類節點（有子菜單），展開子菜單。

### Requirement: 自觸發忽略
監聽器必須能夠區分「用戶真實輸入」和「pyautogui 模擬輸入」，避免遞迴觸發。

#### Scenario: 忽略模擬按鍵
- **GIVEN** `injector._is_self_injecting` 為 True
- **WHEN** 監聽器捕獲到鍵盤事件
- **THEN** 系統忽略該事件，不觸發任何操作。

### Requirement: 取消監聽
系統必須支持乾淨的監聽器關閉，不留下孤立線程。

#### Scenario: 程式關閉
- **WHEN** 主程式退出時
- **THEN** 所有 pynput listener 線程都被正確 `.stop()` 和 `.join()`。
