-- 1. Friendships Table
create table friendships (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  friend_id uuid references auth.users on delete cascade not null,
  status text check (status in ('pending', 'accepted')) default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Prevent duplicate requests
  unique(user_id, friend_id),
  constraint no_self_friendship check (user_id != friend_id)
);

alter table friendships enable row level security;

-- Policy: Users can view their own friendships
create policy "Users can view own friendships" on friendships
  for select using (auth.uid() = user_id or auth.uid() = friend_id);

-- Policy: Users can send friend requests
create policy "Users can send friend requests" on friendships
  for insert with check (auth.uid() = user_id);

-- Policy: Users can accept friend requests
create policy "Users can update own friendships" on friendships
  for update using (auth.uid() = friend_id);

-- 2. Shared Banks Table (Inbox)
create table shared_banks (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references auth.users on delete cascade not null,
  receiver_id uuid references auth.users on delete cascade not null,
  bank_snapshot jsonb not null, -- Stores { meta: BankMetadata, questions: Question[] }
  status text check (status in ('pending', 'accepted', 'rejected')) default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table shared_banks enable row level security;

-- Policy: Users can view shared banks they are involved in
create policy "Users can view shared banks" on shared_banks
  for select using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- Policy: Senders can share banks
create policy "Senders can share banks" on shared_banks
  for insert with check (auth.uid() = sender_id);

-- Policy: Receivers can respond to shared banks
create policy "Receivers can update shared banks" on shared_banks
  for update using (auth.uid() = receiver_id);
