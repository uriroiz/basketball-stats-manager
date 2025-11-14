    // =========================
    // Teams list UI
    // =========================
    
    // Hebrew text fix mapping - based on actual corrupted characters from JSON
    const hebrewFixMap = {
      // Direct character mappings from the corrupted JSON
      '×¨': 'ר', '×™': 'י', '×¦': 'צ', '×\x90': 'א', '×"': 'ד',
      '×¤': 'פ', '×§': 'ק', '× ': ' ', '×–': 'ז', '×•': 'ו', '×ž': 'מ', '×¨': 'ר', '×¤': 'פ', '×œ': 'ל', '×"': 'ד',
      '×¢': 'ע', '×™': 'י', '×œ': 'ל', '×™': 'י', '×©': 'ש', '×\x90': 'א', '×•': 'ו', '×œ': 'ל',
      '×™': 'י', '×\x9D': 'ם', '×©': 'ש', '×¤': 'פ', '×¨': 'ר', '×™': 'י', '×¨': 'ר',
      '×\x90': 'א', '×™': 'י', '×ª': 'ת', '×\x9D': 'ם', '×›': 'כ', '×"': 'ה', '×Ÿ': 'ן',
      '×¢': 'ע', '×ž': 'מ', '×¨': 'ר', '×™': 'י', '×©': 'ש', '×œ': 'ל', '×£': 'ף',
      '×™': 'י', '×•': 'ו', '× ': ' ', '×ª': 'ת', '×Ÿ': 'ן', '×§': 'ק', '×œ': 'ל', '×¨': 'ר',
      '×ž': 'מ', '×ª': 'ת', '×Ÿ': 'ן', '×©': 'ש', '×˜': 'ט', '×¨': 'ר', '×™': 'י', '×™': 'י', '×˜': 'ט',
      '×\x90': 'א', '×•': 'ו', '×"': 'ה', '×"': 'ד', '×"': 'ד', '×§': 'ק', '×œ': 'ל',
      '× ': ' ', '×ª': 'ת', '× ': ' ', '×\x90': 'א', '×œ': 'ל', '×œ': 'ל', '×™': 'י', '×¢': 'ע', '×"': 'ד', '×ž': 'מ', '×©': 'ש', '×¢': 'ע', '×Ÿ': 'ן',
      '×§': 'ק', '×™': 'י', '× ': ' ', '×"': 'ד', '×œ': 'ל', '×"': 'ה', '×™': 'י', '×œ': 'ל',
      '×–': 'ז', '×™': 'י', '×•': 'ו', '×ž': 'מ', '×¢': 'ע', '×•': 'ו', '×–': 'ז',
      '× ': ' ', '×™': 'י', '×"': 'ב', '×': 'ב', '×œ': 'ל', '×•': 'ו', '×œ': 'ל',
      '×"': 'ב', '×Ÿ': 'ן', '×\x90': 'א', '×•': 'ו', '× ': ' ', '×¦': 'צ', "'": "'", '×"': 'ה',
      '×ž': 'מ', '×§': 'ק', '×¡': 'ס', '×™': 'י', '×\x9D': 'ם', '×¨': 'ר', '×•': 'ו', '×ž': 'מ', '× ': ' ', '×•': 'ו', '×"': 'ב',
      '×ž': 'מ', '×\x90': 'א', '×•': 'ו', '×¨': 'ר', '× ': ' ', '×': 'נ', '×§': 'ק', '×¨': 'ר', '×©': 'ש', '×"': 'ב', '×™': 'י', '×¥': 'ץ',
      '×\x90': 'א', '×ž': 'מ', '×¨': 'ר', '×™': 'י', '×›': 'כ', '×': 'ג', '×Ÿ': 'ן',
      '×¢': 'ע', '×ž': 'מ', '×™': 'י', '×ª': 'ת', '×©': 'ש', '×"': 'ד', '×"': 'ה',
      '×\x90': 'א', '×œ': 'ל', '×•': 'ו', '×Ÿ': 'ן', '×"': 'ד', '× ': ' ', '×': 'נ', '×™': 'י', '×\x90': 'א', '×œ': 'ל', '×™': 'י',
      '×©': 'ש', '×™': 'י', '×›': 'כ', '×"': 'ה', '×Ÿ': 'ן',
      '×': 'ג', '×™': 'י', '×"': 'ד', '×™': 'י', '×©': 'ש', '×™': 'י', '×¤': 'פ', '×¨': 'ר',
      '×ž': 'מ', '×™': 'י', '×™': 'י', '×§': 'ק', '×œ': 'ל', '×"': 'ה', '×¨': 'ר', '×™': 'י', '×Ÿ': 'ן',
      '×"': 'ד', '×™': 'י', '×\x90': 'א', '×ž': 'מ', '×•': 'ו', '× ': ' ', '×"': 'ד', '×œ': 'ל', '×•': 'ו', '×\x90': 'א', '×™': 'י', '×¡': 'ס', '×¡': 'ס', '×˜': 'ט', '×•': 'ו', '×Ÿ': 'ן'
    };

    // Fix corrupted Hebrew text
    function fixHebrewText(text) {
      if (!text) return text;
      
      console.log('fixHebrewText input:', text);
      
      // Try exact matches first
      if (hebrewFixMap[text]) {
        console.log('Exact match found:', hebrewFixMap[text]);
        return hebrewFixMap[text];
      }
      
      // Try character-by-character replacement
      let fixed = text;
      for (const [corrupted, fixedChar] of Object.entries(hebrewFixMap)) {
        if (corrupted.length === 1) { // Only single character replacements
          const before = fixed;
          fixed = fixed.replace(new RegExp(corrupted.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), fixedChar);
          if (before !== fixed) {
            console.log('Character replacement:', corrupted, '->', fixedChar, 'result:', fixed);
          }
        }
      }
      
      console.log('fixHebrewText output:', fixed);
      return fixed;
    }

    // Get player name - try to fix Hebrew mojibake with new algorithm
    function getPlayerName(p) {
      console.log('getPlayerName called for:', p);
      
      // Try to fix Hebrew names first with new algorithm
      const firstName = p.firstName || '';
      const familyName = p.familyName || '';
      const scoreboardName = p.scoreboardName || '';
      
      // Fix Hebrew mojibake with CP-1252 algorithm
      const fixedFirstName = window.repairHebrewNames ? window.repairHebrewNames(firstName) : firstName;
      const fixedFamilyName = window.repairHebrewNames ? window.repairHebrewNames(familyName) : familyName;
      const fixedScoreboardName = window.repairHebrewNames ? window.repairHebrewNames(scoreboardName) : scoreboardName;
      
      console.log('Fixed Hebrew names:', { fixedFirstName, fixedFamilyName, fixedScoreboardName });
      
      // Check if fixed names look clean (no mojibake patterns)
      const isClean = (name) => {
        if (!name) return false;
        return window.looksLikeCleanHebrew ? window.looksLikeCleanHebrew(name) : false;
      };
      
      // If we have both fixed Hebrew names and they look clean, use them
      if (isClean(fixedFirstName) && isClean(fixedFamilyName)) {
        const hebrewName = `${fixedFirstName} ${fixedFamilyName}`;
        console.log('Using fixed Hebrew names:', hebrewName);
        return hebrewName;
      }
      
      // Try fixed scoreboard name
      if (isClean(fixedScoreboardName)) {
        console.log('Using fixed scoreboard name:', fixedScoreboardName);
        return fixedScoreboardName;
      }
      
      // Fall back to international names
      const intFirstName = p.internationalFirstName || '';
      const intFamilyName = p.internationalFamilyName || '';
      
      if (intFirstName && intFamilyName) {
        console.log('Using international names:', `${intFirstName} ${intFamilyName}`);
        return `${intFirstName} ${intFamilyName}`;
      }
      
      // Final fallback - use original scoreboard name
      console.log('Last resort - using original scoreboard name:', scoreboardName);
      return scoreboardName || '';
    }
    
    // Store team in IndexedDB
    async function storeTeamInDB(teamData) {
      console.log('storeTeamInDB called with:', teamData);
      if (!(DB_AVAILABLE && DB)) {
        console.log('DB not available in storeTeamInDB');
        return;
      }
      
      try {
        const tx = DB.transaction(['teams'], 'readwrite');
        const store = tx.objectStore('teams');
        await new Promise((resolve, reject) => {
          const req = store.put(teamData);
          req.onsuccess = () => {
            console.log('Team stored in DB successfully:', teamData);
            resolve();
          };
          req.onerror = (e) => {
            console.log('Error storing team:', e);
            resolve(); // Don't fail the whole process
          };
        });
      } catch (e) {
        console.log('Error in storeTeamInDB:', e);
      }
    }
    async function listTeams(){
      console.log('=== listTeams called ===');
      
      try {
        // CRITICAL: Wait for DB to be ready
        const isReady = await window.ensureDbReady();
        if (!isReady) {
          console.error('❌ DB not ready, cannot load teams');
          renderTeamsList([]);
          return;
        }

        const rows = [];
        
        // Use dbAdapter
        if (window.dbAdapter && typeof window.dbAdapter.getTeams === 'function') {
          console.log('📡 Fetching teams from', window.dbAdapter.isSupabase() ? 'Supabase' : 'IndexedDB');
          
          const teams = await window.dbAdapter.getTeams();
          
          if (teams && teams.length > 0) {
            rows.push(...teams);
            console.log(`✅ Teams loaded: ${rows.length} teams`);
          } else {
            console.log('⚠️ No teams returned from database');
          }
        } else {
          console.error('❌ dbAdapter.getTeams not available');
        }
        
        // Fallback to memory (only if dbAdapter failed)
        if (rows.length === 0 && TEAMS_MEM && TEAMS_MEM.length > 0) {
          rows.push(...TEAMS_MEM);
          console.log('⚠️ Using memory fallback:', rows.length, 'teams');
        }
        
        // Sort and render
        rows.sort((a, b) => 
          (a.name_he || a.name_en || "").localeCompare(
            b.name_he || b.name_en || "", 
            'he'
          )
        );
        
        console.log('📊 Rendering teams list with', rows.length, 'teams');
        renderTeamsList(rows);
        
      } catch (error) {
        console.error('❌ Error in listTeams:', error);
        renderTeamsList([]);
      }
    }

    function renderTeamsList(rows){
      console.log('renderTeamsList called with', rows.length, 'rows');
      const tbody = document.querySelector('#teamsList tbody');
      if(!tbody) {
        console.log('tbody not found for teams list');
        return;
      }
      tbody.innerHTML = '';
      
      // Update manage teams count in header
      const manageTeamsCountEl = document.getElementById('manageTeamsCount');
      if (manageTeamsCountEl) manageTeamsCountEl.textContent = rows.length;
      
      if(!rows.length){
        console.log('No teams to render, showing empty message');
        const tr = document.createElement('tr');
        tr.innerHTML = `<td class="text-center text-gray-500 py-4" colspan="5">אין קבוצות במערכת</td>`;
        tbody.appendChild(tr); return;
      }
      for(const t of rows){
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="col-team">${t.team_id}</td>
          <td class="col-team">${t.name_en||''}</td>
          <td class="col-team">${t.name_he||''}</td>
          <td class="col-team">${(t.aliases||[]).join('; ')}</td>
          <td class="col-team">
            <button class="editTeam text-blue-700 hover:underline" data-id="${t.team_id}">ערוך</button>
            <span class="mx-1">·</span>
            <button class="delTeam text-red-700 hover:underline" data-id="${t.team_id}">מחק</button>
          </td>`;
        tbody.appendChild(tr);
      }
    }

    async function deleteTeam(team_id){
      if(DB_AVAILABLE && DB){
        const tx = DB.transaction(["teams"], "readwrite");
        await new Promise((res, rej)=>{ const r = tx.objectStore("teams").delete(team_id); r.onsuccess = ()=>res(); r.onerror = ()=>rej(r.error); });
      } else {
        TEAMS_MEM = TEAMS_MEM.filter(t=>t.team_id!==team_id);
      }
      await loadTeamsIndex();
      await listTeams();
    }

    async function getTeam(team_id){
      if(DB_AVAILABLE && DB){
        const tx = DB.transaction(["teams"], "readonly");
        return await new Promise((res, rej)=>{ const r = tx.objectStore("teams").get(team_id); r.onsuccess = ()=>res(r.result||null); r.onerror = ()=>rej(r.error); });
      } else {
        return TEAMS_MEM.find(t=>t.team_id===team_id) || null;
      }
    }

    function openEditTeam(t){
      $("teamModal").classList.remove('hidden'); $("teamModal").classList.add('flex');
      $("tm_teamId").value = t?.team_id || '';
      $("tm_nameEn").value = t?.name_en || '';
      $("tm_nameHe").value = t?.name_he || '';
      $("tm_shortHe").value = t?.short_he || '';
      $("tm_aliases").value = (t?.aliases||[]).join('; ');
    }

    // פונקציות לייצוא ויבוא קבוצות
    async function exportTeams() {
      if(!(DB_AVAILABLE && DB)) { 
        showError("מסד נתונים אינו זמין");
        return;
      }
      
      const teams = [];
      const tx = DB.transaction(["teams"], "readonly");
      const store = tx.objectStore("teams");
      
      await new Promise((resolve) => {
        const req = store.openCursor();
        req.onsuccess = (e) => {
          const cur = e.target.result;
          if(!cur) return resolve();
          teams.push(cur.value);
          cur.continue();
        };
      });
      
      // יצירת קובץ JSON להורדה
      const dataStr = JSON.stringify(teams, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `teams_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      window.setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100);
    }

    // פונקציה ליבוא קבוצות
    async function importTeams(file) {
      if(!(DB_AVAILABLE && DB)) { 
        showError("מסד נתונים אינו זמין");
        return;
      }
      
      try {
        const text = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(reader.error);
          reader.readAsText(file);
        });
        
        const teams = JSON.parse(text);
        if (!Array.isArray(teams)) {
          showError("פורמט קובץ לא תקין - חייב להיות מערך של קבוצות");
          return;
        }
        
        const tx = DB.transaction(["teams"], "readwrite");
        const store = tx.objectStore("teams");
        
        for (const team of teams) {
          await new Promise((resolve, reject) => {
            const req = store.put(team);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
          });
        }
        
        await loadTeamsIndex();
        await listTeams();
        showOk(`ייבוא הסתיים בהצלחה: ${teams.length} קבוצות נוספו/עודכנו`);
      } catch (err) {
        showError(`שגיאה בייבוא: ${err.message}`);
      }
    }
