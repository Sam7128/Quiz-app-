# Delta Spec: Social Sharing — Challenge Query Fix

**Source**: `openspec/specs/social-sharing/spec.md`
**Reason**: Fix ambiguous FK hint in the `challenges` PostgREST query.

## MODIFIED Requirements

### Requirement: Challenge Data Fetching (Modified)

The `getMyChallenges()` function MUST fetch challenge data and related profile/bank information without causing PostgREST 400 errors.

#### Scenario: Fetching challenges with joined profile data
- **WHEN** the app calls `getMyChallenges()`
- **THEN** the Supabase query fetches raw challenges
- **AND** the app manually queries and joins related `profiles` and `bank` data
- **AND** the response status is `200 OK` (not `400 Bad Request`)
