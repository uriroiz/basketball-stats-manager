-- ========================================
-- Fix RLS Policies for player_names table
-- Run this in Supabase SQL Editor
-- ========================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Authenticated users can insert player names" ON public.player_names;
DROP POLICY IF EXISTS "Authenticated users can update player names" ON public.player_names;

-- Create permissive policies for admin operations
-- Option 1: Allow all (simple, less secure)
CREATE POLICY "Anyone can insert player names" ON public.player_names
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update player names" ON public.player_names
    FOR UPDATE USING (true);

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ RLS policies updated successfully!';
    RAISE NOTICE 'player_names table is now writable from admin page.';
END $$;

-- ========================================
-- SECURITY NOTE:
-- ========================================
-- This allows anyone with the anon key to write to player_names.
-- 
-- For better security, you can either:
-- 1. Use Service Role Key (recommended):
--    - Get your service_role key from Supabase Dashboard
--    - Add it to config.js: supabaseServiceRoleKey
--    - Revert these policies to authenticated only
--
-- 2. Add custom authentication logic
-- ========================================