// ============ Player mappings index ============
let PLAYER_MAP_INDEX = new Map(); // key -> {first_he, family_he, first_en, family_en, jersey, team_en}

async function loadPlayerMappingsIndex(){
  PLAYER_MAP_INDEX = new Map();
  if(!(DB_AVAILABLE && DB)) return;
  const tx = DB.transaction(["player_mappings"], "readonly");
  const store = tx.objectStore("player_mappings");
  await new Promise((resolve)=>{
    const req = store.openCursor();
    req.onsuccess = (e)=>{
      const cur = e.target.result; if(!cur) return resolve();
      const v = cur.value; PLAYER_MAP_INDEX.set(v.lookup_key, v);
      cur.continue();
    };
  });
}

async function upsertPlayerMapping(rec){
  if(!(DB_AVAILABLE && DB)) { showError("מסד נתונים אינו זמין"); return; }
  
  // Option A: compute canonical player ID if missing
  try {
    if ((!rec.id || !String(rec.id).trim()) && typeof makePlayerId === "function") {
      const playerName = ((rec.first_en||"") + " " + (rec.family_en||"")).trim() || (rec.jersey ? ("#"+rec.jersey) : "");
      rec.id = makePlayerId({ teamId: null, teamNameEn: rec.team_en||"", playerName, jersey: rec.jersey||"" });
    }
  } catch(_e) { /* ignore */ }

  const tx = DB.transaction(["player_mappings"], "readwrite");
  await new Promise((res,rej)=>{ const rq = tx.objectStore("player_mappings").put(rec); rq.onsuccess=()=>res(); rq.onerror=()=>rej(rq.error); });
  await loadPlayerMappingsIndex();
}

