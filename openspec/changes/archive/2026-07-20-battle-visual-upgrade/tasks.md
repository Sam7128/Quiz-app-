## 0. Type-first 與範圍鎖定

- [x] 0.1 在 `types/battleTypes.ts` 將 `'entrance'` 加入 `BattleAssetAction`、`'environment'` 加入 `BattleAssetKind`，並新增 12 值的 `BattleSoundCue` union。**驗證**：只改型別後執行 `npx tsc --noEmit`，exit code 0。
- [x] 0.2 在既有 validator 的 exhaustive kind maps 補上 `environment` 與 audio budget，使 0.1 不留下未處理 union branch。**驗證**：`npm run battle:assets` 對現有 25 個 registry entries 仍通過。
- [x] 0.3 建立本 change 的 runtime 清單：26 個 action、12 個元素 phase、9 個覆蓋既有 skill ID 的 unique image、5 個 environment image、12 個 audio cue；精確排除 `hero:victory`、`skeleton_wizard:cast`、`dragon_fire:fire-breath`、`environment-rubble`、`environment-ice-motes`、`environment-sparks`、`battle_victory.ogg`。**驗證**：清單同時出現在 `ASSET_MANIFEST.md`，且後續 registry 測試使用相同 ID 集合。

> **邊界**：完成 0.1 的型別檢查後才修改 registry/component/hook 邏輯。不得新增第二份 registry、DTO、provider 或 adapter。

## 1. 固定用途資產準備

- [x] 1.1 建立單一 `scripts/prepareBattleVisualAssets.ts`，內含以 7 個實際檔名為 key 的不匯出 readonly map：`hero-actions.png` `6×1`、`normal-monster-actions.png` `4×3`、`elite-monster-actions.png` `3×4`（欄為 orc / warrior / wizard，列為 idle / attack / hurt / defeat）、`dragon-actions.png` `6×1`、`elemental-vfx.png` `4×3`、`signature-skills.png` `3×3`、`environment-overlays.png` `4×2`。只支援 `slice` / `promote` 兩個固定命令。**驗證**：`npm run battle:prepare -- slice` 可執行；package/lockfile 無新增依賴。
- [x] 1.2 在 `slice` 使用既有 `pngjs` 驗證 PNG magic bytes、grid 可整除與四角 alpha=0，再輸出全部 lossless PNG cells。**驗證**：`npm run battle:prepare -- slice` exit code 0，七張 atlas 的宣告 cells（包含各自第一格與最後格）均輸出至 `assets-prep/battle-visual-upgrade/sliced/`。
- [x] 1.3 目視比對 `production-source-v2/*-source.png` 與同名 cleaned atlas pair，檢查 despill、裁切與 pivot；不另產每角色 overlay comparison。**驗證**：七組 source/cleaned atlas pair 保留為人工 QA 證據，不合格 cell 維持 source-only 且未進入 promote allowlist。
- [x] 1.4 在 `promote` 使用既有 Playwright Chromium Canvas 將已核准 cell 轉為透明 WebP；不使用 `npx tsx`、Sharp 或全域圖片 CLI。**驗證**：乾淨環境只靠既有 `npm install` + Playwright browser 即可產生 RIFF/WEBP 檔。
- [x] 1.5 Promote 26 個有 consumer 的 action 與 12 個 element phase；用 9 個 signature cells 覆蓋現有 9 個 basic/intermediate/advanced skill 路徑；promote fog/embers/shockwave/speed-lines/shadow。**驗證**：輸出 ID 與 0.3 清單完全一致，七個 source-only ID/file 均未輸出。
- [x] 1.6 將 `battle_victory.ogg` 移回 `assets-prep/battle-visual-upgrade/audio-source/`，其餘 12 個 cue 保留於 `public/sounds/battle/`。**驗證**：runtime sound 目錄只有 12 個 OggS 檔且均非空。

## 2. Registry 與 validator

