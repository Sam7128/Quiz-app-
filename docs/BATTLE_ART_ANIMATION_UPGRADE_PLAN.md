# 戰鬥美術、動畫、特效與音效全面升級計畫

> 文件版本：v1.0  
> 建立日期：2026-07-16  
> 適用專案：MindSpark Quiz App  
> 建議未來 OpenSpec change：`battle-content-production-overhaul`  
> 本文件性質：內容製作與接入計畫；不是「已接入正式 runtime」的聲明

## 1. 結論先行

目前的戰鬥程式架構、事件生命週期、持久化、資產登錄表與既有 runtime 素材品質門檻已完成升級，但「全角色逐動作動畫、每個技能的獨特完整演出、環境分層動態、完整音效組」尚未全部製作並接入。

本輪已額外準備一組 `production-source-v2` 美術來源包，補齊未來最重要的視覺生產起點：

- 勇者 6 種動作來源稿。
- 史萊姆、蝙蝠、哥布林各 4 種動作來源稿。
- 獸人、骷髏戰士、骷髏法師各 4 種動作來源稿。
- 火龍 Boss 6 種動作來源稿。
- 火、冰、雷各 4 階段的通用 VFX 來源稿。
- 9 個既有技能的招牌關鍵幀來源稿。
- 8 類環境覆蓋層來源稿。

這些圖片已完成色鍵去背並保存透明 PNG，但仍屬「可切片、可補幀、可交給動畫師或後續 AI 流程使用的來源稿」。在完成本文的切圖、動作一致性、尺寸、效能與瀏覽器驗收前，不得加入 `constants/battleAssetRegistry.ts` 或覆蓋 `public/battle/` 正式資產。

## 2. 已完成與尚未完成的邊界

### 2.1 已完成

- `constants/battleAssetRegistry.ts` 是唯一正式 runtime media manifest。
- `BattleArena` 只消費 active presentation event。
- `BattleSkillOverlay` 是目前唯一技能覆蓋層與 media completion 路徑。
- 目前 25 個正式 runtime assets 已通過存在性、格式、fallback 與 bytes 驗證。
- 既有角色及怪物都有可用的 idle 圖。
- 9 個一般／中階／高階技能已有圖示或 projectile 圖。
- 3 個大招已有 WebM。
- BGM 與共用攻擊 cue 可用，缺少 cue 時會安全 no-op。
- 10 張前期概念板已定義統一的高清像素 JRPG 方向。
- 本輪新增 7 張透明 production-source atlas，並保留 7 張原始色鍵圖。

### 2.2 尚未完成

- 正式角色 sprite 仍多數只有 idle，缺少逐角色 `attack`、`cast`、`hurt`、`defeat`、`victory`、`entrance` 動作資產。
- 新來源稿尚未拆成獨立 frame／cell，也尚未建立 animation metadata。
- 目前角色動作 fallback 仍會回到 idle；這是安全降級，不是完整動畫。
- 9 個技能尚未各自具備完整的 charge → travel → impact → residue 動畫序列。
- 只有 3 個大招有 WebM；其餘技能主要依 CSS、圖示與共用效果演出。
- 環境尚未形成可分別開關、可降級的 fog／ember／rubble／shadow 等正式 layer。
- 音效仍以共用攻擊 cue 為主，尚無完整的命中、暴擊、護盾、生成、倒下、Boss 登場及元素專屬聲音組。
- 尚未建立多場景或多 biome 背景輪替；目前仍以 dungeon 背景為主。
- 尚未完成全裝置的 frame pacing、GPU fill-rate 與低階行動裝置壓力驗證。

## 3. 本輪新增的美術來源包

位置：`assets-prep/battle-visual-upgrade/production-source-v2/`

