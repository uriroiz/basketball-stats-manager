-- Basketball Stats Manager - Supabase Database Schema
-- Run this in Supabase SQL Editor to create all tables and security policies

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- TABLE: games
-- ========================================
CREATE TABLE IF NOT EXISTS public.games (
  "gameSerial" INTEGER PRIMARY KEY,
  date TEXT,
  cycle INTEGER,
  teams TEXT[], -- Array of team names
  totals JSONB, -- Team totals as JSON
  "originalJson" JSONB, -- Full original game data
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_games_date ON public.games(date);
CREATE INDEX IF NOT EXISTS idx_games_cycle ON public.games(cycle);
CREATE INDEX IF NOT EXISTS idx_games_teams ON public.games USING GIN(teams);

-- ========================================
-- TABLE: teams
-- ========================================
CREATE TABLE IF NOT EXISTS public.teams (
  team_id TEXT PRIMARY KEY,
  name_en TEXT NOT NULL,
  name_he TEXT,
  short_he TEXT,
  aliases TEXT[], -- Array of English aliases
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for team lookups
CREATE INDEX IF NOT EXISTS idx_teams_name_en ON public.teams(name_en);
CREATE INDEX IF NOT EXISTS idx_teams_aliases ON public.teams USING GIN(aliases);

-- ========================================
-- TABLE: players
-- ========================================
CREATE TABLE IF NOT EXISTS public.players (
  id TEXT PRIMARY KEY,
  name TEXT,
  team TEXT,
  jersey TEXT,
  games JSONB[], -- Array of game stats
  "totalPoints" INTEGER DEFAULT 0,
  "totalRebounds" INTEGER DEFAULT 0,
  "totalAssists" INTEGER DEFAULT 0,
  "totalSteals" INTEGER DEFAULT 0,
  "totalBlocks" INTEGER DEFAULT 0,
  "totalTurnovers" INTEGER DEFAULT 0,
  "totalFouls" INTEGER DEFAULT 0,
  "totalFoulsDrawn" INTEGER DEFAULT 0,
  "totalEfficiency" REAL DEFAULT 0,
  "fgPercentage" REAL DEFAULT 0,
  "threePointPercentage" REAL DEFAULT 0,
  "ftPercentage" REAL DEFAULT 0,
  "avgEfficiency" REAL DEFAULT 0,
  "avgPoints" REAL DEFAULT 0,
  "canonicalNameKeys" TEXT[], -- For fuzzy matching
  "scoreboardAliases" TEXT[], -- Alternative spellings
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for player searches
CREATE INDEX IF NOT EXISTS idx_players_name ON public.players(name);
CREATE INDEX IF NOT EXISTS idx_players_team ON public.players(team);
CREATE INDEX IF NOT EXISTS idx_players_canonical ON public.players USING GIN("canonicalNameKeys");
CREATE INDEX IF NOT EXISTS idx_players_aliases ON public.players USING GIN("scoreboardAliases");

-- ========================================
-- TABLE: player_mappings
-- ========================================
CREATE TABLE IF NOT EXISTS public.player_mappings (
  lookup_key TEXT PRIMARY KEY,
  id TEXT,
  first_en TEXT,
  family_en TEXT,
  first_he TEXT,
  family_he TEXT,
  jersey TEXT,
  team_en TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_player_mappings_id ON public.player_mappings(id);
CREATE INDEX IF NOT EXISTS idx_player_mappings_names ON public.player_mappings(first_en, family_en);

-- ========================================
-- TABLE: player_aliases
-- ========================================
CREATE TABLE IF NOT EXISTS public.player_aliases (
  "aliasId" SERIAL PRIMARY KEY,
  "playerId" TEXT NOT NULL,
  "aliasName" TEXT NOT NULL,
  source TEXT, -- 'manual', 'fuzzy', 'scoreboard'
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for alias lookups
CREATE INDEX IF NOT EXISTS idx_player_aliases_player ON public.player_aliases("playerId");
CREATE INDEX IF NOT EXISTS idx_player_aliases_name ON public.player_aliases("aliasName");

-- ========================================
-- TABLE: appearances
-- ========================================
CREATE TABLE IF NOT EXISTS public.appearances (
  "appearanceId" SERIAL PRIMARY KEY,
  "playerId" TEXT NOT NULL,
  "gameId" INTEGER NOT NULL,
  team TEXT,
  jersey TEXT,
  "minutesPlayed" TEXT,
  active BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for appearance queries
CREATE INDEX IF NOT EXISTS idx_appearances_player ON public.appearances("playerId");
CREATE INDEX IF NOT EXISTS idx_appearances_game ON public.appearances("gameId");

-- ========================================
-- TABLE: player_stats
-- ========================================
CREATE TABLE IF NOT EXISTS public.player_stats (
  "statId" SERIAL PRIMARY KEY,
  "playerId" TEXT NOT NULL,
  "gameId" INTEGER NOT NULL,
  "appearanceId" INTEGER,
  points INTEGER DEFAULT 0,
  rebounds INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  steals INTEGER DEFAULT 0,
  blocks INTEGER DEFAULT 0,
  turnovers INTEGER DEFAULT 0,
  fouls INTEGER DEFAULT 0,
  "foulsDrawn" INTEGER DEFAULT 0,
  efficiency REAL DEFAULT 0,
  "fieldGoalsMade" INTEGER DEFAULT 0,
  "fieldGoalsAttempted" INTEGER DEFAULT 0,
  "threePointsMade" INTEGER DEFAULT 0,
  "threePointsAttempted" INTEGER DEFAULT 0,
  "freeThrowsMade" INTEGER DEFAULT 0,
  "freeThrowsAttempted" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for stats queries
CREATE INDEX IF NOT EXISTS idx_player_stats_player ON public.player_stats("playerId");
CREATE INDEX IF NOT EXISTS idx_player_stats_game ON public.player_stats("gameId");

-- ========================================
-- TABLE: transfer_events
-- ========================================
CREATE TABLE IF NOT EXISTS public.transfer_events (
  "transferId" SERIAL PRIMARY KEY,
  "playerId" TEXT NOT NULL,
  "fromTeam" TEXT,
  "toTeam" TEXT NOT NULL,
  "detectedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "detectedInGame" INTEGER,
  status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'dismissed'
  notes TEXT
);

-- Index for transfer queries
CREATE INDEX IF NOT EXISTS idx_transfers_player ON public.transfer_events("playerId");
CREATE INDEX IF NOT EXISTS idx_transfers_status ON public.transfer_events(status);

-- ========================================
-- TABLE: team_aliases
-- ========================================
CREATE TABLE IF NOT EXISTS public.team_aliases (
  id SERIAL PRIMARY KEY,
  "canonicalName" TEXT NOT NULL,
  "aliasName" TEXT NOT NULL,
  "teamId" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for team alias lookups
CREATE INDEX IF NOT EXISTS idx_team_aliases_canonical ON public.team_aliases("canonicalName");
CREATE INDEX IF NOT EXISTS idx_team_aliases_alias ON public.team_aliases("aliasName");

-- ========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================

-- Enable RLS on all tables
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appearances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfer_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_aliases ENABLE ROW LEVEL SECURITY;

-- Public READ access for main tables (anyone can view)
CREATE POLICY "Public read games" ON public.games FOR SELECT USING (true);
CREATE POLICY "Public read teams" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Public read players" ON public.players FOR SELECT USING (true);
CREATE POLICY "Public read player_mappings" ON public.player_mappings FOR SELECT USING (true);
CREATE POLICY "Public read player_aliases" ON public.player_aliases FOR SELECT USING (true);
CREATE POLICY "Public read appearances" ON public.appearances FOR SELECT USING (true);
CREATE POLICY "Public read player_stats" ON public.player_stats FOR SELECT USING (true);
CREATE POLICY "Public read transfers" ON public.transfer_events FOR SELECT USING (true);
CREATE POLICY "Public read team_aliases" ON public.team_aliases FOR SELECT USING (true);

-- Authenticated WRITE access (only logged-in admin can modify)
CREATE POLICY "Authenticated write games" ON public.games FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated write teams" ON public.teams FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated write players" ON public.players FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated write player_mappings" ON public.player_mappings FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated write player_aliases" ON public.player_aliases FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated write appearances" ON public.appearances FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated write player_stats" ON public.player_stats FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated write transfers" ON public.transfer_events FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated write team_aliases" ON public.team_aliases FOR ALL USING (auth.role() = 'authenticated');

-- ========================================
-- FUNCTIONS (Optional but useful)
-- ========================================

-- Function to update "updatedAt" timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to tables with updatedAt
CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON public.games
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON public.players
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_player_mappings_updated_at BEFORE UPDATE ON public.player_mappings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- COMPLETION MESSAGE
-- ========================================
DO $$
BEGIN
    RAISE NOTICE '✅ Database schema created successfully!';
    RAISE NOTICE 'All tables, indexes, and security policies are in place.';
    RAISE NOTICE 'You can now connect your application to Supabase.';
END $$;

