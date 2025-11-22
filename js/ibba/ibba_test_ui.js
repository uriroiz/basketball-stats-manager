/**
 * IBBA Test UI Controller
 * לוגיקת בדיקה עבור מודול IBBA
 * 
 * @version 1.0.0
 */

// Initialize adapter
const adapter = new IBBAAdapter();

/**
 * רישום הודעה עם צבע וטיימסטמפ
 */
function log(message, type = 'info') {
  const output = document.getElementById('output');
  const timestamp = new Date().toLocaleTimeString('he-IL');
  
  let color = 'black';
  let icon = 'ℹ️';
  
  switch(type) {
    case 'error':
      color = '#dc2626';
      icon = '❌';
      break;
    case 'success':
      color = '#16a34a';
      icon = '✅';
      break;
    case 'warning':
      color = '#ea580c';
      icon = '⚠️';
      break;
    case 'info':
      color = '#2563eb';
      icon = '📘';
      break;
  }
  
  const line = `<div style="color: ${color}; margin: 4px 0;">[${timestamp}] ${icon} ${message}</div>`;
  output.innerHTML += line;
  
  // Scroll to bottom
  output.scrollTop = output.scrollHeight;
  
  // Also log to console
  console.log(`[${timestamp}] ${message}`);
}

/**
 * בדיקת טעינת רשימת משחקים
 */
async function testFetchGames() {
  log('=== מתחיל בדיקת טעינת משחקים ===', 'info');
  log('🔄 שולח בקשה ל-API (משחקים שהתקיימו בלבד)...');
  
  try {
    // 1. קריאת משחקים מה-API - רק משחקים שכבר התקיימו
    const startTime = Date.now();
    const now = new Date().toISOString();
    const games = await adapter.fetchGames(20, now, null); // before=now = משחקים עד עכשיו
    const fetchDuration = Date.now() - startTime;
    
    log(`✅ נטענו ${games.length} משחקים מה-API (${fetchDuration}ms)`, 'success');
    
    // 2. המרה לפורמט פנימי
    log('🔄 ממיר משחקים לפורמט פנימי...');
    const converted = games.map(g => adapter.convertToInternalFormat(g));
    log(`✅ הומרו ${converted.length} משחקים לפורמט פנימי`, 'success');
    
    // 3. סינון משחקים שכבר התקיימו (יש להם נתונים)
    const playedGames = converted.filter(g => g.players.length > 0);
    const futureGames = converted.filter(g => g.players.length === 0);
    
    if (futureGames.length > 0) {
      log(`ℹ️ ${futureGames.length} משחקים עתידיים (ללא נתוני שחקנים) סוננו`, 'info');
    }
    
    log(`✅ ${playedGames.length} משחקים עם נתוני שחקנים`, 'success');
    
    // 4. הצגת סיכום משחקים שהתקיימו
    log('', 'info');
    log('📊 סיכום משחקים (10 ראשונים):', 'info');
    const gamesToShow = playedGames.slice(0, 10);
    gamesToShow.forEach((game, index) => {
      const homeTeam = game.teams[0].name;
      const awayTeam = game.teams[1].name;
      const homeScore = game.finalScore.home;
      const awayScore = game.finalScore.away;
      const date = new Date(game.date).toLocaleDateString('he-IL');
      const playersCount = game.players.length;
      
      // הצגה בפורמט עברית: בית (ימין) תוצאה_חוץ-תוצאה_בית חוץ (שמאל)
      // סדר התוצאה הפוך כדי שכל קבוצה תהיה קרובה לתוצאה שלה בכיוון הקריאה
      const displayText = `${homeTeam} ${awayScore}-${homeScore} ${awayTeam}`;
      
      log(`${index + 1}. ${displayText} (${date}) - ${playersCount} שחקנים`);
    });
    
    // 5. הצגת דוגמה מפורטת למשחק ראשון
    if (playedGames.length > 0) {
      log('', 'info');
      log('--- דוגמה למשחק ראשון (JSON מלא) ---', 'info');
      log(JSON.stringify(playedGames[0], null, 2));
    }
    
    log('', 'info');
    log('✅ בדיקת משחקים הושלמה בהצלחה!', 'success');
    
  } catch (error) {
    log(`❌ שגיאה בטעינת משחקים: ${error.message}`, 'error');
    log(`Stack trace: ${error.stack}`, 'error');
    console.error('Full error:', error);
  }
}

