# Spec: API Key Protection

## Purpose
Protect user API keys stored in localStorage via client-side encryption.
## Requirements
### Requirement: API Key Encrypted Storage
系統 SHALL 對用戶輸入的 AI API Key 在持久化至 localStorage 之前，使用 Web Crypto API (AES-GCM) 進行客戶端加密。

#### Scenario: Save AI config with persist=true
- **WHEN** 用戶儲存 AI 設定且 `persist` 為 `true`
- **THEN** 系統 SHALL 使用 AES-GCM 加密 `apiKey` 欄位後再寫入 localStorage
- **AND** 加密密鑰 SHALL 基於本地隨機生成的 persistent salt 派生（若 localStorage 中無 `mindspark_crypto_salt` 則生成並保存一個隨機 hex 鹽值）
- **AND** 加密後的格式 SHALL 包含 `iv`（初始化向量）和 `ciphertext` (密文)

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

### Requirement: Documented Known Limitation of client-only AES-GCM encryption
系統 SHALL 在 `docs/SECURITY_LIMITATIONS.md` 明文記錄：「`utils/crypto.ts` 的 AES-GCM 加密機制僅能防止用戶透過瀏覽器 DevTools（F12）直視 localStorage 中明文的 API Key； salts 與硬編碼 seed `'mindspark_secure_key_seed'` 完全暴露在同網域前端 JS 中，因此無法防禦 XSS 攻擊——惡意腳本可同時讀取 salt、seed 與密文並於受害者瀏覽器中呼叫 SubtleCrypto 解密還原明文 Key」。

此限制 SHALL 被視為設計邊界（非可修補缺陷），主防禦 SHALL 為部署於 `vercel.json` 的嚴格 Content-Security-Policy（見 `vercel-security-headers` spec），用以阻止 XSS 程式碼注入。`docs/SECURITY_LIMITATIONS.md` 亦 SHALL 註記未來升級路徑：(1) 終極防禦為引入後端 Proxy 轉發 AI 請求、前端僅持短期 token；(2) 折衷為用戶輸入密碼派生 PBKDF2 金鑰，但會破壞現有 UX 故本次不採。

#### Scenario: Limitation documented
- **WHEN** 讀取 `docs/SECURITY_LIMITATIONS.md`
- **THEN** 該檔案 SHALL 包含一段說明 AES-GCM 無法防禦 XSS 的限制
- **AND** SHALL 註記 CSP 為主防禦
- **AND** SHALL 列出後端 Proxy 與 PBKDF2 作為未來升級路徑
- **AND** SHALL 明確說明「本次不採 PBKDF2 / 後端 Proxy」的取捨理由（純前端架構與 UX 考量）

#### Scenario: Existing crypto.ts behavior unchanged
- **WHEN** 本變更完成後讀取 `utils/crypto.ts`
- **THEN** 加解密邏輯 SHALL 與變更前完全等價
- **AND** `crypto.test.ts` 既有測試 SHALL 全綠（不需修改）
- **AND** `mindspark_crypto_salt` localStorage 鍵與 `mindspark_secure_key_seed` 種子 SHALL 維持不變（向後相容）

