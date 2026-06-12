## ADDED Requirements

### Requirement: API Key Encrypted Storage
系統 SHALL 對用戶輸入的 AI API Key 在持久化至 localStorage 之前，使用 Web Crypto API (AES-GCM) 進行客戶端加密。

#### Scenario: Save AI config with persist=true
- **WHEN** 用戶儲存 AI 設定且 `persist` 為 `true`
- **THEN** 系統 SHALL 使用 AES-GCM 加密 `apiKey` 欄位後再寫入 localStorage
- **AND** 加密密鑰 SHALL 基於本地隨機生成的 persistent salt 派生（若 localStorage 中無 `mindspark_crypto_salt` 則生成並保存一個隨機 hex 鹽值）
- **AND** 加密後的格式 SHALL 包含 `iv`（初始化向量）和 `ciphertext`（密文）

#### Scenario: Load AI config with encrypted key
- **WHEN** 系統從 localStorage 讀取 AI 設定
- **AND** `apiKey` 欄位為加密格式（具有 `iv` 和 `ciphertext` 屬性的物件）
- **THEN** 系統 SHALL 使用相同的本地 persistent salt 派生密鑰進行解密
- **AND** 系統 SHALL 將解密後的明文 key 用於 API 呼叫

#### Scenario: Load AI config with plain text key (migration)
- **WHEN** 系統從 localStorage 讀取 AI 設定
- **AND** `apiKey` 欄位為明文字串（舊版格式）
- **THEN** 系統 SHALL 接受該明文 key
- **AND** 系統 SHALL 在下次儲存時自動將其加密

#### Scenario: Decryption failure
- **WHEN** 系統嘗試解密 AI API Key 但失敗（Salt 丟失或資料損壞）
- **THEN** 系統 SHALL 清除已儲存的設定（僅透過 `removeItem('mindspark_ai_config')` 移除 AI 配置，嚴禁使用全域 `localStorage.clear()`）
- **AND** 系統 SHALL 回傳 `null` 表示設定不存在
- **AND** 系統 SHALL 記錄 `console.warn` 提示用戶重新輸入 Key

#### Scenario: Session-only mode unaffected
- **WHEN** 用戶儲存 AI 設定且 `persist` 為 `false`
- **THEN** 系統 SHALL 將設定存至 `sessionStorage`（明文，因為 session 結束即消失）
- **AND** 系統 SHALL NOT 加密 sessionStorage 中的 Key
