/**
 * IBBAAdvanced - Advanced Analytics & Game Preparation
 * 
 * מטריקות מתקדמות, טרנדים, ניתוח H2H והכנה למשחק
 * מבוסס על preGamePrep.js ו-preGameNarratives.js מהמערכת הקיימת
 */

class IBBAAdvanced {
  constructor(analytics) {
    this.analytics = analytics;
  }

  /**
   * ===============================================
   * ADVANCED TEAM METRICS
   * ===============================================
   */

  /**
   * חישוב מטריקות מתקדמות לכל קבוצה
   */
  getAdvancedTeamMetrics() {
    console.time('⏱️ Advanced Team Metrics');
    
    const teamStats = this.analytics.getTeamStats();
    const advancedMetrics = {};

    Object.values(teamStats).forEach(team => {
      const games = team.gamesPlayed || 1;
      
      // Possessions estimate (Dean Oliver formula)
      // FGA - ORB + TOV + 0.44*FTA (per game average)
      const fga = team.totalFGA / games;
      const orb = 0; // אין לנו offensive rebounds נפרדים כרגע
      const tov = team.totalTurnovers / games;
      const fta = team.totalFTA / games;
      const possessions = fga + tov + (0.44 * fta);

      // True Shooting % = PTS / (2 * (FGA + 0.44 * FTA))
      const tsAttempts = team.totalFGA + (0.44 * team.totalFTA);
      const tsPct = tsAttempts > 0 ? (team.totalPoints / (2 * tsAttempts)) : 0;

      // Effective FG% = (FGM + 0.5 * 3PM) / FGA
      const efgPct = team.totalFGA > 0 
        ? ((team.totalFGM + 0.5 * team.total3PM) / team.totalFGA)
        : 0;

      // Offensive Rating = Points per 100 possessions
      const offRtg = possessions > 0 ? (team.totalPoints / games / possessions * 100) : 0;

      // Defensive Rating = Opponent Points per 100 possessions (estimate)
      const defRtg = possessions > 0 ? (team.totalPointsAgainst / games / possessions * 100) : 0;

      // Net Rating
      const netRtg = offRtg - defRtg;

      // Pace = Possessions per 40 minutes
      const pace = possessions; // כבר לפי משחק

      // 3-Point Attempt Rate
      const threePAR = team.totalFGA > 0 ? (team.total3PA / team.totalFGA) : 0;

      // Assist Rate (assists per FGM)
      const astRate = team.totalFGM > 0 ? (team.totalAssists / team.totalFGM) : 0;

      // Turnover Rate (turnovers per 100 possessions)
      const tovRate = possessions > 0 ? (team.totalTurnovers / games / possessions * 100) : 0;

      advancedMetrics[team.teamName] = {
        teamName: team.teamName,
        gamesPlayed: games,
        
        // Advanced shooting
        tsPct: (tsPct * 100).toFixed(1),
        efgPct: (efgPct * 100).toFixed(1),
        threePAR: (threePAR * 100).toFixed(1),
        
        // Ratings
        offRtg: offRtg.toFixed(1),
        defRtg: defRtg.toFixed(1),
        netRtg: netRtg.toFixed(1),
        
        // Pace & Style
        pace: pace.toFixed(1),
        astRate: (astRate * 100).toFixed(1),
        tovRate: tovRate.toFixed(1),
        
        // Basic stats (for reference)
        ppg: (team.totalPoints / games).toFixed(1),
        oppPpg: (team.totalPointsAgainst / games).toFixed(1)
      };
    });

    console.timeEnd('⏱️ Advanced Team Metrics');
    return advancedMetrics;
  }

  /**
   * ===============================================
   * TRENDS & MOMENTUM
   * ===============================================
   */

