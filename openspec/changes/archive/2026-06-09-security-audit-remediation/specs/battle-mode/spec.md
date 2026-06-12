## MODIFIED Requirements

### Requirement: Battle system timers must be tracked and cleaned up on unmount
`useBattleSystem` 中所有 `setTimeout` 呼叫 SHALL 使用 `useRef` 追蹤計時器 ID，並在 hook 卸載時清理，防止記憶體洩漏。

#### Scenario: Timer cleanup on unmount during spawn animation
- **WHEN** `triggerAnswer(true)` 觸發怪物死亡動畫中的 `setTimeout(spawnNewMonster, 1500)`
- **AND** 用戶在 1500ms 內離開答題頁面
- **THEN** 計時器 SHALL 被 `clearTimeout` 取消
- **AND** `spawnNewMonster` SHALL NOT 被呼叫
- **AND** 不會產生 "Can't perform React state update on unmounted component" 警告

#### Scenario: All setTimeout calls use ref tracking
- **WHEN** `triggerAnswer` 函數內呼叫 `setTimeout`
- **THEN** 計時器 ID SHALL 被儲存至 `spawnTimerRef.current`
- **AND** 卸載清理 `useEffect` SHALL 清理 `spawnTimerRef`

### Requirement: Monster array bounds check
`getNextMonster` SHALL 在 `allMonsters` 陣列為空時提供安全的 fallback，防止 `undefined` 導致的白屏崩潰。

#### Scenario: Empty monster pool
- **WHEN** `getMonstersByDifficulty(difficulty)` 回傳空陣列
- **THEN** 系統 SHALL 嘗試 fallback 至 `getMonstersByDifficulty('normal')`
- **AND** 若仍為空，系統 SHALL 拋出明確的 Error 訊息而非 `undefined` 存取崩潰

#### Scenario: Normal monster pool available
- **WHEN** `getMonstersByDifficulty(difficulty)` 回傳非空陣列
- **THEN** 系統 SHALL 正常選擇怪物（現有行為不變）

### Requirement: Double submission prevention in QuizCard
QuizCard 的 `submitAnswer` SHALL 使用同步的 `useRef` 鎖定機制防止在 React 批量更新期間的重複提交，並保證在網路或 API 異常時能安全重置鎖定以防死鎖。

#### Scenario: Rapid double-click on single-choice option
- **WHEN** 用戶在 100ms 內對同一個選項快速點擊兩次
- **THEN** `submitAnswer` SHALL 只被有效執行一次
- **AND** 第二次點擊 SHALL 被 `isSubmittingRef.current` 檢查攔截

#### Scenario: Ref reset on question change
- **WHEN** 題目切換至下一題（`question` prop 變更）
- **THEN** `isSubmittingRef.current` SHALL 被重設為 `false`
- **AND** 用戶 SHALL 能正常提交新題目的答案

#### Scenario: Submit error lock release
- **WHEN** `submitAnswer` 執行期間發生網絡超時、API 錯誤或拋出未捕獲異常
- **THEN** 系統 SHALL 在 `catch` 或 `finally` 區塊中將 `isSubmittingRef.current` 重設為 `false`
- **AND** 用戶 SHALL 能夠重新點擊按鈕再次提交答案，UI 不會發生永久卡死

### Requirement: AI-generated question content sanitization
`generateQuestionsFromPDF` 回傳的題目 SHALL 對所有文字欄位（question, options, hint, explanation）使用 DOMPurify 進行 HTML 消毒。

#### Scenario: AI returns clean text
- **WHEN** AI 回傳的題目文字不含任何 HTML 標籤
- **THEN** DOMPurify 消毒後內容 SHALL 保持不變

#### Scenario: AI returns text with script injection
- **WHEN** AI 回傳的題目文字包含 `<script>alert('xss')</script>` 或 `<iframe>` 標籤
- **THEN** DOMPurify SHALL 移除所有危險標籤
- **AND** 回傳的題目文字 SHALL 只包含純文字內容

### Requirement: FocusTimer AudioContext cleanup
FocusTimer 的 `playNotificationSound` SHALL 在振盪器停止後關閉 `AudioContext`，防止瀏覽器 AudioContext 實例數溢出。

#### Scenario: Sound plays and context closes
- **WHEN** 番茄鐘時間到觸發音效
- **THEN** `oscillator.stop()` 後 100ms 內 SHALL 呼叫 `audioContext.close()`
- **AND** 釋放的 AudioContext 不再佔用瀏覽器配額

#### Scenario: Audio not supported
- **WHEN** 瀏覽器不支援 AudioContext
- **THEN** 系統 SHALL 靜默處理（catch 區塊記錄日誌）
- **AND** 不影響其他功能

### Requirement: Achievement time boundary correction
`useAchievementTracker` 的 `night_owl` 成就 SHALL 限定觸發時間為 22:00 ~ 23:59（不含凌晨），避免與 `early_bird` 的 0:00 ~ 5:59 時段重疊。

#### Scenario: Study at midnight (00:00-05:59)
- **WHEN** 用戶在凌晨 0:00 ~ 5:59 完成答題
- **THEN** 系統 SHALL 只觸發 `early_bird` 成就
- **AND** 系統 SHALL NOT 觸發 `night_owl` 成就

#### Scenario: Study at night (22:00-23:59)
- **WHEN** 用戶在晚上 22:00 ~ 23:59 完成答題
- **THEN** 系統 SHALL 只觸發 `night_owl` 成就
- **AND** 系統 SHALL NOT 觸發 `early_bird` 成就
