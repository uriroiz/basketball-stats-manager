import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import {
  authorizeAdmin,
  errorResponse,
  HttpError,
  jsonResponse,
  preflight,
  readJson,
} from '../_shared/http.ts'
import { calculatePlayerStats } from '../_shared/player-stats.ts'
import { loadAllPlayerGames } from '../_shared/players.ts'

serve(async (req) => {
  const options = preflight(req)
  if (options) return options

  try {
    const body = await readJson(req)
    const gameSerial = Number(body.gameSerial)
    if (!Number.isInteger(gameSerial)) throw new HttpError(400, 'gameSerial must be an integer')

    const { adminClient, userClient } = await authorizeAdmin(req)
    const players = await loadAllPlayerGames(adminClient)

    const playerUpdates: Record<string, unknown>[] = []
    for (const player of players || []) {
      const games = Array.isArray(player.games) ? player.games : []
      const filtered = games.filter(game => Number(game?.gameId ?? game?.gameSerial) !== gameSerial)
      if (filtered.length === games.length) continue

      playerUpdates.push({ id: player.id, sourceGames: games, ...calculatePlayerStats(filtered) })
    }

    const { data, error: deleteError } = await userClient.rpc('delete_game_with_player_updates', {
      p_game_serial: gameSerial,
      p_player_updates: playerUpdates,
    })
    if (deleteError) {
      console.error('Atomic game deletion failed:', deleteError.code)
      throw new Error('Game deletion failed')
    }
    return jsonResponse(req, data || { success: true, gameSerial, playersUpdated: playerUpdates.length })
  } catch (error) {
    return errorResponse(req, error)
  }
})
