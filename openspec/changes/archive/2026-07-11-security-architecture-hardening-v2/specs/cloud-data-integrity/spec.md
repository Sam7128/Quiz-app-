## MODIFIED Requirements

### Requirement: Cloud Save Preserves Question IDs
The `saveCloudQuestions` function MUST use Supabase `upsert` (with `onConflict: 'id'`) instead of delete-and-reinsert. Question IDs MUST be included in the upsert payload. Furthermore, the storage tables involved MUST be protected by Row Level Security (RLS) to ensure that the process cannot be exploited to overwrite or upsert IDs belonging to other users. 

當 `saveCloudQuestions` 被呼叫時，系統 SHALL 在執行 upsert **之前** 透過 `addDirtyBank(bankId)` 將該 bankId 預寫至 `mindspark_dirty_banks` localStorage 鍵。此預寫機制收斂「極限中斷」（例如用戶強制關閉分頁、行動裝置 OOM、突發斷電）期間 upsert 已成功但 cleanup（orphan 刪除）尚未執行的幽靈題目風險：由於 dirty 標記在 upsert 前已寫入，後續同步流程可在 `retryCleanupDirtyBanks` 中重試 cleanup，避免產生永久幽靈資料。

當 upsert 與 cleanup 全部成功完成後，系統 SHALL 透過 `removeDirtyBank(bankId)` 清除預寫標記。`addDirtyBank` 與 `removeDirtyBank` SHALL 為 idempotent（重複呼叫相同 bankId 不產生副作用）。

當 cleanup（delete）步驟在 upsert 成功後失敗，系統 SHALL 記錄警告並繼續不拋出（避免 rollback 已成功的 upsert），且因 dirty 標記在 upsert 前已寫入、尚未清除，下次同步可於 `retryCleanupDirtyBanks` 重試。

當 `keepIds` 為空，系統 SHALL NOT 執行全量刪除，除非呼叫者明確提供 `forceDeleteAll`（或同等明確確認旗標）。否則系統 SHALL 回傳安全、可由使用者操作的錯誤並記錄警告。

#### Scenario: Saving questions to cloud preserves IDs with Authorization
- **WHEN** an authenticated user saves a bank with 5 questions to Supabase
- **THEN** each question row SHALL retain its original `id` value
- **AND** the database SHALL accept the upsert ONLY if the user owns the resources being overwritten
- **AND** the `question_progress` (spaced repetition) records linked to these IDs SHALL remain valid

#### Scenario: Deleted questions are cleaned up
- **WHEN** an authenticated user deletes 2 of 5 questions from a bank and saves
- **THEN** the 3 remaining questions SHALL be upserted with their original IDs
- **AND** the 2 deleted questions SHALL be removed from the `questions` table
- **AND** the operation SHALL NOT use a full delete-then-reinsert strategy
- **AND** the database SHALL block deletion commands if the user is not authorized

#### Scenario: Dirty bank is pre-written before upsert
- **WHEN** `saveCloudQuestions` 被呼叫且即將執行 upsert
- **THEN** 系統 SHALL 在 upsert 前呼叫 `addDirtyBank(bankId)` 將 bankId 寫入 `mindspark_dirty_banks`
- **AND** 若 upsert 隨後失敗，dirty 標記 SHALL 保留（下次同步時重試 cleanup）
- **AND** 若 upsert 與 cleanup 全部成功，dirty 標記 SHALL 透過 `removeDirtyBank(bankId)` 移除

#### Scenario: Cleanup failure after successful upsert degrades gracefully
- **WHEN** `saveCloudQuestions` upsert 成功完成
- **AND** 後續的 cleanup delete 操作失敗（例如網路中斷、超時）
- **THEN** 系統 SHALL 記錄 `console.warn` 包含失敗原因
- **AND** 系統 SHALL NOT 拋出 Error
- **AND** 已 upsert 的題目 SHALL 保留在雲端
- **AND** 未被刪除的幽靈題目 SHALL 在雲端保留（可接受的降級行為）
- **AND** dirty-bank 標記 SHALL 保留（因 upsert 前已預寫且未在成功路徑被清除）
- **AND** 下次 `syncLocalToCloud` 觸發時 `retryCleanupDirtyBanks` SHALL 嘗試清理該 bankId

