-- Broadcaster feedback form storage
-- Run this once in Supabase SQL Editor before sharing feedback.html.
-- Admin viewing is handled by supabase/functions/broadcaster-feedback-admin,
-- which checks x-admin-password and reads with the service role key.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.broadcaster_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  full_name TEXT NOT NULL,
  frequency TEXT NOT NULL,
  used_sections TEXT[] NOT NULL DEFAULT '{}',
  help_rating INTEGER NOT NULL CHECK (help_rating BETWEEN 1 AND 5),
  most_useful TEXT NOT NULL,
  missing_info TEXT[] NOT NULL DEFAULT '{}',
  top_features TEXT[] NOT NULL DEFAULT '{}' CHECK (array_length(top_features, 1) BETWEEN 1 AND 3),
  blockers TEXT,
  ideas TEXT,
  category TEXT,
  priority TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  page_url TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_broadcaster_feedback_submitted_at
  ON public.broadcaster_feedback(submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_broadcaster_feedback_help_rating
  ON public.broadcaster_feedback(help_rating);

ALTER TABLE public.broadcaster_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit broadcaster feedback" ON public.broadcaster_feedback;
CREATE POLICY "Anyone can submit broadcaster feedback"
  ON public.broadcaster_feedback
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can read broadcaster feedback" ON public.broadcaster_feedback;
CREATE POLICY "Authenticated users can read broadcaster feedback"
  ON public.broadcaster_feedback
  FOR SELECT
  TO authenticated
  USING (true);

GRANT INSERT ON public.broadcaster_feedback TO anon, authenticated;
GRANT SELECT ON public.broadcaster_feedback TO authenticated;

-- Admin read helper for feedback_responses.html.
-- This avoids exposing SELECT to anon and avoids requiring an Edge Function deploy.
-- If ADMIN_PASSWORD changes in js/config.js, update the password below as well.
CREATE OR REPLACE FUNCTION public.get_broadcaster_feedback(
  p_admin_password TEXT,
  p_limit INTEGER DEFAULT 500
)
RETURNS TABLE (
  id UUID,
  submitted_at TIMESTAMP WITH TIME ZONE,
  full_name TEXT,
  frequency TEXT,
  used_sections TEXT[],
  help_rating INTEGER,
  most_useful TEXT,
  missing_info TEXT[],
  top_features TEXT[],
  blockers TEXT,
  ideas TEXT,
  category TEXT,
  priority TEXT,
  status TEXT,
  page_url TEXT,
  user_agent TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_admin_password IS DISTINCT FROM 'UriPixellot1982!' THEN
    RAISE EXCEPTION 'Invalid admin password' USING ERRCODE = '28000';
  END IF;

  RETURN QUERY
  SELECT
    bf.id,
    bf.submitted_at,
    bf.full_name,
    bf.frequency,
    bf.used_sections,
    bf.help_rating,
    bf.most_useful,
    bf.missing_info,
    bf.top_features,
    bf.blockers,
    bf.ideas,
    bf.category,
    bf.priority,
    bf.status,
    bf.page_url,
    bf.user_agent
  FROM public.broadcaster_feedback bf
  ORDER BY bf.submitted_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 500), 1), 1000);
END;
$$;

REVOKE ALL ON FUNCTION public.get_broadcaster_feedback(TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_broadcaster_feedback(TEXT, INTEGER) TO anon, authenticated;
