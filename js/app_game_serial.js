    // =========================
    // Game serial helpers
    // =========================
    async function getMaxGameSerial(){
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
    }

    async function nextGameSerial(){ const maxS = await getMaxGameSerial(); return (maxS || 0) + 1; }
    async function setNextGameSerialToUI(){ try{ const n = await nextGameSerial(); $("gameId").value = String(n); }catch(e){ console.error(e); } }