| 最終透明檔 | 原始色鍵檔 | 尺寸 | 最終大小 | 內容 | 狀態 |
|---|---|---:|---:|---|---|
| `hero-actions.png` | `hero-actions-source.png` | 1920×819 | 707,533 B | idle、attack、cast、hurt、victory、defeat | 已生成／待切圖與補幀 |
| `normal-monster-actions.png` | `normal-monster-actions-source.png` | 1448×1086 | 923,364 B | slime、bat、goblin，各 4 動作 | 已生成／待切圖與補幀 |
| `elite-monster-actions.png` | `elite-monster-actions-source.png` | 1086×1448 | 1,144,329 B | orc、skeleton warrior、skeleton wizard，各 4 動作 | 已生成／待切圖與補幀 |
| `dragon-actions.png` | `dragon-actions-source.png` | 2172×724 | 1,119,511 B | entrance、idle、attack、fire breath、hurt、defeat | 已生成／待切圖與補幀 |
| `elemental-vfx.png` | `elemental-vfx-source.png` | 1536×1024 | 1,474,232 B | 火／冰／雷 charge、travel、impact、residue | 已生成／待切圖與動畫化 |
| `signature-skills.png` | `signature-skills-source.png` | 1254×1254 | 1,667,935 B | 9 技能招牌關鍵幀 | 已生成／待切圖與差異化動畫 |
| `environment-overlays.png` | `environment-overlays-source.png` | 1536×1024 | 511,396 B | fog、embers、rubble、shockwave、ice motes、sparks、speed lines、shadow | 已生成／待切圖與透明度 QA |

### 3.1 已執行的來源包 QA

- 最終檔案皆為 `Format32bppArgb`。
- 四個角落 alpha 均為 0。
- 已目視檢查角色身份、格位分隔、元素語言與透明背景。
- 原始色鍵圖保留，未刪除，方便日後以不同 threshold 重新去背。
- 未覆蓋任何既有 `public/battle/` 正式資產。
- 未修改 runtime registry，因此不會意外增加首屏下載量。

### 3.2 已知限制

- 生成圖不是傳統逐幀 sprite animation；每個 cell 是關鍵姿勢，而非可直接播放的完整幀序列。
- 細小粒子與半透明光暈經色鍵去背後，仍可能需要人工 despill／matte 修邊。
- 不同姿勢可能有少量比例、裝備位置或像素密度漂移，必須在切圖後做 overlay comparison。
- VFX atlas 的發光邊緣需在實際 dungeon 背景上再次檢查，不應只在黑底或透明檢視器判斷。
- `signature-skills.png` 提供視覺身份，不等於 9 段成品動畫。

## 4. 角色與怪物資產矩陣

圖例：`R`＝目前正式 runtime、`S`＝已有 production source、`P`＝仍需製作正式動畫。

| 角色 | idle | attack | cast | hurt | defeat | victory | entrance |
|---|---:|---:|---:|---:|---:|---:|---:|
| `hero` | R | S/P | S/P | S/P | S/P | S/P | 不需要 |
| `slime_blue` | R | S/P | 不需要 | S/P | S/P | 不需要 | 不需要 |
| `bat_shadow` | R | S/P | 不需要 | S/P | S/P | 不需要 | 不需要 |
| `goblin_green` | R | S/P | 不需要 | S/P | S/P | 不需要 | 不需要 |
| `skeleton_warrior` | R | S/P | 不需要 | S/P | S/P | 不需要 | 可選 |
| `orc_berserker` | R | S/P | 不需要 | S/P | S/P | 不需要 | 可選 |
| `skeleton_wizard` | R | S/P | S/P | S/P | S/P | 不需要 | S/P |
| `dragon_fire` | R | S/P | S/P | S/P | S/P | 不需要 | S/P |

### 建議的最小正式動作集合

- 勇者：idle、attack、cast、hurt、victory、defeat。
- 一般怪物：idle、attack、hurt、defeat。
- 菁英：idle、attack、hurt、defeat；法師型再加 cast。
- Boss：entrance、idle、attack、cast／signature attack、hurt、defeat。

不要為目前不存在的 gameplay 狀態先製作 walk、run、jump、block、taunt、inventory 等動畫。這些沒有事件消費者，違反 YAGNI。

