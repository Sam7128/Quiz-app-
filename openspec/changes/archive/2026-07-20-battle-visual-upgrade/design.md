## Context

`battle-system-quality-overhaul` 已提供本次內容升格所需的 runtime 基礎：

- `BATTLE_ASSET_REGISTRY` 是唯一正式 media manifest，現有 25 個資產。
- `getBattleCharacterAsset(id, action)` 已先查 `<id>:<action>`，不存在時回到 idle。
- `CharacterSprite` 已處理 `<img onError>`，可回到 entry 的 `fallbackId` 或安全 placeholder。
- `useBattlePresentation` 已擁有 queue、phase timer、safety timer、hidden cancel 與 unmount cleanup；不得建立第二 scheduler。
- `BattleSkillOverlay` 是技能 media 的唯一 render/completion 路徑。
- `useSoundEffects` 是唯一 audio controller；`BattlePresentationEvent` 已包含 `phase`，payload 已包含 `isCrit`、`shieldAbsorbed`、`element` 與 `skillId`。
- 專案要求 Node >= 22，已有 `pngjs`、Playwright、Howler；沒有 `tsx`、Sharp、`cwebp`、ImageMagick 或 FFmpeg。

目前 13 個候選 `.ogg` 已存在於 `public/sounds/battle/`，但 `battle_victory.ogg` 沒有對應的 presentation event。它在本 change 中移回 `assets-prep/` 保留，不加入 runtime registry。

## Goals / Non-Goals

**Goals:**

1. 只為現有 presentation event 能消費的角色動作發布 runtime asset。
2. 以 12 張元素 phase 圖 + 9 張獨特 skill 圖，讓 9 個技能可辨識。
3. 以最多 4 個 environment image overlay 增加深度，不建立粒子系統。
4. 以既有 event + phase 精確播放 12 個 cue，且任何時刻只有一個短 SFX。
5. 以固定 atlas map、既有依賴與可重跑命令完成切圖、WebP 升格及驗證。
6. media error、reduced-motion、hidden/unmount 與快速事件仍由既有 lifecycle 安全收斂。

**Non-Goals:**

- 不發布 `hero:victory`、`skeleton_wizard:cast`、`dragon_fire:fire-breath`、`environment-rubble`、`environment-ice-motes`、`environment-sparks` 或 `battle_victory.ogg`；目前沒有 runtime event consumer。
- 不建立 Canvas/WebGL 粒子引擎、DOM particle generator、camera system 或 biome system。
- 不建立第二 asset registry、fallback manager、preload service、audio pool、priority queue、presentation scheduler 或 telemetry service。
- 不新增圖片處理 dependency 或要求全域 CLI。
- 不承諾舊版瀏覽器相容層；專案正式 runtime 已使用 WebP，本 change 不改變 browser baseline。
- 不建立通用 benchmark framework、2 小時 soak harness 或跨硬體固定 FPS gate。

## Decisions

### D1: 只發布有 consumer 的角色動作

沿用 `<characterId>:<action>` 組合鍵與現有 fallback：

| 角色 | 本次新增 runtime action |
|---|---|
| `hero` | `attack`, `cast`, `hurt`, `defeat` |
| `slime_blue`, `bat_shadow`, `goblin_green` | `attack`, `hurt`, `defeat` |
| `orc_berserker`, `skeleton_warrior`, `skeleton_wizard` | `attack`, `hurt`, `defeat` |
| `dragon_fire` | `entrance`, `attack`, `hurt`, `defeat` |

`heroAction` 已能產生 attack/cast/hurt/defeat；`monsterAction` 已能產生 attack/hurt/defeat，只需把 `boss_entrance` + `entrance` phase 映射到 `entrance`。現有 `BattleArena` 已先以 `activeEvent.payload.monsterId` 解析 `eventMonster`，再 fallback 到 durable monster；defeat identity 只需 regression test，不新增 state 或實作分支。`hero:victory`、`skeleton_wizard:cast` 與 `dragon_fire:fire-breath` 沒有事件來源，保留 source cell 即可。

### D2: 12 張元素 phase + 9 張獨特 skill 圖

不為 9 個技能複製 36 張 phase 圖。新增 12 個元素 phase entries：

```text
vfx-fire-{charge|travel|impact|residue}
vfx-ice-{charge|travel|impact|residue}
vfx-lightning-{charge|travel|impact|residue}
```

