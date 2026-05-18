## MODIFIED Requirements

### Requirement: Battle state reset on chunk boundary
戰鬥系統 SHALL 在分階段練習模式的 Chunk 邊界（開始新 Chunk 時）重置戰鬥狀態，將每個 Chunk 視為獨立的一場戰鬥。

原始行為（來自 `openspec/specs/battle-mode/spec.md`）：
- `useBattleSystem` 的 `startBattle()` 初始化戰鬥狀態
- `streak`、`questionsAnswered` 在整個測驗中連續累計
- 怪物從池中依序選取，不重複

修改後行為：
- 當 `QuizState.mode === 'chunked'` 且進入新的 Chunk 時，系統 SHALL 呼叫 `startBattle()` 重新初始化戰鬥
- `streak` SHALL 歸零
- `questionsAnswered` SHALL 歸零
- `monsterPool` SHALL 重新填充（怪物可跨 Chunk 重複出現）
- `pendingSkill` SHALL 清空

### Requirement: Game Mode toggle during an in-progress chunk
當使用者在分階段練習的 Chunk 進行中切換 Game Mode，系統 SHALL 有明確且可預期的初始化規則，且不得影響測驗進度。

#### Scenario: Toggle game mode ON mid-chunk
- **WHEN** 使用者在 `QuizState.mode === 'chunked'` 且 Chunk status 為 `in_progress` 時，將 Game Mode 由 OFF 切換為 ON
- **THEN** 系統 SHALL 呼叫 `startBattle()` 初始化戰鬥
- **THEN** `battleState.streak`、`battleState.questionsAnswered` SHALL 從 0 開始計算（不追溯既已作答的題目）
- **THEN** Chunk 的題目進度與作答狀態 SHALL 不受影響

#### Scenario: Toggle game mode OFF mid-chunk
- **WHEN** 使用者在 `QuizState.mode === 'chunked'` 且 Chunk status 為 `in_progress` 時，將 Game Mode 由 ON 切換為 OFF
- **THEN** 測驗流程 SHALL 不受影響
- **THEN** 戰鬥狀態的持久化規則 SHALL 維持原本設計（不寫入 practice session cloud data）

#### Scenario: Start new chunk resets battle
- **WHEN** 使用者在 Game Mode ON 的分階段練習中完成 Chunk 0 並開始 Chunk 1
- **THEN** `battleState.streak` SHALL 被重置為 0
- **THEN** `battleState.questionsAnswered` SHALL 被重置為 0
- **THEN** 新的怪物 SHALL 從完整的怪物池中選取
- **THEN** 使用者 SHALL 看到新的 Battle Arena 初始化動畫

#### Scenario: Battle state not persisted in practice session cloud data
- **WHEN** 系統保存分階段練習的 Chunk 完成狀態到雲端
- **THEN** `BattleState` SHALL NOT 被包含在 `PracticeChunk` 的持久化資料中
- **THEN** 戰鬥狀態 SHALL 僅存在於本地記憶體和 `mindspark_battle_state` localStorage key 中
