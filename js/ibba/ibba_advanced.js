/**
 * IBBAAdvanced - Advanced Analytics & Game Preparation
 * 
 * מטריקות מתקדמות, טרנדים, ניתוח H2H והכנה למשחק
 * מבוסס על preGamePrep.js ו-preGameNarratives.js מהמערכת הקיימת
 */

class IBBAAdvanced {
  constructor(analytics) {
    this.analytics = analytics;
    this.standingsFromHTML = new Map(); // Cache for standings loaded from HTML
    this.standingsLoaded = false;
    this.leagueUrl = 'https://ibasketball.co.il/league/2025-2/';
    this.standingsCacheKey = 'ibba_standings_html_2025-2_v1';
    this.standingsCacheExpiry = 10 * 60 * 1000; // 10 minutes
    this.playerNamesLoader = null; // Player names loader instance
    
    // Try loading from cache
    this.loadStandingsFromCache();
  }

  /**
   * הגדרת שמות שחקנים למנוע Insights
   * @param {Object} playerNamesLoader - Instance של IBBAPlayerNames
   */
  setPlayerNames(playerNamesLoader) {
    this.playerNamesLoader = playerNamesLoader;
  }

  /**
   * ===============================================
   * STANDINGS FROM HTML
   * ===============================================
   */

  /**
   * Load standings from sessionStorage cache
   * @private
   */
  loadStandingsFromCache() {
    try {
      const cached = sessionStorage.getItem(this.standingsCacheKey);
      if (!cached) return false;

      const data = JSON.parse(cached);
      const now = Date.now();

      // Check expiry
      if (data.timestamp && (now - data.timestamp) < this.standingsCacheExpiry) {
        console.log('✅ Loaded standings from cache');
        this.standingsFromHTML = new Map(data.standings);
        this.standingsLoaded = true;
        return true;
      } else {
        console.log('⏰ Standings cache expired');
        sessionStorage.removeItem(this.standingsCacheKey);
        return false;
      }
    } catch (error) {
      console.warn('⚠️ Failed to load standings from cache:', error);
      return false;
    }
  }

  /**
   * Save standings to sessionStorage cache
   * @private
   */
  saveStandingsToCache() {
    try {
      const data = {
        standings: Array.from(this.standingsFromHTML.entries()),
        timestamp: Date.now()
      };
      sessionStorage.setItem(this.standingsCacheKey, JSON.stringify(data));
      console.log('💾 Saved standings to cache');
    } catch (error) {
      console.warn('⚠️ Failed to save standings to cache:', error);
    }
  }

  /**
   * Load league standings from HTML page
   * @returns {Promise<Map>} Map of teamName -> standing data
   */
  async loadStandingsFromHTML() {
    if (this.standingsLoaded && this.standingsFromHTML.size > 0) {
      console.log('✅ Standings already loaded');
      return this.standingsFromHTML;
    }

    try {
      console.log('🔄 Loading league standings from HTML via CORS proxy...');
      
      let html = null;
      
      // Use CORS proxies (direct fetch will fail due to CORS policy)
      const proxies = [
        { 
          url: 'https://api.allorigins.win/raw?url=',
          parseResponse: (response) => response.text() // Returns raw HTML
        },
        { 
          url: 'https://api.allorigins.win/get?url=',
          parseResponse: async (response) => {
            const data = await response.json();
            return data.contents;
          }
        },
        { 
          url: 'https://corsproxy.io/?',
          parseResponse: (response) => response.text()
        }
      ];
      
      for (let i = 0; i < proxies.length; i++) {
        try {
          const proxy = proxies[i];
          const proxyUrl = proxy.url + encodeURIComponent(this.leagueUrl);
          console.log(`🔄 Trying proxy ${i + 1}/${proxies.length}: ${proxy.url.split('?')[0]}...`);
          
          const response = await fetch(proxyUrl);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          
          html = await proxy.parseResponse(response);
          
          if (html && html.length > 1000) { // Basic validation
            console.log(`✅ Proxy ${i + 1} succeeded! Got ${(html.length / 1024).toFixed(1)}KB of HTML`);
            break;
          } else {
            throw new Error('Response too short, probably invalid');
          }
          
        } catch (error) {
          console.warn(`⚠️ Proxy ${i + 1} failed:`, error.message);
          if (i === proxies.length - 1) {
            throw new Error('All CORS proxies failed. Cannot load standings from HTML.');
          }
        }
      }
      
      if (!html) {
        throw new Error('Failed to fetch league HTML from any proxy');
      }
      
      // Parse HTML to extract standings
      this.parseStandingsFromHTML(html);
      
      // Save to cache
      this.saveStandingsToCache();
      
      this.standingsLoaded = true;
      console.log(`✅ Loaded standings for ${this.standingsFromHTML.size} teams`);
      return this.standingsFromHTML;
      
    } catch (error) {
      console.error('❌ Failed to load standings from HTML:', error);
      console.error('⚠️ Will use fallback calculation (may be inaccurate)');
      this.standingsLoaded = false;
      return this.standingsFromHTML; // Return what we have (might be empty)
    }
  }

