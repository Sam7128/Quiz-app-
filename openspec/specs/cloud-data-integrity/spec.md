# Spec: Cloud Data Integrity

## Purpose
Maintain consistency and persistence of learning data (stats, mistakes, spaced repetition) by ensuring stable question identifiers.
## Requirements
### Requirement: Stable Question IDs
Every question MUST have a stable, unique UUID that persists across save operations. The system SHALL use `crypto.randomUUID()` to generate IDs at question creation time if no ID is provided. Non-UUID IDs (numbers, short strings) MUST be normalized to UUID format before cloud storage operations.

#### Scenario: New question gets stable ID
- **WHEN** a user creates a question (via import, AI generation, or manual entry)
- **AND** the question does not already have an `id` field
- **THEN** the system SHALL assign a UUID via `crypto.randomUUID()`
- **AND** this ID SHALL remain unchanged for the lifetime of that question

#### Scenario: Non-UUID id is normalized
- **WHEN** a question has a non-UUID `id` (numeric, short string, etc.)
- **AND** the question is being saved to cloud storage (Supabase)
- **THEN** the system SHALL replace the `id` with a newly generated UUID
- **AND** the old non-UUID id SHALL be discarded (it is incompatible with Supabase's uuid column type)

### Requirement: Cloud Save Preserves Question IDs
The `saveCloudQuestions` function MUST use Supabase `upsert` (with `onConflict: 'id'`) instead of delete-and-reinsert. Question IDs MUST be included in the upsert payload. Furthermore, the storage tables involved MUST be protected by Row Level Security (RLS) to ensure that the process cannot be exploited to overwrite or upsert IDs belonging to other users. When the cleanup (delete) step fails after a successful upsert, the system SHALL log a warning and continue without throwing, to prevent upsert success from being rolled back by cleanup failure.
When `keepIds` is empty, the system SHALL NOT perform a full delete unless the caller explicitly provides `forceDeleteAll` (or an equivalent explicit confirmation flag). Otherwise, the operation SHALL return a safe, user-actionable error and log a warning.

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

#### Scenario: Cleanup failure after successful upsert degrades gracefully
- **WHEN** `saveCloudQuestions` upsert 成功完成
- **AND** 後續的 cleanup delete 操作失敗（例如網路中斷、超時）
- **THEN** 系統 SHALL 記錄 `console.warn` 包含失敗原因
- **AND** 系統 SHALL NOT 拋出 Error
- **AND** 已 upsert 的題目 SHALL 保留在雲端
- **AND** 未被刪除的幽靈題目 SHALL 在雲端保留（可接受的降級行為）
- **AND** 系統 SHALL 記錄待清理的 bankId 以便下次同步重試

#### Scenario: Large keepIds are cleaned up in batches
- **WHEN** `keepIds.length` 超過安全上限（例如 500）
- **THEN** 系統 SHALL 以分批方式執行 cleanup
- **AND** 任一批次失敗時依「cleanup 失敗降級」策略處理

#### Scenario: Upsert failure still throws error
- **WHEN** `saveCloudQuestions` 的 upsert 操作失敗
- **THEN** 系統 SHALL 拋出 Error 包含失敗原因
- **AND** 系統 SHALL NOT 執行 cleanup delete
- **AND** 雲端資料 SHALL 維持修改前的狀態

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

### Requirement: Cloud createBank Error Handling
When `createCloudBank` fails (returns `null`), `CloudStorageRepository.createBank` MUST throw an error instead of returning a `BankMetadata` with `id: ''`.

#### Scenario: createBank failure propagates error
- **WHEN** `createCloudBank` returns `null` (Supabase error)
- **THEN** `CloudStorageRepository.createBank` SHALL throw an `Error`
- **AND** the calling code SHALL catch and display a user-friendly error message

