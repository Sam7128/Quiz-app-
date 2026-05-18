# Video Skill Playback Spec (Delta)

## Overview
增強 30/40/50 連擊大技能的影片載入和 fallback 處理。

## Changes to Existing Behavior

### CHG-1: 影片載入失敗 Fallback
**Before**: 影片載入失敗時只顯示靜態 CSS 動畫
**After**: 使用增強版 fallback，包含:
- 多層粒子爆發
- 螢幕全白閃光
- 技能元素色彩漸層光環
- 螢幕強烈震動

### CHG-2: Loading 狀態
**Before**: 無 loading 指示
**After**: 顯示載入動畫 (旋轉圖標 + 進度)

## Acceptance Criteria

- [ ] 影片正常載入時播放完整
- [ ] 影片載入失敗時顯示華麗的 CSS fallback
- [ ] Fallback 效果與影片版本視覺感受接近
