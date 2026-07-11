# audio-resource-lifecycle Specification

## Purpose
TBD - created by archiving change security-architecture-hardening-v2. Update Purpose after archive.
## Requirements
### Requirement: FocusTimer tracks and closes all AudioContext instances
`FocusTimer` 元件 SHALL 以 `useRef<AudioContext[]>` 追蹤所有透過 `playNotificationSound` 動態建立的 `AudioContext` 實例。每個新建立的 `AudioContext` SHALL 在建立後立即被 push 至 `activeAudioContextsRef.current`。當卸載該 AudioContext 的 `setTimeout`（用於正常播放 0.6s 後 close）成功執行 `ctx.close()` 後，SHALL 從 ref 陣列中移除該 ctx 引用。

當 `FocusTimer` 卸載（cleanup）時，cleanup effect SHALL 遍歷 `activeAudioContextsRef.current`，對每個 `ctx.state !== 'closed'` 的 AudioContext 呼叫 `ctx.close()`，並以 try-catch 包裹每個 close 呼叫（close 失敗僅記 `console.error`，不得拋出）。Cleanup SHALL 同時 `clearTimeout` 所有 `audioTimersRef` 中的計時器（既有行為）。

#### Scenario: AudioContext closed on normal play completion
- **WHEN** `playNotificationSound` 播放完整 0.5s 音效並於 600ms 後的 `setTimeout` 觸發
- **THEN** `audioContext.close()` SHALL 被呼叫
- **AND** 該 AudioContext SHALL 從 `activeAudioContextsRef.current` 中移除

#### Scenario: AudioContext force-closed on early unmount
- **WHEN** `playNotificationSound` 觸發後，在 600ms `setTimeout` 觸發之前 `FocusTimer` 卸載
- **THEN** cleanup 觸發 `clearTimeout` 取消待執行的 close 計時器
- **AND** cleanup SHALL 直接遍歷 `activeAudioContextsRef.current` 並對 `state !== 'closed'` 的 ctx 呼叫 `ctx.close()`
- **AND** close 呼叫 SHALL 不重複（已 closed 的 ctx 跳過）

#### Scenario: Multiple AudioContexts all closed on unmount
- **WHEN** `FocusTimer` 連續觸發 `playNotificationSound` 3 次後立即卸載
- **THEN** cleanup SHALL 對所有 3 個活躍 AudioContext 呼叫 `ctx.close()`
- **AND** 任何 close 拋出例外 SHALL 僅記錄 `console.error`，不中斷其他 close 呼叫

#### Scenario: close failure does not throw to component
- **WHEN** 某個 `ctx.close()` 拋出例外（例如 AudioContext 已被瀏覽器回收）
- **THEN** cleanup SHALL 以 try-catch 包裹該呼叫
- **AND** SHALL 記錄 `console.error('[FocusTimer] ...', err)`
- **AND** SHALL 繼續關閉剩餘的 AudioContexts
- **AND** SHALL NOT 拋出例外至 React

### Requirement: Sound effect Howl singletons are unloadable on unmount
`useSoundEffects` hook 中的 SFX 模組級 Howl 單例（被 BattleArena 實際使用之 `sfxAttackInstance`；明文排除 `bgmInstance`，因 BGM 切換頁面需反覆播放不 unload）SHALL 透過新增的 `unloadSfx()` 函數支持主動 `unload()`。`BattleArena.tsx` 在 unmount cleanup effect 中 SHALL 呼叫 `unloadSfx()` 釋放 SFX 解碼記憶體。

死導出 `playCorrectSfx` 與 `playWrongSfx`（無任何元件呼叫者，QuizCard 使用自己的 `use-sound` hook）SHALL 從 `useSoundEffects` 的回傳介面移除。此移除 SHALL 不影響 QuizCard 的音效播放路徑（其 `use-sound` 不依賴 useSoundEffects 的 hook 回傳）。

#### Scenario: BattleArena unmount triggers SFX unload
- **WHEN** `BattleArena` 元件卸載
- **THEN** cleanup SHALL 呼叫 `useSoundEffects().unloadSfx()`
- **AND** `sfxAttackInstance.unload()` SHALL 被呼叫
- **AND** `bgmInstance` SHALL NOT 被 unload（仍可被 stop 但不 unload）

#### Scenario: Dead exports removed from interface
- **WHEN** 讀取 `useSoundEffects` 的回傳介面 `UseSoundEffectsReturn`
- **THEN** 介面 SHALL NOT 包含 `playCorrectSfx` 與 `playWrongSfx`
- **AND** 全專案 grep `playCorrectSfx` 與 `playWrongSfx` 應僅出現於測試或歷史 openspec archive（非生產程式碼）

#### Scenario: BGM lifecycle unchanged
- **WHEN** `BattleArena` 卸載並呼叫 `stopBgm()`
- **THEN** `bgmInstance.stop()` SHALL 被呼叫（既有行為保留）
- **AND** `bgmInstance.unload()` SHALL NOT 被呼叫
- **AND** 後續 `BattleArena` 重新 mount 時 `playBgm()` SHALL 能正常播放（Howl 單例未被解構）

