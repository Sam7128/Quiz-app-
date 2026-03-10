-- 2026-03-01 Supabase Security Hardening Migration
-- 1. Enable RLS on all target tables
-- 2. Define robust Row Level Security Policies
-- 3. Fix Function Search Path for handle_new_user
-- 4. Secure Views and Aggregated Stats
-- 5. Hardening constraints based on Stress Test Findings

-- [Phase 2: RLS Implementation]

-- study_sessions
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own study sessions." ON public.study_sessions;
CREATE POLICY "Users can view own study sessions." ON public.study_sessions
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own study sessions." ON public.study_sessions;
CREATE POLICY "Users can insert own study sessions." ON public.study_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own study sessions." ON public.study_sessions;
CREATE POLICY "Users can update own study sessions." ON public.study_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- user_streaks
-- Defensive: Ensure user_id is NOT NULL (Stress Test Issue-001)
ALTER TABLE public.user_streaks ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own streak." ON public.user_streaks;
CREATE POLICY "Users can view own streak." ON public.user_streaks
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own streak." ON public.user_streaks;
CREATE POLICY "Users can insert own streak." ON public.user_streaks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own streak." ON public.user_streaks;
CREATE POLICY "Users can update own streak." ON public.user_streaks
  FOR UPDATE USING (auth.uid() = user_id);

-- user_achievements
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own achievements." ON public.user_achievements;
CREATE POLICY "Users can view own achievements." ON public.user_achievements
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own achievements." ON public.user_achievements;
CREATE POLICY "Users can insert own achievements." ON public.user_achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- challenges (Harden policy for both participants - Stress Test Issue-003)
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view challenges they are part of." ON public.challenges;
CREATE POLICY "Users can view challenges they are part of." ON public.challenges
  FOR SELECT USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);
DROP POLICY IF EXISTS "Users can insert challenges." ON public.challenges;
CREATE POLICY "Users can insert challenges." ON public.challenges
  FOR INSERT WITH CHECK (auth.uid() = challenger_id);
DROP POLICY IF EXISTS "Users can update their challenges." ON public.challenges;
CREATE POLICY "Users can update their challenges." ON public.challenges
  FOR UPDATE USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

-- [Phase 3: Function Defenses]

-- Fix handle_new_user search_path (Task 3.1 & Stress Test Issue-004)
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;

-- [Phase 4: Security for user_study_stats_30day]
-- Since the database reports "user_study_stats_30day" is a table (not a view),
-- we apply table-level Row Level Security here to satisfy the security warning.
ALTER TABLE public.user_study_stats_30day ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own 30day stats." ON public.user_study_stats_30day;
CREATE POLICY "Users can view own 30day stats." ON public.user_study_stats_30day
  FOR SELECT USING (auth.uid() = user_id);

-- Note: If you ever drop this table and recreate it as a VIEW (as per the migration script),
-- you should append `WITH (security_invoker = ON)` to the CREATE VIEW statement instead.

-- [Stress Test Issue-002: Cascade Deletes]
-- Ensure foreign keys on user_id are set to ON DELETE CASCADE
-- This assumes profiles(id) is the parent user identifier in public schema
ALTER TABLE public.study_sessions DROP CONSTRAINT IF EXISTS study_sessions_user_id_fkey, ADD CONSTRAINT study_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.user_streaks DROP CONSTRAINT IF EXISTS user_streaks_user_id_fkey, ADD CONSTRAINT user_streaks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.user_achievements DROP CONSTRAINT IF EXISTS user_achievements_user_id_fkey, ADD CONSTRAINT user_achievements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.challenges DROP CONSTRAINT IF EXISTS challenges_challenger_id_fkey, ADD CONSTRAINT challenges_challenger_id_fkey FOREIGN KEY (challenger_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.challenges DROP CONSTRAINT IF EXISTS challenges_opponent_id_fkey, ADD CONSTRAINT challenges_opponent_id_fkey FOREIGN KEY (opponent_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