`signature-skills.png` 的 9 個 cell 覆蓋現有 9 個 skill ID 的圖片，因此不增加第二份 skill registry。`BattleSkillOverlay` 內的局部 `SkillVfxRenderer` 直接使用：

- `event.payload.element` 選元素 phase entry。
- `event.phase` 選 charge / travel-or-establish / impact / residue。
- `ALL_SKILLS.find(skill.id === skillId)` 取得 tier，不建立新的 JSON/TS config。
- impact 同時顯示現有 skill ID 的獨特圖片，確保同元素三個 tier 仍可辨識。
- ultimate/epic/legendary 保留既有 WebM + still fallback。

Renderer 是 `BattleSkillOverlay.tsx` 內的局部函式元件，沒有自己的 timer、queue 或 completion owner。

### D3: Environment 直接使用 image overlay

- grounding shadow 放在 `CharacterSprite` 的定位容器內，跟隨角色，不新增跨元件座標同步。
- fog、embers 是各一張 image；正常模式可使用慢速 `transform/opacity`，reduced-motion 下保持靜態或隱藏。
- shockwave 只在 attack/skill impact 顯示；speed lines 只在 boss entrance 顯示。
- `BattleArena` 直接渲染這 4 個 overlay，不新增 `BattleEnvironmentLayer` 檔案。
- 瀏覽器會原生節流 hidden tab 的 CSS animation；同時既有 `useBattlePresentation` 在 hidden 時取消 active event，因此不新增 visibility listener。

### D4: Phase-aware cue mapping，單一 active SFX

新增 `BattleSoundCue` 精確 union，包含 12 個實際 cue。12 個 registry entry 使用 `cue-<BattleSoundCue>` ID；`useSoundEffects` 以 ``getBattleAsset(`cue-${cue}`)`` 取得唯一正式路徑，刪除硬編碼路徑的 `SOUND_CUE_PATHS`，不建立第二 manifest。`playBattleCue(event)` 直接使用既有 event：

| event / phase | payload 條件 | cue |
|---|---|---|
| `hero_attack` / `impact` | `isCrit` | `hit_critical`，否則 `hit_basic` |
| `monster_attack` / `impact` | `shieldAbsorbed > 0` | `shield_absorb`，否則 `hit_basic` |
| `skill_cast` / `anticipation` | `element` | `<element>_cast` |
| `skill_cast` / `impact` | `element` | `<element>_impact` |
| `monster_defeat` / `defeat` | — | `monster_defeat` |
| `monster_spawn` / `spawn` | — | `monster_spawn` |
| `boss_entrance` / `entrance` | — | `boss_entrance` |

`BattleArena` 現有 active-event effect 改為依賴完整 `activeEvent`（包含 phase），每次 phase 變更呼叫 `playBattleCue(activeEvent)`；active event 清空時呼叫 `stopBattleCue()`。既有 visibility effect 在 hidden 分支同時停止 BGM 與 battle cue，其 cleanup 也停止 battle cue；不增加 listener 或 lifecycle owner。

去重鍵為 `<eventId>:<phase>:<cue>`。hook 只保存一個 `{ howl, soundId } | null` ref；播放新短 cue 前呼叫 `previous.howl.stop(previous.soundId)`，再保存新播放結果。這個 latest-wins 規則自然讓 boss entrance 取代先前 hit，且沒有計數器、TTL、pool abstraction 或永久鎖死狀態。

Howler 的 `onloaderror` / `onplayerror` 僅 `console.warn` + no-op。專案沒有既有 telemetry sink，本 change 不建立一個。

### D5: 一支固定用途資產準備腳本

`scripts/prepareBattleVisualAssets.ts` 只處理這 7 張已知 atlas，使用一個不匯出的 readonly literal map：

| atlas | columns × rows | row-major 內容 |
|---|---:|---|
| `hero-actions.png` | `6 × 1` | idle, attack, cast, hurt, victory, defeat |
| `normal-monster-actions.png` | `4 × 3` | 每列 slime / bat / goblin；每欄 idle, attack, hurt, defeat |
| `elite-monster-actions.png` | `3 × 4` | 每欄 orc / warrior / wizard；每列 idle, attack, hurt, defeat |
| `dragon-actions.png` | `6 × 1` | entrance, idle, attack, fire-breath, hurt, defeat |
| `elemental-vfx.png` | `4 × 3` | 每列 fire / ice / lightning；每欄 charge, travel, impact, residue |
| `signature-skills.png` | `3 × 3` | 每列 fire / ice / lightning；每欄 basic, intermediate, advanced |
| `environment-overlays.png` | `4 × 2` | fog, embers, rubble, shockwave / ice-motes, sparks, speed-lines, shadow |

