# 戰鬥視覺升級前期素材包

> 狀態：美術方向與動作演出參考素材，尚未接入正式遊戲。
> 基準風格：高清像素 JRPG、暖橘火光、冷紫地下城陰影、清晰側視戰鬥輪廓。

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
