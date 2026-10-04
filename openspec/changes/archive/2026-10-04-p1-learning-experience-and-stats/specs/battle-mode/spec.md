## MODIFIED Requirements

### Requirement: QuizResult 測驗結果頁面錯題對比與戰鬥模式協調
測驗結果頁面 SHALL 接受 `userAnswerMap: Record<string, string | string[]>` prop，在錯題回顧區塊中利用此 map 查詢每道錯題的使用者原始選擇，並以紅/綠色差對比渲染，同時提供 WCAG 無障礙標籤。在 RPG 戰鬥模式下，答對自動切題須與戰鬥打擊演出完美同步。

#### Scenario: QuizResult renders wrong questions with user answer comparison in battle mode
- **WHEN** 戰鬥模式測驗結束進入 QuizResult 結算頁面
- **AND** `userAnswerMap` 包含對應 questionId 的作答紀錄
- **THEN** 每道錯題 SHALL 同時顯示使用者的錯誤選擇（紅色醒目標記、前綴「❌ 你的選擇」與 `aria-invalid="true"`）與正確答案（綠色醒目標記、前綴「✅ 正確答案」與 ARIA 標籤）

#### Scenario: QuizResult gracefully handles missing userAnswerMap entry
- **WHEN** `userAnswerMap` 中不存在某道錯題的 questionId（例如歷史記錄或非選擇題）
- **THEN** 該題 SHALL 優雅退化為僅顯示正確答案（綠色標記），與既有行為一致，介面不得拋出異常

#### Scenario: Battle mode auto-advance presentation coordination
- **WHEN** 戰鬥模式下答對題目且 `autoAdvanceOnCorrect` 為 `true`
- **THEN** QuizCard SHALL 等待角色/怪物攻擊演出事件結束後，延遲 400ms 再推進下一題
- **AND** 若戰鬥動畫回呼因意外未觸發，SHALL 在 2000ms 兜底安全計時到期時強制推進，避免畫面凍結
