-- Broadcaster feedback form storage
-- Run this once in Supabase SQL Editor before sharing feedback.html.
-- Admin viewing uses Supabase Auth and requires app_metadata.role = 'admin'.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.broadcaster_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  full_name TEXT NOT NULL CHECK (char_length(full_name) BETWEEN 1 AND 120),
  frequency TEXT NOT NULL CHECK (char_length(frequency) <= 80),
  used_sections TEXT[] NOT NULL DEFAULT '{}',
  help_rating INTEGER NOT NULL CHECK (help_rating BETWEEN 1 AND 5),
  most_useful TEXT NOT NULL CHECK (char_length(most_useful) <= 4000),
  missing_info TEXT[] NOT NULL DEFAULT '{}',
  top_features TEXT[] NOT NULL DEFAULT '{}' CHECK (cardinality(top_features) BETWEEN 0 AND 3),
  blockers TEXT CHECK (char_length(blockers) <= 4000),
  ideas TEXT CHECK (char_length(ideas) <= 4000),
  category TEXT,
  priority TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  page_url TEXT CHECK (char_length(page_url) <= 2000),
  user_agent TEXT CHECK (char_length(user_agent) <= 1000)
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
  WITH CHECK (
    status = 'new'
    AND category IS NULL
    AND priority IS NULL
  );

DROP POLICY IF EXISTS "Authenticated users can read broadcaster feedback" ON public.broadcaster_feedback;
CREATE POLICY "Authenticated users can read broadcaster feedback"
  ON public.broadcaster_feedback
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

REVOKE INSERT ON public.broadcaster_feedback FROM anon, authenticated;
GRANT INSERT (
  full_name, frequency, used_sections, help_rating, most_useful,
  missing_info, top_features, blockers, ideas, page_url, user_agent
) ON public.broadcaster_feedback TO anon, authenticated;
GRANT SELECT ON public.broadcaster_feedback TO authenticated;

DROP FUNCTION IF EXISTS public.get_broadcaster_feedback(TEXT, INTEGER);
