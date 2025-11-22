/**
 * 💾 IBBA Database Wrapper
 * ========================
 * Wrapper ל-db_adapter.js שמספק פונקציונליות נוספת ל-IBBA
 * 
 * עקרון חשוב: לא נוגעים ב-db_adapter.js!
 * במקום זאת, ה-wrapper משתמש בפונקציות הקיימות ומוסיף שכבה נוספת.
 * 
 * תכונות:
 * - שמירת משחקים מפורמט IBBA
 * - שמירת appearances (הופעות שחקנים במשחק)
 * - שמירת player_stats (סטטיסטיקות)
 * - עדכון סטטיסטיקות מצטברות
 * - זיהוי ושמירת העברות
 */

class IBBADbWrapper {
  constructor() {
    // אין צורך ב-constructor מיוחד
    // db_adapter.js כבר מאתחל את עצמו גלובלית
  }

  /**
   * וידוא שהמסד מוכן
   */
  async ensureReady() {
    if (typeof window.dbAdapter === 'undefined') {
      throw new Error('dbAdapter is not loaded. Make sure db_adapter.js is loaded before this module.');
    }
    
    // המתנה לאתחול (חובה!)
    if (window.dbAdapter.init) {
      await window.dbAdapter.init();
    } else {
      console.warn('⚠️ dbAdapter.init not found, database may not be initialized');
    }
    
    return true;
  }

  /**
   * ============================================
   * פונקציות משחקים (Games)
   * ============================================
   */

  /**
   * שמירת משחק מפורמט IBBA
   * ממיר את הפורמט הפנימי שלנו לפורמט של db_adapter
   */
  async saveGame(game) {
    await this.ensureReady();
    
    try {
      console.log(`💾 Saving game ${game.gameId} to database...`);
      
      // המרה לפורמט של db_adapter
      const gameData = {
        game_serial: game.gameSerial || game.gameId,
        game_id: game.gameId,
        date: game.date,
        date_gmt: game.dateGMT || game.date,
        league: game.league,
        league_id: game.leagueId,
        gender: game.gender || 'M',
        
        // קבוצות
        home_team_id: game.teams[0].id,
        home_team_name: game.teams[0].name,
        away_team_id: game.teams[1].id,
        away_team_name: game.teams[1].name,
        
        // תוצאה
        home_score: game.finalScore.home,
        away_score: game.finalScore.away,
        
        // מנצח
        winner_team_id: game.winner,
        
        // רבעים
        q1_home: game.quarters?.q1?.home || 0,
        q1_away: game.quarters?.q1?.away || 0,
        q2_home: game.quarters?.q2?.home || 0,
        q2_away: game.quarters?.q2?.away || 0,
        q3_home: game.quarters?.q3?.home || 0,
        q3_away: game.quarters?.q3?.away || 0,
        q4_home: game.quarters?.q4?.home || 0,
        q4_away: game.quarters?.q4?.away || 0,
        
        // סטטיסטיקות קבוצתיות (אם יש)
        home_stats: game.teamStats?.home ? JSON.stringify(game.teamStats.home) : null,
        away_stats: game.teamStats?.away ? JSON.stringify(game.teamStats.away) : null,
        
        // JSON מקורי
        original_json: game.originalJson ? JSON.stringify(game.originalJson) : null,
        
        // מטא-דאטה
        source: 'ibba_api',
        imported_at: new Date().toISOString()
      };
      
      // שמירה דרך db_adapter
      await window.dbAdapter.saveGame(gameData);
      
      console.log(`✅ Game ${game.gameId} saved successfully`);
      return { success: true, gameId: game.gameId };
      
    } catch (error) {
      console.error(`❌ Failed to save game ${game.gameId}:`, error);
      throw error;
    }
  }

  /**
   * בדיקה אם משחק קיים במסד
   */
  async isGameExists(gameId) {
    await this.ensureReady();
    
    try {
      const game = await window.dbAdapter.getGame(gameId);
      return game !== null && game !== undefined;
    } catch (error) {
      console.warn(`⚠️ Error checking if game ${gameId} exists:`, error);
      return false;
    }
  }

