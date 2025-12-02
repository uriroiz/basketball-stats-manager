/**
 * IBBAAnalytics - Pure API Analytics Engine
 * 
 * מחלקה לחישוב סטטיסטיקות כדורסל בזמן אמת מנתוני API
 * ללא צורך במסד נתונים - כל החישובים בזיכרון
 */

class IBBAAnalytics {
  constructor(games = []) {
    this.games = games;
  }

  /**
   * עדכון רשימת המשחקים
   */
  setGames(games) {
    this.games = games;
  }

  /**
   * ===============================================
   * TEAM ANALYTICS - סטטיסטיקות קבוצתיות
   * ===============================================
   */

  /**
   * קבלת סכומים כוללים לכל קבוצה
   * @returns {Object} מפה של teamName -> stats
   */
  getTeamStats() {
    console.time('⏱️ Team Stats Calculation');
    
    const teamStats = {};

    this.games.forEach(game => {
      // עבור כל קבוצה במשחק
      game.teams.forEach(team => {
        const teamName = team.name;
        
        if (!teamStats[teamName]) {
          teamStats[teamName] = {
            teamName: teamName,
            gamesPlayed: 0,
            wins: 0,
            losses: 0,
            totalPoints: 0,
            totalPointsAgainst: 0,
            totalRebounds: 0,
            totalAssists: 0,
            totalSteals: 0,
            totalBlocks: 0,
            totalTurnovers: 0,
            totalFouls: 0,
            totalFGM: 0,
            totalFGA: 0,
            total3PM: 0,
            total3PA: 0,
            totalFTM: 0,
            totalFTA: 0,
            totalEfficiency: 0,
            // סטטיסטיקות מתקדמות
            totalPointsFastBreak: 0,
            totalPointsFromTurnovers: 0,
            totalPointsInPaint: 0,
            totalPointsSecondChance: 0,
            totalPointsBench: 0
          };
        }

        const stats = teamStats[teamName];
        stats.gamesPlayed++;

        // ניקוד
        const isHome = team.isHome;
        const teamScore = isHome ? game.homeScore : game.awayScore;
        const oppScore = isHome ? game.awayScore : game.homeScore;
        
        stats.totalPoints += teamScore || 0;
        stats.totalPointsAgainst += oppScore || 0;
        
        // ניצחונות/הפסדים
        if (teamScore > oppScore) {
          stats.wins++;
        } else if (teamScore < oppScore) {
          stats.losses++;
        }

        // השתמש בסטטיסטיקות קבוצתיות (כולל team rebounds) במקום לסכום שחקנים
        const teamStatsForGame = isHome ? game.teamStats?.home : game.teamStats?.away;
        
        if (teamStatsForGame) {
          // סטטיסטיקות שמגיעות מהסכום הקבוצתי (כולל team rebounds)
          stats.totalRebounds += teamStatsForGame.totalRebounds || 0;
          stats.totalAssists += teamStatsForGame.assists || 0;
          stats.totalSteals += teamStatsForGame.steals || 0;
          stats.totalBlocks += teamStatsForGame.blocks || 0;
          stats.totalTurnovers += teamStatsForGame.turnovers || 0;
          stats.totalFouls += teamStatsForGame.personalFouls || 0;
          stats.totalFGM += teamStatsForGame.fieldGoalsMade || 0;
          stats.totalFGA += teamStatsForGame.fieldGoalsAttempted || 0;
          stats.total3PM += teamStatsForGame.threePointsMade || 0;
          stats.total3PA += teamStatsForGame.threePointsAttempted || 0;
          stats.totalFTM += teamStatsForGame.freeThrowsMade || 0;
          stats.totalFTA += teamStatsForGame.freeThrowsAttempted || 0;
          // סטטיסטיקות מתקדמות
          stats.totalPointsFastBreak += teamStatsForGame.pointsFastBreak || 0;
          stats.totalPointsFromTurnovers += teamStatsForGame.pointsFromTurnovers || 0;
          stats.totalPointsInPaint += teamStatsForGame.pointsInPaint || 0;
          stats.totalPointsSecondChance += teamStatsForGame.pointsSecondChance || 0;
          stats.totalPointsBench += teamStatsForGame.pointsBench || 0;
        } else {
          // Fallback: אם אין teamStats, סכום מהשחקנים (backwards compatibility)
          const teamPlayers = game.players.filter(p => p.teamName === teamName);
          teamPlayers.forEach(player => {
            const s = player.stats;
            stats.totalRebounds += s.totalRebounds || 0;
            stats.totalAssists += s.assists || 0;
            stats.totalSteals += s.steals || 0;
            stats.totalBlocks += s.blocks || 0;
            stats.totalTurnovers += s.turnovers || 0;
            stats.totalFouls += s.personalFouls || 0;
            stats.totalFGM += s.fieldGoalsMade || 0;
            stats.totalFGA += s.fieldGoalsAttempted || 0;
            stats.total3PM += s.threePointsMade || 0;
            stats.total3PA += s.threePointsAttempted || 0;
            stats.totalFTM += s.freeThrowsMade || 0;
            stats.totalFTA += s.freeThrowsAttempted || 0;
          });
        }
        
        // Efficiency - תמיד סכום מהשחקנים (teamStats לא כולל efficiency)
        const teamPlayers = game.players.filter(p => p.teamName === teamName);
        teamPlayers.forEach(player => {
          stats.totalEfficiency += player.stats.efficiency || 0;
        });
      });
    });

    console.timeEnd('⏱️ Team Stats Calculation');
    return teamStats;
  }

