## ADDED Requirements

### Requirement: Shadow stays inside CharacterSprite
每個角色 SHALL 在 `CharacterSprite` 定位容器內顯示靜態 grounding shadow，使 shadow 原生跟隨角色移動。SHALL NOT 建立跨元件座標同步。

#### Scenario: Shadow follows attack transform
- **WHEN** CharacterSprite 因 attack transform 移動
- **THEN** shadow 與同一定位容器一起移動

### Requirement: At most four arena image overlays
`BattleArena` SHALL 直接渲染最多 4 個 environment image overlay：fog、embers、shockwave、speed lines。系統 SHALL NOT 產生 DOM particles 或建立獨立 environment scheduler。

#### Scenario: Overlay node ceiling
- **WHEN** 所有環境效果條件同時成立
- **THEN** environment image overlay 節點不超過 4

### Requirement: Existing phase controls event overlays
shockwave SHALL 只在 attack/skill impact 顯示；speed lines SHALL 只在 boss entrance 顯示。效果生命週期 SHALL 由既有 `BattlePresentationEvent.phase` 控制，不建立 timer。

#### Scenario: Shockwave phase
- **WHEN** attack event 進入 impact
- **THEN** 顯示 shockwave
- **AND** 離開 impact 後移除

### Requirement: Quiz content remains unobstructed
environment overlay z-index SHALL 低於題目、選項與 HP UI，且 pointer-events SHALL 為 none。

#### Scenario: Mobile readability
- **WHEN** mobile viewport 同時顯示 fog、embers 與 attack overlay
- **THEN** 題目與選項仍可讀、可點擊

### Requirement: Reduced-motion environment
reduced-motion 下 SHALL 停用 fog/embers 的位移及所有 shockwave/speed-lines 動畫；靜態 shadow 保留。hidden 時沿用瀏覽器 CSS 節流與既有 presentation cancel，SHALL NOT 新增 visibility listener。

#### Scenario: Reduced motion
- **WHEN** `prefers-reduced-motion` 啟用
- **THEN** environment 沒有快速位移或閃爍
- **AND** 答題與 presentation completion 不受影響

