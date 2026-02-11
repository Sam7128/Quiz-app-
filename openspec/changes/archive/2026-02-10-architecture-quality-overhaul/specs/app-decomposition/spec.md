# Spec: App Decomposition

## ADDED Requirements

### Requirement: Quiz Engine Hook
The application SHALL extract all quiz session logic from `App.tsx` into a dedicated `useQuizEngine` hook.

#### Scenario: Quiz lifecycle managed by hook
- **WHEN** `useQuizEngine` is used
- **THEN** it SHALL expose: `startQuiz`, `handleAnswer`, `nextQuestion`, `restoreSession`, `handleExitQuiz`, `quizState`
- **THEN** `App.tsx` SHALL NOT contain any quiz-specific business logic

### Requirement: Achievement Tracker Hook
The application SHALL extract achievement-checking logic from `App.tsx` into a `useAchievementTracker` hook.

#### Scenario: Achievement checks delegated to hook
- **WHEN** a quiz is completed and the user returns home
- **THEN** achievement checks (perfect_score, first_question, night_owl, early_bird) SHALL be performed by the hook
- **THEN** `App.tsx` SHALL NOT contain achievement-checking code inline in callbacks

### Requirement: App Header Component
The header and desktop navigation SHALL be extracted into a standalone `AppHeader` component.

#### Scenario: Header renders independently
- **WHEN** `AppHeader` is rendered
- **THEN** it SHALL display the logo, navigation tabs, settings button, and user info
- **THEN** it SHALL accept `view`, `gameMode`, `user`, and navigation callbacks as props
- **THEN** `App.tsx` render method SHALL NOT contain header JSX directly

### Requirement: Mobile Navigation Component
The mobile bottom navigation bar SHALL be extracted into a standalone `MobileNav` component.

#### Scenario: Mobile nav renders independently
- **WHEN** `MobileNav` is rendered on a mobile viewport
- **THEN** it SHALL display navigation icons for dashboard, manager, social, and guide
- **THEN** it SHALL support dark mode styling
- **THEN** `App.tsx` render method SHALL NOT contain mobile navigation JSX directly

### Requirement: App.tsx Size Target
After decomposition, `App.tsx` SHALL contain no more than 300 lines of code.

#### Scenario: Line count verification
- **WHEN** the refactoring is complete
- **THEN** `wc -l App.tsx` SHALL report ≤ 300 lines
