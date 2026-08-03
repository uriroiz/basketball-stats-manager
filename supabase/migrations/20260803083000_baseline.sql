-- Reproducible baseline for fresh local and preview databases.
CREATE TABLE IF NOT EXISTS public.games (
  "gameSerial" INTEGER PRIMARY KEY,
  date TEXT,
  cycle INTEGER,
  teams TEXT[],
  totals JSONB,
  "originalJson" JSONB,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.teams (
  team_id TEXT PRIMARY KEY,
  name_en TEXT NOT NULL,
  name_he TEXT,
  short_he TEXT,
  aliases TEXT[],
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.players (
  id TEXT PRIMARY KEY,
  name TEXT,
  team TEXT,
  jersey TEXT,
  games JSONB[],
  "totalPoints" INTEGER DEFAULT 0,
  "totalRebounds" INTEGER DEFAULT 0,
  "totalAssists" INTEGER DEFAULT 0,
  "totalSteals" INTEGER DEFAULT 0,
  "totalBlocks" INTEGER DEFAULT 0,
  "totalTurnovers" INTEGER DEFAULT 0,
  "totalFouls" INTEGER DEFAULT 0,
  "totalFoulsDrawn" INTEGER DEFAULT 0,
  "totalEfficiency" REAL DEFAULT 0,
  "totalFieldGoalsMade" INTEGER DEFAULT 0,
  "totalFieldGoalsAttempted" INTEGER DEFAULT 0,
  "totalThreePointsMade" INTEGER DEFAULT 0,
  "totalThreePointsAttempted" INTEGER DEFAULT 0,
  "totalFreeThrowsMade" INTEGER DEFAULT 0,
  "totalFreeThrowsAttempted" INTEGER DEFAULT 0,
  "fgPercentage" REAL DEFAULT 0,
  "threePointPercentage" REAL DEFAULT 0,
  "ftPercentage" REAL DEFAULT 0,
  "avgEfficiency" REAL DEFAULT 0,
  "avgPoints" REAL DEFAULT 0,
  "avgRebounds" REAL DEFAULT 0,
  "avgAssists" REAL DEFAULT 0,
  "avgSteals" REAL DEFAULT 0,
  "avgBlocks" REAL DEFAULT 0,
  "avgTurnovers" REAL DEFAULT 0,
  "canonicalNameKeys" TEXT[],
  "scoreboardAliases" TEXT[],
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.player_mappings (
  lookup_key TEXT PRIMARY KEY,
  id TEXT,
  first_en TEXT,
  family_en TEXT,
  first_he TEXT,
  family_he TEXT,
  jersey TEXT,
  team_en TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.player_aliases (
  "aliasId" SERIAL PRIMARY KEY,
  "playerId" TEXT NOT NULL,
  "aliasName" TEXT NOT NULL,
  source TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.appearances (
  "appearanceId" SERIAL PRIMARY KEY,
  "playerId" TEXT NOT NULL,
  "gameId" INTEGER NOT NULL,
  team TEXT,
  jersey TEXT,
  "minutesPlayed" TEXT,
  active BOOLEAN DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

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
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.transfer_events (
  "transferId" SERIAL PRIMARY KEY,
  "playerId" TEXT NOT NULL,
  "fromTeam" TEXT,
  "toTeam" TEXT NOT NULL,
  "detectedAt" TIMESTAMPTZ DEFAULT NOW(),
  "detectedInGame" INTEGER,
  status TEXT DEFAULT 'pending',
  notes TEXT
);

CREATE TABLE IF NOT EXISTS public.team_aliases (
  id SERIAL PRIMARY KEY,
  "canonicalName" TEXT NOT NULL,
  "aliasName" TEXT NOT NULL,
  "teamId" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.player_names (
  player_id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  jersey TEXT,
  team_id BIGINT,
  team_name TEXT,
  source TEXT DEFAULT 'api' CHECK (source IN ('api', 'manual', 'corrected')),
  notes TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_games_date ON public.games(date);
CREATE INDEX IF NOT EXISTS idx_games_cycle ON public.games(cycle);
CREATE INDEX IF NOT EXISTS idx_players_name ON public.players(name);
CREATE INDEX IF NOT EXISTS idx_players_team ON public.players(team);
CREATE INDEX IF NOT EXISTS idx_player_stats_player ON public.player_stats("playerId");
CREATE INDEX IF NOT EXISTS idx_player_stats_game ON public.player_stats("gameId");
CREATE INDEX IF NOT EXISTS idx_player_names_name ON public.player_names(name);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_games_updated_at ON public.games;
CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON public.games
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_teams_updated_at ON public.teams;
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_players_updated_at ON public.players;
CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON public.players
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_player_mappings_updated_at ON public.player_mappings;
CREATE TRIGGER update_player_mappings_updated_at BEFORE UPDATE ON public.player_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_player_names_updated_at ON public.player_names;
CREATE TRIGGER update_player_names_updated_at BEFORE UPDATE ON public.player_names
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'games', 'teams', 'players', 'player_mappings', 'player_aliases',
    'appearances', 'player_stats', 'transfer_events', 'team_aliases', 'player_names'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Public read ' || table_name, table_name);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (TRUE)',
      'Public read ' || table_name,
      table_name
    );
  END LOOP;
END
$$;
