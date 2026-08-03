-- ========================================
-- Add player_names table to existing DB
-- Run this in Supabase SQL Editor
-- ========================================

-- Create table
CREATE TABLE IF NOT EXISTS public.player_names (
  player_id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  jersey TEXT,
  team_id BIGINT,
  team_name TEXT,
  source TEXT DEFAULT 'api' CHECK (source IN ('api', 'manual', 'corrected')),
  notes TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_player_names_team_id ON public.player_names(team_id);
CREATE INDEX IF NOT EXISTS idx_player_names_source ON public.player_names(source);
CREATE INDEX IF NOT EXISTS idx_player_names_name ON public.player_names(name);

-- Enable RLS
ALTER TABLE public.player_names ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read
DROP POLICY IF EXISTS "Anyone can view player names" ON public.player_names;
CREATE POLICY "Anyone can view player names" ON public.player_names
    FOR SELECT USING (true);

-- Policy: only authenticated administrators can insert/update/delete.
DROP POLICY IF EXISTS "Authenticated users can insert player names" ON public.player_names;
CREATE POLICY "Authenticated users can insert player names" ON public.player_names
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Authenticated users can update player names" ON public.player_names;
CREATE POLICY "Authenticated users can update player names" ON public.player_names
    FOR UPDATE TO authenticated
    USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
    WITH CHECK ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Authenticated users can delete player names" ON public.player_names;
CREATE POLICY "Authenticated users can delete player names" ON public.player_names
    FOR DELETE TO authenticated
    USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Trigger for updated_at
CREATE TRIGGER update_player_names_updated_at 
    BEFORE UPDATE ON public.player_names
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ player_names table created successfully!';
    RAISE NOTICE 'Ready to use admin_players.html for syncing.';
END $$;




