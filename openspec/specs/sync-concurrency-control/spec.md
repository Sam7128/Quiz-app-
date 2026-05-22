# sync-concurrency-control Specification

## Purpose
TBD - created by archiving change security-and-sync-hardening. Update Purpose after archive.
## Requirements
### Requirement: Sync concurrency lock prevents duplicate sync execution
系統 SHALL 在 `syncLocalPracticeSessions` 執行期間維護模組層級的 `isSyncing` 旗標，阻止並發調用。此旗標 SHALL 在同步開始時設為 `true`，在同步結束（無論成功或失敗）時重設為 `false`。此鎖僅保證**單分頁**排他，跨分頁僅提供 best-effort 行為。

#### Scenario: Duplicate sync call is rejected
- **WHEN** `syncLocalPracticeSessions` 正在執行中
- **AND** 另一個調用者（例如 React Effect 重跑、路由切換）再次呼叫 `syncLocalPracticeSessions`
- **THEN** 第二次呼叫 SHALL 立即返回 `EMPTY_SYNC_RESULT`
- **AND** 系統 SHALL 記錄 console.warn 說明跳過原因
- **AND** 第一次呼叫 SHALL 不受影響，繼續正常執行

#### Scenario: Lock is released after sync failure
- **WHEN** `syncLocalPracticeSessions` 在執行過程中拋出未預期錯誤
- **THEN** `isSyncing` 旗標 SHALL 在 `finally` 區塊中被重設為 `false`
- **AND** 後續的 sync 呼叫 SHALL 能正常執行

#### Scenario: Lock is released after sync success
- **WHEN** `syncLocalPracticeSessions` 成功完成所有 session 的同步
- **THEN** `isSyncing` 旗標 SHALL 被重設為 `false`
- **AND** 返回的 `PracticeSyncResult` SHALL 反映實際的 uploaded/skipped/dirty 計數

### Requirement: syncLocalToCloud limits concurrent bank uploads
系統 SHALL 對 `syncLocalToCloud` 的 bank 上傳加入並發上限，避免一次性觸發大量請求造成 Rate Limit。

#### Scenario: Concurrency is capped
- **WHEN** 使用者有 50 個 bank 需要同步
- **THEN** 系統 SHALL 以固定並發上限分批處理（例如每批 3~5 個）
- **AND** 系統 SHALL 仍回傳完整的成功/失敗摘要

### Requirement: syncLocalToCloud returns failure summary
系統 SHALL 回傳同步摘要（成功/失敗 bank IDs 與錯誤訊息），供 UI 呈現部分失敗與重試入口。

#### Scenario: Partial failure summary is returned
- **WHEN** 同步過程中有部分 bank 失敗
- **THEN** 回傳結果 SHALL 包含失敗 bank 的識別與錯誤訊息

### Requirement: syncLocalToCloud uses Promise.allSettled for fault isolation
系統 SHALL 在 `syncLocalToCloud` 中使用 `Promise.allSettled` 替代 `Promise.all`，以確保單一 bank 的同步失敗不會中斷其他 bank 的同步。

#### Scenario: One bank fails while others succeed
- **WHEN** 使用者有 3 個本機 bank 需要同步
- **AND** 第 2 個 bank 的 `createCloudBank` 失敗（例如網路超時）
- **THEN** 第 1 個和第 3 個 bank 的同步 SHALL 正常完成
- **AND** 系統 SHALL 記錄第 2 個 bank 的失敗原因至 console.error
- **AND** 函式 SHALL NOT 拋出 unhandled rejection

#### Scenario: All banks fail
- **WHEN** 所有 bank 的同步都失敗（例如 Supabase 完全不可用）
- **THEN** 系統 SHALL 記錄所有失敗原因
- **AND** 函式 SHALL 正常返回（不拋錯）
- **AND** 本機資料 SHALL 不受影響

#### Scenario: All banks succeed
- **WHEN** 所有 bank 的同步都成功
- **THEN** 行為 SHALL 與使用 `Promise.all` 時完全一致