  /**
   * קבלת ממוצעים לכל קבוצה
   * @returns {Array} מערך ממוין של קבוצות עם ממוצעים
   */
  getTeamAverages() {
    console.time('⏱️ Team Averages Calculation');
    
    const teamStats = this.getTeamStats();
    const teamAverages = [];

    Object.values(teamStats).forEach(team => {
      const games = team.gamesPlayed || 1; // מניעת חלוקה באפס

      teamAverages.push({
        teamName: team.teamName,
        gamesPlayed: team.gamesPlayed,
        wins: team.wins,
        losses: team.losses,
        winPct: team.gamesPlayed > 0 ? (team.wins / team.gamesPlayed * 100).toFixed(1) : '0.0',
        
        // ממוצעים למשחק
        ppg: (team.totalPoints / games).toFixed(1),
        oppPpg: (team.totalPointsAgainst / games).toFixed(1),
        pointDiff: ((team.totalPoints - team.totalPointsAgainst) / games).toFixed(1),
        rpg: (team.totalRebounds / games).toFixed(1),
        apg: (team.totalAssists / games).toFixed(1),
        spg: (team.totalSteals / games).toFixed(1),
        bpg: (team.totalBlocks / games).toFixed(1),
        tpg: (team.totalTurnovers / games).toFixed(1),
        fpg: (team.totalFouls / games).toFixed(1),
        
        // אחוזי קליעה
        fgPct: team.totalFGA > 0 ? (team.totalFGM / team.totalFGA * 100).toFixed(1) : '0.0',
        threePtPct: team.total3PA > 0 ? (team.total3PM / team.total3PA * 100).toFixed(1) : '0.0',
        ftPct: team.totalFTA > 0 ? (team.totalFTM / team.totalFTA * 100).toFixed(1) : '0.0',
        
        // יעילות (מסכום השחקנים מה-API)
        efficiencyAvg: (team.totalEfficiency / games).toFixed(1),
        
        // סטטיסטיקות מתקדמות - ממוצעים
        fastBreakPpg: (team.totalPointsFastBreak / games).toFixed(1),
        pointsFromToPpg: (team.totalPointsFromTurnovers / games).toFixed(1),
        paintPpg: (team.totalPointsInPaint / games).toFixed(1),
        secondChancePpg: (team.totalPointsSecondChance / games).toFixed(1),
        benchPpg: (team.totalPointsBench / games).toFixed(1),
        
        // סכומים (לצורך מיון מתקדם ו-insights)
        _totalPoints: team.totalPoints,
        _totalRebounds: team.totalRebounds,
        _totalAssists: team.totalAssists,
        _totalEfficiency: team.totalEfficiency,
        _totalFGA: team.totalFGA,
        _totalFGM: team.totalFGM,
        _total3PA: team.total3PA,
        _total3PM: team.total3PM,
        _totalPointsFastBreak: team.totalPointsFastBreak,
        _totalPointsFromTurnovers: team.totalPointsFromTurnovers,
        _totalPointsInPaint: team.totalPointsInPaint,
        _totalPointsSecondChance: team.totalPointsSecondChance,
        _totalPointsBench: team.totalPointsBench
      });
    });

    // מיון לפי PPG (ברירת מחדל)
    teamAverages.sort((a, b) => parseFloat(b.ppg) - parseFloat(a.ppg));

    console.timeEnd('⏱️ Team Averages Calculation');
    return teamAverages;
  }

