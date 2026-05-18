## ADDED Requirements

### Requirement: Challenge Zero Score Completion
The challenge system MUST correctly handle the case where a participant scores 0 points. A score of 0 MUST be treated as a valid submitted score, not as "not yet submitted".

#### Scenario: Opponent scores 0
- **WHEN** the challenger submits their score
- **AND** the opponent's score is 0 (not null)
- **THEN** the challenge SHALL be marked as `completed`
- **AND** the winner SHALL be determined by comparing the scores

#### Scenario: Opponent has not submitted
- **WHEN** the challenger submits their score
- **AND** the opponent's score is `null`
- **THEN** the challenge SHALL remain `active` (not completed)

## MODIFIED Requirements

### Requirement: Challenge Data Fetching (Modified)
The `getMyChallenges()` function MUST fetch challenge data and related profile/bank information without causing PostgREST 400 errors.

#### Scenario: Fetching challenges with joined profile data
- **WHEN** the app calls `getMyChallenges()`
- **THEN** the Supabase query fetches raw challenges
- **AND** the app manually queries and joins related `profiles` and `bank` data
- **AND** the response status is `200 OK` (not `400 Bad Request`)
