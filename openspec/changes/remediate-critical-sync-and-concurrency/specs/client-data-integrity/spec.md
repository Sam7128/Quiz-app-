## MODIFIED Requirements

### Requirement: Quiz Engine Answer Idempotency and Concurrency Guard
`useQuizEngine.handleAnswer` SHALL 防止對同一題目索引進行重複作答。在切換至下一題（呼叫 `nextQuestion`）之前，任何對當前題目索引的額外作答請求 SHALL 被靜默忽略，以防止分數重複累加、錯題重複寫入、以及 SM-2 間隔重複評分二次計算。

系統 SHALL 透過 `lastAnsweredQuestionIndexRef` 與 `isProcessingRef` 維護互斥防護：
1. 當 `handleAnswer` 被呼叫時，若 `isProcessingRef.current === true` 或 `lastAnsweredQuestionIndexRef.current === quizState.currentQuestionIndex`，系統 SHALL 立即返回，不執行任何狀態變更或存儲操作。
2. 首次作答時，系統 SHALL 將 `isProcessingRef.current` 設為 `true` 並記錄 `lastAnsweredQuestionIndexRef.current = quizState.currentQuestionIndex`。
3. 答題判定完成後，系統 SHALL NOT 透過微任務提前解鎖。
4. 只有在使用者切換至下一題（`nextQuestion`）時，系統 SHALL 解鎖 `isProcessingRef.current = false`；在重啟測驗（`startQuiz`）時，系統 SHALL 同步重置 `lastAnsweredQuestionIndexRef.current = null` 與 `isProcessingRef.current = false`。

#### Scenario: User spams Enter or double clicks on answer
- **WHEN** 使用者在題目索引 0 的反饋展示期間快速連按 Enter 或重複點擊選項
- **THEN** 第一次 `handleAnswer` SHALL 正確判定對錯並更新分數與錯題記錄
- **AND** 第二次及後續的 `handleAnswer` 呼叫 SHALL 被 `lastAnsweredQuestionIndexRef` 阻斷
- **AND** 測驗分數 SHALL 僅增加 1 次（若答對）
- **AND** 錯題本與 SM-2 演算法 SHALL 僅接收到 1 次作答記錄

#### Scenario: Question advancement re-enables answer submission
- **WHEN** 使用者完成題目索引 0 的作答並點擊「下一題」（觸發 `nextQuestion`）
- **THEN** 題目索引推進至 1
- **AND** `isProcessingRef.current` SHALL 被重置為 `false`
- **AND** 題目索引 1 的第一次 `handleAnswer` SHALL 正常被執行