  /**
   * Parse standings from HTML
   * @private
   */
  parseStandingsFromHTML(html) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Find the standings table
      const table = doc.querySelector('.sp-league-table');
      if (!table) {
        console.warn('⚠️ Could not find standings table in HTML');
        return;
      }
      
      // Find all team rows
      const rows = table.querySelectorAll('tbody tr');
      console.log(`📊 Found ${rows.length} teams in standings table`);
      
      rows.forEach(row => {
        try {
          // Extract data from cells
          const rankCell = row.querySelector('.data-rank');
          const nameCell = row.querySelector('.data-name a');
          const gpCell = row.querySelector('.data-gp');
          const wCell = row.querySelector('.data-w');
          const lCell = row.querySelector('.data-l');
          const bfCell = row.querySelector('.data-bf'); // Points for
          const baCell = row.querySelector('.data-ba'); // Points against
          const bdCell = row.querySelector('.data-bd'); // Point differential
          const ptsCell = row.querySelector('.data-pts'); // League points
          
          if (!rankCell || !nameCell) {
            console.warn('⚠️ Missing rank or name in row, skipping');
            return;
          }
          
          const rank = parseInt(rankCell.textContent.trim());
          const teamName = nameCell.textContent.trim();
          const gamesPlayed = gpCell ? parseInt(gpCell.textContent.trim()) : 0;
          const wins = wCell ? parseInt(wCell.textContent.trim()) : 0;
          const losses = lCell ? parseInt(lCell.textContent.trim()) : 0;
          const pointsFor = bfCell ? parseInt(bfCell.textContent.trim()) : 0;
          const pointsAgainst = baCell ? parseInt(baCell.textContent.trim()) : 0;
          const pointDiff = bdCell ? parseInt(bdCell.textContent.trim()) : 0;
          const leaguePoints = ptsCell ? parseInt(ptsCell.textContent.trim()) : 0;
          
          // Calculate win percentage
          const winPct = gamesPlayed > 0 ? (wins / gamesPlayed * 100).toFixed(1) : '0.0';
          
          // Store in map
          this.standingsFromHTML.set(teamName, {
            teamName,
            rank,
            gamesPlayed,
            wins,
            losses,
            winPct: parseFloat(winPct),
            pointsFor,
            pointsAgainst,
            pointDiff,
            leaguePoints,
            ppg: gamesPlayed > 0 ? (pointsFor / gamesPlayed).toFixed(1) : '0.0',
            oppPpg: gamesPlayed > 0 ? (pointsAgainst / gamesPlayed).toFixed(1) : '0.0'
          });
          
          console.log(`  ${rank}. ${teamName} (${wins}-${losses})`);
          
        } catch (error) {
          console.warn('⚠️ Error parsing standings row:', error);
        }
      });
      
    } catch (error) {
      console.error('❌ Error parsing HTML:', error);
    }
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
   * קבלת דירוג הליגה
   * @returns {Array} מערך ממוין של קבוצות לפי מקום בטבלה
   */
  getLeagueStandings() {
    console.time('⏱️ League Standings');
    
    // אם יש נתונים מה-HTML, השתמש בהם
    if (this.standingsLoaded && this.standingsFromHTML.size > 0) {
      console.log('✅ Using real standings from HTML');
      const standings = this.buildStandingsFromHTML();
      console.timeEnd('⏱️ League Standings');
      return standings;
    }
    
    // Fallback - חישוב לפי Win% אם הטעינה נכשלה
    console.log('⚠️ Using calculated standings (fallback)');
    const standings = this.calculateStandingsFallback();
    console.timeEnd('⏱️ League Standings');
    return standings;
  }

  /**
   * בניית מערך standings מהנתונים שנטענו מה-HTML
   * @private
   */
  buildStandingsFromHTML() {
    const teamAverages = this.analytics.getTeamAverages();
    const standings = [];
    
    console.log('📊 Building standings from HTML data:');
    
    // עבור כל קבוצה שיש לנו משחקים עבורה
    teamAverages.forEach(team => {
      const htmlData = this.standingsFromHTML.get(team.teamName);
      
      if (htmlData) {
        // השתמש ב-rank האמיתי מה-HTML
        standings.push({
          teamName: team.teamName,
          rank: htmlData.rank, // ⭐ המיקום האמיתי מהליגה
          wins: team.wins,
          losses: team.losses,
          gamesPlayed: team.gamesPlayed,
          winPct: parseFloat(team.winPct),
          ppg: parseFloat(team.ppg),
          oppPpg: parseFloat(team.oppPpg),
          pointDiff: parseFloat(team.pointDiff),
          // נתונים נוספים מה-HTML
          leaguePoints: htmlData.leaguePoints,
          pointsFor: htmlData.pointsFor,
          pointsAgainst: htmlData.pointsAgainst
        });
        
        // Log for verification
        console.log(`  ✅ מקום ${htmlData.rank}: ${team.teamName} (${team.wins}-${team.losses})`);
      } else {
        // אם הקבוצה לא נמצאה ב-HTML, נשתמש בחישוב fallback
        console.warn(`⚠️ Team "${team.teamName}" not found in HTML standings`);
        standings.push({
          teamName: team.teamName,
          rank: null, // לא ידוע
          wins: team.wins,
          losses: team.losses,
          gamesPlayed: team.gamesPlayed,
          winPct: parseFloat(team.winPct),
          ppg: parseFloat(team.ppg),
          oppPpg: parseFloat(team.oppPpg),
          pointDiff: parseFloat(team.pointDiff)
        });
      }
    });
    
    // מיון לפי rank (הנמוך ביותר = טוב ביותר)
    standings.sort((a, b) => {
      if (a.rank === null) return 1;
      if (b.rank === null) return -1;
      return a.rank - b.rank;
    });
    
    console.log(`📋 Final standings: ${standings.length} teams sorted by official rank`);
    
    return standings;
  }

  /**
   * חישוב standings לפי Win% (fallback)
   * @private
   */
  calculateStandingsFallback() {
    const teamAverages = this.analytics.getTeamAverages();
    
    // מיון לפי אחוז ניצחונות (Win%)
    const standings = teamAverages
      .map(team => ({
        teamName: team.teamName,
        wins: team.wins,
        losses: team.losses,
        gamesPlayed: team.gamesPlayed,
        winPct: parseFloat(team.winPct),
        ppg: parseFloat(team.ppg),
        oppPpg: parseFloat(team.oppPpg),
        pointDiff: parseFloat(team.pointDiff)
      }))
      .sort((a, b) => {
        // מיון לפי Win% (גבוה יותר = טוב יותר)
        if (b.winPct !== a.winPct) {
          return b.winPct - a.winPct;
        }
        // במקרה של שוויון - לפי point differential
        return b.pointDiff - a.pointDiff;
      })
      .map((team, index) => ({
        ...team,
        rank: index + 1
      }));
    
    return standings;
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
   * INSIGHTS GENERATION - זיהוי אוטומטי של נתונים מעניינים
   * ===============================================
   */

  /**
   * יצירת Insights אוטומטיים למשחק
   */
  generateInsights(teamA, teamB, reportData) {
    console.time('⏱️ Insights Generation');
    
    const insights = [];
    const { teamAData, teamBData, h2h, homeAwayA, homeAwayB, rankA, rankB } = reportData;

    // 1. רצף ארוך (4+)
    if (teamAData.trend?.streak?.count >= 4) {
      const streakType = teamAData.trend.streak.type === 'win' ? 'ניצחונות' : 'הפסדים';
      insights.push({
        icon: teamAData.trend.streak.type === 'win' ? '🔥' : '❄️',
        text: `${teamA} ברצף של ${teamAData.trend.streak.count} ${streakType}`,
        importance: 'high',
        team: teamA
      });
    }
    
    if (teamBData.trend?.streak?.count >= 4) {
      const streakType = teamBData.trend.streak.type === 'win' ? 'ניצחונות' : 'הפסדים';
      insights.push({
        icon: teamBData.trend.streak.type === 'win' ? '🔥' : '❄️',
        text: `${teamB} ברצף של ${teamBData.trend.streak.count} ${streakType}`,
        importance: 'high',
        team: teamB
      });
    }

    // 2. דומיננטיות בבית (80%+)
    if (homeAwayA?.home?.games >= 3) {
      const homeWinPct = (homeAwayA.home.wins / homeAwayA.home.games) * 100;
      if (homeWinPct >= 80) {
        insights.push({
          icon: '🏠',
          text: `${teamA} דומיננטית בבית - ${homeAwayA.home.wins}-${homeAwayA.home.losses} (${homeWinPct.toFixed(0)}%)`,
          importance: 'medium',
          team: teamA
        });
      }
    }
    
    if (homeAwayB?.home?.games >= 3) {
      const homeWinPct = (homeAwayB.home.wins / homeAwayB.home.games) * 100;
      if (homeWinPct >= 80) {
        insights.push({
          icon: '🏠',
          text: `${teamB} דומיננטית בבית - ${homeAwayB.home.wins}-${homeAwayB.home.losses} (${homeWinPct.toFixed(0)}%)`,
          importance: 'medium',
          team: teamB
        });
      }
    }

    // 3. משבר בחוץ (25%-)
    if (homeAwayA?.away?.games >= 4) {
      const awayWinPct = (homeAwayA.away.wins / homeAwayA.away.games) * 100;
      if (awayWinPct <= 25) {
        insights.push({
          icon: '✈️',
          text: `${teamA} מתקשה בחוץ - רק ${homeAwayA.away.wins} ניצחון מתוך ${homeAwayA.away.games} משחקים`,
          importance: 'medium',
          team: teamA
        });
      }
    }
    
    if (homeAwayB?.away?.games >= 4) {
      const awayWinPct = (homeAwayB.away.wins / homeAwayB.away.games) * 100;
      if (awayWinPct <= 25) {
        insights.push({
          icon: '✈️',
          text: `${teamB} מתקשה בחוץ - רק ${homeAwayB.away.wins} ניצחון מתוך ${homeAwayB.away.games} משחקים`,
          importance: 'medium',
          team: teamB
        });
      }
    }

    // 4. שליטה ב-H2H (75%+ עם לפחות 4 משחקים)
    if (h2h.totalGames >= 4) {
      const teamAH2HWinPct = (h2h.teamAWins / h2h.totalGames) * 100;
      const teamBH2HWinPct = (h2h.teamBWins / h2h.totalGames) * 100;
      
      if (teamAH2HWinPct >= 75) {
        insights.push({
          icon: '👑',
          text: `${teamA} שולטת במפגשים - ${h2h.teamAWins} מתוך ${h2h.totalGames}`,
          importance: 'high',
          team: teamA
        });
      } else if (teamBH2HWinPct >= 75) {
        insights.push({
          icon: '👑',
          text: `${teamB} שולטת במפגשים - ${h2h.teamBWins} מתוך ${h2h.totalGames}`,
          importance: 'high',
          team: teamB
        });
      }
    }

    // 5. פער גדול בנקודות (10+)
    const ppgA = parseFloat(teamAData.stats?.ppg || 0);
    const ppgB = parseFloat(teamBData.stats?.ppg || 0);
    const ppgDiff = Math.abs(ppgA - ppgB);
    
    if (ppgDiff >= 10) {
      const leader = ppgA > ppgB ? teamA : teamB;
      insights.push({
        icon: '🎯',
        text: `${leader} קולעת ${ppgDiff.toFixed(1)} נקודות יותר בממוצע`,
        importance: 'medium',
        team: leader
      });
    }

    // 6. מאזן הפוך (same games, opposite records)
    const winsA = teamAData.stats?.wins || 0;
    const lossesA = teamAData.stats?.losses || 0;
    const winsB = teamBData.stats?.wins || 0;
    const lossesB = teamBData.stats?.losses || 0;
    
    if (winsA === lossesB && lossesA === winsB && (winsA + lossesA) === (winsB + lossesB)) {
      insights.push({
        icon: '⚖️',
        text: `שתי הקבוצות באותו מאזן אבל הפוך - ${teamA}: ${winsA}-${lossesA}, ${teamB}: ${winsB}-${lossesB}`,
        importance: 'medium',
        team: null
      });
    }

    // 7. ניצחון/הפסד גדול במפגש אחרון
    if (h2h.lastMeeting && h2h.lastMeeting.margin >= 20) {
      insights.push({
        icon: '💥',
        text: `במפגש האחרון: ${h2h.lastMeeting.winner} ניצחה ${h2h.lastMeeting.teamAScore}-${h2h.lastMeeting.teamBScore} (${h2h.lastMeeting.margin} נקודות!)`,
        importance: 'high',
        team: h2h.lastMeeting.winner
      });
    }

    // 8. שיפור/ירידה ביצועים לעומת ממוצע העונה
    if (teamAData.trend) {
      const seasonPpg = parseFloat(teamAData.stats?.ppg || 0);
      const lastNPpg = parseFloat(teamAData.trend.lastNPpg || 0);
      const ppgChange = lastNPpg - seasonPpg;
      
      if (Math.abs(ppgChange) >= 5) {
        if (ppgChange > 0) {
          insights.push({
            icon: '📈',
            text: `${teamA} מציגה שיפור - ${lastNPpg.toFixed(1)} נק' למשחק ב-${teamAData.trend.lastN} אחרונים לעומת ${seasonPpg} בממוצע העונה (+${ppgChange.toFixed(1)})`,
            importance: 'medium',
            team: teamA
          });
        } else {
          insights.push({
            icon: '📉',
            text: `${teamA} בירידה - ${lastNPpg.toFixed(1)} נק' למשחק ב-${teamAData.trend.lastN} אחרונים לעומת ${seasonPpg} בממוצע העונה (${ppgChange.toFixed(1)})`,
            importance: 'medium',
            team: teamA
          });
        }
      }
    }
    
    if (teamBData.trend) {
      const seasonPpg = parseFloat(teamBData.stats?.ppg || 0);
      const lastNPpg = parseFloat(teamBData.trend.lastNPpg || 0);
      const ppgChange = lastNPpg - seasonPpg;
      
      if (Math.abs(ppgChange) >= 5) {
        if (ppgChange > 0) {
          insights.push({
            icon: '📈',
            text: `${teamB} מציגה שיפור - ${lastNPpg.toFixed(1)} נק' למשחק ב-${teamBData.trend.lastN} אחרונים לעומת ${seasonPpg} בממוצע העונה (+${ppgChange.toFixed(1)})`,
            importance: 'medium',
            team: teamB
          });
        } else {
          insights.push({
            icon: '📉',
            text: `${teamB} בירידה - ${lastNPpg.toFixed(1)} נק' למשחק ב-${teamBData.trend.lastN} אחרונים לעומת ${seasonPpg} בממוצע העונה (${ppgChange.toFixed(1)})`,
            importance: 'medium',
            team: teamB
          });
        }
      }
    }

    // הדירוג כבר מופיע ב-TL;DR, לא צריך להוסיף אותו פה

    // מיון לפי חשיבות
    insights.sort((a, b) => {
      const importanceOrder = { high: 0, medium: 1, low: 2 };
      return importanceOrder[a.importance] - importanceOrder[b.importance];
    });

    console.timeEnd('⏱️ Insights Generation');
    return insights.slice(0, 5); // מקסימום 5 insights
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
  async buildMatchupReport(teamA, teamB) {
    console.time('⏱️ Matchup Report');
    
    // טען את הטבלה מה-HTML אם עדיין לא נטענה
    if (!this.standingsLoaded) {
      await this.loadStandingsFromHTML();
    }
    
    // Get all necessary data
    const teamAveragesArray = this.analytics.getTeamAverages(); // מחזיר מערך
    const advancedMetrics = this.getAdvancedTeamMetrics();
    const trends = this.getTeamTrends(5);
    const h2h = this.getH2HHistory(teamA, teamB);
    const standings = this.getLeagueStandings();
    const homeAwayRecords = this.analytics.getTeamHomeAwayRecords();

    // Find team data
    const teamAStats = teamAveragesArray.find(t => t.teamName === teamA);
    const teamBStats = teamAveragesArray.find(t => t.teamName === teamB);
    const teamAAdv = advancedMetrics[teamA];
    const teamBAdv = advancedMetrics[teamB];
    const teamATrend = trends[teamA];
    const teamBTrend = trends[teamB];
    
    // Find rankings
    const teamARank = standings.find(s => s.teamName === teamA)?.rank || null;
    const teamBRank = standings.find(s => s.teamName === teamB)?.rank || null;
    
    // Find home/away records
    const homeAwayA = homeAwayRecords[teamA] || null;
    const homeAwayB = homeAwayRecords[teamB] || null;

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

    // Generate insights - בדיקה אם יש מערכת Insights V2
    let insights = [];
    let insightsV2 = null;
    
    if (window.IBBAInsightsV2) {
      // שימוש במערכת החדשה
      const insightsEngine = new window.IBBAInsightsV2(this.analytics);
      
      // העבר שמות שחקנים אם זמין
      if (this.playerNamesLoader && this.playerNamesLoader.namesMap) {
        insightsEngine.setPlayerNames(this.playerNamesLoader.namesMap);
      }
      
      insightsV2 = insightsEngine.generateMatchupInsights(teamA, teamB, {
        games: this.analytics.games,
        teamAData: { stats: teamAStats, advanced: teamAAdv, trend: teamATrend },
        teamBData: { stats: teamBStats, advanced: teamBAdv, trend: teamBTrend },
        h2h: h2h,
        standings: standings
      });
      
      // המרה לפורמט ישן (backward compatibility)
      insights = insightsEngine.getTopInsights(insightsV2, 8);
    } else {
      // Fallback למערכת הישנה
      insights = this.generateInsights(teamA, teamB, {
        teamAData: { stats: teamAStats, advanced: teamAAdv, trend: teamATrend },
        teamBData: { stats: teamBStats, advanced: teamBAdv, trend: teamBTrend },
        h2h: h2h,
        homeAwayA: homeAwayA,
        homeAwayB: homeAwayB,
        rankA: teamARank,
        rankB: teamBRank
      });
    }

    // Build narrative - with insightsV2 for enhanced TL;DR
    const narrative = this.buildNarrative(teamA, teamB, teamAStats, teamBStats, teamAAdv, teamBAdv, teamATrend, teamBTrend, h2h, comparison, teamARank, teamBRank, insightsV2);

    console.timeEnd('⏱️ Matchup Report');

    return {
      teamA: {
        name: teamA,
        stats: teamAStats,
        advanced: teamAAdv,
        trend: teamATrend,
        rank: teamARank,
        homeAwayRecord: homeAwayA
      },
      teamB: {
        name: teamB,
        stats: teamBStats,
        advanced: teamBAdv,
        trend: teamBTrend,
        rank: teamBRank,
        homeAwayRecord: homeAwayB
      },
      h2h: h2h,
      comparison: comparison,
      narrative: narrative,
      insights: insights,
      insightsV2: insightsV2, // מערכת Insights מתקדמת עם קטגוריות
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * חישוב ניקוד לכל Insight לפי חשיבות (Weighted Scoring)
   */
  calculateInsightScore(insight) {
    const weights = {
      // קונפליקטים וזהות ליגתית
      'DEFENSIVE_WALL': 80,
      'HIGH_SCORING': 80,
      // מומנטום ודומיננטיות
      'WINNING_STREAK': 75,
      'BLOWOUT_WINS': 70,
      'LOSING_STREAK': 70,
      'CLUTCH_STREAK': 65,
      // שחקנים מובילים
      'HOT_HAND': 65,
      'TEAM_LEADER': 60,
      // קאמבקים ורבעים
      'COMEBACK_KINGS': 55,
      'BEST_QUARTER': 50,
      'QUARTER_DOMINANCE': 50,
      // מגמות
      'SCHEDULE_STRENGTH': 45,
      'SEASON_HALVES': 40,
      // ברירת מחדל
      'default': 30
    };
    
    let score = weights[insight.type] || weights['default'];
    
    // בונוס לפי importance
    if (insight.importance === 'high') score += 15;
    else if (insight.importance === 'medium') score += 5;
    
    // בונוס לפי rank (אם קיים ומקום 1-3)
    if (insight.rank && insight.rank <= 3) score += 20;
    
    // בונוס לפי ערך (value) גבוה
    if (insight.value) {
      const val = parseFloat(insight.value);
      if (insight.type === 'WINNING_STREAK' && val >= 5) score += 10;
      if (insight.type === 'BLOWOUT_WINS' && val >= 3) score += 10;
    }
    
    return score;
  }

  /**
   * זיהוי קונפליקטים - כאשר שתי הקבוצות חזקות באותו תחום
   */
  detectConflicts(insightsA, insightsB, teamA, teamB, rankA, rankB) {
    const conflicts = [];
    
    // קונפליקט הגנות
    const defenseA = insightsA.find(i => i.type === 'DEFENSIVE_WALL');
    const defenseB = insightsB.find(i => i.type === 'DEFENSIVE_WALL');
    if (defenseA && defenseB && defenseA.rank <= 5 && defenseB.rank <= 5) {
      conflicts.push(`⚔️ קרב הגנות: מקום ${defenseA.rank} נגד מקום ${defenseB.rank}`);
    }
    
    // קונפליקט התקפות
    const offenseA = insightsA.find(i => i.type === 'HIGH_SCORING');
    const offenseB = insightsB.find(i => i.type === 'HIGH_SCORING');
    if (offenseA && offenseB && offenseA.rank <= 5 && offenseB.rank <= 5) {
      conflicts.push(`🚀 קרב התקפות: מקום ${offenseA.rank} נגד מקום ${offenseB.rank}`);
    }
    
    // שתיהן בפורמה מצוינת
    const streakA = insightsA.find(i => i.type === 'WINNING_STREAK');
    const streakB = insightsB.find(i => i.type === 'WINNING_STREAK');
    if (streakA && streakB) {
      conflicts.push(`🔥 שתיהן במומנטום: ${teamA} ${streakA.value} ברצף, ${teamB} ${streakB.value} ברצף`);
    }
    
    // שתיהן דורסות
    const blowoutA = insightsA.find(i => i.type === 'BLOWOUT_WINS');
    const blowoutB = insightsB.find(i => i.type === 'BLOWOUT_WINS');
    if (blowoutA && blowoutB) {
      conflicts.push(`💪 שתיהן דורסות: ${blowoutA.value} ו-${blowoutB.value} ניצחונות ב-15+`);
    }
    
    return conflicts;
  }

  /**
   * בניית נרטיב לשדרן (מבוסס על preGameNarratives.js)
   * משופר עם TL;DR מבוסס Insights
   */
  buildNarrative(teamA, teamB, statsA, statsB, advA, advB, trendA, trendB, h2h, comparison, rankA, rankB, insightsV2 = null) {
    const tldr = [];
    const sections = {};
    const recordA = `${statsA?.wins || 0}-${statsA?.losses || 0}`;
    const recordB = `${statsB?.wins || 0}-${statsB?.losses || 0}`;

    // === TL;DR משופר (מבוסס Insights) ===
    
    // 1. The Hook - סוג המשחק
    if (rankA && rankB) {
      if (rankA <= 4 && rankB <= 4) {
        tldr.push(`🏆 קרב צמרת: מקום ${rankA} (${recordA}) מול מקום ${rankB} (${recordB})`);
      } else if (rankA >= 10 && rankB >= 10) {
        tldr.push(`⚠️ משחק תחתית גורלי: מקום ${rankA} נגד מקום ${rankB}`);
      } else {
        tldr.push(`${teamA} מקום ${rankA} (${recordA}) מול ${teamB} מקום ${rankB} (${recordB})`);
      }
    } else {
      tldr.push(`${teamA} (${recordA}) מול ${teamB} (${recordB})`);
    }

    // אם יש Insights V2, נבנה TL;DR חכם מהם
    // המבנה של insightsV2 הוא לפי קטגוריות: { STREAKS: [], PLAYERS: [], ... }
    if (insightsV2 && (insightsV2.STREAKS || insightsV2.PLAYERS || insightsV2.DEFENSE)) {
      // איסוף כל ה-insights מכל הקטגוריות
      const allCategories = ['STREAKS', 'PLAYERS', 'OFFENSE', 'DEFENSE', 'MOMENTUM', 'QUARTERS', 'LEAGUE'];
      let allInsights = [];
      
      for (const category of allCategories) {
        if (insightsV2[category]) {
          allInsights = allInsights.concat(insightsV2[category]);
        }
      }
      
      // חלוקה לפי קבוצה
      const insightsA = allInsights.filter(i => i.teamName === teamA);
      const insightsB = allInsights.filter(i => i.teamName === teamB);
      
      // 2. זיהוי קונפליקטים (שתי הקבוצות חזקות באותו דבר)
      const conflicts = this.detectConflicts(insightsA, insightsB, teamA, teamB, rankA, rankB);
      conflicts.slice(0, 2).forEach(c => tldr.push(c));
      
      // 3. חישוב ניקוד לכל insight
      allInsights.forEach(insight => {
        insight.score = this.calculateInsightScore(insight);
        insight.team = insight.teamName; // הוסף שדה team לשימוש מאוחר יותר
      });
      
      // מיון לפי ניקוד
      allInsights.sort((a, b) => b.score - a.score);
      
      // 4. סינון לפי סוגים (לא לחזור על אותו סוג פעמיים)
      const usedTypes = new Set();
      const usedTeams = { [teamA]: 0, [teamB]: 0 };
      const maxPerTeam = 3;
      
      for (const insight of allInsights) {
        if (tldr.length >= 7) break;
        if (usedTypes.has(insight.type)) continue;
        if (usedTeams[insight.team] >= maxPerTeam) continue;
        
        // השתמש ב-broadcastShort אם קיים, אחרת צור טקסט
        if (insight.broadcastShort) {
          tldr.push(insight.broadcastShort);
          usedTypes.add(insight.type);
          usedTeams[insight.team]++;
        }
      }
    } else {
      // Fallback לשיטה הישנה אם אין Insights V2
      
      // H2H
      if (h2h.totalGames > 0) {
        tldr.push(`🤝 מפגשים: ${teamA} ${h2h.teamAWins}, ${teamB} ${h2h.teamBWins}`);
      }
      
      // רצפים
      if (trendA && trendA.streak && trendA.streak.count >= 3) {
        const emoji = trendA.streak.type === 'win' ? '📈' : '📉';
        const streakType = trendA.streak.type === 'win' ? 'ניצחונות' : 'הפסדים';
        tldr.push(`${emoji} ${teamA}: ${trendA.streak.count} ${streakType} ברצף`);
      }
      if (trendB && trendB.streak && trendB.streak.count >= 3) {
        const emoji = trendB.streak.type === 'win' ? '📈' : '📉';
        const streakType = trendB.streak.type === 'win' ? 'ניצחונות' : 'הפסדים';
        tldr.push(`${emoji} ${teamB}: ${trendB.streak.count} ${streakType} ברצף`);
      }
      
      // פורמה
      if (trendA && trendB) {
        tldr.push(`📊 פורמה: ${teamA} ${trendA.lastNWins}/${trendA.lastN}, ${teamB} ${trendB.lastNWins}/${trendB.lastN}`);
      }
    }

    // === Sections (נשאר כמו קודם) ===

    sections['פרופיל קליעה'] = [
      `${teamA} - FG%: ${statsA?.fgPct || 'N/A'}% | 3P%: ${statsA?.threePtPct || 'N/A'}% | FT%: ${statsA?.ftPct || 'N/A'}%`,
      `${teamB} - FG%: ${statsB?.fgPct || 'N/A'}% | 3P%: ${statsB?.threePtPct || 'N/A'}% | FT%: ${statsB?.ftPct || 'N/A'}%`
    ];
    
    const fgPctA = parseFloat(statsA?.fgPct || 0);
    const fgPctB = parseFloat(statsB?.fgPct || 0);
    const gamesA = statsA?.gamesPlayed || 1;
    const gamesB = statsB?.gamesPlayed || 1;
    const fgaA = (statsA?._totalFGA || 0) / gamesA;
    const fgaB = (statsB?._totalFGA || 0) / gamesB;
    
    if (fgPctA > fgPctB) {
      sections['פרופיל קליעה'].push(
        `יתרון קליעה ל-${teamA} - ${fgPctA}% (${fgaA.toFixed(1)} ניסיונות למשחק) לעומת ${fgPctB}% של ${teamB} (${fgaB.toFixed(1)} ניסיונות למשחק)`
      );
    } else {
      sections['פרופיל קליעה'].push(
        `יתרון קליעה ל-${teamB} - ${fgPctB}% (${fgaB.toFixed(1)} ניסיונות למשחק) לעומת ${fgPctA}% של ${teamA} (${fgaA.toFixed(1)} ניסיונות למשחק)`
      );
    }

    if (h2h.totalGames > 0) {
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
    }

    return {
      tldr: tldr.slice(0, 7),
      sections: sections
    };
  }
}

// Export to global scope
window.IBBAAdvanced = IBBAAdvanced;

console.log('🔥 IBBAAdvanced loaded successfully!');

