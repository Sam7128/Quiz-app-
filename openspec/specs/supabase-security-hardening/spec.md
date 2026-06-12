# Spec: Supabase Security Hardening

## Purpose
Ensure the security and integrity of user data stored in Supabase by enforcing Row Level Security (RLS) and securing database functions and authentication.

## ADDED Requirements

### Requirement: Row Level Security on Public Tables
The system MUST enforce Row Level Security (RLS) on the following tables: `study_sessions`, `user_study_stats_30day`, `user_streaks`, `user_achievements`, and `challenges`. It SHALL restrict access to those rows where the user identifier matches the authenticated session's UID.

#### Scenario: Unauthorized Access Blocked
- **WHEN** an unauthenticated client or an authenticated client with a `uid` different from the row's owner attempts to SELECT or UPDATE the `study_sessions` table
- **THEN** the Database MUST return an empty result set (for SELECT) or throw an error/deny the operation (for UPDATE/DELETE/INSERT)
- **AND** the database linter SHALL NOT report the table as having RLS disabled

#### Scenario: Authorized Access Allowed
- **WHEN** an authenticated user queries their own `user_study_stats_30day` where `user_id` equals `auth.uid()`
- **THEN** the Database MUST return the correct rows or allow modification

### Requirement: Secure Function Search Path
The function `public.handle_new_user` MUST be configured with a defined `search_path` to prevent privilege escalation via schema manipulation.

#### Scenario: Function Invocation is Path-Secure
- **WHEN** `handle_new_user` is triggered upon user registration
- **THEN** it MUST execute using the strict namespace provided by the configuration (e.g., `public`), disregarding the caller's mutable search path
- **AND** the database linter SHALL NOT report the function as having a mutable search path

### Requirement: Leaked Password Protection in Auth
The Supabase authentication service MUST be configured to refuse passwords identified in leaked password databases.

#### Scenario: Vulnerable Password Usage Denied
- **WHEN** a user attempts to sign up or change their password using a known compromised password (e.g. found on HaveIBeenPwned)
- **THEN** the Supabase Auth system MUST reject the request
- **AND** the Frontend SHOULD display an error instructing the user to pick a more secure password
- **AND** the database linter SHALL NOT report leaked password protection as disabled

### Requirement: Cloud bank queries MUST filter by authenticated user
`getCloudBanks()` SHALL 在查詢 `banks` 表時強制附加 `.eq('user_id', user.id)` 過濾條件，確保只回傳屬於當前登入用戶的題庫。

#### Scenario: Authenticated user fetches banks
- **WHEN** 已登入用戶呼叫 `getCloudBanks()`
- **THEN** Supabase 查詢 SHALL 包含 `.eq('user_id', user.id)` 條件
- **AND** 系統 SHALL 先呼叫 `supabase.auth.getUser()` 取得用戶 ID
- **AND** 若用戶未登入，系統 SHALL 回傳空陣列 `[]`

#### Scenario: Unauthenticated user fetches banks
- **WHEN** 未登入用戶呼叫 `getCloudBanks()`
- **THEN** 系統 SHALL 回傳空陣列 `[]` 而不發送 any Supabase 查詢

### Requirement: Cloud bank deletion MUST verify ownership
`deleteCloudBank()` SHALL 在刪除 `banks` 表的記錄時附加 `.eq('user_id', user.id)` 過濾條件，確保只能刪除屬於自己的題庫。

#### Scenario: Authenticated user deletes own bank
- **WHEN** 已登入用戶呼叫 `deleteCloudBank(bankId)`
- **THEN** Supabase 刪除查詢 SHALL 同時包含 `.eq('id', bankId)` 與 `.eq('user_id', user.id)` 條件
- **AND** 系統 SHALL 先呼叫 `supabase.auth.getUser()` 取得用戶 ID

#### Scenario: Unauthenticated user attempts deletion
- **WHEN** 未登入用戶呼叫 `deleteCloudBank(bankId)`
- **THEN** 系統 SHALL 不執行 any 刪除操作
- **AND** 系統 SHALL 記錄警告日誌

### Requirement: Challenge score determination via server-side RPC
聯賽分數提交 SHALL 強制使用 Supabase RPC 函數 `submit_challenge_score(p_challenge_id, p_score)` 來提交分數並由後端判定勝負。不允許 any 前端 fallback 判定，以防止繞過安全機制。
- **後端安全要求**：
  - **IDOR 防禦**：RPC 必須驗證呼叫者身份（`auth.uid()`），僅允許該挑戰的參與者（`user_id` 或 `friend_id`）提交分數。
  - **數值校驗**：RPC 必須對提交的 `p_score` 進行合理上限校驗（例如限制在題庫總分的合理範圍內，或 p_score >= 0），防止送出惡意偽造高分。

#### Scenario: RPC available - submit score
- **WHEN** 用戶提交聯賽分數
- **AND** Supabase RPC `submit_challenge_score` 可用
- **THEN** 系統 SHALL 呼叫 RPC 函數傳入 `challenge_id` 和 `score`
- **AND** 系統 SHALL NOT 在前端計算 `winner_id`
- **AND** 系統 SHALL 依據 RPC 回傳結果更新 UI

#### Scenario: RPC failure - fail-fast
- **WHEN** 用戶提交聯賽分數
- **AND** Supabase RPC 呼叫失敗（函數不存在或網路錯誤）
- **THEN** 系統 SHALL 拋出明確錯誤並中斷提交操作
- **AND** 系統 SHALL NOT 回退至前端判定邏輯
- **AND** 系統 SHALL 提示用戶提交失敗且不寫入 any 本地或雲端的 winner 判定
