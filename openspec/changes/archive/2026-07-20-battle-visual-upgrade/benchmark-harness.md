# Minimal Verification Harness: battle-visual-upgrade

> 本文件不是可擴充 benchmark framework；它只把本 change 的 requirement scenarios 對應到既有命令與一個 bounded browser smoke。

## 1. Existing tools only

| 工作 | 既有能力 | 禁止新增 |
|---|---|---|
| PNG grid / alpha | Node 22 + `pngjs` | `tsx`, Sharp, ImageMagick, FFmpeg |
| WebP encode / decode / alpha | 既有 Playwright Chromium + Canvas | 自製 WebP decoder |
| Audio lifecycle | 既有 Howler | 第二 audio pool/controller |
| Animation lifecycle | 既有 `useBattlePresentation` | 第二 scheduler/timer queue |

## 2. Requirement-linked checks

| Requirement | Executable check | Pass condition |
|---|---|---|
| Fixed seven-atlas map | `npm run battle:prepare -- slice` | 7 個 grid 可整除，且每張 atlas 的 first/last declared cell 均輸出 |
| Runtime asset integrity | `npm run battle:assets` | registry、path、magic、bytes、metadata、fallback、orphan、12 Ogg 全通過 |
| Browser decode / alpha | existing Playwright battle asset spec | 所有新增 WebP decode；natural dimensions > 0；四角 alpha=0 |
| Character action / fallback | BattleArena Vitest + one routed 404 | required action 不用 idle；404/decode error 回既有 fallback |
| Skill phase / reduced motion | BattleSkillOverlay Vitest | phase mapping、unique impact、ultimate、reduced-motion、missing asset 全通過 |
| Cue mapping / no lock | useSoundEffects Vitest + BattleArena integration | registry-only path；cast/impact phase flow；crit/shield；dedupe；`{howl,soundId}` stop→play；hidden/unmount；missing Ogg |
| Environment ceiling / occlusion | one Playwright battle flow | arena environment images ≤ 4；mobile quiz UI 可讀可點；reduced-motion 無快速動畫 |

## 3. Bounded lifecycle evidence

不建立自訂事件產生器；使用現有可執行測試組合提供 bounded 證據：

- `BattleSkillOverlay` Vitest 覆蓋 rapid queued event 與 media fallback。
- `useBattlePresentation` Vitest 覆蓋 hidden cancel-to-settle。
- `useSoundEffects` Vitest 覆蓋 latest-wins、explicit stop 與 unmount cleanup。
- Playwright battle flow 驗證 active environment image nodes ≤ 4，並以 route abort 驗證 media error 不阻塞流程。

## 4. Deliberately omitted

- 2 小時 soak、heap snapshot 報表 schema。
- 「Playwright Mobile Safari」宣稱；device emulation 不等於 Safari engine。
- audio play-to-ear latency；headless CI 無法量測實際聽覺輸出。
- 固定 60 FPS / CPU 百分比跨硬體 gate。
- 未由 requirement 支持且容易受 CI 噪音影響的 Long Task 閾值。
- generic runner、adapter、plugin、telemetry backend。

如未來有第二套素材包或真實 production performance regression，再從實際數據新增專用 gate；本 change 不預建接口。