  /**
   * ניתוח טרנדים - Last N games
   */
  getTeamTrends(windowSize = 5) {
    console.time('⏱️ Team Trends Calculation');
    
    const games = this.analytics.games;
    const trends = {};

    // קבוצת משחקים לפי קבוצה
    const teamGames = {};
    
    games.forEach(game => {
      game.teams.forEach(team => {
        if (!teamGames[team.name]) {
          teamGames[team.name] = [];
        }
        
        teamGames[team.name].push({
          date: game.date,
          isHome: team.isHome,
          score: team.score,
          oppScore: team.isHome ? game.awayScore : game.homeScore,
          won: team.score > (team.isHome ? game.awayScore : game.homeScore)
        });
      });
    });

    // חישוב טרנדים לכל קבוצה
    Object.entries(teamGames).forEach(([teamName, games]) => {
      // מיון לפי תאריך
      games.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      const totalGames = games.length;
      const lastNGames = games.slice(-windowSize);
      
      // Season averages
      const seasonPpg = games.reduce((sum, g) => sum + g.score, 0) / totalGames;
      const seasonOppPpg = games.reduce((sum, g) => sum + g.oppScore, 0) / totalGames;
      const seasonWinPct = games.filter(g => g.won).length / totalGames;
      
      // Last N averages
      const lastNPpg = lastNGames.reduce((sum, g) => sum + g.score, 0) / lastNGames.length;
      const lastNOppPpg = lastNGames.reduce((sum, g) => sum + g.oppScore, 0) / lastNGames.length;
      const lastNWins = lastNGames.filter(g => g.won).length;
      
      // Momentum calculation (slope)
      const recentScores = lastNGames.map(g => g.score - g.oppScore);
      const momentum = this.calculateSlope(recentScores);
      
      // Trend direction
      let trend = 'stable';
      if (momentum > 2) trend = 'improving';
      else if (momentum < -2) trend = 'declining';
      
      // Hot/Cold streak
      const streak = this.calculateStreak(games);

      trends[teamName] = {
        teamName,
        totalGames,
        lastN: lastNGames.length,
        
        // Season stats
        seasonPpg: seasonPpg.toFixed(1),
        seasonOppPpg: seasonOppPpg.toFixed(1),
        seasonWinPct: (seasonWinPct * 100).toFixed(1),
        
        // Last N stats
        lastNPpg: lastNPpg.toFixed(1),
        lastNOppPpg: lastNOppPpg.toFixed(1),
        lastNWins: lastNWins,
        lastNWinPct: (lastNWins / lastNGames.length * 100).toFixed(1),
        
        // Momentum
        momentum: momentum.toFixed(1),
        trend: trend,
        streak: streak,
        
        // Comparison
        ppgChange: (lastNPpg - seasonPpg).toFixed(1),
        oppPpgChange: (lastNOppPpg - seasonOppPpg).toFixed(1)
      };
    });

    console.timeEnd('⏱️ Team Trends Calculation');
    return trends;
  }

  /**
   * חישוב slope (מגמה) של סדרת מספרים
   */
  calculateSlope(values) {
    const n = values.length;
    if (n <= 1) return 0;
    
    const xs = Array.from({length: n}, (_, i) => i);
    const xMean = xs.reduce((a, b) => a + b, 0) / n;
    const yMean = values.reduce((a, b) => a + b, 0) / n;
    
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < n; i++) {
      numerator += (xs[i] - xMean) * (values[i] - yMean);
      denominator += (xs[i] - xMean) * (xs[i] - xMean);
    }
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * זיהוי רצף (streak)
   */
  calculateStreak(games) {
    if (games.length === 0) return { type: 'none', count: 0 };
    
    let currentStreak = 0;
    const lastResult = games[games.length - 1].won;
    
    // ספירה לאחור עד שמשתנה התוצאה
    for (let i = games.length - 1; i >= 0; i--) {
      if (games[i].won === lastResult) {
        currentStreak++;
      } else {
        break;
      }
    }
    
    return {
      type: lastResult ? 'win' : 'loss',
      count: currentStreak
    };
  }

  /**
   * ===============================================
   * HEAD-TO-HEAD ANALYSIS
   * ===============================================
   */

