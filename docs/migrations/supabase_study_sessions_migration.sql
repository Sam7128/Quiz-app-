-- Study Sessions Migration for MindSpark
-- Tracks learning sessions for analytics

create table study_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  session_date date not null default current_date,
  questions_answered integer default 0 not null check (questions_answered >= 0),
  correct_count integer default 0 not null check (correct_count >= 0),
  session_duration integer default 0 not null check (session_duration >= 0), -- in seconds
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table study_sessions enable row level security;

-- Policies
create policy "Users can view own study sessions." on study_sessions
  for select using (auth.uid() = user_id);

create policy "Users can insert own study sessions." on study_sessions
  for insert with check (auth.uid() = user_id);

create policy "Users can update own study sessions." on study_sessions
  for update using (auth.uid() = user_id);

-- Index for efficient queries
create index idx_study_sessions_user_date on study_sessions(user_id, session_date desc);

-- Aggregated stats view for 30-day summary
create or replace view user_study_stats_30day as
select 
  user_id,
  count(distinct session_date) as study_days,
  sum(questions_answered) as total_questions,
  sum(correct_count) as total_correct,
  case when sum(questions_answered) > 0 
    then round(sum(correct_count)::numeric / sum(questions_answered)::numeric * 100, 1)
    else 0 
  end as accuracy_rate,
  sum(session_duration) as total_duration_seconds
from study_sessions
where session_date >= current_date - interval '30 days'
group by user_id;
