import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import {
  authorizeAdmin,
  errorResponse,
  HttpError,
  jsonResponse,
  preflight,
  pickFields,
  readJson,
  requireRecord,
} from '../_shared/http.ts'
import { calculatePlayerStats } from '../_shared/player-stats.ts'

serve(async (req) => {
  const options = preflight(req)
  if (options) return options

  try {
    const body = await readJson(req)
    const gameData = requireRecord(body.gameData, 'gameData')
    const playersData = body.playersData ?? []
    if (!Number.isInteger(Number(gameData.gameSerial))) {
      throw new HttpError(400, 'gameData.gameSerial must be an integer')
    }
    if (!Array.isArray(playersData)) throw new HttpError(400, 'playersData must be an array')
    if (playersData.length > 500) throw new HttpError(400, 'playersData exceeds the 500-player limit')

    const playerDefaults = {
      games: [],
      totalPoints: 0,
      totalRebounds: 0,
      totalAssists: 0,
      totalSteals: 0,
      totalBlocks: 0,
      totalTurnovers: 0,
      totalFouls: 0,
      totalFoulsDrawn: 0,
      totalEfficiency: 0,
      totalFieldGoalsMade: 0,
      totalFieldGoalsAttempted: 0,
      totalThreePointsMade: 0,
      totalThreePointsAttempted: 0,
      totalFreeThrowsMade: 0,
      totalFreeThrowsAttempted: 0,
      fgPercentage: 0,
      threePointPercentage: 0,
      ftPercentage: 0,
      avgEfficiency: 0,
      avgPoints: 0,
      avgRebounds: 0,
      avgAssists: 0,
      avgSteals: 0,
      avgBlocks: 0,
      avgTurnovers: 0,
      canonicalNameKeys: [],
      scoreboardAliases: [],
    }
    const playerFields = [
      'id', 'name', 'team', 'jersey', 'games',
      'totalPoints', 'totalRebounds', 'totalAssists', 'totalSteals', 'totalBlocks',
      'totalTurnovers', 'totalFouls', 'totalFoulsDrawn', 'totalEfficiency',
      'totalFieldGoalsMade', 'totalFieldGoalsAttempted', 'totalThreePointsMade',
      'totalThreePointsAttempted', 'totalFreeThrowsMade', 'totalFreeThrowsAttempted',
      'fgPercentage', 'threePointPercentage', 'ftPercentage', 'avgEfficiency',
      'avgPoints', 'avgRebounds', 'avgAssists', 'avgSteals', 'avgBlocks',
      'avgTurnovers', 'canonicalNameKeys', 'scoreboardAliases',
    ] as const
    const safePlayers = playersData.map((value, index) => {
      const player = requireRecord(value, `playersData[${index}]`)
      if (typeof player.id !== 'string' || !player.id.trim() || player.id.length > 128) {
        throw new HttpError(400, `playersData[${index}].id is required`)
      }
      if (!Array.isArray(player.games) || player.games.length === 0) {
        throw new HttpError(400, `playersData[${index}].games must be a non-empty array`)
      }
      const calculatedStats = calculatePlayerStats(player.games)
      return pickFields({ ...playerDefaults, ...player, ...calculatedStats }, playerFields)
    })
    const safeGame = pickFields(gameData, [
      'gameSerial', 'date', 'cycle', 'teams', 'totals', 'originalJson',
    ])

    const { userClient } = await authorizeAdmin(req)
    const { data, error } = await userClient.rpc('import_game_with_players', {
      p_game: safeGame,
      p_players: safePlayers,
    })
    if (error) {
      console.error('Atomic game import failed:', error.code)
      throw new Error('Atomic game import failed')
    }
    return jsonResponse(req, data || { success: true })
  } catch (error) {
    return errorResponse(req, error)
  }
})
