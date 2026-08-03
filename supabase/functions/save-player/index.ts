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

serve(async (req) => {
  const options = preflight(req)
  if (options) return options

  try {
    const body = await readJson(req)
    const playerData = requireRecord(body.playerData, 'playerData')
    if (typeof playerData.id !== 'string' || !playerData.id.trim()) {
      throw new HttpError(400, 'playerData.id is required')
    }

    const safePlayerData = pickFields(playerData, [
      'id', 'name', 'team', 'jersey', 'games',
      'totalPoints', 'totalRebounds', 'totalAssists', 'totalSteals', 'totalBlocks',
      'totalTurnovers', 'totalFouls', 'totalFoulsDrawn', 'totalEfficiency',
      'totalFieldGoalsMade', 'totalFieldGoalsAttempted', 'totalThreePointsMade',
      'totalThreePointsAttempted', 'totalFreeThrowsMade', 'totalFreeThrowsAttempted',
      'fgPercentage', 'threePointPercentage', 'ftPercentage', 'avgEfficiency',
      'avgPoints', 'avgRebounds', 'avgAssists', 'avgSteals', 'avgBlocks',
      'avgTurnovers', 'canonicalNameKeys', 'scoreboardAliases',
    ])
    const { adminClient } = await authorizeAdmin(req)
    const { data, error } = await adminClient
      .from('players')
      .upsert(safePlayerData, { onConflict: 'id' })
      .select()
      .single()
    if (error) {
      console.error('Player save failed:', error.code)
      throw new Error('Player save failed')
    }
    return jsonResponse(req, { success: true, player: data })
  } catch (error) {
    return errorResponse(req, error)
  }
})