  /**
   * קבלת מאזן בית/חוץ לכל קבוצה
   * @returns {Object} מפה של teamName -> { home: {...}, away: {...} }
   */
  getTeamHomeAwayRecords() {
    console.time('⏱️ Home/Away Records Calculation');
    
    const homeAwayRecords = {};

    this.games.forEach(game => {
      game.teams.forEach(team => {
        const teamName = team.name;
        const isHome = team.isHome;
        
        if (!homeAwayRecords[teamName]) {
          homeAwayRecords[teamName] = {
            teamName: teamName,
            home: {
              games: 0,
              wins: 0,
              losses: 0,
              totalPoints: 0,
              totalPointsAgainst: 0,
              winPoints: 0  // נקודות רק בניצחונות
            },
            away: {
              games: 0,
              wins: 0,
              losses: 0,
              totalPoints: 0,
              totalPointsAgainst: 0,
              winPoints: 0  // נקודות רק בניצחונות
            }
          };
        }

        const record = homeAwayRecords[teamName];
        const location = isHome ? record.home : record.away;
        
        // ניקוד
        const teamScore = isHome ? game.homeScore : game.awayScore;
        const oppScore = isHome ? game.awayScore : game.homeScore;
        
        location.games++;
        location.totalPoints += teamScore || 0;
        location.totalPointsAgainst += oppScore || 0;
        
        // ניצחונות/הפסדים
        if (teamScore > oppScore) {
          location.wins++;
          location.winPoints += teamScore || 0;  // נקודות רק בניצחונות
        } else if (teamScore < oppScore) {
          location.losses++;
        }
      });
    });

    // חישוב ממוצעים
    Object.values(homeAwayRecords).forEach(record => {
      ['home', 'away'].forEach(location => {
        const loc = record[location];
        const games = loc.games || 1;
        
        loc.ppg = (loc.totalPoints / games).toFixed(1);
        loc.oppPpg = (loc.totalPointsAgainst / games).toFixed(1);
        loc.winPct = loc.games > 0 ? ((loc.wins / loc.games) * 100).toFixed(1) : '0.0';
        loc.winPpg = loc.wins > 0 ? (loc.winPoints / loc.wins).toFixed(1) : '0';  // ממוצע נקודות בניצחונות בלבד
      });
    });

    console.timeEnd('⏱️ Home/Away Records Calculation');
    return homeAwayRecords;
  }

  /**
   * קבלת סטטיסטיקות ליגה לניצחונות בבית/חוץ
   * @returns {Object} ממוצעי ליגה לניצחונות
   */
  getLeagueHomeAwayStats() {
    let homeWins = { count: 0, totalPoints: 0, totalPointsAgainst: 0 };
    let awayWins = { count: 0, totalPoints: 0, totalPointsAgainst: 0 };
    
    this.games.forEach(game => {
      if (game.homeScore > game.awayScore) {
        // ניצחון בית
        homeWins.count++;
        homeWins.totalPoints += game.homeScore;
        homeWins.totalPointsAgainst += game.awayScore;
      } else if (game.awayScore > game.homeScore) {
        // ניצחון חוץ
        awayWins.count++;
        awayWins.totalPoints += game.awayScore;
        awayWins.totalPointsAgainst += game.homeScore;
      }
    });
    
    return {
      // ממוצע נקודות בניצחון בית
      homeWinAvgPpg: homeWins.count > 0 ? (homeWins.totalPoints / homeWins.count).toFixed(1) : '0',
      homeWinAvgOppPpg: homeWins.count > 0 ? (homeWins.totalPointsAgainst / homeWins.count).toFixed(1) : '0',
      // ממוצע נקודות בניצחון חוץ
      awayWinAvgPpg: awayWins.count > 0 ? (awayWins.totalPoints / awayWins.count).toFixed(1) : '0',
      awayWinAvgOppPpg: awayWins.count > 0 ? (awayWins.totalPointsAgainst / awayWins.count).toFixed(1) : '0',
      // אחוז ניצחונות בית בליגה
      homeWinPct: this.games.length > 0 ? ((homeWins.count / this.games.length) * 100).toFixed(1) : '0',
      // סה"כ
      homeWinsCount: homeWins.count,
      awayWinsCount: awayWins.count,
      totalGames: this.games.length
    };
  }