  /**
   * קבלת היסטוריית H2H בין שתי קבוצות
   */
  getH2HHistory(teamA, teamB) {
    console.time('⏱️ H2H History Calculation');
    
    const games = this.analytics.games;
    const h2hGames = [];

    games.forEach(game => {
      const teams = game.teams.map(t => t.name);
      
      if (teams.includes(teamA) && teams.includes(teamB)) {
        const teamAData = game.teams.find(t => t.name === teamA);
        const teamBData = game.teams.find(t => t.name === teamB);
        
        h2hGames.push({
          date: game.date,
          gameId: game.gameId,
          teamAScore: teamAData.score,
          teamBScore: teamBData.score,
          winner: teamAData.score > teamBData.score ? teamA : teamB,
          margin: Math.abs(teamAData.score - teamBData.score),
          teamAHome: teamAData.isHome
        });
      }
    });

    // מיון לפי תאריך
    h2hGames.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Statistics
    const teamAWins = h2hGames.filter(g => g.winner === teamA).length;
    const teamBWins = h2hGames.filter(g => g.winner === teamB).length;
    const avgMargin = h2hGames.length > 0
      ? h2hGames.reduce((sum, g) => sum + g.margin, 0) / h2hGames.length
      : 0;

    console.timeEnd('⏱️ H2H History Calculation');

    return {
      teamA,
      teamB,
      totalGames: h2hGames.length,
      teamAWins,
      teamBWins,
      avgMargin: avgMargin.toFixed(1),
      games: h2hGames,
      lastMeeting: h2hGames.length > 0 ? h2hGames[h2hGames.length - 1] : null
    };
  }

  /**
   * ===============================================
   * MATCHUP REPORT
   * ===============================================
   */

