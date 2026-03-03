# Spec: Touch Device UX

## ADDED Requirements

### Requirement: Dashboard Bank Action Buttons Visibility on Touch Devices
The Dashboard bank card action buttons (直接開始, 分享, 移動) SHALL be visible and accessible on all touch devices without requiring a mouse hover interaction.

#### Scenario: Tablet user views bank cards
- **WHEN** a user opens the Dashboard on a tablet device (e.g., iPad)
- **AND** the screen width is below the `md` breakpoint or the device has no precise pointer
- **THEN** the action buttons (直接開始, 分享, 移動) SHALL be visible at all times without requiring hover
- **AND** the buttons SHALL be tappable and functional

#### Scenario: Desktop user with mouse views bank cards
- **WHEN** a user opens the Dashboard on a desktop with a mouse
- **AND** the screen width is at or above the `md` breakpoint
- **THEN** the action buttons SHALL be hidden by default
- **AND** the action buttons SHALL appear when the user hovers over the bank card

#### Scenario: Mobile user taps bank card
- **WHEN** a user opens the Dashboard on a mobile phone
- **THEN** the action buttons SHALL be visible at all times
- **AND** the buttons SHALL be tappable and functional

### Requirement: Mobile Settings Access
The system settings panel SHALL be accessible from mobile devices via the bottom navigation bar.

#### Scenario: Opening settings on mobile
- **WHEN** a user is on a mobile device (screen width below `md` breakpoint)
- **THEN** the bottom navigation bar SHALL display a "設定" (Settings) entry
- **AND** tapping the settings entry SHALL open the system settings panel

#### Scenario: Settings icon on mobile nav bar
- **WHEN** the mobile bottom navigation bar is rendered
- **THEN** it SHALL display exactly 5 navigation items: 首頁, 管理, 設定, 社交, 指引
- **AND** the settings item SHALL use the Settings (gear) icon

### Requirement: Dark Mode QuizCard Option Readability
Quiz card answer options SHALL maintain readable text contrast in dark mode, including during hover/selection states.

#### Scenario: Hovering over unanswered option in dark mode
- **WHEN** the user is in dark mode
- **AND** the user hovers over an unanswered quiz option (Standard Mode)
- **THEN** the option background SHALL use a dark-compatible color (e.g., `dark:hover:bg-brand-900/20`)
- **AND** the text SHALL remain readable with sufficient contrast against the background

#### Scenario: Selected multiple-choice option in dark mode
- **WHEN** the user is in dark mode
- **AND** selects an option in a multiple-choice question (before submitting)
- **THEN** the selected option SHALL use dark-compatible highlight colors
- **AND** the text SHALL remain readable

### Requirement: AbortError Console Noise Suppression
The application SHALL NOT log `AbortError` exceptions to the console when they result from normal component unmounting lifecycle.

#### Scenario: Component unmounts during data fetch
- **WHEN** a Dashboard component or data-fetching hook is unmounted while an async operation is in progress
- **AND** the operation throws an `AbortError` (signal is aborted without reason)
- **THEN** the error SHALL be silently caught without logging to `console.error`
- **AND** other genuine errors SHALL continue to be logged normally
