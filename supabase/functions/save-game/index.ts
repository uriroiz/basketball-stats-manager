import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-password',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get admin password from header
    const authPassword = req.headers.get('x-admin-password')
    const expectedPassword = Deno.env.get('ADMIN_PASSWORD')
    
    console.log('🔐 Checking authentication...')
    
    if (!authPassword || authPassword !== expectedPassword) {
      console.log('❌ Authentication failed')
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid admin password' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    console.log('✅ Authentication successful')

    // Create Supabase client with SERVICE_ROLE_KEY (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get data from request
    const { gameData, playersData } = await req.json()
    
    console.log('📦 Received data:', {
      gameSerial: gameData?.gameSerial,
      playersCount: playersData?.length || 0
    })

    // Save game
    console.log('💾 Saving game...')
    const { data: game, error: gameError } = await supabaseAdmin
      .from('games')
      .upsert(gameData, { onConflict: 'gameSerial' })
      .select()
      .single()

    if (gameError) {
      console.error('❌ Game save error:', gameError)
      throw gameError
    }
    
    console.log('✅ Game saved:', game.gameSerial)

    // Save players
    let playersSaved = 0
    if (playersData && playersData.length > 0) {
      console.log('💾 Saving players...')
      for (const player of playersData) {
        const { error: playerError } = await supabaseAdmin
          .from('players')
          .upsert(player, { onConflict: 'id' })
        
        if (playerError) {
          console.error('⚠️ Player save error:', playerError)
          // Continue with other players even if one fails
        } else {
          playersSaved++
        }
      }
      console.log(`✅ Players saved: ${playersSaved}/${playersData.length}`)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        gameId: game.gameSerial,
        playersSaved: playersSaved
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.toString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

