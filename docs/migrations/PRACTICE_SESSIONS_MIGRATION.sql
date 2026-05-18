-- Chunked Practice Session migration
-- OpenSpec change: chunked-practice-cloud-sync

CREATE TABLE IF NOT EXISTS public.practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_ids UUID[] NOT NULL DEFAULT '{}',
  bank_names TEXT[] NOT NULL DEFAULT '{}',
  bank_question_map JSONB NOT NULL DEFAULT '{}'::jsonb,
  chunk_size INTEGER NOT NULL CHECK (chunk_size > 0),
  question_ids TEXT[] NOT NULL DEFAULT '{}',
  chunks JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_practice_sessions_user_status
  ON public.practice_sessions(user_id, status);

CREATE INDEX IF NOT EXISTS idx_practice_sessions_user_status_updated_at
  ON public.practice_sessions(user_id, status, updated_at DESC);

ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own practice sessions." ON public.practice_sessions;
CREATE POLICY "Users can view own practice sessions."
  ON public.practice_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own practice sessions." ON public.practice_sessions;
CREATE POLICY "Users can insert own practice sessions."
  ON public.practice_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own practice sessions." ON public.practice_sessions;
CREATE POLICY "Users can update own practice sessions."
  ON public.practice_sessions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own practice sessions." ON public.practice_sessions;
CREATE POLICY "Users can delete own practice sessions."
  ON public.practice_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_practice_sessions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_practice_sessions_updated_at ON public.practice_sessions;
CREATE TRIGGER trg_practice_sessions_updated_at
  BEFORE UPDATE ON public.practice_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_practice_sessions_updated_at();
