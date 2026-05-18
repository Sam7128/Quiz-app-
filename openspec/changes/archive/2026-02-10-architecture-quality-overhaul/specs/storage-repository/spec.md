# Spec: Storage Repository

## ADDED Requirements

### Requirement: Repository Interface
The application SHALL define an `IStorageRepository` interface that unifies all storage operations regardless of backend (localStorage vs Supabase).

#### Scenario: Interface covers all storage domains
- **WHEN** the `IStorageRepository` interface is defined
- **THEN** it SHALL include methods for: banks, questions, mistakes, analytics, streaks, achievements, and spaced repetition
- **THEN** each method SHALL have typed parameters and return values with no `any` types

### Requirement: Local Repository Implementation
The application SHALL provide a `LocalStorageRepository` class that implements `IStorageRepository` using localStorage.

#### Scenario: Guest user storage operations
- **WHEN** a guest user (no auth) performs any storage operation
- **THEN** the `LocalStorageRepository` SHALL handle the operation using localStorage
- **THEN** behavior SHALL be identical to the current localStorage-based logic

### Requirement: Cloud Repository Implementation
The application SHALL provide a `CloudStorageRepository` class that implements `IStorageRepository` using Supabase.

#### Scenario: Authenticated user storage operations
- **WHEN** an authenticated user performs any storage operation
- **THEN** the `CloudStorageRepository` SHALL handle the operation via Supabase API
- **THEN** behavior SHALL be identical to the current Supabase-based logic

### Requirement: Repository Factory
The application SHALL provide a factory function or context that automatically provides the correct repository based on authentication state.

#### Scenario: Automatic backend selection
- **WHEN** a component calls `useRepository()` while user is authenticated
- **THEN** the Cloud repository SHALL be returned
- **WHEN** a component calls `useRepository()` while user is a guest
- **THEN** the Local repository SHALL be returned

### Requirement: Eliminate dual-track branching
All existing `if (user) { cloudFunction() } else { localFunction() }` patterns SHALL be replaced with single `repository.method()` calls.

#### Scenario: No user-conditional storage branching
- **WHEN** the codebase is searched for patterns like `if.*user.*cloud|if.*user.*Cloud`
- **THEN** zero storage-related conditional branches are found in component/hook code
