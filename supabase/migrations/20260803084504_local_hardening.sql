-- Local hardening: explicit API grants, admin-only mutations, schema alignment,
-- and atomic game/player imports.

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS "totalFieldGoalsMade" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "totalFieldGoalsAttempted" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "totalThreePointsMade" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "totalThreePointsAttempted" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "totalFreeThrowsMade" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "totalFreeThrowsAttempted" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "avgRebounds" REAL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "avgAssists" REAL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "avgSteals" REAL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "avgBlocks" REAL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "avgTurnovers" REAL DEFAULT 0;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'games', 'teams', 'players', 'player_mappings', 'player_aliases',
    'appearances', 'player_stats', 'transfer_events', 'team_aliases', 'player_names'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Authenticated write ' || table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Admin write ' || table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Authenticated users can insert player names', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Authenticated users can update player names', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Anyone can insert player names', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Anyone can update player names', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Authenticated users can delete player names', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Admin users can manage player names', table_name);
    IF table_name = 'transfer_events' THEN
      EXECUTE 'DROP POLICY IF EXISTS "Authenticated write transfers" ON public.transfer_events';
      EXECUTE 'DROP POLICY IF EXISTS "Admin write transfers" ON public.transfer_events';
    END IF;
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING ((SELECT auth.jwt() -> ''app_metadata'' ->> ''role'') = ''admin'') WITH CHECK ((SELECT auth.jwt() -> ''app_metadata'' ->> ''role'') = ''admin'')',
      'Admin write ' || table_name,
      table_name
    );
    EXECUTE format('GRANT SELECT ON public.%I TO anon, authenticated', table_name);
    EXECUTE format('GRANT INSERT, UPDATE, DELETE ON public.%I TO authenticated', table_name);
  END LOOP;
END
$$;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Feedback remains publicly insertable, but only administrators may read it.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TABLE IF NOT EXISTS public.broadcaster_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  full_name TEXT NOT NULL,
  frequency TEXT NOT NULL,
  used_sections TEXT[] NOT NULL DEFAULT '{}',
  help_rating INTEGER NOT NULL CHECK (help_rating BETWEEN 1 AND 5),
  most_useful TEXT NOT NULL,
  missing_info TEXT[] NOT NULL DEFAULT '{}',
  top_features TEXT[] NOT NULL DEFAULT '{}',
  blockers TEXT,
  ideas TEXT,
  category TEXT,
  priority TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  page_url TEXT,
  user_agent TEXT
);
ALTER TABLE public.broadcaster_feedback ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_broadcaster_feedback_submitted_at
  ON public.broadcaster_feedback(submitted_at DESC);
DROP POLICY IF EXISTS "Authenticated users can read broadcaster feedback" ON public.broadcaster_feedback;
CREATE POLICY "Administrators can read broadcaster feedback"
  ON public.broadcaster_feedback
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Anyone can submit broadcaster feedback" ON public.broadcaster_feedback;
CREATE POLICY "Anyone can submit broadcaster feedback"
  ON public.broadcaster_feedback
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (status = 'new' AND category IS NULL AND priority IS NULL);

REVOKE ALL ON public.broadcaster_feedback FROM anon, authenticated;
GRANT INSERT (
  full_name, frequency, used_sections, help_rating, most_useful,
  missing_info, top_features, blockers, ideas, page_url, user_agent
) ON public.broadcaster_feedback TO anon, authenticated;
GRANT SELECT ON public.broadcaster_feedback TO authenticated;

ALTER TABLE public.broadcaster_feedback
  DROP CONSTRAINT IF EXISTS broadcaster_feedback_full_name_length,
  DROP CONSTRAINT IF EXISTS broadcaster_feedback_frequency_length,
  DROP CONSTRAINT IF EXISTS broadcaster_feedback_most_useful_length,
  DROP CONSTRAINT IF EXISTS broadcaster_feedback_blockers_length,
  DROP CONSTRAINT IF EXISTS broadcaster_feedback_ideas_length,
  DROP CONSTRAINT IF EXISTS broadcaster_feedback_top_features_count,
  DROP CONSTRAINT IF EXISTS broadcaster_feedback_page_url_length,
  DROP CONSTRAINT IF EXISTS broadcaster_feedback_user_agent_length,
  ADD CONSTRAINT broadcaster_feedback_full_name_length CHECK (char_length(full_name) BETWEEN 1 AND 120),
  ADD CONSTRAINT broadcaster_feedback_frequency_length CHECK (char_length(frequency) <= 80),
  ADD CONSTRAINT broadcaster_feedback_most_useful_length CHECK (char_length(most_useful) <= 4000),
  ADD CONSTRAINT broadcaster_feedback_blockers_length CHECK (char_length(blockers) <= 4000),
  ADD CONSTRAINT broadcaster_feedback_ideas_length CHECK (char_length(ideas) <= 4000),
  ADD CONSTRAINT broadcaster_feedback_top_features_count CHECK (cardinality(top_features) BETWEEN 0 AND 3),
  ADD CONSTRAINT broadcaster_feedback_page_url_length CHECK (char_length(page_url) <= 2000),
  ADD CONSTRAINT broadcaster_feedback_user_agent_length CHECK (char_length(user_agent) <= 1000);

