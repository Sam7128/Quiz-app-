## ADDED Requirements

### Requirement: All quiz exit paths settle study session statistics with idempotency protection
所有從測驗退出的路徑（`onRetry`, `onRestart`, `onHome`, `handleExitQuiz`, Chunked Practice 退出, RestBreakModal 終止退出）SHALL 在執行後續動作（啟動新測驗、導航或關閉）之前，先呼叫 `recordStudySession` 結算當前測驗輪次的學習統計。結算過程 SHALL 具備冪等性防禦與資料安全校驗。

#### Scenario: onRetry settles before starting retry quiz
- **WHEN** 使用者在 QuizResult 結算頁點擊「重試錯題」
- **AND** `sessionStartTime` 不為 null
- **THEN** 系統 SHALL 先呼叫 `recordStudySession(totalQuestions, score, durationSeconds)` 記錄本輪統計
- **AND** 隨後 SHALL 呼叫 `startQuiz` 以錯題 IDs 啟動新測驗

#### Scenario: onRestart settles before starting new quiz
- **WHEN** 使用者在 QuizResult 結算頁點擊「重新開始」
- **AND** `sessionStartTime` 不為 null
- **THEN** 系統 SHALL 先呼叫 `recordStudySession(totalQuestions, score, durationSeconds)` 記錄本輪統計
- **AND** 隨後 SHALL 呼叫 `startQuiz` 以原始題數啟動新測驗

#### Scenario: handleExitQuiz settles mid-quiz exit
- **WHEN** 使用者在答題中途按 Esc 或點擊退出按鈕觸發 `handleExitQuiz`
- **AND** `sessionStartTime` 不為 null
- **AND** 已答題數（`currentQuestionIndex`）> 0
- **THEN** `handleExitQuiz` SHALL 呼叫 `recordStudySession` 以已答題數、當前得分與已用時長結算
- **AND** 隨後 SHALL 執行既有退出邏輯（儲存錯題 session、返回 dashboard）

#### Scenario: Chunked practice completion and abandonment settlement
- **WHEN** 使用者在 Chunked Practice 模式下完成一個 chunk 或中途放棄退出
- **AND** 存在未結算的答題時間與題數
- **THEN** 系統 SHALL 觸發結算函式，將已完成的做題數據持久化至學習統計中

#### Scenario: RestBreakModal early stop settlement
- **WHEN** 測驗期間觸發休息提醒彈窗，使用者選擇終止練習退出
- **THEN** 系統 SHALL 在跳轉前觸發結算函式，保存當前 session 的做題數據

#### Scenario: Idempotency protection against rapid clicks
- **WHEN** 同一輪測驗的結算操作在極短時間內被重複觸發（如快速連擊按鈕）
- **THEN** 透過 settlement token 與鎖機制，僅首次觸發 SHALL 真正呼叫 `recordStudySession`
- **AND** 後續重複呼叫 SHALL 被安全攔截，確保數據不被重複累加

#### Scenario: Minimum duration guard
- **WHEN** 結算計算出的測驗時長小於 1 秒
- **THEN** 系統 SHALL 使用 `Math.max(1, durationSeconds)` 作為寫入值，防止記錄 0 秒或負時長

#### Scenario: No settlement when quiz was not actually started
- **WHEN** `sessionStartTime` 為 null（未開始或已完全結算）
- **OR** 測驗已答題數為 0 且時長小於 5 秒（誤觸開啟立即關閉）
- **THEN** 結算函式 SHALL 跳過記錄，避免寫入空噪音數據

#### Scenario: Storage failure does not break navigation and preserves retry capability
- **WHEN** 呼叫 `recordStudySession` 時發生本地儲存配額超限或網路異常
- **THEN** 結算函式 SHALL 安全捕獲異常，確保導航動作（如返回首頁、重試錯題）正常執行不卡死
- **AND** 結算狀態 SHALL NOT 永久標記為已結算，允許使用者後續操作或重試時再次嘗試持久化
