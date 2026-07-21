## MODIFIED Requirements

### Requirement: Battle asset unions cover immediate consumers
`BattleAssetAction` SHALL 增加 `'entrance'`；`BattleAssetKind` SHALL 增加 `'environment'`。兩者 SHALL 在任何 registry/component 邏輯前先定義並通過 `npx tsc --noEmit`。

#### Scenario: Entrance character entry compiles
- **WHEN** dragon entry 使用 kind=`character`、action=`entrance`
- **THEN** TypeScript 編譯通過

#### Scenario: Environment entry compiles
- **WHEN** fog entry 使用 kind=`environment`
- **THEN** TypeScript 編譯通過且 validator 有對應副檔名／bytes 規則

### Requirement: Character lookup supports entrance
`getBattleCharacterAsset` SHALL 支援 `entrance` 並維持既有 idle fallback。

#### Scenario: Dragon entrance
- **WHEN** 查詢 `getBattleCharacterAsset('dragon_fire', 'entrance')`
- **THEN** 返回 `dragon_fire:entrance`

## ADDED Requirements

### Requirement: CharacterSprite consumes current action assets
CharacterSprite SHALL 根據既有 heroAction / monsterAction 顯示 registry action asset。`boss_entrance` + `entrance` phase SHALL 映射 monsterAction=`entrance`；其他既有 attack/cast/hurt/defeat mapping 保持單一來源。

#### Scenario: Boss entrance sprite
- **WHEN** boss entrance event 進入 entrance phase
- **THEN** dragon image src 使用 `dragon_fire:entrance`

#### Scenario: Broken action image
- **WHEN** action image HTTP/decode 失敗
- **THEN** 既有 CharacterSprite `onError` fallback 回到 idle 或安全 placeholder