## 5. 正式動畫規格建議

### 5.1 畫布與 pivot

- 每個角色先統一到固定 logical cell；一般角色建議 384×384，Boss 可用 512×512 或 640×512。
- 所有動作共用同一 anchor；預設腳底中心 `x=0.5`、`y=0.85`，浮空角色另訂 `y=0.65～0.75`。
- 同角色各幀的眼睛、軀幹中心與武器握點需做 onion-skin 對齊。
- 面向沿用正式 registry：勇者向右，敵人向左；不要在 runtime 以 CSS 任意翻轉含文字、徽記或非對稱武器的圖。

### 5.2 建議幀數與節奏

| 動作 | 建議幀數 | 建議長度 | 備註 |
|---|---:|---:|---|
| idle | 4–6 | 800–1200 ms loop | 呼吸、衣物或黏液微動；避免大幅漂移 |
| attack | 5–8 | 350–550 ms | anticipation → strike → recover；命中 frame 必須可標記 |
| cast | 6–10 | 500–800 ms | charge、release 與手部／書本光源一致 |
| hurt | 3–5 | 250–400 ms | 只需快速可讀，不應阻塞太久 |
| defeat | 6–10 | 600–1000 ms | 最後一幀可停留至 spawn event |
| victory | 6–8 | 700–1000 ms | 僅勇者使用 |
| Boss entrance | 8–12 | 900–1500 ms | 可配 camera shake，但 reduced-motion 必須可跳過 |

這些是內容製作建議，不是硬編碼 gate。最終 duration 應由 presentation phase table統一管理，資產不可自行建立第二套 timer 真相。

### 5.3 輸出格式

- 靜態與逐格 sprite：優先透明 WebP；保留無損 PNG master，不直接發布 master。
- 多幀角色動畫：優先規則化 sprite sheet + metadata；不要為每一幀發送獨立 HTTP request。
- 大範圍全屏大招：可用 WebM，僅 lazy load；必須有靜態 fallback。
- 不為所有小技能製作 WebM。一般技能用 sprite／CSS／現有 overlay 組合，避免下載量失控。
- 每個發布檔需通過 magic bytes、dimensions、alpha、decode 與 bytes budget 檢查。

## 6. 技能與 VFX 升級矩陣

| 技能 | 現況 | 已備妥來源 | 建議正式演出 |
|---|---|---|---|
| Fireball | runtime icon/projectile | signature + fire phases | 4–6 frame projectile、短尾焰、impact ring |
| Flame Storm | runtime icon | signature + fire phases | 地面 sigil、上升火柱、短暫 ember residue |
| Meteor Strike | runtime icon | signature + fire phases | 上方預警、meteor travel、impact、cracked ground |
| Ice Arrow | runtime icon/projectile | signature + ice phases | arrow travel、碎冰 impact、短暫 slow tint |
| Ice Barrier | runtime icon | signature + ice phases | barrier grow、hold、shatter；護盾語意不可只靠顏色 |
| Absolute Zero | runtime opaque image | signature + ice phases | 冰霜擴散、晶體爆發、地面凍結；需透明版本重製 |
| Thunder Bolt | runtime icon | signature + lightning phases | charge flash、窄 bolt、small impact |
| Thunder Hammer | runtime icon | signature + lightning phases | hammer materialize、slam、shock ring |
| Judgment Thunder | runtime icon | signature + lightning phases | sigil、垂直巨雷、殘留 arcs |
| Void Rift | WebM + fallback | 尚無逐格 source | 保留 WebM；補 poster／reduced-motion still |
| Final Judgment | WebM + fallback | 尚無逐格 source | 保留 WebM；補 poster／reduced-motion still |
| Apocalypse | WebM + fallback | 尚無逐格 source | 保留 WebM；補 poster／reduced-motion still |

### 6.1 每個技能共用的四階段語言

```text
charge → travel / establish → impact → residue / settle
```