  /**
   * ===============================================
   * PLAYER ANALYTICS - סטטיסטיקות שחקנים
   * ===============================================
   */

  /**
   * קבלת סכומים כוללים לכל שחקן
   * @returns {Object} מפה של playerId -> stats
   */
  getPlayerStats() {
    console.time('⏱️ Player Stats Calculation');
    
    const playerStats = {};

    this.games.forEach(game => {
      game.players.forEach(player => {
        const playerId = player.playerId;
        
        // המרת דקות (אם בפורמט מחרוזת "MM:SS")
        let minutes = player.calculated?.minutesDecimal || 0;
        
        // Fallback: אם calculated לא קיים, נסה להמיר ישירות מ-stats.minutesPlayed
        if (minutes === 0 && player.stats?.minutesPlayed) {
          const minStr = player.stats.minutesPlayed;
          if (minStr && minStr !== '0:00') {
            const parts = String(minStr).split(':');
            const mins = parseInt(parts[0]) || 0;
            const secs = parseInt(parts[1]) || 0;
            minutes = mins + (secs / 60);
          }
        }
        
        // דלג על שחקנים שלא שיחקו בפועל (0 דקות)
        if (minutes === 0) {
          return;
        }

        if (!playerStats[playerId]) {
          playerStats[playerId] = {
            playerId: playerId,
            name: `Player #${player.jersey}`, // אין לנו שמות אמיתיים
            jersey: player.jersey,
            teamName: player.teamName,
            gamesPlayed: 0,
            totalPoints: 0,
            totalRebounds: 0,
            totalAssists: 0,
            totalSteals: 0,
            totalBlocks: 0,
            totalTurnovers: 0,
            totalFouls: 0,
            totalFoulsDrawn: 0,
            totalMinutes: 0,
            totalFGM: 0,
            totalFGA: 0,
            total3PM: 0,
            total3PA: 0,
            totalFTM: 0,
            totalFTA: 0,
            totalEfficiency: 0,
            totalPlusMinus: 0
          };
        }

        const stats = playerStats[playerId];
        stats.gamesPlayed++;

        const s = player.stats;
        stats.totalPoints += s.points || 0;
        stats.totalRebounds += s.totalRebounds || 0;
        stats.totalAssists += s.assists || 0;
        stats.totalSteals += s.steals || 0;
        stats.totalBlocks += s.blocks || 0;
        stats.totalTurnovers += s.turnovers || 0;
        stats.totalFouls += s.personalFouls || 0;
        stats.totalFoulsDrawn += s.foulsDrawn || 0;
        stats.totalFGM += s.fieldGoalsMade || 0;
        stats.totalFGA += s.fieldGoalsAttempted || 0;
        stats.total3PM += s.threePointsMade || 0;
        stats.total3PA += s.threePointsAttempted || 0;
        stats.totalFTM += s.freeThrowsMade || 0;
        stats.totalFTA += s.freeThrowsAttempted || 0;
        stats.totalEfficiency += s.efficiency || 0;
        stats.totalPlusMinus += s.plusMinus || 0;
        
        stats.totalMinutes += minutes;
      });
    });

    console.timeEnd('⏱️ Player Stats Calculation');
    return playerStats;
  }

