
/**
 * Displays advanced game analysis using the new analysis module
 * @param {Object} gameData - Raw game JSON data
 */
function displayAdvancedAnalysis(gameData) {
  console.log('🔍 === DEBUG: displayAdvancedAnalysis called ===');
  console.log('🔍 gameData:', gameData);
  console.log('🔍 gameData type:', typeof gameData);
  console.log('🔍 gameData keys:', gameData ? Object.keys(gameData) : 'null');
  
  if (!gameData || !window.computeGameAnalysis) {
    console.log('❌ No game data or analysis module not loaded');
    console.log('🔍 gameData exists:', !!gameData);
    console.log('🔍 window.computeGameAnalysis exists:', !!window.computeGameAnalysis);
    return;
  }

  try {
    console.log('🔍 Calling window.computeGameAnalysis...');
    const analysis = window.computeGameAnalysis(gameData);
    console.log('🔍 Analysis result:', analysis);
    
    const container = document.getElementById('advancedAnalysis');
    const noDataContainer = document.getElementById('noAnalysisData');
    
    console.log('🔍 Container elements:', { 
      container: !!container, 
      noDataContainer: !!noDataContainer 
    });
    
    if (!container || !noDataContainer) {
      console.log('❌ Analysis containers not found');
      return;
    }

    console.log('🔍 Hiding no-data message and showing analysis...');
    // Hide "no data" message and show analysis
    noDataContainer.classList.add('hidden');
    container.classList.remove('hidden');

    console.log('🔍 Generating HTML for advanced analysis...');
    // Generate HTML for advanced analysis
    container.innerHTML = generateAdvancedAnalysisHTML(analysis);
    
    console.log('✅ Advanced analysis displayed successfully');
  } catch (error) {
    console.error('❌ Error displaying advanced analysis:', error);
    console.error('❌ Error stack:', error.stack);
  }
}

/**
 * Generates HTML for advanced analysis display
 * @param {Object} analysis - Analysis data from computeGameAnalysis
 * @returns {string} HTML string
 */
