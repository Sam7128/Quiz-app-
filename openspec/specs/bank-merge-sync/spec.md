# bank-merge-sync Specification

## Purpose
TBD - created by archiving change security-architecture-hardening-v2. Update Purpose after archive.
## Requirements
### Requirement: BankMetadata carries cloudSyncedAt timestamp
`BankMetadata` 介面 SHALL 新增可選欄位 `cloudSyncedAt?: number`，紀錄該本地題庫最後一次成功同步至雲端的 Unix timestamp（毫秒）。值 `undefined` 代表該題庫從未成功同步至雲端；值 `>= 1` 代表曾經同步成功。`cloudSyncedAt` SHALL 為向後相容欄位：未攜帶此欄位的舊資料 SHALL 視為「未同步」。`saveBanksMeta` 與 `getBanksMeta` SHALL 透過 `JSON.stringify` / `JSON.parse` 自然保存此欄位（不需特殊處理）。

#### Scenario: New local bank has no cloudSyncedAt
- **WHEN** 用戶在 Guest 模式下建立新題庫
- **THEN** 該題庫的 `BankMetadata` SHALL 不攜帶 `cloudSyncedAt` 欄位（或為 `undefined`）
- **AND** `getBanksMeta()` 讀回時 SHALL 將此題庫視為「未同步」

#### Scenario: Synced bank carries timestamp
- **WHEN** 題庫透過 `syncLocalToCloud` 成功上傳雲端
- **THEN** 該題庫的本地 metadata SHALL 被回寫 `cloudSyncedAt = Date.now()`
- **AND** 後續 `getBanksMeta()` 讀回時 SHALL 將此題庫視為「已同步」

#### Scenario: Legacy metadata without cloudSyncedAt
- **WHEN** 從 localStorage 讀取既有 BANKS_META，且部分題庫不攜帶 `cloudSyncedAt`
- **THEN** 系統 SHALL 將這些題庫視為「未同步」
- **AND** 在下次登入時 SHALL 觸發一次同步流程（可接受的初始遷移）

### Requirement: refreshBanksData merges unsynced local banks unconditionally
`refreshBanksData` SHALL 計算 `unsyncedLocalMeta = localMeta.filter(b => !b.cloudSyncedAt)`，並在 `unsyncedLocalMeta.length > 0` 時觸發 `confirmDialog`。此合併流程 SHALL NOT 受 `latest.length === 0` 排他條件限制（這是舊邏輯導致既有用戶本地題庫被雲端清單靜默覆蓋的根源）。`syncLocalToCloud` SHALL 只被傳入 `unsyncedLocalMeta`（非全部 localMeta），避免重複上傳已同步題庫。

`confirmDialog` 訊息 SHALL 依雲端狀態分支：
- 雲端為空：`'偵測到您在本地端有題庫，但雲端是空的。是否要將本地題庫上傳至雲端同步？'`
- 雲端非空：`'偵測到您在本地端有 ${unsyncedLocalMeta.length} 個題庫尚未同步至雲端。是否要將它們合併上傳？'`

#### Scenario: Cloud empty + unsynced local triggers upload
- **WHEN** `latest.length === 0` 且 `unsyncedLocalMeta.length > 0`
- **THEN** 系統 SHALL 顯示確認對話框（訊息為「雲端是空的」分支）
- **AND** 使用者確認後 SHALL 呼叫 `repository.syncLocalToCloud(unsyncedLocalMeta)`
- **AND** 同步成功後（`failed.length === 0`）SHALL 保留本地 BANKS_META 的所有題庫（成功題庫的 `cloudSyncedAt` 已由 `syncLocalToCloud` 更新）

#### Scenario: Cloud non-empty + unsynced local triggers merge
- **WHEN** `latest.length > 0` 且 `unsyncedLocalMeta.length > 0`
- **THEN** 系統 SHALL 顯示確認對話框（訊息為「${count} 個題庫尚未同步」分支）
- **AND** 使用者確認後 SHALL 呼叫 `repository.syncLocalToCloud(unsyncedLocalMeta)`
- **AND** 同步後 SHALL 重新 `getBanks()` 取得最新雲端清單
- **AND** 本地 BANKS_META SHALL 保留所有題庫 entry（包含成功與失敗，因成功題庫的 `cloudSyncedAt` 已被更新，下次不再觸發同步）

#### Scenario: All local banks already synced skips dialog
- **WHEN** 所有本地題庫 `cloudSyncedAt` 均有值
- **THEN** 系統 SHALL NOT 顯示同步確認對話框
- **AND** `repository.syncLocalToCloud` SHALL NOT 被呼叫
- **AND** `dispatch sync_banks_data` SHALL 仍以最新雲端清單執行

#### Scenario: Partial sync failure preserves metadata with cloudSyncedAt
- **WHEN** 同步結果為 `successIds.length > 0 && failed.length > 0`
- **THEN** 系統 SHALL 重新 `getBanks()` 並刷新 `latest`
- **AND** 顯示 `toast.warning` 報告部分成功
- **AND** 本地 BANKS_META 中所有題庫 entry SHALL 保留（失敗者的 `cloudSyncedAt` 仍為 undefined，成功者已被更新）

#### Scenario: All sync failure preserves metadata unchanged
- **WHEN** 同步結果為 `successIds.length === 0 && failed.length > 0`
- **THEN** 系統 SHALL NOT 修改本地 BANKS_META
- **AND** SHALL 顯示 `toast.error` 報告全部失敗
- **AND** `latest` 仍透過 `dispatch sync_banks_data` 反映雲端現狀

### Requirement: syncLocalToCloud writes back cloudSyncedAt on success
`syncLocalToCloud` 在每個 bank 成功完成 `createCloudBank` + `saveCloudQuestions` 後，SHALL 將該 bank 在本地 BANKS_META 的對應 entry 回寫 `cloudSyncedAt = Date.now()`。此回寫發生在 `Promise.allSettled` 解析後、聚合結果之前。失敗的 bank SHALL NOT 被回寫 `cloudSyncedAt`。

#### Scenario: Successful bank gets timestamp
- **WHEN** 某本地 bank 的 `createCloudBank` 與 `saveCloudQuestions` 均成功
- **THEN** 該 bank 在本地 BANKS_META 的 entry SHALL 被回寫 `cloudSyncedAt = <current timestamp>`
- **AND** 該 bank id SHALL 出現在回傳 `successIds` 陣列中

#### Scenario: Failed bank lacks timestamp
- **WHEN** 某本地 bank 的同步程序拋出例外（例如 `createCloudBank` 回傳 null）
- **THEN** 該 bank 在本地 BANKS_META 的 entry SHALL NOT 被回寫 `cloudSyncedAt`
- **AND** 該 bank id SHALL 出現在回傳 `failed` 陣列中並附錯誤訊息

