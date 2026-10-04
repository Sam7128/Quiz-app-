## ADDED Requirements

### Requirement: Only implemented achievements are displayed and counted
成就系統 UI（`AchievementsCard` 與 `AchievementsModal`）SHALL 僅渲染已由 `useAchievementTracker` 實作追蹤的成就。未實作的幽靈成就 SHALL NOT 出現在 UI 中。成就總數與已解鎖進度計算 SHALL 基於白名單集合。

#### Scenario: AchievementsCard shows only implemented achievements
- **WHEN** Dashboard 渲染 AchievementsCard
- **THEN** 卡片 SHALL 僅顯示 `IMPLEMENTED_ACHIEVEMENT_IDS` 集合中的成就
- **AND** 成就總數 SHALL 等於已實作成就數量（目前為 4）
- **AND** 進度條與「已解鎖 X / Y」的 Y SHALL 等於 4

#### Scenario: AchievementsModal shows only implemented achievements
- **WHEN** 使用者點擊「查看全部成就」開啟 AchievementsModal
- **THEN** Modal SHALL 僅列出已實作成就
- **AND** 未實作的成就（如 `ten_questions`, `streak_3`, `first_boss_kill` 等）SHALL NOT 出現在列表

#### Scenario: Unknown or obsolete unlocked IDs gracefully filtered
- **WHEN** 使用者的 localStorage 殘留已解鎖但不在 `IMPLEMENTED_ACHIEVEMENT_IDS` 中的過往成就 ID
- **THEN** UI 元件 SHALL 安全過濾掉該 ID
- **AND** 已解鎖計數 X SHALL 僅統計存在於白名單中的已解鎖項目
- **AND** 介面不得發生渲染崩潰或顯示空白卡片

#### Scenario: Implemented achievements match tracker implementation exactly
- **WHEN** 系統初始化與執行自動化驗證
- **THEN** `IMPLEMENTED_ACHIEVEMENT_IDS` SHALL 包含且僅包含：`perfect_score`, `first_question`, `night_owl`, `early_bird`
- **AND** 單元測試 SHALL 直接比對 `IMPLEMENTED_ACHIEVEMENT_IDS` 與 `useAchievementTracker.ts` 導出的 `TRACKED_ACHIEVEMENT_IDS` 集合，確保雙向 100% 集合等價，嚴禁使用脆弱的文本正則匹配源代碼

### Requirement: ACHIEVEMENTS array preserved for future expansion
`constants/achievements.ts` 中的完整 `ACHIEVEMENTS` 陣列 SHALL NOT 被刪減或修改。過濾邏輯 SHALL 在消費端（UI 元件）透過 `IMPLEMENTED_ACHIEVEMENT_IDS` 執行過濾。

#### Scenario: Full achievements array untouched
- **WHEN** 開發者在 `constants/achievements.ts` 中查看 `ACHIEVEMENTS` 陣列
- **THEN** 陣列 SHALL 保持全部 22 個成就定義不變
- **AND** 新增的 `IMPLEMENTED_ACHIEVEMENT_IDS` SHALL 作為獨立的 `Set<string>` export
