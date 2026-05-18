# Services 模組

## 核心服務清單

| 服務 | 檔案 | 職責 |
|------|------|------|
| 本地儲存 | `storage.ts` | localStorage CRUD，key 前綴 `mindspark_` |
| 雲端儲存 | `cloudStorage.ts` | Supabase 資料存取 |
| Repository | `repository.ts` | `IStorageRepository` 介面（統一本地/雲端） |
| AI Provider | `ai.ts` | Google/NVIDIA 多 Provider，嚴格 JSON Schema + Few-shot |
| 分析記錄 | `analytics.ts` | 學習分析（本地 `recordLocalStudySession` + 雲端 `recordStudySession`） |
| 間隔重複 | `spacedRepetition.ts` | SM-2 演算法（easiness factor, interval, repetition count） |
| 知識圖儲存 | `graphStorage.ts` | Graph CRUD + `MutationResult` + `QuotaExceeded` 偵測 |
| Mermaid 橋接 | `mermaidBridge.ts` | Mermaid 語法 ↔ Graph 資料雙向轉換 |
| 成就服務 | `achievements.ts` | 成就解鎖邏輯 |
| 挑戰服務 | `challenges.ts` | 排行榜查詢（Manual Join 策略避免 PostgREST 400） |
| Supabase 客戶端 | `supabase.ts` | Supabase SDK 初始化 + 社交查詢 |
| Beta 功能 | `betaFeature.ts` | Beta 功能開關管理 |

## localStorage Key 前綴對照

所有 key 以 `mindspark_` 為前綴：
- `mindspark_banks` — 題庫陣列
- `mindspark_recent_mistakes` — 最近 5 次錯誤（FIFO）
- `mindspark_battle_state` — 戰鬥全狀態
- `mindspark_quiz_session` — 進行中的測驗
- `mindspark_practice_sessions` — 分階段練習 session 陣列（含 dirty/retry）
- `mindspark_chunk_draft:<sessionId>:<chunkIndex>` — 分階段進行中草稿
- `mindspark_spaced_repetition` — SM-2 資料
- `mindspark_streak_data` — 連續正確計數
- `mindspark_achievements` — 已解鎖成就
- `mindspark_settings` — 使用者設定
- `mindspark_folders` / `mindspark_bank_folder_map` — 資料夾系統
- `mindspark_ai_config` — AI Provider 設定
- `mindspark_study_sessions` — 學習分析
- `mindspark_graphs` — 知識圖資料

## 開發慣例

1. **回傳型別**: 所有函式必須有明確的回傳型別宣告
2. **錯誤處理**: try-catch 包裹，錯誤時回傳合理預設值（空陣列、false 等）
3. **禁止拋出**: 不拋出未捕獲的錯誤至 UI 層
4. **資料安全**: 禁止對 `mindspark_*` 正式數據執行破壞性測試
5. **雲端查詢**: 避免使用 `.single()`，改用 `.limit(1)` 防止 406 錯誤
