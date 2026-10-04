## MODIFIED Requirements

### Requirement: Sound effect Howl singletons are unloadable on unmount
`useSoundEffects` hook 中的 SFX 模組級 Howl 單例（被 BattleArena 與做題卡實際使用；明文排除 `bgmInstance`，因 BGM 切換頁面需反覆播放不 unload）SHALL 支援安全存取與資源生命週期管理。`BattleArena.tsx` 在 unmount cleanup effect 中 SHALL 呼叫 `stopBattleCue()` 停止進行中音效。

`QuizCard` SHALL 統一接入 `useSoundEffects` 管線，廢除孤立之 `use-sound` 依賴。全專案音效音訊播放一律收斂至 Howler.js 單例控制。

#### Scenario: BattleArena unmount triggers cue stop
- **WHEN** `BattleArena` 元件卸載
- **THEN** cleanup SHALL 呼叫 `useSoundEffects().stopBattleCue()`
- **AND** 進行中的短音效 Howl 實例 SHALL 被立即停止
- **AND** `bgmInstance` SHALL NOT 被 unload（仍可被 stop 但不 unload）

#### Scenario: Dead exports removed from interface
- **WHEN** 讀取 `useSoundEffects` 的回傳介面 `UseSoundEffectsReturn`
- **THEN** 介面 SHALL 提供受 `isSfxEnabled` 守衛的 `playCorrect` 與 `playWrong` 函式（或等價之 cue 呼叫介面）
- **AND** 不得存在未被消費之孤兒介面

#### Scenario: BGM lifecycle unchanged
- **WHEN** `BattleArena` 卸載並呼叫 `stopBgm()`
- **THEN** `bgmInstance.stop()` SHALL 被呼叫（既有行為保留）
- **AND** `bgmInstance.unload()` SHALL NOT 被呼叫
- **AND** 後續 `BattleArena` 重新 mount 時 `playBgm()` SHALL 能正常播放（Howl 單例未被解構）

## ADDED Requirements

### Requirement: Unified Quiz Audio Effects and Global Mute Control
`QuizCard.tsx` SHALL 透過 `useSoundEffects` 播放答對與答錯音效，並受控於全域設定 `STORAGE_KEYS.SFX_ENABLED`。當使用者在設定中關閉音效（`isSfxEnabled === false`）時，答對與答錯音效播放 SHALL 保持靜音（no-op）。

#### Scenario: Answer correct plays correct sound when SFX enabled
- **WHEN** 使用者提交正確答案
- **AND** `isSfxEnabled` 為 `true`
- **THEN** 系統 SHALL 透過 Howler 播放答對提示音 `/sounds/correct.mp3`

#### Scenario: Answer wrong plays wrong sound when SFX enabled
- **WHEN** 使用者提交錯誤答案
- **AND** `isSfxEnabled` 為 `true`
- **THEN** 系統 SHALL 透過 Howler 播放答錯提示音 `/sounds/wrong.mp3`

#### Scenario: Answer feedback is silent when SFX disabled
- **WHEN** 使用者提交答案（正確或錯誤）
- **AND** `isSfxEnabled` 為 `false`（使用者在設定中關閉 SFX）
- **THEN** 系統 SHALL NOT 播放任何音效
- **AND** 測驗流程與 UI 回饋（綠/紅字、解析顯示）SHALL 正常運作

### Requirement: Elimination of use-sound dependency
系統與專案依賴 SHALL 徹底拔除 `use-sound` 套件。所有做題與戰鬥音效測試 SHALL 改以 Howler 或 `useSoundEffects` 模擬，不得存在 `use-sound` 之任何執行期或測試期參照。

#### Scenario: use-sound removed from package manifest
- **WHEN** 檢查 `package.json` 中的 `dependencies` 與 `devDependencies`
- **THEN** `use-sound` SHALL 不存在於清單中

#### Scenario: Tests updated to mock Howler or useSoundEffects
- **WHEN** 執行 `npm test`
- **THEN** 所有測驗卡片與切題測試（包含 `autoAdvance.test.tsx` 與 `remediateBypass.challenger.test.ts`）SHALL NOT 引用或 mock `use-sound`
- **AND** 所有音效測試 SHALL 100% 綠燈通過
