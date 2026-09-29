## ADDED Requirements

### Requirement: Logout storage cleanup (dual storage & fault-tolerant)
`AuthContext.signOut` 函式 SHALL 採用 `try...finally` 結構呼叫 `clearUserDataOnSignOut()`，無論遠端 Supabase API 呼叫成功或失敗，皆 100% 確保執行本地資料清理：
1. **localStorage**：清除所有以 `mindspark_` 為前綴且不在白名單中的項目，防止跨帳號資料殘留。
2. **sessionStorage**：清除所有以 `mindspark_` 為前綴的項目（包含 `mindspark_ai_config` 中的 AI API Key），徹底消除公用裝置金鑰外洩風險。

**白名單保留項目**（全域無敏感性裝置級偏好）：
- `mindspark_theme`
- `mindspark_bgm_enabled`
- `mindspark_sfx_enabled`

**SIGNED_OUT 防守底線**：`onAuthStateChange` 回調中 SHALL 對 `SIGNED_OUT` 事件額外呼叫 `clearUserDataOnSignOut()`，確保即使 `signOut()` 中途異常仍執行清理。

**退場標記**：`// ponytail: [Sunset: v2.0 - 待系統全面遷移至 user-scoped IndexedDB 後，localStorage 暫存機制將正式退役]`

#### Scenario: All non-whitelisted local and session keys removed on signOut
- **WHEN** 已登入使用者呼叫 `signOut()`
- **AND** localStorage 中存在 `mindspark_banks_meta`, `mindspark_bank_<uuid>`, `mindspark_streak`, `mindspark_theme`
- **AND** sessionStorage 中存在 `mindspark_ai_config` (含 API Key)
- **THEN** 系統 SHALL 移除 localStorage 中所有非白名單 `mindspark_*` 項目
- **AND** 系統 SHALL 移除 sessionStorage 中所有 `mindspark_*` 項目（含 AI Key）
- **AND** 白名單項目（`mindspark_theme`, `mindspark_bgm_enabled`, `mindspark_sfx_enabled`）SHALL 保留
- **AND** 非 `mindspark_` 前綴的第三方項目 SHALL 不被影響

#### Scenario: Network failure during signOut still triggers cleanup
- **WHEN** 使用者在離線或伺服器異常時呼叫 `signOut()`
- **AND** `supabase.auth.signOut()` 拋出網路異常
- **THEN** `finally` 區塊 SHALL 保證 `clearUserDataOnSignOut()` 依然被呼叫並完成清理
- **AND** 本地敏感資料 SHALL NOT 殘留

#### Scenario: signOut with no storage data
- **WHEN** 使用者呼叫 `signOut()` 但存儲中無任何 `mindspark_*` 項目
- **THEN** `signOut()` SHALL 正常完成（不拋出例外）

#### Scenario: Dynamic bank keys are cleaned
- **WHEN** localStorage 中存在動態生成的 key（如 `mindspark_bank_abc-123`, `mindspark_chunk_draft:sess1:0`）
- **THEN** 前綴迭代清除 SHALL 覆蓋所有這些動態 key

### Requirement: Local date string standardization
系統在需要產出本地日期字串（用於 session_date 比對、streak lastStudyDate 比對）的場景中，SHALL 使用統一的 `getLocalDateString()` 工具函式（返回 `YYYY-MM-DD` 格式），取代 `new Date().toISOString().split('T')[0]`。此函式 SHALL 基於使用者系統時區計算日期。

#### Scenario: UTC+8 user studies at 01:00 local time
- **WHEN** 系統時區為 UTC+8 且本地時間為 2026-09-28 01:00:00 (UTC 2026-09-27 17:00:00)
- **THEN** `getLocalDateString()` SHALL 返回 `"2026-09-28"`
- **AND** 學習紀錄 SHALL 歸入 9/28 而非 9/27

#### Scenario: UTC+8 user studies at 23:00 local time
- **WHEN** 系統時區為 UTC+8 且本地時間為 2026-09-28 23:00:00
- **THEN** `getLocalDateString()` SHALL 返回 `"2026-09-28"`

#### Scenario: Streak yesterday calculation uses local timezone
- **WHEN** `updateLocalStreak()` 計算「昨天」日期
- **THEN** yesterday 計算 SHALL 基於本地時區（取 `new Date()` 並 `setDate(getDate()-1)`）
- **AND** yesterday 字串 SHALL 使用 `getLocalDateString(yesterday)` 而非 `yesterday.toISOString().split('T')[0]`

#### Scenario: Cloud study session date uses local date
- **WHEN** `recordStudySession()` 計算 today 用於 Supabase `session_date` 查詢
- **THEN** today 字串 SHALL 使用 `getLocalDateString()` 以確保與本地日期一致