- [x] 2.1 在同一 `BATTLE_ASSET_REGISTRY` 登錄 26 個 action entries；所有 entry 的 anchor/facing/visualScale 複製各自 idle metadata。**驗證**：`getBattleCharacterAsset` 對 required actions 不 fallback；source-only actions 不存在。
- [x] 2.2 登錄 12 個 `vfx-<element>-<phase>` entries；9 個 skill IDs 維持原 ID，只更新核准圖片。**驗證**：每個 element × phase lookup 唯一且 kind 為 `projectile` 或 `impact`。
- [x] 2.3 登錄 5 個 `environment` 與 12 個 `audio` entries；audio ID 固定為 `cue-<BattleSoundCue>`，路徑只存在 registry。**驗證**：TypeScript exhaustive maps 與 `npm run battle:assets` 通過。
- [x] 2.4 擴充 `validateBattleAssets.ts`：action metadata 一致性、character/action 路徑、environment/projectile/impact/audio bytes、OggS、`public/sounds/battle` orphan。保留既有 `public/battle` recursive orphan；不建立第二 validator。**驗證**：`npm run battle:assets` 對目前 registry、runtime 路徑與 orphan 集合執行全部規則並通過；聚焦 registry 測試覆蓋 fallback、尺寸一致性與 source-only exclusions。
- [x] 2.5 更新 `battleAssetRegistry.test.ts` 驗證精確 action/VFX/environment/audio ID 清單、fallback graph、metadata 一致性與 0.3 的七個 source-only exclusions。**驗證**：聚焦測試通過。

## 3. 角色動作消費

- [x] 3.1 在 `BattleArena.tsx` 現有 `monsterAction` mapping 加入 `boss_entrance` + `entrance` phase → `entrance`；保留既有 attack/cast/hurt/defeat mapping，不新增 action state machine。**驗證**：boss entrance 使用 `dragon_fire:entrance`。
- [x] 3.2 保留 `CharacterSprite` 現有 `<img onError>` fallback，只在同一處加入 grounding shadow；不新增 fallback manager 或 preload service。**驗證**：action URL 404/decode error 回 idle，shadow 跟隨 sprite transform。
- [x] 3.3 補 `BattleArena` regression tests：hero attack/cast/hurt/defeat、monster attack/hurt/defeat、boss entrance，以及既有 `activeEvent.payload.monsterId` 在 durable monster 已切換時仍顯示被擊敗角色。不得為 identity 新增 state 或實作分支。**驗證**：聚焦 Vitest 通過。

## 4. 技能 VFX

- [x] 4.1 在 `BattleSkillOverlay.tsx` 同檔新增局部 `SkillVfxRenderer`；直接使用 `event.phase`、`event.payload.element`、既有 registry 與 `ALL_SKILLS`。不得建立新 component file、timer、queue、JSON config 或 DTO。**驗證**：`npx tsc --noEmit` 通過。
- [x] 4.2 實作 phase mapping：anticipation=charge、travel=travel/establish、impact=element impact + unique skill image、settle=residue；basic/intermediate/advanced 只用既有 tier 調整 scale/emphasis。**驗證**：同元素三個 tier 在 impact 顯示不同 skill image。
- [x] 4.3 保留 ultimate/epic/legendary WebM path；reduced-motion 顯示名稱 + unique image 短淡入；缺 phase/skill image 時用既有 icon/CSS/Sparkles fallback。**驗證**：media error 與 reduced-motion 都能由既有 scheduler settle。
- [x] 4.4 更新 `BattleSkillOverlay.test.tsx`：四 phase、三 tier、ultimate、reduced-motion、missing media、rapid queued event。**驗證**：無第二 timer/queue，聚焦測試通過。

## 5. Environment overlays

- [x] 5.1 在 `BattleArena.tsx` 直接渲染 fog、embers、shockwave、speed-lines，全部 `pointer-events: none` 且 z-index 低於 quiz UI；不新增 `BattleEnvironmentLayer` 檔案。**驗證**：任何狀態 environment image nodes ≤ 4。
- [x] 5.2 只用既有 event.phase 控制 shockwave（attack/skill impact）與 speed-lines（boss entrance）；fog/embers 只做慢速 transform/opacity。不得新增 timer 或 visibility listener。**驗證**：離開相應 phase 後 event overlay 消失。
- [x] 5.3 reduced-motion 停用快速 environment動畫並保留 shadow；補 mobile viewport 的可讀／可點擊測試。**驗證**：題目、選項、HP 不被遮擋。