function generateAdvancedAnalysisHTML(analysis) {
  const { meta, teams, matchup } = analysis;
  const home = teams.home;
  const away = teams.away;

  return `
    <div class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <h3 class="font-bold text-blue-800 mb-2">ניתוח מתקדם למשחק</h3>
      <p class="text-sm text-blue-700">ניתוח מעמיק של ביצועי הקבוצות המבוסס על ממוצעי העונה. הנתונים כוללים ארבעת הגורמים הקריטיים, דירוגים התקפיים והגנתיים, וניתוח קצב המשחק.</p>
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Home Team Analysis -->
      <div class="bg-white border border-gray-200 rounded-lg p-4">
        <h4 class="font-semibold text-blue-800 mb-3">${home.teamName}</h4>
        <div class="space-y-3">
          <div class="flex justify-between">
            <span class="text-sm text-gray-600">ארבעת הגורמים:</span>
            <span class="text-sm font-medium">${formatPercentage(home.eFG)} / ${formatPercentage(home.tovPct)} / ${formatPercentage(home.orbPct)} / ${formatPercentage(home.ftRate)}</span>
          </div>
          <div class="text-xs text-gray-500 mb-2">יעילות קליעה (כולל 3 נק') / אחוז איבוד כדור / אחוז ריבאונד התקפי / יחס זריקות עונשין</div>
          <div class="text-xs text-gray-400 mb-3">ארבעת הגורמים הקריטיים שקובעים את תוצאת המשחק: יעילות קליעה, שמירה על הכדור, ריבאונד התקפי, וזריקות עונשין</div>
          <div class="flex justify-between">
            <span class="text-sm text-gray-600">דירוג התקפי:</span>
            <span class="text-sm font-medium">${formatMetric(home.offRtg)}</span>
          </div>
          <div class="text-xs text-gray-500 mb-2">נקודות שהקבוצה קולעת ל-100 possessions (מחזורי התקפה)</div>
          <div class="flex justify-between">
            <span class="text-sm text-gray-600">דירוג הגנתי:</span>
            <span class="text-sm font-medium">${formatMetric(home.defRtg)}</span>
          </div>
          <div class="text-xs text-gray-500 mb-2">נקודות שהקבוצה נותנת ליריבה ל-100 possessions (מחזורי התקפה)</div>
          <div class="flex justify-between">
            <span class="text-sm text-gray-600">דירוג נטו:</span>
            <span class="text-sm font-medium">${formatMetric(home.netRtg)}</span>
          </div>
          <div class="text-xs text-gray-500 mb-2">הפרש בין דירוג התקפי לדירוג הגנתי (חיובי = טוב)</div>
        </div>
      </div>

      <!-- Away Team Analysis -->
      <div class="bg-white border border-gray-200 rounded-lg p-4">
        <h4 class="font-semibold text-blue-800 mb-3">${away.teamName}</h4>
        <div class="space-y-3">
          <div class="flex justify-between">
            <span class="text-sm text-gray-600">ארבעת הגורמים:</span>
            <span class="text-sm font-medium">${formatPercentage(away.eFG)} / ${formatPercentage(away.tovPct)} / ${formatPercentage(away.orbPct)} / ${formatPercentage(away.ftRate)}</span>
          </div>
          <div class="text-xs text-gray-500 mb-2">יעילות קליעה (כולל 3 נק') / אחוז איבוד כדור / אחוז ריבאונד התקפי / יחס זריקות עונשין</div>
          <div class="text-xs text-gray-400 mb-3">ארבעת הגורמים הקריטיים שקובעים את תוצאת המשחק: יעילות קליעה, שמירה על הכדור, ריבאונד התקפי, וזריקות עונשין</div>
          <div class="flex justify-between">
            <span class="text-sm text-gray-600">דירוג התקפי:</span>
            <span class="text-sm font-medium">${formatMetric(away.offRtg)}</span>
          </div>
          <div class="text-xs text-gray-500 mb-2">נקודות שהקבוצה קולעת ל-100 possessions (מחזורי התקפה)</div>
          <div class="flex justify-between">
            <span class="text-sm text-gray-600">דירוג הגנתי:</span>
            <span class="text-sm font-medium">${formatMetric(away.defRtg)}</span>
          </div>
          <div class="text-xs text-gray-500 mb-2">נקודות שהקבוצה נותנת ליריבה ל-100 possessions (מחזורי התקפה)</div>
          <div class="flex justify-between">
            <span class="text-sm text-gray-600">דירוג נטו:</span>
            <span class="text-sm font-medium">${formatMetric(away.netRtg)}</span>
          </div>
          <div class="text-xs text-gray-500 mb-2">הפרש בין דירוג התקפי לדירוג הגנתי (חיובי = טוב)</div>
        </div>
      </div>
    </div>

    <!-- Game Meta -->
    <div class="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
      <h4 class="font-semibold text-gray-800 mb-3">מטא נתונים</h4>
      <p class="text-sm text-gray-600 mb-4">נתונים כלליים על המשחק: קצב המשחק, אורך המשחק, ושינויי יתרון</p>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div class="text-center">
          <div class="text-gray-600">קצב משחק</div>
          <div class="font-medium">${formatMetric(meta.pace)}</div>
          <div class="text-xs text-gray-500">possessions ל-40 דקות</div>
        </div>
        <div class="text-center">
          <div class="text-gray-600">דקות משחק</div>
          <div class="font-medium">${meta.gameMinutes}</div>
          <div class="text-xs text-gray-500">אורך המשחק</div>
        </div>
        <div class="text-center">
          <div class="text-gray-600">שינויי יתרון</div>
          <div class="font-medium">${meta.leadChanges}</div>
          <div class="text-xs text-gray-500">פעמים שהמשחק התהפך</div>
        </div>
        <div class="text-center">
          <div class="text-gray-600">תיקו</div>
          <div class="font-medium">${meta.ties}</div>
          <div class="text-xs text-gray-500">פעמים שהתוצאה הייתה שווה</div>
        </div>
      </div>
    </div>
  `;
}

// Helper function to format numbers for RTL (move minus to right side)
function formatNumberForRTL(num) {
  const numStr = String(num);
  if (numStr.startsWith('-')) {
    // Move minus from left to right for RTL display
    return numStr.substring(1) + '−'; // Using en-dash instead of hyphen-minus
  }
  return numStr;
}

// Debug: Check if function is loaded
console.log('🔍 === DEBUG: displayAdvancedAnalysis function loaded ===');
console.log('🔍 typeof displayAdvancedAnalysis:', typeof displayAdvancedAnalysis);
console.log('🔍 displayAdvancedAnalysis function:', displayAdvancedAnalysis);

// Expose function globally
window.displayAdvancedAnalysis = displayAdvancedAnalysis;
console.log('🔍 === DEBUG: displayAdvancedAnalysis exposed to window ===');
console.log('🔍 window.displayAdvancedAnalysis:', typeof window.displayAdvancedAnalysis);

