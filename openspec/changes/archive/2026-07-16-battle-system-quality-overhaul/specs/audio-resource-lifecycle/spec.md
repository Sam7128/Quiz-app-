## MODIFIED Requirements

### Requirement: Sound effect Howl singletons are unloadable on unmount
`useSoundEffects` 的模組級 Howl 實例 SHALL 在同一頁面生命週期內由所有 hook consumer 共用。`BattleArena` 卸載 SHALL 停止自身 BGM／active playback，但 SHALL NOT unload 共享 SFX 或 BGM。SFX cue SHALL 由具名 battle event 與已核准的本地素材映射；沒有已核准素材的 cue SHALL 安全 no-op。Howler 初始化或播放失敗 SHALL NOT 阻塞戰鬥或測驗。

#### Scenario: BattleArena unmount preserves shared SFX
- **WHEN** `BattleArena` 卸載而其他 consumer 仍可能使用 `useSoundEffects`
- **THEN** cleanup SHALL 呼叫 `stopBgm()`
- **AND** SHALL NOT 呼叫共享 Howl 的 `unload()`
- **AND** 後續 consumer SHALL 可重用相同共享實例

#### Scenario: Approved fire skill cue is correlated and deduplicated
- **WHEN** `skill_cast` event 的 element 為 `fire` 且 registry 有已核准本地 cue
- **THEN** controller SHALL 播放該 fire mapping
- **AND** 同一 event ID 與 cue SHALL 至多播放一次

#### Scenario: Missing or failed audio remains a no-op
- **WHEN** event 沒有已核准本地 cue，或 Howler 初始化／播放失敗
- **THEN** controller SHALL 安全 no-op 或只記錄 warning
- **AND** 戰鬥 presentation 與測驗流程 SHALL 繼續

#### Scenario: Dead exports remain absent
- **WHEN** 讀取 `useSoundEffects` 的回傳介面
- **THEN** 介面 SHALL NOT 包含 `playCorrectSfx`、`playWrongSfx`、`playAttackSfx` 或 `unloadSfx`
