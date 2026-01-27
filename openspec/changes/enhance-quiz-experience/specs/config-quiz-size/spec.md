## ADDED Requirements

#### Scenario: User selects quiz size
- **Given** I have a question bank with 50 questions
- **When** I select "All" (or 50) in the dashboard
- **And** I click "Start Quiz"
- **Then** the quiz should contain all 50 questions
- **And** not be limited to 20.

#### Scenario: User selects smaller size
- **Given** I have 50 questions
- **When** I select "10"
- **Then** the quiz should contain 10 random questions.