// Also expose through App namespace
if (window.App) {
  window.App.displayAdvancedAnalysis = displayAdvancedAnalysis;
  console.log('🔍 === DEBUG: displayAdvancedAnalysis exposed to window.App ===');
}

// Last-mile wiring: if something prevented earlier event hookup, do it now.
(function(){
  function $id(x){ return document.getElementById(x); }
  function on(el, ev, fn){ if(el && typeof fn==='function') el.addEventListener(ev, fn, false); }
  function wireClick(id, fn){ const el=$id(id); if(el && !el.__wired){ el.__wired=true; el.onclick=fn; } }

  async function clearDbAndReinit(){
    const first = confirm("אזהרה: פעולה זו תמחק לצמיתות את כל הנתונים המקומיים במסד BasketballStatsDB.\nהאם אתה בטוח שברצונך להמשיך?");
    if(!first) return;
    const second = confirm("לא ניתן לשחזר את הנתונים לאחר מחיקה.\nלאשר מחיקה?");
    if(!second) return;
    try{
      if(!('indexedDB' in window)){
        alert("IndexedDB אינו זמין בדפדפן/מצב הנוכחי. אין מה למחוק.");
        return;
      }
      try{ if(window.DB) { window.DB.close(); window.DB = null; } }catch(_){}
      const req = indexedDB.deleteDatabase("BasketballStatsDB");
      req.onsuccess = async () => {
        if (typeof showOk === 'function') showOk("מסד הנתונים נמחק. מאתחל מחדש...");
        try{
          if (typeof initDb === 'function') await initDb();
          if (typeof loadTeamsIndex === 'function') await loadTeamsIndex();
          if (typeof listTeams === 'function') await listTeams();
          if (typeof setNextGameSerialToUI === 'function') await setNextGameSerialToUI();
          if (typeof showOk === 'function') showOk("מסד הנתונים נוצר מחדש ומוכן לשמירה.");
        }catch(e){
          if (typeof showError === 'function') showError("נמחק בהצלחה, אך אתחול המסד נכשל. נסה לרענן את הדף. (" + (e?.message||e) + ")");
        }
      };
      req.onerror   = () => { if (typeof showError === 'function') showError("שגיאה במחיקה: " + (req.error?.message || "לא ידוע")); };
      req.onblocked = () => { if (typeof showError === 'function') showError("המחיקה נחסמה ע\"י טאבים פתוחים. סגור טאבים של הדף ונסה שוב."); };
    }catch(err){
      if (typeof showError === 'function') showError("שגיאה: " + (err?.message || err));
    }
  }

  // Player comparison functions
  async function loadPlayersForComparison() {
    console.log('🔍 === DEBUG: loadPlayersForComparison called ===');
    
    // Initialize dbAdapter if not already done
    if (window.dbAdapter && !window.dbAdapter.isDbAvailable()) {
      await window.dbAdapter.init();
    }
    
    if (!window.dbAdapter || !window.dbAdapter.isDbAvailable()) {
      console.log('❌ dbAdapter not available for player comparison');
      return;
    }
    console.log('✅ dbAdapter is available');

    try {
      // Get selected teams - using correct element IDs
      const homeTeamSelect = document.getElementById('homeTeamSelect');
      const awayTeamSelect = document.getElementById('awayTeamSelect');
      
      console.log('🔍 Home team select element:', homeTeamSelect);
      console.log('🔍 Away team select element:', awayTeamSelect);
      
      if (!homeTeamSelect || !awayTeamSelect) {
        console.log('❌ Team select elements not found');
        return;
      }
      
      console.log('🔍 Home team value:', homeTeamSelect.value);
      console.log('🔍 Away team value:', awayTeamSelect.value);
      
      if (!homeTeamSelect.value || !awayTeamSelect.value) {
        console.log('❌ Teams not selected yet');
        return;
      }

      const team1Id = homeTeamSelect.value;
      const team2Id = awayTeamSelect.value;
      
      console.log('✅ Both teams selected:', team1Id, team2Id);

      // Load players for both teams
      console.log('🔍 Loading players for team 1:', team1Id);
      const players1 = await getPlayersForTeam(team1Id);
      console.log('🔍 Players loaded for team 1:', players1.length, players1);
      
      console.log('🔍 Loading players for team 2:', team2Id);
      const players2 = await getPlayersForTeam(team2Id);
      console.log('🔍 Players loaded for team 2:', players2.length, players2);

      // Populate player selectors
      console.log('🔍 Populating player selectors...');
      populatePlayerSelector('player1Select', players1, players2);
      populatePlayerSelector('player2Select', players1, players2);

      // Enable selectors
      const player1Select = document.getElementById('player1Select');
      const player2Select = document.getElementById('player2Select');
      
      console.log('🔍 Player 1 select element:', player1Select);
      console.log('🔍 Player 2 select element:', player2Select);
      
      if (player1Select) {
        player1Select.disabled = false;
        console.log('✅ Player 1 selector enabled');
      } else {
        console.log('❌ Player 1 selector not found');
      }
      
      if (player2Select) {
        player2Select.disabled = false;
        console.log('✅ Player 2 selector enabled');
      } else {
        console.log('❌ Player 2 selector not found');
      }

    } catch (e) {
      console.log('❌ Error loading players for comparison:', e);
    }
  }

  async function getPlayersForTeam(teamId) {
    console.log('🔍 === DEBUG: getPlayersForTeam called with teamId:', teamId);
    const players = [];
    
    try {
      // Initialize dbAdapter if not already done
      if (window.dbAdapter && !window.dbAdapter.isDbAvailable()) {
        await window.dbAdapter.init();
      }
      
      // Get team info from dbAdapter
      console.log('🔍 Getting team info from dbAdapter...');
      const team = await window.dbAdapter.getTeam(teamId);
      
      if (!team) {
        console.log('❌ Team not found');
        return players;
      }
      
      console.log('🔍 Team found:', team);
      
      // Get all players from dbAdapter
      const allPlayers = await window.dbAdapter.getPlayers();
      console.log('🔍 Total players in DB:', allPlayers.length);
      
      // Filter players who played for this team
      // Check both lastSeenTeam and games array
      for (const player of allPlayers) {
        const playedForTeam = 
          player.lastSeenTeam === teamId ||
          player.lastSeenTeam === team.name_he ||
          player.lastSeenTeam === team.name_en ||
          (player.games && player.games.some(game => 
            game.team === teamId || 
            game.team === team.name_he || 
            game.team === team.name_en
          ));
        
        if (playedForTeam) {
          const playerName = player.name ||
                            `${player.firstNameHe || ''} ${player.familyNameHe || ''}`.trim() || 
                            `${player.firstNameEn || ''} ${player.familyNameEn || ''}`.trim();
          
          if (playerName) {
            console.log('🔍 Player found for team:', playerName);
            players.push({
              id: player.id,
              name: playerName,
              teamId: teamId,
              teamName: team.name_he || team.name_en,
              player: player // Keep full player data for stats
            });
          }
        }
      }
      
      console.log('🔍 Found', players.length, 'players for team', team.name_he);
      
    } catch (e) {
      console.log('❌ Error getting players for team:', e);
    }
    
    return players;
  }

  function populatePlayerSelector(selectorId, players1, players2) {
    console.log('🔍 === DEBUG: populatePlayerSelector called ===');
    console.log('🔍 Selector ID:', selectorId);
    console.log('🔍 Players1:', players1);
    console.log('🔍 Players2:', players2);
    
    const selector = document.getElementById(selectorId);
    console.log('🔍 Selector element:', selector);
    
    if (!selector) {
      console.log('❌ Selector not found:', selectorId);
      return;
    }

    // Clear existing options (keep first option)
    console.log('🔍 Clearing existing options, current count:', selector.children.length);
    while (selector.children.length > 1) {
      selector.removeChild(selector.lastChild);
    }

    // Add players from both teams
    const allPlayers = [...players1, ...players2];
    console.log('🔍 All players combined:', allPlayers);
    allPlayers.sort((a, b) => a.name.localeCompare(b.name, 'he'));
    console.log('🔍 All players sorted:', allPlayers);

    allPlayers.forEach(player => {
      const option = document.createElement('option');
      option.value = player.id;
      option.textContent = `${player.name} (${player.teamName})`;
      selector.appendChild(option);
      console.log('🔍 Added option:', option.textContent, 'value:', option.value);
    });
    
    console.log('✅ Selector populated with', allPlayers.length, 'players');
  }

  async function comparePlayers() {
    console.log('🔍 === DEBUG: comparePlayers called ===');
    const player1Id = document.getElementById('player1Select').value;
    const player2Id = document.getElementById('player2Select').value;

    console.log('🔍 Player 1 ID:', player1Id);
    console.log('🔍 Player 2 ID:', player2Id);

    if (!player1Id || !player2Id) {
      console.log('❌ Both players must be selected');
      return;
    }

    if (player1Id === player2Id) {
      console.log('❌ Same player selected twice');
      alert('אנא בחר שני שחקנים שונים');
      return;
    }

    try {
      console.log('🔍 Getting player stats...');
      // Get player stats
      const player1Stats = await getPlayerStats(player1Id);
      const player2Stats = await getPlayerStats(player2Id);

      console.log('🔍 Player 1 stats:', player1Stats);
      console.log('🔍 Player 2 stats:', player2Stats);

      // Display comparison
      displayPlayerComparison(player1Stats, player2Stats);

    } catch (e) {
      console.log('❌ Error comparing players:', e);
    }
  }

  async function getPlayerStats(playerId) {
    console.log('🔍 === DEBUG: getPlayerStats called for playerId:', playerId);
    const stats = {
      playerId: playerId,
      name: '',
      points: 0,
      rebounds: 0,
      assists: 0,
      steals: 0,
      blocks: 0,
      turnovers: 0,
      efficiency: 0,
      plusMinus: 0,
      games: 0,
      fieldGoalsPercentage: 0,
      threePointsPercentage: 0,
      freeThrowsPercentage: 0
    };

    try {
      // Initialize dbAdapter if not already done
      if (window.dbAdapter && !window.dbAdapter.isDbAvailable()) {
        await window.dbAdapter.init();
      }
      
      // Get player from dbAdapter
      console.log('🔍 Getting player from dbAdapter...');
      const player = await window.dbAdapter.getPlayer(playerId);
      
      if (!player) {
        console.log('❌ Player not found');
        return stats;
      }
      
      console.log('🔍 Player found:', player);
      
      // Get player name
      stats.name = player.name ||
                  `${player.firstNameHe || ''} ${player.familyNameHe || ''}`.trim() || 
                  `${player.firstNameEn || ''} ${player.familyNameEn || ''}`.trim();

      // Calculate stats from player.games array
      console.log('🔍 Calculating stats from player.games array...');
      const games = player.games || [];
      console.log('🔍 Player has', games.length, 'games');
      
      if (games.length > 0) {
        stats.games = games.length;
        
        // Calculate totals
        const totals = {
          points: 0,
          rebounds: 0,
          assists: 0,
          steals: 0,
          blocks: 0,
          turnovers: 0,
          fieldGoalsMade: 0,
          fieldGoalsAttempted: 0,
          threePointsMade: 0,
          threePointsAttempted: 0,
          freeThrowsMade: 0,
          freeThrowsAttempted: 0,
          efficiency: 0,
          plusMinus: 0
        };
        
        // Sum up all games
        for (const game of games) {
          totals.points += game.points || 0;
          totals.rebounds += game.rebounds || 0;
          totals.assists += game.assists || 0;
          totals.steals += game.steals || 0;
          totals.blocks += game.blocks || 0;
          totals.turnovers += game.turnovers || 0;
          totals.fieldGoalsMade += game.fieldGoalsMade || 0;
          totals.fieldGoalsAttempted += game.fieldGoalsAttempted || 0;
          totals.threePointsMade += game.threePointsMade || 0;
          totals.threePointsAttempted += game.threePointsAttempted || 0;
          totals.freeThrowsMade += game.freeThrowsMade || 0;
          totals.freeThrowsAttempted += game.freeThrowsAttempted || 0;
          totals.efficiency += game.efficiency || 0;
          totals.plusMinus += game.plusMinus || 0;
        }
        
        console.log('🔍 Totals calculated:', totals);
        
        // Calculate averages
        stats.points = (totals.points / stats.games).toFixed(1);
        stats.rebounds = (totals.rebounds / stats.games).toFixed(1);
        stats.assists = (totals.assists / stats.games).toFixed(1);
        stats.steals = (totals.steals / stats.games).toFixed(1);
        stats.blocks = (totals.blocks / stats.games).toFixed(1);
        stats.turnovers = (totals.turnovers / stats.games).toFixed(1);
        stats.efficiency = (totals.efficiency / stats.games).toFixed(1);
        stats.plusMinus = (totals.plusMinus / stats.games).toFixed(1);
        
        // Calculate shooting percentages
        if (totals.fieldGoalsAttempted > 0) {
          stats.fieldGoalsPercentage = ((totals.fieldGoalsMade / totals.fieldGoalsAttempted) * 100).toFixed(1);
        }
        if (totals.threePointsAttempted > 0) {
          stats.threePointsPercentage = ((totals.threePointsMade / totals.threePointsAttempted) * 100).toFixed(1);
        }
        if (totals.freeThrowsAttempted > 0) {
          stats.freeThrowsPercentage = ((totals.freeThrowsMade / totals.freeThrowsAttempted) * 100).toFixed(1);
        }
        
        console.log('🔍 Final stats calculated:', stats);
      } else {
        console.log('🔍 No games found for this player');
      }

    } catch (e) {
      console.log('Error getting player stats:', e);
    }

    return stats;
  }

  function displayPlayerComparison(player1, player2) {
    // Update player names in table header
    document.getElementById('player1Name').textContent = player1.name;
    document.getElementById('player2Name').textContent = player2.name;

    // Create comparison rows
    const tbody = document.getElementById('comparisonTableBody');
    tbody.innerHTML = '';

// Helper function to format numbers for RTL (move minus to right side)
function formatNumberForRTL(num) {
  const numStr = String(num);
  if (numStr.startsWith('-')) {
    // Move minus from left to right for RTL display
    return numStr.substring(1) + '−'; // Using en-dash instead of hyphen-minus
  }
  return numStr;
}


// Removed duplicate function - using the one at the top of the file

    const stats = [
      { key: 'points', label: 'נקודות', unit: '' },
      { key: 'rebounds', label: 'ריבאונדים', unit: '' },
      { key: 'assists', label: 'אסיסטים', unit: '' },
      { key: 'steals', label: 'חטיפות', unit: '' },
      { key: 'efficiency', label: 'מדד יעילות', unit: '' },
      { key: 'plusMinus', label: 'פלוס/מינוס', unit: '' }
    ];

    stats.forEach(stat => {
      const row = document.createElement('tr');
      const val1 = parseFloat(player1[stat.key]) || 0;
      const val2 = parseFloat(player2[stat.key]) || 0;
      
      // Determine colors based on who's winning
      let val1Class = '';
      let val2Class = '';
      
      if (val1 > val2) {
        val1Class = 'bg-green-100 text-green-800 font-bold';
        val2Class = 'bg-red-100 text-red-800';
      } else if (val2 > val1) {
        val1Class = 'bg-red-100 text-red-800';
        val2Class = 'bg-green-100 text-green-800 font-bold';
      } else {
        val1Class = 'bg-gray-100 text-gray-800';
        val2Class = 'bg-gray-100 text-gray-800';
      }

      row.innerHTML = `
        <td class="px-4 py-3 text-sm font-medium text-gray-900">${stat.label}</td>
        <td class="px-4 py-3 text-sm text-center ${val1Class}">${formatNumberForRTL(val1)}${stat.unit}</td>
        <td class="px-4 py-3 text-sm text-center ${val2Class}">${formatNumberForRTL(val2)}${stat.unit}</td>
      `;
      
      tbody.appendChild(row);
    });

    // Show comparison table
    document.getElementById('playerComparison').classList.remove('hidden');
  }

  function ensure(){
    try{
      // Tabs
      document.querySelectorAll('#tabs .tab').forEach(b => {
        on(b, 'click', () => {
          if (typeof switchTab === 'function') switchTab(b.dataset.tab);
          else if (window.App && typeof window.App.switchTab === 'function') window.App.switchTab(b.dataset.tab);
        });
      });

      // Core clicks
      wireClick('chooseBtn', () => $id('file') && $id('file').click());
      const fileEl = $id('file');
      if (fileEl && !fileEl.__wiredChg) {
        fileEl.__wiredChg = true;
        on(fileEl, 'change', () => {
          const f = fileEl.files && fileEl.files[0];
          if(!f) return;
          const r = new FileReader();
          r.onload = () => { const ta = $id('jsonTa'); if(ta) ta.value = String(r.result||''); if (typeof parseNow === 'function') parseNow(); };
          r.onerror = () => (typeof showError === 'function' && showError('שגיאה בקריאת הקובץ'));
          r.readAsText(f);
        });
      }

      wireClick('parseBtn', () => (typeof parseNow === 'function' && parseNow()));
      const tnp = $id('toggleNonPlaying'); on(tnp, 'change', () => (typeof render === 'function' && render()));

      wireClick('resetBtn', () => {
        try{
          window.RAW=null; window.TEAMMAP={}; window.PLAYERS=[];
          const ta = $id('jsonTa'); if(ta) ta.value='';
          ['gameId','gameDate','gameCycle'].forEach(id=>{ const el=$id(id); if(el) el.value=''; });
          const res = $id('results'); if(res) res.classList.add('hidden');
          const alerts = $id('alerts'); if(alerts) alerts.innerHTML='';
          // הגרפים הוסרו מהדף
          // if (window.CHARTS && window.CHARTS.pointsChart) { window.CHARTS.pointsChart.destroy(); window.CHARTS.pointsChart=null; }
          // if (window.CHARTS && window.CHARTS.efficiencyChart) { window.CHARTS.efficiencyChart.destroy(); window.CHARTS.efficiencyChart=null; }
          const pbt = $id('playersByTeams'); if(pbt) pbt.innerHTML='';
          const mw = $id('mappingWarn'); if(mw) mw.classList.add('hidden');
          if (typeof listTeams === 'function') listTeams();
        }catch(e){ console.error(e); }
      });

      // כפתור copyNotes הוסר מהדף
      // wireClick('copyNotes', async () => {
      //   try { await navigator.clipboard.writeText(($id('notes')||{}).value||''); typeof showOk==='function' && showOk('הסיכום הועתק ללוח'); setTimeout(()=>{ const a=$id('alerts'); if(a) a.innerHTML=''; },1500); }
      //   catch(e){ typeof showError==='function' && showError('העתקה ללוח לא נתמכת'); }
      // });

      wireClick('openTeamModal', () => (typeof openEditTeam==='function' && openEditTeam(null)));
      wireClick('closeTeamModal', () => { const m=$id('teamModal'); if(m) m.classList.add('hidden'); });
      wireClick('cancelTeam', () => { const m=$id('teamModal'); if(m) m.classList.add('hidden'); });
      wireClick('saveToDbBtn', () => (typeof saveToDatabase==='function' && saveToDatabase()));

      // Clear DB — this was missing for you
      wireClick('clearDbBtn', clearDbAndReinit);

      // Player comparison events
      console.log('🔍 Setting up player comparison events...');
      const homeTeamSelect = $id('homeTeamSelect');
      const awayTeamSelect = $id('awayTeamSelect');
      
      console.log('🔍 Home team select found:', !!homeTeamSelect);
      console.log('🔍 Away team select found:', !!awayTeamSelect);
      
      if (homeTeamSelect) {
        on(homeTeamSelect, 'change', () => {
          console.log('🔍 Home team changed to:', homeTeamSelect.value);
          if (homeTeamSelect.value && awayTeamSelect && awayTeamSelect.value) {
            console.log('🔍 Both teams selected, loading players...');
            loadPlayersForComparison();
          }
          // Update pre-game analysis button
          if (typeof window.updatePreGameAnalysisButton === 'function') {
            window.updatePreGameAnalysisButton();
          }
        });
      }
      
      if (awayTeamSelect) {
        on(awayTeamSelect, 'change', () => {
          console.log('🔍 Away team changed to:', awayTeamSelect.value);
          if (homeTeamSelect && homeTeamSelect.value && awayTeamSelect.value) {
            console.log('🔍 Both teams selected, loading players...');
            loadPlayersForComparison();
          }
          // Update pre-game analysis button
          if (typeof window.updatePreGameAnalysisButton === 'function') {
            window.updatePreGameAnalysisButton();
          }
        });
      }

      const player1Select = $id('player1Select');
      const player2Select = $id('player2Select');
      
      console.log('🔍 Player 1 select found:', !!player1Select);
      console.log('🔍 Player 2 select found:', !!player2Select);
      
      if (player1Select) {
        on(player1Select, 'change', () => {
          console.log('🔍 Player 1 changed to:', player1Select.value);
          if (player1Select.value && player2Select && player2Select.value) {
            console.log('🔍 Both players selected, comparing...');
            comparePlayers();
          }
        });
      }
      
      if (player2Select) {
        on(player2Select, 'change', () => {
          console.log('🔍 Player 2 changed to:', player2Select.value);
          if (player1Select && player1Select.value && player2Select.value) {
            console.log('🔍 Both players selected, comparing...');
            comparePlayers();
          }
        });
      }

      // NOTE: Search event listeners are now handled in app_events.js with debounce
      // Removed duplicate listeners to prevent multiple calls

      wireClick('saveTeam', async () => {
        const teamId = ($id('tm_teamId')?.value||'').trim() || `t-${Math.random().toString(16).substring(2, 12)}`;
        const nameEn = ($id('tm_nameEn')?.value||'').trim();
        const nameHe = ($id('tm_nameHe')?.value||'').trim();
        const shortHe = ($id('tm_shortHe')?.value||'').trim();
        const aliases = ($id('tm_aliases')?.value||'').split(';').map(a => a.trim()).filter(Boolean);
        try {
          if (typeof upsertTeam === 'function') {
            await upsertTeam({ team_id: teamId, name_en: nameEn, name_he: nameHe, short_he: shortHe, aliases, league: 'IL-National-League', season: '2024-25' });
          }
          const m=$id('teamModal'); if(m) m.classList.add('hidden');
          if (typeof listTeams === 'function') await listTeams();
          if (window.RAW && $id('jsonTa') && typeof parseNow==='function') { typeof showOk==='function' && showOk('קבוצה נשמרה. מרענן ניתוח...'); setTimeout(()=>{ parseNow(); }, 500); }
          else { typeof showOk==='function' && showOk('קבוצה נשמרה בהצלחה'); }
        } catch(err) { typeof showError==='function' && showError('שגיאה בשמירת קבוצה: ' + (err?.message || err)); }
      });

      // Manage Players modal
      wireClick('openPlayerModal', () => (typeof openEditPlayerMap==='function' && openEditPlayerMap(null)));
      wireClick('closePlayerModal', () => { const m=$id('playerModal'); if(m) m.classList.add('hidden'); });
      wireClick('cancelPlayerMap', () => { const m=$id('playerModal'); if(m) m.classList.add('hidden'); });

      wireClick('savePlayerMap', async () => {
        const rec = {
          first_en:  ($id('pm_firstEn')?.value||'').trim(),
          family_en: ($id('pm_familyEn')?.value||'').trim(),
          first_he:  ($id('pm_firstHe')?.value||'').trim(),
          family_he: ($id('pm_familyHe')?.value||'').trim(),
          jersey:    ($id('pm_jersey')?.value||'').trim(),
          team_en:   ($id('pm_teamEn')?.value||'').trim()
        };
        const suggested = (typeof computeLookupFromModal==='function'&&computeLookupFromModal()) || '';
        const keyEl = $id('pm_lookupKey');
        const key = (keyEl && keyEl.value ? keyEl.value : suggested).trim();
        if(!rec.first_en || !rec.family_en || !rec.first_he || !rec.family_he){ typeof showError==='function' && showError('יש למלא אנגלית + עברית (שם פרטי + משפחה)'); return; }
        rec.lookup_key = key;
        try {
          if (typeof upsertPlayerMapping === 'function') await upsertPlayerMapping(rec);
          const m=$id('playerModal'); if(m) m.classList.add('hidden');
          if (typeof listPlayerMappings === 'function') await listPlayerMappings();
          typeof showOk==='function' && showOk('מיפוי שחקן נשמר בהצלחה');
        } catch(err) { typeof showError==='function' && showError('שגיאה בשמירת מיפוי: ' + (err?.message||err)); }
      });

      // Export / Import buttons rewire (leave heavy logic to original modules)
      wireClick('exportDbBtn', () => (typeof exportFullDatabase==='function' && exportFullDatabase()));
      wireClick('importDbBtn', () => { const el=$id('importDbFile'); if(el) el.click(); });
      const idf = $id('importDbFile');
      if (idf && !idf.__wiredChg) {
        idf.__wiredChg = true;
        on(idf, 'change', (e) => { const file = e.target.files && e.target.files[0]; if (file && typeof importFullDatabase==='function') importFullDatabase(file); e.target.value=''; });
      }
      wireClick('reloadAllGamesBtn', () => (typeof reloadAllGamesFromJSON==='function' && reloadAllGamesFromJSON()));

      wireClick('exportTeamsBtn', () => (typeof exportTeams==='function' && exportTeams()));
      wireClick('importTeamsBtn', () => { const el=$id('importTeamsFile'); if(el) el.click(); });
      const itf = $id('importTeamsFile');
      if (itf && !itf.__wiredChg) {
        itf.__wiredChg = true;
        on(itf, 'change', (e) => { const file = e.target.files && e.target.files[0]; if (file && typeof importTeams==='function') importTeams(file); e.target.value=''; });
      }
    }catch(e){ console.error('last-mile wiring failed', e); }
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive'){
    setTimeout(ensure, 0);
  } else {
    document.addEventListener('DOMContentLoaded', ensure, false);
  }
  setTimeout(ensure, 1000);
})();
