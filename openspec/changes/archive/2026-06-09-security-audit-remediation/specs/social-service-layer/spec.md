## MODIFIED Requirements

### Requirement: Only the invited party can accept a friend request
`acceptFriendRequest()` SHALL 限制僅有被邀請方（`friend_id` 等於當前用戶 ID）可以接受好友請求，發起方不得自我核准。

#### Scenario: Invited user accepts request
- **WHEN** 被邀請方（`friend_id` === 當前用戶 ID）呼叫 `acceptFriendRequest(friendshipId)`
- **THEN** 系統 SHALL 將 friendship 狀態更新為 `accepted`
- **AND** Supabase 更新查詢 SHALL 使用 `.eq('id', friendshipId).eq('friend_id', userId)` 而非 `.or(...)`

#### Scenario: Initiator attempts self-acceptance
- **WHEN** 邀請發起方（`user_id` === 當前用戶 ID 且 `friend_id` !== 當前用戶 ID）呼叫 `acceptFriendRequest(friendshipId)`
- **THEN** 系統 SHALL NOT 更新任何記錄（Supabase query 不匹配任何行）
- **AND** 系統 SHALL 不拋出錯誤（靜默失敗，因為 Supabase 的 `.eq` 不匹配只是返回空結果）
