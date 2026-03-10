-- Add DELETE policy for friendships table.
-- Required so users can remove friends / cancel requests under RLS.

drop policy if exists "Users can delete own friendships" on friendships;
create policy "Users can delete own friendships" on friendships
  for delete using (auth.uid() = user_id or auth.uid() = friend_id);

