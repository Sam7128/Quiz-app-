# Spec: Type Safety & Security

## ADDED Requirements

### Requirement: Zero Type Assertions
The codebase SHALL contain zero `as any` type assertions and zero `@ts-ignore` comments.

#### Scenario: No as-any in codebase
- **WHEN** the codebase is searched for `as any` outside of test files
- **THEN** zero results are found

#### Scenario: No ts-ignore in codebase
- **WHEN** the codebase is searched for `@ts-ignore` outside of test files
- **THEN** zero results are found

### Requirement: Type-Safe Answer Handling
A type guard function SHALL be provided for `Question.answer` to safely handle the `string | string[]` union type.

#### Scenario: Single answer type guard
- **WHEN** `isMultipleAnswer(question)` is called on a question with `answer: "useEffect"`
- **THEN** it SHALL return `false`

#### Scenario: Multiple answer type guard
- **WHEN** `isMultipleAnswer(question)` is called on a question with `answer: ["A", "B"]`
- **THEN** it SHALL return `true`

### Requirement: CSP Hardening
The Content Security Policy SHALL be tightened for production builds.

#### Scenario: No unsafe-eval in production
- **WHEN** the application is built for production (`npm run build`)
- **THEN** the CSP SHALL NOT include `unsafe-eval`

#### Scenario: connect-src whitelist
- **WHEN** the CSP `connect-src` directive is examined
- **THEN** it SHALL list specific domains (Supabase, Google AI, NVIDIA API) instead of blanket `https:`