/**
 * בדיקת טעינת משחק בודד
 */
async function testFetchSingleGame() {
  const gameId = 1200241; // משחק לדוגמה
  
  log('=== מתחיל בדיקת טעינת משחק בודד ===', 'info');
  log(`🔄 טוען משחק ${gameId}...`);
  
  try {
    // 1. קריאת משחק מה-API
    const startTime = Date.now();
    const game = await adapter.fetchGame(gameId);
    const fetchDuration = Date.now() - startTime;
    
    log(`✅ משחק ${gameId} נטען מה-API (${fetchDuration}ms)`, 'success');
    
    // 2. המרה לפורמט פנימי
    log('🔄 ממיר משחק לפורמט פנימי...');
    const converted = adapter.convertToInternalFormat(game);
    log('✅ משחק הומר לפורמט פנימי', 'success');
    
    // 3. הצגת פרטי המשחק
    log('', 'info');
    log('📊 פרטי המשחק:', 'info');
    
    const homeTeam = converted.teams[0].name;
    const awayTeam = converted.teams[1].name;
    const homeScore = converted.finalScore.home;
    const awayScore = converted.finalScore.away;
    
    // הצגה בפורמט עברית עם נקודתיים: בית תוצאה_בית : תוצאה_חוץ חוץ
    // (בניגוד לסיכום עם מקף, כאן הנקודתיים מפרידים מספיק אז נשתמש בסדר הרגיל)
    const winner = homeScore > awayScore ? 'ניצחון בית' : 'ניצחון חוץ';
    const gameDisplay = `🏀 ${homeTeam} ${homeScore} : ${awayScore} ${awayTeam} (${winner})`;
    
    log(gameDisplay);
    log(`📅 תאריך: ${new Date(converted.date).toLocaleString('he-IL')}`);
    log(`🏟️ ליגה: ${converted.league}`);
    log(`👥 שחקנים: ${converted.players.length}`);
    
    // 4. הצגת רבעים - בפורמט RTL (תוצאת חוץ לפני תוצאת בית)
    log('', 'info');
    log('📊 רבעים:', 'info');
    log(`רבע 1: ${homeTeam} ${converted.quarters.q1.away}-${converted.quarters.q1.home} ${awayTeam}`);
    log(`רבע 2: ${homeTeam} ${converted.quarters.q2.away}-${converted.quarters.q2.home} ${awayTeam}`);
    log(`רבע 3: ${homeTeam} ${converted.quarters.q3.away}-${converted.quarters.q3.home} ${awayTeam}`);
    log(`רבע 4: ${homeTeam} ${converted.quarters.q4.away}-${converted.quarters.q4.home} ${awayTeam}`);
    
    // 5. הצגת כמה שחקנים לדוגמה
    log('', 'info');
    log('👥 דוגמאות לשחקנים (5 ראשונים):', 'info');
    converted.players.slice(0, 5).forEach((player, index) => {
      const stats = player.stats;
      log(`${index + 1}. שחקן #${player.jersey} (${player.teamName}): ${stats.points} נק', ${stats.totalRebounds} ריב', ${stats.assists} אס'`);
    });
    
    // 6. הצגת סטטיסטיקות קבוצתיות - תמיד בית ראשון
    log('', 'info');
    log('📊 סטטיסטיקות קבוצתיות:', 'info');
    log(`${homeTeam}: ${converted.teamStats.home.points} נק', ${converted.teamStats.home.totalRebounds} ריב', ${converted.teamStats.home.assists} אס'`);
    log(`${awayTeam}: ${converted.teamStats.away.points} נק', ${converted.teamStats.away.totalRebounds} ריב', ${converted.teamStats.away.assists} אס'`);
    
    // 7. JSON מלא
    log('', 'info');
    log('--- JSON מלא של המשחק ---', 'info');
    log(JSON.stringify(converted, null, 2));
    
    log('', 'info');
    log('✅ בדיקת משחק בודד הושלמה בהצלחה!', 'success');
    
  } catch (error) {
    log(`❌ שגיאה בטעינת משחק: ${error.message}`, 'error');
    log(`Stack trace: ${error.stack}`, 'error');
    console.error('Full error:', error);
  }
}

