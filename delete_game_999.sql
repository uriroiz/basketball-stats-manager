-- Delete test game 999
DELETE FROM public.games WHERE "gameSerial" = 999;

-- Optional: Also delete any test players
-- DELETE FROM public.players WHERE id LIKE '%test%';

