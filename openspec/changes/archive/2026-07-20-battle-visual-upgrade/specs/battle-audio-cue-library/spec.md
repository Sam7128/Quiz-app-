## ADDED Requirements

### Requirement: Twelve cues with current consumers
系統 SHALL 提供 12 個有既有 presentation event consumer 的 cue：`hit_basic`、`hit_critical`、`shield_absorb`、`monster_defeat`、`monster_spawn`、`boss_entrance`，以及 fire / ice / lightning 的 cast + impact。`battle_victory` SHALL 保留於 source 區而不進 runtime registry，直到存在 victory event。

#### Scenario: Critical hit cue
- **WHEN** `hero_attack` event 進入 impact 且 `isCrit === true`
- **THEN** 播放 `hit_critical.ogg`

#### Scenario: Shield cue
- **WHEN** `monster_attack` event 進入 impact 且 `shieldAbsorbed > 0`
- **THEN** 播放 `shield_absorb.ogg`

#### Scenario: Element cast and impact cues
- **WHEN** fire `skill_cast` event 進入 anticipation
- **THEN** 播放 `skill_fire_cast.ogg`
- **AND WHEN** 同 event 進入 impact
- **THEN** 播放 `skill_fire_impact.ogg`

### Requirement: Typed mapping through the only registry and controller
cue ID SHALL 使用 `BattleSoundCue` union，正式 registry ID SHALL 為 `cue-<BattleSoundCue>`。`useSoundEffects` SHALL 以既有 `getBattleAsset` 取得路徑並刪除硬編碼路徑的 `SOUND_CUE_PATHS`；cue 只由既有 `playBattleCue(event)` 播放。mapping SHALL 直接讀取 `BattlePresentationEvent.kind`、`phase` 與既有 payload；SHALL NOT 建立第二 manifest、audio controller 或 audio choreography state machine。

#### Scenario: Unsupported event phase is a no-op
- **WHEN** event / phase 沒有對應 cue
- **THEN** `playBattleCue` 不播放且不改變戰鬥流程

### Requirement: Event-phase deduplicate
`BattleArena` 既有 active-event effect SHALL 在完整 `activeEvent`（包含 phase）變更時呼叫 `playBattleCue(event)`。相同 `<eventId>:<phase>:<cue>` SHALL 只播放一次，避免 React re-render 重播；同 event 的合法 cast 與 impact cue SHALL 各播放一次。

#### Scenario: Duplicate impact render
- **WHEN** 相同 impact phase 被 render 兩次
- **THEN** 第二次 cue 呼叫為 no-op

### Requirement: Single active short cue
同一時間 SHALL 最多有一個 battle short SFX。hook SHALL 只保存 `{ howl, soundId } | null`；播放新 cue 前 SHALL 呼叫 `previous.howl.stop(previous.soundId)`，再播放新 cue。SHALL NOT 使用 active counter、TTL、priority queue 或自訂 pool。

#### Scenario: Boss entrance replaces hit
- **WHEN** hit cue 尚在播放且 boss entrance cue 到達
- **THEN** hit 被停止
- **AND** boss entrance 立即成為唯一 active short cue

#### Scenario: Hidden or unmount stops active cue
- **WHEN** battle page hidden 或 BattleArena unmount
- **THEN** `BattleArena` 既有 visibility effect／cleanup 呼叫同一 `stopBattleCue()`，active short cue 被停止
- **AND** 回到頁面後沒有洩漏的 slot/counter 狀態

### Requirement: Missing audio fails soft
constructor、load、play 或 autoplay 失敗 SHALL `console.warn` + no-op，不得中斷答題。專案沒有既有 telemetry sink，本 requirement SHALL NOT 新增 telemetry service。

#### Scenario: Missing Ogg
- **WHEN** cue 路徑無法載入
- **THEN** 記錄 warning
- **AND** presentation event 仍由既有 scheduler 正常完成
