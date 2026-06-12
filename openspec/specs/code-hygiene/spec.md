# Spec: Code Hygiene

## Purpose
TBD - Manage code cleanliness, including dead code removal, dependency cleanup, and keeping codebase type-safe and buildable.

## Requirements

### Requirement: Dead code removal SHALL preserve existing functionality
The dead code cleanup process SHALL remove only code that has been verified as unreferenced through both automated scanning (`knip`) and manual cross-reference verification (`grep`). No removal SHALL alter any observable behavior of the application.

#### Scenario: Build passes after all cleanup phases
- **WHEN** all dead code cleanup tasks are completed
- **THEN** `npm run build` SHALL complete with zero errors

#### Scenario: All tests pass after cleanup
- **WHEN** all dead code cleanup tasks are completed
- **THEN** `npm test` SHALL pass with the same or higher pass rate as before the cleanup

#### Scenario: TypeScript compilation remains clean
- **WHEN** any export is removed or function is deleted
- **THEN** `npx tsc --noEmit` SHALL complete with zero type errors

### Requirement: Export scope reduction SHALL not break internal usage
When removing the `export` keyword from a symbol (function, type, constant), the system SHALL verify that the symbol is still usable within its defining file. Symbols that are used internally but not externally SHALL have their `export` removed, not their definition.

#### Scenario: Internal function remains callable after export removal
- **WHEN** `export` is removed from `cleanJsonResponse` in `services/ai.ts`
- **THEN** the function SHALL remain callable at line 298 within the same file
- **AND** `npx tsc --noEmit` SHALL pass

#### Scenario: Internal type remains usable after export removal
- **WHEN** `export` is removed from `MistakeLogEntry` in `types.ts`
- **THEN** the type SHALL remain usable in the `MistakeLog` index signature within the same file
- **AND** `npx tsc --noEmit` SHALL pass

### Requirement: Dependency removal SHALL not break build pipeline
Removing npm dependencies SHALL only be performed after confirming no source file imports or references the package, and the build tool chain does not depend on it.

#### Scenario: Removing classnames does not break build
- **WHEN** `classnames` is uninstalled from dependencies
- **THEN** `npm run build` SHALL succeed
- **AND** no source file SHALL contain `import` from `classnames`

#### Scenario: Removing PostCSS toolchain does not break CSS compilation
- **WHEN** `@tailwindcss/postcss`, `autoprefixer`, and `postcss` are uninstalled
- **AND** the `postcss` override in `package.json` is retained
- **THEN** `npm run build` SHALL succeed with Tailwind CSS compiled correctly via `@tailwindcss/vite`

### Requirement: Duplicate export cleanup SHALL preserve named exports
When a file has both a named export (`export const X`) and a default export (`export default X`), only the `export default` statement SHALL be removed. The named export SHALL be preserved.

#### Scenario: Component remains importable after default export removal
- **WHEN** `export default BattleArena` is removed from `components/BattleArena.tsx`
- **THEN** `import { BattleArena } from './components/BattleArena'` SHALL continue to work
- **AND** `npx tsc --noEmit` SHALL pass
