-- Spaced Repetition Migration for MindSpark
-- Creates question_progress table for SM-2 algorithm tracking

-- Question Progress Table (SM-2 data)
create table question_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  question_id text not null, -- Can be local or UUID from questions table
  easiness_factor numeric(4, 2) default 2.5 not null check (easiness_factor >= 1.3),
  interval integer default 0 not null check (interval >= 0),
  repetitions integer default 0 not null check (repetitions >= 0),
  next_review_date bigint not null, -- Unix timestamp in milliseconds
  last_review_date bigint, -- Unix timestamp in milliseconds
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Ensure one progress record per user per question
  constraint unique_user_question unique (user_id, question_id)
);

-- Enable RLS
alter table question_progress enable row level security;

-- Policies
create policy "Users can view own question progress." on question_progress
  for select using (auth.uid() = user_id);

create policy "Users can insert own question progress." on question_progress
  for insert with check (auth.uid() = user_id);

create policy "Users can update own question progress." on question_progress
  for update using (auth.uid() = user_id);

create policy "Users can delete own question progress." on question_progress
  for delete using (auth.uid() = user_id);

-- Index for efficient queries
create index idx_question_progress_user_id on question_progress(user_id);
create index idx_question_progress_next_review on question_progress(user_id, next_review_date);

-- Function to update updated_at timestamp
create or replace function update_question_progress_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Trigger to auto-update updated_at
create trigger question_progress_updated_at
  before update on question_progress
  for each row execute function update_question_progress_updated_at();
