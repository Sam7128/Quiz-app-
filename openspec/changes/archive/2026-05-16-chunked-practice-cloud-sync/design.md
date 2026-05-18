## Context

MindSpark 目前的測驗進度保存機制 (`SavedQuizProgress`) 僅存於 `localStorage` 的 `mindspark_quiz_session` key 中。這導致：

1. **跨設備不可轉移**：使用者在電腦上做到第 20 題後，換到平板時無法繼續。
2. **心理負擔過重**：面對 60 題的題庫，中途退出會產生「未完成」的挫敗感。
3. **缺乏階段性成就感**：沒有里程碑概念，使用者只看到「17/60」的線性進度。

現有架構約束：
- **雙軌持久化模式**：Guest 模式用 `localStorage`，已登入用戶用 Supabase。
- **Repository 模式**：所有資料操作經由 `IStorageRepository` 介面，有 `LocalStorageRepository` 和 `CloudStorageRepository` 兩個實作。
- **Quiz Engine Hook**：`useQuizEngine` 管理測驗流程，已有 `SavedQuizProgress` 的序列化/恢復機制。
- **戰鬥系統**：`useBattleSystem` 與測驗答題事件緊密耦合。

## Goals / Non-Goals

**Goals:**
- 使用者可以將大型題庫拆分為可管理的固定大小階段（Chunk），每個階段完成時自動保存。
- 階段完成狀態可通過 Supabase 雲端同步，使用者換設備後可從下一個未完成階段繼續。
- Guest 用戶也能享受分階段功能（降級為本地存儲）。
- 與現有的戰鬥系統、成就系統、錯題追蹤無縫整合。
- 提供清晰的階段進度 UI，給予使用者里程碑式的心理回饋。

**Non-Goals:**
- 不支援「自定義每個 Chunk 包含哪些特定題目」（自動分配）。
- 不支援「多人同時練習同一個 Session」的即時同步（非即時協作工具）。
- 不修改現有的 `random` / `mistake` / `retry_session` 模式的行為 — 分階段練習是獨立的新模式。
- 不涉及離線優先（Offline-first）的衝突解決框架 — 使用簡單的 Last-Write-Wins 策略。
- 不對 Supabase RLS 政策做全面重構 — 僅新增必要的 practice_sessions 表政策。

## Decisions

### Decision 1: 新增獨立的 Quiz Mode `'chunked'` 而非改造現有模式

**選擇**: 在 `QuizState.mode` 新增 `'chunked'` 類型，並創建獨立的 `useChunkedPractice` Hook。

**替代方案**:
- (A) 修改現有 `startQuiz()` 加入 chunk 參數 → 風險：改動 `useQuizEngine` 的複雜簽名，影響所有現有模式。
- (B) 完全替代 `SavedQuizProgress` → 風險：破壞現有的 Resume 功能，回歸測試成本高。

**理由**: `useChunkedPractice` 作為獨立 Domain Hook，負責「建立 Session → 拆分 Chunks → 追蹤階段進度」，然後將每個 Chunk 的題目列表傳遞給 `useQuizEngine.startQuiz()` 來執行實際答題。這保持了單一職責原則，且不影響現有三種模式的行為。

```
┌──────────────────────────────────────────────────────┐
│                   useChunkedPractice                  │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐              │
│  │ Chunk 1 │  │ Chunk 2 │  │ Chunk 3 │  ...          │
│  │ Q1-Q20  │  │ Q21-Q40 │  │ Q41-Q60 │              │
│  │   ✅    │  │   🚀    │  │   🔒    │              │
│  └────┬────┘  └────┬────┘  └─────────┘              │
│       │            │                                  │
│       ▼            ▼                                  │
│  useQuizEngine.startQuiz(count, 'chunked', chunkQuestionIds, bankIds, chunkMeta) │
│       │                                              │
│       ▼                                              │
│  QuizCard renders current chunk's questions           │
└──────────────────────────────────────────────────────┘
```

### Decision 2: Supabase 新增 `practice_sessions` 表，採用 JSON 欄位存放 Chunk 狀態

**選擇**: 新增單一 `practice_sessions` 表，以 JSONB `chunks` 欄位儲存所有 Chunk 的完成狀態。

