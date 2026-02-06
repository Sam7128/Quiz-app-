# Spec: AI Tutor Integration

## ADDED Requirements

### Requirement: AI Configuration
The user MUST be able to configure their AI Provider API Key.

#### Scenario: User saves API Key
User opens settings, enters an API Key (e.g., for Gemini/OpenAI), and saves it. The key persists in LocalStorage.

### Requirement: Contextual Help
The user SHALL be able to ask the AI for help regarding the specific question they are viewing.

#### Scenario: User asks for explanation
User is stuck on a question about "React Hooks". They click "Ask AI". The chat panel opens. The AI already knows the question context. The user types "Explain why useEffect is used here". The AI responds with a specific explanation.

### Requirement: Model Selection (Gemma 3 27B)
The system MUST support configuration to use high-quality models like Gemma 3 27B (via compatible API).

#### Scenario: User selects Gemma 3
The default endpoint configuration points to a service hosting Gemma 3, or the prompt instructs the model to behave as an expert tutor.