- `charge`：告訴玩家元素與威力，但不超過主要答題內容的視覺層級。
- `travel`：只在需要方向感的 projectile 技能使用；場域技能可改為 establish。
- `impact`：必須與 damage event 同一 ID 對應，不能由獨立 timer 猜測。
- `residue`：僅作短暫回饋，不得看起來像持續傷害，除非未來 gameplay 真正支援 DoT。

## 7. 環境與鏡頭演出計畫

### 7.1 已有來源 layer

- dungeon fog
- warm embers
- falling dust／rubble
- impact shockwave
- ice motes
- lightning sparks
- speed lines
- grounding shadow

### 7.2 建議接入順序

1. 先接 grounding shadow，改善角色落地感且成本最低。
2. 再接 event-triggered shockwave／speed lines，只在 attack 或 Boss entrance 出現。
3. 接少量常駐 ember／fog，但限制粒子數並在頁籤 hidden 時停止。
4. 最後才考慮 camera shake、chromatic aberration 或全屏 color grade。

### 7.3 reduced-motion 降級

- 停用 camera shake、快速 zoom、全屏旋轉及長距離位移。
- 保留 1 個短淡入、技能名稱與 damage／shield 文字語意。
- WebM 改顯示 poster／static fallback，仍必須完成同一 event ID。
- 不得因 reduced motion 跳過 damage、spawn、defeat 或 audio dedupe 邏輯。

## 8. 音效缺口與建議檔案清單

本輪生成工具只製作美術圖片，沒有生成音訊。未來音效應另行製作、授權或用適合的音訊生成流程產出，並保留授權／來源記錄。

### 8.1 P0 音效

| 建議 ID | 建議檔名 | 建議長度 | 觸發事件 |
|---|---|---:|---|
| `cue-hit` | `hit_basic.ogg` | 80–180 ms | 一般命中 |
| `cue-crit` | `hit_critical.ogg` | 150–300 ms | 暴擊 |
| `cue-shield` | `shield_absorb.ogg` | 150–350 ms | 護盾吸收 |
| `cue-defeat` | `monster_defeat.ogg` | 300–700 ms | monster defeat |
| `cue-spawn` | `monster_spawn.ogg` | 250–600 ms | normal／elite spawn |
| `cue-boss-entrance` | `boss_entrance.ogg` | 700–1500 ms | Boss entrance |

### 8.2 P1 元素音效

| 建議 ID | 建議檔名 | 用途 |
|---|---|---|
| `cue-fire-cast` | `skill_fire_cast.ogg` | 火系 charge/release |
| `cue-fire-impact` | `skill_fire_impact.ogg` | 火系 impact |
| `cue-ice-cast` | `skill_ice_cast.ogg` | 冰系 charge/release |
| `cue-ice-impact` | `skill_ice_impact.ogg` | 冰裂 impact |
| `cue-lightning-cast` | `skill_lightning_cast.ogg` | 雷系 charge/release |
| `cue-lightning-impact` | `skill_lightning_impact.ogg` | 雷擊 impact |
| `cue-victory` | `battle_victory.ogg` | 結束／Boss defeat |

### 8.3 音訊原則

- 音訊繼續由既有 `useSoundEffects` 共用 controller 管理，不建立第二 audio service。
- cue 必須由 typed presentation event + event ID 觸發並去重。
- 缺檔、constructor 失敗、autoplay 阻擋一律 fail-soft，不能中斷答題。
- 同一時間限制短音效 voice 數，避免連續作答堆疊。
- BGM ducking 只有在實際測試證明大招聽不清時再加入，不先建複雜 mixer。

## 9. 正式檔名與 registry 建議

角色 action ID 沿用目前 fallback 規則：

```text
hero:attack
hero:cast
hero:hurt
hero:defeat
hero:victory
slime_blue:attack
slime_blue:hurt
slime_blue:defeat
dragon_fire:entrance
dragon_fire:attack
dragon_fire:cast
dragon_fire:hurt
dragon_fire:defeat
```

