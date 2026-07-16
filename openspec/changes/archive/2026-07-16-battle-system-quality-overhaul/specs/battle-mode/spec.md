## ADDED Requirements

### Requirement: Answer events produce atomic battle transitions
戰鬥系統 SHALL 以單一純轉移函式處理每個已確認的答題事件，輸入目前可持久化狀態、唯一 `answerEventId`、答題結果與可注入依賴，並一次輸出下一狀態及零到多個演出事件；計算不得依賴 React render closure 或直接操作 DOM。

#### Scenario: Correct answer commits once
- **WHEN** 一個尚未處理的正確答題事件進入戰鬥轉移函式
- **THEN** `questionsAnswered` 與 `streak` SHALL 各增加一次
- **AND** 怪物傷害、暴擊、護盾與技能結果 SHALL 在同一個轉移內完成
- **AND** 系統 SHALL 產生具有同一 correlation ID 的演出事件

#### Scenario: Duplicate answer event is ignored
- **WHEN** 相同 `answerEventId` 因 UI 重複呼叫或重試再次提交
- **THEN** 持久化戰鬥狀態 SHALL 不再改變
- **AND** 系統 SHALL 不再產生傷害、技能、對話或音效事件

#### Scenario: Two valid answers arrive before a React rerender
- **WHEN** 兩個不同 `answerEventId` 在 React 尚未重新 render 前依序提交
- **THEN** 第二個轉移 SHALL 以前一個轉移的最新狀態為基礎
- **AND** `questionsAnswered`、streak、HP 與里程碑 SHALL 不得遺失更新

### Requirement: Battle values remain bounded and registry-driven
戰鬥 HP、傷害、護盾、暴擊與怪物攻擊 SHALL 由具名且具型別的規則／registry 計算；英雄與怪物 HP SHALL 限制在 `0..maxHp`，傷害與護盾吸收 SHALL 為有限非負整數，且不得保留未使用或與實際計算不一致的設定常數。

#### Scenario: Monster attacks after a wrong answer
- **WHEN** 使用者答錯且目前怪物仍有效
- **THEN** 基礎反擊傷害 SHALL 取自該怪物的 `attackPower` 或明確的難度平衡設定
- **AND** 任何護盾 SHALL 先吸收傷害並限制在可用護盾值
- **AND** 英雄 HP SHALL 不低於 0

#### Scenario: Critical hit calculation
- **WHEN** 注入的亂數結果命中暴擊門檻
- **THEN** 系統 SHALL 使用唯一受測的暴擊倍率規則計算最終傷害
- **AND** 狀態與演出事件 SHALL 回報相同的 `isCrit`、base damage、multiplier 與 final damage

#### Scenario: Invalid numeric input is contained
- **WHEN** 遷移資料或 registry 提供 NaN、Infinity、負數或超出上限的 HP／傷害值
- **THEN** codec 或轉移函式 SHALL 拒絕該值並採用安全狀態
- **AND** UI SHALL 不得渲染無效寬度或顯示 `NaN`

### Requirement: Skill milestones are deterministic and data-driven
技能觸發、tier、element、傷害、護盾與演出資源 SHALL 由單一 typed skill registry 決定。既有里程碑 SHALL 保持為 streak 5 與 10 以上的每 10 streak 一次；不在里程碑的答案 SHALL 不觸發技能。

#### Scenario: First skill milestone
- **WHEN** 正確答案令 streak 從 4 變成 5
- **THEN** 系統 SHALL 從 5-streak 可用技能集合中依注入亂數選出一個技能
- **AND** 技能的戰鬥效果與 presentation metadata SHALL 使用同一個 skill ID

#### Scenario: Non-milestone answer
- **WHEN** 正確答案令 streak 變成 6、15 或 25
- **THEN** 系統 SHALL 執行一般攻擊而非技能
- **AND** 不得產生 skill-cast presentation event

#### Scenario: High-streak video tier
- **WHEN** streak 到達 30、40 或 50 的里程碑
- **THEN** 系統 SHALL 依 registry 決定 ultimate、epic 或 legendary 技能
- **AND** 影片不可用時 SHALL 保留相同戰鬥結果並改用已登錄的 CSS／圖像 fallback

### Requirement: Encounter milestones keep one explicit pending spawn
遭遇排程 SHALL 明確記錄單一待生成難度與已處理里程碑。每完成 10 題 SHALL 將尚未生成的 pending kind 設為 Boss；每完成 5 題但非 10 題里程碑 SHALL 在沒有 pending Boss 時設為 Elite。Boss SHALL 可覆蓋尚未生成的 Elite，系統不累積多個待生成遭遇。排程不得在答題中途替換仍存活的怪物，也不得用相鄰餘數容錯重複生成。

#### Scenario: Boss milestone reached while monster survives
- **WHEN** `questionsAnswered` 首次到達 10 的倍數且目前怪物 HP 大於 0
- **THEN** 目前怪物 SHALL 留在場上
- **AND** `nextEncounterKind` SHALL 被設為 `boss`
- **AND** 此里程碑 SHALL 被記錄為已排程

