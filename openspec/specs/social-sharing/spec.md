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
Users MUST explicitly accept shared content before it is added to their library.

#### Scenario: Accepting a Shared Bank
User B sees "Math 101 from User A" in their Inbox. They click "Preview" or "Accept". On Accept, the bank is saved to User B's local storage as a new bank.

## MODIFIED Requirements

### Requirement: Challenge Data Fetching (Modified)
The `getMyChallenges()` function MUST fetch challenge data and related profile/bank information without causing PostgREST 400 errors.

#### Scenario: Fetching challenges with joined profile data
- **WHEN** the app calls `getMyChallenges()`
- **THEN** the Supabase query fetches raw challenges
- **AND** the app manually queries and joins related `profiles` and `bank` data
- **AND** the response status is `200 OK` (not `400 Bad Request`)

