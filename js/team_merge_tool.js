// =========================
// Team Merge / Migration Tool
// =========================

(function() {
  'use strict';

  // Global variables for team merge functionality
  let detectedAliases = [];
  let selectedMerges = new Map();

  // Initialize team merge tool
  function initTeamMergeTool() {
    console.log('🔧 Initializing Team Merge Tool...');
    
    // Set up event listeners
    setupTeamMergeEventListeners();
    
    console.log('✅ Team Merge Tool initialized');
  }

  // Set up event listeners for team merge functionality
  function setupTeamMergeEventListeners() {
    const scanBtn = document.getElementById('scanTeamAliasesBtn');
    const mergeBtn = document.getElementById('mergeTeamsBtn');
    const fixBtn = document.getElementById('fixTeamNamesBtn');

    if (scanBtn) {
      scanBtn.addEventListener('click', scanTeamAliases);
    }

    if (mergeBtn) {
      mergeBtn.addEventListener('click', executeTeamMerges);
    }
    
    if (fixBtn) {
      fixBtn.addEventListener('click', fixTeamNamesInPlayerGames);
    }
  }

  // Scan for team aliases in the database
  async function scanTeamAliases() {
    console.log('🔍 Scanning for team aliases...');
    console.log('🔍 DB_AVAILABLE:', window.DB_AVAILABLE);
    console.log('🔍 DB:', window.DB);
    console.log('🔍 window.App?.DB_AVAILABLE:', window.App?.DB_AVAILABLE);
    console.log('🔍 window.App?.DB:', window.App?.DB);
    
    // Check multiple ways for database availability
    const dbAvailable = window.DB_AVAILABLE || window.App?.DB_AVAILABLE;
    const db = window.DB || window.App?.DB;
    
    if (!dbAvailable || !db) {
      showError('מסד הנתונים לא זמין. אנא וודא שהמערכת מאותחלת כראוי.');
      return;
    }

    try {
      // Get all teams from database
      console.log('🔍 Attempting to get teams from database...');
      const teams = await getAllTeamsFromDB();
      console.log(`✅ Found ${teams.length} teams in database`);
      
      // Show all team names for debugging
      console.log('🔍 All team names in database:');
      teams.forEach((team, index) => {
        console.log(`${index + 1}. Hebrew: "${team.name_he || 'N/A'}" | English: "${team.name_en || 'N/A'}"`);
      });

      // Get all team names from games (including aliases)
      console.log('🔍 Scanning games for team name variations...');
      const gameTeamNames = await getAllTeamNamesFromGames();
      console.log(`✅ Found ${gameTeamNames.length} unique team names in games`);
      
      // Show all team names from games
      console.log('🔍 All team names found in games:');
      gameTeamNames.forEach((name, index) => {
        console.log(`${index + 1}. "${name}"`);
      });

      // Combine teams and game names for alias detection
      const allTeamData = [...teams, ...gameTeamNames.map(name => ({ name_he: name, name_en: name }))];
      
      // Detect potential aliases
      const aliases = detectTeamAliases(allTeamData);
      console.log(`Detected ${aliases.length} potential alias groups`);

      // Store detected aliases
      detectedAliases = aliases;

      // Display results
      displayTeamAliases(aliases);

      // Show results section
      const resultsDiv = document.getElementById('teamAliasesResults');
      if (resultsDiv) {
        resultsDiv.classList.remove('hidden');
      }

      // Enable merge button if there are aliases
      const mergeBtn = document.getElementById('mergeTeamsBtn');
      if (mergeBtn) {
        mergeBtn.disabled = aliases.length === 0;
      }

      showOk(`נמצאו ${aliases.length} קבוצות כינויים פוטנציאליות`);

    } catch (error) {
      console.error('Error scanning team aliases:', error);
      showError('שגיאה בסריקת כינויים של קבוצות: ' + error.message);
    }
  }

  // Get all teams from database
  async function getAllTeamsFromDB() {
    return new Promise((resolve, reject) => {
      const db = window.DB || window.App?.DB;
      if (!db) {
        reject(new Error('Database not available'));
        return;
      }

      const transaction = db.transaction(['teams'], 'readonly');
      const store = transaction.objectStore('teams');
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // Get all unique team names from player games data
  async function getAllTeamNamesFromGames() {
    return new Promise((resolve, reject) => {
      const db = window.DB || window.App?.DB;
      if (!db) {
        reject(new Error('Database not available'));
        return;
      }

      const transaction = db.transaction(['players'], 'readonly');
      const store = transaction.objectStore('players');
      const request = store.getAll();

      request.onsuccess = () => {
        const players = request.result || [];
        const teamNames = new Set();
        
        players.forEach(player => {
          // Check if player has games data
          if (player.games && Array.isArray(player.games)) {
            player.games.forEach(game => {
              if (game.team) {
                teamNames.add(game.team.trim());
              }
            });
          }
        });
        
        resolve(Array.from(teamNames).filter(name => name.length > 0));
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // Detect team aliases using similarity algorithms
  function detectTeamAliases(teams) {
    console.log(`🔍 Starting alias detection for ${teams.length} teams`);
    const aliases = [];
    const processed = new Set();

    for (let i = 0; i < teams.length; i++) {
      if (processed.has(i)) continue;

      const team1 = teams[i];
      const similarTeams = [team1];

      for (let j = i + 1; j < teams.length; j++) {
        if (processed.has(j)) continue;

        const team2 = teams[j];
        
        // Check if teams are similar AND different (not the same team)
        const isSimilar = areTeamsSimilar(team1, team2);
        const isDifferent = areTeamsDifferent(team1, team2);
        
        if (isSimilar && isDifferent) {
          console.log(`✅ Adding to aliases: "${team1.name_he || team1.name_en}" + "${team2.name_he || team2.name_en}"`);
          similarTeams.push(team2);
          processed.add(j);
        } else if (isSimilar && !isDifferent) {
          console.log(`⚠️ Skipping same team: "${team1.name_he || team1.name_en}" = "${team2.name_he || team2.name_en}"`);
        }
      }

      // If we found similar teams, add to aliases
      if (similarTeams.length > 1) {
        const targetTeam = selectTargetTeam(similarTeams);
        console.log('🔍 Selected target team:', targetTeam);
        console.log('🔍 Similar teams:', similarTeams);
        
        aliases.push({
          id: `alias_${aliases.length}`,
          teams: similarTeams,
          targetTeam: targetTeam,
          aliases: similarTeams.filter(t => t !== targetTeam)
        });
      }

      processed.add(i);
    }

    return aliases;
  }

  // Check if two teams are similar
  function areTeamsSimilar(team1, team2) {
    const name1 = (team1.name_he || team1.name_en || '').toLowerCase();
    const name2 = (team2.name_he || team2.name_en || '').toLowerCase();

    // Exact match
    if (name1 === name2) return true;

    // Check for common words (at least 2 words in common)
    const words1 = name1.split(/\s+/).filter(w => w.length > 2);
    const words2 = name2.split(/\s+/).filter(w => w.length > 2);
    
    const commonWords = words1.filter(word => words2.includes(word));
    
    if (commonWords.length >= 2) {
      console.log(`✅ SIMILAR: "${name1}" vs "${name2}" - Found ${commonWords.length} common words: [${commonWords.join(', ')}]`);
      return true;
    }

    // Check for substring match (one name contains the other)
    if (name1.includes(name2) || name2.includes(name1)) {
      console.log(`✅ SIMILAR: "${name1}" vs "${name2}" - Substring match`);
      return true;
    }

    // Check for Levenshtein distance (similar spelling)
    const distance = levenshteinDistance(name1, name2);
    const maxLength = Math.max(name1.length, name2.length);
    const similarity = 1 - (distance / maxLength);
    
    const isSimilar = similarity > 0.7; // 70% similarity threshold
    if (isSimilar) {
      console.log(`✅ SIMILAR: "${name1}" vs "${name2}" - High similarity: ${(similarity * 100).toFixed(1)}%`);
    }
    
    return isSimilar;
  }

  // Check if two teams are different (not the same team)
  function areTeamsDifferent(team1, team2) {
    // If both have team_id, compare them
    if (team1.team_id && team2.team_id) {
      return team1.team_id !== team2.team_id;
    }
    
    // If one has team_id and the other doesn't, check if they represent the same team
    if (team1.team_id || team2.team_id) {
      // Compare names to see if they're the same team
      const name1 = (team1.name_he || team1.name_en || '').toLowerCase().trim();
      const name2 = (team2.name_he || team2.name_en || '').toLowerCase().trim();
      
      // If names are exactly the same, they're the same team (not different)
      if (name1 === name2) {
        console.log(`🔍 areTeamsDifferent: Same team with/without team_id: "${name1}" = "${name2}" = false`);
        return false;
      }
      
      // If names are different, they're different teams
      console.log(`🔍 areTeamsDifferent: Different teams: "${name1}" vs "${name2}" = true`);
      return true;
    }
    
    // If neither has team_id, compare names
    const name1 = (team1.name_he || team1.name_en || '').toLowerCase().trim();
    const name2 = (team2.name_he || team2.name_en || '').toLowerCase().trim();
    
    // They're different if names are not exactly the same
    const isDifferent = name1 !== name2;
    console.log(`🔍 areTeamsDifferent: "${name1}" vs "${name2}" = ${isDifferent}`);
    return isDifferent;
  }

  // Select target team (the one to keep)
  function selectTargetTeam(teams) {
    console.log('🔍 Selecting target team from:', teams);
    
    // Prefer teams with more games or better data
    const result = teams.reduce((best, current) => {
      const bestGames = best.games || 0;
      const currentGames = current.games || 0;
      
      console.log(`🔍 Comparing: "${best.name_he || best.name_en}" (${bestGames} games) vs "${current.name_he || current.name_en}" (${currentGames} games)`);
      
      if (currentGames > bestGames) return current;
      if (currentGames === bestGames) {
        // If same number of games, prefer the shorter name (more canonical)
        const bestName = (best.name_he || best.name_en || '').length;
        const currentName = (current.name_he || current.name_en || '').length;
        return currentName < bestName ? current : best;
      }
      return best;
    });
    
    console.log('🔍 Selected target team:', result);
    return result;
  }

  // Calculate Levenshtein distance between two strings
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

  // Display team aliases in the UI
  function displayTeamAliases(aliases) {
    const tbody = document.getElementById('teamAliasesTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    console.log('🔍 Displaying aliases:', aliases);

    aliases.forEach(alias => {
      console.log('🔍 Processing alias:', alias);
      const row = document.createElement('tr');
      row.className = 'hover:bg-gray-50';

      // Target team column
      const targetCell = document.createElement('td');
      targetCell.className = 'px-3 py-2 text-sm';
      
      // Get target team name safely
      const targetTeamName = alias.targetTeam ? 
        (alias.targetTeam.name_he || alias.targetTeam.name_en || 'Unknown') : 
        'Unknown';
      const targetTeamId = alias.targetTeam ? 
        (alias.targetTeam.team_id || 'N/A') : 
        'N/A';
      
      targetCell.innerHTML = `
        <div class="font-medium text-gray-900">${targetTeamName}</div>
        <div class="text-xs text-gray-500">${targetTeamId}</div>
      `;

      // Aliases column
      const aliasesCell = document.createElement('td');
      aliasesCell.className = 'px-3 py-2 text-sm';
      
      // Get aliases safely
      const aliasesList = alias.aliases ? alias.aliases.map(team => {
        const teamName = team.name_he || team.name_en || 'Unknown';
        const teamId = team.team_id || 'N/A';
        return `
          <div class="text-gray-700">${teamName}</div>
          <div class="text-xs text-gray-500">${teamId}</div>
        `;
      }).join('<br>') : 'No aliases';
      
      aliasesCell.innerHTML = aliasesList;

      // Actions column
      const actionsCell = document.createElement('td');
      actionsCell.className = 'px-3 py-2 text-center';
      actionsCell.innerHTML = `
        <label class="flex items-center justify-center">
          <input type="checkbox" class="merge-checkbox w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500" 
                 data-alias-id="${alias.id}">
          <span class="ml-2 text-xs text-gray-600">מזג</span>
        </label>
      `;

      row.appendChild(targetCell);
      row.appendChild(aliasesCell);
      row.appendChild(actionsCell);
      tbody.appendChild(row);
    });

    // Add event listeners to checkboxes
    const checkboxes = tbody.querySelectorAll('.merge-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', updateSelectedMerges);
    });
  }

  // Update selected merges based on checkboxes
  function updateSelectedMerges() {
    const checkboxes = document.querySelectorAll('.merge-checkbox:checked');
    selectedMerges.clear();

    checkboxes.forEach(checkbox => {
      const aliasId = checkbox.dataset.aliasId;
      const alias = detectedAliases.find(a => a.id === aliasId);
      if (alias) {
        selectedMerges.set(aliasId, alias);
      }
    });

    // Update merge button state
    const mergeBtn = document.getElementById('mergeTeamsBtn');
    if (mergeBtn) {
      mergeBtn.disabled = selectedMerges.size === 0;
    }
  }

  // Execute team merges
  async function executeTeamMerges() {
    if (selectedMerges.size === 0) {
      showError('לא נבחרו קבוצות למיזוג');
      return;
    }

    // Show confirmation dialog
    const confirmMessage = `האם אתה בטוח שברצונך למזג ${selectedMerges.size} קבוצות כינויים?\n\nפעולה זו תעדכן את מסד הנתונים ותמזג את כל הסטטיסטיקות הקשורות.`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    console.log('🔄 Executing team merges...');

    try {
      // Execute each merge
      for (const [aliasId, alias] of selectedMerges) {
        await mergeTeamAliases(alias);
      }

      showOk(`מיזוג הושלם בהצלחה! ${selectedMerges.size} קבוצות כינויים מוזגו.`);
      
      // Refresh the scan
      await scanTeamAliases();

    } catch (error) {
      console.error('Error executing team merges:', error);
      showError('שגיאה במיזוג הקבוצות: ' + error.message);
    }
  }

  // Merge team aliases
  async function mergeTeamAliases(alias) {
    const targetTeam = alias.targetTeam;
    const aliasTeams = alias.aliases;

    console.log(`Merging ${aliasTeams.length} teams into ${targetTeam.name_he || targetTeam.name_en}`);

      // Update team names in player games data (this is where the aliases actually exist)
      await updateTeamNamesInPlayerGames(targetTeam, aliasTeams);

      // Update team mappings in games
      await updateTeamMappingsInGames(targetTeam, aliasTeams);

      // Update team mappings in appearances
      await updateTeamMappingsInAppearances(targetTeam, aliasTeams);

      // Update team mappings in player stats
      await updateTeamMappingsInPlayerStats(targetTeam, aliasTeams);

      // Create team alias mapping for future imports
      await createTeamAliasMapping(targetTeam, aliasTeams);

      // Remove alias teams from teams table (only if they exist as actual teams)
      await removeAliasTeams(aliasTeams);
  }

  // Update team names in player games data
  async function updateTeamNamesInPlayerGames(targetTeam, aliasTeams) {
    return new Promise((resolve, reject) => {
      const db = window.DB || window.App?.DB;
      if (!db) {
        reject(new Error('Database not available'));
        return;
      }

      const transaction = db.transaction(['players'], 'readwrite');
      const store = transaction.objectStore('players');
      const request = store.openCursor();

      let updatedCount = 0;

      request.onsuccess = (e) => {
        const cursor = e.target.result;
        if (!cursor) {
          console.log(`✅ Updated team names in ${updatedCount} player records`);
          resolve();
          return;
        }

        const player = cursor.value;
        let playerUpdated = false;

        // Check if player has games data
        if (player.games && Array.isArray(player.games)) {
          player.games.forEach(game => {
            // 🔥 FIX: Use flexible matching instead of exact match
            // This handles cases like "מכבי גיא נתן חיפה" vs "מכבי חיפה גיא נתן"
            const aliasTeam = aliasTeams.find(alias => {
              const gameTeam = (game.team || '').trim();
              const aliasHe = (alias.name_he || '').trim();
              const aliasEn = (alias.name_en || '').trim();
              
              // Exact match (original logic)
              if (aliasHe === gameTeam || aliasEn === gameTeam) {
                return true;
              }
              
              // 🔥 NEW: Flexible matching - check if names are similar
              // Normalize and compare (case-insensitive, ignore whitespace)
              const normalize = (str) => str.toLowerCase().replace(/\s+/g, ' ').trim();
              const normalizedGameTeam = normalize(gameTeam);
              const normalizedAliasHe = normalize(aliasHe);
              const normalizedAliasEn = normalize(aliasEn);
              
              // Check if one contains the other (handles word order differences)
              if (normalizedGameTeam && normalizedAliasHe && 
                  (normalizedGameTeam.includes(normalizedAliasHe) || normalizedAliasHe.includes(normalizedGameTeam))) {
                return true;
              }
              
              if (normalizedGameTeam && normalizedAliasEn && 
                  (normalizedGameTeam.includes(normalizedAliasEn) || normalizedAliasEn.includes(normalizedGameTeam))) {
                return true;
              }
              
              // Check for common words (at least 2 significant words in common)
              const getWords = (str) => str.split(/\s+/).filter(w => w.length > 2);
              const gameWords = getWords(normalizedGameTeam);
              const aliasWords = getWords(normalizedAliasHe);
              const commonWords = gameWords.filter(word => aliasWords.includes(word));
              
              if (commonWords.length >= 2) {
                console.log(`🔍 Flexible match found: "${gameTeam}" matches "${aliasHe}" (${commonWords.length} common words)`);
                return true;
              }
              
              return false;
            });
            
            if (aliasTeam) {
              // Update the team name to the target team name
              const oldTeamName = game.team;
              game.team = targetTeam.name_he || targetTeam.name_en;
              playerUpdated = true;
              console.log(`🔄 Updated team name: "${oldTeamName}" → "${game.team}"`);
            }
          });
        }

        if (playerUpdated) {
          cursor.update(player);
          updatedCount++;
        }

        cursor.continue();
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Update team mappings in games
  async function updateTeamMappingsInGames(targetTeam, aliasTeams) {
    return new Promise((resolve, reject) => {
      const db = window.DB || window.App?.DB;
      if (!db) {
        reject(new Error('Database not available'));
        return;
      }

      const transaction = db.transaction(['games'], 'readwrite');
      const store = transaction.objectStore('games');
      const request = store.openCursor();

      request.onsuccess = (e) => {
        const cursor = e.target.result;
        if (!cursor) {
          resolve();
          return;
        }

        const game = cursor.value;
        let updated = false;

        // Update teams array
        if (game.teams) {
          const updatedTeams = game.teams.map(teamName => {
            const aliasTeam = aliasTeams.find(alias => 
              alias.name_he === teamName || alias.name_en === teamName
            );
            return aliasTeam ? (targetTeam.name_he || targetTeam.name_en) : teamName;
          });

          if (JSON.stringify(updatedTeams) !== JSON.stringify(game.teams)) {
            game.teams = updatedTeams;
            updated = true;
          }
        }

        if (updated) {
          cursor.update(game);
        }

        cursor.continue();
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Update team mappings in appearances
  async function updateTeamMappingsInAppearances(targetTeam, aliasTeams) {
    return new Promise((resolve, reject) => {
      const db = window.DB || window.App?.DB;
      if (!db) {
        reject(new Error('Database not available'));
        return;
      }

      const transaction = db.transaction(['appearances'], 'readwrite');
      const store = transaction.objectStore('appearances');
      const request = store.openCursor();

      request.onsuccess = (e) => {
        const cursor = e.target.result;
        if (!cursor) {
          resolve();
          return;
        }

        const appearance = cursor.value;
        let updated = false;

        // Update team_id
        const aliasTeam = aliasTeams.find(alias => alias.team_id === appearance.team_id);
        if (aliasTeam) {
          appearance.team_id = targetTeam.team_id;
          updated = true;
        }

        if (updated) {
          cursor.update(appearance);
        }

        cursor.continue();
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Update team mappings in player stats
  async function updateTeamMappingsInPlayerStats(targetTeam, aliasTeams) {
    return new Promise((resolve, reject) => {
      const db = window.DB || window.App?.DB;
      if (!db) {
        reject(new Error('Database not available'));
        return;
      }

      const transaction = db.transaction(['player_stats'], 'readwrite');
      const store = transaction.objectStore('player_stats');
      const request = store.openCursor();

      request.onsuccess = (e) => {
        const cursor = e.target.result;
        if (!cursor) {
          resolve();
          return;
        }

        const stats = cursor.value;
        let updated = false;

        // Update team_id
        const aliasTeam = aliasTeams.find(alias => alias.team_id === stats.team_id);
        if (aliasTeam) {
          stats.team_id = targetTeam.team_id;
          updated = true;
        }

        if (updated) {
          cursor.update(stats);
        }

        cursor.continue();
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Create team alias mapping for future imports
  async function createTeamAliasMapping(targetTeam, aliasTeams) {
    return new Promise((resolve, reject) => {
      const db = window.DB || window.App?.DB;
      if (!db) {
        reject(new Error('Database not available'));
        return;
      }

      const transaction = db.transaction(['team_aliases'], 'readwrite');
      const store = transaction.objectStore('team_aliases');

      // Create mapping entries for each alias
      const promises = aliasTeams.map(aliasTeam => {
        const mapping = {
          alias_name: aliasTeam.name_he || aliasTeam.name_en,
          target_team_id: targetTeam.team_id,
          target_team_name: targetTeam.name_he || targetTeam.name_en,
          created_at: new Date().toISOString()
        };

        return new Promise((resolveMapping, rejectMapping) => {
          const request = store.add(mapping);
          request.onsuccess = () => resolveMapping();
          request.onerror = () => rejectMapping(request.error);
        });
      });

      Promise.all(promises).then(resolve).catch(reject);
    });
  }

  // Remove alias teams from teams table
  async function removeAliasTeams(aliasTeams) {
    return new Promise((resolve, reject) => {
      const db = window.DB || window.App?.DB;
      if (!db) {
        reject(new Error('Database not available'));
        return;
      }

      const transaction = db.transaction(['teams'], 'readwrite');
      const store = transaction.objectStore('teams');

      const promises = aliasTeams.map(aliasTeam => {
        return new Promise((resolveDelete, rejectDelete) => {
          // Only delete if the team has a valid team_id and exists in the teams table
          if (aliasTeam.team_id && aliasTeam.team_id.startsWith('t-')) {
            const request = store.delete(aliasTeam.team_id);
            request.onsuccess = () => {
              console.log(`✅ Deleted team: ${aliasTeam.team_id}`);
              resolveDelete();
            };
            request.onerror = () => {
              console.log(`⚠️ Could not delete team ${aliasTeam.team_id}: ${request.error.message}`);
              // Don't reject, just log the error and continue
              resolveDelete();
            };
          } else {
            console.log(`⚠️ Skipping deletion of team without valid team_id: ${aliasTeam.name_he || aliasTeam.name_en || 'Unknown'}`);
            resolveDelete();
          }
        });
      });

      Promise.all(promises).then(resolve).catch(reject);
    });
  }

  // Fix team names in all player games based on existing mappings
  async function fixTeamNamesInPlayerGames() {
    console.log('🔧 Starting team name fix for all players...');
    
    const dbAvailable = window.DB_AVAILABLE || window.App?.DB_AVAILABLE;
    const db = window.DB || window.App?.DB;
    
    if (!dbAvailable || !db) {
      showError('מסד הנתונים לא זמין. אנא וודא שהמערכת מאותחלת כראוי.');
      return;
    }

    try {
      // Step 1: Load all teams with their aliases
      const teams = await getAllTeamsFromDB();
      console.log(`✅ Loaded ${teams.length} teams from database`);
      
      // Step 2: Build mapping: alias -> target team name
      const teamMappings = new Map();
      const targetTeamNames = new Set(); // Track all target team names
      
      teams.forEach(team => {
        const targetName = team.name_he || team.name_en;
        if (!targetName) return;
        
        targetTeamNames.add(targetName);
        
        // Add canonical name (both original and normalized)
        teamMappings.set(targetName.toLowerCase().trim(), targetName);
        teamMappings.set(targetName.trim(), targetName);
        
        // Add aliases
        if (team.aliases && Array.isArray(team.aliases)) {
          team.aliases.forEach(alias => {
            if (alias && alias.trim()) {
              teamMappings.set(alias.toLowerCase().trim(), targetName);
              teamMappings.set(alias.trim(), targetName);
            }
          });
        }
        
        // Add English name if exists
        if (team.name_en && team.name_en !== targetName) {
          teamMappings.set(team.name_en.toLowerCase().trim(), targetName);
          teamMappings.set(team.name_en.trim(), targetName);
        }
      });
      
      console.log(`✅ Built ${teamMappings.size} team mappings from ${teams.length} teams`);
      console.log(`📋 Target team names:`, Array.from(targetTeamNames));
      
      // Step 3: Load team_aliases if they exist
      try {
        const teamAliases = await getAllTeamAliases();
        teamAliases.forEach(alias => {
          const aliasName = (alias.alias_name || '').trim();
          const targetName = (alias.target_team_name || '').trim();
          if (aliasName && targetName) {
            teamMappings.set(aliasName.toLowerCase(), targetName);
          }
        });
        console.log(`✅ Added ${teamAliases.length} mappings from team_aliases`);
      } catch (e) {
        console.log('⚠️ Could not load team_aliases (might not exist):', e.message);
      }
      
      // Step 4: Fix all player games
      let fixedCount = 0;
      let playersUpdated = 0;
      let checkedCount = 0;
      let unmatchedTeams = new Set();
      const allGameTeamNames = new Set(); // Track all unique team names in games
      
      // Debug: Log all mappings
      console.log('📋 All team mappings:');
      for (const [key, value] of teamMappings.entries()) {
        console.log(`  "${key}" → "${value}"`);
      }
      
      const transaction = db.transaction(['players'], 'readwrite');
      const store = transaction.objectStore('players');
      const request = store.openCursor();
      
      await new Promise((resolve, reject) => {
        request.onsuccess = (e) => {
          const cursor = e.target.result;
          if (!cursor) {
            console.log(`✅ Fixed ${fixedCount} team names in ${playersUpdated} players`);
            console.log(`📊 Checked ${checkedCount} team names`);
            console.log(`📋 All unique team names found in games (${allGameTeamNames.size}):`, Array.from(allGameTeamNames).sort());
            if (unmatchedTeams.size > 0) {
              console.log(`⚠️ Unmatched teams (${unmatchedTeams.size}):`, Array.from(unmatchedTeams).sort());
            }
            resolve();
            return;
          }
          
          const player = cursor.value;
          let playerUpdated = false;
          
          if (player.games && Array.isArray(player.games)) {
            player.games.forEach(game => {
              const gameTeam = (game.team || '').trim();
              if (!gameTeam) return;
              
              checkedCount++;
              allGameTeamNames.add(gameTeam); // Track unique team names
              
              // Try to find matching team using flexible matching
              let targetTeam = null;
              
              // First try exact match (normalized)
              const normalizedGameTeam = gameTeam.toLowerCase().trim();
              if (teamMappings.has(normalizedGameTeam)) {
                targetTeam = teamMappings.get(normalizedGameTeam);
                console.log(`✅ Exact match: "${gameTeam}" → "${targetTeam}"`);
              } else {
                // Try flexible matching against all target team names first
                let foundMatch = false;
                for (const targetName of targetTeamNames) {
                  if (areTeamNamesSimilar(gameTeam, targetName)) {
                    targetTeam = targetName;
                    foundMatch = true;
                    console.log(`🔍 Flexible match (target): "${gameTeam}" → "${targetName}"`);
                    break;
                  }
                }
                
                // If no match with target names, try all aliases
                if (!foundMatch) {
                  for (const [aliasKey, targetName] of teamMappings.entries()) {
                    if (areTeamNamesSimilar(gameTeam, aliasKey)) {
                      targetTeam = targetName;
                      foundMatch = true;
                      console.log(`🔍 Flexible match (alias): "${gameTeam}" → "${targetName}" (matched with "${aliasKey}")`);
                      break;
                    }
                  }
                }
                
                if (!foundMatch) {
                  unmatchedTeams.add(gameTeam);
                  // Only log first few unmatched teams to avoid spam
                  if (unmatchedTeams.size <= 5) {
                    console.log(`⚠️ No match found for: "${gameTeam}"`);
                  }
                }
              }
              
              if (targetTeam && targetTeam !== gameTeam) {
                const oldTeam = game.team;
                game.team = targetTeam;
                playerUpdated = true;
                fixedCount++;
                console.log(`🔄 Fixed: "${oldTeam}" → "${targetTeam}"`);
              }
            });
          }
          
          if (playerUpdated) {
            cursor.update(player);
            playersUpdated++;
          }
          
          cursor.continue();
        };
        
        request.onerror = () => reject(request.error);
      });
      
      showOk(`תוקנו ${fixedCount} שמות קבוצות ב-${playersUpdated} שחקנים`);
      
    } catch (error) {
      console.error('Error fixing team names:', error);
      showError('שגיאה בתיקון שמות קבוצות: ' + error.message);
    }
  }
  
  // Helper: Check if two team names are similar (using same logic as merge)
  function areTeamNamesSimilar(name1, name2) {
    const normalize = (str) => str.toLowerCase().replace(/\s+/g, ' ').trim();
    const normalized1 = normalize(name1);
    const normalized2 = normalize(name2);
    
    // Check if one contains the other
    if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
      return true;
    }
    
    // Check for common words (at least 2 significant words in common)
    const getWords = (str) => str.split(/\s+/).filter(w => w.length > 2);
    const words1 = getWords(normalized1);
    const words2 = getWords(normalized2);
    const commonWords = words1.filter(word => words2.includes(word));
    
    return commonWords.length >= 2;
  }
  
  // Get all team aliases from database
  async function getAllTeamAliases() {
    return new Promise((resolve, reject) => {
      const db = window.DB || window.App?.DB;
      if (!db) {
        resolve([]); // Return empty array if DB not available
        return;
      }
      
      try {
        const transaction = db.transaction(['team_aliases'], 'readonly');
        const store = transaction.objectStore('team_aliases');
        const request = store.getAll();
        
        request.onsuccess = () => {
          resolve(request.result || []);
        };
        
        request.onerror = () => {
          resolve([]); // Return empty array on error (store might not exist)
        };
      } catch (e) {
        resolve([]); // Return empty array if store doesn't exist
      }
    });
  }

  // Helper functions for UI
  function showOk(message) {
    // Try multiple ways to show success message
    if (typeof window.showOk === 'function') {
      window.showOk(message);
    } else if (typeof window.App?.showOk === 'function') {
      window.App.showOk(message);
    } else {
      // Fallback to alerts div
      const alertsDiv = document.getElementById('alerts');
      if (alertsDiv) {
        alertsDiv.innerHTML = `<div class="p-3 rounded-lg bg-green-100 text-green-800 mb-3 shadow-sm">${message}</div>`;
        setTimeout(() => { alertsDiv.innerHTML = ''; }, 3000);
      } else {
        alert(message);
      }
    }
  }

  function showError(message) {
    // Try multiple ways to show error message
    if (typeof window.showError === 'function') {
      window.showError(message);
    } else if (typeof window.App?.showError === 'function') {
      window.App.showError(message);
    } else {
      // Fallback to alerts div
      const alertsDiv = document.getElementById('alerts');
      if (alertsDiv) {
        alertsDiv.innerHTML = `<div class="p-3 rounded-lg bg-red-100 text-red-800 mb-3 shadow-sm">${message}</div>`;
        setTimeout(() => { alertsDiv.innerHTML = ''; }, 5000);
      } else {
        alert('שגיאה: ' + message);
      }
    }
  }

  // Expose functions globally
  window.initTeamMergeTool = initTeamMergeTool;
  window.scanTeamAliases = scanTeamAliases;
  window.executeTeamMerges = executeTeamMerges;
  window.fixTeamNamesInPlayerGames = fixTeamNamesInPlayerGames;

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTeamMergeTool);
  } else {
    initTeamMergeTool();
  }

})();
