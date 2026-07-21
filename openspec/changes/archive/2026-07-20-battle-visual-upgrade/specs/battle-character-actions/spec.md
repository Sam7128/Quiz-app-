## ADDED Requirements

### Requirement: Action registration uses existing registry
每個新增角色動作 SHALL 以 `<characterId>:<action>` 註冊到既有 `BATTLE_ASSET_REGISTRY`；idle 維持 `<characterId>`。系統 SHALL NOT 建立第二份 character manifest。

#### Scenario: Hero attack lookup
- **WHEN** 查詢 `getBattleCharacterAsset('hero', 'attack')`
- **THEN** 返回 kind=`character`、action=`attack` 的 `hero:attack`

#### Scenario: Missing action keeps existing fallback
- **WHEN** 查詢沒有 entry 的 action 或 action WebP decode 失敗
- **THEN** 使用既有 idle / `onError` fallback
- **AND** 不建立新的 fallback manager

### Requirement: Runtime-consumed action set
勇者 SHALL 新增 attack / cast / hurt / defeat。每隻普通與菁英怪物 SHALL 新增 attack / hurt / defeat。`dragon_fire` SHALL 額外新增 entrance。`hero:victory`、`skeleton_wizard:cast` 與 `dragon_fire:fire-breath` SHALL NOT 在本 change 發布，因目前沒有 presentation event consumer。

#### Scenario: Required actions do not fallback
- **WHEN** 現有 presentation event 產生上述 action
- **THEN** 每個 action 都返回對應 entry 而非 idle

#### Scenario: Source-only pose remains out of runtime
- **WHEN** 檢查 runtime registry
- **THEN** 不存在 `hero:victory`、`skeleton_wizard:cast` 或 `dragon_fire:fire-breath`

### Requirement: Visual metadata consistency
同一角色 action entries SHALL 與其 idle entry 使用相同 anchor、facing 與 visualScale。實際檔案 SHALL 為透明 WebP、≤ 250KB、可由 Chromium decode 且四角 alpha 為 0。

#### Scenario: Metadata consistency
- **WHEN** validator 檢查同一角色全部 action entries
- **THEN** anchor / facing / visualScale 與 idle 完全一致

### Requirement: Defeat identity remains until spawn
現有 `BattleArena` 已優先解析 `activeEvent.payload.monsterId`；`monster_defeat` event SHALL 繼續使用該 monster ID 顯示其 defeat asset，直到後續 `monster_spawn` / `boss_entrance` 開始。這是 regression requirement，不新增 state machine 或 identity state。

#### Scenario: Defeated monster remains visible
- **WHEN** defeat event active 但 durable state 已準備下一隻怪物
- **THEN** CharacterSprite 仍顯示被擊敗 monster 的 defeat asset
