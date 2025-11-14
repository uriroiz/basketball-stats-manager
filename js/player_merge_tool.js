/**
 * Player Merge Tool - Identifies and merges players with similar names
 * Similar to team merge tool but for players
 */

// Global variables for detected player aliases
let detectedPlayerAliases = [];

/**
 * Initialize the Player Merge Tool
 */
function initPlayerMergeTool() {
  console.log('🔧 Initializing Player Merge Tool...');
  
  // Set up event listeners
  const scanPlayerAliasesBtn = document.getElementById('scanPlayerAliasesBtn');
  const mergePlayersBtn = document.getElementById('mergePlayersBtn');
  
  if (scanPlayerAliasesBtn) {
    scanPlayerAliasesBtn.addEventListener('click', scanPlayerAliases);
  }
  
  if (mergePlayersBtn) {
    mergePlayersBtn.addEventListener('click', executePlayerMerges);
  }
  
  console.log('✅ Player Merge Tool initialized');
}

/**
 * Scan for player aliases (similar names)
 */
async function scanPlayerAliases() {
  console.log('🔍 === Starting Player Alias Scan ===');
  
  try {
    // Check database availability
    if (!window.DB_AVAILABLE && !window.App?.DB_AVAILABLE) {
      showError('מסד הנתונים לא זמין');
      return;
    }
    
    const db = window.DB || window.App?.DB;
    if (!db) {
      showError('מסד הנתונים לא זמין');
      return;
    }
    
    console.log('✅ Database available, scanning players...');
    
    // Get all players from the players store
    const players = await getAllPlayersFromDB();
    console.log(`🔍 Found ${players.length} players in database`);
    
    // Detect similar players
    const aliases = detectPlayerAliases(players);
    console.log(`🔍 Detected ${aliases.length} player alias groups`);
    
    // Store detected aliases
    detectedPlayerAliases = aliases;
    
    // Display results
    displayPlayerAliases(aliases);
    
    // Enable merge button if aliases found
    const mergeBtn = document.getElementById('mergePlayersBtn');
    if (mergeBtn) {
      mergeBtn.disabled = aliases.length === 0;
    }
    
    showOk(`נמצאו ${aliases.length} קבוצות שחקנים דומים למיזוג`);
    
  } catch (error) {
    console.error('❌ Error scanning player aliases:', error);
    showError(`שגיאה בסריקת שחקנים: ${error.message}`);
  }
}

/**
 * Get all players from the players store with their games and appearances
 */
