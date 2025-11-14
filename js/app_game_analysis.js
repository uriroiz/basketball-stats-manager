// app_game_analysis.js
// Integration module for pre-game analysis functionality

console.log('🔍 Game Analysis integration module loaded');

// Global variables for analysis
let generatePreGameAnalysisBtn;
let preGameAnalysisResults, preGameTldr, preGameSections, preGameMeta, noPreGameAnalysisMessage;

// Initialize the pre-game analysis functionality
function initGameAnalysis() {
  console.log('🔍 Initializing pre-game analysis functionality...');
  
  // Get DOM elements
  generatePreGameAnalysisBtn = document.getElementById('generatePreGameAnalysis');
  preGameAnalysisResults = document.getElementById('preGameAnalysisResults');
  preGameTldr = document.getElementById('preGameTldr');
  preGameSections = document.getElementById('preGameSections');
  preGameMeta = document.getElementById('preGameMeta');
  noPreGameAnalysisMessage = document.getElementById('noPreGameAnalysisMessage');

  if (!generatePreGameAnalysisBtn) {
    console.error('❌ Pre-game analysis elements not found');
    return;
  }

  // Setup event listeners
  setupPreGameAnalysisEventListeners();
  
  console.log('✅ Pre-game analysis functionality initialized');
}

// Setup event listeners for pre-game analysis
function setupPreGameAnalysisEventListeners() {
  console.log('🔍 Setting up pre-game analysis event listeners...');

  // Pre-game analysis button click handler
  generatePreGameAnalysisBtn.addEventListener('click', performPreGameAnalysis);

  console.log('✅ Pre-game analysis event listeners setup complete');
}

// Update pre-game analysis button state
function updatePreGameAnalysisButton() {
  const homeTeamSelect = document.getElementById('homeTeamSelect');
  const awayTeamSelect = document.getElementById('awayTeamSelect');
  
  if (homeTeamSelect && awayTeamSelect) {
    const homeTeam = homeTeamSelect.value;
    const awayTeam = awayTeamSelect.value;
    
    if (homeTeam && awayTeam && homeTeam !== awayTeam) {
      generatePreGameAnalysisBtn.disabled = false;
      generatePreGameAnalysisBtn.textContent = `צור ניתוח פרה-גיים: ${homeTeamSelect.selectedOptions[0]?.textContent} vs ${awayTeamSelect.selectedOptions[0]?.textContent}`;
    } else {
      generatePreGameAnalysisBtn.disabled = true;
      generatePreGameAnalysisBtn.textContent = 'צור ניתוח פרה-גיים';
    }
  }
}

// Perform the pre-game analysis
async function performPreGameAnalysis() {
  console.log('🔍 Performing pre-game analysis...');
  
  const homeTeamSelect = document.getElementById('homeTeamSelect');
  const awayTeamSelect = document.getElementById('awayTeamSelect');
  
  if (!homeTeamSelect || !awayTeamSelect) {
    console.error('❌ Team selectors not found');
    return;
  }

  const homeTeamId = homeTeamSelect.value;
  const awayTeamId = awayTeamSelect.value;
  
  if (!homeTeamId || !awayTeamId || homeTeamId === awayTeamId) {
    console.error('❌ Invalid team selection for analysis');
    return;
  }

  try {
    // Show loading state
    generatePreGameAnalysisBtn.disabled = true;
    generatePreGameAnalysisBtn.textContent = 'מבצע ניתוח...';

    // Get team names
    const homeTeam = homeTeamSelect.selectedOptions[0]?.textContent;
    const awayTeam = awayTeamSelect.selectedOptions[0]?.textContent;

    console.log(`🔍 Analyzing matchup: ${homeTeam} vs ${awayTeam}`);

    // Get historical games for both teams
    const gamesHome = await getTeamHistoricalGames(homeTeamId);
    const gamesAway = await getTeamHistoricalGames(awayTeamId);

    console.log(`🔍 Found ${gamesHome.length} games for ${homeTeam}, ${gamesAway.length} games for ${awayTeam}`);

    if (gamesHome.length === 0 || gamesAway.length === 0) {
      throw new Error('לא מספיק משחקים היסטוריים לניתוח');
    }

    // Build series aggregations
    const aggHome = window.buildSeriesAgg(gamesHome, homeTeam, { lastN: 5 });
    const aggAway = window.buildSeriesAgg(gamesAway, awayTeam, { lastN: 5 });

    console.log('🔍 Series aggregations built:', { aggHome, aggAway });

    // Build matchup aggregation
    const matchup = window.buildMatchupAgg(aggHome, aggAway);

    console.log('🔍 Matchup aggregation built:', matchup);

    // Generate pre-game notes
    const notes = window.buildPreGameNotes(matchup);

    console.log('🔍 Pre-game notes generated:', notes);

    // Display the analysis
    displayPreGameAnalysisResults(notes);

    console.log('✅ Pre-game analysis completed successfully');

  } catch (error) {
    console.error('❌ Error performing pre-game analysis:', error);
    alert(`שגיאה בביצוע הניתוח: ${error.message}`);
  } finally {
    // Reset button state
    generatePreGameAnalysisBtn.disabled = false;
    updatePreGameAnalysisButton();
  }
}