#### Scenario: Scheduled boss spawns after current monster defeat
- **WHEN** 已排程 Boss 且目前怪物被擊敗
- **THEN** 下一個有效怪物 SHALL 從 Boss registry 選出
- **AND** Boss 排程 SHALL 被消耗一次
- **AND** 同一里程碑不得再次生成 Boss

#### Scenario: Elite milestone does not override boss
- **WHEN** Boss 已排程而後續一般規則亦可排定 Elite
- **THEN** Boss SHALL 保有較高優先權
- **AND** 系統 SHALL 不得以 Elite 覆蓋待生成 Boss

#### Scenario: Boss supersedes a pending elite
- **WHEN** Elite 已排程但目前怪物仍存活，且作答數後續首次到達 10 的倍數
- **THEN** 單一 `nextEncounterKind` SHALL 變更為 `boss`
- **AND** 被覆蓋的 Elite SHALL 不再補排，不建立遭遇 queue
- **AND** 已處理的 Elite 與 Boss milestone SHALL 各自記錄，相同 milestone 不重複觸發

#### Scenario: Monster taxonomy remains explicit
- **WHEN** registry 載入現有怪物
- **THEN** Fire Dragon 與 Skeleton Wizard SHALL 維持 `boss`
- **AND** Skeleton Warrior 與 Orc SHALL 維持 `elite`
- **AND** 美術素材名稱不得暗中改變遊戲難度分類

### Requirement: Quiz progress remains authoritative when battle presentation fails
答題正誤、分數與下一題流程 SHALL 由測驗系統維持權威；戰鬥 engine 或 presentation 的可復原錯誤不得吞掉已確認答案、重複計分或永久鎖住提交 UI。

#### Scenario: Battle asset or animation fails after answer confirmation
- **WHEN** 答案已確認但技能影片、圖片或動畫執行失敗
- **THEN** 測驗答案與分數 SHALL 正常提交一次
- **AND** 戰鬥 SHALL 使用降級演出或清除 presentation queue
- **AND** 使用者 SHALL 能前往下一題

#### Scenario: Battle transition rejects corrupted state
- **WHEN** 答題時偵測到不可遷移的戰鬥狀態
- **THEN** 系統 SHALL 重新初始化安全戰鬥狀態並記錄診斷資訊
- **AND** 測驗提交 SHALL 繼續
- **AND** 正式使用者答案資料 SHALL 不被清除或覆寫

### Requirement: Battle persistence stores versioned durable progress only
V2 durable snapshot SHALL 只寫入 `mindspark_battle_state_v2`；既有 `mindspark_battle_state` SHALL 只用於驗證與首次遷移，不再由新版寫入。Snapshot SHALL 沿用現有 integrity envelope 以偵測意外損壞，以 ID 參照怪物與技能 registry，完整驗證所有欄位，且 SHALL NOT 儲存動畫 frame、對話、DOM 座標、計時器、音訊或 presentation queue。Integrity envelope 不得被文件宣稱為可抵抗能執行任意前端程式碼的攻擊者。

#### Scenario: Presentation-only state changes
- **WHEN** 動畫從蓄力進入命中、對話淡出或傷害數字離場，而 durable battle progress 沒有改變
- **THEN** 系統 SHALL 不重新簽署或寫入 `mindspark_battle_state_v2`

#### Scenario: Durable state changes rapidly
- **WHEN** 多個有效答題轉移快速更新 durable snapshot
- **THEN** 簽章寫入 SHALL 維持順序
- **AND** 最終可讀取快照 SHALL 對應最後一個已提交狀態
- **AND** 中間或舊簽章不得覆蓋最新狀態

#### Scenario: Legacy snapshot loads
- **WHEN** 現有未版本化或舊版本的合法已簽章 BattleState 被載入
- **THEN** 系統 SHALL 先驗證後遷移為最新 snapshot schema
- **AND** 可保留的 HP、streak、questions answered、defeated count 與目前怪物 SHALL 被保留
- **AND** 已移除的 transient／dead fields SHALL 被忽略
- **AND** 遷移結果 SHALL 寫入 `mindspark_battle_state_v2`，不得改寫舊 key

#### Scenario: Old and new clients coexist
- **WHEN** 舊 PWA 分頁仍使用 `mindspark_battle_state`，新版已寫入 V2
- **THEN** 兩版 SHALL 寫入不同 key
- **AND** 舊分頁後續寫入 SHALL 不得覆蓋 `mindspark_battle_state_v2`

#### Scenario: Invalid or tampered snapshot loads
- **WHEN** snapshot 簽章錯誤、JSON 損壞、ID 不存在或任何必要欄位不符合 schema
- **THEN** 系統 SHALL 不套用該資料
- **AND** SHALL 回復安全初始戰鬥狀態
- **AND** 不得修改其他 `mindspark_*` key

