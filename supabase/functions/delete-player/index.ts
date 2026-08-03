import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import {
  authorizeAdmin,
  errorResponse,
  jsonResponse,
  preflight,
  readJson,
  requireIdentifier,
} from '../_shared/http.ts'

serve(async (req) => {
  const options = preflight(req)
  if (options) return options

  try {
    const body = await readJson(req)
    const playerId = requireIdentifier(body.playerId, 'playerId')
    const { adminClient } = await authorizeAdmin(req)
    const { error } = await adminClient.from('players').delete().eq('id', playerId)
    if (error) {
      console.error('Player delete failed:', error.code)
      throw new Error('Player delete failed')
    }
    return jsonResponse(req, { success: true, playerId })
  } catch (error) {
    return errorResponse(req, error)
  }
})
