# battle-mode Specification

## ADDED Requirements

### Requirement: Battle Stage Responsive Compact Layout
在啟用戰鬥遊戲模式（`gameMode === true`）時，系統 SHALL 依據視窗螢幕高度動態調整排版結構，杜絕標準筆電螢幕（高度 ≤ 800px）下題目選項與操作按鈕掉出可視視窗下緣的問題：

1. **舞台高度約束**：
   BattleArena 容器 SHALL 使用 `max-h-[25vh] md:max-h-[28vh]` 約束最大高度，`min-h-[80px] md:min-h-[110px]` 作為下限保護，確保戰鬥舞台不超過 viewport 28%。

2. **角色精靈緊湊化**：
   角色精靈尺寸 SHALL 在窄螢幕使用 `w-16 h-20`，md 斷點以上使用 `w-24 h-28`，降低垂直佔用高度，將視野歸還給題目卡片與作答按鈕。

3. **溢出保護**：
   舞台容器 SHALL 具有 `overflow-hidden`，防止極端情況下的內容溢出。

#### Scenario: Laptop viewport displays battle and question without scrolling
- **WHEN** 使用者在高度 ≤ 768px 之筆電螢幕進入戰鬥測驗
- **THEN** BattleArena 高度 SHALL 不超過 viewport 的 28%
- **AND** 題幹與四個選項 SHALL 在首屏 100% 完整露出
- **AND** 使用者無需垂直滾動即可看清全部選項並進行作答

#### Scenario: Desktop viewport preserves full battle experience
- **WHEN** 使用者在高度 ≥ 1080px 的桌面螢幕進行戰鬥測驗
- **THEN** BattleArena SHALL 以完整尺寸呈現（受 md:min-h-[110px] 與 md:max-h-[28vh] 比例約束）
- **AND** 角色精靈 SHALL 使用標準尺寸（`w-24 h-28`）
- **AND** 動畫與立繪反饋 SHALL 完整保留