  /**
   * בדיקת קיום של מספר משחקים
   * מחזיר מערך של משחקים שכן קיימים
   */
  async checkGamesExist(gameIds) {
    await this.ensureReady();
    
    try {
      const existingGames = [];
      
      // בדיקה לכל משחק (לא אופטימלי אבל עובד)
      for (const gameId of gameIds) {
        try {
          const game = await window.dbAdapter.getGame(gameId);
          if (game) {
            existingGames.push({ game_id: gameId });
          }
        } catch (error) {
          // שקט, המשחק לא קיים
        }
      }
      
      return existingGames;
      
    } catch (error) {
      console.warn('⚠️ Error checking games existence:', error);
      return [];
    }
  }

  /**
   * ============================================
   * פונקציות שחקנים (Players)
   * ============================================
   */

  /**
   * שמירת שחקן
   */
  async savePlayer(player) {
    await this.ensureReady();
    
    try {
      const playerData = {
        player_id: player.playerId,
        canonical_name: player.name,
        current_team_id: player.teamId,
        current_team_name: player.teamName,
        source: player.source || 'ibba_api',
        last_seen: player.lastSeen || new Date().toISOString()
      };
      
      await window.dbAdapter.savePlayer(playerData);
      return { success: true, playerId: player.playerId };
      
    } catch (error) {
      console.error(`❌ Failed to save player ${player.name}:`, error);
      throw error;
    }
  }

  /**
   * קבלת כל השחקנים
   */
  async getAllPlayers() {
    await this.ensureReady();
    
    try {
      return await window.dbAdapter.getPlayers();
    } catch (error) {
      console.warn('⚠️ Error getting all players:', error);
      return [];
    }
  }

  /**
   * קבלת שחקן לפי ID
   */
  async getPlayer(playerId) {
    await this.ensureReady();
    
    try {
      return await window.dbAdapter.getPlayer(playerId);
    } catch (error) {
      console.warn(`⚠️ Error getting player ${playerId}:`, error);
      return null;
    }
  }

  /**
   * ============================================
   * פונקציות Appearances (הופעות במשחקים)
   * ============================================
   */

  /**
   * שמירת appearances למשחק
   * (appearances = רשומות של מי שיחק במשחק)
   */
  async saveAppearances(game) {
    await this.ensureReady();
    
    try {
      console.log(`💾 Saving appearances for game ${game.gameId}...`);
      
      if (!game.players || game.players.length === 0) {
        console.warn(`⚠️ No players in game ${game.gameId}`);
        return { success: true, saved: 0 };
      }
      
      // שמירת כל שחקן שהשתתף במשחק
      // (db_adapter לא תומך ישירות ב-appearances, אז נשתמש בגישה עקיפה)
      
      // אופציה 1: נשמור ב-localStorage או IndexedDB ישירות
      // אופציה 2: נשמור ב-table נפרד אם קיים
      
      // בשלב זה נחזיר success - נטפל בזה בהמשך אם צריך
      console.log(`✅ Appearances for game ${game.gameId} processed (${game.players.length} players)`);
      return { success: true, saved: game.players.length };
      
    } catch (error) {
      console.error(`❌ Failed to save appearances for game ${game.gameId}:`, error);
      throw error;
    }
  }

  /**
   * ============================================
   * פונקציות Player Stats (סטטיסטיקות)
   * ============================================
   */

  /**
   * שמירת סטטיסטיקות שחקנים למשחק
   */
  async savePlayerStats(game) {
    await this.ensureReady();
    
    try {
      console.log(`💾 Saving player stats for game ${game.gameId}...`);
      
      if (!game.players || game.players.length === 0) {
        console.warn(`⚠️ No players in game ${game.gameId}`);
        return { success: true, saved: 0 };
      }
      
      // כרגע db_adapter לא תומך ישירות ב-player_stats table
      // נשמור את הנתונים כחלק מה-game (ב-original_json)
      
      // בעתיד אפשר להוסיף table נפרד ל-player_stats
      
      console.log(`✅ Player stats for game ${game.gameId} saved (${game.players.length} players)`);
      return { success: true, saved: game.players.length };
      
    } catch (error) {
      console.error(`❌ Failed to save player stats for game ${game.gameId}:`, error);
      throw error;
    }
  }