建議發布路徑：

```text
public/battle/characters/<character>/<action>.webp
public/battle/vfx/<element>/<skill>-<phase>.webp
public/battle/videos/<ultimate>.webm
public/sounds/battle/<cue>.ogg
```

只有通過審核的切片才加入 `BATTLE_ASSET_REGISTRY`。不要另建第二份角色素材表、技能素材表或音訊 manifest；若需要 metadata，擴充同一 registry 的 typed schema。

## 10. 分階段執行路線

### M0：來源稿升格準備（P0）

- [ ] 逐張切出 production-source-v2 的 cell。
- [ ] 人工修正綠／洋紅／青色色溢與半透明邊緣。
- [ ] 對同角色各姿勢做 overlay comparison，修正比例與 pivot 漂移。
- [ ] 為每個 cell 建立名稱、角色、action、anchor、facing metadata。
- [ ] 將 PNG master 與 runtime WebP 分離；master 留在 `assets-prep`。

完成條件：每個 cell 可單獨預覽、透明角落、無裁切、身份一致、pivot 可重疊。

### M1：角色最小動作集（P0）

- [ ] 先完成 hero attack/cast/hurt。
- [ ] 完成三種 normal monster attack/hurt/defeat。
- [ ] 完成 elite／boss hurt/defeat，驗證 defeat → spawn identity。
- [ ] 最後補 victory 與 Boss entrance。
- [ ] 在 registry 登錄 action assets，保留 idle fallback。

完成條件：角色不再於主要 attack/hurt/defeat 事件全部退回 idle；缺少非必要 action 時仍安全 fallback。

### M2：九技能差異化（P1）

- [ ] 以 `signature-skills.png` 鎖定每個技能的視覺身份。
- [ ] 以 `elemental-vfx.png` 補 charge/travel/impact/residue。
- [ ] basic 技能控制在短時長與小面積。
- [ ] intermediate 技能加入一個場域層。
- [ ] advanced 技能才使用全屏 flash／camera emphasis。
- [ ] 3 個 ultimate 保留 WebM + still fallback。

完成條件：玩家在不看文字時仍能分辨 9 個技能；不同 tier 有清楚但不過量的演出階級。

### M3：環境與戰場層次（P1）

- [ ] 先接 shadow、shockwave、speed lines。
- [ ] 再接 fog、embers、ice motes、lightning sparks。
- [ ] 設定 particle ceiling 與 hidden-page pause。
- [ ] 驗證手機畫面不遮擋題目、選項與 HP 語意。

完成條件：戰場有深度但不干擾學習；reduced-motion 與低效能模式仍完整可用。

### M4：音效套件（P1）

- [ ] 製作 P0 六個核心 cue。
- [ ] 製作火／冰／雷 cast + impact。
- [ ] 音量正規化與峰值檢查。
- [ ] typed cue map、event-ID dedupe、missing-file no-op 測試。

完成條件：每個關鍵事件有可辨識聲音，連續快速答題不重播同一 event 或堆疊失控。

### M5：效能、無障礙與正式升格（P0 gate）

- [ ] 更新 asset validator，涵蓋 action sheet metadata。
- [ ] 驗證 alpha、magic bytes、dimensions、decode 與 fallback graph。
- [ ] 冷啟動不得下載非必要技能 WebM／全 roster actions。
- [ ] 實測 reduced-motion、tab hidden、unmount、media error 與 safety deadline。
- [ ] Chromium 驗證正常／Boss／錯答／快速連點／行動版流程。
- [ ] 更新 OpenSpec tasks、開發日誌、MEMORY 與正式資產 manifest。

完成條件：TypeScript、lint、unit、asset validation、build 與 browser flow 全通過；沒有 legacy 第二渲染路徑。

## 11. 驗收標準

### 11.1 美術一致性

