## ADDED Requirements

### Requirement: Shared element phases plus unique skill image
9 個 basic/intermediate/advanced 技能 SHALL 使用其元素的 4 張共用 phase VFX，並在 impact 顯示該 skill ID 的獨特圖片。系統 SHALL NOT 為 9 個技能複製 36 張 phase 資產或建立第二份 skill config。

#### Scenario: Same-element skills remain distinct
- **WHEN** Fireball、Flame Storm、Meteor Strike 進入 impact
- **THEN** 三者可共用 fire impact layer
- **AND** 各自顯示不同的 skill image

### Requirement: Twelve phase assets use canonical IDs
registry SHALL 包含 `vfx-<element>-<phase>` 12 個 entries，其中 element 為 fire/ice/lightning，phase 為 charge/travel/impact/residue。

#### Scenario: Fire phase lookup
- **WHEN** 查詢 `vfx-fire-charge`、`vfx-fire-travel`、`vfx-fire-impact`、`vfx-fire-residue`
- **THEN** 各返回 projectile 或 impact asset

### Requirement: Existing presentation phase drives VFX
anticipation SHALL 顯示 charge，travel SHALL 顯示 travel/establish，impact SHALL 顯示 impact + unique skill image，settle SHALL 顯示 residue。Renderer SHALL NOT 建立 timer 或 completion queue。

#### Scenario: Flame Storm establish phase
- **WHEN** Flame Storm 進入 travel
- **THEN** 共用 fire travel image 以場域 establish 方式呈現
- **AND** 不建立 projectile timer

### Requirement: Existing skill tier controls scale
Renderer SHALL 以既有 `ALL_SKILLS` 取得 tier：basic 小面積、intermediate 加入場域、advanced 可全屏 emphasis。SHALL NOT 新增 JSON config、DTO、provider 或 adapter。

#### Scenario: Tier scale differs
- **WHEN** basic 與 advanced skill 使用相同元素 phase
- **THEN** 其尺寸／emphasis 仍依既有 tier 不同

### Requirement: Ultimate and reduced-motion fallbacks remain
ultimate/epic/legendary SHALL 維持既有 WebM + still fallback。reduced-motion 下 basic/intermediate/advanced SHALL 只顯示名稱、獨特 skill image 與短淡入，不使用快速位移或 flash。

#### Scenario: Reduced-motion skill
- **WHEN** reduced-motion 且 skill event 觸發
- **THEN** 顯示名稱 + skill image 短淡入
- **AND** event 仍由既有 scheduler 完成

