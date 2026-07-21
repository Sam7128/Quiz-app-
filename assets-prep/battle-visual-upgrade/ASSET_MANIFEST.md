# 戰鬥視覺升級前期素材包

> 狀態：26 個角色動作、12 個元素特效 phase、9 個獨特技能圖片、5 個環境 overlay 與 12 個音效 cue 已完成切圖轉檔並正式接入正式遊戲 runtime；未使用的 7 個姿勢與素材保留為 source-only。
> 基準風格：高清像素 JRPG、暖橘火光、冷紫地下城陰影、清晰側視戰鬥輪廓。

完整的未來升格路線、驗收條件與新生成來源稿清單請見：
`docs/BATTLE_ART_ANIMATION_UPGRADE_PLAN.md`。

## 素材清單

| 檔案 | 用途 |
|---|---|
| `00-battle-style-concept.png` | 已確認的整體戰鬥方向基準 |
| `01-character-roster.png` | 勇者與七種怪物的統一造型、比例及色彩 |
| `02-hero-action-sheet.png` | 勇者待機、蓄力、施法、受擊、勝利動作 |
| `03-normal-monster-actions.png` | 史萊姆、蝙蝠、哥布林動作語言 |
| `04-elite-monster-actions.png` | 獸人、骷髏戰士、骷髏法師動作語言 |
| `05-boss-dragon-actions.png` | 火龍登場、待機、攻擊、受擊、倒下動作 |
| `06-skill-icon-system.png` | 九種火、冰、雷技能的統一圖示系統 |
| `07-elemental-vfx-language.png` | 火、冰、雷的投射物、命中、光環及地面殘留 |
| `08-environment-fx-layers.png` | 霧、火星、碎石、裂地、速度線與角色陰影 |
| `09-battle-hud-presentation.png` | HP、連擊、Boss 登場與技能名稱的畫面層級參考 |

## Production Source v2

`production-source-v2/` 保存 2026-07-16 新生成的非覆蓋式生產來源稿：

- 勇者、普通怪物、菁英／法師、火龍 Boss 動作 atlas。
- 火／冰／雷四階段 VFX atlas。
- 九技能招牌關鍵幀 atlas。
- 八類環境 overlay atlas。
- 每組同時保存原始色鍵檔與透明 PNG；透明檔四角 alpha 已驗證為 0。

這些檔案仍需切格、修邊、補幀、pivot 對齊及 runtime bytes 驗證，不得直接加入正式 asset registry。

## 後續切圖原則

- 角色與特效正式製作時應拆成獨立透明 PNG/WebP 或規則化 sprite sheet。
- 所有角色統一光源由左上方照射，面向戰場中央。
- 一般怪物、菁英及 Boss 必須保持明確的尺寸與輪廓層級。
- 動畫至少包含待機、攻擊、受擊、退場；Boss 另含登場與蓄力。
- 圖示在 48px 顯示尺寸下仍須能辨識元素與技能等級。
- 本資料夾只保存前期候選素材，不覆蓋 `public/battle/` 正式資產。

## 生成方式

- 工具：Codex 內建 image generation
- 類型：`stylized-concept`／`ui-mockup`
- 共同限制：無商標、無浮水印、無額外角色、保持一致像素密度。

## Runtime Assets Manifest (battle-visual-upgrade)

### Promoted Runtime Assets
1. **Character Actions (26 WebPs)**:
   - Hero (4): `hero:attack`, `hero:cast`, `hero:hurt`, `hero:defeat`
   - Slime Blue (3): `slime_blue:attack`, `slime_blue:hurt`, `slime_blue:defeat`
   - Bat Shadow (3): `bat_shadow:attack`, `bat_shadow:hurt`, `bat_shadow:defeat`
   - Goblin Green (3): `goblin_green:attack`, `goblin_green:hurt`, `goblin_green:defeat`
   - Orc Berserker (3): `orc_berserker:attack`, `orc_berserker:hurt`, `orc_berserker:defeat`
   - Skeleton Warrior (3): `skeleton_warrior:attack`, `skeleton_warrior:hurt`, `skeleton_warrior:defeat`
   - Skeleton Wizard (3): `skeleton_wizard:attack`, `skeleton_wizard:hurt`, `skeleton_wizard:defeat`
   - Dragon Fire (4): `dragon_fire:entrance`, `dragon_fire:attack`, `dragon_fire:hurt`, `dragon_fire:defeat`
2. **Elemental VFX Phases (12 WebPs)**:
   - Fire (4): `vfx-fire-charge`, `vfx-fire-travel`, `vfx-fire-impact`, `vfx-fire-residue`
   - Ice (4): `vfx-ice-charge`, `vfx-ice-travel`, `vfx-ice-impact`, `vfx-ice-residue`
   - Lightning (4): `vfx-lightning-charge`, `vfx-lightning-travel`, `vfx-lightning-impact`, `vfx-lightning-residue`
3. **Signature Skill Images (9 WebPs)**:
   - `fireball`, `flame_storm`, `meteor_strike`
   - `ice_arrow`, `ice_barrier`, `absolute_zero`
   - `thunder_bolt`, `thunder_hammer`, `judgment_thunder`
4. **Environment Overlays (5 WebPs)**:
   - `environment-fog`, `environment-embers`, `environment-shockwave`, `environment-speed-lines`, `environment-shadow`
5. **Audio Cues (12 Oggs)**:
   - `cue-hit_basic`, `cue-hit_critical`, `cue-shield_absorb`, `cue-monster_defeat`, `cue-monster_spawn`, `cue-boss_entrance`
   - `cue-skill_fire_cast`, `cue-skill_fire_impact`, `cue-skill_ice_cast`, `cue-skill_ice_impact`, `cue-skill_lightning_cast`, `cue-skill_lightning_impact`

### Source-Only Exclusions (7 items)
1. `hero:victory` (`public/battle/hero_victory.webp` - Not promoted)
2. `skeleton_wizard:cast` (`public/battle/monsters/skeleton_wizard_cast.webp` - Not promoted)
3. `dragon_fire:fire-breath` (`public/battle/monsters/dragon_fire_breath.webp` - Not promoted)
4. `environment-rubble` (`public/battle/environment/rubble.webp` - Not promoted)
5. `environment-ice-motes` (`public/battle/environment/ice_motes.webp` - Not promoted)
6. `environment-sparks` (`public/battle/environment/sparks.webp` - Not promoted)
7. `battle_victory.ogg` (`assets-prep/battle-visual-upgrade/audio-source/battle_victory.ogg` - Retained in prep)
