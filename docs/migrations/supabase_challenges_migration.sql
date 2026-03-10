-- Friend Challenges Migration for MindSpark
-- Turn-based quiz challenges between friends

create table challenges (
  id uuid default gen_random_uuid() primary key,
  challenger_id uuid references profiles(id) on delete cascade not null,
  opponent_id uuid references profiles(id) on delete cascade not null,
  bank_id uuid references banks(id) on delete cascade not null,
  status varchar(20) default 'pending' check (status in ('pending', 'active', 'completed', 'cancelled')),
  challenger_score integer default 0,
  opponent_score integer default 0,
  current_turn uuid references profiles(id), -- whose turn it is
  winner_id uuid references profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table challenges enable row level security;

-- Policies
create policy "Users can view challenges they are part of." on challenges
  for select using (auth.uid() = challenger_id or auth.uid() = opponent_id);

create policy "Users can create challenges." on challenges
  for insert with check (auth.uid() = challenger_id);

create policy "Users can update their challenges." on challenges
  for update using (auth.uid() = challenger_id or auth.uid() = opponent_id);

-- Index
CREATE INDEX idx_challenges_challenger ON challenges(challenger_id);
CREATE INDEX idx_challenges_opponent ON challenges(opponent_id);
CREATE INDEX idx_challenges_status ON challenges(status);
