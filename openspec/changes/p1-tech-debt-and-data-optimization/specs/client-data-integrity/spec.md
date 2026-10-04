## ADDED Requirements

### Requirement: Question Deserialization Runtime Validation and Graceful Quarantine
`services/storage.ts` 中的 `getQuestions(bankId)` SHALL 對從 `localStorage` 讀取之題目資料執行結構性執行期校驗（Runtime Type Guard），杜絕 `null.map()` 或 `.join()` 白屏崩潰，並對損毀資料實施安全降級與隔離。

#### Scenario: Valid questions deserialized successfully
- **WHEN** `getQuestions` 讀取格式合法的 JSON 題目陣列（包含合法 `id`、`question`、`options` 陣列、`answer`）
- **THEN** 系統 SHALL 完整返回所有有效題目

#### Scenario: Corrupted question with null options quarantined
- **WHEN** 讀取的題目陣列中某題 `options` 為 `null` 或非陣列
- **THEN** 系統 SHALL 過濾剔除該損毀題目
- **AND** 系統 SHALL 發出 `console.warn` 記錄被隔離之題目資訊
- **AND** 其餘有效題目 SHALL 正常返回供測驗與管理使用
- **AND** 系統 SHALL NOT 拋出例外或導致呼叫端元件崩潰

#### Scenario: Completely malformed JSON returns empty array
- **WHEN** `localStorage` 儲存之題庫字串為非合法 JSON 語法（例如不完整寫入或損毀）
- **THEN** `getQuestions` SHALL 捕獲例外並返回空陣列 `[]`
- **AND** 系統 SHALL NOT 拋出未捕獲錯誤至 React

### Requirement: Question Import UTF-8 BOM Sanitization
`BankManager.tsx` 的 `processJson` SHALL 在呼叫 `JSON.parse` 前，自動清洗字串前導之 UTF-8 Byte Order Mark（`\uFEFF`）。

#### Scenario: Import JSON file containing UTF-8 BOM
- **WHEN** 使用者上傳或貼上帶有 `\uFEFF` 前導字元之 JSON 題庫檔案（例如 Windows 記事本編輯儲存之檔案）
- **THEN** `processJson` SHALL 正則清洗該 BOM 字元
- **AND** `JSON.parse` SHALL 順利解析無語法錯誤
- **AND** 題庫匯入檢查對話框正常彈出

### Requirement: Question Export Blob URL Memory Lifecycle
`BankManager.tsx` 的 `handleExport` SHALL 使用 `Blob` 與 Object URL 替代 Data URI，並在下載觸發後嚴格執行記憶體釋放（Revocation）。

#### Scenario: Large question bank export via Blob
- **WHEN** 使用者點擊題庫匯出按鈕
- **THEN** 系統 SHALL 建立 `new Blob([jsonString], { type: 'application/json;charset=utf-8' })`
- **AND** 系統 SHALL 透過 `URL.createObjectURL(blob)` 產生暫時下載 URL
- **AND** 建立之 `<a>` 標籤點擊觸發下載後 SHALL 自 DOM 移除
- **AND** 系統 SHALL 調用 `URL.revokeObjectURL(url)` 釋放 Object URL 記憶體
- **AND** 系統 SHALL NOT 使用 `data:text/json;charset=utf-8,` Data URI 匯出
