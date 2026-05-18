# Spec: Test Infrastructure

## Purpose
Ensure a robust and reliable testing environment by separating units tests from E2E tests and unifying configuration.

## ADDED Requirements

### Requirement: Vitest Must Exclude E2E Tests
Vitest SHALL only execute unit tests located in `src/__tests__/`. E2E tests in `e2e/` MUST NOT be picked up by Vitest's test runner.

#### Scenario: Running npm test excludes E2E
- **WHEN** a developer runs `npm test`
- **THEN** Vitest SHALL only execute files matching `src/__tests__/**/*.test.ts?(x)`
- **AND** files in `e2e/`, `playwright-report/`, and `test-results/` SHALL be excluded
- **AND** the test run SHALL complete without Playwright-related errors

### Requirement: Separate Test Scripts
The project MUST provide separate npm scripts for unit tests and E2E tests.

#### Scenario: Script separation
- **WHEN** developer runs `npm run test:unit`
- **THEN** Vitest SHALL execute unit tests only
- **WHEN** developer runs `npm run test:e2e`
- **THEN** Playwright SHALL execute E2E tests only

### Requirement: Single Test Configuration Source
Test configuration MUST exist in a single file (`vitest.config.ts`). The `test` block in `vite.config.ts` MUST be removed to prevent confusion.

#### Scenario: No duplicate test config
- **WHEN** a developer inspects `vite.config.ts`
- **THEN** there SHALL be no `test` property in the config object
- **AND** all test configuration SHALL reside in `vitest.config.ts`
