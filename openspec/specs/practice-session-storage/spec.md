# 核心規格 - 練習進度存儲 (Practice Session Storage)

## Purpose
定義練習進度（Practice Session）在 localStorage 及 Supabase 中的存儲規格、安全 RLS 及登入同步與衝突解決策略。
## Requirements
### Requirement: Supabase practice_sessions table
系統 SHALL 在 Supabase 中建立 `practice_sessions` 表，用於跨設備同步分階段練習進度。

#### Scenario: Table creation via migration
- **WHEN** 管理員執行 migration SQL
- **THEN** `practice_sessions` 表 SHALL 包含以下欄位：
  - `id` (UUID, PK, auto-generated)
  - `user_id` (UUID, FK → auth.users, NOT NULL, ON DELETE CASCADE)
  - `bank_ids` (UUID[], NOT NULL) — 支援多題庫
  - `bank_names` (TEXT[], NOT NULL)
  - `bank_question_map` (JSONB, NOT NULL) — `{ [bankId]: string[] }` 題庫→題目快照對照
  - `chunk_size` (INTEGER, NOT NULL)
  - `question_ids` (TEXT[], NOT NULL) — 所有題目 ID 的有序快照
  - `chunks` (JSONB, NOT NULL) — PracticeChunk[] 序列化
  - `status` (TEXT, NOT NULL, CHECK IN ('active', 'completed', 'abandoned'), DEFAULT 'active')
  - `created_at` (TIMESTAMPTZ, DEFAULT NOW())
  - `updated_at` (TIMESTAMPTZ, DEFAULT NOW()) — SHALL 在 row UPDATE 時自動推進（例如 trigger）
- **THEN** 表 SHALL 有 `idx_practice_sessions_user_status` 索引（`user_id, status`）
- **THEN** 表 SHALL 有複合索引 `idx_practice_sessions_user_status_updated_at`（`user_id, status, updated_at DESC`）以支援 Dashboard 依 `updated_at` 排序

### Requirement: Row Level Security for practice_sessions
系統 SHALL 對 `practice_sessions` 表實施 RLS 政策，確保使用者只能存取自己的資料。

#### Scenario: User reads own sessions
- **WHEN** 已認證的使用者查詢 `practice_sessions`
- **THEN** 系統 SHALL 僅返回 `user_id` 等於當前使用者 ID 的 rows

#### Scenario: User cannot read other user's sessions
- **WHEN** 使用者 A 嘗試查詢使用者 B 的 practice sessions
- **THEN** 系統 SHALL 返回空結果集
- **THEN** 系統 SHALL NOT 拋出錯誤

#### Scenario: User writes own session
- **WHEN** 已認證的使用者插入或更新 practice_sessions
- **THEN** 系統 SHALL 僅允許 `user_id = auth.uid()` 的操作

### Requirement: IStorageRepository practice session extension
系統 SHALL 擴展 `IStorageRepository` 介面，新增以下方法用於 practice session 管理。

#### Scenario: Interface methods
- **WHEN** 開發者實作 `IStorageRepository`
- **THEN** 介面 SHALL 包含以下方法：
  - `getPracticeSessions(): Promise<ChunkedPracticeSession[]>` — 取得所有 active sessions
  - `savePracticeSession(session: ChunkedPracticeSession): Promise<void>` — 新增或更新 session
  - `deletePracticeSession(sessionId: string): Promise<void>` — 刪除 session
  - `abandonPracticeSession(sessionId: string): Promise<void>` — 標記為 abandoned

### Requirement: LocalStorageRepository practice session implementation
`LocalStorageRepository` SHALL 在 `localStorage` key `mindspark_practice_sessions` 下存儲 practice sessions。

#### Scenario: Save and retrieve in guest mode
- **WHEN** Guest 使用者創建一個 practice session
- **THEN** 系統 SHALL 將 session 序列化為 JSON 存入 `mindspark_practice_sessions`
- **THEN** 再次讀取時 SHALL 返回相同的 session 資料

#### Scenario: Guest mode FIFO limit
- **WHEN** Guest 使用者已有 5 個 active sessions，再創建第 6 個
- **THEN** 系統 SHALL 自動將最舊的 session 標記為 `abandoned`
- **THEN** 新 session SHALL 被正常創建
- **THEN** active sessions 總數 SHALL NOT 超過 5

#### Scenario: Guest mode total retention limit
- **WHEN** Guest 模式下 localStorage 中的 sessions 總數（含 `active` / `abandoned` / `completed`）超過 10
- **THEN** 系統 SHALL 從最舊的非 active sessions（`abandoned` / `completed`）開始「物理刪除」直到總數 ≤ 10
- **THEN** active sessions（`status = 'active'`）總數 SHALL 仍維持 ≤ 5

### Requirement: CloudStorageRepository practice session implementation
`CloudStorageRepository` SHALL 通過 Supabase API 操作 `practice_sessions` 表。

#### Scenario: Cloud save on chunk completion
- **WHEN** 已登入使用者完成一個 Chunk
- **THEN** 系統 SHALL 使用 upsert（`onConflict: 'id'`）寫入 Supabase
- **THEN** `updated_at` SHALL 更新為當前時間戳

#### Scenario: Cloud read on dashboard load
- **WHEN** 已登入使用者開啟 Dashboard
- **THEN** 系統 SHALL 從 Supabase 查詢所有 `status = 'active'` 的 sessions
- **THEN** sessions SHALL 按 `updated_at` 降序排列

#### Scenario: Cloud save failure graceful handling
- **WHEN** Supabase upsert 失敗（網路問題）
- **THEN** 系統 SHALL 將 session 暫存於 localStorage 作為 fallback
- **THEN** 系統 SHALL 顯示 toast 警告「雲端同步失敗，進度已暫存在本地」
- **THEN** 下次 Dashboard 載入時 SHALL 嘗試重新同步

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

### Requirement: STORAGE_KEYS registry update
`services/storage.ts` 的 `STORAGE_KEYS` 物件 SHALL 新增 `PRACTICE_SESSIONS: 'mindspark_practice_sessions'` 條目。

#### Scenario: Storage key registration
- **WHEN** 程式碼引用 practice sessions 的 localStorage key
- **THEN** SHALL 使用 `STORAGE_KEYS.PRACTICE_SESSIONS` 常數
- **THEN** SHALL NOT 使用 hardcoded 字串

