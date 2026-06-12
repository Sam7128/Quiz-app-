## MODIFIED Requirements

### Requirement: Cloud bank queries MUST filter by authenticated user
`getCloudBanks()` SHALL 在查詢 `banks` 表時強制附加 `.eq('user_id', user.id)` 過濾條件，確保只回傳屬於當前登入用戶的題庫。

#### Scenario: Authenticated user fetches banks
- **WHEN** 已登入用戶呼叫 `getCloudBanks()`
- **THEN** Supabase 查詢 SHALL 包含 `.eq('user_id', user.id)` 條件
- **AND** 系統 SHALL 先呼叫 `supabase.auth.getUser()` 取得用戶 ID
- **AND** 若用戶未登入，系統 SHALL 回傳空陣列 `[]`

#### Scenario: Unauthenticated user fetches banks
- **WHEN** 未登入用戶呼叫 `getCloudBanks()`
- **THEN** 系統 SHALL 回傳空陣列 `[]` 而不發送任何 Supabase 查詢

### Requirement: Cloud bank deletion MUST verify ownership
`deleteCloudBank()` SHALL 在刪除 `banks` 表的記錄時附加 `.eq('user_id', user.id)` 過濾條件，確保只能刪除屬於自己的題庫。

#### Scenario: Authenticated user deletes own bank
- **WHEN** 已登入用戶呼叫 `deleteCloudBank(bankId)`
- **THEN** Supabase 刪除查詢 SHALL 同時包含 `.eq('id', bankId)` 與 `.eq('user_id', user.id)` 條件
- **AND** 系統 SHALL 先呼叫 `supabase.auth.getUser()` 取得用戶 ID

#### Scenario: Unauthenticated user attempts deletion
- **WHEN** 未登入用戶呼叫 `deleteCloudBank(bankId)`
- **THEN** 系統 SHALL 不執行任何刪除操作
- **AND** 系統 SHALL 記錄警告日誌

## ADDED Requirements

### Requirement: Challenge score determination via server-side RPC
聯賽分數提交 SHALL 強制使用 Supabase RPC 函數 `submit_challenge_score(p_challenge_id, p_score)` 來提交分數並由後端判定勝負。不允許任何前端 fallback 判定，以防止繞過安全機制。
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
- **AND** 系統 SHALL 提示用戶提交失敗且不寫入任何本地或雲端的 winner 判定