async function deletePlayerMapping(lookup_key){
  if(!(DB_AVAILABLE && DB)) { showError("מסד נתונים אינו זמין"); return; }
  const tx = DB.transaction(["player_mappings"], "readwrite");
  await new Promise((res)=>{ const rq = tx.objectStore("player_mappings").delete(lookup_key); rq.onsuccess=()=>res(); rq.onerror=()=>res(); });
  await loadPlayerMappingsIndex();
}

// UI: list & modal helpers
function renderPlayerMappingsList(rows){
  console.log('renderPlayerMappingsList called with', rows.length, 'rows');
  const tbody = document.querySelector('#playersMapList tbody');
  if(!tbody) {
    console.log('tbody not found for players mappings list');
    return;
  }
  tbody.innerHTML = '';
  if(!rows.length){
    console.log('No player mappings to render, showing empty message');
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="text-center text-gray-500 py-4" colspan="6">אין מיפויי שחקנים</td>`;
    tbody.appendChild(tr); return;
  }
  for(const r of rows){
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="col-team">${(r.id && r.id.length ? r.id : (r.lookup_key||""))}</td>
      <td class="col-team">${r.first_he||''}</td>
      <td class="col-team">${r.family_he||''}</td>
      <td class="col-jersey">${r.jersey||''}</td>
      <td class="col-team">${r.team_en||''}</td>
      <td class="col-team">
        <button class="editPlayerMap text-blue-700 hover:underline" data-k="${r.lookup_key}">ערוך</button>
        <span class="mx-1">·</span>
        <button class="delPlayerMap text-red-700 hover:underline" data-k="${r.lookup_key}">מחק</button>
      </td>`;
    tbody.appendChild(tr);
  }
}

async function listPlayerMappings(){
  console.log('=== listPlayerMappings called ===');
  
  try {
    // CRITICAL: Wait for DB to be ready
    const isReady = await window.ensureDbReady();
    if (!isReady) {
      console.error('❌ DB not ready, cannot load players');
      renderPlayerMappingsList([]);
      return;
    }

    const rows=[];
    
    // Use dbAdapter
    if (window.dbAdapter && typeof window.dbAdapter.getPlayers === 'function') {
      console.log('📡 Fetching players from', window.dbAdapter.isSupabase() ? 'Supabase' : 'IndexedDB');
      
      const players = await window.dbAdapter.getPlayers();
      
      console.log(`📊 Raw players data: ${players ? players.length : 0} players`);
      
      if (players && players.length > 0) {
        for (const player of players) {
          // Skip old system players (they have old lookup_key format)
          if (player.id && player.id.includes('-#') && player.id.includes('-')) {
            console.log('⏭️ Skipping old system player:', player.id);
            continue;
          }
          
          console.log('Loading player:', player.id, 'names:', { 
            firstNameEn: player.firstNameEn, 
            familyNameEn: player.familyNameEn,
            firstNameHe: player.firstNameHe,
            familyNameHe: player.familyNameHe
          });
          
          // Get latest game info for jersey and team
          let jersey = '';
          let team_en = '';
          
          // Try to get from player.games array (Supabase format)
          if (player.games && Array.isArray(player.games) && player.games.length > 0) {
            // Get the most recent game (last in array)
            const latestGame = player.games[player.games.length - 1];
            jersey = latestGame.jersey || latestGame.shirtNumber || '';
            team_en = latestGame.team || '';
          }
          
          // Fallback: try to get from lastSeenTeam and jersey fields
          if (!team_en && player.lastSeenTeam) {
            team_en = player.lastSeenTeam;
          }
          if (!jersey && player.jersey) {
            jersey = player.jersey;
          }
          
          const row = {
            lookup_key: player.id,
            id: player.id,
            first_en: player.firstNameEn || '',
            family_en: player.familyNameEn || '',
            first_he: player.firstNameHe || '',
            family_he: player.familyNameHe || '',
            jersey: jersey,
            team_en: team_en
          };
          
          rows.push(row);
        }
        console.log(`✅ Players processed: ${rows.length} players (skipped ${players.length - rows.length})`);
      } else {
        console.log('⚠️ No players returned from database');
      }
    } else {
      console.error('❌ dbAdapter.getPlayers not available');
    }
    
    // Sort and render
    rows.sort((a,b)=> a.family_he?.localeCompare(b.family_he,'he') || a.first_he?.localeCompare(b.first_he,'he') || 0);
    
    console.log('📊 Rendering players list with', rows.length, 'players');
    renderPlayerMappingsList(rows);
    
  } catch (error) {
    console.error('❌ Error in listPlayerMappings:', error);
    renderPlayerMappingsList([]);
  }
}

