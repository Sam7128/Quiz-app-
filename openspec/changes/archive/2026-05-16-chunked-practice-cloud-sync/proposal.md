## Why

使用者在面對大型題庫（60+ 題）時，經常無法一次性完成所有題目。目前的 `SavedQuizProgress` 機制僅儲存在 `localStorage`（`mindspark_quiz_session`），當使用者換設備（如從電腦到平板）時，未完成的答題進度完全無法繼承，被迫從頭開始。這嚴重打擊了使用者的學習動機，並造成重複練習已掌握題目的時間浪費。

需要一個「分階段練習模式（Chunked Practice）」，讓大型題庫自動拆分為可管理的小批次（如每組 20 題），並將每個階段的完成狀態同步至雲端，使使用者可以在任何設備上無縫接力。

## What Changes

- **新增「分階段練習模式」**：使用者在開始測驗前可選擇「每階段題數」（如 10/15/20/25/30 題），系統將題庫自動拆分為多個階段（Chunk），並以里程碑 UI 呈現進度。
- **新增 Supabase `practice_sessions` 表**：儲存跨設備可共享的階段練習進度，包含：題庫列表（`bank_ids` / `bank_names`）、每個階段的完成狀態、已答題目 ID、分數、錯題紀錄。
- **擴展 `IStorageRepository` 介面**：新增練習進度的 CRUD 方法，雙實作（Local + Cloud）確保 Guest / Auth 模式皆可使用。
- **新增 `useChunkedPractice` Domain Hook**：封裝階段拆分邏輯、進度追蹤、雲端同步、跨設備恢復等核心狀態管理。
- **新增「進度選擇 UI」**：在 Dashboard 上顯示未完成的階段練習，支援從任意設備繼續。
- **修改 `useQuizEngine`**：支援從特定階段的題目子集啟動測驗，並在階段完成時自動觸發保存。
- **修改 `QuizCard` 進度列**：顯示「階段 X / Y」而非僅「題 N / Total」，給予使用者階段完成的心理回饋。

## Capabilities

### New Capabilities
- `chunked-practice`: 分階段練習模式的核心邏輯 — 題庫拆分、階段管理、進度追蹤、跨設備雲端同步。
- `practice-session-storage`: 練習進度的雲端/本地雙軌持久化 — Supabase 表設計、RLS 政策、Repository 擴展。

### Modified Capabilities
- `battle-mode`: 戰鬥系統需感知「階段邊界」 — 階段切換時 Streak/怪物狀態的重置或繼承策略。

## Impact

### 受影響的檔案與模組

| 影響層級 | 檔案/模組 | 變更性質 |
|----------|-----------|----------|
| **類型定義** | `types.ts`, `types/battleTypes.ts` | 新增 `ChunkedPracticeSession`, `PracticeChunk` 型別（包含 `bank_ids` / `bank_names`）；擴展 `QuizState.mode` 加入 `'chunked'`，並新增 `ChunkMeta` 供 QuizEngine/UI 顯示 |
| **服務層** | `services/repository.ts` | 擴展 `IStorageRepository` 介面新增 practice session CRUD |
| **服務層** | `services/localRepo.ts` | 實作本地 practice session 持久化 |
| **服務層** | `services/cloudRepo.ts` | 實作 Supabase practice session 同步 |
| **服務層** | `services/cloudStorage.ts` | 新增雲端 practice session API 函式 |
| **服務層** | `services/storage.ts` | 新增 `STORAGE_KEYS.PRACTICE_SESSIONS` |
| **Hook** | `hooks/useChunkedPractice.ts` | **新增** — 核心 Domain Hook |
| **Hook** | `hooks/useQuizEngine.ts` | 修改 `startQuiz` 支援 chunk 子集；新增階段完成回調 |
| **Hook** | `hooks/useBattleSystem.ts` | 可能需要支援階段切換時的狀態策略 |
| **元件** | `components/ChunkedPracticePanel.tsx` | **新增** — 階段選擇/進度 Dashboard UI |
| **元件** | `components/QuizCard.tsx` | 修改進度列顯示階段資訊 |
| **元件** | `components/AppContent.tsx` | 整合新面板到 Dashboard |
| **資料庫** | `docs/migrations/` | 新增 Supabase migration SQL |
| **測試** | `src/__tests__/` | 新增 chunked practice 單元測試 |
| **測試** | `e2e/` | 新增跨階段練習 E2E 測試 |

### 風險與預防

| 風險 | 嚴重度 | 預防措施 |
|------|--------|----------|
| 雲端同步衝突（兩設備同時作答同一階段） | 高 | 採用 Last-Write-Wins + `updated_at` 時間戳；避免以較舊資料覆蓋較新資料（設計採靜默處理，不額外顯示衝突警告） |
| 題庫內容在兩次練習間被修改（題目增刪） | 中 | 創建 Session 時快照 question IDs，恢復時驗證題目是否仍存在 |
| `localStorage` 儲存空間不足（大型進度資料） | 低 | Guest 模式：active sessions FIFO 上限 5；並限制 localStorage 中總 sessions（含 abandoned/completed）最多保留 10，超過時物理刪除最舊的非 active |
| Guest 模式無法雲端同步 | 低 | Guest 模式自動降級為本地存儲，登入後提示同步 |
| 戰鬥系統在階段邊界的行為不一致 | 中 | 明確定義：階段切換時 Streak 歸零、怪物重生，模擬新一場戰鬥 |
