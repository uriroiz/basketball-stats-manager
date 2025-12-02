/**
 * IBBA Insights V2 - מערכת Insights מתקדמת לשדרני כדורסל
 * Version: 2.2.9 - Bench & Lineup Analysis (Template Fixes)
 * 
 * קטגוריות:
 * 1. STREAKS - רצפים ופטרנים
 * 2. PLAYERS - ניתוח שחקנים
 * 3. OFFENSE - התקפה (+ Fast Break, Paint, Bench, Second Chance)
 * 4. DEFENSE - הגנה (+ Turnover Capitalization)
 * 5. MOMENTUM - מומנטום ופורמה
 * 6. H2H - מפגשים ישירים מתקדמים
 * 7. QUARTERS - ניתוח רבעים
 * 8. LEAGUE - יחסי לליגה
 * 
 * הערות:
 * - שמות שחקנים: בגלל Pure API, אין גישה ישירה לשמות שחקנים.
 *   כרגע מוצגים מספרי חולצות (#7, #12 וכו').
 *   אפשר לשלב עם ibba_player_sync.js או playerNamesLoader לעתיד.
 * - כל החישובים מבוססים על נתונים אמיתיים בלבד - אין הערכות!
 * - סף מינימלי: רוב ה-Insights דורשים לפחות 3-5 משחקים למניעת False Positives
 * 
 * גרסה 2.2.0 (חדש):
 * - מערכת טמפלטים דינמית עם 8 וריאציות לכל Insight
 * - למנוע חזרתיות והפיכת המערכת לטבעית יותר
 * 
 * גרסה 2.1.0 (נוסף):
 * - Fast Break Kings: 15+ נק' למשחק מהתקפות מתפרצות
 * - Paint Dominance: 45%+ מהנקודות מהצבע
 * - Bench Power: 30+ נק' למשחק מהספסל
 * - Turnover Capitalization: 18+ נק' למשחק מאיבודים
 * - Second Chance Masters: 15+ נק' למשחק מהזדמנות שנייה
 * 
 * Requires: ibba_insights_templates.js
 */

class IBBAInsightsV2 {
  constructor(analytics) {
    this.analytics = analytics;
    this.playerNamesMap = null; // אופציונלי - אם יש מיפוי שמות שחקנים
  }

  /**
   * הגדרת מיפוי שמות שחקנים (אופציונלי)
   * @param {Map} namesMap - Map של playerId -> playerName
   */
  setPlayerNames(namesMap) {
    this.playerNamesMap = namesMap;
  }

  /**
   * קבלת שם שחקן (עם fallback למספר חולצה)
   */
  getPlayerDisplayName(playerId, jersey, teamName = null) {
    let name = `שחקן #${jersey}`;
    
    if (this.playerNamesMap && this.playerNamesMap.has(playerId)) {
      const playerData = this.playerNamesMap.get(playerId);
      // playerData is an object: { name, jersey, teamId }
      // Extract just the name property
      name = playerData.name || `שחקן #${jersey}`;
    }
    
    // Add team name if provided
    if (teamName) {
      return `${name} (${teamName})`;
    }
    
    return name;
  }

  /**
   * הוספת מיקום בליגה לטקסט
   */
  addRankToText(teamName, rank) {
    if (rank && rank > 0) {
      return `${teamName} (מקום ${rank})`;
    }
    return teamName;
  }

  // ========== UTILITY FUNCTIONS ==========

