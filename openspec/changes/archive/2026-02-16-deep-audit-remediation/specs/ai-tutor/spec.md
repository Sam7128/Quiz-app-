## MODIFIED Requirements

### Requirement: AI Configuration
The user MUST be able to configure their AI Provider API Key. The system SHALL provide a "persist" option allowing users to choose whether the key is stored in localStorage (persistent) or sessionStorage (cleared on browser close).

#### Scenario: User saves API Key with persistence
- **WHEN** the user enters an API Key and selects "Remember key" (persist = true)
- **THEN** the key SHALL be saved to localStorage under the `mindspark_ai_config` key

#### Scenario: User saves API Key without persistence
- **WHEN** the user enters an API Key and deselects "Remember key" (persist = false)
- **THEN** the key SHALL be stored only in sessionStorage or in-memory
- **AND** the key SHALL NOT be written to localStorage
- **AND** the key SHALL be cleared when the browser tab/window is closed
