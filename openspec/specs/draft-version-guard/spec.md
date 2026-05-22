# draft-version-guard Specification

## Purpose
TBD - created by archiving change security-and-sync-hardening. Update Purpose after archive.
## Requirements
### Requirement: saveChunkDraft performs updatedAt comparison before write
`saveChunkDraft` 函式 SHALL 在寫入 localStorage 之前，比較傳入草稿的 `updatedAt` 與現有草稿的 `updatedAt`。若現有草稿的 `updatedAt` 嚴格大於傳入草稿的 `updatedAt`，系統 SHALL 拒絕寫入並記錄警告。
`saveChunkDraft` SHALL 在寫入時處理 `QuotaExceededError`，並以降級策略（清理最舊草稿或回報警告）避免拋出未處理例外。

#### Scenario: Newer draft overwrites older draft
- **WHEN** 現有草稿的 `updatedAt` 為 `1000`
- **AND** 傳入草稿的 `updatedAt` 為 `2000`
- **THEN** 系統 SHALL 正常寫入傳入的草稿
- **AND** localStorage 中的草稿 SHALL 更新為傳入版本

#### Scenario: Older draft is rejected
- **WHEN** 現有草稿的 `updatedAt` 為 `3000`
- **AND** 傳入草稿的 `updatedAt` 為 `2000`
- **THEN** 系統 SHALL 拒絕寫入
- **AND** 系統 SHALL 記錄 `console.warn` 包含兩個時間戳的值
- **AND** localStorage 中的草稿 SHALL 維持不變

#### Scenario: Clock rollback allows forced overwrite
- **WHEN** 現有草稿的 `updatedAt` 與傳入草稿的 `updatedAt` 差距異常過大（例如 > 1 小時）
- **THEN** 系統 SHALL 視為時鐘異常
- **AND** 系統 SHALL 允許較新的業務狀態覆蓋並記錄警告

#### Scenario: No existing draft allows write
- **WHEN** localStorage 中不存在對應的草稿
- **AND** 傳入草稿的 `updatedAt` 為任意合法值
- **THEN** 系統 SHALL 正常寫入傳入的草稿

#### Scenario: Existing draft has no updatedAt field (legacy data)
- **WHEN** 現有草稿不包含 `updatedAt` 欄位（或為 `undefined`）
- **AND** 傳入草稿的 `updatedAt` 為合法值
- **THEN** 系統 SHALL 允許寫入（legacy 草稿視為最舊版本）

#### Scenario: Storage quota exceeded during write
- **WHEN** `localStorage.setItem` 拋出 `QuotaExceededError`
- **THEN** 系統 SHALL 不中斷流程
- **AND** 系統 SHALL 嘗試清理最舊草稿或記錄警告

### Requirement: getAIConfig handles corrupted JSON gracefully
`getAIConfig` 函式 SHALL 使用 try-catch 包裝 `JSON.parse` 呼叫，並在解析前檢查資料大小上限。當解析失敗或結構不合法時，系統 SHALL 清理損壞的設定資料並返回 `null`。清理 localStorage/sessionStorage 若失敗，系統 SHALL 記錄警告但不得拋出例外。

#### Scenario: Valid JSON parses successfully
- **WHEN** localStorage 中的 AI config 為合法 JSON
- **THEN** 系統 SHALL 正常解析並返回 `AIConfig` 物件
- **AND** 行為 SHALL 與修改前完全一致

#### Scenario: Corrupted JSON is handled gracefully
- **WHEN** localStorage 中的 AI config 為損壞的 JSON（例如 `"{invalid"}`）
- **THEN** 系統 SHALL 捕獲 SyntaxError
- **AND** 系統 SHALL 清除 localStorage 和 sessionStorage 中的 `mindspark_ai_config`
- **AND** 系統 SHALL 記錄 `console.error` 說明解析失敗
- **AND** 系統 SHALL 返回 `null`
- **AND** 系統 SHALL NOT 拋出任何 exception 到上層

#### Scenario: Oversized JSON is rejected
- **WHEN** localStorage 中的 AI config 字串長度超過上限
- **THEN** 系統 SHALL 視為損壞資料並返回 `null`
- **AND** 系統 SHALL 記錄警告

#### Scenario: Parsed JSON fails schema validation
- **WHEN** `JSON.parse` 成功但物件不符合 `AIConfig` 結構
- **THEN** 系統 SHALL 視為損壞資料並返回 `null`
- **AND** 系統 SHALL 清理 storage 中的設定資料

#### Scenario: Empty storage returns null
- **WHEN** localStorage 和 sessionStorage 中都沒有 AI config
- **THEN** 系統 SHALL 返回 `null`
- **AND** 系統 SHALL NOT 嘗試 JSON.parse

