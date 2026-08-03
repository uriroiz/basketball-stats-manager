import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { authorizeAdmin, errorResponse, jsonResponse, preflight, requirePost } from '../_shared/http.ts'
import { calculatePlayerStats } from '../_shared/player-stats.ts'
import { loadAllPlayerGames } from '../_shared/players.ts'

serve(async (req) => {
  const options = preflight(req)
  if (options) return options

  try {
    requirePost(req)
    const { adminClient, userClient } = await authorizeAdmin(req)
    const players = await loadAllPlayerGames(adminClient)

    const playerUpdates = (players || []).map(player => ({
      id: player.id,
      sourceGames: Array.isArray(player.games) ? player.games : [],
      ...calculatePlayerStats(player.games),
    }))
    const { error: updateError } = await userClient.rpc('apply_player_stat_updates', {
      p_updates: playerUpdates,
    })
    if (updateError) {
      console.error('Atomic player recalculation failed:', updateError.code)
      throw new Error('Player recalculation failed')
    }
    return jsonResponse(req, { success: true, playersUpdated: playerUpdates.length })
  } catch (error) {
    return errorResponse(req, error)
  }
})
