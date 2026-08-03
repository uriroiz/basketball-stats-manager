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
    const teamData = requireRecord(body.teamData, 'teamData')
    if (typeof teamData.team_id !== 'string' || !teamData.team_id.trim()) {
      throw new HttpError(400, 'teamData.team_id is required')
    }
    if (typeof teamData.name_en !== 'string' || !teamData.name_en.trim()) {
      throw new HttpError(400, 'teamData.name_en is required')
    }

    const safeTeamData = pickFields(teamData, [
      'team_id', 'name_en', 'name_he', 'short_he', 'aliases',
    ])
    const { adminClient } = await authorizeAdmin(req)
    const { data, error } = await adminClient
      .from('teams')
      .upsert(safeTeamData, { onConflict: 'team_id' })
      .select()
      .single()
    if (error) {
      console.error('Team save failed:', error.code)
      throw new Error('Team save failed')
    }
    return jsonResponse(req, { success: true, team: data })
  } catch (error) {
    return errorResponse(req, error)
  }
})