- 同一角色不同動作的臉、服裝、武器、比例、光源一致。
- 一般／菁英／Boss 的螢幕尺寸層級清楚。
- 48px 技能圖仍可辨識元素與 tier。
- 元素不只靠色相辨識：火是旋渦／爆裂，冰是尖晶／裂片，雷是分叉／垂直衝擊。

### 11.2 動畫一致性

- 每個 event 只有 presentation scheduler 擁有 completion。
- 動畫的 impact frame 與 damage／shield 語意對齊。
- defeat 角色維持到 spawn phase，不提前換成新怪物。
- media error、timeout、hidden、unmount 都能 settle，不留下卡住的 overlay。

### 11.3 效能

- 首屏只 preload hero、current monster、背景及必要 UI。
- 下一隻怪物只在 encounter 已確定後 bounded preload。
- WebM 與大技能素材 lazy load。
- 粒子使用固定上限；不依裝置無限制增加 DOM node。
- 動畫優先 transform／opacity，避免高頻 layout 與大面積 blur。

### 11.4 無障礙

- reduced-motion 不影響答題、傷害、生成與技能完成語意。
- 顏色之外仍有文字／形狀／圖示提示暴擊、護盾、Boss。
- 裝飾性影像使用空 alt；狀態變更由既有 live region 提供。
- 閃爍頻率與全屏白閃需控制；不要以連續高強度閃光表達雷擊。

## 12. YAGNI 與技術邊界

以下項目在有明確 gameplay 需求前不要建立：

- 不建立 Canvas/WebGL 粒子引擎；現有 CSS、Framer Motion、image/WebM overlay 足夠。
- 不為每個小技能做 WebM。
- 不建立遠端素材 CDN、runtime AI 生成或自製 asset cache service。
- 不建立第二 audio controller、第二 animation queue 或第二 asset registry。
- 不先製作 walk/run/jump 等沒有事件消費者的動作。
- 不建立複雜 biome 系統，除非先有第二個可玩的場景與切換規則。
- 不用固定跨硬體 FPS 數字當唯一 gate；以可重現流程、掉幀觀察、bytes 與降級行為共同判定。

## 13. 建議的未來 OpenSpec 範圍

建議另開 `battle-content-production-overhaul`，不要回頭擴張已完成的 `battle-system-quality-overhaul`。

建議 delta specs：

1. `battle-character-actions`
   - action asset naming、fallback、anchor、identity、defeat/spawn ordering。
2. `battle-skill-vfx-library`
   - 9 技能身份、四階段語言、ultimate WebM fallback、reduced-motion。
3. `battle-environment-presentation`
   - bounded layers、hidden pause、mobile occlusion、camera effects。
4. `battle-audio-cue-library`
   - typed mapping、dedupe、voice ceiling、failure no-op、shared ownership。
5. `battle-content-asset-pipeline`
   - source/master/runtime promotion、metadata、validator、bytes/preload gate。

第一版 scope 應只接入「角色最小動作集 + 9 技能差異化 + P0 音效」，多 biome、造型 skin、角色換裝、動態天氣留到真正有產品需求時再做。

## 14. 可重用生成提示詞

### 14.1 本輪實際 prompt set

所有圖片都要求：高清像素 JRPG、嚴格隔離 cell、固定面向與身份、無文字／UI／浮水印／額外角色、平面色鍵背景、不可有 cast shadow 或跨 cell 粒子。各輸出的實際差異如下，未來可用同一組 references 與差異描述重現：

