/**
 * 🔄 IBBA Player Sync Module
 * ========================
 * מודול לסנכרון שחקנים מדף הליגה של IBBA
 * 
 * תכונות:
 * - קריאת דף הליגה
 * - חילוץ רשימת שחקנים מ-HTML
 * - זיהוי שחקנים חדשים
 * - זיהוי העברות
 * - סנכרון אוטומטי עם מסד הנתונים
 */

class IBBAPlayerSync {
  constructor() {
    const config = window.appConfig || {};
    this.leaguePageUrl = config.playersPageUrl || 'https://ibasketball.co.il/league/2025-2/';
    this.leagueId = config.leagueId || 119474;
  }

  /**
   * נקודת כניסה ראשית: סנכרון מלא של שחקנים
   * 
   * שיטה חדשה: חילוץ שחקנים ממשחקים (לא מדף הליגה)
   */
  async syncPlayers(dbWrapper, ibbaAdapter) {
    console.log('🔄 Starting player sync...');
    
    try {
      // 1. קריאת משחקים אחרונים (מכילים את כל השחקנים)
      console.log('📡 Fetching recent games from API...');
      const now = new Date().toISOString();
      const recentGames = await ibbaAdapter.fetchGames(50, now, null); // 50 משחקים שכבר התקיימו
      console.log(`✅ Fetched ${recentGames.length} games`);
      
      // 2. חילוץ שחקנים מהמשחקים
      console.log('🔍 Extracting players from games...');
      const ibbaPlayers = this.extractPlayersFromGames(recentGames, ibbaAdapter);
      console.log(`✅ Found ${ibbaPlayers.length} unique players in games`);
      
      // 3. אתחול מסד נתונים
      console.log('💾 Initializing database...');
      await dbWrapper.ensureReady();
      console.log('✅ Database ready');
      
      // 4. קבלת שחקנים מהמסד
      console.log('📊 Fetching players from database...');
      const dbPlayers = await dbWrapper.getAllPlayers();
      console.log(`✅ Found ${dbPlayers.length} players in database`);
      
      // 5. זיהוי שחקנים חדשים
      const newPlayers = this.detectNewPlayers(ibbaPlayers, dbPlayers);
      console.log(`🆕 Detected ${newPlayers.length} new players`);
      
      // 6. זיהוי העברות
      const transfers = this.detectTransfers(ibbaPlayers, dbPlayers);
      console.log(`🔄 Detected ${transfers.length} transfers`);
      
      // 7. החזרת תוצאות
      return {
        success: true,
        totalPlayers: ibbaPlayers.length,
        newPlayers: newPlayers,
        transfers: transfers,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Player sync failed:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * קריאת דף הליגה (עם CORS proxy fallback)
   */
  async fetchLeaguePage() {
    try {
      // ניסיון ישיר
      const response = await fetch(this.leaguePageUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (directError) {
      console.warn('⚠️ Direct fetch failed, trying the first-party proxy...');
      return await this.fetchViaProxy(this.leaguePageUrl);
    }
  }

  /**
   * קריאה דרך ה-proxy המוגבל של האפליקציה
   */
  async fetchViaProxy(targetUrl) {
    const proxyBaseUrl = window.appConfig?.ibbaProxyUrl || '/api/ibba';
    const proxies = [`${proxyBaseUrl}?url=${encodeURIComponent(targetUrl)}`];
    
    for (let i = 0; i < proxies.length; i++) {
      try {
        console.log(`🔄 Trying proxy ${i + 1}/${proxies.length}...`);
        const response = await fetch(proxies[i]);
        if (!response.ok) throw new Error(`Proxy ${i + 1} failed: ${response.status}`);
        const html = await response.text();
        console.log(`✅ Successfully fetched via proxy ${i + 1}`);
        return html;
      } catch (error) {
        console.warn(`⚠️ Proxy ${i + 1} failed:`, error.message);
        if (i === proxies.length - 1) {
          throw new Error('All proxies failed. Cannot fetch league page.');
        }
      }
    }
  }

  /**
   * חילוץ שחקנים ממשחקים (שיטה חדשה!)
   * 
   * מקבל מערך משחקים וחולץ את כל השחקנים הייחודיים
   */
  extractPlayersFromGames(games, adapter) {
    const playersMap = new Map(); // למנוע כפילויות
    
    console.log(`🔍 Processing ${games.length} games...`);
    
    games.forEach((game, index) => {
      // המרה לפורמט פנימי
      const converted = adapter.convertToInternalFormat(game);
      
      // DEBUG: בואו נראה מה קורה
      if (index === 0) {
        console.log(`🔍 First game sample:`, {
          id: converted.gameId,
          teams: `${converted.teams[0].name} vs ${converted.teams[1].name}`,
          playersCount: converted.players ? converted.players.length : 0,
          hasPerformance: game.performance ? 'yes' : 'no'
        });
      }
      
      // עיבוד כל שחקן במשחק
      if (converted.players && converted.players.length > 0) {
        converted.players.forEach(player => {
          const playerId = player.playerId;
          
          // אם השחקן כבר קיים, נעדכן רק את התאריך
          if (playersMap.has(playerId)) {
            const existing = playersMap.get(playerId);
            existing.lastSeen = new Date().toISOString();
            existing.appearances = (existing.appearances || 1) + 1;
          } else {
            // שחקן חדש
            playersMap.set(playerId, {
              playerId: playerId,
              name: `Player #${player.jersey}`, // אין לנו שם, רק מספר
              teamId: player.teamId,
              teamName: player.teamName,
              jersey: player.jersey,
              source: 'ibba_games',
              lastSeen: new Date().toISOString(),
              appearances: 1
            });
          }
        });
      }
    });
    
    return Array.from(playersMap.values());
  }

  /**
   * חילוץ שחקנים מ-HTML של דף הליגה (ישן - לא עובד)
   * 
   * מבנה HTML (לדוגמה):
   * <div class="player-item" data-player-id="123456">
   *   <span class="player-name">שם שחקן</span>
   *   <span class="team-name">שם קבוצה</span>
   * </div>
   */
  parsePlayersFromHtml(html) {
    const players = [];
    
    try {
      // יצירת parser DOM
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // DEBUG: בואו נראה מה יש בדף
      console.log(`📄 HTML length: ${html.length} characters`);
      console.log(`📄 Page title: ${doc.title}`);
      
      // חיפוש רשימת שחקנים
      // הפורמט המדויק תלוי במבנה האתר - זה דוגמה
      const playerElements = doc.querySelectorAll('.player-card, .roster-player, [data-player-id]');
      
      console.log(`🔍 Found ${playerElements.length} player elements in HTML`);
      
      playerElements.forEach((element, index) => {
        try {
          // חילוץ נתונים
          const playerId = this.extractPlayerId(element);
          const playerName = this.extractPlayerName(element);
          const teamName = this.extractTeamName(element);
          const teamId = this.extractTeamId(element);
          
          if (playerId && playerName) {
            players.push({
              playerId: playerId.toString(),
              name: playerName,
              teamId: teamId ? teamId.toString() : null,
              teamName: teamName || 'לא ידוע',
              source: 'ibba_league_page',
              lastSeen: new Date().toISOString()
            });
          }
        } catch (err) {
          console.warn(`⚠️ Failed to parse player at index ${index}:`, err.message);
        }
      });
      
      // אם לא מצאנו שחקנים, אולי המבנה שונה - ננסה גישה אלטרנטיבית
      if (players.length === 0) {
        console.warn('⚠️ No players found with primary method, trying alternative parsing...');
        return this.parsePlayersAlternative(doc);
      }
      
    } catch (error) {
      console.error('❌ Failed to parse HTML:', error);
      throw new Error(`HTML parsing failed: ${error.message}`);
    }
    
    return players;
  }

  /**
   * גישה אלטרנטיבית לחילוץ שחקנים (במקרה שהמבנה שונה)
   */
  parsePlayersAlternative(doc) {
    const players = [];
    
    // DEBUG: בואו ננסה למצוא כל מיני דברים
    console.log('🔍 Trying alternative selectors...');
    
    // ניסיון 1: links לשחקנים
    const playerLinks = doc.querySelectorAll('a[href*="/player/"], a[href*="/players/"]');
    console.log(`  - Player links: ${playerLinks.length}`);
    
    // ניסיון 2: divs עם classes שונים
    const divs = doc.querySelectorAll('div[class*="player"], div[class*="roster"]');
    console.log(`  - Divs with player/roster: ${divs.length}`);
    
    // ניסיון 3: tables (אולי השחקנים בטבלה?)
    const tables = doc.querySelectorAll('table');
    console.log(`  - Tables: ${tables.length}`);
    
    // ניסיון 4: בואו נראה אילו classes יש בדף
    const allElements = doc.querySelectorAll('*[class]');
    const classes = new Set();
    allElements.forEach(el => {
      el.classList.forEach(cls => {
        if (cls.includes('player') || cls.includes('roster') || cls.includes('team')) {
          classes.add(cls);
        }
      });
    });
    console.log(`  - Relevant classes found: ${Array.from(classes).join(', ')}`);
    
    console.log(`🔍 Alternative method found ${playerLinks.length} player links`);
    
    playerLinks.forEach(link => {
      try {
        const href = link.getAttribute('href');
        const playerId = this.extractPlayerIdFromUrl(href);
        const playerName = link.textContent.trim();
        
        if (playerId && playerName && playerName.length > 1) {
          players.push({
            playerId: playerId.toString(),
            name: playerName,
            teamId: null,
            teamName: 'לא ידוע',
            source: 'ibba_league_page_alt',
            lastSeen: new Date().toISOString()
          });
        }
      } catch (err) {
        // שקט, דילוג על שחקן בעייתי
      }
    });
    
    return players;
  }

  /**
   * חילוץ ID שחקן מאלמנט
   */
  extractPlayerId(element) {
    // ניסיון 1: data-player-id
    let id = element.getAttribute('data-player-id');
    if (id) return id;
    
    // ניסיון 2: data-id
    id = element.getAttribute('data-id');
    if (id) return id;
    
    // ניסיון 3: מתוך href
    const link = element.querySelector('a[href*="/player/"]');
    if (link) {
      return this.extractPlayerIdFromUrl(link.getAttribute('href'));
    }
    
    return null;
  }

  /**
   * חילוץ ID שחקן מ-URL
   */
  extractPlayerIdFromUrl(url) {
    if (!url) return null;
    
    // דוגמה: /player/123456/ או /players/123456
    const match = url.match(/\/players?\/(\d+)/);
    return match ? match[1] : null;
  }

  /**
   * חילוץ שם שחקן
   */
  extractPlayerName(element) {
    // ניסיון 1: .player-name
    let nameEl = element.querySelector('.player-name, .name, h3, h4');
    if (nameEl) return this.cleanText(nameEl.textContent);
    
    // ניסיון 2: data-name
    let name = element.getAttribute('data-name');
    if (name) return this.cleanText(name);
    
    // ניסיון 3: title
    name = element.getAttribute('title');
    if (name) return this.cleanText(name);
    
    // ניסיון 4: טקסט ישיר
    return this.cleanText(element.textContent);
  }

  /**
   * חילוץ שם קבוצה
   */
  extractTeamName(element) {
    const teamEl = element.querySelector('.team-name, .team, .club');
    return teamEl ? this.cleanText(teamEl.textContent) : null;
  }

  /**
   * חילוץ ID קבוצה
   */
  extractTeamId(element) {
    const teamEl = element.querySelector('[data-team-id]');
    return teamEl ? teamEl.getAttribute('data-team-id') : null;
  }

  /**
   * ניקוי טקסט מרווחים וHTML entities
   */
  cleanText(text) {
    if (!text) return '';
    
    // יצירת textarea לdecode HTML entities
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    const decoded = textarea.value;
    
    // ניקוי רווחים מיותרים
    return decoded.trim().replace(/\s+/g, ' ');
  }

  /**
   * זיהוי שחקנים חדשים (שלא קיימים במסד)
   */
  detectNewPlayers(ibbaPlayers, dbPlayers) {
    const dbPlayerIds = new Set(dbPlayers.map(p => p.player_id?.toString() || p.playerId?.toString()));
    
    return ibbaPlayers.filter(player => !dbPlayerIds.has(player.playerId));
  }

  /**
   * זיהוי העברות (שחקנים ששינו קבוצה)
   */
  detectTransfers(ibbaPlayers, dbPlayers) {
    const transfers = [];
    
    // יצירת מפה של שחקנים במסד לפי ID
    const dbPlayerMap = new Map();
    dbPlayers.forEach(p => {
      const id = (p.player_id || p.playerId)?.toString();
      if (id) dbPlayerMap.set(id, p);
    });
    
    // בדיקת כל שחקן מIBBA
    ibbaPlayers.forEach(ibbaPlayer => {
      const dbPlayer = dbPlayerMap.get(ibbaPlayer.playerId);
      
      if (dbPlayer && ibbaPlayer.teamId) {
        const dbTeamId = (dbPlayer.current_team_id || dbPlayer.teamId)?.toString();
        const ibbaTeamId = ibbaPlayer.teamId.toString();
        
        // אם הקבוצה שונה - זו העברה!
        if (dbTeamId && dbTeamId !== ibbaTeamId) {
          transfers.push({
            playerId: ibbaPlayer.playerId,
            playerName: ibbaPlayer.name,
            fromTeamId: dbTeamId,
            fromTeamName: dbPlayer.current_team_name || dbPlayer.teamName || 'לא ידוע',
            toTeamId: ibbaTeamId,
            toTeamName: ibbaPlayer.teamName,
            detectedAt: new Date().toISOString()
          });
        }
      }
    });
    
    return transfers;
  }

  /**
   * שמירת שחקנים חדשים למסד (דרך wrapper)
   */
  async saveNewPlayers(newPlayers, dbWrapper) {
    console.log(`💾 Saving ${newPlayers.length} new players...`);
    
    const results = {
      saved: 0,
      failed: 0,
      errors: []
    };
    
    for (const player of newPlayers) {
      try {
        await dbWrapper.savePlayer(player);
        results.saved++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          player: player.name,
          error: error.message
        });
        console.error(`❌ Failed to save player ${player.name}:`, error.message);
      }
    }
    
    console.log(`✅ Saved ${results.saved}/${newPlayers.length} players`);
    return results;
  }

  /**
   * שמירת העברות למסד (דרך wrapper)
   */
  async saveTransfers(transfers, dbWrapper) {
    console.log(`💾 Saving ${transfers.length} transfers...`);
    
    const results = {
      saved: 0,
      failed: 0,
      errors: []
    };
    
    for (const transfer of transfers) {
      try {
        await dbWrapper.saveTransfer(transfer);
        results.saved++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          player: transfer.playerName,
          error: error.message
        });
        console.error(`❌ Failed to save transfer for ${transfer.playerName}:`, error.message);
      }
    }
    
    console.log(`✅ Saved ${results.saved}/${transfers.length} transfers`);
    return results;
  }
}

// ייצוא למודול
if (typeof module !== 'undefined' && module.exports) {
  module.exports = IBBAPlayerSync;
}