### Requirement: Battle tests isolate all persistent data
自動測試 SHALL 使用記憶體 storage 或專用測試 key／context，並 SHALL NOT 讀寫開發者或使用者真實瀏覽器 profile 的 `mindspark_battle_state`、`mindspark_*` localStorage、雲端 practice session 或 `user_data.json`。

#### Scenario: Unit test executes persistence coverage
- **WHEN** Vitest 驗證簽章、遷移或快速連續寫入
- **THEN** 測試 SHALL 注入隔離 storage adapter
- **AND** 測試結束 SHALL 清理自身資料
- **AND** 不得以跳過斷言、固定 production 回傳值或降低型別檢查來通過

#### Scenario: E2E battle flow executes
- **WHEN** Playwright 驗證技能或 Boss 里程碑
- **THEN** 測試 SHALL 透過公開匯入／答題流程建立可重現題庫
- **AND** production bundle SHALL 不包含可改寫戰鬥狀態的 cheat route 或測試按鈕

## MODIFIED Requirements

### Requirement: Battle state reset on chunk boundary
戰鬥系統 SHALL 將每個分階段練習 Chunk 視為獨立戰鬥，並只在穩定的 `sessionId + chunkIndex` 邊界首次進入時重置 durable 與 presentation 狀態；React rerender 或 `chunkMeta` 物件 identity 變更不得重複重置。

#### Scenario: Enter a new chunk
- **WHEN** `QuizState.mode === 'chunked'` 且穩定 chunk boundary key 從前一 Chunk 改變
- **THEN** 系統 SHALL 開始一場新的戰鬥
- **AND** streak、questionsAnswered、seenMonsters、encounter schedule、pending presentation 與已處理 answer IDs SHALL 重置
- **AND** SHALL 生成一個有效的初始 normal monster
- **AND** Chunk 題目進度 SHALL 不受影響

#### Scenario: Rerender within the same chunk
- **WHEN** QuizCard 在相同 `sessionId + chunkIndex` 重新 render 或收到內容相同的新 `chunkMeta` 物件
- **THEN** 戰鬥狀態 SHALL 保持不變
- **AND** 不得重新生成怪物或清空 streak

### Requirement: Game Mode toggle during an in-progress chunk
當使用者在 Chunk 進行中切換 Game Mode，系統 SHALL 有明確且冪等的初始化／停止規則，且不得影響題目索引、答案、分數、draft 或雲端 practice session。

#### Scenario: Toggle game mode ON mid-chunk
- **WHEN** 使用者在 `QuizState.mode === 'chunked'` 且 Chunk status 為 `in_progress` 時，將 Game Mode 由 OFF 切換為 ON
- **THEN** 系統 SHALL 初始化一次新的戰鬥
- **AND** streak 與 questionsAnswered SHALL 從 0 開始，不追溯既已作答題目
- **AND** Chunk 題目進度與作答狀態 SHALL 不受影響

#### Scenario: Toggle game mode OFF mid-chunk
- **WHEN** 使用者在進行中 Chunk 將 Game Mode 由 ON 切換為 OFF
- **THEN** 系統 SHALL 停止並清理 presentation queue、動畫計時器及戰鬥音訊
- **AND** 測驗流程 SHALL 不受影響
- **AND** durable battle snapshot SHALL 依既有本機政策保留，不寫入 practice session cloud data

#### Scenario: Battle state not persisted in practice session cloud data
- **WHEN** 系統保存 Chunk 完成狀態到雲端
- **THEN** BattleSnapshot SHALL NOT 被包含在 `PracticeChunk` 或其他 practice session payload
- **AND** 戰鬥狀態 SHALL 僅存在於 hook memory 與 `mindspark_battle_state_v2` localStorage key，舊 key 只作遷移來源

### Requirement: Monster array bounds check
所有戰鬥開始與後續 spawn SHALL 經過同一個 monster resolver。resolver SHALL 過濾無效 ID，先嘗試要求難度、再 fallback 至 normal；若整個 registry 沒有有效怪物，系統 SHALL 回傳具型別的可復原失敗，而不得回傳 `undefined`、寫入無效 seen ID 或造成白屏。

#### Scenario: Requested monster pool is empty
- **WHEN** 要求難度沒有有效怪物而 normal registry 有有效怪物
- **THEN** 系統 SHALL 從 normal registry 選出怪物
- **AND** SHALL 只把有效 monster ID 寫入 seenMonsters

#### Scenario: Entire monster registry is empty or invalid
- **WHEN** 要求難度與 normal fallback 都沒有有效怪物
- **THEN** resolver SHALL 回傳明確的 typed failure
- **AND** 戰鬥 SHALL 進入可復原 unavailable 狀態並顯示安全提示
- **AND** 測驗與非戰鬥 UI SHALL 繼續運作

#### Scenario: Pool exhaustion avoids immediate repetition
- **WHEN** 某難度所有有效怪物都已在目前 rotation 出現
- **THEN** 系統 SHALL 重置該難度的 seen rotation 後再選擇
- **AND** 不得同時維護永遠為空的 `monsterPool` 與 `seenMonsters` 兩套真相來源
