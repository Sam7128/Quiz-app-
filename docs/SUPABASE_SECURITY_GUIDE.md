# Supabase Security Hardening Configuration Guide
-- 達成任務 4.1 (Leaked Password Protection) & 其他非程式碼安全配置 --

## 1. 啟用 Leaked Password Protection (洩漏密碼防護)
Supabase 提供內建功能來防止使用者在註冊或更改密碼時，使用已在知名外洩庫（如 HaveIBeenPwned）中出現過的密碼。

**執行步驟：**
1. 登入 [Supabase Dashboard](https://supabase.com/dashboard).
2. 進入你的專案。
3. 導覽至 **Authentication** -> **Settings**.
4. 捲動至 **Security** 區段。
5. 找到 **"Enable leaked password protection"** 選項並將其切換為 **ON**.
6. 點擊 **Save**.

## 2. 安全 Search Path 驗證基準
雖然我們已經在 `supabase_security_hardening_audit_2026.sql` 中自動修補了 `search_path` 參數，但在管理 Supabase 時需注意：
- 避免在 RLS 策略中使用複查複雜且依賴多層檢視表 (Views) 的邏輯，這可能導致效能下降。
- 確保所有 Exposed 表在 `public` schema 都有對應的 RLS。

## 3. 前端錯誤處理計畫 (Stress Test Issue-005)
Supabase Auth 在密碼外洩時會回傳特定錯誤。
- **Error Code**: 通常包含在 `AuthApiError` 中，且訊息為 `"This password has been found in a previous database leak."`。
- **實作建議**: 在應用程式的 `Auth` 模組中，將該訊息對應至繁體中文：「此密碼曾出現在外洩資料庫中，為了您的安全，請選擇更強的密碼。」