DROP FUNCTION IF EXISTS public.get_broadcaster_feedback(TEXT, INTEGER);

CREATE OR REPLACE FUNCTION public.import_game_with_players(
  p_game JSONB,
  p_players JSONB DEFAULT '[]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  imported_game public.games;
  players_saved INTEGER := 0;
BEGIN
  IF (SELECT auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'administrator role required' USING ERRCODE = '42501';
  END IF;

  IF jsonb_typeof(p_game) <> 'object'
     OR NOT (p_game ? 'gameSerial')
     OR jsonb_typeof(COALESCE(p_players, '[]'::JSONB)) <> 'array' THEN
    RAISE EXCEPTION 'invalid import payload' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.games
  SELECT (jsonb_populate_record(
    NULL::public.games,
    jsonb_build_object('createdAt', NOW(), 'updatedAt', NOW())
      || (p_game - 'createdAt' - 'updatedAt')
  )).*
  ON CONFLICT ("gameSerial") DO UPDATE SET
    date = EXCLUDED.date,
    cycle = EXCLUDED.cycle,
    teams = EXCLUDED.teams,
    totals = EXCLUDED.totals,
    "originalJson" = EXCLUDED."originalJson",
    "updatedAt" = NOW()
  RETURNING * INTO imported_game;

  INSERT INTO public.players
  SELECT (jsonb_populate_record(
    NULL::public.players,
    jsonb_build_object('createdAt', NOW(), 'updatedAt', NOW())
      || (item - 'createdAt' - 'updatedAt')
  )).*
  FROM jsonb_array_elements(COALESCE(p_players, '[]'::JSONB)) AS items(item)
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    team = EXCLUDED.team,
    jersey = EXCLUDED.jersey,
    games = EXCLUDED.games,
    "totalPoints" = EXCLUDED."totalPoints",
    "totalRebounds" = EXCLUDED."totalRebounds",
    "totalAssists" = EXCLUDED."totalAssists",
    "totalSteals" = EXCLUDED."totalSteals",
    "totalBlocks" = EXCLUDED."totalBlocks",
    "totalTurnovers" = EXCLUDED."totalTurnovers",
    "totalFouls" = EXCLUDED."totalFouls",
    "totalFoulsDrawn" = EXCLUDED."totalFoulsDrawn",
    "totalEfficiency" = EXCLUDED."totalEfficiency",
    "totalFieldGoalsMade" = EXCLUDED."totalFieldGoalsMade",
    "totalFieldGoalsAttempted" = EXCLUDED."totalFieldGoalsAttempted",
    "totalThreePointsMade" = EXCLUDED."totalThreePointsMade",
    "totalThreePointsAttempted" = EXCLUDED."totalThreePointsAttempted",
    "totalFreeThrowsMade" = EXCLUDED."totalFreeThrowsMade",
    "totalFreeThrowsAttempted" = EXCLUDED."totalFreeThrowsAttempted",
    "fgPercentage" = EXCLUDED."fgPercentage",
    "threePointPercentage" = EXCLUDED."threePointPercentage",
    "ftPercentage" = EXCLUDED."ftPercentage",
    "avgEfficiency" = EXCLUDED."avgEfficiency",
    "avgPoints" = EXCLUDED."avgPoints",
    "avgRebounds" = EXCLUDED."avgRebounds",
    "avgAssists" = EXCLUDED."avgAssists",
    "avgSteals" = EXCLUDED."avgSteals",
    "avgBlocks" = EXCLUDED."avgBlocks",
    "avgTurnovers" = EXCLUDED."avgTurnovers",
    "canonicalNameKeys" = EXCLUDED."canonicalNameKeys",
    "scoreboardAliases" = EXCLUDED."scoreboardAliases",
    "updatedAt" = NOW();

  GET DIAGNOSTICS players_saved = ROW_COUNT;
  RETURN jsonb_build_object(
    'success', TRUE,
    'gameId', imported_game."gameSerial",
    'playersSaved', players_saved
  );
END;
$$;

REVOKE ALL ON FUNCTION public.import_game_with_players(JSONB, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.import_game_with_players(JSONB, JSONB) TO authenticated;

CREATE OR REPLACE FUNCTION public.apply_player_stat_updates(p_updates JSONB)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  player_update JSONB;
  updated_count INTEGER := 0;
  source_games JSONB[];
  new_games JSONB[];
BEGIN
  IF (SELECT auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'administrator role required' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(COALESCE(p_updates, '[]'::JSONB)) <> 'array'
     OR jsonb_array_length(COALESCE(p_updates, '[]'::JSONB)) > 20000 THEN
    RAISE EXCEPTION 'invalid player updates payload' USING ERRCODE = '22023';
  END IF;

  FOR player_update IN SELECT value FROM jsonb_array_elements(COALESCE(p_updates, '[]'::JSONB))
  LOOP
    IF COALESCE(player_update ->> 'id', '') = '' THEN
      RAISE EXCEPTION 'player id is required' USING ERRCODE = '22023';
    END IF;

    source_games := ARRAY(
      SELECT value
      FROM jsonb_array_elements(COALESCE(player_update -> 'sourceGames', '[]'::JSONB))
    );
    new_games := ARRAY(
      SELECT value
      FROM jsonb_array_elements(COALESCE(player_update -> 'games', '[]'::JSONB))
    );

    UPDATE public.players SET
      games = new_games,
      "totalPoints" = COALESCE((player_update ->> 'totalPoints')::INTEGER, 0),
      "totalRebounds" = COALESCE((player_update ->> 'totalRebounds')::INTEGER, 0),
      "totalAssists" = COALESCE((player_update ->> 'totalAssists')::INTEGER, 0),
      "totalSteals" = COALESCE((player_update ->> 'totalSteals')::INTEGER, 0),
      "totalBlocks" = COALESCE((player_update ->> 'totalBlocks')::INTEGER, 0),
      "totalTurnovers" = COALESCE((player_update ->> 'totalTurnovers')::INTEGER, 0),
      "totalFouls" = COALESCE((player_update ->> 'totalFouls')::INTEGER, 0),
      "totalFoulsDrawn" = COALESCE((player_update ->> 'totalFoulsDrawn')::INTEGER, 0),
      "totalEfficiency" = COALESCE((player_update ->> 'totalEfficiency')::REAL, 0),
      "totalFieldGoalsMade" = COALESCE((player_update ->> 'totalFieldGoalsMade')::INTEGER, 0),
      "totalFieldGoalsAttempted" = COALESCE((player_update ->> 'totalFieldGoalsAttempted')::INTEGER, 0),
      "totalThreePointsMade" = COALESCE((player_update ->> 'totalThreePointsMade')::INTEGER, 0),
      "totalThreePointsAttempted" = COALESCE((player_update ->> 'totalThreePointsAttempted')::INTEGER, 0),
      "totalFreeThrowsMade" = COALESCE((player_update ->> 'totalFreeThrowsMade')::INTEGER, 0),
      "totalFreeThrowsAttempted" = COALESCE((player_update ->> 'totalFreeThrowsAttempted')::INTEGER, 0),
      "fgPercentage" = COALESCE((player_update ->> 'fgPercentage')::REAL, 0),
      "threePointPercentage" = COALESCE((player_update ->> 'threePointPercentage')::REAL, 0),
      "ftPercentage" = COALESCE((player_update ->> 'ftPercentage')::REAL, 0),
      "avgEfficiency" = COALESCE((player_update ->> 'avgEfficiency')::REAL, 0),
      "avgPoints" = COALESCE((player_update ->> 'avgPoints')::REAL, 0),
      "avgRebounds" = COALESCE((player_update ->> 'avgRebounds')::REAL, 0),
      "avgAssists" = COALESCE((player_update ->> 'avgAssists')::REAL, 0),
      "avgSteals" = COALESCE((player_update ->> 'avgSteals')::REAL, 0),
      "avgBlocks" = COALESCE((player_update ->> 'avgBlocks')::REAL, 0),
      "avgTurnovers" = COALESCE((player_update ->> 'avgTurnovers')::REAL, 0),
      "updatedAt" = NOW()
    WHERE id = player_update ->> 'id'
      AND COALESCE(games, ARRAY[]::JSONB[]) IS NOT DISTINCT FROM source_games;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'player changed concurrently or was not found' USING ERRCODE = '40001';
    END IF;
    updated_count := updated_count + 1;
  END LOOP;

  RETURN updated_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_game_with_player_updates(
  p_game_serial INTEGER,
  p_player_updates JSONB DEFAULT '[]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  players_updated INTEGER;
BEGIN
  players_updated := public.apply_player_stat_updates(p_player_updates);
  DELETE FROM public.games WHERE "gameSerial" = p_game_serial;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'game not found' USING ERRCODE = 'P0002';
  END IF;
  RETURN jsonb_build_object(
    'success', TRUE,
    'gameSerial', p_game_serial,
    'playersUpdated', players_updated
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_player_stat_updates(JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_game_with_player_updates(INTEGER, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_player_stat_updates(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_game_with_player_updates(INTEGER, JSONB) TO authenticated;
