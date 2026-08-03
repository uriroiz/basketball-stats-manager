const numberValue = (value: unknown): number => {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

export function calculatePlayerStats(gamesValue: unknown) {
  const games = Array.isArray(gamesValue) ? gamesValue : []
  const total = (field: string, fallback?: string) => games.reduce(
    (sum, game) => sum + numberValue(game?.[field] ?? (fallback ? game?.[fallback] : 0)),
    0,
  )

  const totalPoints = total('points')
  const totalRebounds = total('rebounds')
  const totalAssists = total('assists')
  const totalSteals = total('steals')
  const totalBlocks = total('blocks')
  const totalTurnovers = total('turnovers')
  const totalFouls = total('fouls')
  const totalFoulsDrawn = total('foulsDrawn', 'foulsOn')
  const totalEfficiency = total('efficiency')
  const totalFieldGoalsMade = total('fieldGoalsMade')
  const totalFieldGoalsAttempted = total('fieldGoalsAttempted')
  const totalThreePointsMade = total('threePointsMade')
  const totalThreePointsAttempted = total('threePointsAttempted')
  const totalFreeThrowsMade = total('freeThrowsMade')
  const totalFreeThrowsAttempted = total('freeThrowsAttempted')
  const count = games.length
  const average = (value: number) => count ? value / count : 0
  const percentage = (made: number, attempted: number) => attempted ? (made / attempted) * 100 : 0

  return {
    games,
    totalPoints,
    totalRebounds,
    totalAssists,
    totalSteals,
    totalBlocks,
    totalTurnovers,
    totalFouls,
    totalFoulsDrawn,
    totalEfficiency,
    totalFieldGoalsMade,
    totalFieldGoalsAttempted,
    totalThreePointsMade,
    totalThreePointsAttempted,
    totalFreeThrowsMade,
    totalFreeThrowsAttempted,
    fgPercentage: percentage(totalFieldGoalsMade, totalFieldGoalsAttempted),
    threePointPercentage: percentage(totalThreePointsMade, totalThreePointsAttempted),
    ftPercentage: percentage(totalFreeThrowsMade, totalFreeThrowsAttempted),
    avgEfficiency: average(totalEfficiency),
    avgPoints: average(totalPoints),
    avgRebounds: average(totalRebounds),
    avgAssists: average(totalAssists),
    avgSteals: average(totalSteals),
    avgBlocks: average(totalBlocks),
    avgTurnovers: average(totalTurnovers),
  }
}
