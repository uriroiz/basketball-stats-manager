/**
 * IBBA Data Adapter
 * מתחבר ל-API של ibasketball.co.il ומנרמל את הנתונים
 * 
 * @module IBBAAdapter
 * @version 1.0.0
 */
class IBBAAdapter {
  constructor() {
    this.baseURL = 'https://ibasketball.co.il/wp-json/wp/v2';
    this.leagueId = 119474; // ליגה לאומית 2025
    this.seasonId = 119472; // עונת 2025
    this.playersPageURL = 'https://ibasketball.co.il/league/2025-2/';
  }

  /**
   * מביא רשימת משחקים מה-API
   * @param {number} limit - מספר משחקים להביא
   * @param {string} before - תאריך מקסימלי (ISO format)
   * @param {string} after - תאריך מינימלי (ISO format)
   */
  async fetchGames(limit = 20, before = null, after = null) {
    let url = `${this.baseURL}/events?leagues=${this.leagueId}&per_page=${limit}`;
    
    if (before) url += `&before=${before}`;
    if (after) url += `&after=${after}`;
    
    console.log(`📡 Fetching games from: ${url}`);
    
    try {
      // ניסיון ישירות
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Fetched ${data.length} games from API`);
      
      return data;
      
    } catch (error) {
      // אם נכשל בגלל CORS - נסה דרך proxy
      console.warn('⚠️ Direct fetch failed, trying via CORS proxy...', error.message);
      return await this.fetchViaProxy(url);
    }
  }

  /**
   * מביא משחק בודד
   */
  async fetchGame(gameId) {
    const url = `${this.baseURL}/events/${gameId}`;
    console.log(`📡 Fetching game ${gameId} from: ${url}`);
    
    try {
      // ניסיון ישירות
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Game ${gameId} not found (${response.status})`);
      }
      
      const data = await response.json();
      console.log(`✅ Fetched game ${gameId}`);
      
