## Why

近期系統安全掃描（`安全警告.md`）發現了多個針對 Supabase 的高危險與警告級別安全性問題。這包括五個資料表（`study_sessions`、`user_study_stats_30day`、`user_streaks`、`user_achievements`、`challenges`）在 `public` schema 中未啟用 Row Level Security (RLS)，這會造成嚴重的資料存取控制漏洞，允許任何拿到匿名公鑰 (anon key) 的人隨意讀取或竄改任意使用者的資料。此外，`public.handle_new_user` 函數的 `search_path` 為 mutable，存在潛在的權限提升或執行未授權函數的風險；另外 Supabase Auth 的 Leaked Password Protection 目前被停用，降低了帳號防護能力。修復這些問題是防堵潛在攻擊、保護用戶隱私與系統資產的當務之急。

## What Changes

*   **全面啟用及配置 RLS (Row Level Security)**: 將針對五個暴露風險的資料表啟用 RLS，並撰寫嚴謹的存取控制原則 (Policies)，例如：確保 `auth.uid()` 等於對應記錄的使用者 UUID 時才允許 `SELECT`, `INSERT`, `UPDATE`, 或 `DELETE`。
*   **修補資料庫函數 Search Path**: 將 `public.handle_new_user` 函數重新定義，加入 `SET search_path = ''` 或明確限制 path，鎖定其執行時查找函數的範圍，修復警告中的 Search Path Mutable 安全弱點。
*   **增強 Auth 密碼安全**: 在 Supabase Dashboard (或對應配置檔) 中啟用 `auth_leaked_password_protection`（Leaked Password Protection），檢查並攔截已知洩漏的密碼。
*   **全自動化驗證機制**: 為每一個安全修復步驟建立驗證腳本與標準（自動化執行 SQL 查詢確認 RLS 狀態、Policy 總數、函數設定，以及以腳本呼叫 Auth API 驗證密碼保護機制），確保變更後的架構不會在未來的改動中被意外降級。

## Capabilities

### New Capabilities
- `supabase-security-hardening`: Supabase 基礎設施層的安全防禦機制，包含 PostgreSQL 的 RLS、函數屬性防護與 Auth 專案級別安全設置。

### Modified Capabilities
- `cloud-data-integrity`: 將 RLS 和 Search Path 防護明確納入雲端資料完整性的核心需求，確保所有寫入與讀取都在安全的授權範圍內。

## Impact

*   **Database Schema**: 資料表定義將有重大變更（新增安全政策）。未帶有有效使用者憑證的 API 請求將遇到 401/403 錯誤，這對於依賴未驗證存取的異常路徑將是 **BREAKING**。
*   **Database Performance**: RLS 會對每個資料列存取進行額外的條件判斷，可能會帶來極微小的效能開銷。
*   **Authentication DX/UX**: 使用已經遭洩漏密碼的註冊或改密碼行為將會拋出例外錯誤，必須確保前端 UI 能夠適當捕捉並顯示易懂的錯誤提示，引導使用者更換強密碼。
*   **CI/CD Pipeline**: 引入自動化的資料庫安全驗證套件。