// Function to clean up old system data
async function cleanupOldPlayerSystem() {
  console.log('=== Cleaning up old player system ===');
  if (!(DB_AVAILABLE && DB)) {
    console.log('❌ DB not available for cleanup');
    return;
  }
  
  try {
    // Delete old player_mappings store if it exists
    if (DB.objectStoreNames.contains('player_mappings')) {
      console.log('Deleting old player_mappings store...');
      const tx = DB.transaction(['player_mappings'], 'readwrite');
      const store = tx.objectStore('player_mappings');
      await new Promise((resolve, reject) => {
        const req = store.clear();
        req.onsuccess = () => {
          console.log('✅ Old player_mappings cleared');
          resolve();
        };
        req.onerror = () => {
          console.log('❌ Error clearing player_mappings:', req.error);
          reject(req.error);
        };
      });
    }
    
    // Remove old system players from players store
    console.log('Removing old system players from players store...');
    const tx = DB.transaction(['players'], 'readwrite');
    const store = tx.objectStore('players');
    await new Promise((resolve) => {
      const req = store.openCursor();
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (!cursor) {
          console.log('✅ Old system players cleanup completed');
          resolve();
          return;
        }
        
        const player = cursor.value;
        // Check if this is an old system player (has old lookup_key format)
        if (player.id && player.id.includes('-#') && player.id.includes('-')) {
          console.log('Deleting old system player:', player.id);
          cursor.delete();
        }
        cursor.continue();
      };
    });
    
    console.log('✅ Old player system cleanup completed');
  } catch (e) {
    console.log('❌ Error during cleanup:', e);
  }
}

// Function to load and display transfers
async function loadTransfers(status = 'pending') {
  console.log('=== loadTransfers called ===', 'Status:', status);
  
  if (!(DB_AVAILABLE && DB)) {
    console.log('❌ DB not available for loading transfers');
    return;
  }
  
  try {
    const tx = DB.transaction(["transfer_events"], "readonly");
    const store = tx.objectStore("transfer_events");
    const statusIndex = store.index("by_status");
    const req = statusIndex.getAll(status);
    
    await new Promise((resolve) => {
      req.onsuccess = async () => {
        const transfers = req.result;
        console.log('Loaded transfers:', transfers.length, 'for status:', status);
        
        // Get player and team names for each transfer
        const enrichedTransfers = [];
        for (const transfer of transfers) {
          const enriched = await enrichTransferData(transfer);
          enrichedTransfers.push(enriched);
        }
        
        renderTransfersList(enrichedTransfers, status);
        updateTransferCounts();
        resolve();
      };
      req.onerror = () => {
        console.log('❌ Error loading transfers:', req.error);
        resolve();
      };
    });
    
  } catch (e) {
    console.log('❌ Error in loadTransfers:', e);
  }
}

// Function to enrich transfer data with player and team names
async function enrichTransferData(transfer) {
  const enriched = { ...transfer };
  
  try {
    // Get player name
    const playerTx = DB.transaction(["players"], "readonly");
    const playerStore = playerTx.objectStore("players");
    const playerReq = playerStore.get(transfer.playerId);
    
    await new Promise((resolve) => {
      playerReq.onsuccess = () => {
        const player = playerReq.result;
        if (player) {
          enriched.playerName = `${player.firstNameHe || ''} ${player.familyNameHe || ''}`.trim();
          enriched.playerNameEn = `${player.firstNameEn || ''} ${player.familyNameEn || ''}`.trim();
        }
        resolve();
      };
      playerReq.onerror = () => resolve();
    });
    
    // Get team names
    const teamTx = DB.transaction(["teams"], "readonly");
    const teamStore = teamTx.objectStore("teams");
    
    // Get from team
    const fromTeamReq = teamStore.get(transfer.fromTeamId);
    await new Promise((resolve) => {
      fromTeamReq.onsuccess = () => {
        const team = fromTeamReq.result;
        if (team) {
          enriched.fromTeamName = team.name_he || team.name_en || transfer.fromTeamId;
        }
        resolve();
      };
      fromTeamReq.onerror = () => resolve();
    });
    
    // Get to team
    const toTeamReq = teamStore.get(transfer.toTeamId);
    await new Promise((resolve) => {
      toTeamReq.onsuccess = () => {
        const team = toTeamReq.result;
        if (team) {
          enriched.toTeamName = team.name_he || team.name_en || transfer.toTeamId;
        }
        resolve();
      };
      toTeamReq.onerror = () => resolve();
    });
    
  } catch (e) {
    console.log('❌ Error enriching transfer data:', e);
  }
  
  return enriched;
}

