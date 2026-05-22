## MODIFIED Requirements

### Requirement: Mid-chunk restore snapshot
系統 SHALL 為進行中的 Chunk 維護獨立的本地恢復快照，以支援刷新或中斷後的續作；此快照 SHALL NOT 使用 `mindspark_quiz_session` 主鍵，避免與一般 quiz session 混淆。草稿寫入 SHALL 使用 `updatedAt` 時間戳進行版本比較，拒絕以較舊草稿覆蓋較新草稿。

#### Scenario: Refresh mid-chunk restores current chunk draft
- **WHEN** 使用者在 Chunk 進行中重新整理頁面
- **THEN** 系統 SHALL 從 chunk 專屬快照恢復當前 Chunk 的 `questionIds`、`currentQuestionIndex`、`score`、`wrongQuestionIds` 與 `pendingSkill`/battle 需要的最小狀態
- **THEN** 系統 SHALL 保留 Session 的 `active` / `in_progress` 狀態
- **THEN** 系統 SHALL 在 Chunk 完成時清除該 chunk 專屬快照

#### Scenario: Closed tab resumes same chunk later
- **WHEN** 使用者關閉頁面後再次回到同一 Session
- **THEN** 系統 SHALL 從 chunk 專屬快照恢復到最後一次作答位置，而不是從第一題重新開始
- **THEN** 若 chunk 專屬快照缺失，系統 SHALL 回退到 chunk 的第 1 題重新開始

#### Scenario: updateChunkDraft and beforeunload both respect updatedAt
- **WHEN** `updateChunkDraft` 在元件生命週期內被呼叫
- **AND** `beforeunload` 在頁面關閉時被觸發
- **THEN** 兩個寫入路徑 SHALL 都在 `saveChunkDraft` 中經過 `updatedAt` 版本比較
- **AND** 較舊的草稿 SHALL 被拒絕
- **AND** 較新的草稿 SHALL 被正常寫入

#### Scenario: beforeunload does not overwrite newer updateChunkDraft
- **WHEN** `updateChunkDraft` 在 `t=1000` 寫入了草稿（`updatedAt: 1000`）
- **AND** `beforeunload` 在 `t=500` 的 `latestProgressRef` 狀態觸發寫入（`updatedAt: 500`）
- **THEN** `saveChunkDraft` SHALL 拒絕 `beforeunload` 的寫入
- **AND** localStorage 中的草稿 SHALL 維持 `updateChunkDraft` 寫入的版本
