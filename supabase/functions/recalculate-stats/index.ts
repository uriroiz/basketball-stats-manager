import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-admin-password, Authorization, apikey'
      }
    })
  }

  try {
    // Check admin password
    const adminPassword = req.headers.get('x-admin-password')
    const expectedPassword = Deno.env.get('ADMIN_PASSWORD')
    
    if (!adminPassword || adminPassword !== expectedPassword) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid admin password' }),
        { status: 401, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    // Create Supabase client with Service Role key (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log(`🔄 Recalculating all player statistics...`)

    // Get all players
    const { data: playersData, error: playersError } = await supabase
      .from('players')
      .select('*')

    if (playersError) {
      console.error('Error fetching players:', playersError)
      return new Response(
        JSON.stringify({ error: playersError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    console.log(`📋 Found ${playersData?.length || 0} players`)

    let updatedCount = 0
    for (const player of playersData || []) {
      const games = player.games || []
      
      if (games.length === 0) {
        continue
      }

      // Recalculate totals from games array
      const totalPoints = games.reduce((sum, g) => sum + (g.points || 0), 0)
      const totalRebounds = games.reduce((sum, g) => sum + (g.rebounds || 0), 0)
      const totalAssists = games.reduce((sum, g) => sum + (g.assists || 0), 0)
      const totalSteals = games.reduce((sum, g) => sum + (g.steals || 0), 0)
      const totalBlocks = games.reduce((sum, g) => sum + (g.blocks || 0), 0)
      const totalTurnovers = games.reduce((sum, g) => sum + (g.turnovers || 0), 0)
      const totalFouls = games.reduce((sum, g) => sum + (g.fouls || 0), 0)
      const totalFoulsDrawn = games.reduce((sum, g) => sum + (g.foulsDrawn || 0), 0)
      const totalFieldGoalsMade = games.reduce((sum, g) => sum + (g.fieldGoalsMade || 0), 0)
      const totalFieldGoalsAttempted = games.reduce((sum, g) => sum + (g.fieldGoalsAttempted || 0), 0)
      const totalThreePointsMade = games.reduce((sum, g) => sum + (g.threePointsMade || 0), 0)
      const totalThreePointsAttempted = games.reduce((sum, g) => sum + (g.threePointsAttempted || 0), 0)
      const totalFreeThrowsMade = games.reduce((sum, g) => sum + (g.freeThrowsMade || 0), 0)
      const totalFreeThrowsAttempted = games.reduce((sum, g) => sum + (g.freeThrowsAttempted || 0), 0)
      
      // Calculate percentages
      const fgPercentage = totalFieldGoalsAttempted > 0 ? (totalFieldGoalsMade / totalFieldGoalsAttempted) * 100 : 0
      const threePointPercentage = totalThreePointsAttempted > 0 ? (totalThreePointsMade / totalThreePointsAttempted) * 100 : 0
      const ftPercentage = totalFreeThrowsAttempted > 0 ? (totalFreeThrowsMade / totalFreeThrowsAttempted) * 100 : 0
      
      // Calculate averages
      const gamesCount = games.length
      const avgPoints = gamesCount > 0 ? totalPoints / gamesCount : 0
      const avgRebounds = gamesCount > 0 ? totalRebounds / gamesCount : 0
      const avgAssists = gamesCount > 0 ? totalAssists / gamesCount : 0
      
      const { error: updateError } = await supabase
        .from('players')
        .update({
          totalPoints,
          totalRebounds,
          totalAssists,
          totalSteals,
          totalBlocks,
          totalTurnovers,
          totalFouls,
          totalFoulsDrawn,
          totalFieldGoalsMade,
          totalFieldGoalsAttempted,
          totalThreePointsMade,
          totalThreePointsAttempted,
          totalFreeThrowsMade,
          totalFreeThrowsAttempted,
          fgPercentage,
          threePointPercentage,
          ftPercentage,
          avgPoints,
          avgRebounds,
          avgAssists
        })
        .eq('id', player.id)

      if (updateError) {
        console.error(`⚠️ Error updating player ${player.id}:`, updateError)
      } else {
        updatedCount++
      }
    }

    console.log(`✅ Recalculated stats for ${updatedCount} players`)

    return new Response(
      JSON.stringify({ success: true, playersUpdated: updatedCount }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      }
    )
  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    )
  }
})




