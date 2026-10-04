## ADDED Requirements

### Requirement: FocusTimer session completion writes to study statistics with lifecycle safety
Dashboard 渲染 `<FocusTimer />` 時 SHALL 傳入 `onSessionComplete` 回呼。當 FocusTimer 成功完成一個專注時段時，該回呼 SHALL 呼叫 `recordStudySession(0, 0, durationSeconds)` 將純專注時長沉澱至學習統計。此流程需具備生命週期安全防護與準確度隔離。

#### Scenario: FocusTimer completes a full focus session
- **WHEN** FocusTimer 倒數計時正常歸零（且當前模式為專注模式 `focus`）
- **THEN** `onSessionComplete` SHALL 被呼叫，參數為完成的專注秒數（如 1500 秒）
- **AND** `recordStudySession(0, 0, duration)` SHALL 被觸發以記錄純專注時段

#### Scenario: Break session completion does not write stats
- **WHEN** FocusTimer 的休息計時完成（模式為 `shortBreak` 或 `longBreak`）
- **THEN** `onSessionComplete` SHALL NOT 被呼叫，不寫入學習統計

#### Scenario: Unmount or early cancel does not record partial incomplete session
- **WHEN** 使用者在專注倒數進行中中途暫停、重置計時器，或切換導航離開頁面（元件 unmount）
- **THEN** 未完成的時段 SHALL NOT 呼叫 `onSessionComplete`，不寫入學習統計

#### Scenario: Rerender de-duplication guard
- **WHEN** 專注完成觸發狀態更新導致 Dashboard 或 FocusTimer 重新渲染
- **THEN** 系統 SHALL 防範在同一次完成事件中被多次重入呼叫，確保同一時段僅寫入一次

#### Scenario: Zero-question sessions excluded from accuracy calculation
- **WHEN** `getStudyStats` 或 `getDailyStats` 計算測驗勝率/正確率
- **AND** 存在 `questionsAnswered === 0` 的純專注時段記錄
- **THEN** 該記錄 SHALL 被排除於勝率/正確率計算之外（避免做題正確率被 0/0 稀釋拉低）
- **AND** 該記錄的專注時長 SHALL 仍正常累加至總學習時長中

#### Scenario: Cloud and guest dual-track schema compatibility
- **WHEN** 訪客模式（LocalStorage）或登入模式（Supabase）執行 `recordStudySession(0, 0, duration)`
- **THEN** 資料庫與本地儲存結構 SHALL 接受 `questionsAnswered: 0` 與 `correctAnswers: 0`，不觸發約束違規或同步中斷
- **AND** 底層儲存服務 SHALL NOT 施加測驗專用的「0 題且 < 5s 忽略」過濾規則，保證即使極短專注測試亦能被儲存層接納