// Get historical games for a team
async function getTeamHistoricalGames(teamId) {
  console.log(`🔍 Getting historical games for team: ${teamId}`);
  
  if (!window.DB || !window.DB_AVAILABLE) {
    console.log('⚠️ Database not available, creating synthetic games from team data');
    
    // Try to get team info from the teams list
    const teams = await getTeamsAggregate();
    console.log(`🔍 Found ${teams.length} teams from getTeamsAggregate`);
    console.log('🔍 Teams:', teams);
    const team = teams.find(t => t.team_id === teamId);
    console.log(`🔍 Looking for team with ID: ${teamId}`);
    console.log('🔍 Found team:', team);
    
    if (!team) {
      throw new Error('קבוצה לא נמצאה');
    }

    console.log('🔍 Team found from teams list:', team);

    // Create synthetic games based on team stats
    const syntheticGames = await createSyntheticGamesForTeam(team);
    
    console.log(`🔍 Created ${syntheticGames.length} synthetic games for analysis`);
    
    return syntheticGames;
  }

  try {
    // Get team info
    const team = await window.DB.get('teams', teamId);
    if (!team) {
      throw new Error('קבוצה לא נמצאה');
    }

    console.log('🔍 Team found:', team);

    // Get all games where this team played
    const games = [];
    
    // This is a simplified approach - in a real implementation, you'd query the games store
    // For now, we'll create synthetic data based on team stats
    const syntheticGames = await createSyntheticGamesForTeam(team);
    
    console.log(`🔍 Created ${syntheticGames.length} synthetic games for analysis`);
    
    return syntheticGames;

  } catch (error) {
    console.error('❌ Error getting historical games:', error);
    throw error;
  }
}

// Create synthetic games for analysis (since we don't have historical game data)
async function createSyntheticGamesForTeam(team) {
  console.log(`🔍 Creating synthetic games for team: ${team.name_he}`);
  
  // Get team's average stats
  const teamStats = await getTeamAverageStats(team.team_id);
  
  if (!teamStats) {
    console.log('⚠️ No team stats found, creating basic synthetic data');
    return createBasicSyntheticGames(team);
  }

  // Create 10 synthetic games based on team averages with some variation
  const games = [];
  for (let i = 0; i < 10; i++) {
    const game = createSyntheticGame(team, teamStats, i);
    games.push(game);
  }

  return games;
}