| 輸出 | Reference images | 格位與內容 | 色鍵 |
|---|---|---|---|
| `hero-actions-source.png` | `01-character-roster.png` + `02-hero-action-sheet.png` | 橫向 6 格：idle、basic attack、spell cast、hurt、victory、defeat | `#00ff00` |
| `normal-monster-actions-source.png` | `01-character-roster.png` + `03-normal-monster-actions.png` | 3×4：slime／bat／goblin × idle／attack／hurt／defeat | `#ff00ff` |
| `elite-monster-actions-source.png` | `01-character-roster.png` + `04-elite-monster-actions.png` | 3×4：orc／skeleton warrior／skeleton wizard × idle／attack or cast／hurt／defeat | `#00ffff` |
| `dragon-actions-source.png` | `01-character-roster.png` + `05-boss-dragon-actions.png` | 橫向 6 格：entrance、idle、claw、fire breath、hurt、defeat | `#00ff00` |
| `elemental-vfx-source.png` | `06-skill-icon-system.png` + `07-elemental-vfx-language.png` | 3×4：fire／ice／lightning × charge／travel／impact／residue | `#00ff00` |
| `signature-skills-source.png` | `06-skill-icon-system.png` + `07-elemental-vfx-language.png` | 3×3：Fireball～Judgment Thunder 九技能 climactic keyframe | `#00ff00` |
| `environment-overlays-source.png` | `08-environment-fx-layers.png` + `00-battle-style-concept.png` | 2×4：fog、embers、rubble、shockwave、ice motes、sparks、speed lines、shadow | `#00ff00` |

### 14.2 角色重生成模板

後續若要重新生成或補角色，沿用下列模板並把 reference image 鎖定為本素材包的 roster／action sheet：

```text
Use case: stylized-concept
Asset type: production-source character action sheet for a side-view browser JRPG
Primary request: Create a clean action sheet for the exact same <character> shown in the references: <actions>.
Input images: Image 1 locks exact identity, outfit, equipment, palette and proportions; Image 2 locks action language and pixel-art rendering.
Scene/backdrop: perfectly flat solid <chroma-key> background; no gradient, texture, floor, lighting variation or shadow.
Style/medium: polished high-definition pixel art, crisp deliberate pixel clusters, consistent sprite scale, upper-left light.
Composition/framing: evenly separated full-body cells, equal gutters, consistent baseline and facing.
Constraints: preserve identity in every pose; no overlap, labels, text, UI, watermark, extra characters, cropped limbs, cast shadow or reflection.
Avoid: photorealism, painterly blur, anatomy drift, costume drift, extra limbs, duplicate pose, mixed facing.
```

### 14.3 技能重生成模板

```text
Use case: stylized-concept
Asset type: production-source skill VFX atlas for a side-view browser JRPG
Primary request: Create four isolated phases for <skill>: charge, travel/establish, impact, residue.
Input images: lock the approved skill icon identity and elemental VFX language.
Scene/backdrop: perfectly flat solid chroma-key background.
Style/medium: high-definition pixel-art VFX, crisp luminous core, tightly controlled particles.
Composition/framing: strict isolated cells, large gutters, no crossing boundaries.
Constraints: no character, UI, text, watermark, border or full-screen background; retain recognizable skill silhouette at small size.
Avoid: generic explosion, excessive blur, merged cells, cropped particles, color drift.
```

### 14.4 生成與去背方式

- 生成工具：Codex 內建 `imagegen`。
- 生成模式：`stylized-concept`。
- 去背方式：平面色鍵 + `remove_chroma_key.py`，使用 soft matte、despill；VFX／environment 另使用 `edge-contract 1`。
- 綠色角色改用洋紅色鍵；紫色／綠色角色混合稿改用青色色鍵。
- 未使用需要 API key 的 CLI true-transparency fallback。

## 15. 最終建議

最值得先做的不是再生成更多概念圖，而是把本輪來源稿升格成小而完整的 production slice：

1. 切出 hero、slime、dragon 的 attack/hurt/defeat，先驗證整條 action registry → presenter → arena 路徑。
2. 用 Fireball、Ice Barrier、Judgment Thunder 各代表 projectile、defense、full-impact 三種技能形態。
3. 補齊 hit、crit、shield、defeat、spawn、Boss entrance 六個 P0 cue。
4. 通過 mobile、reduced-motion、hidden/unmount 與 bytes gate 後，再批次升格其他角色及技能。

這個順序可以最快驗證素材管線與實際觀感，同時避免一次切完所有圖片後才發現 pivot、時序或下載策略不適用。
