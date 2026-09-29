## ADDED Requirements

### Requirement: Dashboard spaced due review entry
Dashboard SHALL 在 `dueCount > 0` 時顯示可點擊的按鈕（而非純文字 `<div>`），按鈕文字為「複習 {dueCount} 題到期題目」，點擊後 SHALL 觸發無參 `onStartSpacedReview()` 回調以啟動 `spaced_due` 測驗模式。

#### Scenario: Due count button visible and clickable
- **WHEN** Dashboard 載入且 `getDueQuestions()` 返回長度 > 0 的到期題目列表
- **THEN** Dashboard SHALL 渲染一個 `<button>` 元素（非 `<div>`），包含到期題數
- **AND** 按鈕 SHALL 具有明確的互動視覺樣式（hover 效果、cursor-pointer）
- **AND** 按鈕 SHALL 具有 `aria-label` 描述用途

#### Scenario: Clicking due count button starts spaced_due quiz
- **WHEN** 使用者點擊待複習按鈕
- **THEN** 系統 SHALL 呼叫 `startQuiz(undefined, 'spaced_due')`
- **AND** 系統 SHALL 從所有題庫中取得所有到期題目作為測驗題源
- **AND** 測驗 SHALL 僅包含到期題目（不混入非到期題目）

#### Scenario: Due count is zero
- **WHEN** `getDueQuestions()` 返回空陣列
- **THEN** Dashboard SHALL 不渲染任何待複習按鈕或提示

### Requirement: QuizState spaced_due mode
`QuizState.mode` 聯合型別 SHALL 新增 `'spaced_due'` 字面量。`useQuizEngine.startQuiz` 在接收 `mode: 'spaced_due'` 時 SHALL 跨所有題庫篩選到期題目，**按 `nextReviewDate` 遞增排序（逾期最久者優先出題）**，並且**豁免隨機洗牌（`shuffleArray`）**以保證出題順序嚴格符合記憶急迫度。

#### Scenario: startQuiz with spaced_due mode across all banks
- **WHEN** `startQuiz` 被呼叫且 `mode` 為 `'spaced_due'`
- **THEN** 引擎 SHALL 載入全部題庫以獲取全量題目物件
- **AND** 從 repository 取得 spaced repetition data 並使用 `getDueQuestions()` 篩選到期題目
- **AND** 篩選結果 SHALL 按 `nextReviewDate` 遞增排序（`a.nextReviewDate - b.nextReviewDate`）
- **AND** 出題題目陣列 SHALL NOT 被 `shuffleArray` 打亂
- **AND** 啟動測驗，`quizState.mode` 為 `'spaced_due'`

#### Scenario: Urgency sorting order verification
- **WHEN** 到期題目中存在 `nextReviewDate` 分別為 `1700000000`、`1700200000`、`1700100000` 的三題
- **THEN** 出題順序 SHALL 嚴格為 `1700000000` → `1700100000` → `1700200000`（逾期最久者先出）

#### Scenario: No due questions available when starting spaced_due
- **WHEN** `startQuiz` 以 `mode: 'spaced_due'` 呼叫但 `getDueQuestions()` 返回空陣列
- **THEN** 系統 SHALL 顯示 toast 警告訊息「目前沒有到期的複習題目！」
- **AND** 系統 SHALL 不切換到測驗畫面

#### Scenario: spaced_due quiz completion updates SM-2 data
- **WHEN** `spaced_due` 模式的測驗完成
- **THEN** 系統 SHALL 依每題作答結果呼叫 `updateSpacedRepetition` 更新 SM-2 資料
- **AND** 此行為 SHALL 與現有 `random` 模式的 SM-2 更新邏輯一致