// Function to render transfers list
function renderTransfersList(transfers, status) {
  console.log('Rendering transfers list:', transfers.length, 'transfers');
  
  const container = document.getElementById('transfersList');
  if (!container) {
    console.log('❌ Transfers list container not found');
    return;
  }
  
  if (transfers.length === 0) {
    container.innerHTML = `
      <div class="text-center text-gray-500 py-8">
        <p>אין העברות ${status === 'pending' ? 'ממתינות' : status === 'confirmed' ? 'מאושרות' : 'נדחות'}</p>
      </div>
    `;
    return;
  }
  
  const transfersHtml = transfers.map(transfer => `
    <div class="border border-gray-200 rounded-lg p-4 mb-4 bg-white shadow-sm">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <span class="text-blue-600 font-semibold text-sm">${transfer.playerName?.charAt(0) || '?'}</span>
          </div>
          <div>
            <h3 class="font-semibold text-gray-900">${transfer.playerName || 'שחקן לא ידוע'}</h3>
            <p class="text-sm text-gray-500">${transfer.playerNameEn || ''}</p>
          </div>
        </div>
        <div class="text-right">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            transfer.is_inferred ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
          }">
            ${transfer.is_inferred ? 'זוהה אוטומטית' : 'ידני'}
          </span>
          <p class="text-xs text-gray-500 mt-1">ביטחון: ${Math.round(transfer.confidence * 100)}%</p>
        </div>
      </div>
      
      <div class="flex items-center justify-center gap-4 mb-4">
        <div class="text-center">
          <div class="text-sm font-medium text-gray-900">${transfer.fromTeamName || transfer.fromTeamId}</div>
          <div class="text-xs text-gray-500">קבוצה מקורית</div>
        </div>
        <div class="flex items-center">
          <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
          </svg>
        </div>
        <div class="text-center">
          <div class="text-sm font-medium text-gray-900">${transfer.toTeamName || transfer.toTeamId}</div>
          <div class="text-xs text-gray-500">קבוצה חדשה</div>
        </div>
      </div>
      
      <div class="flex items-center justify-between text-xs text-gray-500 mb-3">
        <span>תאריך גילוי: ${new Date(transfer.discoveredOnDate).toLocaleDateString('he-IL')}</span>
        <span>משחק: ${transfer.source_gameId}</span>
      </div>
      
      ${status === 'pending' ? `
        <div class="flex gap-2">
          <button class="confirmTransferBtn btn bg-green-600 text-white text-sm rounded px-3 py-2 hover:bg-green-700" data-transfer-id="${transfer.transferId}">
            אישור
          </button>
          <button class="dismissTransferBtn btn bg-red-600 text-white text-sm rounded px-3 py-2 hover:bg-red-700" data-transfer-id="${transfer.transferId}">
            דחייה
          </button>
          <button class="editTransferBtn btn bg-blue-600 text-white text-sm rounded px-3 py-2 hover:bg-blue-700" data-transfer-id="${transfer.transferId}">
            עריכה
          </button>
        </div>
      ` : ''}
    </div>
  `).join('');
  
  container.innerHTML = transfersHtml;
}

// Function to update transfer counts
async function updateTransferCounts() {
  if (!(DB_AVAILABLE && DB)) return;
  
  try {
    const tx = DB.transaction(["transfer_events"], "readonly");
    const store = tx.objectStore("transfer_events");
    const statusIndex = store.index("by_status");
    
    const counts = { pending: 0, confirmed: 0, dismissed: 0 };
    
    for (const status of ['pending', 'confirmed', 'dismissed']) {
      const req = statusIndex.count(status);
      await new Promise((resolve) => {
        req.onsuccess = () => {
          counts[status] = req.result;
          resolve();
        };
        req.onerror = () => resolve();
      });
    }
    
    // Update UI
    const pendingCount = document.getElementById('pendingCount');
    const confirmedCount = document.getElementById('confirmedCount');
    const dismissedCount = document.getElementById('dismissedCount');
    
    if (pendingCount) pendingCount.textContent = counts.pending;
    if (confirmedCount) confirmedCount.textContent = counts.confirmed;
    if (dismissedCount) dismissedCount.textContent = counts.dismissed;
    
  } catch (e) {
    console.log('❌ Error updating transfer counts:', e);
  }
}

// Function to update transfer status
async function updateTransferStatus(transferId, newStatus) {
  console.log('=== updateTransferStatus called ===', 'Transfer ID:', transferId, 'New Status:', newStatus);
  
  if (!(DB_AVAILABLE && DB)) {
    console.log('❌ DB not available for updating transfer status');
    return;
  }
  
  try {
    const tx = DB.transaction(["transfer_events"], "readwrite");
    const store = tx.objectStore("transfer_events");
    
    // Get the current transfer
    const getReq = store.get(parseInt(transferId));
    await new Promise((resolve) => {
      getReq.onsuccess = () => {
        const transfer = getReq.result;
        if (transfer) {
          // Update the status
          transfer.status = newStatus;
          transfer.decided_at = Date.now();
          transfer.decided_by = 'user'; // Could be enhanced to track actual user
          
          // Save the updated transfer
          const updateReq = store.put(transfer);
          updateReq.onsuccess = () => {
            console.log('✅ Transfer status updated successfully');
            resolve();
          };
          updateReq.onerror = () => {
            console.log('❌ Error updating transfer status:', updateReq.error);
            resolve();
          };
        } else {
          console.log('❌ Transfer not found');
          resolve();
        }
      };
      getReq.onerror = () => {
        console.log('❌ Error getting transfer:', getReq.error);
        resolve();
      };
    });
    
  } catch (e) {
    console.log('❌ Error in updateTransferStatus:', e);
  }
}

