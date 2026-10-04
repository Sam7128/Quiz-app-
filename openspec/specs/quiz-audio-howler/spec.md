# Spec: Quiz Audio Through Howler

## ADDED Requirements

### Requirement: Unified quiz feedback audio

QuizCard 答對與答錯提示音 MUST 透過既有 `useSoundEffects` Hook 的 Howler implementation 播放，並使用同一個 `STORAGE_KEYS.SFX_ENABLED` 設定。

#### Scenario: Play correct feedback
- **WHEN** QuizCard 完成一次正確作答
- **THEN** it SHALL call the Howler-backed quiz feedback consumer with `correct`
- **AND** the sound SHALL be suppressed when the global SFX setting is disabled

#### Scenario: Play wrong feedback
- **WHEN** QuizCard 完成一次錯誤作答
- **THEN** it SHALL call the Howler-backed quiz feedback consumer with `wrong`
- **AND** the sound SHALL be suppressed when the global SFX setting is disabled

### Requirement: Remove the legacy audio dependency

正式 source、tests、package manifest 與 lockfile MUST NOT import、mock 或列出 `use-sound`。

#### Scenario: Search for legacy audio usage
- **WHEN** the repository is searched for `use-sound`
- **THEN** zero source, test, manifest or lockfile matches SHALL remain
- **AND** existing Howler battle audio tests SHALL continue to pass

### Requirement: Audio failure is non-blocking

Quiz feedback audio initialization, loading or playback failure MUST be isolated from answer submission and MUST not throw into React.

#### Scenario: Howler playback fails
- **WHEN** a quiz cue cannot load or play
- **THEN** the Hook SHALL warn and return without throwing
- **AND** answer state, score and navigation SHALL still complete normally

#### Scenario: Quiz audio consumer unmounts
- **WHEN** QuizCard or its sound Hook unmounts
- **THEN** quiz feedback instances created by that Hook SHALL stop any active playback (`stop()`)
- **AND** the decoded audio buffer SHALL remain resident as a module-level singleton to avoid audio decode latency on subsequent questions
- **AND** no pending audio listener or timer SHALL remain attached
