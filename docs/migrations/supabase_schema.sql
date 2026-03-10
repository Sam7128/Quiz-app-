-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles Table (Public profile info)
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  username text,
  avatar_url text,
  updated_at timestamp with time zone,
  
  constraint username_length check (char_length(username) >= 3)
);

alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

create policy "Users can insert their own profile." on profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on profiles
  for update using (auth.uid() = id);

-- 2. Banks Table (Quiz Collections)
create table banks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  description text,
  category text,
  is_public boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table banks enable row level security;

create policy "Users can view own banks." on banks
  for select using (auth.uid() = user_id);

create policy "Users can insert own banks." on banks
  for insert with check (auth.uid() = user_id);

create policy "Users can update own banks." on banks
  for update using (auth.uid() = user_id);

create policy "Users can delete own banks." on banks
  for delete using (auth.uid() = user_id);

-- 3. Questions Table
create table questions (
  id uuid default gen_random_uuid() primary key,
  bank_id uuid references banks(id) on delete cascade not null,
  type text check (type in ('single', 'multiple')),
  question text not null,
  options jsonb not null, -- Array of strings
  answer jsonb not null,  -- String or Array of strings
  explanation text,
  hint text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table questions enable row level security;

-- Policy: Access depends on the parent bank's ownership
create policy "Users can view questions of own banks." on questions
  for select using (
    exists ( select 1 from banks where banks.id = questions.bank_id and banks.user_id = auth.uid() )
  );

create policy "Users can insert questions to own banks." on questions
  for insert with check (
    exists ( select 1 from banks where banks.id = questions.bank_id and banks.user_id = auth.uid() )
  );

create policy "Users can update questions of own banks." on questions
  for update using (
    exists ( select 1 from banks where banks.id = questions.bank_id and banks.user_id = auth.uid() )
  );

create policy "Users can delete questions of own banks." on questions
  for delete using (
    exists ( select 1 from banks where banks.id = questions.bank_id and banks.user_id = auth.uid() )
  );

-- 4. Auto-create Profile on Signup
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