/**
 * ניקוי תוצאות
 */
function clearResults() {
  const output = document.getElementById('output');
  output.innerHTML = '<div style="color: #6b7280;">ממתין לפעולה... לחץ על כפתור לבדיקה.</div>';
  console.clear();
  log('🗑️ תוצאות נוקו', 'info');
}

/**
 * בדיקת חיבור ל-API
 */
async function testConnection() {
  log('=== בודק חיבור ל-API ===', 'info');
  
  try {
    const url = `${adapter.baseURL}/events?leagues=${adapter.leagueId}&per_page=1`;
    log(`🔄 שולח בקשה ל-${url}...`);
    
    const response = await fetch(url);
    
    if (response.ok) {
      log('✅ חיבור ל-API תקין!', 'success');
      log(`Status: ${response.status} ${response.statusText}`, 'success');
    } else {
      log(`⚠️ חיבור נכשל: ${response.status} ${response.statusText}`, 'warning');
    }
  } catch (error) {
    log(`❌ שגיאת חיבור: ${error.message}`, 'error');
  }
}

/**
 * ============================================
 * שלב 2: פונקציות מתקדמות
 * ============================================
 */

// אתחול מודולים נוספים
const dbWrapper = new IBBADbWrapper();
const playerSync = new IBBAPlayerSync();
let gameLoader = null; // יאותחל אחרי טעינת DBWrapper

/**
 * סנכרון שחקנים מדף הליגה
 */
async function testPlayerSync() {
  log('', 'info');
  log('=== מתחיל בדיקת סנכרון שחקנים ===', 'info');
  
  const startTime = Date.now();
  
  try {
    // 1. הרצת סנכרון
    log('🔄 מריץ סנכרון שחקנים...', 'info');
    log('ℹ️ סנכרון באמצעות משחקים אחרונים (לא דף הליגה)', 'info');
    const result = await playerSync.syncPlayers(dbWrapper, adapter);
    
    const elapsed = Date.now() - startTime;
    
    if (!result.success) {
      log(`❌ סנכרון נכשל: ${result.error}`, 'error');
      return;
    }
    
    // 2. הצגת תוצאות
    log(`✅ סנכרון הושלם בהצלחה! (${elapsed}ms)`, 'success');
    log('', 'info');
    log('📊 תוצאות סנכרון:', 'info');
    log(`👥 סה"כ שחקנים בליגה: ${result.totalPlayers}`);
    log(`🆕 שחקנים חדשים: ${result.newPlayers.length}`);
    log(`🔄 העברות זוהו: ${result.transfers.length}`);
    
    // 3. הצגת שחקנים חדשים
    if (result.newPlayers.length > 0) {
      log('', 'info');
      log('🆕 שחקנים חדשים (5 ראשונים):', 'info');
      result.newPlayers.slice(0, 5).forEach((player, i) => {
        log(`${i + 1}. ${player.name} (${player.teamName})`);
      });
    }
    
    // 4. הצגת העברות
    if (result.transfers.length > 0) {
      log('', 'info');
      log('🔄 העברות שזוהו:', 'info');
      result.transfers.forEach((transfer, i) => {
        log(`${i + 1}. ${transfer.playerName}: ${transfer.fromTeamName} → ${transfer.toTeamName}`);
      });
    }
    
    log('', 'info');
    log('✅ בדיקת סנכרון שחקנים הושלמה!', 'success');
    
  } catch (error) {
    const elapsed = Date.now() - startTime;
    log(`❌ שגיאה בסנכרון שחקנים (${elapsed}ms): ${error.message}`, 'error');
    console.error('Player sync error:', error);
  }
}

/**
 * טעינת משחקים חדשים (7 ימים אחרונים)
 */