**替代方案**:
- (A) 分為 `practice_sessions` + `practice_chunks` 兩張表（正規化）→ 查詢需 JOIN，每次更新一個 Chunk 需要兩次寫入。
- (B) 每個 Chunk 獨立一筆 row → 列數暴增（60 題 / 10 題一組 = 6 rows per session），管理複雜。

**理由**: 一個 Session 通常只有 3-6 個 Chunk，使用 JSONB 可以在一次 upsert 中更新整個 Session，減少 API 呼叫次數。JSONB 也允許 Postgres 直接查詢 Chunk 狀態。

**表結構（支援多題庫）**:
```sql
CREATE TABLE practice_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_ids     UUID[] NOT NULL,             -- 支援多題庫合併（array of bank ids）
  bank_names   TEXT[] NOT NULL,             -- 對應的題庫名稱陣列
  bank_question_map JSONB NOT NULL,         -- { [bankId]: string[] } 題庫→題目快照對照
  chunk_size   INTEGER NOT NULL,
  question_ids TEXT[] NOT NULL,             -- 全部題目 ID（有序），用於恢復時驗證
  chunks       JSONB NOT NULL,              -- PracticeChunk[] 的 JSON 序列化
  status       TEXT NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active', 'completed', 'abandoned')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
```

**本地 chunk draft 快照**:
- Chunk 進行中 SHALL 使用獨立的本地快照（例如 `mindspark_chunk_draft:<sessionId>:<chunkIndex>`），只保存當前 chunk 的最小恢復資料。
- 該快照 SHALL 由 `useChunkedPractice` 作為唯一寫入者，並在每次答題、切題、離開頁面時同步更新。
- 該快照 SHALL 在 chunk 完成時刪除，並在 session abandon / restore failure 時一併清理。
- 主 session 繼續由 `practice_sessions` 保存；chunk draft 只處理刷新/中斷恢復，不取代雲端同步。

**`chunks` JSONB 結構**:
```typescript
interface PracticeChunk {
  index: number;           // 0-based 階段索引
  questionIds: string[];   // 本階段的題目 ID
  status: 'pending' | 'in_progress' | 'completed';
  score: number;           // 本階段得分
  totalQuestions: number;   // 本階段題目數
  wrongQuestionIds: string[]; // 本階段錯題 ID
  completedAt?: number;    // 完成時間戳
}
```

### Decision 3: 題目分配策略 — 創建時一次性打亂並分配

**選擇**: 在創建 Session 時，將題庫所有題目隨機打亂，然後按固定大小切分為 Chunks。Question IDs 存入 `question_ids` 欄位作為快照。

**替代方案**:
- (A) 每次開始新 Chunk 時才隨機抽題 → 可能重複抽到已答題目，需要額外的「已答題目」排除邏輯。
- (B) 按題目原始順序分配 → 違反隨機化原則，使用者可能看到可預測的出題模式。

**理由**: 一次性快照確保跨設備恢復時題目順序完全一致，不受題庫內容修改影響。如果題庫在 Session 存活期間被修改（增刪題目），恢復時驗證 question IDs 是否仍存在，缺失的題目跳過但不影響整體進度。

### Decision 4: 戰鬥系統在階段邊界的行為 — Streak 歸零，怪物重生

**選擇**: 每個 Chunk 視為獨立的「戰鬥場」。進入新 Chunk 時：
- Streak 歸零
- 當前怪物重生（新怪物從池中選取）
- `questionsAnswered` 重置
- Boss 判定基於當前 Chunk 內的答題數

**替代方案**:
- (A) Streak 繼承到下一 Chunk → 使用者在第一 Chunk 答對 20 題後，第二 Chunk 直接觸發高級技能，破壞漸進感。
- (B) 整個 Session 共享一個 Battle State → 跨設備恢復時需要同步複雜的戰鬥狀態，風險極高。

**理由**: 將每個 Chunk 視為「一場新戰鬥」最直覺，且避免了跨 Chunk 狀態同步的複雜性。使用者在每個 Chunk 都能體驗完整的從零開始→技能觸發→Boss 挑戰的遊戲迴圈。

### Decision 5: Guest 模式降級策略

