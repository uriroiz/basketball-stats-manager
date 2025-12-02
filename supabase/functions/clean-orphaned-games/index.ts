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

    console.log(`🧹 Cleaning orphaned games from players...`)

    // Step 1: Get all existing game IDs
    const { data: gamesData, error: gamesError } = await supabase
      .from('games')
      .select('gameSerial')

    if (gamesError) {
      console.error('Error fetching games:', gamesError)
      return new Response(
        JSON.stringify({ error: gamesError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    const validGameIds = new Set(gamesData.map(g => g.gameSerial))
    console.log(`📋 Valid games: ${validGameIds.size}`, Array.from(validGameIds))

    // Step 2: Get all players
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

    console.log(`👥 Found ${playersData?.length || 0} players`)

    let cleanedCount = 0
    let orphanedGamesFound = new Set()

    // Step 3: Clean each player
    for (const player of playersData || []) {
      const originalGames = player.games || []
      const cleanedGames = originalGames.filter(g => {
        const gameId = g.gameId || g.gameSerial
        const isValid = validGameIds.has(gameId)
        if (!isValid) {
          orphanedGamesFound.add(gameId)
        }
        return isValid
      })
      
      if (cleanedGames.length !== originalGames.length) {
        console.log(`🧹 ${player.name}: ${originalGames.length} → ${cleanedGames.length} games`)
        
        // Recalculate stats
        const totalGames = cleanedGames.length
        const totalPoints = cleanedGames.reduce((sum, g) => sum + (g.points || 0), 0)
        const totalRebounds = cleanedGames.reduce((sum, g) => sum + (g.rebounds || 0), 0)
        const totalAssists = cleanedGames.reduce((sum, g) => sum + (g.assists || 0), 0)
        
        const avgPoints = totalGames > 0 ? totalPoints / totalGames : 0
        const avgRebounds = totalGames > 0 ? totalRebounds / totalGames : 0
        const avgAssists = totalGames > 0 ? totalAssists / totalGames : 0
        
        const { error: updateError } = await supabase
          .from('players')
          .update({
            games: cleanedGames,
            totalPoints,
            totalRebounds,
            totalAssists,
            avgPoints,
            avgRebounds,
            avgAssists
          })
          .eq('id', player.id)

        if (updateError) {
          console.error(`⚠️ Error updating player ${player.id}:`, updateError)
        } else {
          cleanedCount++
        }
      }
    }

    console.log(`✅ Cleaned ${cleanedCount} players`)
    console.log(`🗑️ Orphaned games removed: ${Array.from(orphanedGamesFound)}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        playersCleaned: cleanedCount,
        orphanedGamesRemoved: Array.from(orphanedGamesFound)
      }),
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