async function testLoadNewGames() {
  log('', 'info');
  log('=== מתחיל בדיקת טעינת משחקים חדשים ===', 'info');
  
  const startTime = Date.now();
  
  try {
    // אתחול gameLoader אם עוד לא אותחל
    if (!gameLoader) {
      gameLoader = new IBBAGameLoader(adapter, dbWrapper);
    }
    
    // טעינת משחקים מ-7 ימים אחרונים
    log('🔄 טוען משחקים מ-7 ימים אחרונים...', 'info');
    const result = await gameLoader.loadNewGames('auto', 'now', 50);
    
    const elapsed = Date.now() - startTime;
    
    if (!result.success) {
      log(`❌ טעינה נכשלה: ${result.error}`, 'error');
      return;
    }
    
    // הצגת תוצאות
    log(`✅ טעינה הושלמה בהצלחה! (${elapsed}ms)`, 'success');
    log('', 'info');
    log('📊 סיכום טעינה:', 'info');
    log(`📡 סה"כ משחקים מה-API: ${result.total}`);
    log(`📊 משחקים קיימים במסד: ${result.existing}`);
    log(`🆕 משחקים חדשים: ${result.new}`);
    log(`🔮 משחקים עתידיים: ${result.future}`);
    
    // הצגת משחקים חדשים
    if (result.new > 0) {
      log('', 'info');
      log(`🆕 משחקים חדשים שנמצאו (${result.games.length} ראשונים):`, 'info');
      result.games.slice(0, 5).forEach((game, i) => {
        const homeTeam = game.teams[0].name;
        const awayTeam = game.teams[1].name;
        const homeScore = game.finalScore.home;
        const awayScore = game.finalScore.away;
        const date = new Date(game.date).toLocaleDateString('he-IL');
        
        const displayText = `${homeTeam} ${awayScore}-${homeScore} ${awayTeam}`;
        log(`${i + 1}. ${displayText} (${date})`);
      });
    }
    
    // הצגת משחקים שדולגו
    if (result.existing > 0) {
      log('', 'info');
      log(`ℹ️ ${result.existing} משחקים דולגו (כבר קיימים במסד)`, 'info');
    }
    
    log('', 'info');
    log('✅ בדיקת טעינת משחקים הושלמה!', 'success');
    
  } catch (error) {
    const elapsed = Date.now() - startTime;
    log(`❌ שגיאה בטעינת משחקים (${elapsed}ms): ${error.message}`, 'error');
    console.error('Load games error:', error);
  }
}

/**
 * שמירת משחק בודד למסד נתונים
 */
async function testSaveGame() {
  log('', 'info');
  log('=== מתחיל בדיקת שמירת משחק למסד ===', 'info');
  
  const startTime = Date.now();
  const testGameId = 1200241; // משחק לדוגמה
  
  try {
    // אתחול gameLoader אם עוד לא אותחל
    if (!gameLoader) {
      gameLoader = new IBBAGameLoader(adapter, dbWrapper);
    }
    
    log(`🔄 טוען משחק ${testGameId}...`, 'info');
    const result = await gameLoader.loadSingleGame(testGameId, false);
    
    const elapsed = Date.now() - startTime;
    
    if (!result.success) {
      if (result.alreadyExists) {
        log(`ℹ️ משחק ${testGameId} כבר קיים במסד`, 'info');
      } else {
        log(`❌ שמירה נכשלה: ${result.error}`, 'error');
      }
      return;
    }
    
    // הצגת תוצאות
    log(`✅ משחק נשמר בהצלחה! (${elapsed}ms)`, 'success');
    log('', 'info');
    log('📊 פרטי המשחק שנשמר:', 'info');
    
    const game = result.game;
    const homeTeam = game.teams[0].name;
    const awayTeam = game.teams[1].name;
    const homeScore = game.finalScore.home;
    const awayScore = game.finalScore.away;
    
    log(`🏀 ${homeTeam} ${homeScore} : ${awayScore} ${awayTeam}`);
    log(`📅 תאריך: ${new Date(game.date).toLocaleString('he-IL')}`);
    log(`👥 שחקנים: ${game.players.length}`);
    log(`💾 נשמר למסד בהצלחה`);
    
    log('', 'info');
    log('✅ בדיקת שמירת משחק הושלמה!', 'success');
    
  } catch (error) {
    const elapsed = Date.now() - startTime;
    log(`❌ שגיאה בשמירת משחק (${elapsed}ms): ${error.message}`, 'error');
    console.error('Save game error:', error);
  }
}

