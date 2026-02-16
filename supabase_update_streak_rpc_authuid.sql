-- Rewrite update_streak RPC:
-- - Remove p_user_id parameter
-- - Use auth.uid()
-- - Security: set search_path = public
-- - Correctness: IF NOT FOUND for first insert

drop function if exists public.update_streak(uuid);
drop function if exists public.update_streak();

create or replace function public.update_streak()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_last_date date;
  v_current_streak integer;
  v_longest_streak integer;
  v_today date := current_date;
  v_yesterday date := (current_date - interval '1 day')::date;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select last_study_date, current_streak, longest_streak
  into v_last_date, v_current_streak, v_longest_streak
  from public.user_streaks
  where user_id = v_user_id;

  if not found then
    insert into public.user_streaks (user_id, current_streak, longest_streak, last_study_date, updated_at)
    values (v_user_id, 1, 1, v_today, timezone('utc'::text, now()))
    on conflict (user_id) do update
      set current_streak = excluded.current_streak,
          longest_streak = excluded.longest_streak,
          last_study_date = excluded.last_study_date,
          updated_at = excluded.updated_at;
    return;
  end if;

  -- If already studied today, do nothing
  if v_last_date = v_today then
    return;
  end if;

  -- If studied yesterday, increment streak; otherwise reset to 1
  if v_last_date = v_yesterday then
    v_current_streak := v_current_streak + 1;
  else
    v_current_streak := 1;
  end if;

  v_longest_streak := greatest(coalesce(v_longest_streak, 0), v_current_streak);

  update public.user_streaks
  set current_streak = v_current_streak,
      longest_streak = v_longest_streak,
      last_study_date = v_today,
      updated_at = timezone('utc'::text, now())
  where user_id = v_user_id;
end;
$$;

