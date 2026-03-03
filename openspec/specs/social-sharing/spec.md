# Spec: Social Sharing

## ADDED Requirements

### Requirement: Friend Management
Users MUST be able to add other users as friends to facilitate sharing.

#### Scenario: Sending Friend Request
User A enters User B's email. User B appears in "Pending". Once User B accepts, they become "Friends".

### Requirement: Direct Bank Sharing
Users SHALL be able to send a copy of a Question Bank to a friend.

#### Scenario: Sharing a Bank
User A clicks "Share" on "Math 101". Selects User B. User B receives a notification.

### Requirement: Bank Acceptance
Users MUST explicitly accept shared content before it is added to their library. Upon acceptance, the system SHALL create entirely new question records with freshly generated UUIDs to avoid RLS policy conflicts with the sender's original data.

#### Scenario: Accepting a Shared Bank
- **WHEN** User B sees "Math 101 from User A" in their Inbox
- **AND** User B clicks "Accept"
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
