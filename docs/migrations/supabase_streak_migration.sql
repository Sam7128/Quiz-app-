-- Streak System Migration for MindSpark
-- Tracks daily learning streaks

create table user_streaks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  current_streak integer default 0 not null check (current_streak >= 0),
  longest_streak integer default 0 not null check (longest_streak >= 0),
  last_study_date date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  constraint unique_user_streak unique (user_id)
);

-- Enable RLS
alter table user_streaks enable row level security;

-- Policies
create policy "Users can view own streak." on user_streaks
  for select using (auth.uid() = user_id);

create policy "Users can insert own streak." on user_streaks
  for insert with check (auth.uid() = user_id);

create policy "Users can update own streak." on user_streaks
  for update using (auth.uid() = user_id);

-- Function to update streak
create or replace function update_streak(p_user_id uuid)
returns void as $$
declare
  v_last_date date;
  v_current_streak integer;
  v_longest_streak integer;
  v_today date := current_date;
  v_yesterday date := current_date - interval '1 day';
begin
  -- Get current streak data
  select last_study_date, current_streak, longest_streak
  into v_last_date, v_current_streak, v_longest_streak
  from user_streaks
  where user_id = p_user_id;
  
  -- If no record exists, create one
  if v_last_date is null then
    insert into user_streaks (user_id, current_streak, longest_streak, last_study_date)
    values (p_user_id, 1, 1, v_today);
    return;
  end if;
  
  -- If already studied today, do nothing
  if v_last_date = v_today then
    return;
  end if;
  
  -- If studied yesterday, increment streak
  if v_last_date = v_yesterday then
    v_current_streak := v_current_streak + 1;
    if v_current_streak > v_longest_streak then
      v_longest_streak := v_current_streak;
    end if;
  else
    -- Streak broken, reset to 1
    v_current_streak := 1;
  end if;
  
  -- Update record
  update user_streaks
  set current_streak = v_current_streak,
      longest_streak = v_longest_streak,
      last_study_date = v_today,
      updated_at = timezone('utc'::text, now())
  where user_id = p_user_id;
end;
$$ language plpgsql security definer;
