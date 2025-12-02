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

    // Parse request body
    const { gameSerial } = await req.json()
    
    if (!gameSerial && gameSerial !== 0) {
      return new Response(
        JSON.stringify({ error: 'Missing gameSerial' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    // Create Supabase client with Service Role key (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log(`🗑️ Deleting game with gameSerial: ${gameSerial}`)

    // Step 1: Get all players that have this game
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

    console.log(`📋 Found ${playersData?.length || 0} players total`)

    // Step 2: Update each player - remove the game from their games array
    let updatedPlayersCount = 0
    for (const player of playersData || []) {
      const games = player.games || []
      const filteredGames = games.filter(g => g.gameId !== gameSerial && g.gameSerial !== gameSerial)
      
      if (filteredGames.length !== games.length) {
        // This player had the deleted game, update their stats
        const totalGames = filteredGames.length
        
        // Recalculate totals
        const totalPoints = filteredGames.reduce((sum, g) => sum + (g.points || 0), 0)
        const totalRebounds = filteredGames.reduce((sum, g) => sum + (g.rebounds || 0), 0)
        const totalAssists = filteredGames.reduce((sum, g) => sum + (g.assists || 0), 0)
        const totalSteals = filteredGames.reduce((sum, g) => sum + (g.steals || 0), 0)
        const totalBlocks = filteredGames.reduce((sum, g) => sum + (g.blocks || 0), 0)
        const totalTurnovers = filteredGames.reduce((sum, g) => sum + (g.turnovers || 0), 0)
        const totalFouls = filteredGames.reduce((sum, g) => sum + (g.fouls || 0), 0)
        const totalFoulsDrawn = filteredGames.reduce((sum, g) => sum + (g.foulsDrawn || 0), 0)
        const totalFieldGoalsMade = filteredGames.reduce((sum, g) => sum + (g.fieldGoalsMade || 0), 0)
        const totalFieldGoalsAttempted = filteredGames.reduce((sum, g) => sum + (g.fieldGoalsAttempted || 0), 0)
        const totalThreePointsMade = filteredGames.reduce((sum, g) => sum + (g.threePointsMade || 0), 0)
        const totalThreePointsAttempted = filteredGames.reduce((sum, g) => sum + (g.threePointsAttempted || 0), 0)
        const totalFreeThrowsMade = filteredGames.reduce((sum, g) => sum + (g.freeThrowsMade || 0), 0)
        const totalFreeThrowsAttempted = filteredGames.reduce((sum, g) => sum + (g.freeThrowsAttempted || 0), 0)
        
        // Calculate percentages
        const fgPercentage = totalFieldGoalsAttempted > 0 ? (totalFieldGoalsMade / totalFieldGoalsAttempted) * 100 : 0
        const threePointPercentage = totalThreePointsAttempted > 0 ? (totalThreePointsMade / totalThreePointsAttempted) * 100 : 0
        const ftPercentage = totalFreeThrowsAttempted > 0 ? (totalFreeThrowsMade / totalFreeThrowsAttempted) * 100 : 0
        
        // Calculate averages
        const avgPoints = totalGames > 0 ? totalPoints / totalGames : 0
        const avgRebounds = totalGames > 0 ? totalRebounds / totalGames : 0
        const avgAssists = totalGames > 0 ? totalAssists / totalGames : 0
        
        const { error: updateError } = await supabase
          .from('players')
          .update({
            games: filteredGames,
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
          updatedPlayersCount++
        }
      }
    }

    console.log(`✅ Updated ${updatedPlayersCount} players`)

    // Step 3: Delete game from games table
    const { error: deleteError } = await supabase
      .from('games')
      .delete()
      .eq('gameSerial', gameSerial)

    if (deleteError) {
      console.error('Error deleting game:', deleteError)
      return new Response(
        JSON.stringify({ error: deleteError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    console.log(`✅ Game ${gameSerial} deleted successfully`)

    return new Response(
      JSON.stringify({ success: true, gameSerial, playersUpdated: updatedPlayersCount }),
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