async function getAllPlayersFromDB() {
  return new Promise(async (resolve, reject) => {
    const db = window.DB || window.App?.DB;
    if (!db) {
      reject(new Error('Database not available'));
      return;
    }
    
    try {
      // Get all players
      const players = await new Promise((resolve, reject) => {
        const transaction = db.transaction(['players'], 'readonly');
        const store = transaction.objectStore('players');
        const request = store.getAll();
        
        request.onsuccess = () => {
          resolve(request.result || []);
        };
        
        request.onerror = () => {
          reject(new Error('Failed to get players from database'));
        };
      });
      
      // Get all appearances
      const appearances = await new Promise((resolve, reject) => {
        const transaction = db.transaction(['appearances'], 'readonly');
        const store = transaction.objectStore('appearances');
        const request = store.getAll();
        
        request.onsuccess = () => {
          resolve(request.result || []);
        };
        
        request.onerror = () => {
          reject(new Error('Failed to get appearances from database'));
        };
      });
      
      // Get all player stats (which contain game information)
      const playerStats = await new Promise((resolve, reject) => {
        const transaction = db.transaction(['player_stats'], 'readonly');
        const store = transaction.objectStore('player_stats');
        const request = store.getAll();
        
        request.onsuccess = () => {
          resolve(request.result || []);
        };
        
        request.onerror = () => {
          reject(new Error('Failed to get player stats from database'));
        };
      });
      
      // Enrich players with appearances and games
      const enrichedPlayers = players.map(player => {
        const playerAppearances = appearances.filter(app => app.playerId === player.id);
        const playerGames = playerStats.filter(stat => stat.playerId === player.id);
        
        console.log(`🔍 Player ${player.firstNameHe} ${player.familyNameHe}: ${playerAppearances.length} appearances, ${playerGames.length} games`);
        
        return {
          ...player,
          appearances: playerAppearances,
          games: playerGames
        };
      });
      
      resolve(enrichedPlayers);
      
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Detect player aliases (similar names)
 */
function detectPlayerAliases(players) {
  console.log('🔍 === Starting Player Alias Detection ===');
  const aliases = [];
  const processed = new Set();
  
  // Group players by team and jersey for more efficient comparison
  const playersByTeamJersey = new Map();
  
  for (const player of players) {
    const team = getPlayerTeam(player);
    const jersey = getPlayerJersey(player);
    const key = `${team}|${jersey}`;
    
    if (!playersByTeamJersey.has(key)) {
      playersByTeamJersey.set(key, []);
    }
    playersByTeamJersey.get(key).push(player);
  }
  
  console.log(`🔍 Grouped players into ${playersByTeamJersey.size} team-jersey groups`);
  
  // Check for similar players within each team-jersey group
  for (const [key, groupPlayers] of playersByTeamJersey) {
    if (groupPlayers.length < 2) {
      continue; // Skip groups with only one player
    }
    
    console.log(`🔍 Checking group: ${key} (${groupPlayers.length} players)`);
    
    for (let i = 0; i < groupPlayers.length; i++) {
      const player1 = groupPlayers[i];
      
      if (processed.has(player1.id)) {
        continue;
      }
      
      const similarPlayers = [player1];
      processed.add(player1.id);
      
      for (let j = i + 1; j < groupPlayers.length; j++) {
        const player2 = groupPlayers[j];
        
        if (processed.has(player2.id)) {
          continue;
        }
        
        // Check if players are similar
        if (arePlayersSimilar(player1, player2)) {
          console.log(`🔍 Similar players found: "${player1.firstNameHe} ${player1.familyNameHe}" and "${player2.firstNameHe} ${player2.familyNameHe}"`);
          similarPlayers.push(player2);
          processed.add(player2.id);
        }
      }
      
      // If we found similar players, create an alias group
      if (similarPlayers.length > 1) {
        const targetPlayer = selectTargetPlayer(similarPlayers);
        aliases.push({
          targetPlayer: targetPlayer,
          aliasPlayers: similarPlayers.filter(p => p.id !== targetPlayer.id)
        });
        console.log(`✅ Added alias group: ${similarPlayers.length} players`);
      }
    }
  }
  
  // Also check for very high name similarity across all players (for cases where team/jersey data is missing)
  console.log('🔍 Checking for high similarity matches across all players...');
  
  for (let i = 0; i < players.length; i++) {
    const player1 = players[i];
    
    if (processed.has(player1.id)) {
      continue;
    }
    
    const similarPlayers = [player1];
    processed.add(player1.id);
    
    for (let j = i + 1; j < players.length; j++) {
      const player2 = players[j];
      
      if (processed.has(player2.id)) {
        continue;
      }
      
      // Check for very high name similarity (95%+)
      const name1 = `${player1.firstNameHe || ''} ${player1.familyNameHe || ''}`.trim().toLowerCase();
      const name2 = `${player2.firstNameHe || ''} ${player2.familyNameHe || ''}`.trim().toLowerCase();
      
      if (name1 && name2) {
        const similarity = calculateNameSimilarity(name1, name2);
        if (similarity > 95) {
          console.log(`🔍 Very high similarity found: "${name1}" and "${name2}" (${similarity}%)`);
          similarPlayers.push(player2);
          processed.add(player2.id);
        }
      }
    }
    
    // If we found similar players, create an alias group
    if (similarPlayers.length > 1) {
      const targetPlayer = selectTargetPlayer(similarPlayers);
      aliases.push({
        targetPlayer: targetPlayer,
        aliasPlayers: similarPlayers.filter(p => p.id !== targetPlayer.id)
      });
      console.log(`✅ Added high similarity alias group: ${similarPlayers.length} players`);
    }
  }
  
  return aliases;
}

/**
 * Check if two players are similar
 */
function arePlayersSimilar(player1, player2) {
  // Get player names
  const name1 = `${player1.firstNameHe || ''} ${player1.familyNameHe || ''}`.trim().toLowerCase();
  const name2 = `${player2.firstNameHe || ''} ${player2.familyNameHe || ''}`.trim().toLowerCase();
  
  console.log(`🔍 Comparing: "${name1}" vs "${name2}"`);
  
  // Skip if names are empty
  if (!name1 || !name2) {
    return false;
  }
  
  // Get team and jersey information from appearances or games
  const team1 = getPlayerTeam(player1);
  const team2 = getPlayerTeam(player2);
  const jersey1 = getPlayerJersey(player1);
  const jersey2 = getPlayerJersey(player2);
  
  console.log(`🔍 Team comparison: "${team1}" vs "${team2}"`);
  console.log(`🔍 Jersey comparison: "${jersey1}" vs "${jersey2}"`);
  
  // Check if they have the same team and jersey (strong indicator of same player)
  const sameTeam = team1 && team2 && team1 === team2;
  const sameJersey = jersey1 && jersey2 && jersey1 === jersey2;
  
  console.log(`🔍 Same team: ${sameTeam}, Same jersey: ${sameJersey}`);
  
  // If same team and jersey, check name similarity
  if (sameTeam && sameJersey) {
    const similarity = calculateNameSimilarity(name1, name2);
    console.log(`🔍 Name similarity: ${similarity}%`);
    
    // Consider similar if similarity is above 80%
    if (similarity > 80) {
      console.log(`✅ Players are similar (${similarity}% similarity, same team & jersey)`);
      return true;
    }
  }
  
  // Also check for very high name similarity (95%+) even without team/jersey match
  // This handles cases where team/jersey data might be missing
  const highSimilarity = calculateNameSimilarity(name1, name2);
  if (highSimilarity > 95) {
    console.log(`✅ Players are similar (${highSimilarity}% similarity, very high match)`);
    return true;
  }
  
  return false;
}

/**
 * Get player team from appearances or games
 */
function getPlayerTeam(player) {
  // Try to get from appearances first
  if (player.appearances && player.appearances.length > 0) {
    return player.appearances[0].teamId || '';
  }
  
  // Try to get from games
  if (player.games && player.games.length > 0) {
    return player.games[0].teamId || '';
  }
  
  return '';
}

/**
 * Get player jersey from appearances or games
 */
function getPlayerJersey(player) {
  // Try to get from appearances first
  if (player.appearances && player.appearances.length > 0) {
    return player.appearances[0].shirtNumber || '';
  }
  
  // Try to get from games
  if (player.games && player.games.length > 0) {
    return player.games[0].shirtNumber || '';
  }
  
  return '';
}

/**
 * Calculate name similarity using Levenshtein distance
 */
function calculateNameSimilarity(name1, name2) {
  const distance = levenshteinDistance(name1, name2);
  const maxLength = Math.max(name1.length, name2.length);
  
  if (maxLength === 0) return 100;
  
  const similarity = ((maxLength - distance) / maxLength) * 100;
  return Math.round(similarity);
}

/**
 * Levenshtein distance calculation
 */
function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Select the target player from a group of similar players
 */
function selectTargetPlayer(players) {
  // Prefer player with more games
  let targetPlayer = players[0];
  let maxGames = (targetPlayer.games || []).length;
  
  for (const player of players) {
    const gameCount = (player.games || []).length;
    if (gameCount > maxGames) {
      targetPlayer = player;
      maxGames = gameCount;
    }
  }
  
  return targetPlayer;
}

/**
 * Display player aliases in the UI
 */
function displayPlayerAliases(aliases) {
  const resultsDiv = document.getElementById('playerAliasesResults');
  const tableBody = document.getElementById('playerAliasesTableBody');
  
  if (!resultsDiv || !tableBody) {
    console.error('❌ Player aliases UI elements not found');
    return;
  }
  
  // Clear previous results
  tableBody.innerHTML = '';
  
  if (aliases.length === 0) {
    resultsDiv.classList.add('hidden');
    return;
  }
  
  // Show results
  resultsDiv.classList.remove('hidden');
  
  // Add each alias group to the table
  aliases.forEach((alias, index) => {
    const row = document.createElement('tr');
    
    const targetName = alias.targetPlayer ? 
      `${alias.targetPlayer.firstNameHe || ''} ${alias.targetPlayer.familyNameHe || ''}`.trim() : 
      'Unknown';
    
    // Get team and jersey from appearances or games
    let targetTeam = 'N/A';
    let targetJersey = 'N/A';
    
    if (alias.targetPlayer) {
      // Try to get team and jersey from appearances
      if (alias.targetPlayer.appearances && alias.targetPlayer.appearances.length > 0) {
        const firstAppearance = alias.targetPlayer.appearances[0];
        targetTeam = firstAppearance.team_id || 'N/A';
        targetJersey = firstAppearance.jersey || 'N/A';
      }
      // Try to get from games if appearances not available
      else if (alias.targetPlayer.games && alias.targetPlayer.games.length > 0) {
        const firstGame = alias.targetPlayer.games[0];
        targetTeam = firstGame.team || 'N/A';
        targetJersey = firstGame.jersey || 'N/A';
      }
    }
    
    const aliasNames = alias.aliasPlayers.map(p => 
      `${p.firstNameHe || ''} ${p.familyNameHe || ''}`.trim()
    ).join(', ');
    
    row.innerHTML = `
      <td class="px-3 py-2 text-center">
        <input type="checkbox" class="player-merge-checkbox" data-index="${index}" />
      </td>
      <td class="px-3 py-2 text-right">${targetName}</td>
      <td class="px-3 py-2 text-right">${targetTeam}</td>
      <td class="px-3 py-2 text-center">${targetJersey}</td>
      <td class="px-3 py-2 text-right">${aliasNames}</td>
      <td class="px-3 py-2 text-center">${alias.aliasPlayers.length}</td>
    `;
    
    tableBody.appendChild(row);
  });
  
  // Update merge button state
  updateMergeButtonState();
  
  // Add listener to checkboxes to update button state
  const checkboxes = document.querySelectorAll('.player-merge-checkbox');
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', updateMergeButtonState);
  });
  
  console.log(`✅ Displayed ${aliases.length} player alias groups`);
}

/**
 * Update the merge button state based on selected checkboxes
 */
function updateMergeButtonState() {
  const mergeBtn = document.getElementById('mergePlayersBtn');
  if (!mergeBtn) return;
  
  const checkboxes = document.querySelectorAll('.player-merge-checkbox:checked');
  mergeBtn.disabled = checkboxes.length === 0;
}

/**
 * Execute player merges
 */
async function executePlayerMerges() {
  // Get selected checkboxes
  const checkedBoxes = document.querySelectorAll('.player-merge-checkbox:checked');
  
  if (checkedBoxes.length === 0) {
    showError('לא נבחרו שחקנים למיזוג');
    return;
  }
  
  // Get the selected aliases
  const selectedAliases = [];
  checkedBoxes.forEach(checkbox => {
    const index = parseInt(checkbox.getAttribute('data-index'));
    if (detectedPlayerAliases[index]) {
      selectedAliases.push(detectedPlayerAliases[index]);
    }
  });
  
  if (selectedAliases.length === 0) {
    showError('לא נמצאו שחקנים למיזוג');
    return;
  }
  
  const confirmed = confirm(
    `האם אתה בטוח שברצונך למזג ${selectedAliases.length} קבוצות שחקנים נבחרות?\n\n` +
    `פעולה זו לא ניתנת לביטול.\n\n` +
    `מומלץ לגבות את מסד הנתונים לפני המיזוג.`
  );
  
  if (!confirmed) {
    return;
  }
  
  console.log('🔄 === Starting Player Merges ===');
  console.log(`Selected ${selectedAliases.length} player groups to merge`);
  
  // 🔥 NEW: Count players before merge
  const beforeCount = await debugCountPlayers();
  console.log(`📊 לפני מיזוג: ${beforeCount} שחקנים`);
  
  try {
    let mergedCount = 0;
    
    for (const alias of selectedAliases) {
      await mergePlayerAliases(alias);
      mergedCount++;
    }
    
    // 🔥 NEW: Count players after merge
    const afterCount = await debugCountPlayers();
    console.log(`📊 אחרי מיזוג: ${afterCount} שחקנים`);
    console.log(`📊 נמחקו: ${beforeCount - afterCount} שחקנים`);
    
    showOk(`הושלם מיזוג ${mergedCount} קבוצות שחקנים בהצלחה!`);
    
    // 🔥 CRITICAL: Wait for all DB transactions to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Re-scan to show updated results
    await scanPlayerAliases();
    
    // 🔥 CRITICAL: Force full data reload from DB
    console.log('🔄 מרענן את כל הנתונים מה-DB...');
    
    // Clear any in-memory caches if they exist
    if (window.playersCache) {
      window.playersCache.clear();
    }
    
    // Refresh player statistics table with fresh DB data
    if (typeof window.renderPlayersTable === 'function') {
      await window.renderPlayersTable();
    }
    
    // Refresh any other player-related displays
    if (typeof window.loadPlayers === 'function') {
      await window.loadPlayers();
    }
    
  } catch (error) {
    console.error('❌ Error executing player merges:', error);
    showError(`שגיאה במיזוג שחקנים: ${error.message}`);
  }
}

/**
 * Merge a group of player aliases
 */
async function mergePlayerAliases(alias) {
  const targetPlayer = alias.targetPlayer;
  const aliasPlayers = alias.aliasPlayers;
  
  console.log(`🔄 Merging ${aliasPlayers.length} players into target: ${targetPlayer.firstNameHe} ${targetPlayer.familyNameHe} (ID: ${targetPlayer.id})`);
  
  // 🔥 IMPORTANT: We do NOT merge games/appearances into targetPlayer object here!
  // Instead, we update the DB directly, then reload everything fresh
  
  // Step 1: Update player_stats to point to target player
  for (const aliasPlayer of aliasPlayers) {
    if (aliasPlayer.games && aliasPlayer.games.length > 0) {
      console.log(`🔄 Updating ${aliasPlayer.games.length} games for player ${aliasPlayer.firstNameHe} ${aliasPlayer.familyNameHe}`);
      for (const game of aliasPlayer.games) {
        game.playerId = targetPlayer.id;
        await updatePlayerStatsInDB(game);
      }
    }
  }
  
  // Step 2: Update appearances to point to target player
  for (const aliasPlayer of aliasPlayers) {
    if (aliasPlayer.appearances && aliasPlayer.appearances.length > 0) {
      console.log(`🔄 Updating ${aliasPlayer.appearances.length} appearances for player ${aliasPlayer.firstNameHe} ${aliasPlayer.familyNameHe}`);
      for (const appearance of aliasPlayer.appearances) {
        appearance.playerId = targetPlayer.id;
        await updateAppearanceInDB(appearance);
      }
    }
  }
  
  // Step 3: Wait a bit to ensure all updates are committed
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // Step 4: Now reload FRESH data from DB for the target player
  console.log('🔄 טוען נתונים מעודכנים מה-DB...');
  
  const updatedGames = await getAllPlayerStatsForPlayer(targetPlayer.id);
  const updatedAppearances = await getAllAppearancesForPlayer(targetPlayer.id);
  
  console.log(`✅ נטענו מחדש: ${updatedGames.length} משחקים, ${updatedAppearances.length} הופעות`);
  
  // Step 5: Create a fresh player object with the updated data
  const updatedPlayer = {
    id: targetPlayer.id,
    firstNameHe: targetPlayer.firstNameHe,
    familyNameHe: targetPlayer.familyNameHe,
    firstNameEn: targetPlayer.firstNameEn,
    familyNameEn: targetPlayer.familyNameEn,
    games: updatedGames,
    appearances: updatedAppearances,
    // 🔥 IMPORTANT: Use the CORRECT Hebrew name from target player
    name: `${targetPlayer.firstNameHe || ''} ${targetPlayer.familyNameHe || ''}`.trim(),
    // Extract jersey and team from the most recent appearance
    jersey: updatedAppearances.length > 0 ? updatedAppearances[0].jersey : targetPlayer.jersey,
    team: updatedAppearances.length > 0 ? updatedAppearances[0].team_id : targetPlayer.team
  };
  
  // Step 6: Recalculate aggregate statistics
  recalculatePlayerStats(updatedPlayer);
  
  // Step 7: Save the updated player back to DB
  await updatePlayerInDB(updatedPlayer);
  
  console.log(`✅ עדכון שחקן יעד: ${updatedPlayer.gamesPlayed} משחקים, ${updatedPlayer.totalPoints} נקודות`);
  
  // Step 8: Delete alias players (one by one, with confirmation)
  for (const aliasPlayer of aliasPlayers) {
    console.log(`🗑️ מוחק שחקן: ${aliasPlayer.firstNameHe} ${aliasPlayer.familyNameHe} (ID: ${aliasPlayer.id})`);
    await deletePlayerFromDB(aliasPlayer.id);
    
    // Wait a bit to ensure deletion is committed
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // 🔥 Verify deletion succeeded
    const stillExists = await verifyPlayerDeleted(aliasPlayer.id);
    if (stillExists) {
      console.error(`❌ שגיאה: שחקן ${aliasPlayer.id} עדיין קיים אחרי מחיקה!`);
      throw new Error(`Failed to delete player ${aliasPlayer.id}`);
    } else {
      console.log(`✅ אישור: שחקן ${aliasPlayer.id} נמחק בהצלחה`);
    }
  }
  
  console.log(`✅ מיזוג הושלם בהצלחה: ${aliasPlayers.length} שחקנים מוזגו`);
}

/**
 * Update a player in the database
 */
async function updatePlayerInDB(player) {
  return new Promise((resolve, reject) => {
    const db = window.DB || window.App?.DB;
    if (!db) {
      reject(new Error('Database not available'));
      return;
    }
    
    const transaction = db.transaction(['players'], 'readwrite');
    const store = transaction.objectStore('players');
    const request = store.put(player);
    
    request.onsuccess = () => {
      resolve(request.result);
    };
    
    request.onerror = () => {
      reject(new Error('Failed to update player in database'));
    };
  });
}

/**
 * Update an appearance in the database
 */
async function updateAppearanceInDB(appearance) {
  return new Promise((resolve, reject) => {
    const db = window.DB || window.App?.DB;
    if (!db) {
      reject(new Error('Database not available'));
      return;
    }
    
    const transaction = db.transaction(['appearances'], 'readwrite');
    const store = transaction.objectStore('appearances');
    const request = store.put(appearance);
    
    request.onsuccess = () => {
      resolve();
    };
    
    request.onerror = () => {
      reject(new Error('Failed to update appearance in database'));
    };
  });
}

/**
 * Update player stats in the database
 */
async function updatePlayerStatsInDB(playerStats) {
  return new Promise((resolve, reject) => {
    const db = window.DB || window.App?.DB;
    if (!db) {
      reject(new Error('Database not available'));
      return;
    }
    
    const transaction = db.transaction(['player_stats'], 'readwrite');
    const store = transaction.objectStore('player_stats');
    const request = store.put(playerStats);
    
    request.onsuccess = () => {
      resolve();
    };
    
    request.onerror = () => {
      reject(new Error('Failed to update player stats in database'));
    };
  });
}

/**
 * Delete a player from the database
 */
async function deletePlayerFromDB(playerId) {
  return new Promise((resolve, reject) => {
    const db = window.DB || window.App?.DB;
    if (!db) {
      reject(new Error('Database not available'));
      return;
    }
    
    const transaction = db.transaction(['players'], 'readwrite');
    const store = transaction.objectStore('players');
    const request = store.delete(playerId);
    
    request.onsuccess = () => {
      resolve();
    };
    
    request.onerror = () => {
      reject(new Error('Failed to delete player from database'));
    };
  });
}

/**
 * 🔥 NEW: Verify that a player was actually deleted
 */
async function verifyPlayerDeleted(playerId) {
  return new Promise((resolve, reject) => {
    const db = window.DB || window.App?.DB;
    if (!db) {
      reject(new Error('Database not available'));
      return;
    }
    
    const transaction = db.transaction(['players'], 'readonly');
    const store = transaction.objectStore('players');
    const request = store.get(playerId);
    
    request.onsuccess = () => {
      // If result is undefined, player was deleted successfully
      resolve(request.result !== undefined);
    };
    
    request.onerror = () => {
      reject(new Error('Failed to verify player deletion'));
    };
  });
}

/**
 * 🔥 NEW: Debug function to check how many players exist in DB
 */
async function debugCountPlayers() {
  return new Promise((resolve, reject) => {
    const db = window.DB || window.App?.DB;
    if (!db) {
      reject(new Error('Database not available'));
      return;
    }
    
    const transaction = db.transaction(['players'], 'readonly');
    const store = transaction.objectStore('players');
    const request = store.count();
    
    request.onsuccess = () => {
      const count = request.result;
      console.log(`📊 סה"כ שחקנים ב-DB: ${count}`);
      resolve(count);
    };
    
    request.onerror = () => reject(new Error('Failed to count players'));
  });
}

/**
 * 🔥 CRITICAL SYNCHRONIZATION FUNCTION
 * Get all player_stats for a specific player from DB
 * This ensures we have the latest data after merging
 */
async function getAllPlayerStatsForPlayer(playerId) {
  return new Promise((resolve, reject) => {
    const db = window.DB || window.App?.DB;
    if (!db) {
      reject(new Error('Database not available'));
      return;
    }
    
    const transaction = db.transaction(['player_stats'], 'readonly');
    const store = transaction.objectStore('player_stats');
    
    // Scan all stats and filter by playerId (no single-field index exists)
    const request = store.openCursor();
    const results = [];
    
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        const stat = cursor.value;
        if (stat.playerId === playerId) {
          results.push(stat);
        }
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    
    request.onerror = () => {
      reject(new Error('Failed to get player stats from database'));
    };
  });
}

/**
 * 🔥 CRITICAL SYNCHRONIZATION FUNCTION
 * Get all appearances for a specific player from DB
 * This ensures we have the latest data after merging
 */
async function getAllAppearancesForPlayer(playerId) {
  return new Promise((resolve, reject) => {
    const db = window.DB || window.App?.DB;
    if (!db) {
      reject(new Error('Database not available'));
      return;
    }
    
    const transaction = db.transaction(['appearances'], 'readonly');
    const store = transaction.objectStore('appearances');
    
    // Scan all appearances and filter by playerId (no single-field index exists)
    const request = store.openCursor();
    const results = [];
    
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        const appearance = cursor.value;
        if (appearance.playerId === playerId) {
          results.push(appearance);
        }
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    
    request.onerror = () => {
      reject(new Error('Failed to get appearances from database'));
    };
  });
}

/**
 * 🔥 CRITICAL SYNCHRONIZATION FUNCTION
 * Recalculate aggregate statistics for a player based on their games
 * This ensures totalPoints, totalRebounds, etc. are accurate after merging
 */
function recalculatePlayerStats(player) {
  if (!player.games || player.games.length === 0) {
    // No games, set all stats to 0
    player.totalPoints = 0;
    player.totalRebounds = 0;
    player.totalAssists = 0;
    player.totalSteals = 0;
    player.totalBlocks = 0;
    player.totalTurnovers = 0;
    player.totalFouls = 0;
    player.totalFieldGoalsMade = 0;
    player.totalFieldGoalsAttempted = 0;
    player.totalThreePointersMade = 0;
    player.totalThreePointersAttempted = 0;
    player.totalFreeThrowsMade = 0;
    player.totalFreeThrowsAttempted = 0;
    player.gamesPlayed = 0;
    return;
  }
  
  // Calculate totals from all games
  let totalPoints = 0;
  let totalRebounds = 0;
  let totalAssists = 0;
  let totalSteals = 0;
  let totalBlocks = 0;
  let totalTurnovers = 0;
  let totalFouls = 0;
  let totalFieldGoalsMade = 0;
  let totalFieldGoalsAttempted = 0;
  let totalThreePointersMade = 0;
  let totalThreePointersAttempted = 0;
  let totalFreeThrowsMade = 0;
  let totalFreeThrowsAttempted = 0;
  
  for (const game of player.games) {
    // Support both direct fields and nested metrics object
    const metrics = game.metrics || game;
    
    totalPoints += metrics.points || 0;
    totalRebounds += metrics.rebounds || 0;
    totalAssists += metrics.assists || 0;
    totalSteals += metrics.steals || 0;
    totalBlocks += metrics.blocks || 0;
    totalTurnovers += metrics.turnovers || 0;
    totalFouls += metrics.fouls || 0;
    totalFieldGoalsMade += metrics.fieldGoalsMade || 0;
    totalFieldGoalsAttempted += metrics.fieldGoalsAttempted || 0;
    totalThreePointersMade += metrics.threePointersMade || 0;
    totalThreePointersAttempted += metrics.threePointersAttempted || 0;
    totalFreeThrowsMade += metrics.freeThrowsMade || 0;
    totalFreeThrowsAttempted += metrics.freeThrowsAttempted || 0;
  }
  
  // Update player object
  player.totalPoints = totalPoints;
  player.totalRebounds = totalRebounds;
  player.totalAssists = totalAssists;
  player.totalSteals = totalSteals;
  player.totalBlocks = totalBlocks;
  player.totalTurnovers = totalTurnovers;
  player.totalFouls = totalFouls;
  player.totalFieldGoalsMade = totalFieldGoalsMade;
  player.totalFieldGoalsAttempted = totalFieldGoalsAttempted;
  player.totalThreePointersMade = totalThreePointersMade;
  player.totalThreePointersAttempted = totalThreePointersAttempted;
  player.totalFreeThrowsMade = totalFreeThrowsMade;
  player.totalFreeThrowsAttempted = totalFreeThrowsAttempted;
  player.gamesPlayed = player.games.length;
  
  console.log(`📊 Recalculated stats for ${player.firstNameHe} ${player.familyNameHe}: ${player.gamesPlayed} games, ${totalPoints} points`);
}

/**
 * Show success message
 */
function showOk(message) {
  if (window.App && window.App.showOk) {
    window.App.showOk(message);
  } else {
    alert(message);
  }
}

/**
 * Show error message
 */
function showError(message) {
  if (window.App && window.App.showError) {
    window.App.showError(message);
  } else {
    alert(message);
  }
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPlayerMergeTool);
} else {
  initPlayerMergeTool();
}