## 6. Typed battle audio

- [x] 6.1 刪除硬編碼路徑的 `SOUND_CUE_PATHS`；既有 `initSounds` 對 cue 以 ``getBattleAsset(`cue-${cue}`)`` 取得唯一 registry 路徑並初始化 12 個 Howl，不建立第二 path map/controller。**驗證**：每個 typed cue 只解析到一個已登錄 Ogg。
- [x] 6.2 將 `playBattleCue` 改接收完整 `BattlePresentationEvent`，依 design D4 table 映射 cue並以 `<eventId>:<phase>:<cue>` 去重；把 `BattleArena` 現有 active-event effect 改為在完整 event/phase 變更時呼叫它。**驗證**：整合測試證明同一 skill event 的 anticipation/impact 各只播放一次，另覆蓋 crit、shield、defeat/spawn/boss。
- [x] 6.3 只保存 `{ howl, soundId } | null` active ref；新 cue 呼叫 `previous.howl.stop(previous.soundId)` 後再播放。`BattleArena` 的既有 visibility effect 在 hidden 時呼叫同 hook 的 `stopBattleCue()`，effect cleanup/unmount 也呼叫它；不新增 listener、counter、TTL、priority queue 或 pool。**驗證**：hidden/unmount 無 active cue，boss cue 取代 hit cue。
- [x] 6.4 使用 Howler `onloaderror` / `onplayerror` console warn + no-op；不新增 telemetry service。**驗證**：missing file、constructor/play error 不阻塞 presentation 或答題。

## 7. 可執行驗證

- [x] 7.1 執行 `npm run battle:assets`。**驗證**：所有 registry entries、paths、magic、bytes、fallback、orphan 與 12 個 Ogg 通過。
- [x] 7.2 執行 `npx tsc --noEmit`、聚焦 Vitest，再執行完整 `npm test`。**驗證**：全部 exit code 0，無 `.skip/.only`。
- [x] 7.3 執行 `npm run lint` 與 `npm run build`。**驗證**：0 errors / 0 warnings；production build 通過。
- [x] 7.4 更新既有 Playwright battle asset/flow 測試：Chromium 實際 decode 所有新增 WebP、natural dimensions > 0、Canvas 四角 alpha=0。**驗證**：資產 ID 可定位失敗檔。
- [x] 7.5 使用 route abort 注入 action/VFX media error，不修改正式 registry source；驗證 idle/icon fallback、正常戰鬥流程、reduced-motion 與 mobile occlusion。**驗證**：Playwright 單一代表流程通過。
- [x] 7.6 以既有 bounded tests 組合覆蓋生命週期：`BattleSkillOverlay` rapid queue、`useBattlePresentation` hidden cancel、`useSoundEffects` latest-wins/unmount，以及 Playwright environment nodes ≤ 4 + media route abort。**驗證**：上述 Vitest/Playwright cases 通過；不宣稱不存在的固定事件數，也不建立 Long Task/FPS gate、2 小時 soak、Mobile Safari emulation或自訂 benchmark runner。

## 8. 文件與結案

- [x] 8.1 更新 `assets-prep/battle-visual-upgrade/ASSET_MANIFEST.md`：每個 cell 的 source-only/promoted 狀態與 runtime path。
- [x] 8.2 更新 `docs/BATTLE_ART_ANIMATION_UPGRADE_PLAN.md`：只把本 change 真正 promoted 的項目標為 runtime，保留未使用 pose 的 source 狀態。
- [x] 8.3 更新 `docs/DEVELOPMENT_LOG.md`；若架構、entry point 或 durable constraint 有變，更新 `MEMORY.md`。
- [x] 8.4 實作與所有 gate 完成後，將本 `tasks.md` 的完成項目標為 `[x]`；未完成項不得為結案而勾選。

> **最終完成邊界**：無新 dependency、無第二 registry/audio controller/presentation scheduler/telemetry/benchmark framework；26 個 action、9 個技能差異化、最多 4 個 arena overlay 與 12 個 cue 都有現有 event consumer，並通過 TypeScript、validator、unit、lint、build 與代表性 Chromium flow。