function openEditPlayerMap(rec){
  $("playerModal").classList.remove('hidden'); $("playerModal").classList.add('flex');
  $("pm_firstEn").value   = rec?.first_en   || '';
  $("pm_familyEn").value  = rec?.family_en  || '';
  $("pm_firstHe").value   = rec?.first_he   || '';
  $("pm_familyHe").value  = rec?.family_he  || '';
  $("pm_jersey").value    = rec?.jersey     || '';
  $("pm_teamEn").value    = rec?.team_en    || '';
  $("pm_lookupKey").value = rec?.lookup_key || '';
}
function computeLookupFromModal(){
  const fe = $("pm_firstEn").value;
  const fa = $("pm_familyEn").value;
  const te = $("pm_teamEn").value;
  return normalizeKeyWithoutJersey(fe,fa,te);
}

    // =========================
    // Parse & Render (ingest view)
    // =========================
    let RAW=null, TEAMMAP={}, PLAYERS=[], CHARTS={};

    function resolvePlayerHeName(p, teamNameEn){
  // Hebrew from payload if readable
  const heFirstRaw = p.firstName; 
  const heFamilyRaw = p.familyName;
  const heFirst = looksGibberishHeb(heFirstRaw) ? null : heFirstRaw;
  const heFamily = looksGibberishHeb(heFamilyRaw) ? null : heFamilyRaw;
  if(heFirst && heFamily) return { first_he: heFirst, family_he: heFamily };

  // Try mapping by EN + team (without jersey number dependency)
  const fe = p.internationalFirstName || ''; 
  const fa = p.internationalFamilyName || '';
  const key1 = normalizeKeyWithoutJersey(fe, fa, teamNameEn||'');
  const key2 = normalizeKeyWithoutJersey(fe, fa, ''); 
  const cand = PLAYER_MAP_INDEX.get(key1) || PLAYER_MAP_INDEX.get(key2);
  if(cand) return { first_he: cand.first_he, family_he: cand.family_he };

  // Decode gibberish
  if(looksGibberishHeb(heFirstRaw) || looksGibberishHeb(heFamilyRaw)){
    const dFirst = tryDecodeHeb(heFirstRaw);
    const dFam   = tryDecodeHeb(heFamilyRaw);
    if(dFirst && dFam && !looksGibberishHeb(dFirst) && !looksGibberishHeb(dFam)){
      return { first_he: dFirst, family_he: dFam };
    }
  }
  return null;
}
// מזהה שחקן אחיד לכל המערכת (תואם לפורמט קיימים כמו: t-f12d813d77-#15-15)
function makePlayerId({ teamId, teamNameEn, playerName, jersey }) {
  // קידומת קבוצה: teamId אם קיים, אחרת קיצור של שם קבוצה EN
  const teamPrefix = teamId || String(teamNameEn || '')
    .substring(0, 10)
    .replace(/\s+/g, '-');

  // נרמול שם שחקן: אותיות קטנות, בלי תווים מיוחדים (למעט רווח/מקף)
  const playerNameNormalized = String(playerName || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-#]/g, '')  // משאיר גם '#', כדי לאפשר '#15' כשאין שם
    .replace(/\s+/g, ' ');

  const jerseyStr = String(jersey || '').trim();

  // אם אין שם (או שזה '#<מספר>') — משתמשים בתבנית עם '#<גופייה>' ואז '<גופייה>'
  if (!playerNameNormalized || playerNameNormalized.startsWith('#')) {
    return `${teamPrefix}-#${jerseyStr}-${jerseyStr}`;
  }

  // אחרת: שם מנורמל + '#<גופייה>' + '<גופייה>'
  return `${teamPrefix}-${playerNameNormalized}-#${jerseyStr}-${jerseyStr}`;
}


    async function extractPlayers(data) {
  const rows = [], teamMap = {}, missing = [];
  if (!data || !data.tm) return { rows, teamMap, missing };

  console.log('extractPlayers called with data:', data);
  console.log('data.tm:', data.tm);
  
      // Fix Hebrew mojibake in the entire data structure with CP-1252 algorithm
      console.log('Applying Hebrew mojibake fix to data...');
      const fixedData = window.deepRepairHebrewNames ? window.deepRepairHebrewNames(data) : data;
      console.log('Fixed data:', fixedData);

  const teamKeys = Object.keys(fixedData.tm || {});
  console.log('Team keys:', teamKeys);
  
  for (const tKey of teamKeys) {
    const t = fixedData.tm[tKey];
    if (!t) {
      console.log('Skipping team', tKey, 'because t is null/undefined');
      continue;
    }

    // Use Hebrew name from JSON if available, otherwise fall back to English
    const teamNameHe = t.name || t.nameInternational || `Team ${tKey}`;
    const teamNameEn = t.nameInternational || t.name || `Team ${tKey}`;
    
    console.log('Team name from JSON (Hebrew):', t.name);
    console.log('Team nameInternational:', t.nameInternational);
    console.log('Using teamNameHe:', teamNameHe);
    console.log('Using teamNameEn:', teamNameEn);
    
    // Try to fix corrupted Hebrew names
    let fixedTeamNameHe = teamNameHe;
    // Check for corrupted patterns using character codes
    if (teamNameHe.includes('×ž.×›') && teamNameHe.includes('×¢×•×˜×£')) {
      fixedTeamNameHe = 'מ.כ עוטף דרום';
    } else if (teamNameHe.includes('×\x90.×¡.') && teamNameHe.includes('×\x90×©×§×œ×•×Ÿ')) {
      fixedTeamNameHe = 'א.ס. אשקלון/קרית גת';
    }
    
    console.log('Fixed teamNameHe:', fixedTeamNameHe);
    
    const resolved = resolveTeam(teamNameEn);
    const teamId = resolved?.team_id || null;

    console.log('resolveTeam called with:', teamNameEn);
    console.log('resolveTeam result:', resolved);
    console.log('TEAM_INDEX:', TEAM_INDEX);

    if (!resolved) missing.push(teamNameEn);
    
    // Use only the Hebrew name as the key to avoid duplicates
    teamMap[fixedTeamNameHe] = { ...t, team_id: teamId, name_he: fixedTeamNameHe, name_en: teamNameEn };
    
    // Store team in IndexedDB (always store to ensure data is available)
    if (DB_AVAILABLE && DB) {
      console.log('Storing team in DB:', { teamId, teamNameEn, fixedTeamNameHe });
      await storeTeamInDB({
        team_id: teamId || `t-${Date.now()}-${tKey}`,
        name_en: teamNameEn,
        name_he: fixedTeamNameHe,
        aliases: [teamNameEn, fixedTeamNameHe]
      });
      
      // Reload team index to include the new team
      if (typeof loadTeamsIndex === 'function') {
        await loadTeamsIndex();
        console.log('Team index reloaded after adding new team');
        
        // Try to resolve again after reloading
        const resolvedAfterReload = resolveTeam(teamNameEn);
        console.log('resolveTeam after reload:', resolvedAfterReload);
        if (resolvedAfterReload) {
          // Update the teamId and remove from missing
          const index = missing.indexOf(teamNameEn);
          if (index > -1) {
            missing.splice(index, 1);
          }
          teamMap[fixedTeamNameHe].team_id = resolvedAfterReload.team_id;
        }
      }
    }

    if (t.pl) {
      const playerKeys = Object.keys(t.pl || {});
      console.log('Player keys for team', tKey, ':', playerKeys);
      
      for (const pKey of playerKeys) {
        const p = t.pl[pKey];
        const min = p.sMinutes || "0:00";

        // שם תצוגה: אם ריק — נשתמש ב-#<מספר חולצה>
        let playerName = getPlayerName(p);
        console.log('Player name for', pKey, ':', playerName);
        console.log('Raw player data:', {
          firstName: p.firstName,
          familyName: p.familyName,
          internationalFirstName: p.internationalFirstName,
          internationalFamilyName: p.internationalFamilyName,
          scoreboardName: p.scoreboardName
        });
        
        if (!playerName || playerName.trim() === '') {
          playerName = p.shirtNumber ? `#${p.shirtNumber}` : `Player-${pKey}`;
        }

        // נרמול מספר חולצה — כמחרוזת
        const jersey = p.shirtNumber ? String(p.shirtNumber).trim() : "";

        // יצירת מזהה אחיד (זהה לסטטיסטיקות) דרך makePlayerId
        const uniqueId = makePlayerId({
          teamId,
          teamNameEn,
          playerName,
          jersey
        });

        // בדיקה אם השחקן שיחק בפועל לפני הוספה לרשימה
        const didPlay = played(min);

        rows.push({
          id: uniqueId,
          name: playerName,
          team: fixedTeamNameHe,
          jersey: jersey,
          minutes: min,
          points: asInt(p.sPoints),
          rebounds: asInt(p.sReboundsTotal),
          assists: asInt(p.sAssists),
          steals: asInt(p.sSteals),
          blocks: asInt(p.sBlocks),
          isStarter: p.starter === 1,
          playedMinutes: didPlay,
          plusMinus: asInt(p.sPlusMinusPoints),
          fouls: asInt(p.sFoulsPersonal),
          foulsOn: asInt(p.sFoulsOn),
          turnovers: asInt(p.sTurnovers),
          fieldGoalsMade: asInt(p.sFieldGoalsMade),
          fieldGoalsAttempted: asInt(p.sFieldGoalsAttempted),
          threePointsMade: asInt(p.sThreePointersMade),
          threePointsAttempted: asInt(p.sThreePointersAttempted),
          freeThrowsMade: asInt(p.sFreeThrowsMade),
          freeThrowsAttempted: asInt(p.sFreeThrowsAttempted),
          efficiency: asInt(p.eff_1),
          // מידע נוסף לצורך שיפור הזיהוי בעתיד
          rawKey: pKey,
          hasStats: didPlay && (
            asInt(p.sPoints) > 0 ||
            asInt(p.sReboundsTotal) > 0 ||
            asInt(p.sAssists) > 0 ||
            asInt(p.sFieldGoalsMade) > 0
          )
        });
      }
    }
  }

  return { rows, teamMap, missing: [...new Set(missing)] };
}

    // הפונקציה הזו הוסרה כי הגרפים שלה (pointsChart, efficiencyChart) הוסרו מהדף
    // function createCharts(team, players){
    //   if(!team) return;
    //   const pointsCtx=document.getElementById('pointsChart').getContext('2d');
    //   const efficiencyCtx=document.getElementById('efficiencyChart').getContext('2d');
    //   const top5Players=sortByColumn(players.filter(p=>p.playedMinutes),'points').slice(0,5);
    //   const paintPoints=asInt(team.tot_sPointsInThePaint);
    //   const fastBreakPoints=asInt(team.tot_sPointsFastBreak);
    //   const secondChancePoints=asInt(team.tot_sPointsSecondChance);
    //   const benchPoints=asInt(team.tot_sBenchPoints);
    //   const freeThrowPoints=asInt(team.tot_sFreeThrowsMade);
    //   if(CHARTS.pointsChart) CHARTS.pointsChart.destroy();
    //   CHARTS.pointsChart=new Chart(pointsCtx,{
    //     type:'doughnut',
    //     data:{ labels:['נקודות בצבע','נקודות מעבר מהיר','סל שני','נקודות מהספסל','נקודות מעונשין'],
    //            datasets:[{ data:[paintPoints, fastBreakPoints, secondChancePoints, benchPoints, freeThrowPoints] }]},
    //     options:{ responsive:true, maintainAspectRatio:false,
    //       plugins:{ legend:{ position:'right', labels:{ boxWidth:10, padding:10, font:{size:10} } } } }
    //   });
    //   if(CHARTS.efficiencyChart) CHARTS.efficiencyChart.destroy();
    //   CHARTS.efficiencyChart=new Chart(efficiencyCtx,{
    //     type:'bar',
    //     data:{ labels: top5Players.map(p=>p.name), datasets:[{ label:'יעילות', data: top5Players.map(p=>p.efficiency||0) }]},
    //     options:{ responsive:true, maintainAspectRatio:false, indexAxis:'y', plugins:{ legend:{display:false} }, scales:{ x:{ beginAtZero:true } } }
    //   });
    // }

    function renderTeamTable(teamName, players){
      const card=document.createElement('div'); card.className='card p-4';
      card.innerHTML=`
        <h2 class="text-lg font-bold mb-3 text-blue-900">${teamName} – שחקנים (<span class="teamCount">${players.length}</span>) <span class="text-sm text-gray-500 teamNote"></span></h2>
        <div class="overflow-auto rounded-lg border border-gray-300 shadow">
          <table class="stats w-full text-xs sticky-header">
            <colgroup><col style="width:20%" /><col span="18" /></colgroup>
            <thead>
              <tr>
                <th class="px-4 py-3 text-right player-name-col">שחקן</th>
                <th class="px-2 py-3 text-center numeric-col">מס'</th>
                <th class="px-2 py-3 text-center time-col">דקות</th>
                <th class="px-2 py-3 text-center numeric-col">נק'</th>
                <th class="px-2 py-3 text-center pct-col">שדה %</th>
                <th class="px-2 py-3 text-center numeric-col">ק2</th>
                <th class="px-2 py-3 text-center pct-col">ק2 %</th>
                <th class="px-2 py-3 text-center numeric-col">ק3</th>
                <th class="px-2 py-3 text-center pct-col">ק3 %</th>
                <th class="px-2 py-3 text-center numeric-col">מהקו</th>
                <th class="px-2 py-3 text-center pct-col">קו %</th>
                <th class="px-2 py-3 text-center numeric-col">ריב'</th>
                <th class="px-2 py-3 text-center numeric-col">אס'</th>
                <th class="px-2 py-3 text-center numeric-col">חט'</th>
                <th class="px-2 py-3 text-center numeric-col">חס'</th>
                <th class="px-2 py-3 text-center numeric-col">איב'</th>
                <th class="px-2 py-3 text-center numeric-col">עב'</th>
                <th class="px-2 py-3 text-center numeric-col">סחט</th>
                <th class="px-2 py-3 text-center plusminus-col">+/-</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 bg-white"></tbody>
          </table>
        </div>`;
      const tbody=card.querySelector('tbody');
      const note=card.querySelector('.teamNote');
      const showNon=$("toggleNonPlaying").checked;
      if(!showNon) note.textContent='– מוצגים שחקנים ששיחקו בלבד';

      const sorted=sortByColumn(showNon? players : players.filter(p=>p.playedMinutes), 'points');
      sorted.forEach(p=>{
        const tr=document.createElement('tr');
        tr.className=`${p.isStarter? 'font-medium bg-blue-50':''} ${!p.playedMinutes? 'text-gray-500':''} hover:bg-gray-50`;
        const twoMade = Math.max(0, (p.fieldGoalsMade||0) - (p.threePointsMade||0));
        const twoAtt  = Math.max(0, (p.fieldGoalsAttempted||0) - (p.threePointsAttempted||0));
        const fgPct   = formatPct(p.fieldGoalsMade, p.fieldGoalsAttempted);
        const twoPct  = formatPct(twoMade, twoAtt);
        const tpPct   = formatPct(p.threePointsMade, p.threePointsAttempted);
        const ftPct   = formatPct(p.freeThrowsMade, p.freeThrowsAttempted);
        tr.innerHTML=`
          <td class="px-4 py-2.5 whitespace-nowrap font-medium text-right player-name-col">${p.name}</td>
          <td class="px-2 py-2.5 whitespace-nowrap text-center numeric-col">${p.jersey}</td>
          <td class="px-2 py-2.5 whitespace-nowrap text-center time-col">${p.minutes}</td>
          <td class="px-2 py-2.5 whitespace-nowrap font-bold text-center numeric-col">${p.points}</td>
          <td class="px-2 py-2.5 whitespace-nowrap text-center pct-col">${fgPct}</td>
          <td class="px-2 py-2.5 whitespace-nowrap text-center numeric-col">${twoMade}-${twoAtt}</td>
          <td class="px-2 py-2.5 whitespace-nowrap text-center pct-col">${twoPct}</td>
          <td class="px-2 py-2.5 whitespace-nowrap text-center numeric-col">${p.threePointsMade}-${p.threePointsAttempted}</td>
          <td class="px-2 py-2.5 whitespace-nowrap text-center pct-col">${tpPct}</td>
          <td class="px-2 py-2.5 whitespace-nowrap text-center numeric-col">${p.freeThrowsMade}-${p.freeThrowsAttempted}</td>
          <td class="px-2 py-2.5 whitespace-nowrap text-center pct-col">${ftPct}</td>
          <td class="px-2 py-2.5 whitespace-nowrap text-center numeric-col">${p.rebounds}</td>
          <td class="px-2 py-2.5 whitespace-nowrap text-center numeric-col">${p.assists}</td>
          <td class="px-2 py-2.5 whitespace-nowrap text-center numeric-col">${p.steals}</td>
          <td class="px-2 py-2.5 whitespace-nowrap text-center numeric-col">${p.blocks}</td>
          <td class="px-2 py-2.5 whitespace-nowrap text-center numeric-col">${p.turnovers}</td>
          <td class="px-2 py-2.5 whitespace-nowrap text-center numeric-col">${p.fouls}</td>
          <td class="px-2 py-2.5 whitespace-nowrap text-center numeric-col">${p.foulsOn}</td>
          <td class="px-2 py-2.5 whitespace-nowrap text-center plusminus-col ${p.plusMinus>0? 'text-green-600': p.plusMinus<0? 'text-red-600':'text-gray-600'}">${p.plusMinus>0? '+':''}${p.plusMinus}</td>`;
        tbody.appendChild(tr);
      });
      return card;
    }

    function render(){
      const showNon=$("toggleNonPlaying").checked;
      const filtered= showNon? PLAYERS : PLAYERS.filter(p=>p.playedMinutes);
      const container=$("playersByTeams");
      container.innerHTML='';
      const teams=Object.keys(TEAMMAP);

      // הקוד הבא הוסר כי האלמנטים של סטטיסטיקות קבוצה, שחקנים מובילים וסיכום למשדר הוסרו מהדף
      // const firstTeam=teams[0];
      // if(firstTeam){
      //   const t=TEAMMAP[firstTeam];
      //   const fgM=t.tot_sFieldGoalsMade, fgA=t.tot_sFieldGoalsAttempted;
      //   const tpM=t.tot_sThreePointersMade, tpA=t.tot_sThreePointersAttempted;
      //   const ftM=t.tot_sFreeThrowsMade, ftA=t.tot_sFreeThrowsAttempted;
      //   const pct=(m,a)=> (a&&a>0&&typeof m==="number")? ((m/a*100).toFixed(1)+"%") : "-";
      //   const byPoints=sortByColumn(filtered.filter(p=>p.team===firstTeam),'points')[0]||{};
      //   const byRebounds=sortByColumn(filtered.filter(p=>p.team===firstTeam),'rebounds')[0]||{};
      //   const byAssists=sortByColumn(filtered.filter(p=>p.team===firstTeam),'assists')[0]||{};
      //   $("teamName").textContent=firstTeam;
      //   $("teamPoints").textContent=t.tot_sPoints||0;
      //   $("teamRebounds").textContent=t.tot_sReboundsTotal||0;
      //   $("teamAssists").textContent=t.tot_sAssists||0;
      //   $("teamSteals").textContent=t.tot_sSteals||0;
      //   $("teamFGM").textContent=fgM||0; $("teamFGA").textContent=fgA||0;
      //   $("team3PM").textContent=tpM||0; $("team3PA").textContent=tpA||0;
      //   $("teamFTM").textContent=ftM||0; $("teamFTA").textContent=ftA||0;
      //   $("topScorerName").textContent=byPoints.name||'-'; $("topScorerJersey").textContent="#"+(byPoints.jersey||0); $("topScorerPoints").textContent=byPoints.points||0;
      //   $("topRebounderName").textContent=byRebounds.name||'-'; $("topRebounderJersey").textContent="#"+(byRebounds.jersey||0); $("topRebounderRebounds").textContent=byRebounds.rebounds||0;
      //   $("topAssisterName").textContent=byAssists.name||'-'; $("topAssisterJersey").textContent="#"+(byAssists.jersey||0); $("topAssisterAssists").textContent=byAssists.assists||0;
      //   createCharts(t, filtered.filter(p=>p.team===firstTeam));
      //   $("notes").value=`...`;
      // }

      teams.forEach(teamName=>{
        const teamPlayers=PLAYERS.filter(p=>p.team===teamName);
        const card=renderTeamTable(teamName, teamPlayers);
        container.appendChild(card);
      });

      $("results").classList.remove('hidden');
    }
