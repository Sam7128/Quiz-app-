# Spec: Client Data Integrity

## ADDED Requirements

### Requirement: localStorage Data Integrity Signing
系統 SHALL 對儲存在 localStorage 中的關鍵遊戲資料（battle_state, achievements）附加 HMAC-SHA256 簽名，以偵測並拒絕被竄改的資料。
- **安全性限制與妥協**：
  - **防禦邊界**：本機 HMAC 簽名主要是用作「防君子不防小人」的輕量級校驗，僅用於防範普通用戶直接在瀏覽器 F12 中改數值（防無腦改檔），不防範具有逆向 JS 並在 Console 重組簽名邏輯之能力的進階攻擊者。
  - **代碼註解**：實作中必須在 `integrityCheck.ts` 檔案頂部寫明此安全性妥協，避免未來開發者誤信其具有絕對安全性而存放更高敏感度的狀態。

#### Scenario: Battle state saved with signature
- **WHEN** 系統將 `BattleState` 寫入 `localStorage` (`mindspark_battle_state`)
- **THEN** 系統 SHALL 同時寫入一個 HMAC-SHA256 簽名值至 `mindspark_battle_state_sig`
- **AND** 簽名 SHALL 基於序列化後的 JSON 字串 + 應用固定鹽值計算

#### Scenario: Battle state loaded with valid signature
- **WHEN** 系統從 `localStorage` 讀取 `mindspark_battle_state`
- **AND** `mindspark_battle_state_sig` 存在且簽名驗證通過
- **THEN** 系統 SHALL 正常還原 `BattleState`

#### Scenario: Battle state loaded with invalid signature
- **WHEN** 系統從 `localStorage` 讀取 `mindspark_battle_state`
- **AND** 簽名驗證失敗（資料被篡改）
- **THEN** 系統 SHALL 記錄 `console.warn` 日誌
- **AND** 系統 SHALL 回退至 `INITIAL_BATTLE_STATE` 重新開始

#### Scenario: Battle state loaded without signature (migration)
- **WHEN** 系統從 `localStorage` 讀取 `mindspark_battle_state`
- **AND** `mindspark_battle_state_sig` 不存在（舊版本資料）
- **THEN** 系統 SHALL 接受資料但在下次寫入時產生簽名
- **AND** 系統 SHALL 記錄 `console.info` 表示資料已遷移

#### Scenario: Achievements saved with signature
- **WHEN** 系統將成就列表寫入 `localStorage` (`mindspark_achievements`)
- **THEN** 系統 SHALL 同時寫入 HMAC-SHA256 簽名至 `mindspark_achievements_sig`

#### Scenario: Achievements loaded with invalid signature
- **WHEN** 系統從 `localStorage` 讀取 `mindspark_achievements`
- **AND** 簽名驗證失敗
- **THEN** 系統 SHALL 回退至空成就列表 `[]`

### Requirement: Schema validation on localStorage read
系統 SHALL 對從 localStorage 反序列化的 `BattleState` 資料進行 schema 驗證（型別守衛），確保所有必要欄位存在且數值在合理範圍內。

#### Scenario: heroHp exceeds maximum
- **WHEN** 從 localStorage 解析的 `BattleState.heroHp` 超過 `200`（合理上限）
- **THEN** 系統 SHALL 將 `heroHp` 夾至上限值 `200`

#### Scenario: streak is negative
- **WHEN** 從 localStorage 解析的 `BattleState.streak` 為負數
- **THEN** 系統 SHALL 將 `streak` 重設為 `0`

#### Scenario: Required field missing
- **WHEN** 從 localStorage 解析的物件缺少 `BattleState` 的必要欄位（如 `heroHp`, `monsterHp`, `isActive`）
- **THEN** 系統 SHALL 回退至 `INITIAL_BATTLE_STATE`
