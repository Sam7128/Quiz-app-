# Spec: Storage Key Registry

## Purpose
Centralize localStorage key management and ensure app stability by preventing stale data and cleanup legacy artifacts.

## ADDED Requirements

### Requirement: Centralized Storage Keys
All localStorage key strings MUST be defined in a single registry (e.g., `STORAGE_KEYS` in `services/storage.ts`). Hardcoded `mindspark_*` strings in hooks, contexts, and services MUST be replaced with references to this registry.

#### Scenario: No hardcoded localStorage keys
- **WHEN** a developer searches for `'mindspark_` in hooks, contexts, and services
- **THEN** no hardcoded key strings SHALL be found
- **AND** all keys (including `mindspark_graphs` for knowledge diagrams) SHALL reference `STORAGE_KEYS.<name>` from the central registry
- **AND** the Beta feature flags SHALL be integrated within the `mindspark_settings` key

### Requirement: Legacy File Cleanup
The following files/directories MUST be removed: `src/services/supabase.ts`, `src/contexts/AuthContext.tsx` (if unused), and the `nul` file in the project root.

#### Scenario: No legacy src files
- **WHEN** a developer checks the `src/` directory
- **THEN** `src/services/supabase.ts` SHALL NOT exist
- **AND** `src/contexts/AuthContext.tsx` SHALL NOT exist (unless actively imported)
- **AND** the root-level `nul` file SHALL NOT exist

### Requirement: Stale Response Prevention
The `loadQuizPool` function in `useAppDataLoader` MUST discard results from outdated requests using a version counter or AbortController pattern.

#### Scenario: Rapid bank selection changes
- **WHEN** a user rapidly changes bank selection 3 times (A → B → C)
- **THEN** only the response for selection C SHALL be applied to state
- **AND** responses from selections A and B SHALL be discarded if they arrive after C
