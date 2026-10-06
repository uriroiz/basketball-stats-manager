/**
 * IBBA Data Adapter
 * מתחבר ל-API של ibasketball.co.il ומנרמל את הנתונים
 * 
 * @module IBBAAdapter
 * @version 1.0.0
 */
class IBBAAdapter {
  static metricFields = {points:'pts',fieldGoalsMade:'fgm',fieldGoalsAttempted:'fga',threePointsMade:'threepm',threePointsAttempted:'threepa',freeThrowsMade:'ftm',freeThrowsAttempted:'fta',offensiveRebounds:'off',defensiveRebounds:'def',assists:'ast',steals:'stl',blocks:'blk',turnovers:'to',personalFouls:'pf',efficiency:'rate'};
  static advancedFields = {pointsFastBreak:'pfb',pointsFromTurnovers:'pto',pointsInPaint:'pipm',pointsSecondChance:'psc',pointsBench:'pbc'};
  static metricNumber(value) {return value==null||value===''||!Number.isFinite(Number(value))?null:Number(value);}
  static parseMinutes(value) {
    if(value==null||value==='')return null;
    if(String(value).includes(':')) {
      const match=String(value).match(/^(\d+):([0-5]\d)$/);return match?Number(match[1])+Number(match[2])/60:null;
    }
    const n=this.metricNumber(value);return n!=null&&n>=0?n:null;
  }
  readObservedStats(raw={},advanced={}) {
    const stats=Object.fromEntries(Object.entries(IBBAAdapter.metricFields).map(([field,key])=>[field,IBBAAdapter.metricNumber(raw[key])]));
    Object.assign(stats,Object.fromEntries(Object.entries(IBBAAdapter.advancedFields).map(([field,key])=>[field,IBBAAdapter.metricNumber(advanced[key])])));
    stats.totalRebounds=stats.offensiveRebounds==null||stats.defensiveRebounds==null?null:stats.offensiveRebounds+stats.defensiveRebounds;
    stats.minutesPlayed=IBBAAdapter.parseMinutes(raw.min);return stats;
  }
  extractMetricAvailability(event,ids) {
    return Object.fromEntries(ids.map(id=>[id,Object.entries(this.readObservedStats(event.performance?.[id]?.[0],event.sp_teams?.[id])).filter(([,value])=>value!=null).map(([field])=>field)]));
  }
  extractPlayerObservations(event,ids) {
    return ids.flatMap((teamId,index)=>Object.entries(event.performance?.[teamId]||{}).flatMap(([playerId,raw])=>{
      if(playerId==='0'||!raw||typeof raw!=='object')return [];
      const stats=this.readObservedStats(raw),availableMetrics=Object.keys(stats).filter(k=>stats[k]!=null);
      if(!availableMetrics.length)return [];
      const participation=Object.entries(stats).some(([,value])=>value!=null&&value!==0)?'verified':'unknown';
      const titles=(event.title?.rendered||'').split(/\s*[—–-]\s*/);
      const teamName=this.decodeHtmlEntities(this.resolveTeamName(teamId,(index===0?event.home?.team:event.away?.team)||titles[index]));
      return [{playerId,teamId,teamName,stats,availableMetrics,participation}];
    }));
  }
  constructor(season = null) {
    const config = season || window.appConfig || {};
    this.seasonKey = config.key || config.seasonKey || '2025-26';
    this.regularOnly = config.regularOnly === true;
    this.regularTableId = config.regularTableId;
    this.historicalTeamNames = config.historicalTeamNames || {};
    this.baseURL = 'https://ibasketball.co.il/wp-json/wp/v2';
    this.sportspressURL = 'https://ibasketball.co.il/wp-json/sportspress/v2';
    this.leagueId = config.leagueId || 119474;
    this.seasonId = config.seasonId || 119472;
    this.playersPageURL = config.playersPageUrl || 'https://ibasketball.co.il/league/2025-2/';
    this.seasonMonths = config.seasonMonths || [
      '2025-10', '2025-11', '2025-12',
      '2026-01', '2026-02', '2026-03',
      '2026-04', '2026-05', '2026-06'
    ];
  }

  async fetchEventPages(month = null) {
    const games = [];
    for (let offset = 0; ; offset += 100) {
      const url = `${this.sportspressURL}/events?order=asc&by=post_date&seasons=${this.seasonId}&leagues=${this.leagueId}&per_page=100&offset=${offset}${month ? `&month=${month}` : ''}${this.regularOnly && this.regularTableId ? `&tables=${this.regularTableId}` : ''}`;
      const page = await this.fetchJsonWithProxyFallback(url);
      if (!Array.isArray(page)) throw new Error('Invalid IBBA game response');
      // Prevent a broken upstream ignoring offset from looping indefinitely.
      if (page.length && games.length && page.every(g => games.some(previous => previous.id === g.id))) {
        throw new Error('IBBA pagination did not advance');
      }
      games.push(...page);
      if (page.length < 100) return games;
    }
  }

