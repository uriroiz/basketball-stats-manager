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
          if (typeof DB !== 'undefined' && DB) {
            // 🔥 FIX: Try new system (players) first, then fallback to old system (player_mappings)
            let rec = null;
            
            // Try new system: players store (using UUID as key)
            try {
              // First, load the player
              rec = await new Promise((res)=>{
                const tx = DB.transaction(['players'], 'readonly');
                const st = tx.objectStore('players');
                const rq = st.get(key);
                rq.onsuccess = ()=>{
                  const player = rq.result;
                  if (player) {
                    // Convert new format to old format for compatibility
                    const converted = {
                      lookup_key: player.id,
                      id: player.id,
                      first_en: player.firstNameEn || '',
                      family_en: player.familyNameEn || '',
                      first_he: player.firstNameHe || '',
                      family_he: player.familyNameHe || '',
                      jersey: '',
                      team_en: ''
                    };
                    res(converted);
                  } else {
                    res(null);
                  }
                };
                rq.onerror = ()=>res(null);
              });
              
              // If player found, load appearance data
              if (rec && rec.id) {
                try {
                  const appearanceTx = DB.transaction(['appearances'], 'readonly');
                  const appearanceStore = appearanceTx.objectStore('appearances');
                  const playerIndex = appearanceStore.index('by_player_season');
                  const appearanceReq = playerIndex.getAll([rec.id, '2024-25']);
                  
                  await new Promise((appearanceRes) => {
                    appearanceReq.onsuccess = () => {
                      const appearances = appearanceReq.result;
                      if (appearances.length > 0) {
                        const latest = appearances[appearances.length - 1];
                        rec.jersey = latest.jersey || latest.shirtNumber || '';
                        // Try to get team name from team_id
                        if (latest.team_id) {
                          const teamTx = DB.transaction(['teams'], 'readonly');
                          const teamStore = teamTx.objectStore('teams');
                          const teamReq = teamStore.get(latest.team_id);
                          teamReq.onsuccess = () => {
                            const team = teamReq.result;
                            if (team) {
                              rec.team_en = team.name_en || team.name_he || '';
                              // Update the field in the modal if it's already open
                              const teamEnField = document.getElementById('pm_teamEn');
                              if (teamEnField) {
                                teamEnField.value = rec.team_en;
                              }
                            }
                          };
                        } else {
                          rec.team_en = latest.teamId || '';
                          // Update the field in the modal
                          const teamEnField = document.getElementById('pm_teamEn');
                          if (teamEnField) {
                            teamEnField.value = rec.team_en;
                          }
                        }
                        
                        // Update jersey field in the modal
                        const jerseyField = document.getElementById('pm_jersey');
                        if (jerseyField) {
                          jerseyField.value = rec.jersey;
                        }
                      }
                      appearanceRes();
                    };
                    appearanceReq.onerror = () => appearanceRes();
                  });
                } catch (e) {
                  console.log('⚠️ Could not load appearances:', e);
                }
              }
            } catch (e) {
              console.log('⚠️ Could not load from players store:', e);
            }
            
            // Fallback to old system: player_mappings store
            if (!rec) {
              rec = await new Promise((res)=>{
                const tx = DB.transaction(['player_mappings'], 'readonly');
                const st = tx.objectStore('player_mappings');
                const rq = st.get(key);
                rq.onsuccess = ()=>res(rq.result||null);
                rq.onerror   = ()=>res(null);
              });
            }
            
            if (typeof openEditPlayerMap==='function') openEditPlayerMap(rec);
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
