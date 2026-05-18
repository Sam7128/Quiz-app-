## ADDED Requirements

### Requirement: Stable Question IDs
Every question MUST have a stable, unique UUID that persists across save operations. The system SHALL use `crypto.randomUUID()` to generate IDs at question creation time if no ID is provided. Non-UUID IDs (numbers, short strings) MUST be normalized to UUID format before cloud storage operations.

#### Scenario: New question gets stable ID
- **WHEN** a user creates a question (via import, AI generation, or manual entry)
- **AND** the question does not already have an `id` field
- **THEN** the system SHALL assign a UUID via `crypto.randomUUID()`
- **AND** this ID SHALL remain unchanged for the lifetime of that question

#### Scenario: Non-UUID id is normalized
- **WHEN** a question has a non-UUID `id` (numeric, short string, etc.)
- **AND** the question is being saved to cloud storage (Supabase)
- **THEN** the system SHALL replace the `id` with a newly generated UUID
- **AND** the old non-UUID id SHALL be discarded (it is incompatible with Supabase's uuid column type)

### Requirement: Cloud Save Preserves Question IDs
The `saveCloudQuestions` function MUST use Supabase `upsert` (with `onConflict: 'id'`) instead of delete-and-reinsert. Question IDs MUST be included in the upsert payload.

#### Scenario: Saving questions to cloud preserves IDs
- **WHEN** a user saves a bank with 5 questions to Supabase
- **THEN** each question row SHALL retain its original `id` value
- **AND** the `question_progress` (spaced repetition) records linked to these IDs SHALL remain valid

#### Scenario: Deleted questions are cleaned up
- **WHEN** a user deletes 2 of 5 questions from a bank and saves
- **THEN** the 3 remaining questions SHALL be upserted with their original IDs
- **AND** the 2 deleted questions SHALL be removed from the `questions` table
- **AND** the operation SHALL NOT use a full delete-then-reinsert strategy

### Requirement: Cloud createBank Error Handling
When `createCloudBank` fails (returns `null`), `CloudStorageRepository.createBank` MUST throw an error instead of returning a `BankMetadata` with `id: ''`.

#### Scenario: createBank failure propagates error
- **WHEN** `createCloudBank` returns `null` (Supabase error)
- **THEN** `CloudStorageRepository.createBank` SHALL throw an `Error`
- **AND** the calling code SHALL catch and display a user-friendly error message