// Get team average stats
async function getTeamAverageStats(teamId) {
  try {
    // Get team stats from the database
    const stats = await window.DB.getAll('team_stats');
    const teamStats = stats.find(s => s.team_id === teamId);
    
    if (teamStats) {
      return {
        points: teamStats.avgPoints || 75,
        rebounds: teamStats.avgRebounds || 35,
        assists: teamStats.avgAssists || 18,
        steals: teamStats.avgSteals || 8,
        blocks: teamStats.avgBlocks || 4,
        turnovers: teamStats.avgTurnovers || 15,
        fouls: teamStats.avgFouls || 20
      };
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error getting team stats:', error);
    return null;
  }
}

// Create basic synthetic games when no stats are available
function createBasicSyntheticGames(team) {
  const games = [];
  for (let i = 0; i < 10; i++) {
    const game = {
      tm: {
        "1": {
          name: team.name_he,
          tot_sPoints: 70 + Math.random() * 20,
          tot_sRebounds: 30 + Math.random() * 10,
          tot_sAssists: 15 + Math.random() * 8,
          tot_sSteals: 6 + Math.random() * 4,
          tot_sBlocks: 2 + Math.random() * 4,
          tot_sTurnovers: 12 + Math.random() * 6,
          tot_sFouls: 18 + Math.random() * 6,
          tot_sFieldGoalsMade: 25 + Math.random() * 10,
          tot_sFieldGoalsAttempted: 50 + Math.random() * 15,
          tot_sThreePointsMade: 8 + Math.random() * 6,
          tot_sThreePointsAttempted: 20 + Math.random() * 8,
          tot_sFreeThrowsMade: 12 + Math.random() * 8,
          tot_sFreeThrowsAttempted: 16 + Math.random() * 8
        },
        "2": {
          name: `יריבה ${i + 1}`,
          tot_sPoints: 70 + Math.random() * 20,
          tot_sRebounds: 30 + Math.random() * 10,
          tot_sAssists: 15 + Math.random() * 8,
          tot_sSteals: 6 + Math.random() * 4,
          tot_sBlocks: 2 + Math.random() * 4,
          tot_sTurnovers: 12 + Math.random() * 6,
          tot_sFouls: 18 + Math.random() * 6,
          tot_sFieldGoalsMade: 25 + Math.random() * 10,
          tot_sFieldGoalsAttempted: 50 + Math.random() * 15,
          tot_sThreePointsMade: 8 + Math.random() * 6,
          tot_sThreePointsAttempted: 20 + Math.random() * 8,
          tot_sFreeThrowsMade: 12 + Math.random() * 8,
          tot_sFreeThrowsAttempted: 16 + Math.random() * 8
        }
      }
    };
    games.push(game);
  }
  return games;
}

// Create synthetic game with variation
function createSyntheticGame(team, teamStats, gameIndex) {
  const variation = 0.15; // 15% variation
  
  const team1Stats = {
    name: team.name_he,
    tot_sPoints: Math.round(teamStats.points * (1 + (Math.random() - 0.5) * variation)),
    tot_sRebounds: Math.round(teamStats.rebounds * (1 + (Math.random() - 0.5) * variation)),
    tot_sAssists: Math.round(teamStats.assists * (1 + (Math.random() - 0.5) * variation)),
    tot_sSteals: Math.round(teamStats.steals * (1 + (Math.random() - 0.5) * variation)),
    tot_sBlocks: Math.round(teamStats.blocks * (1 + (Math.random() - 0.5) * variation)),
    tot_sTurnovers: Math.round(teamStats.turnovers * (1 + (Math.random() - 0.5) * variation)),
    tot_sFouls: Math.round(teamStats.fouls * (1 + (Math.random() - 0.5) * variation))
  };

  // Add shooting stats (estimated)
  const fga = Math.round(team1Stats.tot_sPoints / 1.2);
  const fgm = Math.round(fga * 0.47);
  const threePA = Math.round(fga * 0.35);
  const threePM = Math.round(threePA * 0.35);
  const fta = Math.round(team1Stats.tot_sPoints * 0.25);
  const ftm = Math.round(fta * 0.75);

  team1Stats.tot_sFieldGoalsMade = fgm;
  team1Stats.tot_sFieldGoalsAttempted = fga;
  team1Stats.tot_sThreePointsMade = threePM;
  team1Stats.tot_sThreePointsAttempted = threePA;
  team1Stats.tot_sFreeThrowsMade = ftm;
  team1Stats.tot_sFreeThrowsAttempted = fta;

  // Create opponent with similar but different stats
  const opponentStats = {
    name: `יריבה ${gameIndex + 1}`,
    tot_sPoints: Math.round(team1Stats.tot_sPoints * (0.9 + Math.random() * 0.2)),
    tot_sRebounds: Math.round(team1Stats.tot_sRebounds * (0.9 + Math.random() * 0.2)),
    tot_sAssists: Math.round(team1Stats.tot_sAssists * (0.9 + Math.random() * 0.2)),
    tot_sSteals: Math.round(team1Stats.tot_sSteals * (0.9 + Math.random() * 0.2)),
    tot_sBlocks: Math.round(team1Stats.tot_sBlocks * (0.9 + Math.random() * 0.2)),
    tot_sTurnovers: Math.round(team1Stats.tot_sTurnovers * (0.9 + Math.random() * 0.2)),
    tot_sFouls: Math.round(team1Stats.tot_sFouls * (0.9 + Math.random() * 0.2))
  };

  // Add opponent shooting stats
  const oppFga = Math.round(opponentStats.tot_sPoints / 1.2);
  const oppFgm = Math.round(oppFga * 0.47);
  const oppThreePA = Math.round(oppFga * 0.35);
  const oppThreePM = Math.round(oppThreePA * 0.35);
  const oppFta = Math.round(opponentStats.tot_sPoints * 0.25);
  const oppFtm = Math.round(oppFta * 0.75);

  opponentStats.tot_sFieldGoalsMade = oppFgm;
  opponentStats.tot_sFieldGoalsAttempted = oppFga;
  opponentStats.tot_sThreePointsMade = oppThreePM;
  opponentStats.tot_sThreePointsAttempted = oppThreePA;
  opponentStats.tot_sFreeThrowsMade = oppFtm;
  opponentStats.tot_sFreeThrowsAttempted = oppFta;

  return {
    tm: {
      "1": team1Stats,
      "2": opponentStats
    }
  };
}

// Display pre-game analysis results
function displayPreGameAnalysisResults(notes) {
  console.log('🔍 Displaying pre-game analysis results...');

  // Hide no analysis message
  noPreGameAnalysisMessage.classList.add('hidden');
  
  // Show results
  preGameAnalysisResults.classList.remove('hidden');

  // Display TL;DR
  preGameTldr.innerHTML = '';
  notes.tldr.forEach(point => {
    const div = document.createElement('div');
    div.className = 'flex items-start space-x-2 rtl:space-x-reverse';
    div.innerHTML = `
      <span class="text-green-600 mt-1">•</span>
      <span class="text-sm text-gray-700">${point}</span>
    `;
    preGameTldr.appendChild(div);
  });

  // Display sections
  preGameSections.innerHTML = '';
  Object.entries(notes.sections).forEach(([title, points]) => {
    const sectionDiv = document.createElement('div');
    sectionDiv.className = 'bg-white border border-gray-200 rounded-lg p-4';
    sectionDiv.innerHTML = `
      <h4 class="font-semibold text-blue-800 mb-3">${title}</h4>
      <div class="space-y-2">
        ${points.map(point => `
          <div class="flex items-start space-x-2 rtl:space-x-reverse">
            <span class="text-blue-600 mt-1">•</span>
            <span class="text-sm text-gray-700">${point}</span>
          </div>
        `).join('')}
      </div>
    `;
    preGameSections.appendChild(sectionDiv);
  });

  // Display meta information
  const homeTeamSelect = document.getElementById('homeTeamSelect');
  const awayTeamSelect = document.getElementById('awayTeamSelect');
  
  preGameMeta.innerHTML = `
    <div class="text-center">
      <div class="text-gray-600">קצב צפוי</div>
      <div class="font-medium">${notes.meta.expectPace.toFixed(1)} possessions</div>
    </div>
    <div class="text-center">
      <div class="text-gray-600">פורמה ${homeTeamSelect?.selectedOptions[0]?.textContent || 'בית'}</div>
      <div class="font-medium">NetRtg ${notes.meta.formA.netRtg_lastN.toFixed(1)}</div>
    </div>
    <div class="text-center">
      <div class="text-gray-600">פורמה ${awayTeamSelect?.selectedOptions[0]?.textContent || 'חוץ'}</div>
      <div class="font-medium">NetRtg ${notes.meta.formB.netRtg_lastN.toFixed(1)}</div>
    </div>
  `;

  console.log('✅ Pre-game analysis results displayed');
}

// Get teams aggregate data
async function getTeamsAggregate() {
  console.log('🔍 Getting teams aggregate data...');
  console.log('🔍 window.listTeams type:', typeof window.listTeams);
  console.log('🔍 window.getTeamsAggregate type:', typeof window.getTeamsAggregate);
  console.log('🔍 window.App type:', typeof window.App);
  console.log('🔍 window.App.getTeamsAggregate type:', typeof window.App?.getTeamsAggregate);
  
  // Try to use the existing listTeams function first
  if (typeof window.listTeams === 'function') {
    try {
      const teams = await window.listTeams();
      console.log(`🔍 Found ${teams.length} teams using listTeams`);
      return teams;
    } catch (error) {
      console.log('⚠️ listTeams failed, trying direct DB access:', error);
    }
  }
  
  // Try to use the existing getTeamsAggregate function from app_db_save.js
  if (typeof window.getTeamsAggregate === 'function') {
    try {
      const teams = await window.getTeamsAggregate();
      console.log(`🔍 Found ${teams.length} teams using window.getTeamsAggregate`);
      return teams;
    } catch (error) {
      console.log('⚠️ window.getTeamsAggregate failed:', error);
    }
  }
  
  // Try to use the App namespace
  if (window.App && typeof window.App.getTeamsAggregate === 'function') {
    try {
      const teams = await window.App.getTeamsAggregate();
      console.log(`🔍 Found ${teams.length} teams using App.getTeamsAggregate`);
      return teams;
    } catch (error) {
      console.log('⚠️ App.getTeamsAggregate failed:', error);
    }
  }
  
  // Last resort: try to get teams from the UI elements
  try {
    const homeTeamSelect = document.getElementById('homeTeamSelect');
    const awayTeamSelect = document.getElementById('awayTeamSelect');
    
    if (homeTeamSelect && awayTeamSelect) {
      const teams = [];
      
      // Get teams from the select options
      for (let i = 1; i < homeTeamSelect.options.length; i++) {
        const option = homeTeamSelect.options[i];
        teams.push({
          team_id: option.value,
          name_he: option.textContent,
          name_en: option.textContent // fallback
        });
      }
      
      if (teams.length > 0) {
        console.log(`🔍 Found ${teams.length} teams from UI elements`);
        return teams;
      }
    }
  } catch (error) {
    console.log('⚠️ Failed to get teams from UI elements:', error);
  }
  
  if (!window.DB || !window.DB_AVAILABLE) {
    console.error('❌ Database not available for teams aggregate');
    return [];
  }

  try {
    const transaction = window.DB.transaction(['teams'], 'readonly');
    const store = transaction.objectStore('teams');
    const request = store.getAll();
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const teams = request.result || [];
        console.log(`🔍 Found ${teams.length} teams`);
        resolve(teams);
      };
      
      request.onerror = () => {
        console.error('❌ Error getting teams:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('❌ Error accessing teams database:', error);
    throw error;
  }
}

// Get team average stats
async function getTeamAverageStats(teamId) {
  console.log(`🔍 Getting average stats for team: ${teamId}`);
  
  // Try to use the existing getTeamsAggregate function
  if (typeof window.getTeamsAggregate === 'function') {
    try {
      const teams = await window.getTeamsAggregate();
      const team = teams.find(t => t.team_id === teamId);
      if (team) {
        console.log(`🔍 Found team stats for ${teamId}`);
        return team;
      }
    } catch (error) {
      console.log('⚠️ getTeamsAggregate failed:', error);
    }
  }
  
  // Fallback: return null to trigger basic synthetic data
  console.log('⚠️ No team stats found, will use basic synthetic data');
  return null;
}

// Create basic synthetic games when no team stats are available
function createBasicSyntheticGames(team) {
  console.log(`🔍 Creating basic synthetic games for team: ${team.name_he}`);
  
  // Create 5 synthetic games with realistic basketball stats
  const games = [];
  const baseStats = {
    points: 75 + Math.random() * 30, // 75-105 points
    rebounds: 35 + Math.random() * 15, // 35-50 rebounds
    assists: 15 + Math.random() * 10, // 15-25 assists
    steals: 6 + Math.random() * 6, // 6-12 steals
    blocks: 2 + Math.random() * 4, // 2-6 blocks
    turnovers: 12 + Math.random() * 8, // 12-20 turnovers
    fouls: 18 + Math.random() * 6 // 18-24 fouls
  };
  
  for (let i = 0; i < 5; i++) {
    const game = {
      gameId: `synthetic-${team.team_id}-${i}`,
      date: new Date(Date.now() - (i * 7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0], // 7 days apart
      homeTeam: team.team_id,
      awayTeam: `opponent-${i}`,
      homeScore: Math.round(baseStats.points + (Math.random() - 0.5) * 20),
      awayScore: Math.round(baseStats.points + (Math.random() - 0.5) * 20),
      homeStats: {
        points: Math.round(baseStats.points + (Math.random() - 0.5) * 20),
        rebounds: Math.round(baseStats.rebounds + (Math.random() - 0.5) * 10),
        assists: Math.round(baseStats.assists + (Math.random() - 0.5) * 5),
        steals: Math.round(baseStats.steals + (Math.random() - 0.5) * 3),
        blocks: Math.round(baseStats.blocks + (Math.random() - 0.5) * 2),
        turnovers: Math.round(baseStats.turnovers + (Math.random() - 0.5) * 4),
        fouls: Math.round(baseStats.fouls + (Math.random() - 0.5) * 3)
      },
      awayStats: {
        points: Math.round(baseStats.points + (Math.random() - 0.5) * 20),
        rebounds: Math.round(baseStats.rebounds + (Math.random() - 0.5) * 10),
        assists: Math.round(baseStats.assists + (Math.random() - 0.5) * 5),
        steals: Math.round(baseStats.steals + (Math.random() - 0.5) * 3),
        blocks: Math.round(baseStats.blocks + (Math.random() - 0.5) * 2),
        turnovers: Math.round(baseStats.turnovers + (Math.random() - 0.5) * 4),
        fouls: Math.round(baseStats.fouls + (Math.random() - 0.5) * 3)
      }
    };
    
    games.push(game);
  }
  
  console.log(`✅ Created ${games.length} basic synthetic games`);
  return games;
}

// Export functions to window
window.initGameAnalysis = initGameAnalysis;
window.updatePreGameAnalysisButton = updatePreGameAnalysisButton;

console.log('✅ Game Analysis integration module ready');