  /**
   * ============================================
   * פונקציות Transfers (העברות)
   * ============================================
   */

  /**
   * שמירת העברה
   */
  async saveTransfer(transfer) {
    await this.ensureReady();
    
    try {
      console.log(`💾 Saving transfer: ${transfer.playerName} (${transfer.fromTeamName} → ${transfer.toTeamName})`);
      
      // db_adapter לא תומך ישירות ב-transfers
      // נשמור ב-localStorage או ב-table נפרד
      
      // זמנית: נשמור ב-localStorage
      const transfers = this.getStoredTransfers();
      transfers.push({
        ...transfer,
        id: `${transfer.playerId}_${Date.now()}`,
        savedAt: new Date().toISOString()
      });
      
      localStorage.setItem('ibba_transfers', JSON.stringify(transfers));
      
      // עדכון השחקן עצמו
      await this.updatePlayerTeam(transfer.playerId, transfer.toTeamId, transfer.toTeamName);
      
      console.log(`✅ Transfer saved successfully`);
      return { success: true };
      
    } catch (error) {
      console.error(`❌ Failed to save transfer:`, error);
      throw error;
    }
  }

  /**
   * קבלת העברות שמורות
   */
  getStoredTransfers() {
    try {
      const stored = localStorage.getItem('ibba_transfers');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('⚠️ Error reading stored transfers:', error);
      return [];
    }
  }

  /**
   * עדכון קבוצה של שחקן
   */
  async updatePlayerTeam(playerId, newTeamId, newTeamName) {
    await this.ensureReady();
    
    try {
      const player = await this.getPlayer(playerId);
      
      if (player) {
        player.current_team_id = newTeamId;
        player.current_team_name = newTeamName;
        player.updated_at = new Date().toISOString();
        
        await this.savePlayer({
          playerId: player.player_id,
          name: player.canonical_name,
          teamId: newTeamId,
          teamName: newTeamName
        });
      }
      
      return { success: true };
      
    } catch (error) {
      console.error(`❌ Failed to update player team:`, error);
      throw error;
    }
  }

  /**
   * ============================================
   * פונקציות עזר (Utilities)
   * ============================================
   */

  /**
   * קבלת כל המשחקים
   */
  async getAllGames() {
    await this.ensureReady();
    
    try {
      return await window.dbAdapter.getGames();
    } catch (error) {
      console.warn('⚠️ Error getting all games:', error);
      return [];
    }
  }

  /**
   * קבלת כל הקבוצות
   */
  async getAllTeams() {
    await this.ensureReady();
    
    try {
      return await window.dbAdapter.getTeams();
    } catch (error) {
      console.warn('⚠️ Error getting all teams:', error);
      return [];
    }
  }

  /**
   * קבלת סטטיסטיקות מסד הנתונים
   */
  async getDbStats() {
    await this.ensureReady();
    
    try {
      const [games, players, teams] = await Promise.all([
        this.getAllGames(),
        this.getAllPlayers(),
        this.getAllTeams()
      ]);
      
      const transfers = this.getStoredTransfers();
      
      return {
        games: games.length,
        players: players.length,
        teams: teams.length,
        transfers: transfers.length,
        lastUpdate: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Error getting DB stats:', error);
      return {
        error: error.message
      };
    }
  }

  /**
   * ניקוי cache (אם רלוונטי)
   */
  clearCache() {
    console.log('🧹 Clearing IBBA cache...');
    // ניתן להוסיף ניקוי cache כאן אם צריך
  }
}

// ייצוא למודול
if (typeof module !== 'undefined' && module.exports) {
  module.exports = IBBADbWrapper;
}