**選擇**: Guest 用戶使用 `localStorage` 的 `mindspark_practice_sessions` key 存儲 Practice Session，格式與 Cloud 版完全一致（`ChunkedPracticeSession[]`）。

**規則**:
- Guest 模式最多保留 **5** 個 active 的 Practice Session（FIFO 淘汰最舊的）。
- 為避免 abandoned sessions 長期累積造成 localStorage quota exceeded，Guest 模式 SHALL 實施 Retention 上限（非時間過期）：localStorage 中總 sessions（含 `abandoned` / `completed`）最多保留 **10** 個；超過時從最舊的非 active sessions 開始「物理刪除」。
- 登入後，自動將本地 Practice Sessions 同步到雲端（與現有 `syncLocalToCloud` 模式一致）。
- Cloud 模式不限制 active session 數量（由 Supabase 管理）。

### Decision 6: 跨設備衝突處理 — Last-Write-Wins

**選擇**: 使用 `updated_at` 時間戳的 Last-Write-Wins (LWW) 策略。

**規則**:
- 每次 Chunk 完成或進度更新時，以 upsert 寫入 Supabase（`onConflict: 'id'`）。
- 讀取時取最新的 `updated_at` 版本。
- 若兩設備同時修改同一 Session（極端情況），後寫入者覆蓋前者。
- UI 不顯示衝突警告（LWW 靜默處理），因為同一時間在兩個設備作答同一 Session 是非預期的邊緣情況。

## Risks / Trade-offs

| 風險 | 嚴重度 | 緩解措施 |
|------|--------|----------|
| **Supabase JSONB 查詢效能**：大量使用者時 `chunks` 欄位查詢可能變慢 | 低 | 主查詢只 filter `user_id` + `status = 'active'`，不深入查詢 JSONB 內部 |
| **題目快照過期**：Session 存活期間題庫被修改或刪除 | 中 | 恢復時驗證每個 question ID 是否仍存在於題庫中，缺失題目自動跳過並重算受影響 chunk 的 `totalQuestions`；若某 chunk 全缺失則自動完成（score = 0）；若整個 session 全缺失則自動 `abandoned` 並提示 |
| **localStorage 空間壓力**：多個 Session 的 question IDs 佔用空間 | 低 | Guest 模式限制 5 個 session，每個 session 只存 ID strings（60 個 UUID ≈ 2.5KB） |
| **`useQuizEngine` 耦合風險**：修改 `startQuiz` 簽名可能影響其他模式 | 中 | 新增可選參數 `chunkMeta?: ChunkMeta`，不改變現有簽名的必填部分 |
| **Migration SQL 在已有資料的生產環境上失敗** | 中 | SQL 使用 `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` |

## Migration Plan

### 部署步驟

1. **Phase 1 - 資料庫**：執行新的 Supabase migration SQL（`practice_sessions` 表 + RLS + 索引）。此步驟獨立於程式碼，可先行執行。
2. **Phase 2 - 程式碼**：部署包含 `useChunkedPractice`、UI 元件、Repository 擴展的程式碼更新。
3. **Phase 3 - 驗證**：E2E 測試覆蓋「建立 Session → 完成 Chunk 1 → 模擬換設備 → 繼續 Chunk 2」流程。

### 回滾策略

- **程式碼回滾**：刪除新增的 Hook、元件和 Repository 方法。現有功能完全不受影響（新模式是新增的，不修改已有模式的行為）。
- **資料庫回滾**：`DROP TABLE practice_sessions;` — 無其他表依賴此表。
- **localStorage 清理**：移除 `mindspark_practice_sessions` key（自動被忽略如果程式碼已回滾）。

## Open Questions

1. **Chunk 大小的預設值與選項**：目前規劃提供 `10 / 15 / 20 / 25 / 30` 題五個選項，預設 20 題。是否需要更細緻的自定義？
2. **Session 過期策略**：超過 30 天未活動的 `active` Session 是否應自動標記為 `abandoned`？目前規劃不自動過期，由使用者手動管理。
3. **已完成 Session 的歷史紀錄**：是否在 Dashboard 上顯示過去完成的 Session 統計（如「上週完成了 3 個 Session」）？目前規劃為 Non-Goal，未來可擴展。
