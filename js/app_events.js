// SAFE DOM-READY EVENT WIRING (patched)
(function(){ 
  function byId(id){ return document.getElementById(id); }
  function on(el, ev, fn){ if(el) el.addEventListener(ev, fn, false); }
  function setOnClick(id, fn){ const el = byId(id); if(el && typeof fn==='function') el.onclick = fn; }
  function getSwitchTab(){ 
    if (typeof switchTab === 'function') return switchTab; 
    if (window.App && typeof window.App.switchTab === 'function') return window.App.switchTab; 
    return null; 
  }

  function wire(){ 
    try {
      const _switchTab = getSwitchTab();
      if (_switchTab) {
        document.querySelectorAll('#tabs .tab').forEach(b => on(b, 'click', () => _switchTab(b.dataset.tab)));
      }

      setOnClick('chooseBtn', () => byId('file') && byId('file').click());
      const fileEl = byId('file');
      if (fileEl) {
        on(fileEl, 'change', () => {
          const f = fileEl.files && fileEl.files[0];
          if(!f) return;
          const r = new FileReader();
          r.onload = () => { const ta = byId('jsonTa'); if(ta) ta.value = String(r.result||''); if (typeof parseNow === 'function') parseNow(); };
          r.onerror = () => (typeof showError === 'function' && showError('שגיאה בקריאת הקובץ'));
          r.readAsText(f);
        });
      }

      setOnClick('parseBtn', () => (typeof parseNow === 'function' && parseNow()));
      const tnp = byId('toggleNonPlaying');
      if (tnp) on(tnp, 'change', () => (typeof render === 'function' && render()));

      setOnClick('resetBtn', () => { if (typeof listTeams === 'function') { 
        try{ 
          window.RAW=null; window.TEAMMAP={}; window.PLAYERS=[]; 
          const ta = byId('jsonTa'); if(ta) ta.value='';
          const urlInput = byId('gameUrlInput'); if(urlInput) urlInput.value='';
          ['gameId','gameDate','gameCycle'].forEach(id=>{ const el=byId(id); if(el) el.value=''; });
          const res = byId('results'); if(res) res.classList.add('hidden');
          const alerts = byId('alerts'); if(alerts) alerts.innerHTML='';
          // הגרפים הוסרו מהדף
          // if (window.CHARTS && window.CHARTS.pointsChart) { window.CHARTS.pointsChart.destroy(); window.CHARTS.pointsChart=null; }
          // if (window.CHARTS && window.CHARTS.efficiencyChart) { window.CHARTS.efficiencyChart.destroy(); window.CHARTS.efficiencyChart=null; }
          const pbt = byId('playersByTeams'); if(pbt) pbt.innerHTML='';
          const mw = byId('mappingWarn'); if(mw) mw.classList.add('hidden');
          listTeams();
        }catch(e){ console.error(e); }
      }});

      // כפתור copyNotes הוסר מהדף
      // setOnClick('copyNotes', async () => {
      //   try { await navigator.clipboard.writeText((byId('notes')||{}).value||''); typeof showOk==='function' && showOk('הסיכום הועתק ללוח'); setTimeout(()=>{ const a=byId('alerts'); if(a) a.innerHTML=''; },1500); }
      //   catch(e){ typeof showError==='function' && showError('העתקה ללוח לא נתמכת במצב זה'); }
      // });

      setOnClick('openTeamModal', () => (typeof openEditTeam==='function' && openEditTeam(null)));
      setOnClick('closeTeamModal', () => { const m=byId('teamModal'); if(m) m.classList.add('hidden'); });
      setOnClick('cancelTeam', () => { const m=byId('teamModal'); if(m) m.classList.add('hidden'); });
      setOnClick('saveToDbBtn', () => (typeof saveToDatabase==='function' && saveToDatabase()));
      setOnClick('cleanupOldSystemBtn', async () => {
        if (typeof cleanupOldPlayerSystem === 'function') {
          await cleanupOldPlayerSystem();
          typeof showOk === 'function' && showOk('המערכת הישנה נוקתה. רענן את הטאב "ניהול שחקנים".');
        }
      });

      setOnClick('closeDbConnectionBtn', () => {
        if (typeof closeDbConnection === 'function') {
          closeDbConnection();
          typeof showOk === 'function' && showOk('קשרי מסד הנתונים נסגרו. עכשיו תוכל למחוק את המסד.');
        }
      });

      // Transfer management events
      setOnClick('refreshTransfersBtn', () => {
        if (typeof loadTransfers === 'function') {
          loadTransfers('pending');
        }
      });

      setOnClick('transfersPendingTab', () => {
        if (typeof loadTransfers === 'function') {
          loadTransfers('pending');
          // Update tab styling
          document.querySelectorAll('[id$="Tab"]').forEach(tab => {
            tab.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
            tab.classList.add('text-gray-500');
          });
          document.getElementById('transfersPendingTab').classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
          document.getElementById('transfersPendingTab').classList.remove('text-gray-500');
        }
      });

      setOnClick('transfersConfirmedTab', () => {
        if (typeof loadTransfers === 'function') {
          loadTransfers('confirmed');
          // Update tab styling
          document.querySelectorAll('[id$="Tab"]').forEach(tab => {
            tab.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
            tab.classList.add('text-gray-500');
          });
          document.getElementById('transfersConfirmedTab').classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
          document.getElementById('transfersConfirmedTab').classList.remove('text-gray-500');
        }
      });

      setOnClick('transfersDismissedTab', () => {
        if (typeof loadTransfers === 'function') {
          loadTransfers('dismissed');
          // Update tab styling
          document.querySelectorAll('[id$="Tab"]').forEach(tab => {
            tab.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
            tab.classList.add('text-gray-500');
          });
          document.getElementById('transfersDismissedTab').classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
          document.getElementById('transfersDismissedTab').classList.remove('text-gray-500');
        }
      });

      // Load transfers when switching to transfers tab
      setOnClick('transfers', () => {
        if (typeof loadTransfers === 'function') {
          loadTransfers('pending');
        }
      });

      // Event delegation for transfer action buttons
      document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('confirmTransferBtn')) {
          const transferId = e.target.getAttribute('data-transfer-id');
          if (typeof updateTransferStatus === 'function') {
            await updateTransferStatus(transferId, 'confirmed');
            typeof showOk === 'function' && showOk('העברה אושרה בהצלחה');
            if (typeof loadTransfers === 'function') {
              loadTransfers('pending');
            }
          }
        }
        
        if (e.target.classList.contains('dismissTransferBtn')) {
          const transferId = e.target.getAttribute('data-transfer-id');
          if (typeof updateTransferStatus === 'function') {
            await updateTransferStatus(transferId, 'dismissed');
            typeof showOk === 'function' && showOk('העברה נדחתה');
            if (typeof loadTransfers === 'function') {
              loadTransfers('pending');
            }
          }
        }
      });

      // Upcoming Games - כניסה לטאב הכנה למשחק
      const gamePrepTab = document.querySelector('[data-tab="gamePrep"]');
      if (gamePrepTab) {
        on(gamePrepTab, 'click', async () => {
          if (typeof window.loadUpcomingGames === 'function') {
            const container = byId('upcomingGamesContainer');
            if (container && !container.dataset.loaded) {
              try {
                console.log('🎯 Loading upcoming games on tab open...');
                await window.loadUpcomingGames();
                container.dataset.loaded = 'true';
              } catch (error) {
                console.error('❌ Failed to load upcoming games:', error);
              }
            }
          }
        });
      }

      // Upcoming Games - כפתור רענון
      setOnClick('refreshUpcomingGames', async function() {
        if (typeof window.loadUpcomingGames === 'function') {
          const btn = this;
          const originalText = btn.textContent;
          btn.disabled = true;
          btn.textContent = '⏳ טוען...';
          
          try {
            await window.loadUpcomingGames();
            btn.textContent = '✓ עודכן';
            setTimeout(() => {
              btn.disabled = false;
              btn.textContent = originalText;
            }, 2000);
          } catch (error) {
            console.error('Error refreshing games:', error);
            btn.textContent = '❌ שגיאה';
            setTimeout(() => {
              btn.disabled = false;
              btn.textContent = originalText;
            }, 2000);
          }
        }
      });

      // Upcoming Games - Dropdown מחזור
      const roundSelector = byId('roundSelector');
      if (roundSelector) {
        on(roundSelector, 'change', function() {
          if (typeof window.renderSelectedRound === 'function') {
            console.log('🔄 Round selector changed to:', this.value);
            window.renderSelectedRound(this.value);
          }
        });
      }

      // Search with debounce to avoid multiple rapid calls
      // Automatic search after 300ms of no typing
      let playersSearchTimeout;
      const ps = byId('playersSearch'); 
      if (ps) {
        on(ps, 'input', () => {
          clearTimeout(playersSearchTimeout);
          playersSearchTimeout = setTimeout(() => {
            if (typeof renderPlayersTable === 'function') renderPlayersTable();
          }, 300); // Wait 300ms after user stops typing
        });
        
        // Trigger immediate search on Enter key
        on(ps, 'keypress', (e) => {
          if (e.key === 'Enter') {
            clearTimeout(playersSearchTimeout);
            if (typeof renderPlayersTable === 'function') renderPlayersTable();
          }
        });
      }
      
      let gamesSearchTimeout;
      const gs = byId('gamesSearch'); 
      if (gs) {
        on(gs, 'input', () => {
          clearTimeout(gamesSearchTimeout);
          gamesSearchTimeout = setTimeout(() => {
            if (typeof renderGamesTable === 'function') renderGamesTable();
          }, 300);
        });
        
        // Trigger immediate search on Enter key
        on(gs, 'keypress', (e) => {
          if (e.key === 'Enter') {
            clearTimeout(gamesSearchTimeout);
            if (typeof renderGamesTable === 'function') renderGamesTable();
          }
        });
      }

      setOnClick('saveTeam', async () => {
        const teamId = (byId('tm_teamId')?.value||'').trim() || `t-${Math.random().toString(16).substring(2, 12)}`;
        const nameEn = (byId('tm_nameEn')?.value||'').trim();
        const nameHe = (byId('tm_nameHe')?.value||'').trim();
        const shortHe = (byId('tm_shortHe')?.value||'').trim();
        const aliases = (byId('tm_aliases')?.value||'').split(';').map(a => a.trim()).filter(Boolean);
        try {
          if (typeof upsertTeam === 'function') {
            await upsertTeam({ team_id: teamId, name_en: nameEn, name_he: nameHe, short_he: shortHe, aliases, league: 'IL-National-League', season: '2024-25' });
          }
          const m=byId('teamModal'); if(m) m.classList.add('hidden');
          if (typeof listTeams === 'function') await listTeams();
          if (window.RAW && byId('jsonTa') && typeof parseNow==='function') { typeof showOk==='function' && showOk('קבוצה נשמרה. מרענן ניתוח...'); setTimeout(()=>{ parseNow(); }, 500); }
          else { typeof showOk==='function' && showOk('קבוצה נשמרה בהצלחה'); }
        } catch(err) { typeof showError==='function' && showError('שגיאה בשמירת קבוצה: ' + (err?.message || err)); }
      });

      on(document, 'click', async (e) => {
        const editBtn = e.target.closest('button.editTeam');
        const delBtn  = e.target.closest('button.delTeam');
        if(editBtn && typeof getTeam==='function' && typeof openEditTeam==='function'){
          const id = editBtn.dataset.id; const t = await getTeam(id); openEditTeam(t);
        }
        if(delBtn && typeof deleteTeam==='function'){
          const id = delBtn.dataset.id; if(confirm('למחוק קבוצה?')){ await deleteTeam(id); typeof showOk==='function' && showOk('קבוצה נמחקה'); }
        }
      });

      // Manage Players modal
      setOnClick('openPlayerModal', () => (typeof openEditPlayerMap==='function' && openEditPlayerMap(null)));
      setOnClick('closePlayerModal', () => { const m=byId('playerModal'); if(m) m.classList.add('hidden'); });
      setOnClick('cancelPlayerMap', () => { const m=byId('playerModal'); if(m) m.classList.add('hidden'); });

      setOnClick('savePlayerMap', async () => {
        const rec = {
          first_en:  (byId('pm_firstEn')?.value||'').trim(),
          family_en: (byId('pm_familyEn')?.value||'').trim(),
          first_he:  (byId('pm_firstHe')?.value||'').trim(),
          family_he: (byId('pm_familyHe')?.value||'').trim(),
          jersey:    (byId('pm_jersey')?.value||'').trim(),
          team_en:   (byId('pm_teamEn')?.value||'').trim()
        };
        const suggested = (typeof computeLookupFromModal==='function'&&computeLookupFromModal()) || '';
        const keyEl = byId('pm_lookupKey');
        const key = (keyEl && keyEl.value ? keyEl.value : suggested).trim();
        if(!rec.first_en || !rec.family_en || !rec.first_he || !rec.family_he){ typeof showError==='function' && showError('יש למלא אנגלית + עברית (שם פרטי + משפחה)'); return; }
        rec.lookup_key = key;
        try {
          if (typeof upsertPlayerMapping === 'function') await upsertPlayerMapping(rec);
          const m=byId('playerModal'); if(m) m.classList.add('hidden');
          if (typeof listPlayerMappings === 'function') await listPlayerMappings();
          typeof showOk==='function' && showOk('מיפוי שחקן נשמר בהצלחה');
        } catch(err) { typeof showError==='function' && showError('שגיאה בשמירת מיפוי: ' + (err?.message||err)); }
      });

      on(document, 'click', async (e)=>{
        const editPM = e.target.closest('button.editPlayerMap');
        const delPM  = e.target.closest('button.delPlayerMap');
        if(editPM){
          const key = editPM.dataset.k;
          console.log('🔍 Edit player clicked, key:', key);
          
          // Wait for DB to be ready
          if (typeof window.ensureDbReady === 'function') {
            await window.ensureDbReady();
          }
          
          if (!window.dbAdapter) {
            console.error('❌ dbAdapter not available');
            typeof showError === 'function' && showError('מסד הנתונים לא זמין');
            return;
          }
          
          let rec = null;
          
          try {
            // Get all players from dbAdapter
            const allPlayers = await window.dbAdapter.getPlayers();
            console.log('📊 Total players loaded:', allPlayers.length);
            
            // Find the specific player by lookup_key (which is the id)
            const player = allPlayers.find(p => p.id === key);
            console.log('🔍 Found player:', player);
            
            if (player) {
              // Extract jersey and team from most recent game
              let jersey = '';
              let team_en = '';
              
              if (player.games && Array.isArray(player.games) && player.games.length > 0) {
                // Sort by gameSerial to get most recent
                const sortedGames = [...player.games].sort((a, b) => (b.gameSerial || 0) - (a.gameSerial || 0));
                const latestGame = sortedGames[0];
                jersey = latestGame.jersey || '';
                team_en = latestGame.team || '';
                console.log('📋 Latest game data:', { jersey, team_en, gameSerial: latestGame.gameSerial });
              }
              
              // Convert to format expected by modal
              rec = {
                lookup_key: player.id,
                id: player.id,
                first_en: player.firstNameEn || '',
                family_en: player.familyNameEn || '',
                first_he: player.firstNameHe || '',
                family_he: player.familyNameHe || '',
                jersey: jersey,
                team_en: team_en
              };
              
              console.log('✅ Player record prepared:', rec);
            } else {
              console.warn('⚠️ Player not found with key:', key);
            }
          } catch (e) {
            console.error('❌ Error loading player:', e);
            typeof showError === 'function' && showError('שגיאה בטעינת נתוני שחקן: ' + (e?.message || e));
          }
          
          if (rec && typeof openEditPlayerMap === 'function') {
            console.log('🔓 Opening edit modal with data:', rec);
            openEditPlayerMap(rec);
          } else {
            console.error('❌ Could not open edit modal, rec:', rec, 'function exists:', typeof openEditPlayerMap);
          }
        }
        if(delPM && typeof deletePlayerMapping==='function' && typeof listPlayerMappings==='function'){
          const key = delPM.dataset.k;
          if(confirm('למחוק מיפוי?')){ await deletePlayerMapping(key); await listPlayerMappings(); typeof showOk==='function' && showOk('המיפוי נמחק'); }
        }
      });

      // Export / Import
      setOnClick('exportPlayersMapBtn', async () => {
        if(!(typeof DB !== 'undefined' && DB)) { typeof showError==='function' && showError('מסד נתונים אינו זמין'); return; }
        const rows=[];
        await new Promise(res=>{
          const tx = DB.transaction(['player_mappings'], 'readonly');
          const st = tx.objectStore('player_mappings');
          const rq = st.openCursor();
          rq.onsuccess = (e)=>{ const c=e.target.result; if(!c) return res(); rows.push(c.value); c.continue(); };
        });
        const dataStr = JSON.stringify(rows, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display='none'; a.href=url; a.download=`player_mappings_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a); a.click();
        setTimeout(()=>{ document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
      });

      setOnClick('importPlayersMapBtn', () => { const el=byId('importPlayersMapFile'); if(el) el.click(); });
      const ipf = byId('importPlayersMapFile');
      if (ipf) on(ipf, 'change', async (e)=>{
        const file = e.target.files && e.target.files[0];
        e.target.value = '';
        if(!file) return;
        try{
          const text = await file.text();
          const rows = JSON.parse(text);
          if(!Array.isArray(rows)) { typeof showError==='function' && showError('קובץ חייב להכיל מערך של מיפויים'); return; }
          const tx = DB.transaction(['player_mappings'], 'readwrite');
          const st = tx.objectStore('player_mappings');
          for(const r of rows){
            if(!r.lookup_key && typeof normalizeKey==='function'){
              r.lookup_key = normalizeKey(r.first_en||'', r.family_en||'', r.jersey||'', r.team_en||'');
            }
            await new Promise((res)=>{ const rq = st.put(r); rq.onsuccess=()=>res(); rq.onerror=()=>res(); });
          }
          if (typeof loadPlayerMappingsIndex==='function') await loadPlayerMappingsIndex();
          if (typeof listPlayerMappings==='function') await listPlayerMappings();
          typeof showOk==='function' && showOk(`יובאו ${rows.length} מיפויים`);
        }catch(err){ typeof showError==='function' && showError('שגיאה בייבוא מיפויים: '+(err?.message||err)); }
      });

      setOnClick('migratePlayersBtn', () => (typeof migratePlayerDatabase==='function' && migratePlayerDatabase()));
      setOnClick('recalcStatsBtn', () => (typeof recalculatePlayerStats==='function' && recalculatePlayerStats()));
      setOnClick('clearAllBtn', () => (typeof clearAllDatabase==='function' && clearAllDatabase()));
      setOnClick('loadFromUrlBtn', async () => {
        const urlInput = byId('gameUrlInput');
        const jsonTa = byId('jsonTa');
        if (!urlInput || !jsonTa) return;
        
        const url = urlInput.value.trim();
        if (!url) {
          typeof showError==='function' && showError('אנא הכנס קישור למשחק');
          return;
        }
        
        try {
          typeof showOk==='function' && showOk('טוען נתונים מהקישור...');
          
          // נסיון עם מספר proxies שונים (מעודכן)
          const proxies = [
            `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
            `https://corsproxy.io/?${encodeURIComponent(url)}`,
            `https://thingproxy.freeboard.io/fetch/${url}`,
            `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
            `https://cors-anywhere.herokuapp.com/${url}`
          ];
          
          let success = false;
          for (const proxyUrl of proxies) {
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 שניות timeout
              
              const response = await fetch(proxyUrl, {
                signal: controller.signal,
                headers: {
                  'X-Requested-With': 'XMLHttpRequest'
                }
              });
              
              clearTimeout(timeoutId);
              
              if (response.ok) {
                const data = await response.text();
                jsonTa.value = data;
                typeof showOk==='function' && showOk('הנתונים נטענו בהצלחה! לחץ על "פענח" כדי לעבד אותם.');
                success = true;
                break;
              }
            } catch (proxyError) {
              console.log(`Proxy failed: ${proxyUrl}`, proxyError);
              continue;
            }
          }
          
          if (!success) {
            throw new Error('הטעינה נכשלה אחרי 10 שניות. מומלץ לטעון את הנתונים ידנית - פתח את הקישור בחלון חדש, העתק את הנתונים והדבק כאן.');
          }
          
        } catch (error) {
          console.error('CORS error, trying alternative method:', error);
          
          // פתרון חלופי - פתיחת הקישור בחלון חדש
          const openInNewTab = confirm(
            'לא ניתן לטעון את הנתונים ישירות (CORS).\n\n' +
            'האם לפתוח את הקישור בחלון חדש?\n' +
            'תוכל להעתיק את הנתונים משם ולהדביק כאן.'
          );
          
          if (openInNewTab) {
            window.open(url, '_blank');
            typeof showOk==='function' && showOk('הקישור נפתח בחלון חדש. העתק את הנתונים והדבק כאן.');
          } else {
            typeof showError==='function' && showError(
              'שגיאה בטעינת הנתונים (CORS).<br>' +
              'פתרונות אפשריים:<br>' +
              '1. השתמש בהרחבה "CORS Unblock"<br>' +
              '2. פתח את הדפדפן עם --disable-web-security<br>' +
              '3. העתק את הנתונים ידנית מהקישור'
            );
          }
        }
      });
      setOnClick('copyUrlBtn', () => {
        const urlInput = byId('gameUrlInput');
        if (!urlInput) return;
        
        const exampleUrl = 'https://fibalivestats.dcd.shared.geniussports.com/data/2733003/data.json';
        urlInput.value = exampleUrl;
        urlInput.select();
        document.execCommand('copy');
        typeof showOk==='function' && showOk('קישור לדוגמה הועתק! עכשיו לחץ על "טען מהקישור"');
      });
      setOnClick('pasteDataBtn', async () => {
        const jsonTa = byId('jsonTa');
        if (!jsonTa) return;
        
        try {
          const text = await navigator.clipboard.readText();
          if (text && text.trim()) {
            jsonTa.value = text;
            typeof showOk==='function' && showOk('הנתונים הודבקו! לחץ על "פענח" כדי לעבד אותם.');
          } else {
            typeof showError==='function' && showError('לוח ההעתקה ריק או לא זמין');
          }
        } catch (error) {
          typeof showError==='function' && showError('לא ניתן לגשת ללוח ההעתקה. נסה Ctrl+V במקום');
        }
      });

      setOnClick('openUrlBtn', () => {
        const urlInput = byId('gameUrlInput');
        if (!urlInput) return;
        
        const url = urlInput.value.trim();
        if (!url) {
          typeof showError==='function' && showError('אנא הכנס קישור למשחק');
          return;
        }
        
        // פתיחת הקישור בחלון חדש
        window.open(url, '_blank');
        typeof showOk==='function' && showOk('הקישור נפתח בחלון חדש. העתק את הנתונים והדבק כאן.');
      });
      setOnClick('exportDbBtn', () => (typeof exportFullDatabase==='function' && exportFullDatabase()));
      setOnClick('importDbBtn', () => { const el=byId('importDbFile'); if(el) el.click(); });
      const idf = byId('importDbFile');
      if (idf) on(idf, 'change', (e) => { const file = e.target.files && e.target.files[0]; if (file && typeof importFullDatabase==='function') importFullDatabase(file); e.target.value=''; });
      setOnClick('reloadAllGamesBtn', () => (typeof reloadAllGamesFromJSON==='function' && reloadAllGamesFromJSON()));

      setOnClick('exportTeamsBtn', () => (typeof exportTeams==='function' && exportTeams()));
      setOnClick('importTeamsBtn', () => { const el=byId('importTeamsFile'); if(el) el.click(); });
      const itf = byId('importTeamsFile');
      if (itf) on(itf, 'change', (e) => { const file = e.target.files && e.target.files[0]; if (file && typeof importTeams==='function') importTeams(file); e.target.value=''; });

      // Games delete handler re-wire (in case original didn't bind)
      const gamesTbody = byId('gamesTbody');
      if (gamesTbody && typeof deleteGameById==='function') {
        on(gamesTbody, 'click', async (ev)=>{
          const btn = ev.target.closest('button[data-del]');
          if(!btn) return;
          const id = btn.getAttribute('data-del');
          if(!id) return;
          if(confirm(`למחוק את המשחק ${id}?`)){
            await deleteGameById(id);
            if (typeof renderGamesTable==='function') await renderGamesTable();
            if (typeof renderTeamsAggregate==='function') await renderTeamsAggregate();
          }
        });
      }
    } catch(err) { console.error('Event wiring error:', err); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire, false);
  } else {
    wire();
  }
})();