#### Scenario: Extreme interruption between upsert and cleanup-write
- **WHEN** `saveCloudQuestions` 的 upsert 成功
- **AND** 在執行 cleanup 之前發生極限中斷（分頁強關 / OOM / 斷電）
- **THEN** 此情況下 dirty 標記已於 upsert 前預寫完成（除非中斷發生在 `addDirtyBank` 寫入 localStorage 的 ~1ms 內）
- **AND** 系統 SHALL 接受 < 1ms 中斷窗口為不可避免殘餘風險
- **AND** 此殘餘風險與「不採用自訂 RPC 腳本」的安全性取捨 SHALL 明文記錄於 `docs/SECURITY_LIMITATIONS.md`

#### Scenario: Large keepIds are cleaned up in batches
- **WHEN** `keepIds.length` 超過安全上限（例如 500）
- **THEN** 系統 SHALL 以分批方式執行 cleanup
- **AND** 任一批次失敗時依「cleanup 失敗降級」策略處理

#### Scenario: Upsert failure still throws error and keeps dirty mark
- **WHEN** `saveCloudQuestions` 的 upsert 操作失敗
- **THEN** 系統 SHALL 拋出 Error 包含失敗原因
- **AND** 系統 SHALL NOT 執行 cleanup delete
- **AND** 雲端資料 SHALL 維持修改前的狀態
- **AND** 已預寫的 dirty-bank 標記 SHALL 保留（upsert 前已寫入，下次同步重試）

#### Scenario: Empty questions array requires explicit confirmation
- **WHEN** `saveCloudQuestions` 被呼叫時 `questions` 為空陣列
- **AND** `keepIds` 因此為空
- **AND** 未提供 `forceDeleteAll`
- **THEN** 系統 SHALL **不** 執行全量刪除
- **AND** 系統 SHALL 回傳可處理的錯誤或狀態，提示需要明確確認

#### Scenario: Explicit forceDeleteAll allows full cleanup with logging
- **WHEN** `saveCloudQuestions` 被呼叫時 `questions` 為空陣列
- **AND** `keepIds` 因此為空
- **AND** 提供 `forceDeleteAll = true`
- **THEN** 系統 SHALL 執行 `delete` 清除該 bank 的所有雲端題目
- **AND** 系統 SHALL 記錄 `console.info` 說明執行了全量清除

## ADDED Requirements

### Requirement: addDirtyBank and removeDirtyBank are idempotent
`addDirtyBank(bankId)` 與新增的 `removeDirtyBank(bankId)` SHALL 為 idempotent。對同一 bankId 重複呼叫 `addDirtyBank` SHALL 不產生重複 entry。對不存在於 dirty list 的 bankId 呼叫 `removeDirtyBank` SHALL 為 no-op（不拋出）。兩者 SHALL 以 try-catch 包裹 localStorage 操作，失敗僅記錄 `console.warn` 不拋出至呼叫者。

#### Scenario: Repeated addDirtyBank is idempotent
- **WHEN** `addDirtyBank('bank-A')` 連續呼叫 3 次
- **THEN** `mindspark_dirty_banks` 中 SHALL 僅包含 1 個 `'bank-A'` entry
- **AND** 任何 localStorage 操作例外 SHALL 僅記錄 `console.warn`

#### Scenario: removeDirtyBank on missing entry is no-op
- **WHEN** `removeDirtyBank('bank-X')` 被呼叫
- **AND** `mindspark_dirty_banks` 不包含 `'bank-X'`
- **THEN** 系統 SHALL NOT 拋出例外
- **AND** localStorage 狀態 SHALL 維持不變

#### Scenario: Successful cleanup path clears dirty mark
- **WHEN** `saveCloudQuestions` 的 upsert 與 cleanup 全部成功
- **THEN** `removeDirtyBank(bankId)` SHALL 被呼叫
- **AND** `mindspark_dirty_banks` SHALL 不再包含該 bankId
