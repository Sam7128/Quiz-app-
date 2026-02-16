## MODIFIED Requirements

### Requirement: NVIDIA/OpenAI Integration
The system MUST be able to dispatch AI requests using the OpenAI Chat Completion protocol when the NVIDIA provider is selected. In production environments without a proxy, the system MUST fail with a clear, actionable error message instead of silently failing.

#### Scenario: AI Request with NVIDIA
- **WHEN** they click "AI Helper" in a quiz
- **THEN** the application should send the request to the configured Base URL using the OpenAI Chat Completion format
- **AND** the `Authorization` header should contain `Bearer <NVIDIA_KEY>`

#### Scenario: Custom Model Support
- **WHEN** the user types a custom model name (e.g., `meta/llama-3-70b`)
- **THEN** the API request should use that specific model string

#### Scenario: Production without proxy
- **WHEN** the NVIDIA provider is selected in a production build
- **AND** no custom `baseUrl` is configured
- **THEN** the system SHALL throw an error with a message explaining that a backend proxy or custom Base URL is required
- **AND** the error SHALL NOT result in a silent network failure
