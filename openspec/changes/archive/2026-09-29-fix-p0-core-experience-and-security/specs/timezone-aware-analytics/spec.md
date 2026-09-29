# timezone-aware-analytics Specification

## ADDED Requirements

### Requirement: Local Timezone Date Helper
系統 SHALL 提供基於客戶端本地時區之日期計算工具函式 `getLocalDateString(date?: Date): string`，格式為 `YYYY-MM-DD`。該函式 SHALL 使用 `toLocaleDateString('sv-SE')` 取得本地時區日期字串，嚴禁直接使用 `toISOString().split('T')[0]` 來代表使用者的本日日期。

#### Scenario: Formatting local date in UTC+8 early morning
- **WHEN** 當前本地時區為 UTC+8（如台北），本地時間為 `2026-09-28 02:30:00`
- **AND** 呼叫 `getLocalDateString()`
- **THEN** 回傳之字串 SHALL 為 `"2026-09-28"`
- **AND** SHALL NOT 因 UTC 尚為 `2026-09-27` 而產生倒流

#### Scenario: Formatting yesterday relative to local date
- **WHEN** 根據本地時間計算昨日日期
- **THEN** 系統將本地日期扣減一天後傳入 `getLocalDateString(yesterday)`
- **AND** 回傳之字串 SHALL 為正確的本地昨日日期

### Requirement: Timezone-Aware Streak and Analytics Recording
**查詢對齊**：`analytics.ts` 的 `getWeeklyStats` 中使用 `getLocalDateString(sevenDaysAgo)` 作為 Supabase 伺服器端 `.gte()` 查詢參數，以確保與存入之本地 `session_date` 日期字串完全對齊。

#### Scenario: Early morning study preserves and increments streak
- **WHEN** 使用者昨日已有打卡記錄（`lastStudyDate === yesterdayStr`）
- **AND** 使用者於清晨 05:00 於東八區完成一次測驗
- **THEN** 系統計算之本日日期 SHALL 為今日（而非昨日）
- **AND** `streak.currentStreak` SHALL 正確累加 1
- **AND** `streak.lastStudyDate` SHALL 更新為今日本地日期

#### Scenario: Multiple sessions on the same local date
- **WHEN** 使用者已於清晨 06:00 完成打卡，並於當天下午 15:00 再次進行測驗
- **THEN** 兩次測驗之 `sessionDate` 判定 SHALL 完全一致
- **AND** Streak SHALL NOT 重複遞增
