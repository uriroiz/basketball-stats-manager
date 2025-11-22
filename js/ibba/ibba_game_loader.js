/**
 * 🎯 IBBA Game Loader Module
 * ==========================
 * מודול לטעינה חכמה של משחקים חדשים
 * 
 * תכונות:
 * - טעינת משחקים חדשים בלבד (לא כפילויות)
 * - בדיקה חכמה מול מסד הנתונים
 * - טעינה לפי טווח תאריכים
 * - דיווח מפורט על מה נטען
 * - תמיכה ב-batch loading
 */

class IBBAGameLoader {
  constructor(ibbaAdapter, dbWrapper) {
    this.adapter = ibbaAdapter;
    this.db = dbWrapper;
  }

  /**
   * נקודת כניסה ראשית: טעינת משחקים חדשים
   * 
   * @param {string} since - תאריך התחלה (ISO format או 'auto')
   * @param {string} until - תאריך סיום (ISO format או 'now')
   * @param {number} limit - מספר משחקים מקסימלי
   */
  async loadNewGames(since = 'auto', until = 'now', limit = 50) {
    console.log('🎯 Starting smart game loading...');
    console.log(`📅 Date range: ${since} to ${until}`);
    
    try {
      // 1. קביעת טווח תאריכים
      const dateRange = this.calculateDateRange(since, until);
      console.log(`📅 Actual date range: ${dateRange.since} to ${dateRange.until}`);
      
      // 2. קריאת משחקים מ-API
      console.log(`📡 Fetching games from IBBA API (limit: ${limit})...`);
      const apiGames = await this.adapter.fetchGames(limit, dateRange.until, dateRange.since);
      console.log(`✅ Fetched ${apiGames.length} games from API`);
      
      // 3. המרה לפורמט פנימי
      console.log('🔄 Converting games to internal format...');
      const convertedGames = apiGames.map(g => this.adapter.convertToInternalFormat(g));
      console.log(`✅ Converted ${convertedGames.length} games`);
      
      // 4. קבלת משחקים קיימים מהמסד
      console.log('📊 Checking which games already exist in database...');
      const existingGameIds = await this.getExistingGameIds(convertedGames);
      console.log(`📊 Found ${existingGameIds.size} existing games in database`);
      
      // 5. סינון משחקים חדשים בלבד
      const newGames = this.filterNewGames(convertedGames, existingGameIds);
      console.log(`🆕 Found ${newGames.length} new games to load`);
      
      // 6. סינון משחקים שכבר התקיימו (לא עתידיים)
      const playedGames = newGames.filter(g => {
        const gameDate = new Date(g.date);
        const now = new Date();
        return gameDate <= now && g.players && g.players.length > 0;
      });
      console.log(`✅ ${playedGames.length} games have already been played`);
      
      // 7. החזרת תוצאות
      return {
        success: true,
        total: apiGames.length,
        existing: existingGameIds.size,
        new: playedGames.length,
        future: newGames.length - playedGames.length,
        games: playedGames,
        skipped: convertedGames.filter(g => existingGameIds.has(g.gameId)),
        dateRange: dateRange,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Game loading failed:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * חישוב טווח תאריכים חכם
   */
  calculateDateRange(since, until) {
    const now = new Date();
    let sinceDate, untilDate;
    
    // עיבוד until
    if (until === 'now') {
      untilDate = now;
    } else {
      untilDate = new Date(until);
    }
    
    // עיבוד since
    if (since === 'auto') {
      // אוטומטי: 7 ימים אחורה
      sinceDate = new Date(now);
      sinceDate.setDate(sinceDate.getDate() - 7);
    } else if (since === 'last_game') {
      // מהמשחק האחרון במסד (נטפל בזה בהמשך)
      sinceDate = new Date(now);
      sinceDate.setDate(sinceDate.getDate() - 30); // זמני: 30 ימים
    } else {
      sinceDate = new Date(since);
    }
    
    return {
      since: sinceDate.toISOString(),
      until: untilDate.toISOString()
    };
  }

  /**
   * קבלת רשימת IDs של משחקים קיימים במסד
   */
  async getExistingGameIds(games) {
    const gameIds = games.map(g => g.gameId);
    
    try {
      const existingGames = await this.db.checkGamesExist(gameIds);
      return new Set(existingGames.map(g => g.game_id || g.gameId));
    } catch (error) {
      console.warn('⚠️ Failed to check existing games, assuming none exist:', error.message);
      return new Set();
    }
  }

  /**
   * סינון משחקים - רק חדשים
   */
  filterNewGames(games, existingGameIds) {
    return games.filter(game => !existingGameIds.has(game.gameId));
  }

  /**
   * טעינה ושמירה אוטומטית של משחקים חדשים
   */
  async loadAndSaveNewGames(since = 'auto', until = 'now', limit = 50) {
    console.log('💾 Starting load and save process...');
    
    // 1. טעינת משחקים חדשים
    const loadResult = await this.loadNewGames(since, until, limit);
    
    if (!loadResult.success) {
      return loadResult;
    }
    
    if (loadResult.new === 0) {
      console.log('ℹ️ No new games to save');
      return {
        ...loadResult,
        saved: 0,
        message: 'No new games to save'
      };
    }
    
    // 2. שמירת משחקים חדשים
    console.log(`💾 Saving ${loadResult.games.length} new games...`);
    const saveResults = await this.saveGames(loadResult.games);
    
    return {
      ...loadResult,
      ...saveResults
    };
  }

  /**
   * שמירת מערך משחקים למסד
   */
  async saveGames(games) {
    const results = {
      saved: 0,
      failed: 0,
      errors: []
    };
    
    for (let i = 0; i < games.length; i++) {
      const game = games[i];
      
      try {
        console.log(`💾 Saving game ${i + 1}/${games.length}: ${game.teams[0].name} vs ${game.teams[1].name}`);
        
        await this.saveGame(game);
        results.saved++;
        
        console.log(`✅ Game ${game.gameId} saved successfully`);
        
      } catch (error) {
        results.failed++;
        results.errors.push({
          gameId: game.gameId,
          teams: `${game.teams[0].name} vs ${game.teams[1].name}`,
          error: error.message
        });
        console.error(`❌ Failed to save game ${game.gameId}:`, error.message);
      }
    }
    
    console.log(`✅ Saved ${results.saved}/${games.length} games`);
    return results;
  }

  /**
   * שמירת משחק בודד למסד (עם כל הנתונים הקשורים)
   */
  async saveGame(game) {
    try {
      // 1. שמירת המשחק עצמו
      await this.db.saveGame(game);
      
      // 2. שמירת appearances (הופעות שחקנים במשחק)
      if (game.players && game.players.length > 0) {
        await this.db.saveAppearances(game);
      }
      
      // 3. שמירת סטטיסטיקות
      if (game.players && game.players.length > 0) {
        await this.db.savePlayerStats(game);
      }
      
      // 4. עדכון סטטיסטיקות מצטברות
      // (זה יהיה ב-wrapper)
      
      console.log(`✅ Game ${game.gameId} and all related data saved`);
      
    } catch (error) {
      console.error(`❌ Failed to save game ${game.gameId}:`, error);
      throw error;
    }
  }

  /**
   * טעינת משחק בודד (עם בדיקת קיום)
   */
  async loadSingleGame(gameId, forceSave = false) {
    console.log(`🎯 Loading single game: ${gameId}`);
    
    try {
      // 1. בדיקה אם המשחק כבר קיים
      if (!forceSave) {
        const exists = await this.db.isGameExists(gameId);
        if (exists) {
          console.log(`ℹ️ Game ${gameId} already exists in database`);
          return {
            success: true,
            alreadyExists: true,
            message: 'Game already exists in database'
          };
        }
      }
      
      // 2. קריאת המשחק מ-API
      console.log(`📡 Fetching game ${gameId} from API...`);
      const apiGame = await this.adapter.fetchGame(gameId);
      
      // 3. המרה לפורמט פנימי
      const game = this.adapter.convertToInternalFormat(apiGame);
      
      // 4. בדיקה שהמשחק התקיים (לא עתידי)
      const gameDate = new Date(game.date);
      const now = new Date();
      
      if (gameDate > now) {
        return {
          success: false,
          error: 'Game has not been played yet (future game)'
        };
      }
      
      if (!game.players || game.players.length === 0) {
        return {
          success: false,
          error: 'Game has no player data'
        };
      }
      
      // 5. שמירת המשחק
      console.log(`💾 Saving game ${gameId}...`);
      await this.saveGame(game);
      
      return {
        success: true,
        game: game,
        message: 'Game loaded and saved successfully'
      };
      
    } catch (error) {
      console.error(`❌ Failed to load game ${gameId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * קבלת סטטיסטיקה על משחקים במסד לעומת API
   */
  async getLoadingStats(days = 30) {
    console.log(`📊 Getting loading statistics for last ${days} days...`);
    
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);
      const sinceISO = since.toISOString();
      const untilISO = new Date().toISOString();
      
      // קריאת משחקים מAPI
      const apiGames = await this.adapter.fetchGames(100, untilISO, sinceISO);
      const apiGameIds = new Set(apiGames.map(g => g.id));
      
      // בדיקת קיום במסד
      const existingIds = await this.getExistingGameIds(
        apiGames.map(g => ({ gameId: g.id }))
      );
      
      // חישוב מה חסר
      const missingIds = [...apiGameIds].filter(id => !existingIds.has(id));
      
      return {
        period: `${days} days`,
        totalInApi: apiGames.length,
        existingInDb: existingIds.size,
        missingInDb: missingIds.length,
        coverage: existingIds.size > 0 
          ? Math.round((existingIds.size / apiGames.length) * 100) 
          : 0,
        missingGameIds: missingIds.slice(0, 10) // רק 10 ראשונים
      };
      
    } catch (error) {
      console.error('❌ Failed to get loading stats:', error);
      return {
        error: error.message
      };
    }
  }
}

// ייצוא למודול
if (typeof module !== 'undefined' && module.exports) {
  module.exports = IBBAGameLoader;
}




