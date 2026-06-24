// app_upcoming_games.js
// מודול לניהול טעינה והצגה של משחקים קרובים מ-API של IBBA
// @module app_upcoming_games

console.log('📅 Upcoming Games module loading...');

// ========================================
// קבועים
// ========================================

const IBBA_API_URL = 'https://ibasketball.co.il/wp-json/sportspress/v2/events';
const LEAGUE_ID = 119474;  // ליגה לאומית 2025-2
const SEASON_ID = 119472;  // עונת 2025

// מטמון נתונים
let cachedGames = null;
let cachedGamesByRound = null;

// ========================================
// פונקציה ראשית: טעינת משחקים קרובים
// ========================================

async function loadUpcomingGames() {
  console.log('📅 Loading upcoming games from IBBA API...');
  
  try {
    const apiUrl = `${IBBA_API_URL}?leagues=${LEAGUE_ID}&seasons=${SEASON_ID}&per_page=300`;
    
    console.log('📡 Fetching from:', apiUrl);
    
    // טעינה ישירה (עובד מ-localhost ומאתרים עם HTTPS)
    let allGames = null;
    
    try {
      console.log(`🔄 Loading games from API...`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 שניות timeout
      
      const response = await fetch(apiUrl, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // וידוא שהתשובה היא מערך
      if (!Array.isArray(data)) {
        throw new Error('התשובה מה-API אינה מערך תקין');
      }
      
      allGames = data;
      console.log(`✅ Successfully loaded ${data.length} games from API`);
      
    } catch (fetchError) {
      console.error('❌ Direct fetch failed:', fetchError);
      throw new Error(`לא הצלחנו לטעון את המשחקים מה-API.\nודא שהאתר רץ על localhost:8000 ושהאינטרנט פעיל.\n\nשגיאה: ${fetchError.message}`);
    }
    
    if (!allGames) {
      throw new Error('לא התקבלו נתונים מה-API');
    }
    
    console.log(`📊 Received ${allGames.length} total games from API`);
    
    // כל המשחקים רלוונטיים - ההחלטה לפי תאריך בלבד (לא לפי status שלא אמין)
    let relevantGames = allGames;
    
    if (relevantGames.length === 0) {
      relevantGames = getFallbackGamesFromLoadedSeason();
      if (relevantGames.length > 0) {
        console.log(`Using ${relevantGames.length} already-loaded season games as fallback`);
      }
    }
    
    console.log(`📊 Processing ${relevantGames.length} games from API`);
    
    // מיון לפי תאריך (הקרוב ביותר ראשון)
    relevantGames.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // שמירה במטמון
    cachedGames = relevantGames;
    
    // קיבוץ לפי מחזור
    const gamesByRound = groupGamesByRound(relevantGames);
    cachedGamesByRound = gamesByRound;
    
    // מציאת מחזור ברירת מחדל
    const defaultRound = findDefaultRound(gamesByRound);
    
    console.log(`🎯 Default round selected: ${defaultRound}`);
    
    // הצגת הממשק
    renderUpcomingGamesUI(gamesByRound, defaultRound);
    
    return relevantGames;
    
  } catch (error) {
    console.error('❌ Error loading upcoming games:', error);
    showErrorMessage(error.message);
    throw error;
  }
}

// ========================================
// קיבוץ משחקים לפי מחזור
// ========================================

function groupGamesByRound(games) {
  const gamesByRound = {};
  
  games.forEach(game => {
    const round = game.stage_id || 'לא ידוע';
    
    if (!gamesByRound[round]) {
      gamesByRound[round] = [];
    }
    
    gamesByRound[round].push(game);
  });
  
  console.log('📊 Games grouped by rounds:', Object.keys(gamesByRound));
  
  return gamesByRound;
}

function getFallbackGamesFromLoadedSeason() {
  if (!Array.isArray(window.allGames) || window.allGames.length === 0) {
    return [];
  }
  
  return window.allGames
    .filter(game => game && game.date && (game.homeTeam || game.home?.team) && (game.awayTeam || game.away?.team))
    .map((game, index) => ({
      id: game.gameId || game.gameSerial || game.id || `loaded-${index}`,
      date: game.date,
      stage_id: String(game.cycle || game.stage_id || game.round || 'unknown'),
      home: { team: game.homeTeam || game.home?.team || 'unknown' },
      away: { team: game.awayTeam || game.away?.team || 'unknown' }
    }));
}

// ========================================
// מציאת מחזור ברירת מחדל (הכי קרוב להיום)
// ========================================

function findDefaultRound(gamesByRound) {
  const now = new Date();
  let closestRound = null;
  let minDiff = Infinity;
  
  Object.entries(gamesByRound).forEach(([round, games]) => {
    games.forEach(game => {
      // מחפשים רק משחקים עתידיים לפי תאריך בפועל (לא לפי status שלא אמין)
      const gameDate = new Date(game.date);
      if (gameDate >= now) { // משחק בעתיד
        const diff = gameDate - now;
        if (diff < minDiff) {
          minDiff = diff;
          closestRound = round;
        }
      }
    });
  });
  
  // אם לא נמצא משחק עתידי, קח את המחזור האחרון ששוחק
  if (!closestRound && Object.keys(gamesByRound).length > 0) {
    let latestPastRound = null;
    let latestPastDate = -Infinity;
    
    Object.entries(gamesByRound).forEach(([round, games]) => {
      games.forEach(game => {
        const gameTime = new Date(game.date).getTime();
        if (gameTime < now.getTime() && gameTime > latestPastDate) {
          latestPastDate = gameTime;
          latestPastRound = round;
        }
      });
    });
    
    if (latestPastRound) {
      return latestPastRound;
    }
    
    const sortedRounds = Object.keys(gamesByRound).sort((a, b) => {
      // מיון מספרי של מחזורים
      const numA = parseInt(a) || 0;
      const numB = parseInt(b) || 0;
      return numA - numB;
    });
    closestRound = sortedRounds[0];
  }
  
  return closestRound;
}

// ========================================
// הצגת הממשק המלא
// ========================================

function renderUpcomingGamesUI(gamesByRound, defaultRound) {
  console.log('🎨 [UPCOMING] Rendering upcoming games UI...');
  console.log('🎨 [UPCOMING] defaultRound:', defaultRound);
  console.log('🎨 [UPCOMING] games in defaultRound:', gamesByRound[defaultRound]?.length || 0);
  
  // עדכון dropdown של מחזורים
  renderRoundDropdown(gamesByRound, defaultRound);
  
  // הצגת משחקי המחזור שנבחר
  if (defaultRound && gamesByRound[defaultRound]) {
    console.log('🎨 [UPCOMING] Calling renderUpcomingGamesTable...');
    renderUpcomingGamesTable(gamesByRound[defaultRound], defaultRound);
  } else {
    console.warn('⚠️ [UPCOMING] No default round or no games, showing no games message');
    showNoGamesMessage();
  }
}

// ========================================
// הצגת dropdown מחזורים
// ========================================

function renderRoundDropdown(gamesByRound, selectedRound) {
  const roundSelector = document.getElementById('roundSelector');
  
  if (!roundSelector) {
    console.error('❌ Round selector element not found');
    return;
  }
  
  // מיון מחזורים
  const sortedRounds = Object.keys(gamesByRound).sort((a, b) => {
    const numA = parseInt(a) || 0;
    const numB = parseInt(b) || 0;
    return numA - numB;
  });
  
  // בניית אפשרויות
  let html = '';
  sortedRounds.forEach(round => {
    const gamesCount = gamesByRound[round].length;
    const selected = round === selectedRound ? 'selected' : '';
    html += `<option value="${round}" ${selected}>מחזור ${round} (${gamesCount} משחקים)</option>`;
  });
  
  roundSelector.innerHTML = html;
  
  console.log(`✅ Round dropdown rendered with ${sortedRounds.length} rounds`);
}

// ========================================
// הצגת טבלת משחקים
// ========================================

function renderUpcomingGamesTable(games, roundNumber) {
  console.log(`🎨 [UPCOMING] renderUpcomingGamesTable called with ${games?.length || 0} games, round ${roundNumber}`);
  
  const container = document.getElementById('upcomingGamesContainer');
  
  if (!container) {
    console.error('❌ Upcoming games container not found');
    return;
  }
  
  if (!games || games.length === 0) {
    console.warn('⚠️ No games to display');
    showNoGamesMessage();
    return;
  }
  
  console.log(`🎨 Rendering ${games.length} games for round ${roundNumber}`);
  
  // בניית HTML של הטבלה
  let html = `
    <table class="stats-table w-full text-sm">
      <thead>
        <tr>
          <th class="col-team">תאריך</th>
          <th class="num">שעה</th>
          <th class="col-team">קבוצת בית</th>
          <th class="num">VS</th>
          <th class="col-team">קבוצת חוץ</th>
          <th class="col-team">פעולה</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  games.forEach((game, index) => {
    html += buildUpcomingGameRow(game, index);
  });
  
  html += `
      </tbody>
    </table>
  `;
  
  container.innerHTML = html;
  
  // חיבור אירועים לכפתורי ניתוח
  attachAnalyzeButtonEvents();
  
  console.log(`✅ Games table rendered successfully`);
}

// ========================================
// בניית שורת משחק בטבלה
// ========================================

function buildUpcomingGameRow(game, index) {
  const date = new Date(game.date);
  
  // פורמט תאריך בעברית
  const dateStr = date.toLocaleDateString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  
  // פורמט שעה
  const timeStr = date.toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  // פענוח HTML entities מה-API (למשל &quot; -> ")
  const homeTeamRaw = game.home?.team || 'לא ידוע';
  const awayTeamRaw = game.away?.team || 'לא ידוע';
  const homeTeam = decodeHtmlEntities(homeTeamRaw);
  const awayTeam = decodeHtmlEntities(awayTeamRaw);
  const gameId = game.id || `game-${index}`;
  
  // בדיקת סטטוס המשחק לפי תאריך בפועל (לא לפי status מה-API שלא אמין)
  const now = new Date();
  const gameDate = new Date(game.date);
  const isFinished = gameDate < now; // משחק בעבר = הסתיים
  const rowClass = isFinished ? 'opacity-60' : '';
  
  return `
    <tr class="${rowClass}">
      <td class="col-team">${escapeHtml(dateStr)}</td>
      <td class="num font-semibold">${escapeHtml(timeStr)}</td>
      <td class="col-team font-bold">${escapeHtml(homeTeam)}</td>
      <td class="num text-center">⚔️</td>
      <td class="col-team font-bold">${escapeHtml(awayTeam)}</td>
      <td class="col-team text-center">
        ${isFinished ? `
          <span class="inline-block px-3 py-1.5 text-xs text-gray-500 bg-gray-100 rounded">
            ✓ הסתיים
          </span>
        ` : `
          <button 
            class="analyze-game-btn btn bg-blue-600 text-white text-xs rounded px-3 py-1.5 hover:bg-blue-700 transition-colors"
            data-home="${escapeHtml(homeTeam)}"
            data-away="${escapeHtml(awayTeam)}"
            data-game-id="${escapeHtml(gameId)}"
          >
            🔍 נתח משחק
          </button>
        `}
      </td>
    </tr>
  `;
}

// ========================================
// פונקציות HTML encoding/decoding
// ========================================

function decodeHtmlEntities(text) {
  if (!text) return '';
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ========================================
// חיבור אירועים לכפתורי ניתוח
// ========================================

function attachAnalyzeButtonEvents() {
  const buttons = document.querySelectorAll('.analyze-game-btn');
  
  console.log(`🔗 Attaching events to ${buttons.length} analyze buttons`);
  
  buttons.forEach(button => {
    button.addEventListener('click', async function() {
      const homeTeamName = this.dataset.home;
      const awayTeamName = this.dataset.away;
      const gameId = this.dataset.gameId;
      
      console.log(`🎯 Analyze button clicked: ${homeTeamName} vs ${awayTeamName}`);
      
      // שינוי מצב הכפתור
      const originalText = this.textContent;
      this.disabled = true;
      this.textContent = '⏳ טוען...';
      
      try {
        await handleAnalyzeClick(homeTeamName, awayTeamName, gameId);
        this.textContent = '✓ נבחר';
        setTimeout(() => {
          this.textContent = originalText;
          this.disabled = false;
        }, 2000);
      } catch (error) {
        console.error('❌ Error in analyze click:', error);
        this.textContent = '❌ שגיאה';
        setTimeout(() => {
          this.textContent = originalText;
          this.disabled = false;
        }, 2000);
      }
    });
  });
}

// ========================================
// טיפול בלחיצה על כפתור ניתוח
// ========================================

async function handleAnalyzeClick(homeTeamName, awayTeamName, gameId) {
  // פענוח HTML entities (הכפתור מעביר שמות מפוענחים, אבל נוודא פעם נוספת)
  const homeTeamDecoded = decodeHtmlEntities(homeTeamName);
  const awayTeamDecoded = decodeHtmlEntities(awayTeamName);
  
  console.log(`🔍 Starting analysis for: ${homeTeamDecoded} vs ${awayTeamDecoded}`);
  
  try {
    // הצגת הודעת סטטוס
    showStatusMessage('טוען קבוצות...');
    
    // 1. טעינת רשימת הקבוצות מהמערכת
    if (!window.dbAdapter) {
      throw new Error('מסד הנתונים לא זמין');
    }
    
    const teams = await window.dbAdapter.getTeams();
    console.log(`📊 Loaded ${teams.length} teams from database`);
    
    if (!teams || teams.length === 0) {
      throw new Error('לא נמצאו קבוצות במערכת. יש לייבא משחקים תחילה.');
    }
    
    // 2. מציאת הקבוצות המתאימות (משתמש בשמות המפוענחים)
    const homeTeam = findMatchingTeam(teams, homeTeamDecoded);
    const awayTeam = findMatchingTeam(teams, awayTeamDecoded);
    
    console.log('🔍 Team matching results:', { 
      searchedHome: homeTeamDecoded,
      searchedAway: awayTeamDecoded,
      foundHome: homeTeam?.team_id, 
      foundAway: awayTeam?.team_id 
    });
    
    if (!homeTeam || !awayTeam) {
      const missing = [];
      if (!homeTeam) missing.push(homeTeamDecoded);
      if (!awayTeam) missing.push(awayTeamDecoded);
      
      throw new Error(`הקבוצות הבאות לא נמצאו במערכת:\n${missing.join('\n')}\n\nיש לייבא משחקים של הקבוצות האלה תחילה.`);
    }
    
    // 3. מילוי הבוררים
    const homeTeamSelect = document.getElementById('homeTeamSelect');
    const awayTeamSelect = document.getElementById('awayTeamSelect');
    
    if (!homeTeamSelect || !awayTeamSelect) {
      throw new Error('לא נמצאו רכיבי בחירת הקבוצות');
    }
    
    console.log('✅ Setting team selectors:', { 
      home: homeTeam.team_id, 
      away: awayTeam.team_id 
    });
    
    homeTeamSelect.value = homeTeam.team_id;
    awayTeamSelect.value = awayTeam.team_id;
    
    showStatusMessage('✓ הקבוצות נבחרו');
    
    // עדכון ידני של כפתור הניתוח
    const analyzeBtn = document.getElementById('analyzeGame');
    if (analyzeBtn && homeTeam.team_id && awayTeam.team_id && homeTeam.team_id !== awayTeam.team_id) {
      analyzeBtn.disabled = false;
    }
    
    // עדכון פונקציות רלוונטיות (ללא הפעלת event handlers שבונים dropdowns מחדש)
    if (typeof window.updatePreGameAnalysisButton === 'function') {
      window.updatePreGameAnalysisButton();
    }
    
    if (typeof window.loadPlayersForComparison === 'function') {
      window.loadPlayersForComparison();
    }
    
    // 4. גלילה לאזור ההשוואה
    setTimeout(() => {
      homeTeamSelect.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start',
        inline: 'nearest'
      });
    }, 100);
    
    // 5. הפעלת הניתוח (לחיצה אוטומטית על כפתור)
    setTimeout(() => {
      const analyzeBtn = document.getElementById('analyzeGame');
      if (analyzeBtn && !analyzeBtn.disabled) {
        console.log('🎯 Triggering analyze button click');
        analyzeBtn.click();
      } else {
        console.warn('⚠️ Analyze button not available or disabled');
      }
      
      // נקה הודעת סטטוס
      setTimeout(() => {
        hideStatusMessage();
      }, 2000);
    }, 500);
    
    console.log('✅ Analysis flow completed successfully');
    
  } catch (error) {
    console.error('❌ Error in handleAnalyzeClick:', error);
    alert(error.message);
    hideStatusMessage();
    throw error;
  }
}

// ========================================
// חיפוש קבוצה מתאימה לפי שם
// ========================================

function findMatchingTeam(teams, targetName) {
  if (!targetName) return null;
  
  console.log(`🔍 Searching for team: "${targetName}"`);
  
  // נסיון 1: התאמה מדויקת (עברית או אנגלית)
  let match = teams.find(t => 
    t.name_he === targetName || 
    t.name_en === targetName
  );
  
  if (match) {
    console.log(`✅ Exact match found: ${match.team_id}`);
    return match;
  }
  
  // נסיון 2: התאמה normalized (ללא רווחים, lowercase)
  const normalizedTarget = targetName.replace(/\s+/g, '').toLowerCase();
  match = teams.find(t => {
    const normalizedHe = (t.name_he || '').replace(/\s+/g, '').toLowerCase();
    const normalizedEn = (t.name_en || '').replace(/\s+/g, '').toLowerCase();
    return normalizedHe === normalizedTarget || normalizedEn === normalizedTarget;
  });
  
  if (match) {
    console.log(`✅ Normalized match found: ${match.team_id}`);
    return match;
  }
  
  // נסיון 3: התאמה חלקית (includes)
  match = teams.find(t => {
    const nameHe = t.name_he || '';
    const nameEn = t.name_en || '';
    return nameHe.includes(targetName) || 
           targetName.includes(nameHe) ||
           nameEn.includes(targetName) || 
           targetName.includes(nameEn);
  });
  
  if (match) {
    console.log(`✅ Partial match found: ${match.team_id}`);
    return match;
  }
  
  // נסיון 4: חיפוש בכינויים (aliases)
  match = teams.find(t => {
    if (t.aliases && Array.isArray(t.aliases)) {
      return t.aliases.some(alias => 
        alias === targetName ||
        alias.includes(targetName) ||
        targetName.includes(alias)
      );
    }
    return false;
  });
  
  if (match) {
    console.log(`✅ Alias match found: ${match.team_id}`);
    return match;
  }
  
  console.warn(`⚠️ No match found for: "${targetName}"`);
  return null;
}

// ========================================
// שינוי מחזור נבחר
// ========================================

function renderSelectedRound(roundNumber) {
  console.log(`🔄 Switching to round: ${roundNumber}`);
  
  if (!cachedGamesByRound || !cachedGamesByRound[roundNumber]) {
    console.error(`❌ Round ${roundNumber} not found in cache`);
    showNoGamesMessage();
    return;
  }
  
  renderUpcomingGamesTable(cachedGamesByRound[roundNumber], roundNumber);
}

// ========================================
// הצגת הודעות UI
// ========================================

function showNoGamesMessage() {
  const container = document.getElementById('upcomingGamesContainer');
  if (container) {
    container.innerHTML = `
      <div class="text-center py-8 text-gray-500">
        <div class="text-4xl mb-2">🏀</div>
        <p>אין משחקים קרובים להצגה</p>
      </div>
    `;
  }
}

function showErrorMessage(message) {
  const container = document.getElementById('upcomingGamesContainer');
  if (container) {
    const apiUrl = `${IBBA_API_URL}?leagues=${LEAGUE_ID}&seasons=${SEASON_ID}&per_page=300`;
    
    container.innerHTML = `
      <div class="text-center py-8">
        <div class="text-4xl mb-2">❌</div>
        <p class="font-semibold text-red-600">שגיאה בטעינת המשחקים</p>
        <p class="text-sm mt-2 text-gray-600">${escapeHtml(message)}</p>
        
        <div class="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4 mx-auto max-w-md text-right">
          <p class="text-xs text-amber-800 mb-2"><strong>💡 פתרונות אפשריים:</strong></p>
          <div class="text-xs text-amber-700 space-y-1">
            <div>• <strong>HTTP Server:</strong> הרץ את האתר דרך HTTP server (לא file://)</div>
            <div>• <strong>הרחבה:</strong> התקן "CORS Unblock" או "CORS Everywhere"</div>
            <div>• <strong>פתיחה ידנית:</strong> לחץ על הכפתור למטה</div>
          </div>
          <button 
            onclick="window.open('${apiUrl}', '_blank')"
            class="mt-3 w-full btn bg-orange-500 text-white text-sm rounded px-3 py-2 hover:bg-orange-600"
          >
            🔗 פתח קישור API בחלון חדש
          </button>
        </div>
      </div>
    `;
  }
}

function showStatusMessage(message) {
  const statusEl = document.getElementById('upcomingGamesStatus');
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.classList.remove('hidden');
  }
}

function hideStatusMessage() {
  const statusEl = document.getElementById('upcomingGamesStatus');
  if (statusEl) {
    statusEl.textContent = '';
    statusEl.classList.add('hidden');
  }
}

// ========================================
// ייצוא פונקציות לשימוש גלובלי
// ========================================

window.loadUpcomingGames = loadUpcomingGames;
window.renderSelectedRound = renderSelectedRound;

console.log('✅ Upcoming Games module loaded successfully!');
