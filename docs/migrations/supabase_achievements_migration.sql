-- Achievements Migration for MindSpark
-- Tracks unlocked achievements

create table user_achievements (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  achievement_id varchar(50) not null,
  unlocked_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  constraint unique_user_achievement unique (user_id, achievement_id)
);

-- Enable RLS
alter table user_achievements enable row level security;

-- Policies
create policy "Users can view own achievements." on user_achievements
  for select using (auth.uid() = user_id);

create policy "Users can insert own achievements." on user_achievements
  for insert with check (auth.uid() = user_id);

-- Index
CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