      return data;
      
    } catch (error) {
      // אם נכשל בגלל CORS - נסה דרך proxy
      console.warn('⚠️ Direct fetch failed, trying via CORS proxy...', error.message);
      return await this.fetchViaProxy(url);
    }
  }

  /**
   * קריאה דרך CORS proxy (fallback)
   * משתמש במספר proxies עם fallback
   */
  async fetchViaProxy(targetUrl) {
    // רשימת proxies לניסיון - corsproxy.io ראשון כי הוא הכי אמין!
    const proxies = [
      `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
      `https://cors-anywhere.herokuapp.com/${targetUrl}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`
    ];
    
    for (let i = 0; i < proxies.length; i++) {
      try {
        console.log(`🔄 Trying proxy ${i + 1}/${proxies.length}...`);
        
        // הוספת timeout של 10 שניות
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(proxies[i], { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`Proxy ${i + 1} failed: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`✅ Successfully fetched via proxy ${i + 1}`);
        return data;
        
      } catch (error) {
        const errorMsg = error.name === 'AbortError' ? 'timeout (10s)' : error.message;
        console.warn(`⚠️ Proxy ${i + 1} failed:`, errorMsg);
        
        // אם זה הproxy האחרון - זרוק שגיאה
        if (i === proxies.length - 1) {
          throw new Error(`All proxies failed. Please run on local server (python -m http.server 8000)`);
        }
      }
    }
  }

  /**
   * ממיר משחק מפורמט IBBA לפורמט פנימי
   * זה יתממשק עם המבנה הקיים של המערכת
   */
  convertToInternalFormat(ibbaGame) {
    const homeTeamId = ibbaGame.teams[0];
    const awayTeamId = ibbaGame.teams[1];
    
    // חילוץ שמות קבוצות מה-title (פורמט: "קבוצה א — קבוצה ב")
    const title = ibbaGame.title?.rendered || '';
    const teamNames = title.split(/\s*[—–-]\s*/); // תומך במינוס, em-dash, en-dash
    const homeTeamName = teamNames[0]?.trim() || 'Unknown';
    const awayTeamName = teamNames[1]?.trim() || 'Unknown';
    
    // חילוץ ניקוד מ-performance data (אם קיים)
    let homeScore = 0;
    let awayScore = 0;
    if (ibbaGame.performance) {
      homeScore = ibbaGame.performance[homeTeamId]?.[0]?.pts || 0;
      awayScore = ibbaGame.performance[awayTeamId]?.[0]?.pts || 0;
    }
    
    const game = {
      // מזהה ייחודי
      gameSerial: ibbaGame.id,
      gameId: ibbaGame.id,
      
      // תאריך ושעה
      date: ibbaGame.date,
      dateGMT: ibbaGame.date_gmt,
      
      // מחזור (stage)
      cycle: ibbaGame.stage_id || ibbaGame.stage || null,
      
      // ליגה
      league: ibbaGame.league?.name || 'לאומית',
      leagueId: this.leagueId,
      gender: ibbaGame.league?.gender || 'M',
      
      // שמות קבוצות (למטה compatibility עם smoke test)
      homeTeam: this.decodeHtmlEntities(homeTeamName),
      awayTeam: this.decodeHtmlEntities(awayTeamName),
      homeScore: homeScore,
      awayScore: awayScore,
      
      // קבוצות (מבנה מורחב)
      teams: [
        {
          teamId: homeTeamId,
          name: this.decodeHtmlEntities(homeTeamName),
          isHome: true,
          score: homeScore
        },
        {
          teamId: awayTeamId,
          name: this.decodeHtmlEntities(awayTeamName),
          isHome: false,
          score: awayScore
        }
      ],
      
      // תוצאה
      finalScore: {
        home: homeScore,
        away: awayScore
      },
      
      winner: ibbaGame.winner,
      outcome: ibbaGame.outcome,
      
      // רבעים
      quarters: this.extractQuarters(ibbaGame, homeTeamId, awayTeamId),
      
      // שחקנים וסטטיסטיקות
      players: this.extractPlayers(ibbaGame, homeTeamId, awayTeamId),
      
      // סטטיסטיקות קבוצתיות
      teamStats: this.extractTeamStats(ibbaGame, homeTeamId, awayTeamId),
      
      // JSON מקורי - שמירה לצורך debug
      originalJson: ibbaGame,
      
      // מטא-דאטה
      source: 'ibba_api',
      importedAt: new Date().toISOString()
    };
    
    return game;
  }

  /**
   * חילוץ רבעים
   */
  extractQuarters(ibbaGame, homeTeamId, awayTeamId) {
    const homeResults = ibbaGame.results?.[homeTeamId] || {};
    const awayResults = ibbaGame.results?.[awayTeamId] || {};
    
    return {
      q1: { home: homeResults.one || 0, away: awayResults.one || 0 },
      q2: { home: homeResults.two || 0, away: awayResults.two || 0 },
      q3: { home: homeResults.three || 0, away: awayResults.three || 0 },
      q4: { home: homeResults.four || 0, away: awayResults.four || 0 }
    };
  }

  /**
   * חילוץ שחקנים וסטטיסטיקות
   */
  extractPlayers(ibbaGame, homeTeamId, awayTeamId) {
    const players = [];
    
    // בדיקה שיש performance data
    if (!ibbaGame.performance || ibbaGame.performance === "") {
      // משחק עתידי או ללא נתונים - זה תקין
      return players;
    }
    
    // עיבוד שתי הקבוצות
    [homeTeamId, awayTeamId].forEach(teamId => {
      const teamPerformance = ibbaGame.performance[teamId];
      if (!teamPerformance) return;
      
      const rawTeamName = teamId === homeTeamId ? ibbaGame.home?.team : ibbaGame.away?.team;
      const teamName = this.decodeHtmlEntities(rawTeamName);
      const isHome = teamId === homeTeamId;
      
      // עיבוד כל שחקן בקבוצה
      Object.entries(teamPerformance).forEach(([playerId, stats]) => {
        // דילוג על סה"כ קבוצתי (key "0")
        if (playerId === '0') return;
        
        players.push({
          // מזהים
          playerId: playerId,
          teamId: teamId,
          teamName: teamName,
          isHome: isHome,
          
          // מספר חולצה
          jersey: stats.number || '',
          
          // סטטוס (lineup/sub)
          status: stats.status || 'sub',
          
          // סטטיסטיקות משחק
          stats: {
            points: stats.pts || 0,
            fieldGoalsMade: stats.fgm || 0,
            fieldGoalsAttempted: stats.fga || 0,
            threePointsMade: stats.threepm || 0,
            threePointsAttempted: stats.threepa || 0,
            freeThrowsMade: stats.ftm || 0,
            freeThrowsAttempted: stats.fta || 0,
            offensiveRebounds: stats.off || 0,
            defensiveRebounds: stats.def || 0,
            totalRebounds: (stats.off || 0) + (stats.def || 0),
            assists: stats.ast || 0,
            steals: stats.stl || 0,
            blocks: stats.blk || 0,
            turnovers: stats.to || 0,
            personalFouls: stats.pf || 0,
            foulsDrawn: stats.pfa || 0,
            blocksAgainst: stats.blka || 0,
            minutesPlayed: stats.min || '0:00',
            plusMinus: stats.pm || 0,
            efficiency: stats.rate || 0
          },
          
          // חישובים נוספים
          calculated: {
            fgPercentage: this.calculatePercentage(stats.fgm, stats.fga),
            threePointPercentage: this.calculatePercentage(stats.threepm, stats.threepa),
            ftPercentage: this.calculatePercentage(stats.ftm, stats.fta),
            minutesDecimal: this.convertMinutesToDecimal(stats.min)
          }
        });
      });
    });
    
    return players;
  }

  /**
   * חילוץ סטטיסטיקות קבוצתיות
   */
  extractTeamStats(ibbaGame, homeTeamId, awayTeamId) {
    const homeStats = ibbaGame.performance?.[homeTeamId]?.['0'] || {};
    const awayStats = ibbaGame.performance?.[awayTeamId]?.['0'] || {};
    
    return {
      home: this.normalizeTeamStats(homeStats),
      away: this.normalizeTeamStats(awayStats)
    };
  }

  normalizeTeamStats(stats) {
    return {
      points: stats.pts || 0,
      fieldGoalsMade: stats.fgm || 0,
      fieldGoalsAttempted: stats.fga || 0,
      threePointsMade: stats.threepm || 0,
      threePointsAttempted: stats.threepa || 0,
      freeThrowsMade: stats.ftm || 0,
      freeThrowsAttempted: stats.fta || 0,
      offensiveRebounds: stats.off || 0,
      defensiveRebounds: stats.def || 0,
      totalRebounds: (stats.off || 0) + (stats.def || 0),
      assists: stats.ast || 0,
      steals: stats.stl || 0,
      blocks: stats.blk || 0,
      turnovers: stats.to || 0,
      personalFouls: stats.pf || 0,
      fgPercentage: this.calculatePercentage(stats.fgm, stats.fga),
      threePointPercentage: this.calculatePercentage(stats.threepm, stats.threepa),
      ftPercentage: this.calculatePercentage(stats.ftm, stats.fta)
    };
  }

  /**
   * Utility: חישוב אחוזים
   */
  calculatePercentage(made, attempted) {
    if (!attempted || attempted === 0) return 0;
    return Math.round((made / attempted) * 1000) / 10; // עיגול לעשירית
  }

  /**
   * Utility: המרת דקות מ-"MM:SS" למספר עשרוני
   */
  convertMinutesToDecimal(minStr) {
    if (!minStr || minStr === '0:00') return 0;
    
    const parts = minStr.split(':');
    const minutes = parseInt(parts[0]) || 0;
    const seconds = parseInt(parts[1]) || 0;
    
    return minutes + (seconds / 60);
  }

  /**
   * Utility: Decode HTML entities
   * ממיר &quot; → ", &amp; → &, וכו'
   */
  decodeHtmlEntities(text) {
    if (!text) return text;
    
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  }

  /**
   * פרסור HTML של רשימת השחקנים מדף הליגה
   * (לשימוש עתידי ב-PlayerSync)
   */
  parsePlayersFromHTML(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const players = [];
    const playerElements = doc.querySelectorAll('.player.data-item.male');
    
    playerElements.forEach(el => {
      try {
        // חילוץ player ID מה-href
        const href = el.getAttribute('href');
        const playerIdMatch = href.match(/player\/([^\/]+)\//);
        if (!playerIdMatch) return;
        
        const playerId = playerIdMatch[1];
        const teamId = el.getAttribute('data-team');
        
        // חילוץ שם שחקן וקבוצה מהטקסט
        const textContent = el.textContent.trim();
        const lines = textContent.split('\n').map(l => l.trim()).filter(l => l);
        
        // שורה ראשונה: שם שחקן
        // שורה שנייה: שם קבוצה
        const playerName = lines[0];
        const teamName = lines[1];
        
        if (!playerName || !teamName) return;
        
        players.push({
          playerId: playerId,
          name: playerName,
          team: teamName,
          teamId: teamId,
          source: 'ibba_league_page',
          lastUpdated: new Date().toISOString()
        });
        
      } catch (error) {
        console.warn('Failed to parse player element:', error);
      }
    });
    
    console.log(`✅ Parsed ${players.length} players from league page`);
    return players;
  }
}

// Export for use
window.IBBAAdapter = IBBAAdapter;

console.log('✅ IBBA Adapter loaded successfully');