  /**
   * בניית דוח מקיף לפני משחק
   */
  buildMatchupReport(teamA, teamB) {
    console.time('⏱️ Matchup Report');
    
    // Get all necessary data
    const teamAveragesArray = this.analytics.getTeamAverages(); // מחזיר מערך
    const advancedMetrics = this.getAdvancedTeamMetrics();
    const trends = this.getTeamTrends(5);
    const h2h = this.getH2HHistory(teamA, teamB);

    // Find team data
    const teamAStats = teamAveragesArray.find(t => t.teamName === teamA);
    const teamBStats = teamAveragesArray.find(t => t.teamName === teamB);
    const teamAAdv = advancedMetrics[teamA];
    const teamBAdv = advancedMetrics[teamB];
    const teamATrend = trends[teamA];
    const teamBTrend = trends[teamB];

    // Build comparison
    const comparison = {
      offense: {
        teamAPpg: parseFloat(teamAStats?.ppg || 0),
        teamBPpg: parseFloat(teamBStats?.ppg || 0),
        advantage: null
      },
      defense: {
        teamAOppPpg: parseFloat(teamAStats?.oppPpg || 0),
        teamBOppPpg: parseFloat(teamBStats?.oppPpg || 0),
        advantage: null
      },
      efficiency: {
        teamATS: parseFloat(teamAAdv?.tsPct || 0),
        teamBTS: parseFloat(teamBAdv?.tsPct || 0),
        advantage: null
      },
      pace: {
        teamAPace: parseFloat(teamAAdv?.pace || 0),
        teamBPace: parseFloat(teamBAdv?.pace || 0),
        expectedPace: 0
      }
    };

    // Calculate advantages
    comparison.offense.advantage = comparison.offense.teamAPpg > comparison.offense.teamBPpg ? teamA : teamB;
    comparison.defense.advantage = comparison.defense.teamAOppPpg < comparison.defense.teamBOppPpg ? teamA : teamB;
    comparison.efficiency.advantage = comparison.efficiency.teamATS > comparison.efficiency.teamBTS ? teamA : teamB;
    comparison.pace.expectedPace = ((comparison.pace.teamAPace + comparison.pace.teamBPace) / 2).toFixed(1);

    // Build narrative
    const narrative = this.buildNarrative(teamA, teamB, teamAStats, teamBStats, teamAAdv, teamBAdv, teamATrend, teamBTrend, h2h, comparison);

    console.timeEnd('⏱️ Matchup Report');

    return {
      teamA: {
        name: teamA,
        stats: teamAStats,
        advanced: teamAAdv,
        trend: teamATrend
      },
      teamB: {
        name: teamB,
        stats: teamBStats,
        advanced: teamBAdv,
        trend: teamBTrend
      },
      h2h: h2h,
      comparison: comparison,
      narrative: narrative,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * בניית נרטיב לשדרן (מבוסס על preGameNarratives.js)
   */
  buildNarrative(teamA, teamB, statsA, statsB, advA, advB, trendA, trendB, h2h, comparison) {
    const tldr = [];
    const sections = {};

    // TL;DR - נקודות עיקריות
    tldr.push(`${teamA} vs ${teamB} - ${h2h.totalGames} מפגשים קודמים (${teamA}: ${h2h.teamAWins} ניצחונות, ${teamB}: ${h2h.teamBWins})`);
    
    if (comparison.offense.advantage === teamA) {
      tldr.push(`יתרון התקפי ל-${teamA}: ${comparison.offense.teamAPpg} נק' למשחק לעומת ${comparison.offense.teamBPpg}`);
    } else {
      tldr.push(`יתרון התקפי ל-${teamB}: ${comparison.offense.teamBPpg} נק' למשחק לעומת ${comparison.offense.teamAPpg}`);
    }

    if (trendA && trendA.trend === 'improving') {
      tldr.push(`${teamA} במגמת עלייה - ${trendA.lastNWins}/${trendA.lastN} ב-${trendA.lastN} משחקים אחרונים`);
    }
    
    if (trendB && trendB.trend === 'improving') {
      tldr.push(`${teamB} במגמת עלייה - ${trendB.lastNWins}/${trendB.lastN} ב-${trendB.lastN} משחקים אחרונים`);
    }

    tldr.push(`קצב משחק צפוי: ${comparison.pace.expectedPace} פוזשנים למשחק`);

    // Sections
    sections['קצב צפוי'] = [
      `משוקלל מקצב שתי הקבוצות: ${comparison.pace.expectedPace} פוזשנים למשחק`,
      `${teamA}: ${advA?.pace || 'N/A'} | ${teamB}: ${advB?.pace || 'N/A'}`
    ];

    sections['פרופיל קליעה'] = [
      `${teamA} - TS%: ${advA?.tsPct || 'N/A'}% | eFG%: ${advA?.efgPct || 'N/A'}% | 3PAR: ${advA?.threePAR || 'N/A'}%`,
      `${teamB} - TS%: ${advB?.tsPct || 'N/A'}% | eFG%: ${advB?.efgPct || 'N/A'}% | 3PAR: ${advB?.threePAR || 'N/A'}%`,
      comparison.efficiency.advantage === teamA 
        ? `יתרון יעילות ל-${teamA}`
        : `יתרון יעילות ל-${teamB}`
    ];

    sections['פורמה אחרונה'] = [];
    if (trendA) {
      sections['פורמה אחרונה'].push(
        `${teamA}: ${trendA.lastNWins}/${trendA.lastN} משחקים | ${trendA.lastNPpg} נק' למשחק | מגמה: ${trendA.trend === 'improving' ? 'עולה' : trendA.trend === 'declining' ? 'יורדת' : 'יציבה'}`
      );
    }
    if (trendB) {
      sections['פורמה אחרונה'].push(
        `${teamB}: ${trendB.lastNWins}/${trendB.lastN} משחקים | ${trendB.lastNPpg} נק' למשחק | מגמה: ${trendB.trend === 'improving' ? 'עולה' : trendB.trend === 'declining' ? 'יורדת' : 'יציבה'}`
      );
    }

    sections['מפגשים ישירים'] = [
      `${h2h.totalGames} משחקים בעונה זו`,
      `${teamA}: ${h2h.teamAWins} ניצחונות | ${teamB}: ${h2h.teamBWins} ניצחונות`,
      `פער ממוצע: ${h2h.avgMargin} נקודות`
    ];

    if (h2h.lastMeeting) {
      sections['מפגשים ישירים'].push(
        `מפגש אחרון: ${h2h.lastMeeting.winner} ניצחה ${h2h.lastMeeting.teamAScore}-${h2h.lastMeeting.teamBScore}`
      );
    }

    return {
      tldr: tldr.slice(0, 5),
      sections: sections
    };
  }
}

// Export to global scope
window.IBBAAdvanced = IBBAAdvanced;

console.log('🔥 IBBAAdvanced loaded successfully!');

