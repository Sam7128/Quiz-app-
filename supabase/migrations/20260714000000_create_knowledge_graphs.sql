create table if not exists public.knowledge_graphs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  graph_data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists knowledge_graphs_user_id_idx
  on public.knowledge_graphs (user_id);

alter table public.knowledge_graphs enable row level security;

drop policy if exists "Users can manage own knowledge graphs" on public.knowledge_graphs;
create policy "Users can manage own knowledge graphs"
  on public.knowledge_graphs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