  async fetchSeasonGames() {
    try {
      const games = await this.fetchEventPages();
      if (games.length) return {games,complete:true,failedMonths:[]};
    } catch (error) { console.warn('Season request failed; loading months',error.message); }
    const byId = new Map();
    const failedMonths = [];
    for (const month of this.seasonMonths) {
      try { (await this.fetchEventPages(month)).forEach(g => byId.set(g.id,g)); }
      catch (_) { failedMonths.push(month); }
    }
    if (failedMonths.length === this.seasonMonths.length) throw new Error('לא ניתן לטעון את משחקי העונה מהאיגוד');
    return {games:Array.from(byId.values()),complete:!failedMonths.length,failedMonths};
  }

  async fetchSeasonMonthGames(limit = 500) {
    const shouldLoadPreview = limit <= 100;
    const months = shouldLoadPreview ? [...this.seasonMonths].reverse() : this.seasonMonths;
    const gamesById = new Map();
    
    for (const month of months) {
      const url = `${this.sportspressURL}/events?order=asc&by=post_date&seasons=${this.seasonId}&leagues=${this.leagueId}&month=${month}&per_page=1000`;
      console.log(`Fetching monthly games from: ${url}`);
      
      try {
        const monthGames = await this.fetchJsonWithProxyFallback(url);
        
        if (Array.isArray(monthGames)) {
          monthGames.forEach(game => {
            if (game?.id) {
              gamesById.set(game.id, game);
            }
          });
        }
        
        if (shouldLoadPreview && gamesById.size >= limit) {
          break;
        }
      } catch (error) {
        console.warn(`Failed to fetch games for ${month}:`, error.message);
      }
    }
    
    const games = Array.from(gamesById.values())
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return shouldLoadPreview ? games.slice(0, limit) : games;
  }

