# 核心規格 - 分階段練習 (Chunked Practice)

## Requirements

### Requirement: User can create a chunked practice session
系統 SHALL 允許已登入或 Guest 使用者從任何包含 ≥1 題的題庫中創建分階段練習 Session。創建時使用者 SHALL 能夠選擇每階段的題目數量（Chunk Size），可選值為 `10 | 15 | 20 | 25 | 30`，預設值為 `20`。

#### Scenario: Create session from 60-question bank with default chunk size
- **WHEN** 使用者選擇一個包含 60 題的題庫，並以預設 chunk size (20) 創建分階段練習
- **THEN** 系統 SHALL 創建一個包含 3 個 Chunk 的 Session（Chunk 0: Q1-Q20, Chunk 1: Q21-Q40, Chunk 2: Q41-Q60）
- **THEN** 所有題目 SHALL 在創建時隨機打亂後再分配到各 Chunk
- **THEN** Chunk 0 的 status 為 `pending`，其餘 Chunk 的 status 為 `pending`
- **THEN** Session 的整體 status 為 `active`

#### Scenario: Create session from bank with non-divisible question count
- **WHEN** 使用者選擇一個包含 55 題的題庫，chunk size 為 20
- **THEN** 系統 SHALL 創建 3 個 Chunk：Chunk 0 (20 題), Chunk 1 (20 題), Chunk 2 (15 題)
- **THEN** 最後一個 Chunk 的題目數量 SHALL 等於剩餘題目數

#### Scenario: Bank has fewer questions than chunk size
- **WHEN** 使用者選擇一個包含 8 題的題庫，chunk size 為 20
- **THEN** 系統 SHALL 創建 1 個 Chunk 包含全部 8 題
- **THEN** Session 行為 SHALL 與普通測驗一致（無分階段 UI）：QuizCard 不顯示「📦 階段 X / Y」，且不顯示階段完成摘要模態

> 規則補充：當 `totalChunks <= 1` 時，系統仍可使用相同的 Session/Chunk 資料結構保存進度，但 UI SHALL 隱藏 chunk 層級顯示。

#### Scenario: Create session from empty bank
- **WHEN** 使用者選擇一個包含 0 題的題庫
- **THEN** 系統 SHALL 顯示 toast 警告「目前選擇的範圍沒有題目！」
- **THEN** 系統 SHALL NOT 創建任何 Session

### Requirement: User can practice one chunk at a time
系統 SHALL 僅允許使用者按照順序練習 Chunk（即必須完成 Chunk N 才能開始 Chunk N+1）。使用者開始一個 Chunk 時，系統 SHALL 將該 Chunk 的 status 設為 `in_progress`。

#### Scenario: Start first chunk of a new session
- **WHEN** 使用者開始一個新 Session 的 Chunk 0
- **THEN** Chunk 0 的 status SHALL 變為 `in_progress`
- **THEN** QuizEngine SHALL 載入 Chunk 0 的 question IDs 作為 activeQuestions
- **THEN** QuizCard SHALL 顯示「階段 1 / 3」而非僅「題 1 / 20」

#### Scenario: Attempt to start a locked chunk
- **WHEN** 使用者嘗試開始 Chunk 2（Chunk 1 的 status 不是 `completed`）
- **THEN** 系統 SHALL 阻止開始並顯示提示「請先完成前一個階段」

### Requirement: Chunk completion triggers automatic save
系統 SHALL 在使用者答完一個 Chunk 的最後一題後，自動將該 Chunk 標記為 `completed`，並立即保存進度。

#### Scenario: Complete chunk 1 of 3
- **WHEN** 使用者答完 Chunk 0 的第 20 題（最後一題）
- **THEN** Chunk 0 的 status SHALL 變為 `completed`
- **THEN** Chunk 0 的 `score`、`wrongQuestionIds`、`completedAt` SHALL 被記錄
- **THEN** Session 進度 SHALL 立即持久化（localStorage 或 Supabase）
- **THEN** 系統 SHALL 顯示階段完成摘要（得分、正確率）
- **THEN** 使用者 SHALL 可選擇「繼續下一階段」或「休息（返回 Dashboard）」

#### Scenario: Complete the last chunk
- **WHEN** 使用者答完最後一個 Chunk 的最後一題
- **THEN** 該 Chunk SHALL 被標記為 `completed`
- **THEN** Session 的整體 status SHALL 變為 `completed`
- **THEN** 系統 SHALL 顯示整體 Session 完成摘要（所有階段的總得分、總正確率）

### Requirement: User can resume an incomplete session
系統 SHALL 在 Dashboard 上顯示所有 `active` 狀態的 Practice Sessions，使用者可選擇繼續未完成的 Session。恢復時從第一個 `pending` 或 `in_progress` 的 Chunk 開始。

#### Scenario: Resume session from dashboard
- **WHEN** 使用者在 Dashboard 上看到一個 active 的 Practice Session（Chunk 0 已完成，Chunk 1-2 待完成）
- **THEN** Dashboard SHALL 顯示 Session 卡片，包含：題庫名稱、進度（1/3 階段已完成）、最後活動時間
- **THEN** 使用者點擊「繼續」後，系統 SHALL 從 Chunk 1 開始

#### Scenario: Resume session with partially completed chunk
- **WHEN** 使用者在 Chunk 1 做到第 7 題後退出，後來回到 Dashboard 繼續
- **THEN** 系統 SHALL 從 Chunk 1 的第 1 題重新開始（Chunk 內不保存中間進度，以避免複雜性）
- **THEN** Chunk 1 的 status 應保持 `in_progress` 直到所有題目答完

