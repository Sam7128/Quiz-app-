## ADDED Requirements

### Requirement: Social Operations in Service Layer
All Supabase queries related to friendships, sharing, and social features MUST be encapsulated in `services/socialService.ts`. UI components SHALL NOT directly import or use the `supabase` client for social operations.

#### Scenario: Social.tsx uses service layer
- **WHEN** `Social.tsx` needs to fetch friends list
- **THEN** it SHALL call `getFriendsAndInbox()` from `services/socialService.ts`
- **AND** it SHALL NOT contain any `supabase.from(...)` calls

#### Scenario: ShareModal.tsx uses service layer
- **WHEN** `ShareModal.tsx` needs to share a bank
- **THEN** it SHALL call `shareBank()` from `services/socialService.ts`
- **AND** it SHALL NOT contain any `supabase.from(...)` calls

### Requirement: Friendship Delete RLS Policy
The `friendships` table in Supabase MUST have a DELETE policy allowing either party of a friendship to delete the record.

#### Scenario: User deletes a friendship
- **WHEN** User A calls `supabase.from('friendships').delete().eq('id', friendshipId)`
- **AND** User A is either `user_id` or `friend_id` of that friendship
- **THEN** the deletion SHALL succeed (not blocked by RLS)
