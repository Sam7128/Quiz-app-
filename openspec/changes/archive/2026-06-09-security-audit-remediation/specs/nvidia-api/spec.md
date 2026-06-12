## MODIFIED Requirements

### Requirement: NVIDIA base URL supports production proxy
`resolveNvidiaBaseUrl()` SHALL 在生產環境中允許使用同源 Vercel proxy 路徑（`/api/nvidia`），而非強制拋出錯誤阻止請求。

#### Scenario: Production with no custom baseUrl
- **WHEN** 應用在生產環境執行
- **AND** 用戶未設定自訂 `baseUrl`（或 `baseUrl` 為預設 NVIDIA URL）
- **THEN** 系統 SHALL 回傳 `${origin}/api/nvidia` 作為請求端點
- **AND** 系統 SHALL NOT 拋出 Error

#### Scenario: Production with custom baseUrl
- **WHEN** 應用在生產環境執行
- **AND** 用戶已設定自訂 `baseUrl`（非預設值）
- **THEN** 系統 SHALL 回傳用戶設定的 `baseUrl`

#### Scenario: Development with no custom baseUrl
- **WHEN** 應用在開發環境執行
- **AND** 用戶未設定自訂 `baseUrl`
- **THEN** 系統 SHALL 回傳 `${origin}/api/nvidia` 作為請求端點
