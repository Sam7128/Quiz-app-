# Spec: Social Service Layer

## Purpose
Decouple UI components from data access logic for social and sharing features, improving maintainability and testability.

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

### Requirement: Only the invited party can accept a friend request
`acceptFriendRequest()` SHALL 限制僅有被邀請方（`friend_id` 等於當前用戶 ID）可以接受好友請求，發起方不得自我核准。

#### Scenario: Invited user accepts request
- **WHEN** 被邀請方（`friend_id` === 當前用戶 ID）呼叫 `acceptFriendRequest(friendshipId)`
- **THEN** 系統 SHALL 將 friendship 狀態更新為 `accepted`
- **AND** Supabase 更新查詢 SHALL 使用 `.eq('id', friendshipId).eq('friend_id', userId)` 而非 `.or(...)`

#### Scenario: Initiator attempts self-acceptance
- **WHEN** 邀請發起方（`user_id` === 當前用戶 ID 且 `friend_id` !== 當前用戶 ID）呼叫 `acceptFriendRequest(friendshipId)`
- **THEN** 系統 SHALL NOT 更新任何記錄（Supabase query 不匹配 any 行）
- **AND** 系統 SHALL 不拋出錯誤（靜默失敗，因為 Supabase 的 `.eq` 不匹配只是返回空結果）
