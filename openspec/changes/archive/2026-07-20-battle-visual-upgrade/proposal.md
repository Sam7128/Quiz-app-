## Why

`battle-system-quality-overhaul` 已完成戰鬥引擎、presentation queue、持久化與單一 asset registry，但正式內容仍只有角色 idle 圖、共用攻擊 cue，以及以靜態 icon 為主的技能演出。角色在 attack / hurt / defeat 事件仍大量 fallback 到 idle，9 個一般／中階／高階技能缺少可辨識的動態差異，戰場與聲音回饋也偏薄弱。

本輪已有 `production-source-v2` 美術來源包與 13 個 `.ogg` 候選音效。計畫只升格目前事件模型可實際消費的內容；沒有 runtime consumer 的 `hero:victory`、`skeleton_wizard:cast`、`dragon_fire:fire-breath`、三個未採用 environment cells 與 `battle_victory.ogg` 保留在 `assets-prep/`，不先擴充正式介面。

## What Changes

- **角色動作資產**：勇者新增 attack / cast / hurt / defeat；7 隻怪物新增 attack / hurt / defeat；火龍 Boss 額外新增 entrance。沿用 `<characterId>:<action>` 查詢與既有 idle / `<img onError>` fallback。
- **技能 VFX 差異化**：火／冰／雷各共用 charge / travel / impact / residue 四張 phase 素材，並在 impact 疊加 9 張既有 skill ID 對應的獨特關鍵幀，使 9 個技能可辨識而不建立 36 份重複 phase 資產。3 個 ultimate 繼續使用既有 WebM。
- **環境層次**：shadow 放在既有 `CharacterSprite` 內；fog、embers、shockwave、speed lines 直接由 `BattleArena` 渲染為最多 4 個 image overlay。不存在 DOM particle generator、第二 timer 或第二 scheduler。
- **12 個有 consumer 的音效 cue**：接入 hit / crit / shield / defeat / spawn / boss entrance 與火／冰／雷 cast + impact。`BattleArena` 既有 active-event effect 在每次 phase 變更時把完整 event 交給 `useSoundEffects`；每次新短音效停止上一個短音效，避免自訂 voice counter、priority queue 與背景休眠鎖死。
- **固定用途資產準備與驗證**：以 Node 22 原生 TypeScript strip、既有 `pngjs` 與 Playwright/Chromium Canvas 處理 7 張已知 atlas；不新增 `tsx`、Sharp、ImageMagick、FFmpeg 或通用 asset-pipeline framework。
- **型別與 registry 擴充**：`BattleAssetAction` 增加 `entrance`、`BattleAssetKind` 增加 `environment`、新增精確的 `BattleSoundCue` union；所有 runtime media 繼續使用既有 `BATTLE_ASSET_REGISTRY`。

## Capabilities

### New Capabilities
- `battle-character-actions`: 有 runtime event consumer 的角色動作、fallback、anchor 與 defeat/spawn identity ordering
- `battle-skill-vfx-library`: 3 組元素 phase 素材 + 9 張獨特技能關鍵幀、tier scale、reduced-motion
- `battle-environment-presentation`: 最多 4 個 image overlay、角色 shadow、mobile occlusion 與 reduced-motion
- `battle-audio-cue-library`: 12 個 typed cue、event/phase dedupe、單一 active SFX、failure no-op
- `battle-asset-pipeline`: 7 張固定 atlas map、一次性 slice/promote、registry/bytes/decode gate

### Modified Capabilities
- `battle-mode`: `BattleAssetAction` 支援 `entrance`；`BattleAssetKind` 支援 `environment`；`CharacterSprite` 消費有實體事件來源的 action assets
- `skill-effects-engine`: `BattleSkillOverlay` 直接依既有 presentation phase 顯示 element phase + unique skill image

## Impact

- **Types**: `types/battleTypes.ts`
- **Constants**: `constants/battleAssetRegistry.ts`、既有 `constants/skillsData.ts`（僅重用 `ALL_SKILLS`，不新增第二份 skill config）
- **Components**: `components/BattleArena.tsx`、`components/BattleSkillOverlay.tsx`
- **Hooks**: `hooks/useSoundEffects.ts`；`hooks/useBattlePresentation.ts` 不建立替代品
- **Scripts**: 一支固定用途的 `scripts/prepareBattleVisualAssets.ts`；擴充既有 `scripts/validateBattleAssets.ts`
- **Assets**: `public/battle/characters/`、`public/battle/vfx/`、`public/battle/environment/`、`public/sounds/battle/`
- **Tests**: 聚焦 registry、BattleArena、BattleSkillOverlay、useSoundEffects 與既有 Playwright battle flow
- **Dependencies**: 不新增外部依賴、audio controller、animation queue、asset registry、telemetry service 或 benchmark framework