  /**
   * חישוב סטיית תקן
   * @param {number[]} values - מערך ערכים
   * @returns {number} סטיית תקן
   */
  calculateStdDev(values) {
    if (!values || values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    
    return Math.sqrt(variance);
  }

  /**
   * חישוב ממוצע ליגתי לקטגוריה ספציפית
   * @param {string} metric - שם המטריקה (ppg, rpg, apg, etc.)
   * @param {Array} allTeamsData - נתוני כל הקבוצות
   * @returns {number} ממוצע ליגתי
   */
  getLeagueAverage(metric, allTeamsData) {
    if (!allTeamsData || allTeamsData.length === 0) return 0;
    
    const values = allTeamsData.map(team => parseFloat(team[metric]) || 0);
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * מציאת דירוג קבוצה בקטגוריה ספציפית
   * @param {string} teamName 
   * @param {string} metric 
   * @param {Array} allTeamsData 
   * @param {boolean} ascending - true אם נמוך יותר = טוב יותר (כמו oppPpg)
   * @returns {number} דירוג (1 = הכי טוב)
   */
  getTeamRankInCategory(teamName, metric, allTeamsData, ascending = false) {
    const sorted = [...allTeamsData].sort((a, b) => {
      const aVal = parseFloat(a[metric]) || 0;
      const bVal = parseFloat(b[metric]) || 0;
      return ascending ? aVal - bVal : bVal - aVal;
    });
    
    return sorted.findIndex(team => team.teamName === teamName) + 1;
  }

  /**
   * פונקציית עזר - קבלת נתוני קבוצה ממשחק
   */
  getTeamFromGame(game, teamName) {
    return game.teams?.find(t => t.name === teamName);
  }

  /**
   * פונקציית עזר - קבלת נתוני יריב ממשחק
   */
  getOpponentFromGame(game, teamName) {
    return game.teams?.find(t => t.name !== teamName);
  }

  /**
   * פונקציית עזר - סינון משחקים של קבוצה
   */
  getTeamGames(games, teamName) {
    return games.filter(g => 
      g.teams?.some(t => t.name === teamName)
    ).sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  // ========== CATEGORY 1: STREAKS ==========

  /**
   * זיהוי רצף ניצחונות צמודים (Clutch Streak)
   * רצף של ניצחונות בהפרש של עד 5 נקודות
   */
  detectClutchStreak(teamName, games, rank = null) {
    const teamGames = this.getTeamGames(games, teamName);
    
    let clutchWins = 0;
    for (const game of teamGames) {
      const teamData = this.getTeamFromGame(game, teamName);
      const oppData = this.getOpponentFromGame(game, teamName);
      
      if (!teamData || !oppData) continue;
      
      const margin = teamData.score - oppData.score;
      
      // ניצחון צמוד = ניצחון בהפרש 1-5
      if (margin > 0 && margin <= 5) {
        clutchWins++;
      } else {
        break; // הרצף נשבר
      }
    }
    
    if (clutchWins >= 2) {
      const teamWithRank = this.addRankToText(teamName, rank);
      
      // שימוש בטמפלט דינמי
      const text = window.IBBAInsightTemplates?.getRandomText('streaks', 'CLUTCH_WINS', {
        teamName: teamWithRank,
        clutchWins
      }) || `${teamWithRank} ברצף של ${clutchWins} ניצחונות צמודים (הפרש עד 5 נק') – מגיעה עם יכולת לנצח במשחקים קרובים`;
      
      return {
        type: 'CLUTCH_STREAK',
        category: 'STREAKS',
        importance: clutchWins >= 4 ? 'high' : 'medium',
        teamName,
        value: clutchWins,
        icon: '💪',
        text,
        textShort: `${clutchWins} ניצחונות צמודים ברצף`
      };
    }
    return null;
  }

  /**
   * זיהוי רצף ניצחונות (Winning Streak)
   */
  detectWinningStreak(teamName, games, rank = null) {
    const teamGames = this.getTeamGames(games, teamName);
    
    let wins = 0;
    for (const game of teamGames) {
      const teamData = this.getTeamFromGame(game, teamName);
      const oppData = this.getOpponentFromGame(game, teamName);
      
      if (!teamData || !oppData) continue;
      
      if (teamData.score > oppData.score) {
        wins++;
      } else {
        break;
      }
    }
    
    if (wins >= 3) {
      const teamWithRank = this.addRankToText(teamName, rank);
      
      // שימוש בטמפלט דינמי
      const text = window.IBBAInsightTemplates?.getRandomText('streaks', 'WINNING_STREAK', {
        teamName: teamWithRank,
        wins
      }) || `${teamWithRank} מגיעה אחרי ${wins} ניצחונות רצופים, עם הרבה ביטחון לקראת המשחק`;
      
      return {
        type: 'WINNING_STREAK',
        category: 'STREAKS',
        importance: wins >= 5 ? 'high' : 'medium',
        teamName,
        value: wins,
        icon: '🔥',
        text,
        textShort: `${wins} ניצחונות ברצף`
      };
    }
    return null;
  }

  /**
   * זיהוי רצף הפסדים (Losing Streak)
   */
  detectLosingStreak(teamName, games, rank = null) {
    const teamGames = this.getTeamGames(games, teamName);
    
    let losses = 0;
    for (const game of teamGames) {
      const teamData = this.getTeamFromGame(game, teamName);
      const oppData = this.getOpponentFromGame(game, teamName);
      
      if (!teamData || !oppData) continue;
      
      if (teamData.score < oppData.score) {
        losses++;
      } else {
        break;
      }
    }
    
    if (losses >= 3) {
      const teamWithRank = this.addRankToText(teamName, rank);
      
      // שימוש בטמפלט דינמי
      const text = window.IBBAInsightTemplates?.getRandomText('streaks', 'LOSING_STREAK', {
        teamName: teamWithRank,
        losses
      }) || `${teamWithRank} ברצף של ${losses} הפסדים – מגיעה עם נקודת שאלה לקראת המשחק`;
      
      return {
        type: 'LOSING_STREAK',
        category: 'STREAKS',
        importance: 'high',
        teamName,
        value: losses,
        icon: '📉',
        text,
        textShort: `${losses} הפסדים ברצף`
      };
    }
    return null;
  }

  /**
   * זיהוי ניצחונות בהפרש גדול (Blowout Wins)
   */
  detectBlowoutWins(teamName, games, rank = null) {
    const MIN_BLOWOUTS = 2;
    const MARGIN_THRESHOLD = 15;
    
    const teamGames = this.getTeamGames(games, teamName).slice(0, 5); // 5 אחרונים
    
    let blowouts = 0;
    teamGames.forEach(game => {
      const teamData = this.getTeamFromGame(game, teamName);
      const oppData = this.getOpponentFromGame(game, teamName);
      
      if (!teamData || !oppData) return;
      
      const margin = teamData.score - oppData.score;
      if (margin >= MARGIN_THRESHOLD) {
        blowouts++;
      }
    });
    
    if (blowouts >= MIN_BLOWOUTS) {
      const teamWithRank = this.addRankToText(teamName, rank);
      
      // שימוש בטמפלט דינמי
      const text = window.IBBAInsightTemplates?.getRandomText('streaks', 'BLOWOUT_WINS', {
        teamName: teamWithRank,
        blowouts
      }) || `${teamWithRank} עם ${blowouts} ניצחונות גדולים (15+ נק') ב-5 משחקים אחרונים – מגיעה עם דומיננטיות בולטת`;
      
      return {
        type: 'BLOWOUT_WINS',
        category: 'STREAKS',
        importance: 'medium',
        teamName,
        value: blowouts,
        icon: '💥',
        text,
        textShort: `${blowouts} ניצחונות גדולים ב-5 אחרונים`
      };
    }
    return null;
  }

  /**
   * זיהוי תבוסות צמודות (Close Losses) - רק אם אין רצף הפסדים
   * למנוע duplicates
   */
  detectCloseLosses(teamName, games) {
    const MIN_CLOSE_LOSSES = 3;
    const MARGIN_THRESHOLD = 5;
    
    const teamGames = this.getTeamGames(games, teamName);
    
    // בדוק אם יש רצף הפסדים - אם כן, דלג על זה
    let consecutiveLosses = 0;
    for (const game of teamGames) {
      const teamData = this.getTeamFromGame(game, teamName);
      const oppData = this.getOpponentFromGame(game, teamName);
      if (!teamData || !oppData) continue;
      
      if (teamData.score < oppData.score) {
        consecutiveLosses++;
      } else {
        break;
      }
    }
    
    // אם יש רצף של 3+ הפסדים, אל תציג "הפסדים צמודים"
    if (consecutiveLosses >= 3) return null;
    
    let closeLosses = 0;
    teamGames.forEach(game => {
      const teamData = this.getTeamFromGame(game, teamName);
      const oppData = this.getOpponentFromGame(game, teamName);
      
      if (!teamData || !oppData) return;
      
      const margin = oppData.score - teamData.score;
      if (margin > 0 && margin <= MARGIN_THRESHOLD) {
        closeLosses++;
      }
    });
    
    if (closeLosses >= MIN_CLOSE_LOSSES) {
      return {
        type: 'CLOSE_LOSSES',
        category: 'STREAKS',
        importance: 'medium',
        teamName,
        value: closeLosses,
        icon: '😤',
        text: `${teamName} עם ${closeLosses} הפסדים צמודים בעונה - קרובה לפריצה! רק צריכה מזל קטן`,
        textShort: `${closeLosses} הפסדים צמודים בעונה`
      };
    }
    return null;
  }

  // ========== CATEGORY 2: PLAYERS ==========

  /**
   * זיהוי שחקן "בוער" (Hot Hand)
   * שחקן שקולע מעל 150% מהממוצע שלו ב-3 משחקים אחרונים
   * + בדיקה אם השיפור נובע מדקות נוספות
   */
  detectHotHand(teamName, games) {
    const MIN_GAMES = 5; // מינימום משחקים לחישוב ממוצע עונתי
    const RECENT_WINDOW = 3;
    const THRESHOLD = 1.5; // 150%
    const MIN_MINUTES_INCREASE = 1.25; // אם שחקן שיחק יותר מ-125% מהדקות הרגילות
    
    // אסוף נתוני שחקנים
    const playerGames = {};
    
    games.forEach(game => {
      const teamData = this.getTeamFromGame(game, teamName);
      if (!teamData) return;
      
      game.players?.forEach(player => {
        if (player.teamName !== teamName) return;
        
        const playerId = player.playerId;
        if (!playerGames[playerId]) {
          playerGames[playerId] = {
            playerId,
            jersey: player.jersey,
            games: []
          };
        }
        
        playerGames[playerId].games.push({
          date: game.date,
          points: player.stats?.points || 0,
          minutes: player.stats?.minutes || 0
        });
      });
    });
    
    // חפש שחקן בוער
    for (const [playerId, data] of Object.entries(playerGames)) {
      if (data.games.length < MIN_GAMES) continue;
      
      // מיון לפי תאריך
      data.games.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      // חישוב נקודות
      const seasonAvg = data.games.reduce((sum, g) => sum + g.points, 0) / data.games.length;
      const recentGames = data.games.slice(0, RECENT_WINDOW);
      const recentAvg = recentGames.reduce((sum, g) => sum + g.points, 0) / recentGames.length;
      
      // חישוב דקות
      const seasonMinutesAvg = data.games.reduce((sum, g) => sum + g.minutes, 0) / data.games.length;
      const recentMinutesAvg = recentGames.reduce((sum, g) => sum + g.minutes, 0) / recentGames.length;
      
      // בדיקת סף
      if (recentAvg >= seasonAvg * THRESHOLD && seasonAvg >= 8) { // מינימום 8 נק' בממוצע
        const percentAbove = ((recentAvg / seasonAvg - 1) * 100).toFixed(0);
        const playerName = this.getPlayerDisplayName(playerId, data.jersey, teamName);
        
        // בדיקה: האם השיפור נובע מעלייה בדקות?
        let minutesNote = '';
        if (seasonMinutesAvg > 5) { // רק אם יש לנו נתוני דקות משמעותיים
          const minutesRatio = recentMinutesAvg / seasonMinutesAvg;
          
          if (minutesRatio > MIN_MINUTES_INCREASE) {
            // הדקות עלו משמעותית - השיפור מוסבר חלקית
            const minutesPercentIncrease = ((minutesRatio - 1) * 100).toFixed(0);
            minutesNote = ` (עם ${recentMinutesAvg.toFixed(1)} דק' למשחק לעומת ${seasonMinutesAvg.toFixed(1)} בממוצע העונה)`;
          } else if (minutesRatio <= 1.1) {
            // הדקות דומות - השיפור מרשים יותר
            minutesNote = ` (עם ${recentMinutesAvg.toFixed(1)} דק' למשחק כרגיל!)`;
          }
        }
        
        return {
          type: 'HOT_HAND',
          category: 'PLAYERS',
          importance: 'high',
          playerId,
          playerJersey: data.jersey,
          playerName,
          teamName,
          seasonAvg: seasonAvg.toFixed(1),
          recentAvg: recentAvg.toFixed(1),
          percentAbove,
          seasonMinutesAvg: seasonMinutesAvg.toFixed(1),
          recentMinutesAvg: recentMinutesAvg.toFixed(1),
          icon: '🔥',
          text: `${playerName} בוער! ${recentAvg.toFixed(1)} נק' ב-3 משחקים אחרונים (לעומת ${seasonAvg.toFixed(1)} עונתי) - +${percentAbove}%${minutesNote}`,
          textShort: `${playerName} בוער (${recentAvg.toFixed(1)} vs ${seasonAvg.toFixed(1)})`
        };
      }
    }
    
    return null;
  }

  /**
   * זיהוי שחקן "קר" (Cold Spell)
   * שחקן שקולע מתחת ל-60% מהממוצע שלו ב-3 משחקים אחרונים
   * + בדיקה אם הירידה נובעת מדקות פחותות
   */
  detectColdSpell(teamName, games) {
    const MIN_GAMES = 5;
    const RECENT_WINDOW = 3;
    const THRESHOLD = 0.6; // 60%
    const MIN_MINUTES_DROP = 0.75; // אם שחקן שיחק פחות מ-75% מהדקות הרגילות
    
    const playerGames = {};
    
    games.forEach(game => {
      const teamData = this.getTeamFromGame(game, teamName);
      if (!teamData) return;
      
      game.players?.forEach(player => {
        if (player.teamName !== teamName) return;
        
        const playerId = player.playerId;
        if (!playerGames[playerId]) {
          playerGames[playerId] = {
            playerId,
            jersey: player.jersey,
            games: []
          };
        }
        
        playerGames[playerId].games.push({
          date: game.date,
          points: player.stats?.points || 0,
          minutes: player.stats?.minutes || 0
        });
      });
    });
    
    for (const [playerId, data] of Object.entries(playerGames)) {
      if (data.games.length < MIN_GAMES) continue;
      
      data.games.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      // חישוב נקודות
      const seasonAvg = data.games.reduce((sum, g) => sum + g.points, 0) / data.games.length;
      const recentGames = data.games.slice(0, RECENT_WINDOW);
      const recentAvg = recentGames.reduce((sum, g) => sum + g.points, 0) / recentGames.length;
      
      // חישוב דקות
      const seasonMinutesAvg = data.games.reduce((sum, g) => sum + g.minutes, 0) / data.games.length;
      const recentMinutesAvg = recentGames.reduce((sum, g) => sum + g.minutes, 0) / recentGames.length;
      
      if (recentAvg <= seasonAvg * THRESHOLD && seasonAvg >= 10) {
        const percentBelow = ((1 - recentAvg / seasonAvg) * 100).toFixed(0);
        const playerName = this.getPlayerDisplayName(playerId, data.jersey, teamName);
        
        // בדיקה: האם הירידה בנקודות נובעת מירידה בדקות?
        let minutesNote = '';
        if (seasonMinutesAvg > 5) { // רק אם יש לנו נתוני דקות משמעותיים
          const minutesRatio = recentMinutesAvg / seasonMinutesAvg;
          
          if (minutesRatio < MIN_MINUTES_DROP) {
            // הדקות ירדו משמעותית - הירידה מוסברת
            const minutesPercentDrop = ((1 - minutesRatio) * 100).toFixed(0);
            minutesNote = ` (שיחק רק ${recentMinutesAvg.toFixed(1)} דק' למשחק לעומת ${seasonMinutesAvg.toFixed(1)} בממוצע העונה)`;
          } else if (minutesRatio >= 0.9) {
            // הדקות דומות - הירידה מדאיגה יותר
            minutesNote = ` (למרות ${recentMinutesAvg.toFixed(1)} דק' למשחק כרגיל)`;
          }
        }
        
        return {
          type: 'COLD_SPELL',
          category: 'PLAYERS',
          importance: 'medium',
          playerId,
          playerJersey: data.jersey,
          playerName,
          teamName,
          seasonAvg: seasonAvg.toFixed(1),
          recentAvg: recentAvg.toFixed(1),
          percentBelow,
          seasonMinutesAvg: seasonMinutesAvg.toFixed(1),
          recentMinutesAvg: recentMinutesAvg.toFixed(1),
          icon: '❄️',
          text: `${playerName} במשבר - רק ${recentAvg.toFixed(1)} נק' ב-3 משחקים אחרונים (לעומת ${seasonAvg.toFixed(1)} עונתי) - ירידה של ${percentBelow}%${minutesNote}`,
          textShort: `${playerName} במשבר (${recentAvg.toFixed(1)} vs ${seasonAvg.toFixed(1)})`
        };
      }
    }
    
    return null;
  }

  /**
   * זיהוי שחקן "רוצח" של קבוצה ספציפית (Killer vs Team)
   */
  detectKillerVsTeam(teamName, opponentName, games) {
    const MIN_H2H_GAMES = 3;
    const THRESHOLD = 1.3; // 130%
    
    const playerGames = {};
    const playerH2HGames = {};
    
    games.forEach(game => {
      const teamData = this.getTeamFromGame(game, teamName);
      if (!teamData) return;
      
      const oppData = this.getOpponentFromGame(game, teamName);
      const isH2H = oppData?.name === opponentName;
      
      game.players?.forEach(player => {
        if (player.teamName !== teamName) return;
        
        const playerId = player.playerId;
        const points = player.stats?.points || 0;
        
        if (!playerGames[playerId]) {
          playerGames[playerId] = { playerId, jersey: player.jersey, games: [], totalPoints: 0 };
        }
        if (!playerH2HGames[playerId]) {
          playerH2HGames[playerId] = { games: 0, totalPoints: 0 };
        }
        
        playerGames[playerId].games.push(points);
        playerGames[playerId].totalPoints += points;
        
        if (isH2H) {
          playerH2HGames[playerId].games++;
          playerH2HGames[playerId].totalPoints += points;
        }
      });
    });
    
    // חפש רוצח
    for (const [playerId, data] of Object.entries(playerGames)) {
      const h2hData = playerH2HGames[playerId];
      if (!h2hData || h2hData.games < MIN_H2H_GAMES) continue;
      
      const seasonAvg = data.totalPoints / data.games.length;
      const h2hAvg = h2hData.totalPoints / h2hData.games;
      
      if (h2hAvg >= seasonAvg * THRESHOLD && seasonAvg >= 8) {
        const percentAbove = ((h2hAvg / seasonAvg - 1) * 100).toFixed(0);
        const playerName = this.getPlayerDisplayName(playerId, data.jersey, teamName);
        
        return {
          type: 'KILLER_VS_TEAM',
          category: 'PLAYERS',
          importance: 'high',
          playerId,
          playerJersey: data.jersey,
          playerName,
          teamName,
          opponentName,
          seasonAvg: seasonAvg.toFixed(1),
          h2hAvg: h2hAvg.toFixed(1),
          h2hGames: h2hData.games,
          percentAbove,
          icon: '🎯',
          text: `${playerName} = הרוצח של ${opponentName}! ממוצע של ${h2hAvg.toFixed(1)} נק' במפגשים (לעומת ${seasonAvg.toFixed(1)} עונתי) - +${percentAbove}%`,
          textShort: `${playerName} רוצח של ${opponentName}`
        };
      }
    }
    
    return null;
  }

  /**
   * זיהוי שחקן עם הרבה אסיסטים (Assist Machine)
   */
  detectAssistMachine(teamName, games) {
    const MIN_GAMES = 5;
    const MIN_APG = 5; // 5 אסיסטים למשחק
    
    const playerStats = {};
    
    games.forEach(game => {
      const teamData = this.getTeamFromGame(game, teamName);
      if (!teamData) return;
      
      game.players?.forEach(player => {
        if (player.teamName !== teamName) return;
        
        const playerId = player.playerId;
        if (!playerStats[playerId]) {
          playerStats[playerId] = {
            playerId,
            jersey: player.jersey,
            games: 0,
            totalAssists: 0
          };
        }
        
        playerStats[playerId].games++;
        playerStats[playerId].totalAssists += player.stats?.assists || 0;
      });
    });
    
    for (const [playerId, data] of Object.entries(playerStats)) {
      if (data.games < MIN_GAMES) continue;
      
      const apg = data.totalAssists / data.games;
      
      if (apg >= MIN_APG) {
        const playerName = this.getPlayerDisplayName(playerId, data.jersey, teamName);
        
        // שימוש בטמפלט דינמי
        const text = window.IBBAInsightTemplates?.getRandomText('player', 'ASSIST_MACHINE', {
          playerName,
          apg: apg.toFixed(1)
        }) || `${playerName} מגיע כמפיץ בולט – ${apg.toFixed(1)} אסיסטים למשחק בעונה`;
        
        return {
          type: 'ASSIST_MACHINE',
          category: 'PLAYERS',
          importance: 'medium',
          playerId,
          playerJersey: data.jersey,
          playerName,
          teamName,
          apg: apg.toFixed(1),
          totalAssists: data.totalAssists,
          games: data.games,
          icon: '🎯',
          text,
          textShort: `${playerName}: ${apg.toFixed(1)} אסיסטים למשחק`
        };
      }
    }
    
    return null;
  }

  /**
   * זיהוי שחקן עם הרבה ריבאונדים (Rebound Machine)
   */
  detectReboundMachine(teamName, games) {
    const MIN_GAMES = 5;
    const MIN_RPG = 8; // 8 ריבאונדים למשחק
    
    const playerStats = {};
    
    games.forEach(game => {
      const teamData = this.getTeamFromGame(game, teamName);
      if (!teamData) return;
      
      game.players?.forEach(player => {
        if (player.teamName !== teamName) return;
        
        const playerId = player.playerId;
        if (!playerStats[playerId]) {
          playerStats[playerId] = {
            playerId,
            jersey: player.jersey,
            games: 0,
            totalRebounds: 0
          };
        }
        
        playerStats[playerId].games++;
        playerStats[playerId].totalRebounds += player.stats?.totalRebounds || 0;
      });
    });
    
    for (const [playerId, data] of Object.entries(playerStats)) {
      if (data.games < MIN_GAMES) continue;
      
      const rpg = data.totalRebounds / data.games;
      
      if (rpg >= MIN_RPG) {
        const playerName = this.getPlayerDisplayName(playerId, data.jersey, teamName);
        
        // שימוש בטמפלט דינמי
        const text = window.IBBAInsightTemplates?.getRandomText('player', 'REBOUND_MACHINE', {
          playerName,
          rpg: rpg.toFixed(1)
        }) || `${playerName} מגיע כאחד הריבאונדרים הבולטים – ${rpg.toFixed(1)} כדורים חוזרים למשחק בעונה`;
        
        return {
          type: 'REBOUND_MACHINE',
          category: 'PLAYERS',
          importance: 'medium',
          playerId,
          playerJersey: data.jersey,
          playerName,
          teamName,
          rpg: rpg.toFixed(1),
          totalRebounds: data.totalRebounds,
          games: data.games,
          icon: '🏀',
          text,
          textShort: `${playerName}: ${rpg.toFixed(1)} ריבאונדים למשחק`
        };
      }
    }
    
    return null;
  }

  /**
   * זיהוי שחקן מוביל בקבוצה (Team Leader)
   */
  detectTeamLeader(teamName, games, teamData) {
    const MIN_GAMES = 5;
    
    const playerStats = {};
    
    games.forEach(game => {
      const teamInGame = this.getTeamFromGame(game, teamName);
      if (!teamInGame) return;
      
      game.players?.forEach(player => {
        if (player.teamName !== teamName) return;
        
        const playerId = player.playerId;
        if (!playerStats[playerId]) {
          playerStats[playerId] = {
            playerId,
            jersey: player.jersey,
            games: 0,
            totalPoints: 0
          };
        }
        
        playerStats[playerId].games++;
        playerStats[playerId].totalPoints += player.stats?.points || 0;
      });
    });
    
    // מצא את המוביל
    let leader = null;
    let maxPpg = 0;
    
    for (const [playerId, data] of Object.entries(playerStats)) {
      if (data.games < MIN_GAMES) continue;
      
      const ppg = data.totalPoints / data.games;
      if (ppg > maxPpg) {
        maxPpg = ppg;
        leader = data;
      }
    }
    
    if (leader && maxPpg >= 15) {
      const playerName = this.getPlayerDisplayName(leader.playerId, leader.jersey, teamName);
      
      // חשב אחוז מנקודות הקבוצה
      const teamPpg = teamData ? parseFloat(teamData.ppg) : 0;
      const playerPct = teamPpg > 0 ? (maxPpg / teamPpg * 100).toFixed(1) : 0;
      const pctText = playerPct > 0 ? ` (${playerPct}% מנקודות הקבוצה)` : '';
      
      // שימוש בטמפלט דינמי
      const text = window.IBBAInsightTemplates?.getRandomText('player', 'TEAM_LEADER', {
        playerName,
        teamName,
        ppg: maxPpg.toFixed(1),
        pctText
      }) || `${playerName} מוביל את ${teamName} עם ${maxPpg.toFixed(1)} נק' למשחק${pctText} – הכתובת הראשונה בהתקפה`;
      
      return {
        type: 'TEAM_LEADER',
        category: 'PLAYERS',
        importance: 'high',
        playerId: leader.playerId,
        playerJersey: leader.jersey,
        playerName,
        teamName,
        ppg: maxPpg.toFixed(1),
        totalPoints: leader.totalPoints,
        games: leader.games,
        icon: '👑',
        text,
        textShort: `${playerName}: מוביל עם ${maxPpg.toFixed(1)} נק'`
      };
    }
    
    return null;
  }

  /**
   * זיהוי מכונת דאבל-דאבל
   */
  detectDoubleDoubleMachine(teamName, games) {
    const MIN_GAMES = 5;
    const THRESHOLD = 0.5; // 50%
    
    const playerStats = {};
    
    games.forEach(game => {
      const teamData = this.getTeamFromGame(game, teamName);
      if (!teamData) return;
      
      game.players?.forEach(player => {
        if (player.teamName !== teamName) return;
        
        const playerId = player.playerId;
        if (!playerStats[playerId]) {
          playerStats[playerId] = {
            playerId,
            jersey: player.jersey,
            games: 0,
            doubleDoubles: 0
          };
        }
        
        const stats = player.stats;
        const points = stats?.points || 0;
        const rebounds = stats?.totalRebounds || 0;
        const assists = stats?.assists || 0;
        
        // ספור קטגוריות עם 10+
        const categories = [points, rebounds, assists].filter(val => val >= 10).length;
        
        if (categories >= 2) {
          playerStats[playerId].doubleDoubles++;
        }
        playerStats[playerId].games++;
      });
    });
    
    for (const [playerId, data] of Object.entries(playerStats)) {
      if (data.games < MIN_GAMES) continue;
      
      const ddPct = data.doubleDoubles / data.games;
      
      if (ddPct >= THRESHOLD) {
        const playerName = this.getPlayerDisplayName(playerId, data.jersey, teamName);
        
        // שימוש בטמפלט דינמי
        const text = window.IBBAInsightTemplates?.getRandomText('player', 'DOUBLE_DOUBLE_MACHINE', {
          playerName,
          doubleDoubles: data.doubleDoubles,
          games: data.games
        }) || `${playerName} מגיע עם עקביות חריגה: ${data.doubleDoubles} דאבל-דאבלים ב-${data.games} משחקים בעונה`;
        
        return {
          type: 'DOUBLE_DOUBLE_MACHINE',
          category: 'PLAYERS',
          importance: 'medium',
          playerId,
          playerJersey: data.jersey,
          playerName,
          teamName,
          doubleDoubles: data.doubleDoubles,
          games: data.games,
          percentage: (ddPct * 100).toFixed(0),
          icon: '💪',
          text,
          textShort: `${playerName}: ${data.doubleDoubles}/${data.games} דאבל-דאבל`
        };
      }
    }
    
    return null;
  }

  /**
   * זיהוי Mr. Consistent - שחקן עקבי מאוד
   */
  detectMrConsistent(teamName, games) {
    const MIN_GAMES = 7;
    const MAX_CV = 25; // Coefficient of Variation מקסימלי
    const MIN_AVG = 10; // נקודות מינימום בממוצע
    
    const teamGames = this.getTeamGames(games, teamName).slice(-10);
    const playerPoints = {};
    
    teamGames.forEach(game => {
      game.players?.forEach(player => {
        if (player.teamName !== teamName) return;
        
        const pid = player.playerId;
        if (!playerPoints[pid]) {
          playerPoints[pid] = { playerId: pid, jersey: player.jersey, points: [] };
        }
        playerPoints[pid].points.push(player.stats?.points || 0);
      });
    });
    
    // מצא שחקן עקבי (סטיית תקן נמוכה + ממוצע גבוה)
    let mostConsistent = null;
    let lowestCV = 999; // Coefficient of Variation
    
    Object.values(playerPoints).forEach(p => {
      if (p.points.length < MIN_GAMES) return;
      
      const mean = p.points.reduce((a, b) => a + b, 0) / p.points.length;
      if (mean < MIN_AVG) return;
      
      const stdDev = this.calculateStdDev(p.points);
      const cv = (stdDev / mean) * 100; // Coefficient of Variation (%)
      
      if (cv < lowestCV && cv < MAX_CV) {
        lowestCV = cv;
        mostConsistent = { ...p, mean, stdDev, cv };
      }
    });
    
    if (mostConsistent) {
      const playerName = this.getPlayerDisplayName(mostConsistent.playerId, mostConsistent.jersey, teamName);
      return {
        type: 'MR_CONSISTENT',
        category: 'PLAYERS',
        importance: 'medium',
        teamName,
        playerName,
        icon: '📊',
        text: `${playerName} = עקביות מוחלטת! ${mostConsistent.mean.toFixed(1)} נק' בממוצע עם סטיית תקן ${mostConsistent.stdDev.toFixed(1)} בלבד`,
        textShort: `${playerName}: עקביות גבוהה`
      };
    }
    return null;
  }

  /**
   * זיהוי Boom or Bust - שחקן לא עקבי
   */
  detectBoomOrBust(teamName, games) {
    const MIN_GAMES = 7;
    const MIN_CV = 40; // Coefficient of Variation מינימלי
    const MIN_AVG = 10;
    
    const teamGames = this.getTeamGames(games, teamName).slice(-10);
    const playerPoints = {};
    
    teamGames.forEach(game => {
      game.players?.forEach(player => {
        if (player.teamName !== teamName) return;
        
        const pid = player.playerId;
        if (!playerPoints[pid]) {
          playerPoints[pid] = { playerId: pid, jersey: player.jersey, points: [] };
        }
        playerPoints[pid].points.push(player.stats?.points || 0);
      });
    });
    
    let mostVolatile = null;
    let highestCV = 0;
    
    Object.values(playerPoints).forEach(p => {
      if (p.points.length < MIN_GAMES) return;
      
      const mean = p.points.reduce((a, b) => a + b, 0) / p.points.length;
      if (mean < MIN_AVG) return;
      
      const stdDev = this.calculateStdDev(p.points);
      const cv = (stdDev / mean) * 100;
      
      if (cv > highestCV && cv > MIN_CV) {
        highestCV = cv;
        mostVolatile = { ...p, mean, stdDev, cv };
      }
    });
    
    if (mostVolatile) {
      const playerName = this.getPlayerDisplayName(mostVolatile.playerId, mostVolatile.jersey, teamName);
      return {
        type: 'BOOM_OR_BUST',
        category: 'PLAYERS',
        importance: 'medium',
        teamName,
        playerName,
        icon: '🎢',
        text: `${playerName} = לא צפוי! ${mostVolatile.mean.toFixed(1)} נק' בממוצע אבל סטיית תקן ${mostVolatile.stdDev.toFixed(1)} - גבוה או נמוך`,
        textShort: `${playerName}: לא עקבי`
      };
    }
    return null;
  }

  /**
   * זיהוי Home Court Hero - שחקן עם פער גדול בין בית לחוץ
   */
  detectHomeCourtHero(teamName, games) {
    const MIN_GAMES_EACH = 3;
    const MIN_DIFF = 5; // הפרש מינימלי
    const MIN_HOME_PPG = 12;
    
    const playerStats = {};
    
    games.forEach(game => {
      const team = this.getTeamFromGame(game, teamName);
      if (!team) return;
      
      game.players?.forEach(player => {
        if (player.teamName !== teamName) return;
        
        const pid = player.playerId;
        if (!playerStats[pid]) {
          playerStats[pid] = {
            playerId: pid,
            jersey: player.jersey,
            home: { games: 0, points: 0 },
            away: { games: 0, points: 0 }
          };
        }
        
        const location = team.isHome ? 'home' : 'away';
        playerStats[pid][location].games++;
        playerStats[pid][location].points += player.stats?.points || 0;
      });
    });
    
    let biggestDiff = 0;
    let hero = null;
    
    Object.values(playerStats).forEach(p => {
      if (p.home.games < MIN_GAMES_EACH || p.away.games < MIN_GAMES_EACH) return;
      
      const homePpg = p.home.points / p.home.games;
      const awayPpg = p.away.points / p.away.games;
      const diff = homePpg - awayPpg;
      
      if (diff > biggestDiff && diff >= MIN_DIFF && homePpg >= MIN_HOME_PPG) {
        biggestDiff = diff;
        hero = { ...p, homePpg, awayPpg, diff };
      }
    });
    
    if (hero) {
      const playerName = this.getPlayerDisplayName(hero.playerId, hero.jersey, teamName);
      return {
        type: 'HOME_COURT_HERO',
        category: 'PLAYERS',
        importance: 'medium',
        teamName,
        playerName,
        icon: '🏠',
        text: `${playerName} אוהב את הבית! ${hero.homePpg.toFixed(1)} נק' בבית לעומת ${hero.awayPpg.toFixed(1)} בחוץ (+${hero.diff.toFixed(1)})`,
        textShort: `${playerName}: +${hero.diff.toFixed(1)} נק' בבית`
      };
    }
    return null;
  }

  /**
   * זיהוי Rising Star - שחקן במגמת עלייה
   */
  detectRisingStar(teamName, games) {
    const MIN_GAMES = 8;
    const MIN_IMPROVEMENT_PCT = 40; // 40% שיפור
    const MIN_RECENT_AVG = 12;
    
    const playerPoints = {};
    
    games.forEach((game, idx) => {
      const team = this.getTeamFromGame(game, teamName);
      if (!team) return;
      
      game.players?.forEach(player => {
        if (player.teamName !== teamName) return;
        
        const pid = player.playerId;
        if (!playerPoints[pid]) {
          playerPoints[pid] = { playerId: pid, jersey: player.jersey, points: [] };
        }
        playerPoints[pid].points.push({ idx, points: player.stats?.points || 0 });
      });
    });
    
    let biggestRise = 0;
    let star = null;
    
    Object.values(playerPoints).forEach(p => {
      if (p.points.length < MIN_GAMES) return;
      
      const mid = Math.floor(p.points.length / 2);
      const firstHalf = p.points.slice(0, mid);
      const secondHalf = p.points.slice(mid);
      
      if (firstHalf.length < 3 || secondHalf.length < 3) return;
      
      const firstAvg = firstHalf.reduce((a, b) => a + b.points, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b.points, 0) / secondHalf.length;
      
      if (firstAvg === 0) return;
      
      const improvement = secondAvg - firstAvg;
      const improvementPct = (improvement / firstAvg) * 100;
      
      if (improvementPct > biggestRise && improvementPct >= MIN_IMPROVEMENT_PCT && secondAvg >= MIN_RECENT_AVG) {
        biggestRise = improvementPct;
        star = { ...p, firstAvg, secondAvg, improvement, improvementPct };
      }
    });
    
    if (star) {
      const playerName = this.getPlayerDisplayName(star.playerId, star.jersey, teamName);
      return {
        type: 'RISING_STAR',
        category: 'PLAYERS',
        importance: 'high',
        teamName,
        playerName,
        icon: '📈',
        text: `${playerName} במגמת עלייה! ${star.firstAvg.toFixed(1)} נק' בתחילה → ${star.secondAvg.toFixed(1)} נק' לאחרונה (+${star.improvementPct.toFixed(0)}%)`,
        textShort: `${playerName}: +${star.improvementPct.toFixed(0)}% שיפור`
      };
    }
    return null;
  }

  // ========== CATEGORY 3: OFFENSE ==========

  /**
   * זיהוי תלות בשלוש (Three-Point Dependent)
   */
  detectThreePointDependent(teamName, teamData, allTeams) {
    const THRESHOLD = 40; // 40%
    
    if (!teamData || !teamData._total3PM || !teamData._totalPoints) return null;
    
    const threePointPoints = teamData._total3PM * 3;
    const totalPoints = teamData._totalPoints;
    const threePointPct = (threePointPoints / totalPoints) * 100;
    
    if (threePointPct >= THRESHOLD) {
      // חשב דירוג בליגה באחוז נקודות משלוש
      const teamsWithThreePct = allTeams.map(t => ({
        name: t.teamName,
        threePct: t._total3PM && t._totalPoints ? 
          (t._total3PM * 3 / t._totalPoints) * 100 : 0
      })).sort((a, b) => b.threePct - a.threePct);
      
      const rank = teamsWithThreePct.findIndex(t => t.name === teamName) + 1;
      const rankText = rank ? ` (מקום ${rank} בליגה בתלות בשלוש)` : '';
      
      // שימוש בטמפלט דינמי
      const text = window.IBBAInsightTemplates?.getRandomText('team', 'THREE_POINT_DEPENDENT', {
        threePointPct: threePointPct.toFixed(0),
        teamName,
        rankText
      }) || `${threePointPct.toFixed(0)}% מנקודות ${teamName}${rankText} מקו השלוש – תלות גבוהה במשחק המרחק`;
      
      return {
        type: 'THREE_POINT_DEPENDENT',
        category: 'OFFENSE',
        importance: threePointPct >= 50 ? 'high' : 'medium',
        teamName,
        value: threePointPct.toFixed(1),
        icon: '🎯',
        text,
        textShort: `${threePointPct.toFixed(0)}% מהנקודות משלוש`
      };
    }
    return null;
  }

  /**
   * זיהוי שליטה בצבע (Paint Dominators)
   */
  detectPaintDominators(teamName, teamData, leagueAvg) {
    if (!teamData || !teamData._totalFGM || !teamData._total3PM) return null;
    
    const gamesPlayed = teamData.gamesPlayed || 1;
    // FGM = סלים של 2 נקודות (לא צריך לחסר כלום!)
    const twoPointFGM = teamData._totalFGM;
    const twoPointPoints = twoPointFGM * 2;
    const twoPointPpg = twoPointPoints / gamesPlayed;
    
    // חשב ממוצע ליגה
    const leagueTwoPpg = leagueAvg ? 
      (leagueAvg._totalFGM * 2) / (leagueAvg.gamesPlayed || 1) : 
      40;
    
    if (twoPointPpg >= leagueTwoPpg + 8) {
      return {
        type: 'PAINT_DOMINATORS',
        category: 'OFFENSE',
        importance: 'medium',
        teamName,
        value: twoPointPpg.toFixed(1),
        icon: '🏀',
        text: `${teamName} שולטת בצבע - ${twoPointPpg.toFixed(1)} נק' למשחק מזריקות של 2 (${twoPointFGM} סלים למשחק, ${(twoPointPpg - leagueTwoPpg).toFixed(1)} מעל ממוצע הליגה)`,
        textShort: `${twoPointPpg.toFixed(1)} נק' מזריקות 2`
      };
    }
    return null;
  }

  /**
   * זיהוי משחק קבוצתי (Assist Heavy)
   */
  detectAssistHeavy(teamName, teamData, allTeams) {
    const THRESHOLD = 65; // 65%
    
    if (!teamData || !teamData._totalAssists || !teamData._totalFGM || !teamData._total3PM) return null;
    
    // ✅ חישוב נכון סופי:
    // FGM = סלים של 2 נקודות בלבד (ק 2 נק')
    // 3PM = סלים של 3 נקודות (ק 3 נק')
    // סה"כ סלים = FGM + 3PM
    const totalAssists = teamData._totalAssists || 0;
    const totalFGM = teamData._totalFGM || 0;      // סלים של 2 נקודות
    const total3PM = teamData._total3PM || 0;       // סלים של 3 נקודות
    const totalBaskets = totalFGM + total3PM;       // סה"כ כל הסלים
    
    if (totalBaskets === 0) return null;
    
    const assistRatio = (totalAssists / totalBaskets) * 100;
    
    // אם האחוז מעל 95% - יש בעיה בנתונים, דלג
    if (assistRatio > 95) {
      console.warn(`⚠️ Assist ratio for ${teamName} is ${assistRatio.toFixed(1)}% - possible data issue. Skipping.`);
      return null;
    }
    
    if (assistRatio >= THRESHOLD) {
      // חשב דירוג בליגה באחוז אסיסטים
      const teamsWithAssistRatio = allTeams.map(t => ({
        name: t.teamName,
        ratio: t._totalFGM && t._total3PM ? 
          (t._totalAssists / (t._totalFGM + t._total3PM)) * 100 : 0
      })).sort((a, b) => b.ratio - a.ratio);
      
      const rank = teamsWithAssistRatio.findIndex(t => t.name === teamName) + 1;
      const rankText = rank ? ` (מקום ${rank} בליגה באחוז אסיסטים)` : '';
      
      // שימוש בטמפלט דינמי
      const text = window.IBBAInsightTemplates?.getRandomText('team', 'ASSIST_HEAVY', {
        assistRatio: assistRatio.toFixed(1),
        teamName,
        rankText
      }) || `${assistRatio.toFixed(1)}% מהסלים של ${teamName}${rankText} מגיעים מאסיסט – משחק קבוצתי בולט`;
      
      return {
        type: 'ASSIST_HEAVY',
        category: 'OFFENSE',
        importance: 'medium',
        teamName,
        value: assistRatio.toFixed(1),
        icon: '🤝',
        text,
        textShort: `${assistRatio.toFixed(1)}% סלים מאסיסט`
      };
    }
    return null;
  }

  /**
   * זיהוי Free Throw Factory
   */
  detectFreeThrowFactory(teamName, teamData) {
    const THRESHOLD = 20; // 20 זריקות חופשיות למשחק
    
    if (!teamData || !teamData._totalFTA) return null;
    
    const gamesPlayed = teamData.gamesPlayed || 1;
    const ftaPerGame = teamData._totalFTA / gamesPlayed;
    
    if (ftaPerGame >= THRESHOLD) {
      return {
        type: 'FREE_THROW_FACTORY',
        category: 'OFFENSE',
        importance: 'low',
        teamName,
        value: ftaPerGame.toFixed(1),
        icon: '🎯',
        text: `${teamName} מגיעה הרבה לקו החינם – ${ftaPerGame.toFixed(1)} זריקות חופשיות למשחק בממוצע`,
        textShort: `${ftaPerGame.toFixed(1)} זריקות חופשיות למשחק`
      };
    }
    return null;
  }

  /**
   * זיהוי High Scoring Offense
   */
  detectHighScoringOffense(teamName, teamData, leagueAvgPpg, allTeams) {
    const THRESHOLD_DIFF = 10;
    
    if (!teamData || !teamData.ppg) return null;
    
    const ppg = parseFloat(teamData.ppg);
    
    if (ppg >= leagueAvgPpg + THRESHOLD_DIFF) {
      const diff = (ppg - leagueAvgPpg).toFixed(1);
      
      // חשב דירוג בליגה בניקוד
      const rank = this.getTeamRankInCategory(teamName, 'ppg', allTeams, false);
      const rankText = rank ? ` (מקום ${rank} בליגה בניקוד)` : '';
      
      // שימוש בטמפלט דינמי
      const text = window.IBBAInsightTemplates?.getRandomText('team', 'HIGH_SCORING_OFFENSE', {
        teamName,
        rankText,
        ppg: ppg.toFixed(1),
        diff
      }) || `${teamName}${rankText} מגיעה עם אחת ההתקפות הפוריות בליגה – ${ppg.toFixed(1)} נק' למשחק, ${diff} מעל הממוצע`;
      
      return {
        type: 'HIGH_SCORING',
        category: 'OFFENSE',
        importance: 'medium',
        teamName,
        value: ppg.toFixed(1),
        icon: '🚀',
        text,
        textShort: `${ppg.toFixed(1)} נק' למשחק`
      };
    }
    return null;
  }

  /**
   * זיהוי Fast Break Kings - מלכי ההתקפה המתפרצת
   */
  detectFastBreakKings(teamName, teamData, allTeams) {
    const THRESHOLD = 15; // 15 נק' למשחק
    const MAX_RANK = 6; // רק חצי עליון (מקומות 1-6 מתוך ~12-16 קבוצות)
    
    if (!teamData || !teamData.fastBreakPpg) return null;
    
    const fastBreakPpg = parseFloat(teamData.fastBreakPpg);
    
    if (fastBreakPpg >= THRESHOLD) {
      // חשב דירוג בליגה בהתקפות מתפרצות
      const rank = this.getTeamRankInCategory(teamName, 'fastBreakPpg', allTeams, false);
      
      // רק קבוצות בחצי העליון מקבלות Insight
      if (!rank || rank > MAX_RANK) return null;
      
      const rankText = rank ? ` (מקום ${rank} בליגה בהתקפות מתפרצות)` : '';
      
      // שימוש בטמפלט דינמי
      const text = window.IBBAInsightTemplates?.getRandomText('team', 'FAST_BREAK_KINGS', {
        teamName,
        rankText,
        fastBreakPpg: fastBreakPpg.toFixed(1)
      }) || `${teamName}${rankText} מגיעה כקבוצה מהטובות במתפרצות – ${fastBreakPpg.toFixed(1)} נק' למשחק מהתקפות מהירות`;
      
      return {
        type: 'FAST_BREAK_KINGS',
        category: 'OFFENSE',
        importance: rank === 1 ? 'high' : 'medium',
        teamName,
        value: fastBreakPpg.toFixed(1),
        rank,
        icon: '⚡',
        text,
        textShort: `${fastBreakPpg.toFixed(1)} נק' התקפות מתפרצות`
      };
    }
    return null;
  }

  /**
   * זיהוי Paint Dominators - שליטה בצבע
   */
  detectPaintDominance(teamName, teamData, allTeams) {
    const THRESHOLD = 45; // 45% מהנקודות
    const MAX_RANK = 6; // רק חצי עליון
    
    if (!teamData || !teamData._totalPointsInPaint || !teamData._totalPoints) return null;
    
    const paintPct = (teamData._totalPointsInPaint / teamData._totalPoints) * 100;
    const paintPpg = parseFloat(teamData.paintPpg);
    
    if (paintPct >= THRESHOLD) {
      // חשב דירוג בליגה בנקודות בצבע
      const rank = this.getTeamRankInCategory(teamName, 'paintPpg', allTeams, false);
      
      // רק קבוצות בחצי העליון מקבלות Insight
      if (!rank || rank > MAX_RANK) return null;
      
      const rankText = rank ? ` (מקום ${rank} בליגה בנקודות בצבע)` : '';
      
      // שימוש בטמפלט דינמי
      const text = window.IBBAInsightTemplates?.getRandomText('team', 'PAINT_DOMINANCE', {
        teamName,
        rankText,
        paintPct: paintPct.toFixed(0),
        paintPpg
      }) || `${teamName}${rankText} מגיעה עם כוח בצבע – ${paintPct.toFixed(0)}% מהנקודות שלה משם, ${paintPpg} נק' למשחק`;
      
      return {
        type: 'PAINT_DOMINANCE',
        category: 'OFFENSE',
        importance: rank === 1 ? 'high' : 'medium',
        teamName,
        value: paintPct.toFixed(1),
        rank,
        icon: '🎯',
        text,
        textShort: `${paintPct.toFixed(0)}% נק' מהצבע`
      };
    }
    return null;
  }

  /**
   * זיהוי Bench Power - ספסל חזק
   */
  detectBenchPower(teamName, teamData, allTeams) {
    const THRESHOLD = 30; // 30 נק' למשחק
    const MAX_RANK = 6; // רק חצי עליון
    
    if (!teamData || !teamData.benchPpg) return null;
    
    const benchPpg = parseFloat(teamData.benchPpg);
    const benchPct = teamData._totalPointsBench && teamData._totalPoints 
      ? (teamData._totalPointsBench / teamData._totalPoints * 100).toFixed(0)
      : 0;
    
    if (benchPpg >= THRESHOLD) {
      // חשב דירוג בליגה בנקודות מהספסל
      const rank = this.getTeamRankInCategory(teamName, 'benchPpg', allTeams, false);
      
      // רק קבוצות בחצי העליון מקבלות Insight
      if (!rank || rank > MAX_RANK) return null;
      
      const rankText = rank ? ` (מקום ${rank} בליגה בתרומת ספסל)` : '';
      
      // ניסוח דינמי לפי דירוג
      let actionText;
      if (rank === 1) {
        actionText = 'הספסל הטוב ביותר בליגה';
      } else if (rank === 2) {
        actionText = 'ספסל מצוין';
      } else {
        actionText = 'ספסל חזק';
      }
      
      return {
        type: 'BENCH_POWER',
        category: 'OFFENSE',
        importance: rank === 1 ? 'high' : 'medium',
        teamName,
        value: benchPpg.toFixed(1),
        rank,
        icon: '🪑',
        text: `${teamName}${rankText} - ${actionText}! ${benchPpg} נק' למשחק מהספסל (${benchPct}% מהנקודות)`,
        textShort: `${benchPpg} נק' מהספסל`
      };
    }
    return null;
  }

  /**
   * זיהוי Worst Category - הקטגוריה החלשה ביותר (אתגר עיקרי)
   */
  detectWorstCategory(teamName, teamData, allTeams) {
    const categories = {
      ppg: { label: 'בניקוד', icon: '🎯', ascending: false },
      rpg: { label: 'בריבאונדים', icon: '🏀', ascending: false },
      apg: { label: 'באסיסטים', icon: '🤝', ascending: false },
      oppPpg: { label: 'בהגנה', icon: '🛡️', ascending: true }
    };
    
    let worstRank = 0;
    let worstCategory = null;
    
    Object.entries(categories).forEach(([metric, info]) => {
      if (!teamData[metric]) return;
      
      const rank = this.getTeamRankInCategory(teamName, metric, allTeams, info.ascending);
      if (rank && rank > worstRank) { // הדירוג הגרוע ביותר
        worstRank = rank;
        worstCategory = {
          metric,
          rank,
          value: parseFloat(teamData[metric]).toFixed(1),
          label: info.label,
          icon: info.icon
        };
      }
    });
    
    // הצג רק אם הדירוג גרוע (מקום 10+)
    if (worstCategory && worstRank >= 10) {
      return {
        type: 'WORST_CATEGORY',
        category: 'LEAGUE',
        importance: 'low',
        teamName,
        icon: '⚠️',
        text: `${teamName}: אתגר עיקרי - מקום ${worstCategory.rank} ${worstCategory.label} (${worstCategory.value})`,
        textShort: `אתגר: מקום ${worstCategory.rank} ${worstCategory.label}`,
        isFallback: true
      };
    }
    
    return null;
  }

  /**
   * זיהוי Best Category - הקטגוריה הטובה ביותר של הקבוצה (גם לקבוצות חלשות)
   */
  detectBestCategory(teamName, teamData, allTeams) {
    const categories = {
      ppg: { label: 'בניקוד', icon: '🎯', ascending: false },
      rpg: { label: 'בריבאונדים', icon: '🏀', ascending: false },
      apg: { label: 'באסיסטים', icon: '🤝', ascending: false },
      spg: { label: 'בחטיפות', icon: '🏃', ascending: false },
      fgPct: { label: 'באחוז קליעה', icon: '🎯', ascending: false },
      fg3Pct: { label: 'בשלוש', icon: '🎯', ascending: false },
      oppPpg: { label: 'בהגנה', icon: '🛡️', ascending: true }
    };
    
    let bestRank = 999;
    let bestCategory = null;
    
    Object.entries(categories).forEach(([metric, info]) => {
      if (!teamData[metric]) return;
      
      const rank = this.getTeamRankInCategory(teamName, metric, allTeams, info.ascending);
      if (rank && rank < bestRank) { // כל דירוג (הורדנו את הסף מ-8)
        bestRank = rank;
        bestCategory = {
          metric,
          rank,
          value: parseFloat(teamData[metric]).toFixed(1),
          label: info.label,
          icon: info.icon
        };
      }
    });
    
    // הצג את הקטגוריה הטובה ביותר - גם אם היא לא מדהימה
    if (bestCategory) {
      let text;
      if (bestRank <= 3) {
        text = `${teamName}: נקודת חוזק - מקום ${bestCategory.rank} ${bestCategory.label} (${bestCategory.value})`;
      } else if (bestRank <= 8) {
        text = `${teamName}: נקודת חוזק יחסית - מקום ${bestCategory.rank} ${bestCategory.label} (${bestCategory.value})`;
      } else {
        text = `${teamName}: הקטגוריה הטובה ביותר - מקום ${bestCategory.rank} ${bestCategory.label} (${bestCategory.value})`;
      }
      
      return {
        type: 'BEST_CATEGORY',
        category: 'LEAGUE',
        importance: 'low',
        teamName,
        icon: bestCategory.icon,
        text,
        textShort: `מקום ${bestCategory.rank} ${bestCategory.label}`,
        isFallback: true // סימון שזה fallback
      };
    }
    
    return null;
  }

  /**
   * זיהוי Starting vs Bench - השוואת חמישייה מתחילה לספסל
   */
  detectStartingVsBench(teamName, teamData, allTeams) {
    if (!teamData || !teamData.startersPpg || !teamData.benchPpg) return null;
    
    const startersPpg = parseFloat(teamData.startersPpg);
    const benchPpg = parseFloat(teamData.benchPpg);
    const totalPpg = parseFloat(teamData.ppg) || (startersPpg + benchPpg);
    
    const startersPct = totalPpg > 0 ? ((startersPpg / totalPpg) * 100).toFixed(0) : 0;
    const benchPct = totalPpg > 0 ? ((benchPpg / totalPpg) * 100).toFixed(0) : 0;
    
    // Insight מעניין רק אם יש איזון או ספסל חזק במיוחד
    const MIN_BENCH_PCT = 25; // לפחות 25% מהספסל
    const STRONG_BENCH_PCT = 35; // 35%+ = ספסל חזק מאוד
    
    if (benchPct >= MIN_BENCH_PCT) {
      let insight;
      
      if (benchPct >= STRONG_BENCH_PCT) {
        // ספסל חזק מאוד
        insight = `ספסל דומיננטי: ${startersPct}% מהחמישייה, ${benchPct}% מהספסל`;
      } else {
        // איזון טוב
        insight = `איזון טוב בין חמישייה (${startersPct}%) לספסל (${benchPct}%)`;
      }
      
      return {
        type: 'STARTING_VS_BENCH',
        category: 'OFFENSE',
        importance: benchPct >= STRONG_BENCH_PCT ? 'medium' : 'low',
        teamName,
        icon: '⚖️',
        text: `${teamName}: ${insight} – ${startersPpg.toFixed(1)} vs ${benchPpg.toFixed(1)} נק' למשחק`,
        textShort: `${startersPct}% חמישייה, ${benchPct}% ספסל`
      };
    }
    
    return null;
  }

  /**
   * זיהוי Turnover Capitalization - ניצול איבודים
   */
  detectTurnoverCapitalization(teamName, teamData, allTeams) {
    const THRESHOLD = 18; // 18 נק' למשחק
    const MAX_RANK = 6; // רק חצי עליון
    
    if (!teamData || !teamData.pointsFromToPpg) return null;
    
    const pointsFromToPpg = parseFloat(teamData.pointsFromToPpg);
    
    if (pointsFromToPpg >= THRESHOLD) {
      // חשב דירוג בליגה בניצול איבודים
      const rank = this.getTeamRankInCategory(teamName, 'pointsFromToPpg', allTeams, false);
      
      // רק קבוצות בחצי העליון מקבלות Insight
      if (!rank || rank > MAX_RANK) return null;
      
      const rankText = rank ? ` (מקום ${rank} בליגה בניצול איבודים)` : '';
      
      // ניסוח דינמי לפי דירוג
      let actionText;
      if (rank === 1) {
        actionText = 'הטובה ביותר בניצול טעויות';
      } else if (rank === 2) {
        actionText = 'מצטיינת בניצול טעויות';
      } else {
        actionText = 'טובה בניצול טעויות';
      }
      
      return {
        type: 'TURNOVER_CAPITALIZATION',
        category: 'DEFENSE',
        importance: rank === 1 ? 'high' : 'medium',
        teamName,
        value: pointsFromToPpg.toFixed(1),
        rank,
        icon: '💰',
        text: `${teamName}${rankText} - ${actionText}! ${pointsFromToPpg} נק' למשחק מאיבודים של היריבה`,
        textShort: `${pointsFromToPpg} נק' מאיבודים`
      };
    }
    return null;
  }

  /**
   * זיהוי Second Chance Masters - מומחי הזדמנות שנייה
   */
  detectSecondChanceMasters(teamName, teamData, allTeams) {
    const THRESHOLD = 15; // 15 נק' למשחק
    const MAX_RANK = 6; // רק חצי עליון
    
    if (!teamData || !teamData.secondChancePpg) return null;
    
    const secondChancePpg = parseFloat(teamData.secondChancePpg);
    
    if (secondChancePpg >= THRESHOLD) {
      // חשב דירוג בליגה בנקודות הזדמנות שנייה
      const rank = this.getTeamRankInCategory(teamName, 'secondChancePpg', allTeams, false);
      
      // רק קבוצות בחצי העליון מקבלות Insight
      if (!rank || rank > MAX_RANK) return null;
      
      const rankText = rank ? ` (מקום ${rank} בליגה בהזדמנות שנייה)` : '';
      
      // ניסוח דינמי לפי דירוג
      let actionText;
      if (rank === 1) {
        actionText = 'הטובה ביותר בהזדמנויות שניות';
      } else if (rank === 2) {
        actionText = 'מצוינת בהזדמנויות שניות';
      } else {
        actionText = 'לא מוותרת';
      }
      
      return {
        type: 'SECOND_CHANCE_MASTERS',
        category: 'OFFENSE',
        importance: rank === 1 ? 'high' : 'medium',
        teamName,
        value: secondChancePpg.toFixed(1),
        rank,
        icon: '🔄',
        text: `${teamName}${rankText} - ${actionText}! ${secondChancePpg} נק' למשחק מהזדמנות שנייה`,
        textShort: `${secondChancePpg} נק' הזדמנות 2`
      };
    }
    return null;
  }

  /**
   * זיהוי קבוצה עם ספסל חזק
   * מבוסס על pbc (pointsBench) שכבר מחושב ב-API
   * סף: 30%+ מהנקודות מהספסל OR 22+ נק' למשחק
   */
  detectStrongBench(teamName, teamData, allTeams) {
    const MIN_GAMES = 3;
    
    if (!teamData || !teamData.gamesPlayed || teamData.gamesPlayed < MIN_GAMES) {
      return null;
    }
    
    // Use _totalPointsBench (with underscore) as returned by getTeamAverages()
    const totalBenchPoints = teamData._totalPointsBench || 0;
    const totalPoints = teamData._totalPoints || 0;
    const benchPpg = totalBenchPoints / teamData.gamesPlayed;
    const benchPct = totalPoints > 0 ? (totalBenchPoints / totalPoints) * 100 : 0;
    
    // סף: 30%+ מהנקודות מהספסל OR 22+ נק' למשחק (יותר ריאליסטי)
    if (benchPct >= 30 || benchPpg >= 22) {
      const text = window.IBBAInsightTemplates?.getRandomText('team', 'STRONG_BENCH', {
        teamName: teamName,
        benchPpg: benchPpg.toFixed(1),
        benchPct: benchPct.toFixed(0)
      }) || `${teamName} נהנית מספסל חזק: ${benchPpg.toFixed(1)} נק' למשחק (${benchPct.toFixed(0)}% מהייצור)`;
      
      return {
        type: 'STRONG_BENCH',
        category: 'OFFENSE',
        importance: 'high',
        teamName,
        benchPpg: benchPpg.toFixed(1),
        benchPct: benchPct.toFixed(0),
        icon: '🪑',
        text,
        textShort: `ספסל ${benchPpg.toFixed(1)} נק\'`
      };
    }
    
    return null;
  }

  /**
   * זיהוי קבוצה תלויה בחמישייה הפותחת (ספסל חלש)
   * מבוסס על pbc (pointsBench) שכבר מחושב ב-API
   * סף: פחות מ-25% מהנקודות מהספסל
   */
  detectLineupDependent(teamName, teamData, allTeams) {
    const MIN_GAMES = 3;
    
    if (!teamData || !teamData.gamesPlayed || teamData.gamesPlayed < MIN_GAMES) {
      return null;
    }
    
    // Use _totalPointsBench (with underscore) as returned by getTeamAverages()
    const totalBenchPoints = teamData._totalPointsBench || 0;
    const totalPoints = teamData._totalPoints || 0;
    const benchPct = totalPoints > 0 ? (totalBenchPoints / totalPoints) * 100 : 0;
    
    // סף: פחות מ-25% מהספסל = תלות גבוהה בחמישייה (עודכן להיות יותר ריאליסטי)
    if (benchPct <= 25) {
      const text = window.IBBAInsightTemplates?.getRandomText('team', 'LINEUP_DEPENDENT', {
        teamName: teamName,
        benchPct: benchPct.toFixed(0)
      }) || `${teamName} תלויה בחמישייה הפותחת - רק ${benchPct.toFixed(0)}% מהנקודות מהספסל`;
      
      return {
        type: 'LINEUP_DEPENDENT',
        category: 'OFFENSE',
        importance: 'medium',
        teamName,
        benchPct: benchPct.toFixed(0),
        icon: '⚠️',
        text,
        textShort: `ספסל חלש (${benchPct.toFixed(0)}%)`
      };
    }
    
    return null;
  }

  /**
   * זיהוי שחקן מחליף עם impact גבוה (Super Sub)
   * מבוסס על status: "sub" שכבר מגיע מה-API
   * סף: 10+ נק' בממוצע כמחליף
   */
  detectSuperSub(teamName, teamGames) {
    const MIN_GAMES = 3;
    
    if (!teamGames || teamGames.length < MIN_GAMES) {
      return null;
    }
    
    // סכום נקודות לכל שחקן מחליף
    const subs = {};
    
    teamGames.forEach(game => {
      if (!game.players) return;
      
      game.players
        .filter(p => p.teamName === teamName && p.status === 'sub')
        .forEach(p => {
          if (!subs[p.playerId]) {
            subs[p.playerId] = {
              points: 0,
              games: 0,
              jersey: p.jersey,
              name: p.playerName || `#${p.jersey}`
            };
          }
          subs[p.playerId].points += p.stats.points || 0;
          subs[p.playerId].games++;
        });
    });
    
    // מצא את המחליף עם הממוצע הגבוה ביותר (10+ נק' - עודכן להיות יותר ריאליסטי)
    const topSub = Object.values(subs)
      .map(s => ({ ...s, ppg: s.points / s.games }))
      .filter(s => s.ppg >= 10 && s.games >= MIN_GAMES)
      .sort((a, b) => b.ppg - a.ppg)[0];
    
    if (topSub) {
      const text = window.IBBAInsightTemplates?.getRandomText('player', 'SUPER_SUB', {
        teamName: teamName,
        playerName: topSub.name,
        ppg: topSub.ppg.toFixed(1)
      }) || `${topSub.name} עולה מהספסל של ${teamName} ומוסיף ${topSub.ppg.toFixed(1)} נק' בממוצע`;
      
      return {
        type: 'SUPER_SUB',
        category: 'PLAYERS',
        importance: 'high',
        teamName,
        player: topSub.name,
        ppg: topSub.ppg.toFixed(1),
        icon: '⭐',
        text,
        textShort: `${topSub.name}: ${topSub.ppg.toFixed(1)} נק\' (מחליף)`
      };
    }
    
    return null;
  }

  // ========== CATEGORY 4: DEFENSE ==========

  /**
   * זיהוי חומת הגנה (Defensive Wall)
   */
  detectDefensiveWall(teamName, teamData, leagueAvgOppPpg, allTeams) {
    const THRESHOLD_DIFF = 5;
    
    if (!teamData || !teamData.oppPpg) return null;
    
    const oppPpg = parseFloat(teamData.oppPpg);
    const threshold = leagueAvgOppPpg - THRESHOLD_DIFF;
    
    if (oppPpg < threshold) {
      const diff = (leagueAvgOppPpg - oppPpg).toFixed(1);
      
      // חשב דירוג בליגה בהגנה (נמוך יותר = טוב יותר)
      const rank = this.getTeamRankInCategory(teamName, 'oppPpg', allTeams, true);
      const rankText = rank ? ` (מקום ${rank} בליגה בהגנה)` : '';
      
      // שימוש בטמפלט דינמי
      const text = window.IBBAInsightTemplates?.getRandomText('team', 'DEFENSIVE_WALL', {
        teamName,
        rankText,
        oppPpg: oppPpg.toFixed(1),
        diff
      }) || `${teamName}${rankText} מגיעה עם הגנה מצוינת – היריבות שלה על ${oppPpg.toFixed(1)} נק' למשחק, ${diff} פחות מהממוצע`;
      
      return {
        type: 'DEFENSIVE_WALL',
        category: 'DEFENSE',
        importance: 'high',
        teamName,
        value: oppPpg,
        leagueAvg: leagueAvgOppPpg.toFixed(1),
        icon: '🧱',
        text,
        textShort: `הגנה: ${oppPpg.toFixed(1)} נק' ליריבות`
      };
    }
    return null;
  }

  /**
   * זיהוי שליטה בלוח (Rebound Dominance)
   */
  detectReboundDominance(teamName, teamData, opponentData) {
    const THRESHOLD = 5;
    
    if (!teamData || !opponentData) return null;
    
    const teamRpg = parseFloat(teamData.rpg) || 0;
    const oppRpg = parseFloat(opponentData.rpg) || 0;
    const diff = teamRpg - oppRpg;
    
    if (diff >= THRESHOLD) {
      // שימוש בטמפלט דינמי
      const text = window.IBBAInsightTemplates?.getRandomText('team', 'REBOUND_DOMINANCE', {
        teamName,
        diff: diff.toFixed(1),
        opponentName: opponentData.teamName
      }) || `על הנייר, ${teamName} מגיעה עם יתרון ברור בריבאונד – פלוס ${diff.toFixed(1)} כדורים חוזרים בממוצע לעומת ${opponentData.teamName}`;
      
      return {
        type: 'REBOUND_DOMINANCE',
        category: 'DEFENSE',
        importance: 'medium',
        teamName,
        value: diff.toFixed(1),
        icon: '💪',
        text,
        textShort: `+${diff.toFixed(1)} ריבאונדים`
      };
    }
    return null;
  }

  /**
   * זיהוי חוטפות כדורים (Steal Masters)
   */
  detectTurnoverCreators(teamName, teamData, leagueAvgSpg, allTeams) {
    const THRESHOLD_DIFF = 2;
    
    if (!teamData || !teamData.spg) return null;
    
    const spg = parseFloat(teamData.spg);
    
    if (spg >= leagueAvgSpg + THRESHOLD_DIFF) {
      const diff = (spg - leagueAvgSpg).toFixed(1);
      
      // חשב דירוג בליגה בחטיפות
      const rank = this.getTeamRankInCategory(teamName, 'spg', allTeams, false);
      const rankText = rank ? ` (מקום ${rank} בליגה בחטיפות)` : '';
      
      // ניסוח דינמי לפי דירוג
      let actionText;
      if (rank === 1) {
        actionText = 'מלכת החטיפות';
      } else if (rank === 2) {
        actionText = 'מצטיינת בחטיפות';
      } else {
        actionText = 'חוטפת כדורים';
      }
      
      return {
        type: 'TURNOVER_CREATORS',
        category: 'DEFENSE',
        importance: rank <= 2 ? 'high' : 'medium',
        teamName,
        value: spg.toFixed(1),
        rank,
        leagueAvg: leagueAvgSpg.toFixed(1),
        icon: '🕵️',
        text: `${teamName}${rankText} ${actionText} - ${spg.toFixed(1)} חטיפות למשחק (${diff} מעל ממוצע הליגה)`,
        textShort: `${spg.toFixed(1)} חטיפות למשחק`
      };
    }
    return null;
  }

  /**
   * זיהוי Block Party
   */
  detectBlockParty(teamName, games, teamData, allTeams) {
    const THRESHOLD = 4;
    
    if (!teamData || !teamData.bpg) return null;
    
    const bpg = parseFloat(teamData.bpg);
    
    if (bpg >= THRESHOLD) {
      // חשב דירוג בליגה בחסימות
      const rank = this.getTeamRankInCategory(teamName, 'bpg', allTeams, false);
      const rankText = rank ? ` (מקום ${rank} בליגה בחסימות)` : '';
      
      // מצא את השחקן עם הכי הרבה חסימות
      const playerBlocks = {};
      
      games.forEach(game => {
        const teamInGame = this.getTeamFromGame(game, teamName);
        if (!teamInGame) return;
        
        game.players?.forEach(player => {
          if (player.teamName !== teamName) return;
          
          const playerId = player.playerId;
          if (!playerBlocks[playerId]) {
            playerBlocks[playerId] = {
              playerId,
              jersey: player.jersey,
              games: 0,
              totalBlocks: 0
            };
          }
          
          playerBlocks[playerId].games++;
          playerBlocks[playerId].totalBlocks += player.stats?.blocks || 0;
        });
      });
      
      // מצא את המוביל
      let topBlocker = null;
      let maxBpg = 0;
      
      for (const data of Object.values(playerBlocks)) {
        if (data.games < 3) continue;
        const playerBpg = data.totalBlocks / data.games;
        if (playerBpg > maxBpg) {
          maxBpg = playerBpg;
          topBlocker = data;
        }
      }
      
      let playerDetail = '';
      if (topBlocker && maxBpg >= 1.5) {
        const playerName = this.getPlayerDisplayName(topBlocker.playerId, topBlocker.jersey);
        playerDetail = ` כש-${playerName} מוביל עם ${maxBpg.toFixed(1)} חסימות למשחק`;
      }
      
      // ניסוח דינמי לפי דירוג
      let actionText;
      if (rank === 1) {
        actionText = 'חוסמת הכל';
      } else if (rank === 2) {
        actionText = 'מצטיינת בחסימות';
      } else {
        actionText = 'טובה בחסימות';
      }
      
      return {
        type: 'BLOCK_PARTY',
        category: 'DEFENSE',
        importance: rank <= 2 ? 'medium' : 'low',
        teamName,
        value: bpg.toFixed(1),
        rank,
        icon: '🚫',
        text: `${teamName}${rankText} ${actionText} - ${bpg.toFixed(1)} חסימות למשחק!${playerDetail}`,
        textShort: `${bpg.toFixed(1)} חסימות למשחק`
      };
    }
    return null;
  }

  /**
   * זיהוי Three-Point Defense - הגנה על שלוש
   */
  detectThreePointDefense(teamName, games, allTeams) {
    const MIN_GAMES = 5;
    const DIFF_THRESHOLD = 5; // הפרש מהממוצע הליגתי
    
    const teamGames = this.getTeamGames(games, teamName);
    let opp3PA = 0;
    let opp3PM = 0;
    let gamesCount = 0;
    
    teamGames.forEach(game => {
      const oppData = this.getOpponentFromGame(game, teamName);
      
      if (oppData && oppData.stats) {
        opp3PA += oppData.stats.threePointsAttempted || 0;
        opp3PM += oppData.stats.threePointsMade || 0;
        gamesCount++;
      }
    });
    
    if (gamesCount < MIN_GAMES || opp3PA === 0) return null;
    
    const opp3PPct = (opp3PM / opp3PA) * 100;
    
    // חשב ממוצע ליגתי של 3P%
    const league3PPct = this.getLeagueAverage('threePPct', allTeams);
    
    const diff = opp3PPct - league3PPct;
    
    if (diff < -DIFF_THRESHOLD) {
      return {
        type: 'THREE_POINT_DEFENSE_GOOD',
        category: 'DEFENSE',
        importance: 'medium',
        teamName,
        icon: '🛡️',
        text: `${teamName} הגנה מצוינת על שלוש! יריבות קולעות ${opp3PPct.toFixed(1)}% (ממוצע ליגתי ${league3PPct.toFixed(1)}%)`,
        textShort: `הגנת 3P: ${opp3PPct.toFixed(1)}%`
      };
    } else if (diff > DIFF_THRESHOLD) {
      return {
        type: 'THREE_POINT_DEFENSE_BAD',
        category: 'DEFENSE',
        importance: 'medium',
        teamName,
        icon: '⚠️',
        text: `${teamName} נותנת יותר מדי משלוש! יריבות קולעות ${opp3PPct.toFixed(1)}% (ממוצע ליגתי ${league3PPct.toFixed(1)}%)`,
        textShort: `הגנת 3P חלשה: ${opp3PPct.toFixed(1)}%`
      };
    }
    return null;
  }

  // ========== CATEGORY 5: MOMENTUM ==========

  /**
   * זיהוי מגמה בהפרש נקודות (Point Differential Trend)
   */
  detectPointDiffTrend(teamName, games) {
    const MIN_GAMES = 8;
    const RECENT_WINDOW = 5;
    const THRESHOLD = 5;
    
    const teamGames = this.getTeamGames(games, teamName);
    if (teamGames.length < MIN_GAMES) return null;
    
    // חישוב הפרש ממוצע עונתי
    const seasonDiffs = teamGames.map(game => {
      const teamData = this.getTeamFromGame(game, teamName);
      const oppData = this.getOpponentFromGame(game, teamName);
      return (teamData?.score || 0) - (oppData?.score || 0);
    });
    const seasonAvgDiff = seasonDiffs.reduce((sum, d) => sum + d, 0) / seasonDiffs.length;
    
    // חישוב הפרש ב-5 אחרונים
    const recentDiffs = seasonDiffs.slice(0, RECENT_WINDOW);
    const recentAvgDiff = recentDiffs.reduce((sum, d) => sum + d, 0) / recentDiffs.length;
    
    const change = recentAvgDiff - seasonAvgDiff;
    
    if (Math.abs(change) >= THRESHOLD) {
      const improving = change > 0;
      return {
        type: 'POINT_DIFF_TREND',
        category: 'MOMENTUM',
        importance: 'high',
        teamName,
        seasonDiff: seasonAvgDiff.toFixed(1),
        recentDiff: recentAvgDiff.toFixed(1),
        change: change.toFixed(1),
        improving,
        icon: improving ? '📈' : '📉',
        text: `${teamName} ${improving ? 'במגמת עלייה' : 'במגמת ירידה'} - הפרש נקודות של ${recentAvgDiff > 0 ? '+' : ''}${recentAvgDiff.toFixed(1)} ב-5 אחרונים (לעומת ${seasonAvgDiff > 0 ? '+' : ''}${seasonAvgDiff.toFixed(1)} עונתי)`,
        textShort: `${improving ? 'עלייה' : 'ירידה'} בהפרש נקודות`
      };
    }
    return null;
  }

  /**
   * זיהוי קושי לוח (Schedule Strength)
   */
  detectScheduleStrength(teamName, games, standings) {
    const MIN_GAMES_PER_HALF = 3;
    
    if (!standings || standings.length === 0) return null;
    
    const midPoint = Math.ceil(standings.length / 2);
    const topHalfTeams = standings.slice(0, midPoint).map(s => s.teamName);
    
    const teamGames = this.getTeamGames(games, teamName);
    
    let vsTopWins = 0, vsTopTotal = 0;
    let vsBottomWins = 0, vsBottomTotal = 0;
    
    teamGames.forEach(game => {
      const teamData = this.getTeamFromGame(game, teamName);
      const oppData = this.getOpponentFromGame(game, teamName);
      
      if (!teamData || !oppData) return;
      
      const won = teamData.score > oppData.score;
      const oppName = oppData.name;
      
      if (topHalfTeams.includes(oppName)) {
        vsTopTotal++;
        if (won) vsTopWins++;
      } else {
        vsBottomTotal++;
        if (won) vsBottomWins++;
      }
    });
    
    if (vsTopTotal < MIN_GAMES_PER_HALF || vsBottomTotal < MIN_GAMES_PER_HALF) return null;
    
    const topPct = (vsTopWins / vsTopTotal) * 100;
    const bottomPct = (vsBottomWins / vsBottomTotal) * 100;
    const diff = Math.abs(topPct - bottomPct);
    
    if (diff >= 40) {
      const better = topPct > bottomPct ? 'top' : 'bottom';
      
      // הסבר מפורט יותר
      const topHalfExplanation = `קבוצות בחצי העליון של הטבלה (מקומות 1-${midPoint})`;
      const bottomHalfExplanation = `קבוצות בחצי התחתון (מקומות ${midPoint + 1}+)`;
      
      return {
        type: 'SCHEDULE_STRENGTH',
        category: 'MOMENTUM',
        importance: 'high',
        teamName,
        vsTopRecord: `${vsTopWins}-${vsTopTotal - vsTopWins}`,
        vsBottomRecord: `${vsBottomWins}-${vsBottomTotal - vsBottomWins}`,
        topPct: topPct.toFixed(0),
        bottomPct: bottomPct.toFixed(0),
        icon: '📊',
        text: better === 'top' ? 
          `${teamName} מוכיחה את עצמה מול הגדולים! ${vsTopWins} ניצחונות מתוך ${vsTopTotal} משחקים נגד חצי עליון (${topPct.toFixed(0)}%), לעומת ${vsBottomWins} מתוך ${vsBottomTotal} נגד חצי תחתון (${bottomPct.toFixed(0)}%)` :
          `${teamName} מנצחת חלשים אבל נכשלת מול חזקים - ${vsBottomWins} ניצחונות מתוך ${vsBottomTotal} משחקים נגד חצי תחתון (${bottomPct.toFixed(0)}%), אבל רק ${vsTopWins} מתוך ${vsTopTotal} נגד חצי עליון (${topPct.toFixed(0)}%)`,
        textShort: `vs חצי עליון: ${vsTopWins}-${vsTopTotal - vsTopWins} (${topPct.toFixed(0)}%), vs תחתון: ${vsBottomWins}-${vsBottomTotal - vsBottomWins} (${bottomPct.toFixed(0)}%)`
      };
    }
    return null;
  }

  /**
   * זיהוי First Half vs Second Half Season - השוואת מחציות עונה
   */
  detectSeasonHalves(teamName, games) {
    const MIN_GAMES_HALF = 5;
    const CHANGE_THRESHOLD = 25; // 25% שינוי
    
    const teamGames = this.getTeamGames(games, teamName);
    
    if (teamGames.length < MIN_GAMES_HALF * 2) return null;
    
    const mid = Math.floor(teamGames.length / 2);
    const firstHalf = teamGames.slice(teamGames.length - mid - mid, teamGames.length - mid); // חציון ישן
    const secondHalf = teamGames.slice(teamGames.length - mid); // חציון חדש
    
    const firstWins = firstHalf.filter(g => {
      const teamData = this.getTeamFromGame(g, teamName);
      const oppData = this.getOpponentFromGame(g, teamName);
      return teamData && oppData && teamData.score > oppData.score;
    }).length;
    
    const secondWins = secondHalf.filter(g => {
      const teamData = this.getTeamFromGame(g, teamName);
      const oppData = this.getOpponentFromGame(g, teamName);
      return teamData && oppData && teamData.score > oppData.score;
    }).length;
    
    const firstWinPct = (firstWins / firstHalf.length) * 100;
    const secondWinPct = (secondWins / secondHalf.length) * 100;
    const change = secondWinPct - firstWinPct;
    
    if (Math.abs(change) >= CHANGE_THRESHOLD) {
      const trend = change > 0 ? 'משתפרת' : 'יורדת';
      const icon = change > 0 ? '📈' : '📉';
      return {
        type: 'SEASON_HALVES',
        category: 'MOMENTUM',
        importance: 'medium',
        teamName,
        icon,
        text: `${teamName} ${trend} במהלך העונה! מחצית ראשונה: ${firstWinPct.toFixed(0)}% (${firstWins}/${firstHalf.length}) → מחצית שנייה: ${secondWinPct.toFixed(0)}% (${secondWins}/${secondHalf.length})`,
        textShort: `${trend}: ${change > 0 ? '+' : ''}${change.toFixed(0)}%`
      };
    }
    return null;
  }

  /**
   * זיהוי Day of Week Performance - ביצועים לפי יום בשבוע
   */
  detectDayOfWeekPerformance(teamName, games) {
    const MIN_GAMES_DAY = 3;
    const WIN_PCT_THRESHOLD = 75; // 75%
    
    const teamGames = this.getTeamGames(games, teamName);
    const dayStats = {};
    
    teamGames.forEach(game => {
      const date = new Date(game.date);
      const dayName = date.toLocaleDateString('he-IL', { weekday: 'long' });
      
      if (!dayStats[dayName]) {
        dayStats[dayName] = { games: 0, wins: 0 };
      }
      
      dayStats[dayName].games++;
      
      const teamData = this.getTeamFromGame(game, teamName);
      const oppData = this.getOpponentFromGame(game, teamName);
      if (teamData && oppData && teamData.score > oppData.score) {
        dayStats[dayName].wins++;
      }
    });
    
    let bestDay = null;
    let bestWinPct = 0;
    
    Object.entries(dayStats).forEach(([day, stats]) => {
      if (stats.games < MIN_GAMES_DAY) return;
      
      const winPct = (stats.wins / stats.games) * 100;
      if (winPct > bestWinPct && winPct >= WIN_PCT_THRESHOLD) {
        bestWinPct = winPct;
        bestDay = { day, ...stats, winPct };
      }
    });
    
    if (bestDay) {
      // שימוש בטמפלט דינמי
      const text = window.IBBAInsightTemplates?.getRandomText('team', 'DAY_OF_WEEK', {
        teamName,
        day: bestDay.day,
        wins: bestDay.wins,
        games: bestDay.games,
        winPct: bestDay.winPct.toFixed(0)
      }) || `${teamName} חזקה ביום ${bestDay.day} - ${bestDay.wins}/${bestDay.games} ניצחונות`;
      
      return {
        type: 'DAY_OF_WEEK',
        category: 'MOMENTUM',
        importance: 'low',
        teamName,
        icon: '📅',
        text,
        textShort: `${bestDay.day}: ${bestDay.winPct.toFixed(0)}%`
      };
    }
    return null;
  }

  // ========== CATEGORY 6: H2H ADVANCED ==========

  /**
   * ניתוח מפגשים ישירים לפי מיקום (H2H Venue)
   */
  analyzeH2HVenue(teamA, teamB, h2hGames) {
    const MIN_GAMES = 4;
    
    if (!h2hGames || h2hGames.length < MIN_GAMES) return null;
    
    const homeGames = h2hGames.filter(g => g.teamAHome === true);
    const awayGames = h2hGames.filter(g => g.teamAHome === false);
    
    if (homeGames.length === 0 || awayGames.length === 0) return null;
    
    const homeWins = homeGames.filter(g => g.winner === teamA).length;
    const awayWins = awayGames.filter(g => g.winner === teamA).length;
    
    const homePct = (homeWins / homeGames.length) * 100;
    const awayPct = (awayWins / awayGames.length) * 100;
    
    if (Math.abs(homePct - awayPct) >= 40) {
      return {
        type: 'H2H_VENUE',
        category: 'H2H',
        importance: 'high',
        teamA,
        teamB,
        homeRecord: `${homeWins}-${homeGames.length - homeWins}`,
        awayRecord: `${awayWins}-${awayGames.length - awayWins}`,
        icon: '📍',
        text: `יתרון מגרש במפגשים: ${teamA} ${homeWins}-${homeGames.length - homeWins} בבית, ${awayWins}-${awayGames.length - awayWins} בחוץ נגד ${teamB}`,
        textShort: `בבית: ${homeWins}-${homeGames.length - homeWins}, בחוץ: ${awayWins}-${awayGames.length - awayWins}`
      };
    }
    return null;
  }

  /**
   * מגמת הפרשים במפגשים (H2H Margin Trend)
   */
  analyzeH2HMarginTrend(teamA, teamB, h2hGames) {
    const MIN_GAMES = 4;
    
    if (!h2hGames || h2hGames.length < MIN_GAMES) return null;
    
    // מיון לפי תאריך (ישן לחדש)
    const sorted = [...h2hGames].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // חישוב מגמה
    const margins = sorted.map(g => {
      const margin = g.teamAScore - g.teamBScore;
      return margin;
    });
    
    // חלק לחציים
    const mid = Math.floor(margins.length / 2);
    const firstHalf = margins.slice(0, mid);
    const secondHalf = margins.slice(mid);
    
    const firstAvg = firstHalf.reduce((sum, m) => sum + m, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, m) => sum + m, 0) / secondHalf.length;
    
    const change = secondAvg - firstAvg;
    
    if (Math.abs(change) >= 8) {
      const improving = change > 0;
      return {
        type: 'H2H_MARGIN_TREND',
        category: 'H2H',
        importance: 'medium',
        teamA,
        teamB,
        firstAvg: firstAvg.toFixed(1),
        secondAvg: secondAvg.toFixed(1),
        change: change.toFixed(1),
        improving,
        icon: improving ? '📈' : '📉',
        text: improving ?
          `${teamA} מצמצמת את הפער מול ${teamB} - ממוצע של ${secondAvg > 0 ? '+' : ''}${secondAvg.toFixed(1)} נק' במפגשים אחרונים לעומת ${firstAvg > 0 ? '+' : ''}${firstAvg.toFixed(1)} במפגשים ראשונים` :
          `הפער בין ${teamA} ל-${teamB} גדל - ${firstAvg > 0 ? '+' : ''}${firstAvg.toFixed(1)} נק' במפגשים ראשונים ירד ל-${secondAvg > 0 ? '+' : ''}${secondAvg.toFixed(1)} במפגשים אחרונים`,
        textShort: `${improving ? 'מצמצמת' : 'מרחיבה'} הפער במפגשים`
      };
    }
    return null;
  }

  /**
   * זיהוי H2H Top Scorer - השחקן המוביל במפגשים ישירים
   */
  detectH2HTopScorer(teamA, teamB, games, h2h) {
    if (!h2h || h2h.totalGames < 3) return null;
    
    const h2hGames = games.filter(g => 
      (g.homeTeam === teamA && g.awayTeam === teamB) ||
      (g.homeTeam === teamB && g.awayTeam === teamA)
    );
    
    const playerH2HPoints = {};
    
    h2hGames.forEach(game => {
      game.players?.forEach(player => {
        const pid = player.playerId;
        if (!playerH2HPoints[pid]) {
          playerH2HPoints[pid] = {
            playerId: pid,
            jersey: player.jersey,
            teamName: player.teamName,
            games: 0,
            points: 0
          };
        }
        playerH2HPoints[pid].games++;
        playerH2HPoints[pid].points += player.stats?.points || 0;
      });
    });
    
    let topScorer = null;
    let maxPpg = 0;
    
    Object.values(playerH2HPoints).forEach(p => {
      if (p.games < 2) return;
      
      const ppg = p.points / p.games;
      if (ppg > maxPpg && ppg >= 15) {
        maxPpg = ppg;
        topScorer = p;
      }
    });
    
    if (topScorer) {
      const playerName = this.getPlayerDisplayName(topScorer.playerId, topScorer.jersey);
      return {
        type: 'H2H_TOP_SCORER',
        category: 'H2H',
        importance: 'high',
        teamName: topScorer.teamName,
        playerName,
        icon: '🎯',
        text: `${playerName} מ-${topScorer.teamName} שולט במפגשים! ${maxPpg.toFixed(1)} נק' בממוצע במפגשים ישירים (${topScorer.games} משחקים)`,
        textShort: `${playerName}: ${maxPpg.toFixed(1)} נק' במפגשים`
      };
    }
    return null;
  }

  /**
   * זיהוי H2H Flip - שינוי דומיננטיות במפגשים
   */
  detectH2HFlip(teamA, teamB, games) {
    const h2hGames = games.filter(g => 
      (g.homeTeam === teamA && g.awayTeam === teamB) ||
      (g.homeTeam === teamB && g.awayTeam === teamA)
    ).sort((a, b) => new Date(a.date) - new Date(b.date));
    
    if (h2hGames.length < 6) return null;
    
    const mid = Math.floor(h2hGames.length / 2);
    const firstHalf = h2hGames.slice(0, mid);
    const secondHalf = h2hGames.slice(mid);
    
    const firstHalfWinsA = firstHalf.filter(g => {
      const teamAData = this.getTeamFromGame(g, teamA);
      const teamBData = this.getTeamFromGame(g, teamB);
      return teamAData && teamBData && teamAData.score > teamBData.score;
    }).length;
    
    const secondHalfWinsA = secondHalf.filter(g => {
      const teamAData = this.getTeamFromGame(g, teamA);
      const teamBData = this.getTeamFromGame(g, teamB);
      return teamAData && teamBData && teamAData.score > teamBData.score;
    }).length;
    
    const firstHalfWinsB = firstHalf.length - firstHalfWinsA;
    const secondHalfWinsB = secondHalf.length - secondHalfWinsA;
    
    // בדוק אם יש היפוך משמעותי (70%+)
    const firstThreshold = mid * 0.7;
    const secondThreshold = secondHalf.length * 0.7;
    
    if (firstHalfWinsA >= firstThreshold && secondHalfWinsB >= secondThreshold) {
      return {
        type: 'H2H_FLIP',
        category: 'H2H',
        importance: 'high',
        teamA, teamB,
        icon: '🔄',
        text: `שינוי כיוון במפגשים! ${teamA} שלטה בתחילה (${firstHalfWinsA}/${mid}), אבל ${teamB} זוכה לאחרונה (${secondHalfWinsB}/${secondHalf.length})`,
        textShort: `${teamB} הפכה את המגמה`
      };
    } else if (firstHalfWinsB >= firstThreshold && secondHalfWinsA >= secondThreshold) {
      return {
        type: 'H2H_FLIP',
        category: 'H2H',
        importance: 'high',
        teamA, teamB,
        icon: '🔄',
        text: `שינוי כיוון במפגשים! ${teamB} שלטה בתחילה (${firstHalfWinsB}/${mid}), אבל ${teamA} זוכה לאחרונה (${secondHalfWinsA}/${secondHalf.length})`,
        textShort: `${teamA} הפכה את המגמה`
      };
    }
    return null;
  }

  // ========== CATEGORY 7: QUARTERS ==========

  // ❌ detectFirstQuarterTeam הוסר - היה כפילות עם detectQuarterDominance

  /**
   * זיהוי Slow Starters - מפגרת במחצית אבל מנצחת
   */
  detectSlowStarters(teamName, games) {
    const MIN_GAMES = 5;
    const THRESHOLD = 0.5; // 50%
    
    const teamGames = this.getTeamGames(games, teamName);
    let comebackWins = 0;
    let halftimeDeficits = 0;
    
    teamGames.forEach(game => {
      if (!game.quarters) return;
      
      const teamData = this.getTeamFromGame(game, teamName);
      const oppData = this.getOpponentFromGame(game, teamName);
      if (!teamData || !oppData) return;
      
      const isHome = teamData.isHome;
      
      // חישוב מצב במחצית
      const teamH1 = (isHome ? game.quarters.q1.home : game.quarters.q1.away) +
                     (isHome ? game.quarters.q2.home : game.quarters.q2.away);
      const oppH1 = (isHome ? game.quarters.q1.away : game.quarters.q1.home) +
                    (isHome ? game.quarters.q2.away : game.quarters.q2.home);
      
      // פיגור במחצית
      if (teamH1 < oppH1) {
        halftimeDeficits++;
        // ניצחון במשחק
        if (teamData.score > oppData.score) {
          comebackWins++;
        }
      }
    });
    
    if (halftimeDeficits < MIN_GAMES) return null;
    
    const comebackPct = comebackWins / halftimeDeficits;
    
    if (comebackPct >= THRESHOLD) {
      return {
        type: 'SLOW_STARTERS',
        category: 'QUARTERS',
        importance: 'high',
        teamName,
        comebackWins,
        halftimeDeficits,
        percentage: (comebackPct * 100).toFixed(0),
        icon: '🐢',
        text: `${teamName} מתחילה לאט אבל מסיימת חזק - ${comebackWins} ניצחונות מתוך ${halftimeDeficits} משחקים שבהם פיגרה במחצית המשחק (${(comebackPct * 100).toFixed(0)}%)`,
        textShort: `${comebackWins}/${halftimeDeficits} קאמבקים ממחצית`
      };
    }
    return null;
  }

  /**
   * זיהוי Comeback Kings - הפכה פיגור גדול
   */
  detectComebackKings(teamName, games) {
    const MIN_COMEBACKS = 2;
    const DEFICIT_THRESHOLD = 10;
    
    const teamGames = this.getTeamGames(games, teamName);
    let bigComebacks = 0;
    
    teamGames.forEach(game => {
      if (!game.quarters) return;
      
      const teamData = this.getTeamFromGame(game, teamName);
      const oppData = this.getOpponentFromGame(game, teamName);
      if (!teamData || !oppData) return;
      
      const isHome = teamData.isHome;
      
      // מצא את הפיגור המקסימלי (בדוק כל רבע)
      let maxDeficit = 0;
      let runningTeam = 0;
      let runningOpp = 0;
      
      ['q1', 'q2', 'q3'].forEach(quarter => {
        runningTeam += isHome ? game.quarters[quarter].home : game.quarters[quarter].away;
        runningOpp += isHome ? game.quarters[quarter].away : game.quarters[quarter].home;
        const deficit = runningOpp - runningTeam;
        if (deficit > maxDeficit) maxDeficit = deficit;
      });
      
      // פיגור גדול וניצחון
      if (maxDeficit >= DEFICIT_THRESHOLD && teamData.score > oppData.score) {
        bigComebacks++;
      }
    });
    
    if (bigComebacks >= MIN_COMEBACKS) {
      // שימוש בטמפלט דינמי
      const text = window.IBBAInsightTemplates?.getRandomText('team', 'COMEBACK_KINGS', {
        teamName,
        comebacks: bigComebacks,
        deficitThreshold: DEFICIT_THRESHOLD
      }) || `${teamName} מגיעה עם יכולת קאמבק חריגה – ${bigComebacks} ניצחונות אחרי פיגור של ${DEFICIT_THRESHOLD}+ נקודות`;
      
      return {
        type: 'COMEBACK_KINGS',
        category: 'QUARTERS',
        importance: 'high',
        teamName,
        comebacks: bigComebacks,
        icon: '👑',
        text,
        textShort: `${bigComebacks} קאמבקים מפיגור גדול`
      };
    }
    return null;
  }

  /**
   * זיהוי Fourth Quarter Collapse - מפסידה רבעים רביעיים
   */
  detectFourthQuarterCollapse(teamName, games) {
    const MIN_GAMES = 5;
    const THRESHOLD = 70; // 70%
    
    const teamGames = this.getTeamGames(games, teamName).slice(-10);
    let q4Losses = 0;
    let gamesWithQ4Data = 0;
    
    teamGames.forEach(game => {
      if (!game.quarters) return;
      
      const teamData = this.getTeamFromGame(game, teamName);
      const oppData = this.getOpponentFromGame(game, teamName);
      if (!teamData || !oppData) return;
      
      const isHome = teamData.isHome;
      const q4Team = isHome ? game.quarters.q4.home : game.quarters.q4.away;
      const q4Opp = isHome ? game.quarters.q4.away : game.quarters.q4.home;
      
      if (q4Team !== undefined && q4Opp !== undefined) {
        gamesWithQ4Data++;
        if (q4Team < q4Opp) {
          q4Losses++;
        }
      }
    });
    
    if (gamesWithQ4Data < MIN_GAMES) return null;
    
    const q4LossPct = (q4Losses / gamesWithQ4Data) * 100;
    
    if (q4LossPct >= THRESHOLD) {
      // שימוש בטמפלט דינמי
      const text = window.IBBAInsightTemplates?.getRandomText('team', 'FOURTH_QUARTER_COLLAPSE', {
        teamName,
        q4Losses,
        gamesWithQ4Data
      }) || `${teamName} מגיעה עם סימן שאלה ברבע הסיום – הפסידה ${q4Losses} מתוך ${gamesWithQ4Data} רבעים רביעיים בעונה`;
      
      return {
        type: 'FOURTH_QUARTER_COLLAPSE',
        category: 'QUARTERS',
        importance: 'high',
        teamName,
        value: q4LossPct.toFixed(0),
        icon: '📉',
        text,
        textShort: `${q4Losses}/${gamesWithQ4Data} הפסדי רבע 4`
      };
    }
    return null;
  }

  /**
   * זיהוי Best Quarter - הרבע הכי חזק
   */
  detectBestQuarter(teamName, games) {
    const MIN_GAMES = 5;
    const MIN_DIFF = 2.5; // הפרש ממוצע מינימלי
    
    const teamGames = this.getTeamGames(games, teamName).slice(-10);
    const quarterDiffs = { q1: [], q2: [], q3: [], q4: [] };
    
    teamGames.forEach(game => {
      if (!game.quarters) return;
      
      const teamData = this.getTeamFromGame(game, teamName);
      const oppData = this.getOpponentFromGame(game, teamName);
      if (!teamData || !oppData) return;
      
      const isHome = teamData.isHome;
      
      ['q1', 'q2', 'q3', 'q4'].forEach(q => {
        const teamQ = isHome ? game.quarters[q].home : game.quarters[q].away;
        const oppQ = isHome ? game.quarters[q].away : game.quarters[q].home;
        
        if (teamQ !== undefined && oppQ !== undefined) {
          quarterDiffs[q].push(teamQ - oppQ);
        }
      });
    });
    
    // מצא את הרבע הכי טוב (ממוצע הפרש חיובי הכי גבוה)
    let bestQuarter = null;
    let bestAvgDiff = -999;
    
    Object.keys(quarterDiffs).forEach(q => {
      if (quarterDiffs[q].length >= MIN_GAMES) {
        const avg = quarterDiffs[q].reduce((a, b) => a + b, 0) / quarterDiffs[q].length;
        if (avg > bestAvgDiff && avg >= MIN_DIFF) {
          bestAvgDiff = avg;
          bestQuarter = q;
        }
      }
    });
    
    if (bestQuarter) {
      const qNum = bestQuarter.replace('q', '');
      const quarterName = qNum === '1' ? 'הראשון' : qNum === '2' ? 'השני' : qNum === '3' ? 'השלישי' : 'הרביעי';
      
      // שימוש בטמפלט דינמי
      const text = window.IBBAInsightTemplates?.getRandomText('team', 'BEST_QUARTER', {
        quarterName,
        teamName,
        diff: bestAvgDiff.toFixed(1)
      }) || `הרבע ${quarterName} הוא נקודת חוזק של ${teamName} בעונה – +${bestAvgDiff.toFixed(1)} נק' בממוצע ברבע הזה`;
      
      return {
        type: 'BEST_QUARTER',
        category: 'QUARTERS',
        importance: 'low',
        teamName,
        value: bestAvgDiff.toFixed(1),
        icon: '⏱️',
        text,
        textShort: `רבע ${qNum}: +${bestAvgDiff.toFixed(1)} נק'`
      };
    }
    return null;
  }

  /**
   * זיהוי Quarter Dominance - שליטה ברבע ספציפי
   */
  detectQuarterDominance(teamName, games) {
    const MIN_GAMES = 5;
    const THRESHOLD = 70; // 70%
    
    const teamGames = this.getTeamGames(games, teamName).slice(-10);
    const quarterWins = { q1: 0, q2: 0, q3: 0, q4: 0 };
    const quarterGames = { q1: 0, q2: 0, q3: 0, q4: 0 };
    
    teamGames.forEach(game => {
      if (!game.quarters) return;
      
      const teamData = this.getTeamFromGame(game, teamName);
      const oppData = this.getOpponentFromGame(game, teamName);
      if (!teamData || !oppData) return;
      
      const isHome = teamData.isHome;
      
      ['q1', 'q2', 'q3', 'q4'].forEach(q => {
        const teamQ = isHome ? game.quarters[q].home : game.quarters[q].away;
        const oppQ = isHome ? game.quarters[q].away : game.quarters[q].home;
        
        if (teamQ !== undefined && oppQ !== undefined) {
          quarterGames[q]++;
          if (teamQ > oppQ) {
            quarterWins[q]++;
          }
        }
      });
    });
    
    // מצא רבע עם דומיננטיות
    for (const q of ['q1', 'q2', 'q3', 'q4']) {
      if (quarterGames[q] >= MIN_GAMES) {
        const winPct = (quarterWins[q] / quarterGames[q]) * 100;
        
        if (winPct >= THRESHOLD) {
          const qNum = q.replace('q', '');
          return {
            type: 'QUARTER_DOMINANCE',
            category: 'QUARTERS',
            importance: 'medium',
            teamName,
            value: winPct.toFixed(0),
            icon: '👑',
            text: `${teamName} שולטת ברבע ${qNum} - ניצחה ${quarterWins[q]}/${quarterGames[q]} רבעים (${winPct.toFixed(0)}%)`,
            textShort: `שליטה ברבע ${qNum}`
          };
        }
      }
    }
    return null;
  }

  // ========== CATEGORY 8: LEAGUE ==========

  /**
   * זיהוי League Leader - מובילה את הליגה בקטגוריות
   */
  detectLeagueLeader(teamName, teamData, allTeams) {
    const categories = {
      ppg: { label: 'בניקוד', icon: '🎯', ascending: false },
      rpg: { label: 'בריבאונדים', icon: '🏀', ascending: false },
      apg: { label: 'באסיסטים', icon: '🤝', ascending: false },
      spg: { label: 'בחטיפות', icon: '🏃', ascending: false },
      bpg: { label: 'בחסימות', icon: '🚫', ascending: false },
      oppPpg: { label: 'בהגנה', icon: '🛡️', ascending: true }
    };
    
    const leaderCategories = [];
    
    Object.entries(categories).forEach(([metric, info]) => {
      const rank = this.getTeamRankInCategory(teamName, metric, allTeams, info.ascending);
      
      if (rank === 1 || rank === 2) {
        leaderCategories.push({
          metric,
          rank,
          value: parseFloat(teamData[metric] || 0).toFixed(1),
          label: info.label,
          icon: info.icon
        });
      }
    });
    
    if (leaderCategories.length >= 2) {
      const topCat = leaderCategories[0];
      const secondCat = leaderCategories[1];
      
      // נוסח לפי מספר מקומות ראשונים
      const hasFirstPlace = leaderCategories.some(c => c.rank === 1);
      const leaderText = hasFirstPlace ? 'בין המובילות בליגה' : 'במקומות הראשונים בליגה';
      
      return {
        type: 'LEAGUE_LEADER',
        category: 'LEAGUE',
        importance: 'high',
        teamName,
        icon: '🏆',
        text: `${teamName} ${leaderText}! ${topCat.icon} מקום ${topCat.rank} ${topCat.label} (${topCat.value}), ${secondCat.icon} מקום ${secondCat.rank} ${secondCat.label} (${secondCat.value})`,
        textShort: `${leaderText}: ${topCat.label} + ${secondCat.label}`
      };
    }
    return null;
  }

  /**
   * זיהוי Above/Below Average - מעל/מתחת לממוצע הליגה
   */
  detectAboveBelowAverage(teamName, teamData, allTeams) {
    const metrics = {
      ppg: { label: 'ניקוד', icon: '🎯' },
      rpg: { label: 'ריבאונדים', icon: '🏀' },
      apg: { label: 'אסיסטים', icon: '🤝' },
      spg: { label: 'חטיפות', icon: '🏃' }
    };
    
    const aboveCategories = [];
    const belowCategories = [];
    
    Object.entries(metrics).forEach(([metric, info]) => {
      const teamVal = parseFloat(teamData[metric]) || 0;
      const leagueAvg = this.getLeagueAverage(metric, allTeams);
      const diff = teamVal - leagueAvg;
      const stdDev = this.calculateStdDev(allTeams.map(t => parseFloat(t[metric]) || 0));
      
      if (diff > stdDev) {
        aboveCategories.push({
          metric,
          label: info.label,
          icon: info.icon,
          value: teamVal.toFixed(1)
        });
      } else if (diff < -stdDev) {
        belowCategories.push({
          metric,
          label: info.label,
          icon: info.icon,
          value: teamVal.toFixed(1)
        });
      }
    });
    
    if (aboveCategories.length >= 3) {
      // יצירת רשימת קטגוריות עם אייקונים
      const categoriesList = aboveCategories
        .map(cat => `${cat.icon} ${cat.label} (${cat.value})`)
        .join(', ');
      
      return {
        type: 'ABOVE_AVERAGE',
        category: 'LEAGUE',
        importance: 'medium',
        teamName,
        icon: '⭐',
        text: `${teamName} מעל הממוצע! ${categoriesList}`,
        textShort: `מעל ממוצע ב-${aboveCategories.length} קטגוריות`
      };
    } else if (belowCategories.length >= 3) {
      // יצירת רשימת קטגוריות עם אייקונים
      const categoriesList = belowCategories
        .map(cat => `${cat.icon} ${cat.label} (${cat.value})`)
        .join(', ');
      
      return {
        type: 'BELOW_AVERAGE',
        category: 'LEAGUE',
        importance: 'low',
        teamName,
        icon: '📉',
        text: `${teamName} מתחת לממוצע: ${categoriesList}`,
        textShort: `מתחת לממוצע ב-${belowCategories.length} קטגוריות`
      };
    }
    return null;
  }

  // ========== MAIN GENERATOR ==========

  /**
   * יצירת כל ה-Insights לדוח משחק
   */
  generateMatchupInsights(teamA, teamB, reportData) {
    const insights = {
      STREAKS: [],
      PLAYERS: [],
      OFFENSE: [],
      DEFENSE: [],
      MOMENTUM: [],
      H2H: [],
      QUARTERS: [],
      LEAGUE: []
    };

    const { games, teamAData, teamBData, h2h, standings } = reportData;
    const allTeams = this.analytics.getTeamAverages();
    
    // מצא דירוגים
    const rankA = standings?.find(s => s.teamName === teamA)?.rank || null;
    const rankB = standings?.find(s => s.teamName === teamB)?.rank || null;
    
    // חישוב ממוצעי ליגה
    const leagueAvgOppPpg = this.getLeagueAverage('oppPpg', allTeams);
    const leagueAvgSpg = this.getLeagueAverage('spg', allTeams);

    // STREAKS - מגוון רחב יותר (עם דירוג)
    const winStreakA = this.detectWinningStreak(teamA, games, rankA);
    if (winStreakA) insights.STREAKS.push(winStreakA);
    
    const winStreakB = this.detectWinningStreak(teamB, games, rankB);
    if (winStreakB) insights.STREAKS.push(winStreakB);
    
    const clutchA = this.detectClutchStreak(teamA, games, rankA);
    if (clutchA) insights.STREAKS.push(clutchA);
    
    const clutchB = this.detectClutchStreak(teamB, games, rankB);
    if (clutchB) insights.STREAKS.push(clutchB);
    
    const losingA = this.detectLosingStreak(teamA, games, rankA);
    if (losingA) insights.STREAKS.push(losingA);
    
    const losingB = this.detectLosingStreak(teamB, games, rankB);
    if (losingB) insights.STREAKS.push(losingB);
    
    const blowoutA = this.detectBlowoutWins(teamA, games, rankA);
    if (blowoutA) insights.STREAKS.push(blowoutA);
    
    const blowoutB = this.detectBlowoutWins(teamB, games, rankB);
    if (blowoutB) insights.STREAKS.push(blowoutB);
    
    const closeLossesA = this.detectCloseLosses(teamA, games, rankA);
    if (closeLossesA) insights.STREAKS.push(closeLossesA);
    
    const closeLossesB = this.detectCloseLosses(teamB, games, rankB);
    if (closeLossesB) insights.STREAKS.push(closeLossesB);

    // PLAYERS - גיוון רחב, נבחר רק אחד לכל קבוצה
    const playerInsightsA = [];
    const playerInsightsB = [];
    
    // קבוצה A - נסה סוגים שונים
    playerInsightsA.push(this.detectHotHand(teamA, games));
    playerInsightsA.push(this.detectColdSpell(teamA, games));
    playerInsightsA.push(this.detectKillerVsTeam(teamA, teamB, games));
    playerInsightsA.push(this.detectTeamLeader(teamA, games, teamAData.stats));
    playerInsightsA.push(this.detectDoubleDoubleMachine(teamA, games));
    playerInsightsA.push(this.detectAssistMachine(teamA, games));
    playerInsightsA.push(this.detectReboundMachine(teamA, games));
    playerInsightsA.push(this.detectMrConsistent(teamA, games));
    playerInsightsA.push(this.detectBoomOrBust(teamA, games));
    playerInsightsA.push(this.detectHomeCourtHero(teamA, games));
    playerInsightsA.push(this.detectRisingStar(teamA, games));
    
    // קבוצה B - נסה סוגים שונים
    playerInsightsB.push(this.detectHotHand(teamB, games));
    playerInsightsB.push(this.detectColdSpell(teamB, games));
    playerInsightsB.push(this.detectKillerVsTeam(teamB, teamA, games));
    playerInsightsB.push(this.detectTeamLeader(teamB, games, teamBData.stats));
    playerInsightsB.push(this.detectDoubleDoubleMachine(teamB, games));
    playerInsightsB.push(this.detectAssistMachine(teamB, games));
    playerInsightsB.push(this.detectReboundMachine(teamB, games));
    playerInsightsB.push(this.detectMrConsistent(teamB, games));
    playerInsightsB.push(this.detectBoomOrBust(teamB, games));
    playerInsightsB.push(this.detectHomeCourtHero(teamB, games));
    playerInsightsB.push(this.detectRisingStar(teamB, games));
    
    // הוסף רק את הראשון שנמצא לכל קבוצה (למנוע דופליקטים)
    const insightA = playerInsightsA.find(i => i !== null);
    if (insightA) insights.PLAYERS.push(insightA);
    
    const insightB = playerInsightsB.find(i => i !== null);
    // אם זה אותו סוג כמו A, נסה למצוא אחר
    if (insightB) {
      if (!insightA || insightA.type !== insightB.type) {
        insights.PLAYERS.push(insightB);
      } else {
        // מצא insight שונה לקבוצה B
        const alternativeB = playerInsightsB.find(i => i !== null && i.type !== insightA.type);
        if (alternativeB) insights.PLAYERS.push(alternativeB);
      }
    }

    // OFFENSE - גיוון רחב
    const leagueAvgPpg = this.getLeagueAverage('ppg', allTeams);
    
    const threePtDepA = this.detectThreePointDependent(teamA, teamAData.stats, allTeams);
    if (threePtDepA) insights.OFFENSE.push(threePtDepA);
    
    const threePtDepB = this.detectThreePointDependent(teamB, teamBData.stats, allTeams);
    if (threePtDepB) insights.OFFENSE.push(threePtDepB);
    
    const paintA = this.detectPaintDominators(teamA, teamAData.stats, allTeams[0]);
    if (paintA) insights.OFFENSE.push(paintA);
    
    const paintB = this.detectPaintDominators(teamB, teamBData.stats, allTeams[0]);
    if (paintB) insights.OFFENSE.push(paintB);
    
    const assistA = this.detectAssistHeavy(teamA, teamAData.stats, allTeams);
    if (assistA) insights.OFFENSE.push(assistA);
    
    const assistB = this.detectAssistHeavy(teamB, teamBData.stats, allTeams);
    if (assistB) insights.OFFENSE.push(assistB);
    
    const ftFactoryA = this.detectFreeThrowFactory(teamA, teamAData.stats);
    if (ftFactoryA) insights.OFFENSE.push(ftFactoryA);
    
    const ftFactoryB = this.detectFreeThrowFactory(teamB, teamBData.stats);
    if (ftFactoryB) insights.OFFENSE.push(ftFactoryB);
    
    const highScoringA = this.detectHighScoringOffense(teamA, teamAData.stats, leagueAvgPpg, allTeams);
    if (highScoringA) insights.OFFENSE.push(highScoringA);
    
    const highScoringB = this.detectHighScoringOffense(teamB, teamBData.stats, leagueAvgPpg, allTeams);
    if (highScoringB) insights.OFFENSE.push(highScoringB);
    
    // סטטיסטיקות מתקדמות (חדש)
    const fastBreakA = this.detectFastBreakKings(teamA, teamAData.stats, allTeams);
    if (fastBreakA) insights.OFFENSE.push(fastBreakA);
    
    const fastBreakB = this.detectFastBreakKings(teamB, teamBData.stats, allTeams);
    if (fastBreakB) insights.OFFENSE.push(fastBreakB);
    
    const paintDomA = this.detectPaintDominance(teamA, teamAData.stats, allTeams);
    if (paintDomA) insights.OFFENSE.push(paintDomA);
    
    const paintDomB = this.detectPaintDominance(teamB, teamBData.stats, allTeams);
    if (paintDomB) insights.OFFENSE.push(paintDomB);
    
    const benchA = this.detectBenchPower(teamA, teamAData.stats, allTeams);
    if (benchA) insights.OFFENSE.push(benchA);
    
    const benchB = this.detectBenchPower(teamB, teamBData.stats, allTeams);
    if (benchB) insights.OFFENSE.push(benchB);
    
    // חמישייה מול ספסל - תמיד מעניין לשידור
    const startingVsBenchA = this.detectStartingVsBench(teamA, teamAData.stats, allTeams);
    if (startingVsBenchA) insights.OFFENSE.push(startingVsBenchA);
    
    const startingVsBenchB = this.detectStartingVsBench(teamB, teamBData.stats, allTeams);
    if (startingVsBenchB) insights.OFFENSE.push(startingVsBenchB);
    
    const secondChanceA = this.detectSecondChanceMasters(teamA, teamAData.stats, allTeams);
    if (secondChanceA) insights.OFFENSE.push(secondChanceA);
    
    const secondChanceB = this.detectSecondChanceMasters(teamB, teamBData.stats, allTeams);
    if (secondChanceB) insights.OFFENSE.push(secondChanceB);
    
    // Bench & Lineup Analysis (New v2.2.7)
    const strongBenchA = this.detectStrongBench(teamA, teamAData.stats, allTeams);
    if (strongBenchA) insights.OFFENSE.push(strongBenchA);
    
    const strongBenchB = this.detectStrongBench(teamB, teamBData.stats, allTeams);
    if (strongBenchB) insights.OFFENSE.push(strongBenchB);
    
    const lineupDepA = this.detectLineupDependent(teamA, teamAData.stats, allTeams);
    if (lineupDepA) insights.OFFENSE.push(lineupDepA);
    
    const lineupDepB = this.detectLineupDependent(teamB, teamBData.stats, allTeams);
    if (lineupDepB) insights.OFFENSE.push(lineupDepB);
    
    const superSubA = this.detectSuperSub(teamA, teamAData.recentGames);
    if (superSubA) insights.PLAYERS.push(superSubA);
    
    const superSubB = this.detectSuperSub(teamB, teamBData.recentGames);
    if (superSubB) insights.PLAYERS.push(superSubB);

    // DEFENSE
    const defWallA = this.detectDefensiveWall(teamA, teamAData.stats, leagueAvgOppPpg, allTeams);
    if (defWallA) insights.DEFENSE.push(defWallA);
    
    const defWallB = this.detectDefensiveWall(teamB, teamBData.stats, leagueAvgOppPpg, allTeams);
    if (defWallB) insights.DEFENSE.push(defWallB);
    
    const reboundDom = this.detectReboundDominance(teamA, teamAData.stats, teamBData.stats);
    if (reboundDom) insights.DEFENSE.push(reboundDom);
    
    const toCreatorsA = this.detectTurnoverCreators(teamA, teamAData.stats, leagueAvgSpg, allTeams);
    if (toCreatorsA) insights.DEFENSE.push(toCreatorsA);
    
    const toCreatorsB = this.detectTurnoverCreators(teamB, teamBData.stats, leagueAvgSpg, allTeams);
    if (toCreatorsB) insights.DEFENSE.push(toCreatorsB);
    
    const blockA = this.detectBlockParty(teamA, games, teamAData.stats, allTeams);
    if (blockA) insights.DEFENSE.push(blockA);
    
    const blockB = this.detectBlockParty(teamB, games, teamBData.stats, allTeams);
    if (blockB) insights.DEFENSE.push(blockB);
    
    const threePDefA = this.detectThreePointDefense(teamA, games, allTeams);
    if (threePDefA) insights.DEFENSE.push(threePDefA);
    
    const threePDefB = this.detectThreePointDefense(teamB, games, allTeams);
    if (threePDefB) insights.DEFENSE.push(threePDefB);
    
    const turnoverCapA = this.detectTurnoverCapitalization(teamA, teamAData.stats, allTeams);
    if (turnoverCapA) insights.DEFENSE.push(turnoverCapA);
    
    const turnoverCapB = this.detectTurnoverCapitalization(teamB, teamBData.stats, allTeams);
    if (turnoverCapB) insights.DEFENSE.push(turnoverCapB);

    // MOMENTUM
    const pdTrendA = this.detectPointDiffTrend(teamA, games);
    if (pdTrendA) insights.MOMENTUM.push(pdTrendA);
    
    const pdTrendB = this.detectPointDiffTrend(teamB, games);
    if (pdTrendB) insights.MOMENTUM.push(pdTrendB);
    
    const schedStrA = this.detectScheduleStrength(teamA, games, standings);
    if (schedStrA) insights.MOMENTUM.push(schedStrA);
    
    const schedStrB = this.detectScheduleStrength(teamB, games, standings);
    if (schedStrB) insights.MOMENTUM.push(schedStrB);
    
    const seasonHalvesA = this.detectSeasonHalves(teamA, games);
    if (seasonHalvesA) insights.MOMENTUM.push(seasonHalvesA);
    
    const seasonHalvesB = this.detectSeasonHalves(teamB, games);
    if (seasonHalvesB) insights.MOMENTUM.push(seasonHalvesB);
    
    const dayOfWeekA = this.detectDayOfWeekPerformance(teamA, games);
    if (dayOfWeekA) insights.MOMENTUM.push(dayOfWeekA);
    
    const dayOfWeekB = this.detectDayOfWeekPerformance(teamB, games);
    if (dayOfWeekB) insights.MOMENTUM.push(dayOfWeekB);

    // H2H
    if (h2h && h2h.games && h2h.games.length > 0) {
      const h2hVenue = this.analyzeH2HVenue(teamA, teamB, h2h.games);
      if (h2hVenue) insights.H2H.push(h2hVenue);
      
      const h2hMargin = this.analyzeH2HMarginTrend(teamA, teamB, h2h.games);
      if (h2hMargin) insights.H2H.push(h2hMargin);
      
      const h2hTopScorer = this.detectH2HTopScorer(teamA, teamB, games, h2h);
      if (h2hTopScorer) insights.H2H.push(h2hTopScorer);
      
      const h2hFlip = this.detectH2HFlip(teamA, teamB, games);
      if (h2hFlip) insights.H2H.push(h2hFlip);
    }

    // QUARTERS
    // ✅ detectFirstQuarterTeam הוסר - detectQuarterDominance עושה את אותו הדבר (לכל הרבעים)
    
    const slowStartA = this.detectSlowStarters(teamA, games);
    if (slowStartA) insights.QUARTERS.push(slowStartA);
    
    const slowStartB = this.detectSlowStarters(teamB, games);
    if (slowStartB) insights.QUARTERS.push(slowStartB);
    
    const comebackA = this.detectComebackKings(teamA, games);
    if (comebackA) insights.QUARTERS.push(comebackA);
    
    const comebackB = this.detectComebackKings(teamB, games);
    if (comebackB) insights.QUARTERS.push(comebackB);
    
    const q4CollapseA = this.detectFourthQuarterCollapse(teamA, games);
    if (q4CollapseA) insights.QUARTERS.push(q4CollapseA);
    
    const q4CollapseB = this.detectFourthQuarterCollapse(teamB, games);
    if (q4CollapseB) insights.QUARTERS.push(q4CollapseB);
    
    const bestQuarterA = this.detectBestQuarter(teamA, games);
    if (bestQuarterA) insights.QUARTERS.push(bestQuarterA);
    
    const bestQuarterB = this.detectBestQuarter(teamB, games);
    if (bestQuarterB) insights.QUARTERS.push(bestQuarterB);
    
    const quarterDomA = this.detectQuarterDominance(teamA, games);
    if (quarterDomA) insights.QUARTERS.push(quarterDomA);
    
    const quarterDomB = this.detectQuarterDominance(teamB, games);
    if (quarterDomB) insights.QUARTERS.push(quarterDomB);

    // LEAGUE
    const leagueLeaderA = this.detectLeagueLeader(teamA, teamAData.stats, allTeams);
    if (leagueLeaderA) insights.LEAGUE.push(leagueLeaderA);
    
    const leagueLeaderB = this.detectLeagueLeader(teamB, teamBData.stats, allTeams);
    if (leagueLeaderB) insights.LEAGUE.push(leagueLeaderB);
    
    // רק אם אין LEAGUE_LEADER - הצג ABOVE_BELOW_AVERAGE (למנוע כפילות)
    if (!leagueLeaderA) {
      const aboveAvgA = this.detectAboveBelowAverage(teamA, teamAData.stats, allTeams);
      if (aboveAvgA) insights.LEAGUE.push(aboveAvgA);
    }
    
    if (!leagueLeaderB) {
      const aboveAvgB = this.detectAboveBelowAverage(teamB, teamBData.stats, allTeams);
      if (aboveAvgB) insights.LEAGUE.push(aboveAvgB);
    }

    // איזון בין קבוצות - וודא שכל קבוצה מקבלת לפחות כמה insights
    this.balanceTeamInsights(insights, teamA, teamB, teamAData, teamBData, allTeams);

    return insights;
  }

  /**
   * איזון Insights בין קבוצות - מוודא שלשתי הקבוצות יש representation
   */
  balanceTeamInsights(insights, teamA, teamB, teamAData, teamBData, allTeams) {
    const MIN_INSIGHTS_PER_TEAM = 5; // לפחות 5 insights לכל קבוצה (הועלה מ-3)
    const MAX_RATIO = 2; // יחס מקסימלי בין קבוצות (2:1)
    
    // ספור כמה insights יש לכל קבוצה
    const countInsightsForTeam = (teamName) => {
      let count = 0;
      Object.values(insights).forEach(categoryInsights => {
        categoryInsights.forEach(insight => {
          if (insight.teamName === teamName) count++;
        });
      });
      return count;
    };
    
    let teamACount = countInsightsForTeam(teamA);
    let teamBCount = countInsightsForTeam(teamB);
    
    console.log(`[Balance] ${teamA}: ${teamACount} insights, ${teamB}: ${teamBCount} insights`);
    
    // פונקציה להוספת fallback insights
    const addFallbackInsights = (teamName, teamData, currentCount, targetCount) => {
      const needed = targetCount - currentCount;
      console.log(`[Balance] ${teamName} needs ${needed} more insights`);
      
      if (needed > 0) {
        // 1. נסה להוסיף BEST_CATEGORY
        if (!insights.LEAGUE.some(i => i.teamName === teamName && i.type === 'BEST_CATEGORY')) {
          const bestCat = this.detectBestCategory(teamName, teamData.stats, allTeams);
          if (bestCat) {
            insights.LEAGUE.push(bestCat);
            console.log(`[Balance] Added BEST_CATEGORY for ${teamName}`);
            currentCount++;
          }
        }
        
        // 2. אם עדיין לא מספיק - הוסף WORST_CATEGORY
        if (currentCount < targetCount && !insights.LEAGUE.some(i => i.teamName === teamName && i.type === 'WORST_CATEGORY')) {
          const worstCat = this.detectWorstCategory(teamName, teamData.stats, allTeams);
          if (worstCat) {
            insights.LEAGUE.push(worstCat);
            console.log(`[Balance] Added WORST_CATEGORY for ${teamName}`);
            currentCount++;
          }
        }
        
        // 3. אם עדיין לא מספיק - הוסף STARTING_VS_BENCH (אם לא קיים)
        if (currentCount < targetCount && !insights.OFFENSE.some(i => i.teamName === teamName && i.type === 'STARTING_VS_BENCH')) {
          const startingVsBench = this.detectStartingVsBench(teamName, teamData.stats, allTeams);
          if (startingVsBench) {
            insights.OFFENSE.push(startingVsBench);
            console.log(`[Balance] Added STARTING_VS_BENCH for ${teamName}`);
            currentCount++;
          }
        }
        
        // 4. אם עדיין לא מספיק
        if (currentCount < targetCount) {
          console.log(`[Balance] ${teamName} still needs ${targetCount - currentCount} insights - no more fallbacks available`);
        }
      }
    };
    
    // בדוק אם יש חוסר איזון משמעותי
    const ratio = Math.max(teamACount, teamBCount) / Math.max(Math.min(teamACount, teamBCount), 1);
    
    if (ratio > MAX_RATIO || teamACount < MIN_INSIGHTS_PER_TEAM || teamBCount < MIN_INSIGHTS_PER_TEAM) {
      console.log(`[Balance] Imbalance detected! Ratio: ${ratio.toFixed(2)}`);
      
      // חשב יעד מינימלי לכל קבוצה
      const maxCount = Math.max(teamACount, teamBCount);
      const targetMin = Math.max(MIN_INSIGHTS_PER_TEAM, Math.floor(maxCount / MAX_RATIO));
      
      if (teamBCount < targetMin) {
        addFallbackInsights(teamB, teamBData, teamBCount, targetMin);
      }
      
      if (teamACount < targetMin) {
        addFallbackInsights(teamA, teamAData, teamACount, targetMin);
      }
    }
    
    // דווח על התוצאה הסופית
    teamACount = countInsightsForTeam(teamA);
    teamBCount = countInsightsForTeam(teamB);
    console.log(`[Balance] Final: ${teamA}: ${teamACount}, ${teamB}: ${teamBCount}`);
  }

  /**
   * הוספת דירוג בסטטיסטיקה לכל ה-Insights (לא דירוג בטבלה!)
   */
  addStatRankToInsights(insights, allTeams) {
    // אין צורך - הדירוג יתווסף ישירות בכל insight
    // כל insight יחשב את הדירוג שלו בסטטיסטיקה הרלוונטית
    return insights;
  }

  /**
   * סינון ומיון Insights לפי חשיבות
   */
  filterAndSortInsights(insights, maxPerCategory = 3) {
    const sorted = {};
    const importanceOrder = { high: 0, medium: 1, low: 2 };
    
    for (const [category, items] of Object.entries(insights)) {
      sorted[category] = items
        .sort((a, b) => importanceOrder[a.importance] - importanceOrder[b.importance])
        .slice(0, maxPerCategory);
    }
    
    return sorted;
  }

  /**
   * יצירת סיכום Top Insights למשחק
   */
  getTopInsights(insights, count = 8) {
    const all = Object.values(insights).flat();
    const importanceOrder = { high: 0, medium: 1, low: 2 };
    
    return all
      .sort((a, b) => importanceOrder[a.importance] - importanceOrder[b.importance])
      .slice(0, count);
  }
}

// Export to global scope
window.IBBAInsightsV2 = IBBAInsightsV2;

console.log('✅ IBBAInsightsV2 loaded successfully!');

