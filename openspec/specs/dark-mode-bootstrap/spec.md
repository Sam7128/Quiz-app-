# Spec: Dark Mode Pre-paint Bootstrap

## ADDED Requirements

### Requirement: Apply persisted theme before first paint

`index.html` MUST execute a defensive inline bootstrap in `<head>` before the application module mounts. It SHALL read `STORAGE_KEYS.THEME`'s persisted key (`mindspark_theme`) and apply the effective `dark` class before root rendering.

#### Scenario: Persisted dark theme
- **WHEN** localStorage contains `mindspark_theme = dark`
- **THEN** `document.documentElement` SHALL have class `dark` before the module application renders

#### Scenario: Persisted light theme
- **WHEN** localStorage contains `mindspark_theme = light`
- **THEN** `document.documentElement` SHALL not have class `dark` before first paint

#### Scenario: System theme
- **WHEN** localStorage contains `mindspark_theme = system`
- **THEN** the bootstrap SHALL use `matchMedia('(prefers-color-scheme: dark)')`
- **AND** SHALL add `dark` only when the media query matches

### Requirement: Bootstrap is fail-open and value constrained

The bootstrap MUST accept only `light`, `dark`, and `system`; storage and media-query exceptions MUST fall back to light without blocking page load.

#### Scenario: Invalid persisted value
- **WHEN** the theme key contains any other value
- **THEN** the bootstrap SHALL treat it as light
- **AND** SHALL not add `dark`

#### Scenario: Privacy mode or browser API failure
- **WHEN** localStorage access or `matchMedia` throws or is unavailable
- **THEN** the bootstrap SHALL complete without throwing
- **AND** the page SHALL use the light-safe default

### Requirement: React theme state remains authoritative after mount

After mount, `ThemeContext` MUST continue to own theme updates and use the same key and `light/dark/system` semantics; the bootstrap is an initial-paint optimization, not a second persistent state.

#### Scenario: User changes theme after mount
- **WHEN** the user selects a different theme
- **THEN** ThemeProvider SHALL update the DOM class and persisted key as it does today
- **AND** the bootstrap SHALL not overwrite the later React state
