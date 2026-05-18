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

#### Scenario: Production without proxy
- **WHEN** the NVIDIA provider is selected in a production build
- **AND** no custom `baseUrl` is configured
- **THEN** the system SHALL throw an error with a message explaining that a backend proxy or custom Base URL is required
- **AND** the error SHALL NOT result in a silent network failure