腳本只提供 `slice` 與 `promote` 兩個固定命令：

- `slice`：用既有 `pngjs` 驗證 PNG、四角 alpha、可整除 grid，輸出無損 PNG cell 供人工修邊／pivot QA。
- `promote`：用既有 Playwright Chromium Canvas 將已核准 cell 轉為透明 WebP，僅複製 D1–D3 列出的 runtime consumer assets；精確排除 `hero:victory`、`skeleton_wizard:cast`、`dragon_fire:fire-breath`、`environment-rubble`、`environment-ice-motes` 與 `environment-sparks`。

執行方式統一為 `node --experimental-strip-types ...`，不使用 `npx tsx`。Master PNG 永遠留在 `assets-prep/`。

### D6: 使用瀏覽器原生載入與既有 fallback

不新增 action preloader 或 timeout wrapper。原生 `<img>` 依需求載入，`CharacterSprite` 在 decode/HTTP 失敗時沿用既有 `onError` fallback；技能／environment 圖失敗時只隱藏該裝飾並保留文字、icon 或既有 CSS fallback。既有 next-monster idle preload 不擴充成 service。

### D7: 驗證責任分開但不建框架

- `validateBattleAssets.ts`：registry existence、magic bytes、bytes、路徑、action metadata 一致性、fallback、orphan，以及 `public/sounds/battle` 的 OggS/bytes。
- Playwright：瀏覽器實際 decode、natural dimensions、透明角落、action/phase 切換、missing-media fallback、mobile/reduced-motion/hidden 行為。
- 單元測試：cue mapping/dedupe/latest-wins、registry lookup、現有 presentation queue/safety deadline。

不嘗試以 Node validator 重做完整 WebP pixel decoder，也不建立 CDP benchmark runner。

## Risks / Trade-offs

| 風險 | 最小緩解 |
|---|---|
| source cell 有比例漂移或 despill | source/cleaned atlas pair 比對 + 人工 gate；不合格 cell 不 promote |
| 共用元素 phase 使同元素技能相似 | impact 疊加 9 張獨特 skill 圖；browser screenshot gate |
| action asset 首次顯示稍有延遲 | 瀏覽器保留既有 image 直到新 source decode；失敗走現有 fallback，不新增 preload service |
| WebP 編碼依賴 Chromium | Playwright 已是既有 E2E dependency；乾淨 checkout 使用同一 browser toolchain |
| 新音效中斷前一 cue | 這是刻意的 bounded policy，優先保證不堆疊、不鎖死與答題清晰度 |
| fog/embers 影響低階裝置 | 只有兩個 image layer；reduced-motion 關閉動態，無 DOM particle generator |

## Migration / Rollback

不修改 BattleState 或 localStorage schema。部署順序：

1. 先更新 `types/battleTypes.ts` 並執行 `npx tsc --noEmit`。
2. 切片、人工 QA、promote；尚未登錄的檔案不進 runtime。
3. 更新同一 registry、validator 與測試。
4. 更新 BattleArena、BattleSkillOverlay、useSoundEffects。
5. 執行單元、asset validation、build 與一組 Playwright battle flow。

回滾只需移除新增 registry entries／component 分支並還原 9 個 skill icon 檔；既有 idle、CSS/icon fallback、WebM 與 presenter 不受影響。

## Explicitly Rejected During Review

- 新 telemetry service：無既有 sink，也不是本 change 的產品需求。
- WebP feature-detection framework：正式 runtime 已使用 WebP，沒有新增 browser baseline。
- preload timeout / dynamic import recovery：本設計沒有 dynamic import，原生 image + onError 已涵蓋失敗。
- VFX JSON config、effect DTO、provider、adapter：`ALL_SKILLS`、event payload 與 registry 已是唯一資料來源。
- voice counter + TTL、priority queue：單一 active cue 的 `stop → play` 更短且不會洩漏。
- 2 小時 soak、Mobile Safari emulation、audio-to-ear latency、固定 60 FPS／Long Task 閾值：不可由目前 CI 穩定驗證，改用可重現的 bounded lifecycle smoke。
