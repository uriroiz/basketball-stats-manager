-- ========================================
-- Fix RLS Policies for player_names table
-- Run this in Supabase SQL Editor
-- ========================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Authenticated users can insert player names" ON public.player_names;
DROP POLICY IF EXISTS "Authenticated users can update player names" ON public.player_names;
DROP POLICY IF EXISTS "Authenticated users can delete player names" ON public.player_names;

DROP POLICY IF EXISTS "Anyone can insert player names" ON public.player_names;
DROP POLICY IF EXISTS "Anyone can update player names" ON public.player_names;
DROP POLICY IF EXISTS "Admin users can manage player names" ON public.player_names;

CREATE POLICY "Admin users can manage player names" ON public.player_names
    FOR ALL TO authenticated
    USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
    WITH CHECK ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ RLS policies updated successfully!';
    RAISE NOTICE 'player_names is writable only by authenticated administrators.';
END $$;

-- ========================================
-- SECURITY NOTE:
-- ========================================
-- Assign the administrator via Supabase Auth app_metadata.role = "admin".
-- Never place the service-role key or an administrator password in browser code.
-- ========================================




