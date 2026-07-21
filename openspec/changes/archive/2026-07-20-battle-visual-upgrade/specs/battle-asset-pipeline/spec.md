## ADDED Requirements

### Requirement: Fixed seven-atlas source map
資產準備腳本 SHALL 只處理本 change 的 7 張已知 atlas，並以單一 readonly literal map 使用實際檔名：`hero-actions.png` `6×1`、`normal-monster-actions.png` `4×3`、`elite-monster-actions.png` `3×4`（欄依序為 orc / warrior / wizard，列依序為 idle / attack / hurt / defeat）、`dragon-actions.png` `6×1`、`elemental-vfx.png` `4×3`、`signature-skills.png` `3×3`、`environment-overlays.png` `4×2`。系統 SHALL NOT 建立 alias、自動推斷 grid 或提供 plugin/adapter 介面。

#### Scenario: Every atlas uses its declared grid
- **WHEN** 執行 `prepareBattleVisualAssets.ts slice`
- **THEN** 每張來源圖的 width/height 可被其 columns/rows 整除
- **AND** 第一格與最後合法格均可輸出

#### Scenario: Invalid grid fails before writes
- **WHEN** 任一來源圖尺寸無法被宣告 grid 整除
- **THEN** 腳本以非零 exit code 結束
- **AND** 不寫入該 atlas 的任何 cell

### Requirement: Existing-toolchain promotion flow
source atlas SHALL 經 slice → manual clean/pivot review → promote 流程升格。腳本 SHALL 以 Node 22 `--experimental-strip-types` 執行，使用既有 `pngjs` 與 Playwright Chromium Canvas；SHALL NOT 要求 `tsx`、Sharp、ImageMagick、FFmpeg 或未宣告的全域 CLI。

#### Scenario: Slice to lossless review cells
- **WHEN** 執行 slice 命令
- **THEN** `pngjs` 產出透明 PNG cells 到 `assets-prep/battle-visual-upgrade/sliced/`
- **AND** 檢查來源 PNG magic bytes 與四角 alpha 為 0

#### Scenario: Promote approved runtime cells
- **WHEN** 已核准 cell 執行 promote 命令
- **THEN** Playwright Chromium Canvas 輸出透明 WebP 到既定 `public/` 路徑
- **AND** `hero:victory`、`skeleton_wizard:cast`、`dragon_fire:fire-breath`、`environment-rubble`、`environment-ice-motes`、`environment-sparks` 與 `battle_victory.ogg` 不被發布

### Requirement: Extended registry validator
`scripts/validateBattleAssets.ts` SHALL 驗證新增資產的存在性、magic bytes、bytes、fallback、orphan、路徑格式，以及同角色 action 的 anchor / facing / visualScale 一致性。`public/sounds/battle/` SHALL 納入同一 validator 的 OggS、bytes 與 orphan 檢查。

#### Scenario: Character metadata mismatch
- **WHEN** `hero:attack` 的 anchor / facing / visualScale 與 `hero` idle 不一致
- **THEN** validator 以非零 exit code 報告 consistency 錯誤

#### Scenario: Battle sound is invalid
- **WHEN** registry 中的 `.ogg` 檔不存在、為空或無 OggS header
- **THEN** validator 以非零 exit code 報告 audio 格式錯誤

### Requirement: Bytes budgets
approved 資產 SHALL 遵守：character / projectile / impact / environment ≤ 250KB、skillIcon ≤ 120KB、background ≤ 700KB、audio cue ≤ 500KB。首屏必要資產（hero idle + current monster idle + dungeon background）總和 SHALL ≤ 1.5MB；action/VFX/audio 不列入首屏。

#### Scenario: Oversized environment image
- **WHEN** approved `environment-fog` 大於 250KB
- **THEN** validator 報告 budget 超標

#### Scenario: Critical first-screen budget
- **WHEN** validator 計算 hero + slime_blue + dungeon-background
- **THEN** 總 bytes 不超過 1.5MB

### Requirement: Browser decode and alpha gate
Playwright asset test SHALL 以瀏覽器實際 decode 所有新增 WebP，檢查 natural dimensions > 0，並以 Canvas 驗證四角 alpha 為 0。Node validator SHALL NOT 重做通用 WebP pixel decoder。

#### Scenario: WebP cannot decode
- **WHEN** Chromium 無法 decode 任一新增 WebP
- **THEN** Playwright 測試失敗並列出 registry asset ID
