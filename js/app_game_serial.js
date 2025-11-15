    // =========================
    // Game serial helpers
    // =========================
    async function getMaxGameSerial(){
      try {
        // Wait for DB to be ready
        if (typeof window.ensureDbReady === 'function') {
          await window.ensureDbReady();
        }
        
        // Use dbAdapter to work with both Supabase and IndexedDB
        if (window.dbAdapter && typeof window.dbAdapter.getGames === 'function') {
          const games = await window.dbAdapter.getGames();
          if (!games || games.length === 0) return 0;
          
          const maxSerial = games.reduce((max, game) => {
            const serial = Number(game?.gameSerial || 0);
            return (Number.isFinite(serial) && serial > max) ? serial : max;
          }, 0);
          
          return maxSerial;
        }
        
        // Fallback to IndexedDB
        if(!(DB_AVAILABLE && DB)){ return 0; }
        const tx = DB.transaction(["games"], "readonly");
        const store = tx.objectStore("games");
        let maxSerial = 0;
        await new Promise((resolve)=>{
          const req = store.openCursor();
          req.onsuccess = (e)=>{
            const cur = e.target.result;
            if(!cur) return resolve();
            const val = cur.value;
            const serial = Number(val?.gameSerial || 0);
            if(Number.isFinite(serial) && serial > maxSerial){ maxSerial = serial; }
            cur.continue();
          };
        });
        return maxSerial;
      } catch (error) {
        console.error('Error getting max game serial:', error);
        return 0;
      }
    }

    async function nextGameSerial(){ const maxS = await getMaxGameSerial(); return (maxS || 0) + 1; }
    async function setNextGameSerialToUI(){ try{ const n = await nextGameSerial(); $("gameId").value = String(n); }catch(e){ console.error(e); } }
