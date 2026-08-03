import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.39.0'

export interface PlayerGamesRow {
  id: string
  games: unknown
}

export interface GameIdRow {
  gameSerial: number
}

export async function loadAllGameIds(client: SupabaseClient): Promise<GameIdRow[]> {
  const pageSize = 1000
  const games: GameIdRow[] = []
  for (let from = 0; from < 100_000; from += pageSize) {
    const { data, error } = await client
      .from('games')
      .select('gameSerial')
      .order('gameSerial', { ascending: true })
      .range(from, from + pageSize - 1)
    if (error) throw new Error('Games could not be loaded')
    games.push(...(data || []))
    if (!data || data.length < pageSize) return games
  }
  throw new Error('Game safety limit exceeded')
}

export async function loadAllPlayerGames(client: SupabaseClient): Promise<PlayerGamesRow[]> {
  const pageSize = 1000
  const players: PlayerGamesRow[] = []

  for (let from = 0; from < 20_000; from += pageSize) {
    const { data, error } = await client
      .from('players')
      .select('id,games')
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1)
    if (error) throw new Error('Players could not be loaded')
    players.push(...(data || []))
    if (!data || data.length < pageSize) return players
  }

  throw new Error('Player safety limit exceeded')
}
