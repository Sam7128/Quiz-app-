## MODIFIED Requirements

### Requirement: Login triggers practice session sync
系統 SHALL 在使用者登入時，將 localStorage 中的 practice sessions 同步到雲端。當雲端 session 較新時，系統 SHALL 將雲端版本回寫到本機 localStorage。

**修改行為 (C2 修復)**：系統 SHALL 不再使用單純的 1 小時時間差閾值來判定「時鐘漂移」，亦不再採用單純純量比較單向覆蓋分歧進度。改以 **Chunk 級聯集合併 (Chunk-level Set Union Merge)** 進行無損融合：
1. 系統 SHALL 透過 `mergeChunkedPracticeSessions(local, cloud)` 比對各 chunk：若 local 或 cloud 任一方該 chunk 的 status 為 `'completed'`，合併結果的 chunk status 即為 `'completed'`（保留最高分與最晚完成時間）
2. 若兩端某 chunk 均未完成，保留具備作答進度或其 session `updatedAt` 較新的 chunk
3. 若合併後所有 chunks 均為 `'completed'`，推進 session status 至 `'completed'`
4. 合併產生的 session SHALL 同時回寫本機 localStorage 並 upsert 至雲端
5. 「時鐘漂移」偵測 SHALL 僅保留 `isLocalFuture`（`localSession.updatedAt > now + 5min`）作為異常預警指標
6. 系統 SHALL 採 **Chunk 精確比對清理草稿**（Chunk-specific Draft Reconcile）：僅清除合併後已完成 chunk 對應的本地 drafts，用戶正在進行中且尚未結算的 active draft SHALL 予以保留，防止資料遺失。

#### Scenario: Sync local sessions to cloud on login with Chunk-level Set Union
- **WHEN** 使用者登入且本機與雲端存在相同 `id` 的 practice session
- **THEN** 系統 SHALL 逐筆進行 Chunk 級聯集合併（`mergeChunkedPracticeSessions`）
- **AND** 合併後的新版本 SHALL 同時回寫本機與 upsert 雲端
- **AND** 兩端裝置完成的 chunks 均完整保留在最終 session 中

#### Scenario: Multi-device divergent progress is reconciled without data loss
- **WHEN** 使用者在裝置 A（本機）離線完成了 Chunk 0，而雲端記錄著在裝置 B 完成的 Chunk 1
- **THEN** 系統同步時 SHALL 進行 Chunk 級聯集合併
- **AND** 合併後的 session 中 Chunk 0 與 Chunk 1 SHALL 均為 `completed`
- **AND** 系統 SHALL 將融合後的 session 同時儲存於本機與雲端
- **AND** 裝置 A 與裝置 B 的練習進度均不會被單向覆蓋抹殺

#### Scenario: Cloud-newer sessions are written back to local with Chunk-specific draft reconcile
- **WHEN** 雲端包含已完成的 Chunk 0，而本機尚未完成 Chunk 0
- **THEN** 合併後 Chunk 0 標記為完成並回寫本機
- **AND** 系統 SHALL 僅清除 Chunk 0 的本地草稿
- **AND** 本地若存在未結算之 Chunk 1 active draft SHALL 予以保留不被誤殺

#### Scenario: Long offline session is not mistaken for clock drift
- **WHEN** 使用者在離線環境下進行分階段練習超過 1 小時
- **AND** 本地 session 完成了新的 Chunk
- **THEN** 本地新增的 completed chunk SHALL 成功合併進最終版本
- **AND** 系統 SHALL upsert 合併版本到雲端
- **AND** 系統 SHALL NOT 以雲端舊版本覆寫本地進度

#### Scenario: True clock drift detection
- **WHEN** 本地 session 的 `updatedAt` 超過 `Date.now() + 5 * 60 * 1000`（未來 5 分鐘以上）
- **THEN** 系統 SHALL 記錄 `console.warn` 說明檢測到時鐘漂移
- **AND** 系統 SHALL 優先採用雲端版本

#### Scenario: Cloud-only sessions are preserved during sync
- **WHEN** 雲端存在 session B，但本機不存在對應 session
- **THEN** session B SHALL NOT 被刪除或覆蓋
- **AND** 系統 SHALL 不主動拉取雲端 only 的 session 到本機（此為同步方向：本機→雲端）

#### Scenario: Local-only sessions are uploaded
- **WHEN** 本機存在 session C，但雲端不存在對應 session
- **THEN** 系統 SHALL 將 session C upsert 到雲端
- **AND** `uploaded` 計數器 SHALL 遞增

#### Scenario: Active session limit is enforced on writeback
- **WHEN** 回寫雲端版本造成本機 active sessions 超過上限
- **THEN** 系統 SHALL 依既定策略裁切（例如保留最新 N 筆）
- **AND** 系統 SHALL 記錄被裁切的 sessionId 以便追蹤

#### Scenario: In-progress chunk draft is preserved during cloud override
- **WHEN** 雲端版本被選為較新並回寫至本地（例如雲端已完成 Chunk 0）
- **AND** 本地存有尚未結算的 Chunk 1 active draft
- **THEN** 系統 SHALL 僅刪除 Chunk 0 的草稿
- **AND** 系統 SHALL NOT 刪除 Chunk 1 的草稿
- **AND** 用戶下次進入練習時 SHALL 能無縫恢復 Chunk 1 的答題進度
