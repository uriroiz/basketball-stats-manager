import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { authorizeAdmin, errorResponse, jsonResponse, preflight, requirePost } from '../_shared/http.ts'
import { calculatePlayerStats } from '../_shared/player-stats.ts'
import { loadAllGameIds, loadAllPlayerGames } from '../_shared/players.ts'

serve(async (req) => {
  const options = preflight(req)
  if (options) return options

  try {
    requirePost(req)
    const { adminClient, userClient } = await authorizeAdmin(req)
    const [games, players] = await Promise.all([
      loadAllGameIds(adminClient),
      loadAllPlayerGames(adminClient),
    ])

    const validIds = new Set((games || []).map(game => String(game.gameSerial)))
    const orphanedIds = new Set<string>()
    const playerUpdates: Record<string, unknown>[] = []

    for (const player of players || []) {
      const originalGames = Array.isArray(player.games) ? player.games : []
      const cleanedGames = originalGames.filter(game => {
        const id = String(game?.gameId ?? game?.gameSerial ?? '')
        const valid = validIds.has(id)
        if (!valid && id) orphanedIds.add(id)
        return valid
      })
      if (cleanedGames.length === originalGames.length) continue

      playerUpdates.push({ id: player.id, sourceGames: originalGames, ...calculatePlayerStats(cleanedGames) })
    }

    const { error: updateError } = await userClient.rpc('apply_player_stat_updates', {
      p_updates: playerUpdates,
    })
    if (updateError) {
      console.error('Atomic orphan cleanup failed:', updateError.code)
      throw new Error('Orphan cleanup failed')
    }

    return jsonResponse(req, {
      success: true,
      playersCleaned: playerUpdates.length,
      orphanedGamesRemoved: [...orphanedIds],
    })
  } catch (error) {
    return errorResponse(req, error)
  }
})