### Requirement: Partial exit handling during an in-progress chunk
當使用者在 `in_progress` 的 Chunk 中途離開（例如返回 Dashboard、重新整理或關閉頁面），系統 SHALL 不將該 Chunk 視為完成。

#### Scenario: Exit mid-chunk does not finalize chunk
- **WHEN** 使用者在 Chunk 進行中（尚未答完最後一題）離開測驗畫面
- **THEN** Session status SHALL 維持 `active`
- **THEN** 該 Chunk status SHALL 維持 `in_progress`
- **THEN** 該 Chunk 的 `score` / `wrongQuestionIds` / `completedAt` SHALL NOT 被更新（直到答完最後一題才會結算）
- **THEN** 已經發生的學習資料更新 SHALL 保留（例如錯題紀錄、間隔複習狀態）；系統 SHALL NOT 回滾已提交的作答結果
- **THEN** 系統 SHALL NOT 顯示階段完成摘要模態

### Requirement: Mid-chunk restore snapshot
系統 SHALL 為進行中的 Chunk 維護獨立的本地恢復快照，以支援刷新或中斷後的續作；此快照 SHALL NOT 使用 `mindspark_quiz_session` 主鍵，避免與一般 quiz session 混淆。

#### Scenario: Refresh mid-chunk restores current chunk draft
- **WHEN** 使用者在 Chunk 進行中重新整理頁面
- **THEN** 系統 SHALL 從 chunk 專屬快照恢復當前 Chunk 的 `questionIds`、`currentQuestionIndex`、`score`、`wrongQuestionIds` 與 `pendingSkill`/battle 需要的最小狀態
- **THEN** 系統 SHALL 保留 Session 的 `active` / `in_progress` 狀態
- **THEN** 系統 SHALL 在 Chunk 完成時清除該 chunk 專屬快照

#### Scenario: Closed tab resumes same chunk later
- **WHEN** 使用者關閉頁面後再次回到同一 Session
- **THEN** 系統 SHALL 從 chunk 專屬快照恢復到最後一次作答位置，而不是從第一題重新開始
- **THEN** 若 chunk 專屬快照缺失，系統 SHALL 回退到 chunk 的第 1 題重新開始

### Requirement: User can abandon a session
系統 SHALL 允許使用者手動放棄一個 active 的 Practice Session。

#### Scenario: Abandon an active session
- **WHEN** 使用者在 Dashboard 上對一個 active Session 點擊「放棄」
- **THEN** 系統 SHALL 顯示確認對話框「確定要放棄此練習嗎？已完成的階段進度會被保留在學習紀錄中。」
- **THEN** 使用者確認後，Session status SHALL 變為 `abandoned`
- **THEN** Session SHALL 從 Dashboard 的 active 列表中移除

### Requirement: Chunk progress display in QuizCard
當使用者在分階段練習模式下答題時，QuizCard 的進度列 SHALL 同時顯示「當前階段」和「題目」兩層進度。

#### Scenario: Display chunk progress during quiz
- **WHEN** 使用者在 Chunk 1 (第 2 階段) 的第 5 題作答中
- **THEN** 進度區域 SHALL 顯示「📦 階段 2 / 3」
- **THEN** 進度條 SHALL 顯示當前 Chunk 內的進度（5/20 = 25%）
- **THEN** 題目標示 SHALL 顯示「題目 5 / 20」（Chunk 內的題號）

### Requirement: Question ID validation on session restore
系統 SHALL 在恢復 Session 時驗證所有快照的 question IDs 是否仍存在於題庫中。

#### Scenario: All questions still exist
- **WHEN** 恢復一個 Session，所有 question IDs 都在題庫中找到
- **THEN** 系統 SHALL 正常載入所有題目

#### Scenario: Some questions were deleted
- **WHEN** 恢復一個 Session，但 60 題中有 3 題已被從題庫中刪除
- **THEN** 系統 SHALL 跳過不存在的題目
- **THEN** 受影響的 Chunk 的 `totalQuestions` SHALL 相應減少
- **THEN** 系統 SHALL 顯示 toast「有 3 題已不存在，已自動跳過」

#### Scenario: All questions in a chunk were deleted
- **WHEN** 恢復一個 Session，Chunk 2 的所有題目都被刪除
- **THEN** Chunk 2 SHALL 被自動標記為 `completed`（score = 0）
- **THEN** 使用者 SHALL 跳過此 Chunk 直接進入下一個

#### Scenario: All questions in a session were deleted (e.g., bank deleted)
- **WHEN** 恢復一個 Session，但所有快照的 question IDs 都已不存在（例如來源題庫被刪除）
- **THEN** 系統 SHALL 將該 Session 自動標記為 `abandoned`（避免誤判為完成）
- **THEN** 系統 SHALL 顯示 toast「此練習的題目已不存在，已自動放棄」
- **THEN** 該 Session SHALL 不再出現在 Dashboard 的 active 列表中

### Requirement: Session creation from multiple selected banks
系統 SHALL 支援從 Dashboard 上多選的題庫中合併創建一個分階段練習 Session。

#### Scenario: Create session from 2 selected banks
- **WHEN** 使用者選擇了 Bank A (30 題) 和 Bank B (30 題)，chunk size 為 20
- **THEN** 系統 SHALL 合併 60 題後隨機打亂
- **THEN** 創建 3 個 Chunk，每個 20 題
- **THEN** Session 的 `bankIds` SHALL 包含 Bank A 和 Bank B 的 ID
- **THEN** Session SHALL 保留 bank→question 的映射快照（用於刪除/恢復判定）
