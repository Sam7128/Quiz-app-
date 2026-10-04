## ADDED Requirements

### Requirement: QuizResult displays user's wrong answer alongside correct answer with accessibility support
QuizResult 結算頁在錯題回顧區塊中，對於每道錯題 SHALL 同時顯示使用者的錯誤選擇（以紅色醒目標記）與正確答案（以綠色標記），提供清晰的認知對比糾錯，並符合 WCAG 2.1 AA 無障礙標準。

#### Scenario: Single-choice wrong answer comparison with ARIA and text labels
- **WHEN** 使用者在單選題中選擇了錯誤選項 `"A. 光合作用"` 而正確答案為 `"B. 呼吸作用"`
- **THEN** QuizResult 錯題回顧 SHALL 以紅色背景與文字顯示 `"❌ 你的選擇: A. 光合作用"`
- **AND** 該元素 SHALL 具有 `aria-invalid="true"` 屬性
- **AND** SHALL 以綠色背景與文字顯示 `"✅ 正確答案: B. 呼吸作用"`
- **AND** 該元素 SHALL 具有 `aria-label="正確答案: B. 呼吸作用"` 屬性
- **AND** 兩者 SHALL 同時直接可見，無需額外展開操作

#### Scenario: Multiple-choice wrong answer comparison with 4-state set operations
- **WHEN** 使用者在多選題中選擇了 `["A", "C"]` 而正確答案為 `["A", "B"]`
- **THEN** QuizResult 錯題回顧 SHALL 執行 4 態集合運算標註：
  - 選對（`User ∩ Correct = ["A"]`）：綠色背景 + 勾選圖示 + `[已選/正確]` 與 `aria-label="正確且已選擇"`
  - 錯選（`User \ Correct = ["C"]`）：紅色醒目標記 + 叉叉圖示 + `[❌ 你的選擇/錯誤]` 與 `aria-invalid="true"`
  - 漏選（`Correct \ User = ["B"]`）：琥珀/黃色虛線框 + 提示圖示 + `[✅ 正確答案/漏選]` 與 `aria-label="正確答案但未選"`
  - 中立（未選干擾項）：維持淡灰低調邊框
- **AND** 各項目 SHALL 具備文字標籤與語義屬性，確保無障礙識別能力

#### Scenario: All options rendered with structured visual markers
- **WHEN** 錯題回顧展開並顯示完整選項列表
- **THEN** 單選題每個選項 SHALL 標記為三態（正確答案、使用者錯誤選擇、中立未選）；多選題每個選項 SHALL 標記為四態（選對、錯選、漏選、中立）

### Requirement: QuizCard immediate feedback renders multi-state comparison
在答題進行中的 QuizCard 元件，當使用者作答並觸發判定後，選項列表 SHALL 立即同步呈現對應的視覺對比反饋。

#### Scenario: QuizCard feedback on incorrect answer
- **WHEN** 使用者在 QuizCard 提交錯誤答案
- **THEN** 使用者所選選項 SHALL 立即呈現紅色錯誤樣式
- **AND** 題目的正確選項 SHALL 立即呈現綠色正確樣式
- **AND** 其餘未被選取的干擾選項 SHALL 維持次要或淡化樣式

### Requirement: QuizState tracks user answers for wrong questions
`QuizState` SHALL 新增 `userAnswerMap` 欄位（型別為 `Record<string, string | string[]>`），在 `handleAnswer` 判定答錯時，同步將 `questionId → userAnswer` 寫入此 map。`AppContent.tsx` 在組裝 `QuizResult` 時 SHALL 將 `userAnswerMap` 作為 prop 傳入。

#### Scenario: userAnswerMap populated on incorrect answer
- **WHEN** 使用者答錯一道 questionId 為 `"q42"` 的題目，選擇了 `"A. 錯誤選項"`
- **THEN** `quizState.userAnswerMap["q42"]` SHALL 等於 `"A. 錯誤選項"`
- **AND** `quizState.wrongQuestionIds` SHALL 包含 `"q42"`（既有行為保持不變）

#### Scenario: userAnswerMap empty at quiz start
- **WHEN** `startQuiz` 被呼叫初始化新測驗
- **THEN** `quizState.userAnswerMap` SHALL 為空物件 `{}`

#### Scenario: Graceful fallback when userAnswer is missing in map
- **WHEN** 某道錯題因歷史資料或異常未記錄在 `userAnswerMap` 中
- **THEN** QuizResult SHALL 優雅降級為僅顯示正確答案，且介面不得拋出異常或崩潰
