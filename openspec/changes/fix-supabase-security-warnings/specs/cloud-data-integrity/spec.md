## MODIFIED Requirements

### Requirement: Cloud Save Preserves Question IDs
The `saveCloudQuestions` function MUST use Supabase `upsert` (with `onConflict: 'id'`) instead of delete-and-reinsert. Question IDs MUST be included in the upsert payload. Furthermore, the storage tables involved MUST be protected by Row Level Security (RLS) to ensure that the process cannot be exploited to overwrite or upsert IDs belonging to other users.

#### Scenario: Saving questions to cloud preserves IDs with Authorization
- **WHEN** an authenticated user saves a bank with 5 questions to Supabase
- **THEN** each question row SHALL retain its original `id` value
- **AND** the database SHALL accept the upsert ONLY if the user owns the resources being overwritten
- **AND** the `question_progress` (spaced repetition) records linked to these IDs SHALL remain valid

#### Scenario: Deleted questions are cleaned up
- **WHEN** an authenticated user deletes 2 of 5 questions from a bank and saves
- **THEN** the 3 remaining questions SHALL be upserted with their original IDs
- **AND** the 2 deleted questions SHALL be removed from the `questions` table
- **AND** the operation SHALL NOT use a full delete-then-reinsert strategy
- **AND** the database SHALL block deletion commands if the user is not authorized
