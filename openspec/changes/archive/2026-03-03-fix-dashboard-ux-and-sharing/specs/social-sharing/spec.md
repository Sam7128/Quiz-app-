# Spec: Social Sharing (Delta)

## MODIFIED Requirements

### Requirement: Bank Acceptance
Users MUST explicitly accept shared content before it is added to their library. Upon acceptance, the system SHALL create entirely new question records with freshly generated UUIDs to avoid RLS policy conflicts with the sender's original data.

#### Scenario: Accepting a Shared Bank
- **WHEN** User B clicks "Accept" on a shared bank from User A
- **THEN** the system SHALL create a new bank owned by User B
- **AND** the system SHALL generate a new UUID via a `generateUUID()` helper function (with fallback for non-HTTPS environments) for each question in the shared bank snapshot
- **AND** the system SHALL save all questions with the new UUIDs to User B's bank
- **AND** the bank SHALL persist with the correct question count after User B navigates away and returns
- **AND** no 403 Forbidden errors SHALL occur during the save operation

#### Scenario: Shared bank data integrity after navigation
- **WHEN** User B has accepted a shared bank
- **AND** User B navigates away from the social page to the Dashboard
- **AND** User B returns to the Dashboard
- **THEN** the accepted bank SHALL display the correct number of questions (matching the original shared bank)
- **AND** the questions SHALL be fully accessible for quizzes
