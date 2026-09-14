## MODIFIED Requirements

### Requirement: Cloud Save Preserves Question IDs
The `saveCloudQuestions` function MUST use Supabase `upsert` (with `onConflict: 'id'`) instead of delete-and-reinsert. Question IDs MUST be included in the upsert payload. Furthermore, the storage tables involved MUST be protected by Row Level Security (RLS) to ensure that the process cannot be exploited to overwrite or upsert IDs belonging to other users. 

當 `saveCloudQuestions` 被呼叫時，系統 SHALL 在執行 upsert **之前** 透過 `addDirtyBank(bankId)` 將該 bankId 預寫至 `mindspark_dirty_banks` localStorage 鍵。此預寫機制收斂「極限中斷」（例如用戶強制關閉分頁、行動裝置 OOM、突發斷電）期間 upsert 已成功但 cleanup（orphan 刪除）尚未執行的幽靈題目風險：由於 dirty 標記在 upsert 前已寫入，後續同步流程可在 `retryCleanupDirtyBanks` 中重試 cleanup，避免產生永久幽靈資料。

當 upsert 與 cleanup 全部成功完成後，系統 SHALL 透過 `removeDirtyBank(bankId)` 清除預寫標記。`addDirtyBank` 與 `removeDirtyBank` SHALL 為 idempotent（重複呼叫相同 bankId 不產生副作用）。

當 cleanup（delete）步驟在 upsert 成功後失敗，系統 SHALL 記錄警告並繼續不拋出（避免 rollback 已成功的 upsert），且因 dirty 標記在 upsert 前已寫入、尚未清除，下次同步可於 `retryCleanupDirtyBanks` 重試。

當 `keepIds` 為空，系統 SHALL NOT 執行全量刪除，除非呼叫者明確提供 `forceDeleteAll`（或同等明確確認旗標）。否則系統 SHALL 回傳安全、可由使用者操作的錯誤並記錄警告。

**新增行為**：`retryCleanupDirtyBanks` 在執行孤兒清理之前，SHALL 先從 localStorage 讀取本地題庫並對 Supabase 執行 upsert 補傳。若 upsert 失敗，SHALL 將該 bankId 保留在 dirty list 中繼續下次重試，SHALL NOT 執行後續的 delete 清理，SHALL NOT 移除 dirty 標記。

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

#### Scenario: retryCleanupDirtyBanks upserts before cleanup
- **WHEN** `retryCleanupDirtyBanks` 處理一個 dirty bankId
- **AND** 本地 localStorage 中存在該 bank 的題目
- **THEN** 系統 SHALL 先將本地題目 upsert 至 Supabase
- **AND** 若 upsert 成功，系統 SHALL 繼續執行孤兒清理（delete 不在 keepIds 中的雲端題目）
- **AND** 若 upsert 與 cleanup 均成功，dirty 標記 SHALL 被移除

#### Scenario: retryCleanupDirtyBanks upsert failure preserves dirty mark
- **WHEN** `retryCleanupDirtyBanks` 對某 bankId 的 upsert 操作失敗
- **THEN** 系統 SHALL 將該 bankId 保留在 `remaining` 陣列
- **AND** 系統 SHALL NOT 執行該 bank 的 delete 孤兒清理
- **AND** `mindspark_dirty_banks` SHALL 繼續包含該 bankId 供下次重試

#### Scenario: retryCleanupDirtyBanks handles individual bank failure with isolation
- **WHEN** `retryCleanupDirtyBanks` 處理多個 dirty bankIds 時其中一個發生解析或網路異常（例如 localStorage 格式損毀）
- **THEN** 系統 SHALL 透過獨立 try-catch 隔離該異常
- **AND** 系統 SHALL 將該損毀 bankId 保留於 `remaining` 標記待查
- **AND** 系統 SHALL NOT 中斷迴圈，SHALL 繼續處理其餘正常的 dirty bankIds

#### Scenario: retryCleanupDirtyBanks with empty local bank performs full delete
- **WHEN** `retryCleanupDirtyBanks` 處理之 bankId 在本地為空題庫（即所有題目已被合法清空為 `[]`）
- **THEN** 系統 SHALL 執行全量 delete 清除雲端該 bank 的所有題目
- **AND** 若刪除成功，該 bankId SHALL 從 dirty 標記中移除

#### Scenario: retryCleanupDirtyBanks with cache eviction preserves cloud data
- **WHEN** `retryCleanupDirtyBanks` 處理之 bankId 在本地 localStorage 鍵為 `null`（代表本地快取已被清除或未被載入）
- **THEN** 系統 SHALL 記錄 `console.warn` 警告本地快取缺失
- **AND** 系統 SHALL NOT 執行任何雲端刪除（`delete`）操作
- **AND** 系統 SHALL 將該 bankId 移出 dirty list 避免陷入無限重試迴圈
- **AND** 雲端現有題庫資料 SHALL 受到完整保護不被抹殺

#### Scenario: Orphan question deletions are strictly scoped to bank_id
- **WHEN** 系統執行孤兒題目批次清理（不論是在 `saveCloudQuestions` 或 `retryCleanupDirtyBanks`）
- **THEN** 所有的 delete 查詢 SHALL 明確包含 `.eq('bank_id', bankId)` 條件約束
- **AND** 系統 SHALL NOT 僅以 `.in('id', chunk)` 作為單一過濾條件
- **AND** 此縱深防禦 SHALL 確保不會發生跨題庫或跨租戶的意外刪除
