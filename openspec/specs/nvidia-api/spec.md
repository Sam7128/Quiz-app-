# Spec: NVIDIA API Support

## ADDED Requirements

### Requirement: Configurable AI Provider
The system MUST allow users to switch between Google (default) and NVIDIA/OpenAI-compatible providers.

#### Scenario: User configures NVIDIA API
- **Given** the user opens the Settings modal
- **When** they select "NVIDIA" as the AI Provider
- **Then** the "Base URL" field should appear (defaulting to `https://integrate.api.nvidia.com/v1`)
- **And** the Model selector should allow entering a custom model ID (or select from presets like `deepseek-ai/deepseek-v3.2`)

### Requirement: NVIDIA/OpenAI Integration
The system MUST be able to dispatch AI requests using the OpenAI Chat Completion protocol when the NVIDIA provider is selected. In production environments without a proxy, the system MUST fail with a clear, actionable error message instead of silently failing.

#### Scenario: AI Request with NVIDIA
- **Given** the user has configured NVIDIA API
- **When** they click "AI Helper" in a quiz
- **Then** the application should send the request to the configured Base URL using the OpenAI Chat Completion format
- **And** the `Authorization` header should contain `Bearer <NVIDIA_KEY>`

#### Scenario: Custom Model Support
- **Given** the NVIDIA provider is selected
- **When** the user types a custom model name (e.g., `meta/llama-3-70b`)
- **Then** the API request should use that specific model string

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
