## ADDED Requirements

### Requirement: Auto-advance toggle in user settings with schema normalization
`UserSettings` 介面 SHALL 新增 `autoAdvanceOnCorrect: boolean` 欄位（預設值為 `false`）。Settings 頁面 SHALL 在「遊戲設定」區塊渲染此 toggle，標籤文字為「答對自動切題」，副標題說明「答對時自動前進至下一題，答錯時停留顯示解析」。從 `localStorage` 載入設定時，若該欄位缺失或為非布林值，SHALL 安全正規化為 `false`。

#### Scenario: Toggle visible in settings
- **WHEN** 使用者開啟 Settings Modal
- **THEN** SHALL 可見一個 toggle 開關，標籤為「答對自動切題」
- **AND** toggle 的初始狀態 SHALL 反映 `getUserSettings().autoAdvanceOnCorrect` 的值

#### Scenario: Legacy settings schema normalization
- **WHEN** 使用者的 localStorage 存有舊版設定（缺少 `autoAdvanceOnCorrect` 屬性）
- **THEN** `getUserSettings()` SHALL 返回補齊了 `autoAdvanceOnCorrect: false` 的設定物件
- **AND** 不得拋出 undefined 錯誤

#### Scenario: Toggle state persisted
- **WHEN** 使用者將 toggle 從 off 切換為 on 並儲存設定
- **THEN** `getUserSettings().autoAdvanceOnCorrect` SHALL 返回 `true`
- **AND** 下次開啟 Settings 或重整頁面時 toggle SHALL 保持 on 狀態

### Requirement: QuizCard auto-advances on correct answer with conflict cancellation and final question handling
當 `autoAdvanceOnCorrect` 為 `true` 時，QuizCard 在使用者答對後 SHALL 自動延遲後推進下一題。答錯時 SHALL NOT 自動推進，必須保持停留讓使用者檢視解析。當發生手動介入或位於最後一題時，需嚴格消解衝突。

#### Scenario: Auto-advance in non-battle mode
- **WHEN** `autoAdvanceOnCorrect` 為 `true` 且 `gameMode` 為 `false`
- **AND** 使用者答對當前題目，且當前題目非最後一題
- **THEN** QuizCard SHALL 在 800ms 延遲後自動呼叫 `onNext()`

#### Scenario: Auto-advance on the final question
- **WHEN** `autoAdvanceOnCorrect` 為 `true`
- **AND** 使用者答對最後一題（`currentQuestionIndex === totalQuestions - 1`）
- **THEN** 倒數完成後 SHALL 自動觸發測驗完成結算流程（轉入 finished / QuizResult 狀態）
- **AND** SHALL NOT 嘗試呼叫越界題目的 `onNext()`

#### Scenario: Auto-advance in battle mode with presentation sync
- **WHEN** `autoAdvanceOnCorrect` 為 `true` 且 `gameMode` 為 `true`
- **AND** 使用者答對當前題目
- **THEN** QuizCard SHALL 等待戰鬥演出事件 (`activePresentationEvent`) 完成後再延遲 400ms 呼叫 `onNext()`
- **AND** 設定 2000ms 的 safety timeout，若演出事件丟失回呼，超時後仍強制安全推進

#### Scenario: Manual advance cancels auto-advance timer
- **WHEN** 自動切題倒數進行中
- **AND** 使用者手動點擊「下一題」按鈕或按下 Enter 鍵
- **THEN** 進行中的計時器 SHALL 立即被清除 (`clearTimeout`)
- **AND** 推進動作 SHALL 僅執行一次，嚴禁發生連跳兩題的雙重推進

#### Scenario: No auto-advance on incorrect answer
- **WHEN** `autoAdvanceOnCorrect` 為 `true`
- **AND** 使用者答錯當前題目
- **THEN** QuizCard SHALL NOT 自動推進
- **AND** 使用者 SHALL 需要手動按 Enter 或點擊「下一題」

#### Scenario: Auto-advance timer cleanup on unmount
- **WHEN** QuizCard 在自動切題倒數期間被 unmount（例如使用者按 ESC 中途退出）
- **THEN** 倒數計時器 SHALL 被立即清除，不得在元件卸載後執行 `onNext()`
