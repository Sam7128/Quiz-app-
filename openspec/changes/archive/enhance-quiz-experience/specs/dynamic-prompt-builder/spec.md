## MODIFIED Requirements

#### Scenario: Generate Prompt for Single Choice Only
- **Given** I am on the AI Guide page
- **When** I select "Single Choice"
- **Then** the generated prompt should explicitly ask for "only single choice questions".

#### Scenario: Generate Prompt for Multiple Choice Only
- **Given** I am on the AI Guide page
- **When** I select "Multiple Choice"
- **Then** the generated prompt should explicitly ask for "only multiple choice questions".

#### Scenario: Generate Prompt with English Explanation
- **Given** I am on the AI Guide page
- **When** I select "English" for Explanation Language
- **Then** the prompt should instruct the AI to provide "explanations in English".

#### Scenario: Generate Prompt with English Output
- **Given** I am on the AI Guide page
- **When** I select "English" for Output Language
- **Then** the prompt should instruct the AI to "Output in English".
