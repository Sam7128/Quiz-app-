# Spec: Error Boundary

## ADDED Requirements

### Requirement: Global Error Boundary
The application SHALL wrap the root component in an Error Boundary that catches unhandled React render errors.

#### Scenario: Uncaught render error
- **WHEN** a component throws an unhandled error during render
- **THEN** the Error Boundary SHALL display a user-friendly fallback UI
- **THEN** the fallback UI SHALL include a "重新載入" button
- **THEN** the error details SHALL be logged to the console
- **THEN** other parts of the application outside the boundary SHALL remain unaffected

### Requirement: Route-Level Error Boundary
Each major view (dashboard, quiz, manager, guide, social) SHALL be wrapped in its own Error Boundary.

#### Scenario: Single view crashes
- **WHEN** the Quiz view throws an error
- **THEN** only the quiz content area shows an error fallback
- **THEN** the header navigation and other views remain functional
- **THEN** the user can navigate to other views without reloading

### Requirement: Error Boundary Styling
The error fallback UI SHALL match the application's current theme (light/dark mode).

#### Scenario: Error in dark mode
- **WHEN** an error boundary fallback is displayed while in dark mode
- **THEN** the fallback UI uses dark mode colors consistent with the app theme