  /**
   * קבלת ממוצעים לכל שחקן
   * @returns {Array} מערך ממוין של שחקנים עם ממוצעים
   */
  getPlayerAverages() {
    console.time('⏱️ Player Averages Calculation');
    
    const playerStats = this.getPlayerStats();
    const playerAverages = [];

    Object.values(playerStats).forEach(player => {
      const games = player.gamesPlayed || 1;

      // Try to get Plus/Minus from playerNamesLoader (pre-calculated by client)
      let totalPlusMinus = player.totalPlusMinus;
      let plusMinusPg = (totalPlusMinus / games).toFixed(1);
      
      if (window.playerNamesLoader?.namesMap) {
        const playerData = window.playerNamesLoader.namesMap.get(String(player.playerId));
        if (playerData && typeof playerData.totalPlusMinus === 'number') {
          // Use pre-calculated value from client
          totalPlusMinus = playerData.totalPlusMinus;
          plusMinusPg = (totalPlusMinus / games).toFixed(1);
        }
      }
      
      playerAverages.push({
        playerId: player.playerId,
        name: player.name,
        jersey: player.jersey,
        teamName: player.teamName,
        gamesPlayed: player.gamesPlayed,
        
        // ממוצעים למשחק
        ppg: (player.totalPoints / games).toFixed(1),
        rpg: (player.totalRebounds / games).toFixed(1),
        apg: (player.totalAssists / games).toFixed(1),
        spg: (player.totalSteals / games).toFixed(1),
        bpg: (player.totalBlocks / games).toFixed(1),
        tpg: (player.totalTurnovers / games).toFixed(1),
        fpg: (player.totalFouls / games).toFixed(1),
        foulsDrawnPg: (player.totalFoulsDrawn / games).toFixed(1),
        mpg: (player.totalMinutes / games).toFixed(1),
        efficiencyAvg: (player.totalEfficiency / games).toFixed(1),
        plusMinusPg: plusMinusPg,
        
        // אחוזי קליעה
        fgPct: player.totalFGA > 0 ? (player.totalFGM / player.totalFGA * 100).toFixed(1) : '0.0',
        threePtPct: player.total3PA > 0 ? (player.total3PM / player.total3PA * 100).toFixed(1) : '0.0',
        ftPct: player.totalFTA > 0 ? (player.totalFTM / player.totalFTA * 100).toFixed(1) : '0.0',
        
        // סכומים (לצורך מיון וחישובים)
        _totalPoints: player.totalPoints,
        _totalRebounds: player.totalRebounds,
        _totalAssists: player.totalAssists,
        _totalFGM: player.totalFGM,
        _totalFGA: player.totalFGA,
        _total3PM: player.total3PM,
        _total3PA: player.total3PA,
        _totalFTM: player.totalFTM,
        _totalFTA: player.totalFTA,
        _totalPlusMinus: totalPlusMinus
      });
    });

    // מיון לפי PPG (ברירת מחדל)
    playerAverages.sort((a, b) => parseFloat(b.ppg) - parseFloat(a.ppg));

    console.timeEnd('⏱️ Player Averages Calculation');
    return playerAverages;
  }

  /**
   * ===============================================
   * UTILITY FUNCTIONS
   * ===============================================
   */

  /**
   * קבלת Top N קבוצות לפי מדד מסוים
   */
  getTopTeams(metric = 'ppg', limit = 10) {
    const teams = this.getTeamAverages();
    
    // מיון לפי המדד המבוקש
    teams.sort((a, b) => {
      const aVal = parseFloat(a[metric]) || 0;
      const bVal = parseFloat(b[metric]) || 0;
      return bVal - aVal;
    });
    
    return teams.slice(0, limit);
  }

  /**
   * קבלת Top N שחקנים לפי מדד מסוים
   */
  getTopPlayers(metric = 'ppg', limit = 10) {
    const players = this.getPlayerAverages();
    
    // מיון לפי המדד המבוקש
    players.sort((a, b) => {
      const aVal = parseFloat(a[metric]) || 0;
      const bVal = parseFloat(b[metric]) || 0;
      return bVal - aVal;
    });
    
    return players.slice(0, limit);
  }

  /**
   * סטטיסטיקות כלליות על המערך
   */
  getOverallStats() {
    const teams = Object.keys(this.getTeamStats()).length;
    const players = Object.keys(this.getPlayerStats()).length;
    
    return {
      totalGames: this.games.length,
      totalTeams: teams,
      totalPlayers: players,
      avgPlayersPerGame: this.games.length > 0 ? (players / this.games.length).toFixed(1) : '0.0'
    };
  }
}

// Export to global scope
window.IBBAAnalytics = IBBAAnalytics;

console.log('📊 IBBAAnalytics loaded successfully!');