  async fetchJsonWithProxyFallback(url) {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.warn('Direct monthly fetch failed, trying the first-party proxy...', error.message);
      return await this.fetchViaProxy(url);
    }
  }

  /**
   * מביא רשימת משחקים מה-API
   * @param {number} limit - מספר משחקים להביא
   * @param {string} before - תאריך מקסימלי (ISO format)
   * @param {string} after - תאריך מינימלי (ISO format)
   */
  async fetchGames(limit = 20, before = null, after = null) {
    let url = `${this.baseURL}/events?leagues=${this.leagueId}&seasons=${this.seasonId}&per_page=${limit}`;
    
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
      
      if (data.length === 0) {
        const monthlyGames = await this.fetchSeasonMonthGames(limit);
        if (monthlyGames.length > 0) {
          console.log(`Fetched ${monthlyGames.length} games from monthly fallback`);
          return monthlyGames;
        }
      }
      
      return data;
      
    } catch (error) {
      // אם נכשל בגלל CORS - נסה דרך proxy
      console.warn('⚠️ Direct fetch failed, trying the first-party proxy...', error.message);
      const data = await this.fetchViaProxy(url);
      
      if (Array.isArray(data) && data.length === 0) {
        const monthlyGames = await this.fetchSeasonMonthGames(limit);
        if (monthlyGames.length > 0) {
          console.log(`Fetched ${monthlyGames.length} games from monthly fallback`);
          return monthlyGames;
        }
      }
      
      return data;
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
      console.warn('⚠️ Direct fetch failed, trying the first-party proxy...', error.message);
      return await this.fetchViaProxy(url);
    }
  }

  /**
   * זיהוי סביבת ההרצה
   */
  getEnvironment() {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    
    if (protocol === 'file:') {
      return 'file'; // פתיחה ישירה מקובץ
    }
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'localhost'; // שרת מקומי
    }
    if (hostname.includes('vercel.app') || hostname.includes('basketball-stats')) {
      return 'vercel'; // production
    }
    return 'other'; // סביבה אחרת
  }

  /**
   * קריאה דרך ה-proxy המצומצם של האפליקציה (fallback)
   * משתמש ב-proxy מוגבל של Vercel שמורשה לפנות רק ל-IBBA.
   */
  async fetchViaProxy(targetUrl) {
    const env = this.getEnvironment();
    console.log(`🌍 Environment detected: ${env}`);
    
    if (env === 'file') {
      // פתיחה ישירה מקובץ - בעייתי!
      console.error('⚠️ Running from file:// protocol - CORS will fail!');
      console.error('💡 Please run a local server:');
      console.error('   npm run dev');
      console.error('   Then open: http://localhost:8000/admin_players.html');
      
    }

    const proxyBaseUrl = window.appConfig?.ibbaProxyUrl || '/api/ibba';
    const proxies = [`${proxyBaseUrl}?url=${encodeURIComponent(targetUrl)}`];
    
    for (let i = 0; i < proxies.length; i++) {
      try {
        console.log(`🔄 Trying proxy ${i + 1}/${proxies.length}...`);
        
        // הוספת timeout של 15 שניות (הגדלנו מ-10)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const response = await fetch(proxies[i], { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`Proxy ${i + 1} failed: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`✅ Successfully fetched via proxy ${i + 1}`);
        return data;
        
      } catch (error) {
        const errorMsg = error.name === 'AbortError' ? 'timeout (15s)' : error.message;
        console.warn(`⚠️ Proxy ${i + 1} failed:`, errorMsg);
        
        // אם זה הproxy האחרון - זרוק שגיאה
        if (i === proxies.length - 1) {
          const helpMsg = env === 'file' 
            ? 'Cannot run from file://. Please use: npm run dev'
            : 'The IBBA proxy failed. Verify the network and run: npm run dev';
          throw new Error(helpMsg);
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
    const homeTeamName = this.resolveTeamName(homeTeamId, teamNames[0]);
    const awayTeamName = this.resolveTeamName(awayTeamId, teamNames[1]);
    
    // חילוץ ניקוד מ-performance data (אם קיים)
    const readScore = teamId => {
      const results = ibbaGame.results?.[teamId];
      const value = ibbaGame.performance?.[teamId]?.['0']?.pts
        ?? results?.pts ?? results?.points ?? results?.total;
      if (value === '' || value == null) return null;
      const score = Number(value);
      return Number.isFinite(score) && score >= 0 ? score : null;
    };
    let homeScore = readScore(homeTeamId);
    let awayScore = readScore(awayTeamId);
    const hasResult = homeScore !== null && awayScore !== null && (homeScore > 0 || awayScore > 0);
    if (!hasResult) { homeScore = null; awayScore = null; }
    const players = this.extractPlayers(ibbaGame, homeTeamId, awayTeamId);
    
    const game = {
      // מזהה ייחודי
      gameSerial: ibbaGame.id,
      gameId: ibbaGame.id,
      seasonKey: this.seasonKey,
      seasonId: this.seasonId,
      hasResult,
      hasPlayerStats: [homeTeamId,awayTeamId].every(id=>players.some(p=>String(p.teamId)===String(id))),
      gameStatus: hasResult ? 'completed' : (new Date(ibbaGame.date) > new Date() ? 'scheduled' : 'unavailable'),
      
      // Permalink למשחק באתר IBBA (לשימוש עתידי - scraping, קישורים וכו')
      permalink: ibbaGame.link || ibbaGame.guid?.rendered || null,
      
      // תאריך ושעה
      date: ibbaGame.date,
      dateGMT: ibbaGame.date_gmt,
      
      // מחזור (stage)
      cycle: ibbaGame.stage_id || ibbaGame.stage || null,
      ...this.normalizeRound(ibbaGame),
      availableMetrics: this.availableMetrics(ibbaGame, [homeTeamId, awayTeamId]),
      metricAvailability: this.extractMetricAvailability(ibbaGame,[homeTeamId,awayTeamId]),
      playerObservations: this.extractPlayerObservations(ibbaGame,[homeTeamId,awayTeamId]),
      
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
          profileUrl: window.IBBATeamSummaries?.profile(ibbaGame.home?.link) || ibbaGame.home?.link || null,
          name: this.decodeHtmlEntities(homeTeamName),
          isHome: true,
          score: homeScore
        },
        {
          teamId: awayTeamId,
          profileUrl: window.IBBATeamSummaries?.profile(ibbaGame.away?.link) || ibbaGame.away?.link || null,
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
      players,
      
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

  normalizeRound(event) {
    const round = Number(event.stage_id);
    // The official league table labels stage_id as מחזור. Only the documented
    // regular-season window is comparable; later stages are not inferred.
    const maximum = this.seasonKey === '2024-25' ? 26 : 30;
    const definition=window.IBBASeasons?.getSeason(this.seasonKey);
    const phaseKnown = Boolean(this.regularOnly&&definition?.regularTableId) || definition?.verifiedRegularRounds?.[event.id]===round;
    const verified = phaseKnown && event.format === 'league' && Number.isInteger(round) && round > 0 && round <= maximum;
    return {roundNumber:verified ? round : null, roundLabel:verified ? `מחזור ${round}` : null,
      roundVerified:verified, competitionPhase:verified ? 'regular' : 'unknown'};
  }

  availableMetrics(event, teamIds) {
    const fields = {pointsFastBreak:'pfb',pointsFromTurnovers:'pto',pointsInPaint:'pipm',pointsSecondChance:'psc',pointsBench:'pbc'};
    const source = event.sp_teams;
    return Object.entries(fields).filter(([,field])=>teamIds.every(id=> {
      const value=source?.[id]?.[field];
      return value!==null && value!==undefined && value!=='' && Number.isFinite(Number(value));
    })).map(([metric])=>metric);
  }

  resolveTeamName(teamId, sourceName) {
    const name = String(sourceName || '').trim();
    if (name && !/^unknown(?: team)?$/i.test(name)) return name;
    return this.historicalTeamNames[teamId] || `קבוצה ללא שם (מזהה ${teamId ?? 'חסר'})`;
  }

  /**
   * חילוץ רבעים
   */
  extractQuarters(ibbaGame, homeTeamId, awayTeamId) {
    const homeResults = ibbaGame.results?.[homeTeamId] || {};
    const awayResults = ibbaGame.results?.[awayTeamId] || {};
    
    const value=(result,key)=>result[key]==null||result[key]===''||!Number.isFinite(Number(result[key]))?null:Number(result[key]);
    return Object.fromEntries(['one','two','three','four'].map((key,i)=>[`q${i+1}`,{home:value(homeResults,key),away:value(awayResults,key)}]));
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
      const titleNames = (ibbaGame.title?.rendered || '').split(/\s*[—–-]\s*/);
      const teamName = this.decodeHtmlEntities(this.resolveTeamName(teamId, rawTeamName || titleNames[teamId === homeTeamId ? 0 : 1]));
      const isHome = teamId === homeTeamId;
      
      // עיבוד כל שחקן בקבוצה
      Object.entries(teamPerformance).forEach(([playerId, stats]) => {
        // דילוג על סה"כ קבוצתי (key "0")
        if (playerId === '0') return;
        const fields=['min','pts','fgm','fga','threepm','threepa','ftm','fta','off','def','ast','stl','blk','to','pf','rate'];
        if (!stats || fields.some(field=>stats[field]==null || stats[field]==='')) return;
        
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
            totalRebounds: (IBBAAdapter.metricNumber(stats.off) || 0) + (IBBAAdapter.metricNumber(stats.def) || 0),
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
    // סטטיסטיקות בסיסיות מ-performance
    const homeStats = ibbaGame.performance?.[homeTeamId]?.['0'] || {};
    const awayStats = ibbaGame.performance?.[awayTeamId]?.['0'] || {};
    
    // סטטיסטיקות מתקדמות מ-sp_teams (Fast Break, Paint, Turnovers, etc.)
    const homeAdvanced = ibbaGame.sp_teams?.[homeTeamId] || {};
    const awayAdvanced = ibbaGame.sp_teams?.[awayTeamId] || {};
    
    return {
      home: this.normalizeTeamStats(homeStats, homeAdvanced),
      away: this.normalizeTeamStats(awayStats, awayAdvanced)
    };
  }

  normalizeTeamStats(stats, advanced = {}) {
    return {
      // סטטיסטיקות בסיסיות
      points: stats.pts || 0,
      fieldGoalsMade: stats.fgm || 0,
      fieldGoalsAttempted: stats.fga || 0,
      threePointsMade: stats.threepm || 0,
      threePointsAttempted: stats.threepa || 0,
      freeThrowsMade: stats.ftm || 0,
      freeThrowsAttempted: stats.fta || 0,
      offensiveRebounds: stats.off || 0,
      defensiveRebounds: stats.def || 0,
      totalRebounds: (IBBAAdapter.metricNumber(stats.off) || 0) + (IBBAAdapter.metricNumber(stats.def) || 0),
      assists: stats.ast || 0,
      steals: stats.stl || 0,
      blocks: stats.blk || 0,
      turnovers: stats.to || 0,
      personalFouls: stats.pf || 0,
      fgPercentage: this.calculatePercentage(stats.fgm, stats.fga),
      threePointPercentage: this.calculatePercentage(stats.threepm, stats.threepa),
      ftPercentage: this.calculatePercentage(stats.ftm, stats.fta),
      
      // סטטיסטיקות מתקדמות (מגיעות מ-sp_teams ב-API)
      pointsFastBreak: advanced.pfb || 0,         // נק' מהתקפה מתפרצת
      pointsFromTurnovers: advanced.pto || 0,     // נק' מאיבודים של היריבה
      pointsInPaint: advanced.pipm || 0,          // נק' בצבע (made)
      pointsInPaintAttempted: advanced.pipa || 0, // ניסיונות בצבע
      pointsSecondChance: advanced.psc || 0,      // נק' מהזדמנות שנייה
      pointsBench: advanced.pbc || 0              // נק' מהספסל
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