/**
 * טעינה ושמירה של משחקים חדשים (7 ימים)
 */
async function testLoadAndSaveGames() {
  log('', 'info');
  log('=== מתחיל בדיקת טעינה ושמירה אוטומטית ===', 'info');
  
  const startTime = Date.now();
  
  try {
    // אתחול gameLoader אם עוד לא אותחל
    if (!gameLoader) {
      gameLoader = new IBBAGameLoader(adapter, dbWrapper);
    }
    
    log('🔄 טוען ושומר משחקים חדשים...', 'info');
    log('⏳ זה עלול לקחת זמן...', 'warning');
    
    const result = await gameLoader.loadAndSaveNewGames('auto', 'now', 50);
    
    const elapsed = Date.now() - startTime;
    
    if (!result.success) {
      log(`❌ טעינה ושמירה נכשלו: ${result.error}`, 'error');
      return;
    }
    
    // הצגת תוצאות
    log(`✅ טעינה ושמירה הושלמו! (${elapsed}ms = ${(elapsed/1000).toFixed(1)}s)`, 'success');
    log('', 'info');
    log('📊 סיכום:', 'info');
    log(`📡 סה"כ משחקים מה-API: ${result.total}`);
    log(`📊 משחקים שהיו במסד: ${result.existing}`);
    log(`🆕 משחקים חדשים שנמצאו: ${result.new}`);
    
    if (result.saved !== undefined) {
      log(`💾 משחקים שנשמרו בהצלחה: ${result.saved}`);
      
      if (result.failed > 0) {
        log(`❌ משחקים שנכשלו: ${result.failed}`, 'error');
        
        if (result.errors && result.errors.length > 0) {
          log('', 'error');
          log('שגיאות:', 'error');
          result.errors.slice(0, 3).forEach((err, i) => {
            log(`${i + 1}. ${err.teams}: ${err.error}`, 'error');
          });
        }
      }
    } else {
      log(`ℹ️ לא היו משחקים חדשים לשמירה`, 'info');
    }
    
    log('', 'info');
    log('✅ בדיקת טעינה ושמירה הושלמה!', 'success');
    
  } catch (error) {
    const elapsed = Date.now() - startTime;
    log(`❌ שגיאה בטעינה ושמירה (${elapsed}ms): ${error.message}`, 'error');
    console.error('Load and save error:', error);
  }
}

/**
 * הצגת סטטיסטיקות מסד נתונים
 */
async function testDbStats() {
  log('', 'info');
  log('=== מציג סטטיסטיקות מסד נתונים ===', 'info');
  
  try {
    log('🔄 קורא נתונים ממסד...', 'info');
    const stats = await dbWrapper.getDbStats();
    
    if (stats.error) {
      log(`❌ שגיאה בקריאת סטטיסטיקות: ${stats.error}`, 'error');
      return;
    }
    
    log('✅ סטטיסטיקות התקבלו!', 'success');
    log('', 'info');
    log('📊 סטטיסטיקות מסד נתונים:', 'info');
    log(`🎮 משחקים: ${stats.games}`);
    log(`👥 שחקנים: ${stats.players}`);
    log(`🏀 קבוצות: ${stats.teams}`);
    log(`🔄 העברות: ${stats.transfers}`);
    log(`🕒 עדכון אחרון: ${new Date(stats.lastUpdate).toLocaleString('he-IL')}`);
    
    log('', 'info');
    log('✅ הצגת סטטיסטיקות הושלמה!', 'success');
    
  } catch (error) {
    log(`❌ שגיאה בהצגת סטטיסטיקות: ${error.message}`, 'error');
    console.error('DB stats error:', error);
  }
}

// Log that UI is ready
console.log('✅ IBBA Test UI loaded successfully (with Phase 2 features)');
log('🎨 מערכת בדיקות IBBA מוכנה! (כולל תכונות שלב 2)', 'success');
log('לחץ על כפתור לבדיקת המודול.', 'info');

