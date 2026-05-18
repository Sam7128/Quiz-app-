## ADDED Requirements

### Requirement: JSON 設定檔解析
系統必須能夠讀取並解析 `menu_data.json` 檔案，該檔案定義了選單的層級結構、標籤及對應的貼上內容。數據格式必須經過 JSON Schema 驗證。

#### Scenario: 載入配置
- **WHEN** 程式啟動
- **THEN** 系統解析 JSON 並驗證其符合 `menu_schema.json` 定義的格式
- **AND** 更新記憶體中的選單結構。

#### Scenario: 配置檔案不存在
- **WHEN** `menu_data.json` 不存在
- **THEN** 系統自動建立含有預設範例項目的配置檔案。

#### Scenario: 配置檔案格式錯誤
- **WHEN** `menu_data.json` 的 JSON 格式不合法或不符合 Schema
- **THEN** 系統記錄錯誤日誌，並載入內建的預設配置（不修改磁碟上的檔案）。

### Requirement: 配置熱重載
系統必須能夠在運行中偵測到配置檔案的變更，並自動重載新配置，無需重啟程式。

#### Scenario: 偵測配置更新
- **WHEN** `menu_data.json` 的 `mtime`（修改時間）發生變更
- **THEN** 系統在下一次輪詢週期（≤2 秒）內自動重載配置。

### Requirement: 原子寫入保護
所有對 `menu_data.json` 的寫入操作必須使用原子寫入策略（寫入 .tmp → rename），遵循 Data Fortress 協議。

#### Scenario: 儲存變更
- **WHEN** 用戶在編輯器點擊「儲存」
- **THEN** 系統將內容寫入 `menu_data.json.tmp`
- **AND** 成功後 rename `menu_data.json.tmp` → `menu_data.json`
- **AND** 提示用戶儲存成功。

### Requirement: 圖形化編輯介面
系統必須提供一個獨立的編輯器視窗，允許用戶通過樹狀圖新增、刪除或修改常用語，並具備即時預覽功能。

#### Scenario: 顯示菜單結構
- **WHEN** 用戶開啟編輯器
- **THEN** 所有分類和語句以 QTreeWidget 階層結構顯示。
- **AND** 每個節點旁顯示類型圖標（資料夾=分類, 文檔=語句）。

#### Scenario: 新增分類
- **WHEN** 用戶點擊「新增分類」按鈕
- **THEN** QTreeWidget 新增一個可編輯的分類節點。

#### Scenario: 新增語句
- **WHEN** 用戶在某分類節點下點擊「新增語句」
- **THEN** QTreeWidget 在對應分類下新增一個含 label + content 的語句節點。

#### Scenario: 刪除節點
- **WHEN** 用戶選取一個節點並點擊「刪除」
- **THEN** 彈出確認對話框。確認後移除該節點及其所有子節點。
