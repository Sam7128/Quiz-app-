## MODIFIED Requirements

### Requirement: Login triggers practice session sync
系統 SHALL 在使用者登入時，將 localStorage 中的 practice sessions 同步到雲端。當雲端 session 較新時，系統 SHALL 將雲端版本回寫到本機 localStorage。

#### Scenario: Sync local sessions to cloud on login
- **WHEN** 之前以 Guest 模式創建了 2 個 active practice sessions，然後登入
- **THEN** 系統 SHALL 先讀取雲端 `status = 'active'` sessions，作為合併基準
- **THEN** 系統 SHALL 逐筆比較 local 與 cloud 中相同 `id` 的 `updated_at`，並採用 Last-Write-Wins（保留較新的那份）
  - 若 local 較新 → SHALL upsert 到雲端
  - 若 cloud 較新或相同 → SHALL NOT 以 local 覆蓋雲端
- **THEN** 系統 SHALL 將「需要上傳且 upsert 成功」或「被判定為較舊」的 local 副本自 localStorage 移除
- **THEN** 若 upsert 失敗 → local 副本 SHALL 保留作為 fallback（並標記為待重試），下次登入或 Dashboard 載入時再嘗試同步

#### Scenario: Cloud-newer sessions are written back to local
- **WHEN** 本機 session A 的 `updatedAt` 為 `1000`
- **AND** 雲端 session A 的 `updatedAt` 為 `2000`
- **THEN** 系統 SHALL 將雲端版本的 session A 加入 `updatedLocalSessions`
- **AND** 雲端 session A SHALL 被回寫到本機 localStorage
- **AND** 本機版本 SHALL 被取代為雲端版本
- **AND** `skipped` 計數器 SHALL 遞增
- **AND** 系統 SHALL 清理該 session 的 chunk drafts 以避免狀態不一致

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

#### Scenario: Clock drift guard for LWW
- **WHEN** 本機與雲端 `updatedAt` 差距超過合理閾值
- **THEN** 系統 SHALL 採保守策略（偏向雲端或要求重試）
- **AND** 系統 SHALL 記錄警告以便診斷
