## MODIFIED Requirements

### Requirement: BattleSkillOverlay renders phase VFX in its existing path
`BattleSkillOverlay` SHALL 在同一 component file 內使用局部 `SkillVfxRenderer`，依 active `BattlePresentationEvent` 查詢元素 phase 與 unique skill asset。SHALL NOT 新增獨立 component file、timer、queue 或 media completion owner。

#### Scenario: Fireball phase rendering
- **WHEN** Fireball event phase 依序為 anticipation / travel / impact / settle
- **THEN** 同一 overlay 依序顯示 fire charge / travel / impact / residue
- **AND** impact 同時顯示 Fireball 的 unique image

#### Scenario: Missing VFX stays usable
- **WHEN** phase asset 或 unique skill image 無法 decode
- **THEN** overlay 使用既有 icon/CSS/Sparkles fallback
- **AND** 不阻塞 presentation completion

### Requirement: Existing scheduler remains sole phase owner
VFX SHALL 只讀取 `event.phase`；完成、timeout、hidden 與 unmount SHALL 繼續由 `useBattlePresentation` 現有路徑管理。

#### Scenario: Rapid queued events
- **WHEN** 兩個 skill events 快速 enqueue
- **THEN** 第二個只在既有 scheduler 啟用後渲染
- **AND** 不存在第二個動畫 queue
