    // =========================
    // Save to DB
    // =========================
    async function checkForDuplicateGame(date, cycle, teams) {
      if(!(DB_AVAILABLE && DB)) return null;
      
      try {
        // נוודא שיש לנו נתונים תקינים לבדיקה
        if(!date || !cycle || !teams || !teams.length) {
          return null;
        }
        
        const tx = DB.transaction(["games"], "readonly");
        const store = tx.objectStore("games");
        const duplicates = [];
        
        // נוודא שצוות הקבוצות מסודר (כדי להשוות בקלות)
        const sortedTeams = [...teams].sort();
        
        await new Promise(resolve => {
          const req = store.openCursor();
          req.onsuccess = e => {
            const cur = e.target.result;
            if(!cur) return resolve();
            
            const game = cur.value;
            
            // השוואת תאריך ומחזור
            const sameDate = game.date === date;
            const sameCycle = String(game.cycle) === String(cycle);
            
            // בדיקה אם מדובר באותן קבוצות (ללא התחשבות בסדר)
            let sameTeams = false;
            if(game.teams && game.teams.length > 0) {
              const gameSortedTeams = [...game.teams].sort();
              // בדיקה אם יש זהות מלאה בין הרשימות
              sameTeams = JSON.stringify(gameSortedTeams) === JSON.stringify(sortedTeams);
            }
            
            // אם נמצאה התאמה מדויקת
            if(sameDate && sameCycle && sameTeams) {
              duplicates.push({
                gameId: game.gameSerial || game.id,
                date: game.date,
                cycle: game.cycle,
                teams: game.teams,
                exactMatch: true
              });
            }
            
            cur.continue();
          };
        });
        
        return duplicates;
      } catch(err) {
        console.error("שגיאה בבדיקת כפילויות:", err);
        return null;
      }
    }

    // פונקציית עזר: ניקוי סטטיסטיקות של שחקנים עבור משחק מסוים (לפני עדכון)
    async function cleanupPlayerStatsForGame(playerStore, gameSerial) {
      // קבלת כל השחקנים
      const allPlayers = await new Promise((resolve, reject) => {
        const req = playerStore.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      
      // הסרת סטטיסטיקות של משחק זה מכל שחקן
      for (const player of allPlayers) {
        if (player.games && Array.isArray(player.games)) {
          // סינון - הסרת סטטיסטיקות של המשחק המתעדכן
          const filteredGames = player.games.filter(g => g.gameId !== gameSerial);
          
          if (filteredGames.length !== player.games.length) {
            // שחקן זה היה לו סטטיסטיקות למשחק - מעדכנים אותו
            player.games = filteredGames;
            
            // חישוב מחדש של הסטטיסטיקות המצטברות
            const totalGames = player.games.length;
            if (totalGames > 0) {
              player.totalPoints = player.games.reduce((s,g) => s + (g.points || 0), 0);
              player.totalRebounds = player.games.reduce((s,g) => s + (g.rebounds || 0), 0);
              player.totalAssists = player.games.reduce((s,g) => s + (g.assists || 0), 0);
              player.totalSteals = player.games.reduce((s,g) => s + (g.steals || 0), 0);
              player.totalBlocks = player.games.reduce((s,g) => s + (g.blocks || 0), 0);
              player.totalTurnovers = player.games.reduce((s,g) => s + (g.turnovers || 0), 0);
              player.totalFouls = player.games.reduce((s,g) => s + (g.fouls || 0), 0);
              player.totalFoulsDrawn = player.games.reduce((s,g) => s + (g.foulsOn || 0), 0);
              player.totalEfficiency = player.games.reduce((s,g) => s + (g.efficiency || 0), 0);
              
              // חישוב אחוזי קליעה
              const totalFGM = player.games.reduce((s,g) => s + (g.fieldGoalsMade || 0), 0);
              const totalFGA = player.games.reduce((s,g) => s + (g.fieldGoalsAttempted || 0), 0);
              const total3PM = player.games.reduce((s,g) => s + (g.threePointsMade || 0), 0);
              const total3PA = player.games.reduce((s,g) => s + (g.threePointsAttempted || 0), 0);
              const totalFTM = player.games.reduce((s,g) => s + (g.freeThrowsMade || 0), 0);
              const totalFTA = player.games.reduce((s,g) => s + (g.freeThrowsAttempted || 0), 0);
              
              player.fgPercentage = totalFGA > 0 ? ((totalFGM / totalFGA) * 100).toFixed(1) : "0.0";
              player.threePointPercentage = total3PA > 0 ? ((total3PM / total3PA) * 100).toFixed(1) : "0.0";
              player.ftPercentage = totalFTA > 0 ? ((totalFTM / totalFTA) * 100).toFixed(1) : "0.0";
              
              // חישוב ממוצעים
              player.avgPoints = (player.totalPoints / totalGames).toFixed(1);
              player.avgRebounds = (player.totalRebounds / totalGames).toFixed(1);
              player.avgAssists = (player.totalAssists / totalGames).toFixed(1);
              player.avgSteals = (player.totalSteals / totalGames).toFixed(1);
              player.avgBlocks = (player.totalBlocks / totalGames).toFixed(1);
              player.avgTurnovers = (player.totalTurnovers / totalGames).toFixed(1);
              player.avgFouls = (player.totalFouls / totalGames).toFixed(1);
              player.avgEfficiency = (player.totalEfficiency / totalGames).toFixed(1);
            } else {
              // אם לא נשארו משחקים, מאפסים הכל
              player.totalPoints = player.totalRebounds = player.totalAssists = 0;
              player.totalSteals = player.totalBlocks = player.totalTurnovers = 0;
              player.totalFouls = player.totalFoulsDrawn = player.totalEfficiency = 0;
              player.fgPercentage = player.threePointPercentage = player.ftPercentage = "0.0";
              player.avgPoints = player.avgRebounds = player.avgAssists = "0.0";
              player.avgSteals = player.avgBlocks = player.avgTurnovers = "0.0";
              player.avgFouls = player.avgEfficiency = "0.0";
            }
            
            await new Promise((resolve, reject) => {
              const req = playerStore.put(player);
              req.onsuccess = () => resolve();
              req.onerror = () => reject(req.error);
            });
          }
        }
      }
    }

    async function saveToDatabase(skipDuplicateCheck = false){
      console.log('saveToDatabase called, PLAYERS length:', PLAYERS?.length, 'TEAMMAP keys:', Object.keys(TEAMMAP||{}));
      if(!(DB_AVAILABLE && DB)){
        // ניסיון אתחול אוטומטי לאחר ניקוי או בתחילת שימוש
        try{
          await initDb();
          await loadTeamsIndex();
          if(!(DB_AVAILABLE && DB)){
            showError("מסד נתונים אינו זמין במצב הנוכחי (ייתכן מצב אורח/פרטי). השמירה הושבתה." + (typeof getDbDiagnostics==="function" ? "\nפרטים: "+JSON.stringify(getDbDiagnostics()) : ""));
            return;
          }
        }catch(e){
          showError("לא ניתן לאתחל מסד נתונים: " + (e?.message||e));
          return;
        }
      }
      
      if(!PLAYERS.length){ 
        showError("אין נתונים לשמירה"); 
        return; 
      }
      
      // בדיקה האם מולא שדה מספר מחזור
      const gameCycle = $("gameCycle").value || null;
      if(!gameCycle) {
        showError("יש למלא מספר מחזור לפני שמירה למסד");
        // הדגשת השדה החסר
        $("gameCycle").classList.add("border-red-500", "bg-red-50");
        setTimeout(() => {
          $("gameCycle").classList.remove("border-red-500", "bg-red-50");
        }, 3000);
        return;
      }
      
      const gameDate = $("gameDate").value || (new Date()).toISOString().slice(0,10);
      const teams = Object.keys(TEAMMAP);
      
      // בדיקת כפילויות - רק אם לא במצב דילוג (טעינה מחדש אוטומטית)
      if (!skipDuplicateCheck) {
        const duplicates = await checkForDuplicateGame(gameDate, gameCycle, teams);
        if(duplicates && duplicates.length > 0) {
          // מצאנו התאמה מדויקת - משחק זהה קיים כבר
          const exactMatches = duplicates.filter(d => d.exactMatch);
          if(exactMatches.length > 0) {
            const match = exactMatches[0];
            const confirmSave = confirm(
              `נמצא משחק זהה במסד הנתונים!
מזהה משחק: ${match.gameId}
תאריך: ${match.date}
מחזור: ${match.cycle}
קבוצות: ${match.teams.join(' - ')}

האם אתה בטוח שברצונך לשמור את המשחק הנוכחי?`
            );
            if(!confirmSave) {
              return; // המשתמש ביטל את השמירה
            }
          }
          // התרעה על חשד לכפילות (יש קבוצות משותפות)
          else if(duplicates.length > 0) {
            const suspectedDuplicates = duplicates.map(d => 
              `משחק ${d.gameId}: ${d.date}, מחזור ${d.cycle}, קבוצות: ${d.teams.join(' - ')}`
            ).join('\n');
            
            const confirmSave = confirm(
              `שים לב - נמצאו משחקים דומים במסד הנתונים:
${suspectedDuplicates}

האם אתה בטוח שברצונך להמשיך בשמירה?`
            );
            if(!confirmSave) {
              return; // המשתמש ביטל את השמירה
            }
          }
        }
      }
      
      try{
        // בדיקה האם אנחנו במצב עדכון של משחק קיים
        const updateModeGameId = $("updateModeGameId").value;
        const isUpdateMode = updateModeGameId && updateModeGameId.trim() !== '';
        
        let currentSerial;
        
        if (isUpdateMode) {
          // מצב עדכון: שימוש ב-ID הקיים
          currentSerial = parseInt(updateModeGameId, 10);
          $("gameId").value = String(currentSerial);
          console.log(`Update mode: overwriting game ${currentSerial}`);
        } else {
          // מצב הוספה: יצירת ID חדש
          currentSerial = await nextGameSerial();
          $("gameId").value = String(currentSerial);
          console.log(`Insert mode: creating new game ${currentSerial}`);
        }
        
        // Wait for DB to be ready
        if (typeof window.ensureDbReady === 'function') {
          await window.ensureDbReady();
        }

        if (!window.dbAdapter) {
          showError('מסד הנתונים לא זמין');
          return;
        }

        // שמירת ה-JSON המקורי
        const originalJson = $("jsonTa")?.value || null;
        
        const gameToSave = { 
          gameSerial: currentSerial, 
          date: gameDate, 
          cycle: gameCycle,
          teams: teams, 
          timestamp: new Date().toISOString(),
          originalJson: originalJson
        };
        
        let totalPlayers = PLAYERS.length;
        let playersWithMinutes = 0;
        let playersSaved = 0;
        
        console.log(`Preparing to save ${totalPlayers} players...`);
        
        // Prepare all players data
        const playersToSave = [];
        
        for(const player of PLAYERS){
          // שמירת רק שחקנים שבאמת שיחקו במשחק
          if(!player.playedMinutes) continue;
          playersWithMinutes++;
          
          // קבלת שחקן קיים (אם יש) דרך dbAdapter
          const existingPlayer = await window.dbAdapter.getPlayer(player.id);
          
          const gameEntry = {
            gameId: currentSerial, date:gameDate, team:player.team, minutes:player.minutes,
            points:player.points, rebounds:player.rebounds, assists:player.assists,
            steals:player.steals, blocks:player.blocks, turnovers:player.turnovers,
            fouls:player.fouls, foulsOn:player.foulsOn, plusMinus:player.plusMinus,
            fieldGoalsMade:player.fieldGoalsMade, fieldGoalsAttempted:player.fieldGoalsAttempted,
            threePointsMade:player.threePointsMade, threePointsAttempted:player.threePointsAttempted,
            freeThrowsMade:player.freeThrowsMade, freeThrowsAttempted:player.freeThrowsAttempted,
            efficiency:player.efficiency
          };
          
          let playerToSave;
          if(existingPlayer){
            existingPlayer.games=existingPlayer.games||[];
            const idx = existingPlayer.games.findIndex(g => g.gameId===currentSerial);
            if(idx>=0) existingPlayer.games[idx] = gameEntry; else existingPlayer.games.push(gameEntry);
            const totalGames=existingPlayer.games.length;
            existingPlayer.totalPoints=existingPlayer.games.reduce((s,g)=>s+(g.points||0),0);
            existingPlayer.totalRebounds=existingPlayer.games.reduce((s,g)=>s+(g.rebounds||0),0);
            existingPlayer.totalAssists=existingPlayer.games.reduce((s,g)=>s+(g.assists||0),0);
            existingPlayer.totalSteals=existingPlayer.games.reduce((s,g)=>s+(g.steals||0),0);
            existingPlayer.totalBlocks=existingPlayer.games.reduce((s,g)=>s+(g.blocks||0),0);
            existingPlayer.totalTurnovers=existingPlayer.games.reduce((s,g)=>s+(g.turnovers||0),0);
            existingPlayer.totalFouls=existingPlayer.games.reduce((s,g)=>s+(g.fouls||0),0);
            existingPlayer.totalFoulsDrawn=existingPlayer.games.reduce((s,g)=>s+(g.foulsOn||0),0);
            existingPlayer.totalEfficiency=existingPlayer.games.reduce((s,g)=>s+(g.efficiency||0),0);
            
            // Calculate shooting percentages
            const totalFGM = existingPlayer.games.reduce((s,g)=>s+(g.fieldGoalsMade||0),0);
            const totalFGA = existingPlayer.games.reduce((s,g)=>s+(g.fieldGoalsAttempted||0),0);
            const total3PM = existingPlayer.games.reduce((s,g)=>s+(g.threePointsMade||0),0);
            const total3PA = existingPlayer.games.reduce((s,g)=>s+(g.threePointsAttempted||0),0);
            const totalFTM = existingPlayer.games.reduce((s,g)=>s+(g.freeThrowsMade||0),0);
            const totalFTA = existingPlayer.games.reduce((s,g)=>s+(g.freeThrowsAttempted||0),0);
            
            existingPlayer.fgPercentage = totalFGA > 0 ? ((totalFGM/totalFGA)*100).toFixed(1) : "0.0";
            existingPlayer.threePointPercentage = total3PA > 0 ? ((total3PM/total3PA)*100).toFixed(1) : "0.0";
            existingPlayer.ftPercentage = totalFTA > 0 ? ((totalFTM/totalFTA)*100).toFixed(1) : "0.0";
            
            // חישוב ממוצעים
            existingPlayer.avgPoints = totalGames ? (existingPlayer.totalPoints / totalGames).toFixed(1) : "0.0";
            existingPlayer.avgRebounds = totalGames ? (existingPlayer.totalRebounds / totalGames).toFixed(1) : "0.0";
            existingPlayer.avgAssists = totalGames ? (existingPlayer.totalAssists / totalGames).toFixed(1) : "0.0";
            existingPlayer.avgSteals = totalGames ? (existingPlayer.totalSteals / totalGames).toFixed(1) : "0.0";
            existingPlayer.avgBlocks = totalGames ? (existingPlayer.totalBlocks / totalGames).toFixed(1) : "0.0";
            existingPlayer.avgTurnovers = totalGames ? (existingPlayer.totalTurnovers / totalGames).toFixed(1) : "0.0";
            existingPlayer.avgFouls = totalGames ? (existingPlayer.totalFouls / totalGames).toFixed(1) : "0.0";
            existingPlayer.avgEfficiency = totalGames ? (existingPlayer.totalEfficiency / totalGames).toFixed(1) : "0.0";
            
            playerToSave = existingPlayer;
          } else {
            playerToSave = {
              id:player.id, name:player.name, team:player.team, jersey:player.jersey,
              games:[gameEntry],
              totalPoints:player.points, totalRebounds:player.rebounds, totalAssists:player.assists,
              totalSteals:player.steals, totalBlocks:player.blocks, totalTurnovers:player.turnovers,
              totalFouls:player.fouls, totalFoulsDrawn:player.foulsOn, totalEfficiency:player.efficiency,
              fgPercentage: player.fieldGoalsAttempted > 0 ? ((player.fieldGoalsMade/player.fieldGoalsAttempted)*100).toFixed(1) : "0.0",
              threePointPercentage: player.threePointsAttempted > 0 ? ((player.threePointsMade/player.threePointsAttempted)*100).toFixed(1) : "0.0",
              ftPercentage: player.freeThrowsAttempted > 0 ? ((player.freeThrowsMade/player.freeThrowsAttempted)*100).toFixed(1) : "0.0",
              avgPoints:player.points.toFixed(1), avgRebounds:player.rebounds.toFixed(1), avgAssists:player.assists.toFixed(1),
              avgSteals:player.steals.toFixed(1), avgBlocks:player.blocks.toFixed(1), avgTurnovers:player.turnovers.toFixed(1),
              avgFouls:player.fouls.toFixed(1), avgEfficiency:player.efficiency.toFixed(1)
            };
          }
          
          playersToSave.push(playerToSave);
          playersSaved++;
        }
        
        // Save game with all players in one call (uses Edge Function if authenticated)
        console.log(`💾 Saving game ${currentSerial} with ${playersToSave.length} players via dbAdapter...`);
        await window.dbAdapter.saveGame(gameToSave, playersToSave);
        
        console.log(`✅ Save completed: ${totalPlayers} total players, ${playersWithMinutes} actually played, ${playersSaved} prepared`);
        
        // בדיקת כמה משחקים ושחקנים יש במסד הנתונים
        setTimeout(async () => {
          try {
            const allGames = await window.dbAdapter.getGames();
            const allPlayers = await window.dbAdapter.getPlayers();
            console.log(`📊 Total in database: ${allGames?.length || 0} games, ${allPlayers?.length || 0} players`);
          } catch (error) {
            console.error('Error counting database records:', error);
          }
        }, 100);
        
        // ניקוי מצב עדכון והכנה למשחק הבא
        $("updateModeGameId").value = '';
        
        // החזרת כפתור השמירה למצב רגיל
        const saveBtn = $("saveToDbBtn");
        if (saveBtn) {
          saveBtn.textContent = "שמור למסד";
          saveBtn.classList.remove("update-mode");
        }
        
        if (!isUpdateMode) {
          // רק במצב הוספה - עובר למספר הבא
          const nextSerial = currentSerial + 1;
          $("gameId").value = String(nextSerial);
        }
        
        // איפוס שדה המחזור לאחר שמירה מוצלחת
        $("gameCycle").value = "";
        
        const successMsg = isUpdateMode 
          ? `משחק ${currentSerial} עודכן בהצלחה! שחקנים: ${PLAYERS.filter(p=>p.playedMinutes).length}`
          : `משחק ${currentSerial} נשמר בהצלחה! שחקנים: ${PLAYERS.filter(p=>p.playedMinutes).length}`;
        showOk(successMsg);
        renderGamesTable && renderGamesTable();

      } catch(err){ showError(`שגיאה בשמירת הנתונים: ${err.message}`); }
    
      /* __NEW_PLAYER_IDENTITY_SYSTEM__ */
      try {
        // New player identity system - save players with UUID-based identity
        console.log('Saving players with new identity system, PLAYERS length:', PLAYERS?.length);
        if (Array.isArray(PLAYERS) && PLAYERS.length && (DB_AVAILABLE && DB)) {
          // לצורך בניית lookup_key והשלמות שדות
          const txMap = DB.transaction(["player_mappings"], "readwrite");
          const stMap = txMap.objectStore("player_mappings");
          
          // נבנה מפתח מהיר לבדיקה אם קיים כבר (lookup_key)
          function guessLangIsEn(str) {
            // אנגלית גסה: אותיות לטיניות, ספרות, רווחים/מקפים
            return /^[A-Za-z0-9\s\-\#]+$/.test(String(str||"").trim());
          }
          function splitName(nameStr) {
            const name = String(nameStr||"").trim();
            if(!name) return {first_en:"", family_en:"", first_he:"", family_he:""};
            const parts = name.split(/\s+/);
            if(parts.length === 1) {
              // לא ברור — נשים כ-first בלבד
              return guessLangIsEn(name) ? 
                { first_en: parts[0], family_en: "", first_he:"", family_he:"" } :
                { first_en: "", family_en: "", first_he: parts[0], family_he:"" };
            }
            const first = parts[0]; 
            const family = parts.slice(1).join(" ");
            return guessLangIsEn(name) ? 
              { first_en: first, family_en: family, first_he:"", family_he:"" } :
              { first_en: "", family_en: "", first_he: first, family_he: family };
          }
          
          for (const p of PLAYERS) {
            try {
              const teamHe = p.team || "";
              const teamEntry = TEAMMAP && teamHe ? TEAMMAP[teamHe] : null;
              const teamEn = (teamEntry && (teamEntry.name_en || teamEntry.nameInternational || teamHe)) || teamHe;
              const jersey = (p.jersey || "").trim();
              const pid = p.id || ""; // מזהה קנוני שכבר חושב ב-extractPlayers
              
              // פיצול שם לשדות EN/HE (הכי טוב שאפשר מתוך הרשומה)
              const nm = splitName(p.name);
              
              // lookup_key לוגי ללא תלות במספר חולצה - מאפשר איחוד שחקנים עם מספרי חולצה שונים
              // המשתנה normalizeKeyWithoutJersey אמור להיות גלובלי (app_utils.js)
              let lookup_key = "";
              try {
                if (typeof normalizeKeyWithoutJersey === "function") {
                  lookup_key = normalizeKeyWithoutJersey(nm.first_en || "", nm.family_en || "", teamEn || "");
                } else {
                  lookup_key = [nm.first_en||"", nm.family_en||"", teamEn||""].join("|").toLowerCase();
                }
                console.log('Player lookup_key (without jersey):', lookup_key, 'for player:', nm.first_en, nm.family_en, 'team:', teamEn);
              } catch(_e){}
              
              const rec = {
                lookup_key,
                id: pid,
                first_en: nm.first_en || "",
                family_en: nm.family_en || "",
                first_he: nm.first_he || "",
                family_he: nm.family_he || "",
                jersey: jersey || "",
                team_en: teamEn || ""
              };
              
              // אם כבר קיימת רשומה עם אותו lookup_key — נמזג בעדינות
              const existing = await new Promise((res)=>{ 
                const rq = stMap.get(rec.lookup_key); 
                rq.onsuccess = () => res(rq.result||null); 
                rq.onerror = () => res(null); 
              });
              
              if (existing) {
                // נשמור את הקיים ונוסיף חסרים בלבד; נשמר גם id אם חסר
                const merged = Object.assign({}, existing);
                if (pid && !merged.id) merged.id = pid;
                ["first_en","family_en","first_he","family_he","jersey","team_en"].forEach(k => {
                  if ((!merged[k] || merged[k].trim() === "") && rec[k]) merged[k] = rec[k];
                });
                await new Promise((res,rej)=>{ const rq = stMap.put(merged); rq.onsuccess=()=>res(); rq.onerror=()=>rej(rq.error); });
              } else {
                await new Promise((res,rej)=>{ const rq = stMap.add(rec); rq.onsuccess=()=>res(); rq.onerror=()=>rej(rq.error); });
              }
            } catch (_inner) {
              // לא עוצרים שמירה עבור שחקן בודד
            }
          }
        }
      } catch(_e) {
        // לא עוצרים את השמירה של המשחקים גם אם המיפוי נכשל
        console.warn("player_mappings auto-upsert failed", _e);
      }
      /* __END_AUTO_UPSERT_PLAYER_MAPPINGS__ */
    
}


    // פונקציית מיגרציה לשחקנים
    async function migratePlayerDatabase() {
      if (!(DB_AVAILABLE && DB)) {
        showError("מסד נתונים אינו זמין במצב הנוכחי");
        return;
      }
      
      if (!confirm("האם אתה בטוח שברצונך להריץ את תהליך המיגרציה? מומלץ לגבות את הנתונים לפני כן.")) {
        return;
      }
      
      try {
        showOk("מתחיל מיגרציה...");
        
        // Step 1: טעינת כל השחקנים הקיימים
        const allPlayers = [];
        const tx = DB.transaction(["players"], "readonly");
        const store = tx.objectStore("players");
        
        await new Promise(resolve => {
          const req = store.openCursor();
          req.onsuccess = e => {
            const cursor = e.target.result;
            if (!cursor) return resolve();
            allPlayers.push(cursor.value);
            cursor.continue();
          };
          req.onerror = () => resolve();
        });
        
        // Step 2: קיבוץ שחקנים לפי שם, מספר גופייה וקבוצה
        const playerGroups = {};
        let emptyNamesCount = 0;
        
        for (const player of allPlayers) {
          if (!player.name || player.name === "-" || player.name.startsWith("#")) {
            // שחקנים ללא שם - לא להכליל אלא אם יש להם סטטיסטיקה משמעותית
            const hasSignificantStats = (player.totalPoints > 5 || player.totalRebounds > 5 || player.totalAssists > 3);
            if (!hasSignificantStats) {
              emptyNamesCount++;
              continue; // דילוג על שחקנים ריקים ללא סטטיסטיקה
            }
          }
          
          // יצירת מזהה משופר
          const name = (player.name || "").toLowerCase().trim();
          const jersey = (player.jersey || "").trim();
          const team = player.team || "";
          
          // חיפוש team_id אם קיים
          const resolvedTeam = resolveTeam(team);
          const teamId = resolvedTeam?.team_id || team;
          
          // יצירת מזהה משופר ויותר קריא
          let newId;
          if (!name || name === "#" || name.startsWith('#')) {
            newId = `${teamId}-jersey${jersey}`;
          } else {
            // ניקוי שם משחקן
            const cleanName = name.replace(/[^\w\s-]/g, '').trim();
            newId = `${teamId}-${cleanName}-${jersey}`;
          }
          
          if (!playerGroups[newId]) {
            playerGroups[newId] = [];
          }
          playerGroups[newId].push(player);
        }
        
        // Step 3: מיזוג סטטיסטיקות ויצירת רשומות חדשות
        const wtx = DB.transaction(["players"], "readwrite");
        const wstore = wtx.objectStore("players");
        
        // מחיקת כל השחקנים הנוכחיים
        await new Promise(resolve => {
          const req = wstore.clear();
          req.onsuccess = () => resolve();
          req.onerror = () => resolve();
        });
        
        // הוספת שחקנים ממוזגים
        let migratedCount = 0;
        let mergedCount = 0;
        let skippedCount = 0;
        
        for (const newId in playerGroups) {
          const players = playerGroups[newId];
          
          if (players.length === 0) continue;
          
          // בדיקה לשחקנים חסרי ערך - לדלג אם אין סטטיסטיקה משמעותית
          const hasZeroStats = players.every(p => 
            (!p.games || p.games.length === 0) && 
            (!p.totalPoints || p.totalPoints === 0) && 
            (!p.totalRebounds || p.totalRebounds === 0) && 
            (!p.totalAssists || p.totalAssists === 0)
          );
          
          if (hasZeroStats) {
            skippedCount++;
            continue; // לדלג על שחקנים ללא סטטיסטיקה
          }
          
          // אם יש רק שחקן אחד עם מזהה זה, רק לעדכן את המזהה
          if (players.length === 1) {
            const player = players[0];
            player.id = newId; // הגדרת פורמט מזהה חדש
            
            // בדיקה נוספת שיש משחקים בכלל
            if (player.games && player.games.length > 0) {
              await new Promise((resolve, reject) => {
                const req = wstore.add(player);
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
              });
              migratedCount++;
            } else {
              skippedCount++;
            }
            continue;
          }
          
          // מיזוג מספר שחקנים עם אותו מידע מזהה
          mergedCount++;
          
          // בחירת השם הטוב ביותר מבין האפשרויות
          const bestPlayer = players.reduce((best, current) => {
            // העדפת שחקנים עם שם מלא על פני שחקנים עם שם קצר או ריק
            if (!best.name || best.name === "-" || best.name.startsWith("#")) return current;
            if (current.name && current.name.length > best.name.length) return current;
            return best;
          }, players[0]);
          
          const mergedPlayer = {
            id: newId,
            name: bestPlayer.name,
            team: bestPlayer.team,
            jersey: bestPlayer.jersey,
            games: [],
            totalPoints: 0,
            totalRebounds: 0,
            totalAssists: 0
          };
          
          // שילוב כל סטטיסטיקות המשחקים
          for (const player of players) {
            if (Array.isArray(player.games)) {
              // בדיקת כפילויות משחקים לפי gameId
              for (const game of player.games) {
                const existingGameIndex = mergedPlayer.games.findIndex(g => g.gameId === game.gameId);
                
                if (existingGameIndex === -1) {
                  mergedPlayer.games.push(game);
                } else {
                  // אם המשחק כבר קיים, להשתמש בערך עם יותר סטטיסטיקה
                  const existing = mergedPlayer.games[existingGameIndex];
                  const sumStats = existing.points + existing.rebounds + existing.assists;
                  const newSumStats = game.points + game.rebounds + game.assists;
                  
                  if (newSumStats > sumStats) {
                    mergedPlayer.games[existingGameIndex] = game;
                  }
                }
              }
            }
          }
          
          // חישוב סך הכל מחדש
          const totalGames = mergedPlayer.games.length;
          
          // אם אין משחקים, לדלג על שחקן זה
          if (totalGames === 0) {
            skippedCount++;
            continue;
          }
          
          mergedPlayer.totalPoints = mergedPlayer.games.reduce((s, g) => s + (g.points || 0), 0);
          mergedPlayer.totalRebounds = mergedPlayer.games.reduce((s, g) => s + (g.rebounds || 0), 0);
          mergedPlayer.totalAssists = mergedPlayer.games.reduce((s, g) => s + (g.assists || 0), 0);
          
          // חישוב ממוצעים
          mergedPlayer.avgPoints = totalGames ? (mergedPlayer.totalPoints / totalGames).toFixed(1) : "0.0";
          mergedPlayer.avgRebounds = totalGames ? (mergedPlayer.totalRebounds / totalGames).toFixed(1) : "0.0";
          mergedPlayer.avgAssists = totalGames ? (mergedPlayer.totalAssists / totalGames).toFixed(1) : "0.0";
          
          // שמירת השחקן הממוזג
          await new Promise((resolve, reject) => {
            const req = wstore.add(mergedPlayer);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
          });
        }
        
        showOk(`המיגרציה הושלמה בהצלחה! ${migratedCount} שחקנים עודכנו, ${mergedCount} שחקנים מוזגו, ${skippedCount} שחקנים ריקים הוסרו.`);
        
        // רענון תצוגת השחקנים אם נמצאים בה כרגע
        if (!$("view-players").classList.contains("hidden")) {
          renderPlayersTable();
        }
      } catch (err) {
        showError("שגיאה במיגרציה: " + (err?.message || err));
      }
    }

    // ניקוי מלא של מסד הנתונים
    async function clearAllDatabase() {
      if (!(DB_AVAILABLE && DB)) {
        showError('מסד הנתונים לא זמין');
        return;
      }

      try {
        console.log('מתחיל ניקוי מלא של מסד הנתונים...');
        
        // מחיקת כל הטבלאות חוץ ממשחקים (games) שיישארו לטעינה מחדש
        const stores = ['players', 'teams', 'player_mappings', 'player_stats', 'appearances', 'player_aliases', 'team_aliases', 'transfer_events'];
        
        for (const storeName of stores) {
          console.log(`מוחק את טבלת ${storeName}...`);
          const tx = DB.transaction([storeName], 'readwrite');
          const store = tx.objectStore(storeName);
          await new Promise(resolve => {
            const req = store.clear();
            req.onsuccess = () => resolve();
            req.onerror = () => resolve();
          });
          console.log(`טבלת ${storeName} נמחקה`);
        }
        
        console.log('ניקוי מלא הושלם! המשחקים נשמרו לטעינה מחדש.');
        showOk('ניקוי מלא הושלם!<br>כל הסטטיסטיקות נמחקו (חוץ ממשחקים).<br>עכשיו לחץ על "טעינה מחדש של שחקנים וקבוצות" כדי לשחזר את הנתונים.');
        
        // רענון התצוגות
        if (!$("view-players").classList.contains("hidden")) {
          renderPlayersTable();
        }
        if (!$("view-teams").classList.contains("hidden")) {
          renderTeamsTable();
        }
        if (!$("view-games").classList.contains("hidden")) {
          renderGamesTable();
        }
        
      } catch (error) {
        console.error('Error clearing database:', error);
        showError('שגיאה בניקוי מסד הנתונים: ' + (error?.message || error));
      }
    }

    // רענון חישוב סטטיסטיקות שחקנים
    async function recalculatePlayerStats() {
      if (!(DB_AVAILABLE && DB)) {
        showError('מסד הנתונים לא זמין');
        return;
      }

      try {
        console.log('מתחיל רענון חישוב סטטיסטיקות שחקנים...');
        let processedCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;

        const tx = DB.transaction(['players'], 'readwrite');
        const store = tx.objectStore('players');
        
        await new Promise(resolve => {
          const req = store.openCursor();
          req.onsuccess = e => {
            const c = e.target.result;
            if (!c) return resolve();
            
            const player = c.value;
            processedCount++;
            
            // דילוג על שחקנים ללא משחקים
            if (!player.games || player.games.length === 0) {
              skippedCount++;
              c.continue();
              return;
            }

            // חישוב מחדש של כל הסטטיסטיקות
            const totalGames = player.games.length;
            
            // חישוב סכומים
            player.totalPoints = player.games.reduce((s, g) => s + (g.points || 0), 0);
            player.totalRebounds = player.games.reduce((s, g) => s + (g.rebounds || 0), 0);
            player.totalAssists = player.games.reduce((s, g) => s + (g.assists || 0), 0);
            player.totalSteals = player.games.reduce((s, g) => s + (g.steals || 0), 0);
            player.totalBlocks = player.games.reduce((s, g) => s + (g.blocks || 0), 0);
            player.totalTurnovers = player.games.reduce((s, g) => s + (g.turnovers || 0), 0);
            player.totalFouls = player.games.reduce((s, g) => s + (g.fouls || 0), 0);
            player.totalFoulsDrawn = player.games.reduce((s, g) => s + (g.foulsOn || 0), 0);
            player.totalEfficiency = player.games.reduce((s, g) => s + (g.efficiency || 0), 0);
            
            // חישוב אחוזי קליעה
            const totalFGM = player.games.reduce((s, g) => s + (g.fieldGoalsMade || 0), 0);
            const totalFGA = player.games.reduce((s, g) => s + (g.fieldGoalsAttempted || 0), 0);
            const total3PM = player.games.reduce((s, g) => s + (g.threePointsMade || 0), 0);
            const total3PA = player.games.reduce((s, g) => s + (g.threePointsAttempted || 0), 0);
            const totalFTM = player.games.reduce((s, g) => s + (g.freeThrowsMade || 0), 0);
            const totalFTA = player.games.reduce((s, g) => s + (g.freeThrowsAttempted || 0), 0);
            
            player.fgPercentage = totalFGA > 0 ? ((totalFGM/totalFGA)*100).toFixed(1) : "0.0";
            player.threePointPercentage = total3PA > 0 ? ((total3PM/total3PA)*100).toFixed(1) : "0.0";
            player.ftPercentage = totalFTA > 0 ? ((totalFTM/totalFTA)*100).toFixed(1) : "0.0";
            
            // חישוב ממוצעים
            player.avgPoints = totalGames ? (player.totalPoints / totalGames).toFixed(1) : "0.0";
            player.avgRebounds = totalGames ? (player.totalRebounds / totalGames).toFixed(1) : "0.0";
            player.avgAssists = totalGames ? (player.totalAssists / totalGames).toFixed(1) : "0.0";
            player.avgSteals = totalGames ? (player.totalSteals / totalGames).toFixed(1) : "0.0";
            player.avgBlocks = totalGames ? (player.totalBlocks / totalGames).toFixed(1) : "0.0";
            player.avgTurnovers = totalGames ? (player.totalTurnovers / totalGames).toFixed(1) : "0.0";
            player.avgFouls = totalGames ? (player.totalFouls / totalGames).toFixed(1) : "0.0";
            player.avgEfficiency = totalGames ? (player.totalEfficiency / totalGames).toFixed(1) : "0.0";

            // שמירת השחקן המעודכן
            const updateReq = store.put(player);
            updateReq.onsuccess = () => {
              updatedCount++;
              c.continue();
            };
            updateReq.onerror = () => {
              console.error('Error updating player:', player.id, updateReq.error);
              c.continue();
            };
          };
        });

        console.log(`רענון חישוב הושלם: ${processedCount} שחקנים נבדקו, ${updatedCount} עודכנו, ${skippedCount} דולגו`);
        showOk(`רענון חישוב סטטיסטיקות הושלם!<br>כל השחקנים נמחקו.<br>עכשיו שמור מחדש את כל המשחקים שלך כדי ליצור סטטיסטיקות מדויקות.`);
        
        // רענון תצוגת השחקנים אם נמצאים בה כרגע
        if (!$("view-players").classList.contains("hidden")) {
          renderPlayersTable();
        }
        
      } catch (error) {
        console.error('Error recalculating player stats:', error);
        showError('שגיאה ברענון חישוב סטטיסטיקות: ' + (error?.message || error));
      }
    }

    // ייצוא מסד נתונים מלא
    async function exportFullDatabase() {
      if(!(DB_AVAILABLE && DB)) { 
        showError("מסד נתונים אינו זמין");
        return;
      }
      
      try {
        const backup = {
          teams: [],
          players: [],
          games: [],
          version: (typeof REQUIRED_DB_VERSION !== "undefined" ? REQUIRED_DB_VERSION : 1),
          timestamp: new Date().toISOString(),
          appName: "BasketballStatsDB"
        };
        
        // Export teams
        const teamsTransaction = DB.transaction(["teams"], "readonly");
        const teamsStore = teamsTransaction.objectStore("teams");
        await new Promise(resolve => {
          const req = teamsStore.openCursor();
          req.onsuccess = e => {
            const cur = e.target.result;
            if(!cur) return resolve();
            backup.teams.push(cur.value);
            cur.continue();
          };
        });
        
        // Export players
        const playersTransaction = DB.transaction(["players"], "readonly");
        const playersStore = playersTransaction.objectStore("players");
        await new Promise(resolve => {
          const req = playersStore.openCursor();
          req.onsuccess = e => {
            const cur = e.target.result;
            if(!cur) return resolve();
            backup.players.push(cur.value);
            cur.continue();
          };
        });
        
        // Export games
        const gamesTransaction = DB.transaction(["games"], "readonly");
        const gamesStore = gamesTransaction.objectStore("games");
        await new Promise(resolve => {
          const req = gamesStore.openCursor();
          req.onsuccess = e => {
            const cur = e.target.result;
            if(!cur) return resolve();
            backup.games.push(cur.value);
            cur.continue();
          };
        });
        
        // Create download file
        const dataStr = JSON.stringify(backup, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = `basketball_db_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        window.setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }, 100);
        
        showOk(`גיבוי מסד הנתונים הסתיים: ${backup.teams.length} קבוצות, ${backup.players.length} שחקנים, ${backup.games.length} משחקים`);
      } catch(err) {
        showError(`שגיאה בגיבוי מסד הנתונים: ${err.message}`);
      }
    }
    
    // שחזור מסד נתונים מגיבוי
    async function importFullDatabase(file) {
      if(!(DB_AVAILABLE && DB)) { 
        showError("מסד נתונים אינו זמין");
        return;
      }
      
      if(!confirm("שים לב: פעולת השחזור תמחק את כל המידע הנוכחי במערכת ותחליף אותו בנתונים מהגיבוי. האם להמשיך?")) {
        return;
      }
      
      try {
        const text = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(reader.error);
          reader.readAsText(file);
        });
        
        const backup = JSON.parse(text);
        
        if(!backup || !backup.appName || backup.appName !== "BasketballStatsDB") {
          showError("קובץ הגיבוי אינו תקין או אינו מתאים למערכת זו");
          return;
        }
        
        // Clear all current data
        const clearTeams = DB.transaction(["teams"], "readwrite").objectStore("teams").clear();
        const clearPlayers = DB.transaction(["players"], "readwrite").objectStore("players").clear();
        const clearGames = DB.transaction(["games"], "readwrite").objectStore("games").clear();
        
        await new Promise(resolve => {
          clearTeams.onsuccess = clearPlayers.onsuccess = clearGames.onsuccess = () => resolve();
        });
        
        // Import teams
        const teamsTx = DB.transaction(["teams"], "readwrite");
        const teamsStore = teamsTx.objectStore("teams");
        for(const team of backup.teams) {
          await new Promise(resolve => {
            const req = teamsStore.add(team);
            req.onsuccess = () => resolve();
            req.onerror = () => resolve(); // Continue even on error
          });
        }
        
        // Import players
        const playersTx = DB.transaction(["players"], "readwrite");
        const playersStore = playersTx.objectStore("players");
        for(const player of backup.players) {
          await new Promise(resolve => {
            const req = playersStore.add(player);
            req.onsuccess = () => resolve();
            req.onerror = () => resolve(); // Continue even on error
          });
        }
        
        // Import games
        const gamesTx = DB.transaction(["games"], "readwrite");
        const gamesStore = gamesTx.objectStore("games");
        for(const game of backup.games) {
          await new Promise(resolve => {
            const req = gamesStore.add(game);
            req.onsuccess = () => resolve();
            req.onerror = () => resolve(); // Continue even on error
          });
        }
        
        // Reload indices and UI
        await loadTeamsIndex();
        await setNextGameSerialToUI();
        showOk(`שחזור מסד הנתונים הסתיים: ${backup.teams.length} קבוצות, ${backup.players.length} שחקנים, ${backup.games.length} משחקים`);
        
        // Reload current view
        const currentView = document.querySelector('#tabs .tab.active');
        if(currentView) {
          switchTab(currentView.dataset.tab);
        }
      } catch(err) {
        showError(`שגיאה בשחזור מסד הנתונים: ${err.message}`);
      }
    }

    function initFormValidation() {
      const gameCycle = $("gameCycle");
      if (gameCycle) {
        gameCycle.addEventListener("input", function() {
          // הסרת הדגשת שגיאה כאשר המשתמש מתחיל להקליד
          this.classList.remove("border-red-500", "bg-red-50");
        });
      }
    }

    // =========================
    // Views: Games / Teams agg / Players DB / Manage Teams
    // =========================
    async function getGameListWithTeamTotals(){
      const games = [];
      
      // Initialize dbAdapter if not already done
      if (window.dbAdapter && !window.dbAdapter.isDbAvailable()) {
        await window.dbAdapter.init();
      }
      
      // Get games from dbAdapter (Supabase or IndexedDB)
      const rows = await window.dbAdapter.getGames();

      const totalsByGame = new Map();
      
      // Get players from dbAdapter
      const allPlayers = await window.dbAdapter.getPlayers();
      
      // Calculate totals by game
      for (const pl of allPlayers) {
          for(const g of (pl.games||[])){
            const key = g.gameId;
            if(!totalsByGame.has(key)) totalsByGame.set(key, {});
            const byTeam = totalsByGame.get(key);
            if(!byTeam[g.team]) byTeam[g.team] = { points:0 };
            byTeam[g.team].points += g.points||0;
          }
      }

      for(const g of rows){
        games.push({
          id: g.gameSerial,
          date: g.date,
          cycle: g.cycle || null,
          teams: g.teams || [],
          totals: totalsByGame.get(g.gameSerial) || {}
        });
      }
      games.sort((a,b)=> (b.id||0)-(a.id||0));
      return games;
    }

    async function getTeamsAggregate(){
      // Initialize dbAdapter if not already done
      if (window.dbAdapter && !window.dbAdapter.isDbAvailable()) {
        await window.dbAdapter.init();
      }
      
      const agg = {};
      
      // Get all players from dbAdapter
      const allPlayers = await window.dbAdapter.getPlayers();
      
      // Calculate team aggregates
      for (const pl of allPlayers) {
          for(const g of (pl.games||[])){
            if(!agg[g.team]) agg[g.team] = { 
              games:new Set(), points:0, rebounds:0, assists:0, steals:0, blocks:0, turnovers:0, fouls:0,
              fgm:0, fga:0, tpm:0, tpa:0, ftm:0, fta:0, efficiency:0
            };
            const t = agg[g.team];
            t.games.add(g.gameId);
            t.points += g.points||0; 
            t.rebounds += g.rebounds||0; 
            t.assists += g.assists||0; 
            t.steals += g.steals||0; 
            t.blocks += g.blocks||0;
            t.turnovers += g.turnovers||0;
            t.fouls += g.fouls||0;
            t.fgm += g.fieldGoalsMade||0; 
            t.fga += g.fieldGoalsAttempted||0;
            t.tpm += g.threePointsMade||0; 
            t.tpa += g.threePointsAttempted||0;
            t.ftm += g.freeThrowsMade||0; 
            t.fta += g.freeThrowsAttempted||0;
            t.efficiency += g.efficiency||0;
          }
      }
      return Object.entries(agg).map(([team,t])=>({
        team,
        games: t.games.size,
        points: t.points, rebounds: t.rebounds, assists: t.assists, steals: t.steals, blocks: t.blocks, turnovers: t.turnovers, fouls: t.fouls,
        fgm: t.fgm, fga: t.fga, tpm: t.tpm, tpa: t.tpa, ftm: t.ftm, fta: t.fta, efficiency: t.efficiency
      })).sort((a,b)=> a.team.localeCompare(b.team,'he'));
    }

    // Render teams aggregate table with debugging
    async function renderTeamsAggregate(sortField = 'team', sortDirection = 'asc'){
      console.log('renderTeamsAggregate called with:', sortField, sortDirection);
      const tbody = $("teamsAggTbody"); 
      if(!tbody) {
        console.log('teamsAggTbody not found');
        return;
      }
      console.log('teamsAggTbody found');
      
      const q = ($("teamsSearch")?.value||'').trim().toLowerCase();
      console.log('Search query:', q);
      
      // השגת הנתונים מהמסד
      console.log('Calling getTeamsAggregate...');
      const allRows = await getTeamsAggregate();
      console.log('getTeamsAggregate returned:', allRows);
      console.log('First team data:', allRows[0]);
      console.log('All team names:', allRows.map(r => r.team));
      
      const rows = allRows.filter(r=> !q || r.team.toLowerCase().includes(q));
      console.log('Filtered rows:', rows);
      
      // מיון הנתונים
      if (sortField) {
        rows.sort((a, b) => {
          let aVal, bVal;
          
          // טיפול מיוחד בשדות שונים
          switch(sortField) {
            case 'team':
              aVal = a.team || '';
              bVal = b.team || '';
              // מיון עברית
              if (sortDirection === 'asc') {
                return aVal.localeCompare(bVal, 'he');
              } else {
                return bVal.localeCompare(aVal, 'he');
              }
              break;
            case 'shooting':
              // לצורך מיון על פי קליעה, נשתמש באחוזי קליעה משדה
              aVal = a.fga > 0 ? (a.fgm / a.fga) : 0;
              bVal = b.fga > 0 ? (b.fgm / b.fga) : 0;
              break;
            default:
              // שדות מספריים אחרים
              aVal = a[sortField] || 0;
              bVal = b[sortField] || 0;
          }
          
          // מיון מספרי רגיל
          if (sortDirection === 'asc') {
            return aVal - bVal;
          } else {
            return bVal - aVal;
          }
        });
      }
      
      // עדכון כותרות עם סמני מיון
      updateTeamsTableHeaders(sortField, sortDirection);
      
      // הצגת השורות
      tbody.innerHTML = '';
      console.log('Rendering', rows.length, 'rows');
      
      // Update teams count in header
      const teamsCountEl = document.getElementById('teamsCount');
      if (teamsCountEl) teamsCountEl.textContent = rows.length;
      
      if (rows.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td class="px-3 py-2 text-center text-gray-500" colspan="13">אין נתוני קבוצות זמינים</td>`;
        tbody.appendChild(tr);
        console.log('No rows to display');
        return;
      }
      
      const pct = (m,a)=> a? ((m/a*100).toFixed(1)+'%'):'-';
      
      // Simple Hebrew fix - only for specific known corrupted patterns
      const fixHebrewName = (name) => {
        if (!name) return name;
        
        // Check for the specific corrupted patterns we know about
        if (name.includes('×\x90.×¡.') && name.includes('×\x90×©×§×œ×•×Ÿ')) {
          return 'א.ס. אשקלון/קרית גת';
        }
        if (name.includes('×ž.×›') && name.includes('×¢×•×˜×£')) {
          return 'מ.כ עוטף דרום';
        }
        
        // If no known pattern, return original
        return name;
      };
      
      for(const r of rows){
        const tr = document.createElement('tr');
        const displayName = fixHebrewName(r.team);
        tr.innerHTML = `
          <td class="col-team">${displayName}</td>
          <td class="num">${r.games || 0}</td>
          <td class="num">${r.points || 0}</td>
          <td class="num">${r.rebounds || 0}</td>
          <td class="num">${r.assists || 0}</td>
          <td class="num">${r.steals || 0}</td>
          <td class="num">${r.blocks || 0}</td>
          <td class="num">${r.turnovers || 0}</td>
          <td class="num">${r.fouls || 0}</td>
          <td class="pct">${pct(r.fgm,r.fga)}</td>
          <td class="pct">${pct(r.tpm,r.tpa)}</td>
          <td class="pct">${pct(r.ftm,r.fta)}</td>
          <td class="num">${r.efficiency || 0}</td>`;
        tbody.appendChild(tr);
      }
      console.log('Rendered', rows.length, 'rows successfully');
      console.log('tbody innerHTML length:', tbody.innerHTML.length);
      console.log('tbody children count:', tbody.children.length);
    }

    // Update teams table headers with sort indicators
    function updateTeamsTableHeaders(sortField, sortDirection) {
      const headers = document.querySelectorAll('#view-teams .stats-table thead th[data-sort-field]');
      
      headers.forEach(header => {
        const field = header.getAttribute('data-sort-field');
        
        // Clear existing sort indicators
        header.classList.remove('sort-asc', 'sort-desc');
        
        // Add sort indicator if this is the active sort field
        if (field === sortField) {
          header.classList.add(sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
        }
        
        // Make headers clickable
        header.style.cursor = 'pointer';
        header.onclick = function() {
          const newDirection = (field === sortField && sortDirection === 'desc') ? 'asc' : 'desc';
          renderTeamsAggregate(field, newDirection);
        };
      });
    }

    // Initialize teams table sort
    function initTeamsTableSort() {
      if (document.querySelector('#view-teams .stats-table thead th')) {
        updateTeamsTableHeaders('team', 'asc');
      }
    }

    // 🔥 Guard flag to prevent race condition in renderPlayersTable
    let isRenderingPlayers = false;

    async function renderPlayersTable(sortField = null, sortDirection = 'desc'){
      // 🔥 Guard: If already rendering, skip this call
      if (isRenderingPlayers) {
        console.log('⏭️ Skipping renderPlayersTable - already in progress');
        return;
      }
      
      // 🔥 Mark that we're starting to render
      isRenderingPlayers = true;
      console.log('🎨 START renderPlayersTable');
      
      try {
        const tbody = $("playersTbody"); 
        if (!tbody) return;
        
        // Initialize dbAdapter if not already done
        if (window.dbAdapter && !window.dbAdapter.isDbAvailable()) {
          await window.dbAdapter.init();
        }
        
        const q = ($("playersSearch")?.value || "").trim().toLowerCase();
        const playersMap = new Map(); // Deduplicate by ID
        
        // Get all players from dbAdapter
        const allPlayers = await window.dbAdapter.getPlayers();
        
        if (!allPlayers || allPlayers.length === 0) { 
          tbody.innerHTML = '<tr><td colspan="13" class="text-center text-gray-500">אין שחקנים במערכת</td></tr>'; 
          return; 
        }
      
      let totalPlayers = 0;
      let playersWithGames = 0;
      let duplicateCount = 0;
      
      // Process all players
      for (const pl of allPlayers) {
          totalPlayers++;
          
          // דילוג על שחקנים ללא משחקים בלבד
          if (!pl.games || pl.games.length === 0) {
            continue;
          }
          
          playersWithGames++;
          
          // חיפוש
          const hay = [
            pl.name || '', 
            pl.team || '', 
            pl.jersey || '', 
            pl.id || ''
          ].join(' ').toLowerCase();
          
          // Apply search filter
          if (!q || hay.includes(q)) {
            // Create a unique key for deduplication (use name + jersey for proper deduplication)
            // This handles players who play for different teams (before team merging)
            const playerName = (pl.name || '').toLowerCase().trim();
            const playerJersey = (pl.jersey || '').trim();
            
            if (!playerName) {
              // Skip players without name
              continue;
            }
            
            // Use name + jersey as the deduplication key (ignore team differences)
            const dedupKey = `${playerName}|${playerJersey}`;
            
            if (!playersMap.has(dedupKey)) {
              playersMap.set(dedupKey, pl);
            } else {
              duplicateCount++;
              // If duplicate found, merge the games from both players
              const existing = playersMap.get(dedupKey);
              const existingGames = (existing.games || []).length;
              const currentGames = (pl.games || []).length;
              console.log(`Duplicate found: ${pl.name} (${pl.team}) - existing: ${existingGames} games, current: ${currentGames} games`);
              console.log(`  Existing team: ${existing.team}, Current team: ${pl.team}`);
              
              // Merge games from both players
              const mergedGames = [...(existing.games || []), ...(pl.games || [])];
              
              // Create merged player object
              const mergedPlayer = {
                ...existing,
                games: mergedGames,
                // Keep the most recent/complete data
                name: pl.name || existing.name,
                team: pl.team || existing.team,
                jersey: pl.jersey || existing.jersey
              };
              
              playersMap.set(dedupKey, mergedPlayer);
              console.log(`Merged player ${pl.name}: ${existingGames} + ${currentGames} = ${mergedGames.length} games`);
            }
          }
      }
      
      console.log(`Total players in DB: ${totalPlayers}, with games: ${playersWithGames}, duplicates found: ${duplicateCount}`);
      
      // Convert Map to array
      const rows = Array.from(playersMap.values());
      console.log(`Final display: ${rows.length} unique players after deduplication`);
      console.log(`🔍 Duplicates found and merged: ${duplicateCount}`);
      console.log(`🔍 Sample player data:`, rows[0] ? {
        name: rows[0].name,
        games: rows[0].games?.length || 0,
        totalPoints: rows[0].totalPoints,
        hasCalculatedStats: !!rows[0].totalPoints
      } : 'No players found');
      
      
      // טעינת מיפויי קבוצות להצגת שמות מתורגמים
      const teamMappings = {};
      const tTx = DB.transaction(['teams'], 'readonly');
      const tStore = tTx.objectStore('teams');
      
      await new Promise(res => {
        const req = tStore.openCursor();
        req.onsuccess = e => {
          const c = e.target.result; 
          if (!c) return res();
          const team = c.value;
          // שמירת מיפויים קנוניים ואליאסים
          if (team.name_en) teamMappings[normalizeEn(team.name_en)] = team.name_he;
          (team.aliases || []).forEach(alias => {
            teamMappings[normalizeEn(alias)] = team.name_he;
          });
          c.continue();
        };
      });
      
      // פונקציית עזר לקבלת שם קבוצה בעברית
      const getTeamHeName = (teamName) => {
        if (!teamName) return '-';
        // אם השם כבר בעברית, החזר אותו כפי שהוא
        if (/[\u0590-\u05FF]/.test(teamName)) {
          return teamName;
        }
        // אחרת, נסה למצוא מיפוי
        const normalizedName = normalizeEn(teamName);
        return teamMappings[normalizedName] || teamName; // חזרה למקור אם אין מיפוי
      };
      
      // מיון
      if (sortField) {
        rows.sort((a, b) => {
          let aVal, bVal;
          
          // טיפול מיוחד בשדות מסוימים
          switch (sortField) {
            case 'team':
              aVal = getTeamHeName(a.team || '');
              bVal = getTeamHeName(b.team || '');
              break;
            case 'games':
              aVal = (a.games || []).length;
              bVal = (b.games || []).length;
              break;
            case 'totalPoints':
            case 'totalRebounds':
            case 'totalAssists':
            case 'totalSteals':
            case 'totalBlocks':
            case 'totalTurnovers':
            case 'totalFouls':
            case 'totalFoulsDrawn':
              aVal = a[sortField] || 0;
              bVal = b[sortField] || 0;
              break;
            case 'avgPoints':
            case 'avgEfficiency':
              aVal = parseFloat(a[sortField] || '0');
              bVal = parseFloat(b[sortField] || '0');
              break;
            case 'fgPercentage':
            case 'threePointPercentage':
            case 'ftPercentage':
              aVal = parseFloat(a[sortField] || '0');
              bVal = parseFloat(b[sortField] || '0');
              break;
            default:
              aVal = a[sortField] || '';
              bVal = b[sortField] || '';
          }
          
          // השוואת מחרוזות לשדות טקסט
          if (typeof aVal === 'string' && typeof bVal === 'string') {
            if (sortDirection === 'asc') {
              return aVal.localeCompare(bVal, 'he');
            } else {
              return bVal.localeCompare(aVal, 'he');
            }
          }
          
          // השוואה מספרית
          if (sortDirection === 'asc') {
            return aVal - bVal;
          } else {
            return bVal - aVal;
          }
        });
      } else {
        // מיון ברירת מחדל לפי שם אם לא צוין מיון
        rows.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'he'));
      }
      
      // עדכון כותרות הטבלה להצגת מחווני מיון
      updateSortHeaders(sortField, sortDirection);
      
      tbody.innerHTML = '';
      
      // Update players count in header
      const playersCountEl = document.getElementById('playersCount');
      if (playersCountEl) playersCountEl.textContent = rows.length;
      
      // Hebrew display names by player ID from player_mappings
      const heNameById = new Map();
      try {
        const pmTx = DB.transaction(['player_mappings'], 'readonly');
        const pmStore = pmTx.objectStore('player_mappings');
        await new Promise(res => {
          const rq = pmStore.openCursor();
          rq.onsuccess = (e) => {
            const c = e.target.result; if(!c) return res();
            const v = c.value || {};
            const pid = v.id && String(v.id).trim();
            const heFirst = (v.first_he||'').trim();
            const heFamily = (v.family_he||'').trim();
            if (pid && (heFirst || heFamily)) {
              heNameById.set(pid, `${heFirst}${heFirst&&heFamily?' ':''}${heFamily}`.trim());
            }
            c.continue();
          };
          rq.onerror = () => res();
        });
      } catch(_e) { /* no-op */ }
    // הוספת כותרת אם אין שחקנים
      if (rows.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="17" class="px-3 py-2 text-center text-gray-500">לא נמצאו שחקנים${q ? ' עבור החיפוש' : ''}</td>`;
        tbody.appendChild(tr);
        return;
      }
      
      // הצגת השחקנים
      for (const p of rows) {
        const tr = document.createElement('tr');
        // טיפול במזהים ארוכים - קיצור והצגה בצורה נוחה יותר
        const displayId = (p.id || '').length > 20 
          ? (p.id || '').substring(0, 18) + '...'
          : p.id || '';
        
        // חישוב סטטיסטיקות מצטברות אם לא קיימות
        let totalPoints = p.totalPoints;
        let totalRebounds = p.totalRebounds;
        let totalAssists = p.totalAssists;
        let totalSteals = p.totalSteals;
        let totalBlocks = p.totalBlocks;
        let totalTurnovers = p.totalTurnovers;
        let totalFouls = p.totalFouls;
        let totalFoulsDrawn = p.totalFoulsDrawn;
        let fgPercentage = p.fgPercentage;
        let threePointPercentage = p.threePointPercentage;
        let ftPercentage = p.ftPercentage;
        let avgEfficiency = p.avgEfficiency;
        let avgPoints = p.avgPoints;
        
        // 🔥 FIX: Always recalculate stats from games to ensure accuracy
        // This fixes the issue where avgPoints was incorrect when totalPoints existed
        if (p.games && p.games.length > 0) {
          console.log(`🔍 Calculating stats for player ${p.name} with ${p.games.length} games`);
          
          // Recalculate totals from games (source of truth)
          totalPoints = p.games.reduce((s, g) => s + (g.points || 0), 0);
          totalRebounds = p.games.reduce((s, g) => s + (g.rebounds || 0), 0);
          totalAssists = p.games.reduce((s, g) => s + (g.assists || 0), 0);
          totalSteals = p.games.reduce((s, g) => s + (g.steals || 0), 0);
          totalBlocks = p.games.reduce((s, g) => s + (g.blocks || 0), 0);
          totalTurnovers = p.games.reduce((s, g) => s + (g.turnovers || 0), 0);
          totalFouls = p.games.reduce((s, g) => s + (g.fouls || 0), 0);
          totalFoulsDrawn = p.games.reduce((s, g) => s + (g.foulsOn || 0), 0);
          
          // חישוב אחוזי קליעה
          const totalFGM = p.games.reduce((s, g) => s + (g.fieldGoalsMade || 0), 0);
          const totalFGA = p.games.reduce((s, g) => s + (g.fieldGoalsAttempted || 0), 0);
          const total3PM = p.games.reduce((s, g) => s + (g.threePointsMade || 0), 0);
          const total3PA = p.games.reduce((s, g) => s + (g.threePointsAttempted || 0), 0);
          const totalFTM = p.games.reduce((s, g) => s + (g.freeThrowsMade || 0), 0);
          const totalFTA = p.games.reduce((s, g) => s + (g.freeThrowsAttempted || 0), 0);
          
          fgPercentage = totalFGA > 0 ? ((totalFGM/totalFGA)*100).toFixed(1) : "0.0";
          threePointPercentage = total3PA > 0 ? ((total3PM/total3PA)*100).toFixed(1) : "0.0";
          ftPercentage = totalFTA > 0 ? ((totalFTM/totalFTA)*100).toFixed(1) : "0.0";
          
          // 🔥 FIX: Always recalculate averages from games (ensures accuracy)
          const totalGames = p.games.length;
          avgPoints = totalGames ? (totalPoints / totalGames).toFixed(1) : "0.0";
          
          // חישוב יעילות ממוצעת
          const totalEfficiency = p.games.reduce((s, g) => s + (g.efficiency || 0), 0);
          avgEfficiency = totalGames ? (totalEfficiency / totalGames).toFixed(1) : "0.0";
          
          console.log(`✅ Calculated stats for ${p.name}: ${totalPoints} points in ${totalGames} games, avg=${avgPoints}`);
        }
          
        tr.innerHTML = `
          <td class="col-name" title="${p.id || ''}">${(heNameById && heNameById.get(p.id)) || p.name || '-'}</td>
          <td class="col-jersey">${p.jersey || '-'}</td>
          <td class="col-team">${getTeamHeName(p.team)}</td>
          <td class="col-games">${(p.games || []).length}</td>
          <td class="num points">${totalPoints || 0}</td>
          <td class="num rebounds">${totalRebounds || 0}</td>
          <td class="num assists">${totalAssists || 0}</td>
          <td class="num">${totalSteals || 0}</td>
          <td class="num">${totalBlocks || 0}</td>
          <td class="num">${totalTurnovers || 0}</td>
          <td class="num">${totalFouls || 0}</td>
          <td class="num">${totalFoulsDrawn || 0}</td>
          <td class="num pct">${fgPercentage || '0.0'}%</td>
          <td class="num pct">${threePointPercentage || '0.0'}%</td>
          <td class="num pct">${ftPercentage || '0.0'}%</td>
          <td class="num efficiency">${avgEfficiency || '0.0'}</td>
          <td class="num avg-points">${avgPoints || '0.0'}</td>`;
        tbody.appendChild(tr);
      }
      
      console.log('✅ END renderPlayersTable');
      
      } catch (error) {
        console.error('❌ Error in renderPlayersTable:', error);
      } finally {
        // 🔥 CRITICAL: Always release the flag, even if there was an error
        isRenderingPlayers = false;
      }
    }

    function updateSortHeaders(sortField, sortDirection) {
      // Define the mapping between displayed columns and data fields
      // Note: Column 0 (ID) is hidden, so we start from column 1
      const headerMap = {
        0: 'name', 
        1: 'jersey',
        2: 'team',
        3: 'games',
        4: 'totalPoints',
        5: 'totalRebounds',
        6: 'totalAssists',
        7: 'totalSteals',
        8: 'totalBlocks',
        9: 'totalTurnovers',
        10: 'totalFouls',
        11: 'totalFoulsDrawn',
        12: 'fgPercentage',
        13: 'threePointPercentage',
        14: 'ftPercentage',
        15: 'avgEfficiency',
        16: 'avgPoints'
      };
      
      const headers = document.querySelectorAll('#view-players .stats-table thead th');
      headers.forEach((header, index) => {
        const field = headerMap[index];
        
        // Clear any existing indicators
        header.textContent = header.textContent.replace(' ▲', '').replace(' ▼', '');
        
        // Add sort indicator if this is the active sort field
        if (field === sortField) {
          header.textContent += sortDirection === 'asc' ? ' ▲' : ' ▼';
        }
        
        // Make headers clickable
        header.style.cursor = 'pointer';
        header.onclick = function() {
          // Toggle direction if already sorted by this field
          const newDirection = (field === sortField && sortDirection === 'desc') ? 'asc' : 'desc';
          renderPlayersTable(field, newDirection);
        };
      });
    }

    function initPlayerTableSort() {
      if (document.querySelector('#view-players thead th')) {
        updateSortHeaders('name', 'asc'); // Default sort
      }
    }

    // Prevent multiple simultaneous calls
    let switchTabInProgress = false;
    
    async function switchTab(name){
      if (switchTabInProgress) {
        return;
      }
      
      switchTabInProgress = true;
      console.log('=== Switching to tab:', name, '===');
      
      try {
        // Update UI (synchronous part)
        document.querySelectorAll('#tabs .tab').forEach(b=>{
          b.classList.toggle('active', b.dataset.tab===name);
        });
        const VIEWS = {
          ingest: $("view-ingest"),
          games: $("view-games"), 
          teams: $("view-teams"), 
          players: $("view-players"), 
          manageTeams: $("view-manageTeams"),
          managePlayers: $("view-managePlayers"),
          gamePrep: $("view-gamePrep"),
          tools: $("view-tools")
        };
        Object.entries(VIEWS).forEach(([k,el])=> el && el.classList.toggle('hidden', k!==name));

        // Load tab data (asynchronous part)
        try {
          if (name === 'games') {
            await renderGamesTable();
            initGamesTableSort();
            initGamesFilterListeners();
          } else if (name === 'teams') {
            await renderTeamsAggregate('team', 'asc');
            initTeamsTableSort();
          } else if (name === 'players') {
            await renderPlayersTable('name', 'asc');
            initPlayerTableSort();
          } else if (name === 'manageTeams') {
            await listTeams();
          } else if (name === 'managePlayers') {
            await listPlayerMappings();
          } else if (name === 'gamePrep') {
            console.log('🔍 === DEBUG: Switching to gamePrep tab ===');
            initGamePrep();
            console.log('🔍 typeof window.displayAdvancedAnalysis:', typeof window.displayAdvancedAnalysis);
            console.log('✅ Game preparation tab initialized - advanced analysis will show when teams are analyzed');
            
            // Update pre-game analysis button state
            if (typeof window.updatePreGameAnalysisButton === 'function') {
              window.updatePreGameAnalysisButton();
            }
          }
        } catch (error) {
          console.error(`❌ Error loading tab ${name}:`, error);
        }
      } finally {
        // Reset the flag after a short delay to allow for async operations
        setTimeout(() => {
          switchTabInProgress = false;
        }, 100);
      }
    }

    
    $("teamsSearch")?.addEventListener('input', () => {
      // שמירה על המיון האחרון בעת חיפוש
      const currentSortField = 
        document.querySelector('#view-teams thead th[textContent*="▲"], #view-teams thead th[textContent*="▼"]')?.getAttribute('data-sort-field') || 'team';
      const currentSortDirection = 
        document.querySelector('#view-teams thead th[textContent*="▲"]') ? 'asc' : 'desc';
      
      renderTeamsAggregate(currentSortField, currentSortDirection);
    });

    // ===== Undo Helpers =====
    window.__undoState = null;
    function showUndoBar(message, onUndo){
      const bar = document.getElementById('undoBar');
      const msg = document.getElementById('undoMsg');
      const btn = document.getElementById('undoBtn');
      if(!bar || !msg || !btn) return;
      msg.textContent = message || 'בוצע.';
      bar.style.display = 'block';
      const deadline = Date.now() + 10000; // 10s
      window.__undoState = { onUndo, deadline, t: setTimeout(hideUndoBar, 10000) };
      btn.onclick = async ()=>{
        const st = window.__undoState;
        hideUndoBar();
        if(st && st.onUndo && Date.now() <= st.deadline){
          try{ await st.onUndo(); showOk && showOk('הפעולה בוטלה'); }catch(e){ console.error(e); showError && showError('ביטול נכשל'); }
        }else{
          showError && showError('זמן הביטול חלף');
        }
      };
    }
    function hideUndoBar(){
      const bar = document.getElementById('undoBar');
      if(bar) bar.style.display = 'none';
      if(window.__undoState?.t) clearTimeout(window.__undoState.t);
      window.__undoState = null;
    }
    
    // 🔥 Guard flag to prevent race condition in renderGamesTable
    let isRenderingGames = false;
    
    // Store current sort state for games table
    let currentGamesSortField = 'gameId';
    let currentGamesSortDirection = 'desc';
    
    async function renderGamesTable(sortField = null, sortDirection = null){
      // Use provided sort params or fall back to current state
      if (sortField === null) sortField = currentGamesSortField;
      if (sortDirection === null) sortDirection = currentGamesSortDirection;
      
      // Update current sort state
      currentGamesSortField = sortField;
      currentGamesSortDirection = sortDirection;
      // 🔥 Guard: If already rendering, skip this call
      if (isRenderingGames) {
        console.log('⏭️ Skipping renderGamesTable - already in progress');
        return;
      }
      
      // 🔥 Mark that we're starting to render
      isRenderingGames = true;
      console.log('🎨 START renderGamesTable');
      
      // Check auth state for debugging
      const isAdmin = window.authModule && window.authModule.isAuthenticated();
      console.log('🔐 renderGamesTable - isAdmin =', isAdmin, 'authModule =', !!window.authModule);
      
      try {
      // מחיקה בלחיצה על כפתור "מחק" בתוך הטבלה
      const _tbody = document.getElementById("gamesTbody");
      if(_tbody){
        _tbody.onclick = async (ev)=>{
          // טיפול בלחיצה על כפתור "טען מחדש"
          const reloadBtn = ev.target.closest("button[data-reload]");
          if(reloadBtn) {
            const id = reloadBtn.getAttribute("data-reload");
            if(!id) return;
            await reloadGameFromOriginalJson(id);
            return;
          }
          
          // טיפול בלחיצה על כפתור "מחק"
          const delBtn = ev.target.closest("button[data-del]");
          if(!delBtn) return;
          const id = delBtn.getAttribute("data-del");
          if(!id) return;
          if(confirm(`למחוק את המשחק ${id}?`)){
            await deleteGameById(id);
            await renderGamesTable(sortField, sortDirection);
            if(typeof renderTeamsAggregate === "function"){ await renderTeamsAggregate(); }
          }
        };
      }

      const tbody = $("gamesTbody"); if(!tbody) return;
      
      // Get filter values
      const searchQuery = ($("gamesSearch")?.value || "").trim().toLowerCase();
      const cycleFilter = $("cycleFilter")?.value || "";
      const teamFilter = $("teamFilter")?.value || "";

      const games = await getGameListWithTeamTotals();
      
      // Populate filter dropdowns with unique values
      populateGamesFilters(games);
      
      // Check admin status ONCE before loop (not inside loop)
      const isAdmin = window.authModule && window.authModule.isAuthenticated();
      console.log('🔐 isAdmin for all rows =', isAdmin);

      // Apply filters
      const filtered = games.filter(g=>{
        // Cycle filter
        if (cycleFilter && String(g.cycle) !== cycleFilter) {
          return false;
        }
        
        // Team filter
        if (teamFilter && !(g.teams || []).includes(teamFilter)) {
          return false;
        }
        
        // Search query
        if (searchQuery) {
          const hay = [
            String(g.id||""),
            String(g.cycle||""),
            String(g.date||""),
            (g.teams||[]).join(" ")
          ].join(" ").toLowerCase();
          if (!hay.includes(searchQuery)) {
            return false;
          }
        }
        
        return true;
      });

      // Sort the filtered games
      filtered.sort((a, b) => {
        let valA, valB;
        
        switch(sortField) {
          case 'gameId':
            valA = Number(a.id) || 0;
            valB = Number(b.id) || 0;
            break;
          case 'cycle':
            valA = Number(a.cycle) || 0;
            valB = Number(b.cycle) || 0;
            break;
          case 'date':
            valA = a.date || '';
            valB = b.date || '';
            break;
          case 'game':
            valA = (a.teams || []).join(' ');
            valB = (b.teams || []).join(' ');
            break;
          case 'result':
            const homeA = a.teams?.[0] || '';
            const awayA = a.teams?.[1] || '';
            const totalsA = a.totals || {};
            const homePtsA = (totalsA[homeA]?.points ?? -1);
            const awayPtsA = (totalsA[awayA]?.points ?? -1);
            valA = homePtsA + awayPtsA;
            
            const homeB = b.teams?.[0] || '';
            const awayB = b.teams?.[1] || '';
            const totalsB = b.totals || {};
            const homePtsB = (totalsB[homeB]?.points ?? -1);
            const awayPtsB = (totalsB[awayB]?.points ?? -1);
            valB = homePtsB + awayPtsB;
            break;
          default:
            return 0;
        }
        
        if (typeof valA === 'string') {
          return sortDirection === 'asc' 
            ? valA.localeCompare(valB, 'he') 
            : valB.localeCompare(valA, 'he');
        } else {
          return sortDirection === 'asc' 
            ? valA - valB 
            : valB - valA;
        }
      });

      tbody.innerHTML = "";
      if(!filtered.length){
        const tr = document.createElement("tr");
        tr.innerHTML = `<td class="px-3 py-2 text-center text-gray-500" colspan="6">אין משחקים להצגה</td>`;
        tbody.appendChild(tr);
        return;
      }

      for(const g of filtered){
        const home = g.teams?.[0] || "";
        const away = g.teams?.[1] || "";
        const totals = g.totals || {};
        const homePts = (totals[home]?.points ?? null);
        const awayPts = (totals[away]?.points ?? null);

        const result = (homePts===null || awayPts===null) ? "–" : `${awayPts}:${homePts}`;

        // isAdmin is now checked once before the loop (line 1776)
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td class="px-3 py-2 mono">${g.id}</td>
          <td class="px-3 py-2">${g.cycle ?? "-"}</td>
          <td class="px-3 py-2">${g.date || "-"}</td>
          <td class="px-3 py-2">${home || "-"} - ${away || "-"}</td>
          <td class="px-3 py-2 font-semibold">${result}</td>
          <td class="px-3 py-2">
            ${isAdmin ? `
              <button class="text-blue-700 hover:underline mr-2" data-reload="${g.id}">טען מחדש</button>
              <button class="text-red-700 hover:underline" data-del="${g.id}">מחק</button>
            ` : ''}
          </td>
        `;
        tbody.appendChild(tr);
      }
      
      // Update table headers with sort indicators
      updateGamesTableHeaders(sortField, sortDirection);
      
      console.log('✅ END renderGamesTable');
      
      } catch (error) {
        console.error('❌ Error in renderGamesTable:', error);
      } finally {
        // 🔥 CRITICAL: Always release the flag, even if there was an error
        isRenderingGames = false;
      }
    }

    // Populate games filter dropdowns with unique values
    function populateGamesFilters(games) {
      const cycleSelect = $("cycleFilter");
      const teamSelect = $("teamFilter");
      
      if (!cycleSelect || !teamSelect) return;
      
      // Get current selections
      const currentCycle = cycleSelect.value;
      const currentTeam = teamSelect.value;
      
      // Extract unique cycles (sorted numerically)
      const cycles = [...new Set(games.map(g => g.cycle).filter(c => c != null))]
        .sort((a, b) => Number(a) - Number(b));
      
      // Extract unique teams (sorted alphabetically in Hebrew)
      const teamsSet = new Set();
      games.forEach(g => {
        (g.teams || []).forEach(t => {
          if (t) teamsSet.add(t);
        });
      });
      const teams = [...teamsSet].sort((a, b) => a.localeCompare(b, 'he'));
      
      // Populate cycle dropdown
      cycleSelect.innerHTML = '<option value="">הכל</option>';
      cycles.forEach(cycle => {
        const option = document.createElement('option');
        option.value = cycle;
        option.textContent = `מחזור ${cycle}`;
        if (String(cycle) === currentCycle) option.selected = true;
        cycleSelect.appendChild(option);
      });
      
      // Populate team dropdown
      teamSelect.innerHTML = '<option value="">הכל</option>';
      teams.forEach(team => {
        const option = document.createElement('option');
        option.value = team;
        option.textContent = team;
        if (team === currentTeam) option.selected = true;
        teamSelect.appendChild(option);
      });
    }

    // Update games table headers with sort indicators
    function updateGamesTableHeaders(sortField, sortDirection) {
      const headers = document.querySelectorAll('#view-games .stats-table thead th[data-sort-field]');
      
      headers.forEach(header => {
        const field = header.getAttribute('data-sort-field');
        
        // Clear existing sort indicators
        header.classList.remove('sort-asc', 'sort-desc');
        
        // Add sort indicator if this is the active sort field
        if (field === sortField) {
          header.classList.add(sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
        }
        
        // Make headers clickable
        header.style.cursor = 'pointer';
        header.onclick = function() {
          const newDirection = (field === sortField && sortDirection === 'desc') ? 'asc' : 'desc';
          renderGamesTable(field, newDirection);
        };
      });
    }

    // Initialize games table sort on page load
    function initGamesTableSort() {
      updateGamesTableHeaders('gameId', 'desc');
    }
    
    // Initialize games filter listeners (call only once)
    let gamesFiltersInitialized = false;
    function initGamesFilterListeners() {
      if (gamesFiltersInitialized) return;
      
      const cycleFilter = $("cycleFilter");
      const teamFilter = $("teamFilter");
      const searchInput = $("gamesSearch");
      const searchBtn = $("searchBtn");
      const clearBtn = $("clearFiltersBtn");
      
      console.log('🔧 Initializing games filter listeners...');
      console.log('Elements:', { cycleFilter: !!cycleFilter, teamFilter: !!teamFilter, searchInput: !!searchInput, searchBtn: !!searchBtn, clearBtn: !!clearBtn });
      
      // Immediate filtering on dropdown change
      if (cycleFilter) {
        cycleFilter.addEventListener('change', () => {
          console.log('🔄 Cycle filter changed to:', cycleFilter.value);
          renderGamesTable();
        });
      }
      
      if (teamFilter) {
        teamFilter.addEventListener('change', () => {
          console.log('🔄 Team filter changed to:', teamFilter.value);
          renderGamesTable();
        });
      }
      
      // Search only when clicking search button or pressing Enter
      if (searchInput && searchBtn) {
        const doSearch = () => {
          console.log('🔍 Search triggered with query:', searchInput.value);
          renderGamesTable();
        };
        
        searchBtn.addEventListener('click', doSearch);
        
        searchInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            doSearch();
          }
        });
      }
      
      // Clear all filters
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          console.log('🧹 Clearing all filters');
          if (cycleFilter) cycleFilter.value = "";
          if (teamFilter) teamFilter.value = "";
          if (searchInput) searchInput.value = "";
          renderGamesTable();
        });
      }
      
      gamesFiltersInitialized = true;
      console.log('✅ Games filter listeners initialized');
    }

    // טעינה מחדש של משחק מה-JSON המקורי
    async function reloadGameFromOriginalJson(gameId) {
      try {
        // Wait for DB to be ready
        if (typeof window.ensureDbReady === 'function') {
          await window.ensureDbReady();
        }

        if (!window.dbAdapter || typeof window.dbAdapter.getGame !== 'function') {
          showError('מסד הנתונים לא זמין');
          return;
        }

        // קבלת המשחק מ-dbAdapter (עובד עם Supabase ו-IndexedDB)
        console.log('📡 Loading game', gameId, 'from', window.dbAdapter.isSupabase() ? 'Supabase' : 'IndexedDB');
        const game = await window.dbAdapter.getGame(parseInt(gameId));

        if (!game) {
          showError(`משחק ${gameId} לא נמצא`);
          return;
        }

        if (!game.originalJson) {
          showError('לא נמצא JSON מקורי למשחק זה');
          return;
        }

        // טעינת ה-JSON המקורי לתיבת הטקסט
        const jsonTa = $("jsonTa");
        if (jsonTa) {
          jsonTa.value = game.originalJson;
        }
        
        // הגדרת מצב עדכון - שמירת ה-ID המקורי
        $("updateModeGameId").value = String(gameId);
        $("gameId").value = String(gameId);
        
        // מילוי מראש של שדות נוספים
        if (game.date) {
          $("gameDate").value = game.date;
        }
        if (game.cycle) {
          $("gameCycle").value = game.cycle;
        }
        
        // שינוי טקסט הכפתור לאינדיקציה ויזואלית
        const saveBtn = $("saveToDbBtn");
        if (saveBtn) {
          saveBtn.textContent = "עדכן משחק";
          saveBtn.classList.add("update-mode");
        }
        
        // מעבר לטאב ייבוא וניתוח
        switchTab('ingest');
        
        console.log('✅ Game', gameId, 'loaded successfully');
        showOk(`JSON מקורי של משחק ${gameId} נטען! לחץ על "פענח" כדי לעבד מחדש. המשחק יעודכן (לא יווצר משחק חדש).`);

      } catch (error) {
        console.error('❌ Error reloading game:', error);
        showError('שגיאה בטעינת המשחק: ' + (error?.message || error));
      }
    }

    async function deleteGameById(gameId){
      try {
        // Wait for DB to be ready
        if (typeof window.ensureDbReady === 'function') {
          await window.ensureDbReady();
        }

        if (!window.dbAdapter) {
          showError && showError('מסד הנתונים לא זמין');
          return;
        }

        // גיבוי המשחק והשחקנים לפני מחיקה
        let backupGame = null;
        let backupPlayers = [];

        try {
          backupGame = await window.dbAdapter.getGame(Number(gameId));
        } catch(e) { 
          console.error('Error getting game for backup:', e);
          backupGame = null; 
        }

        try {
          const allPlayers = await window.dbAdapter.getPlayers();
          if (allPlayers && allPlayers.length > 0) {
            backupPlayers = allPlayers.filter(player => {
              const games = Array.isArray(player.games) ? player.games : [];
              return games.some(g => String(g.gameId) === String(gameId));
            });
          }
        } catch(e) {
          console.error('Error getting players for backup:', e);
        }

        // מחיקה ממסד דרך dbAdapter
        console.log('🗑️ Deleting game', gameId, 'via dbAdapter');
        await window.dbAdapter.deleteGame(Number(gameId));
        
        console.log('✅ Game deleted successfully');
      } catch(e) {
        console.error('❌ Delete game error:', e);
        showError && showError('מחיקת המשחק נכשלה: ' + (e?.message || e));
        return;
      }

      try{
        await new Promise((resolve)=>{
          const tx = DB.transaction(['players'], 'readwrite');
          const store = tx.objectStore('players');
          const req = store.openCursor();
          req.onsuccess = (ev)=>{
            const cur = ev.target.result;
            if(cur){
              const v = cur.value||{};
              const games = Array.isArray(v.games) ? v.games : [];
              const before = games.length;
              const filtered = games.filter(g => String(g.gameId) !== String(gameId));
              if(filtered.length !== before){
                v.games = filtered;
                // עדכון סיכומים לשחקן
                const totalGames = v.games.length || 0;
                v.totalPoints = v.games.reduce((s,g)=>s+(g.points||0),0);
                v.totalRebounds = v.games.reduce((s,g)=>s+(g.rebounds||0),0);
                v.totalAssists = v.games.reduce((s,g)=>s+(g.assists||0),0);
                v.avgPoints = totalGames ? (v.totalPoints/totalGames).toFixed(1) : "0.0";
                v.avgRebounds = totalGames ? (v.totalRebounds/totalGames).toFixed(1) : "0.0";
                v.avgAssists = totalGames ? (v.totalAssists/totalGames).toFixed(1) : "0.0";
                cur.update(v);
              }
              cur.continue();
            }else{
              resolve();
            }
          };
          req.onerror = ()=>resolve();
        });
      }catch(e){}

      showOk && showOk('המשחק נמחק בהצלחה');

      // הצעת Undo ל-10 שניות
      showUndoBar && showUndoBar('המשחק נמחק. לבטל?', async ()=>{
        // שחזור משחק
        if(backupGame){
          await new Promise((resolve, reject)=>{
            const tx = DB.transaction(['games'], 'readwrite');
            const store = tx.objectStore('games');
            const req = store.put(backupGame);
            req.onsuccess = ()=>resolve();
            req.onerror = ()=>reject(req.error);
          });
        }
        // שחזור שחקנים
        if(backupPlayers && backupPlayers.length){
          await new Promise((resolve)=>{
            const tx = DB.transaction(['players'], 'readwrite');
            const store = tx.objectStore('players');
            let i = 0;
            const next = ()=>{
              if(i>=backupPlayers.length){ resolve(); return; }
              const rec = backupPlayers[i++];
              const req = store.put(rec);
              req.onsuccess = next;
              req.onerror = next;
            };
            next();
          });
        }
        await renderGamesTable();
        if(typeof renderTeamsAggregate === "function"){ await renderTeamsAggregate(); }
      });
    }

    function showOk(msg){ $("alerts").innerHTML = `<div class="p-3 rounded-lg bg-green-100 text-green-800 mb-3 shadow-sm">${msg}</div>`; }
    function showError(msg){ $("alerts").innerHTML = `<div class="p-3 rounded-lg bg-red-100 text-red-800 mb-3 shadow-sm">${msg}</div>`; }

    // Convert Hebrew text from JSON encoding issues - disabled to avoid breaking the app
    function fixHebrewText(text) {
      return text; // Just return original text for now
    }


    // New player identity system save function
    async function savePlayersWithNewSystem(){
      console.log('=== savePlayersWithNewSystem called ===');
      console.log('PLAYERS length:', PLAYERS?.length);
      console.log('DB_AVAILABLE:', DB_AVAILABLE);
      console.log('DB exists:', !!DB);
      
      if(!(DB_AVAILABLE && DB) || !Array.isArray(PLAYERS) || !PLAYERS.length) {
        console.log('❌ DB not available or no players to save');
        return;
      }
      
      console.log('✅ Starting to save players with new system...');
      
      for (const p of PLAYERS) {
        try {
          console.log('--- Processing player:', p.name, 'jersey:', p.jersey, 'team:', p.team);
          console.log('🔍 Player data:', p);
          
          const teamHe = p.team || "";
          const teamEntry = TEAMMAP && teamHe ? TEAMMAP[teamHe] : null;
          const teamEn = (teamEntry && (teamEntry.name_en || teamEntry.nameInternational || teamHe)) || teamHe;
          const jersey = (p.jersey || "").trim();
          
          console.log('Team resolved:', { teamHe, teamEn, teamEntry });
          
          // Create player data row for identity resolution
          // Use the same splitName function that's defined locally in saveToDatabase
          function splitName(nameStr) {
            const name = String(nameStr||"").trim();
            if(!name) return {first_en:"", family_en:"", first_he:"", family_he:""};
            const parts = name.split(/\s+/);
            if(parts.length === 1) {
              // לא ברור — נשים כ-first בלבד
              const guessLangIsEn = (str) => /^[A-Za-z0-9\s\-\#]+$/.test(String(str||"").trim());
              return guessLangIsEn(name) ? 
                { first_en: parts[0], family_en: "", first_he:"", family_he:"" } :
                { first_en: "", family_en: "", first_he: parts[0], family_he:"" };
            }
            const first = parts[0]; 
            const family = parts.slice(1).join(" ");
            const guessLangIsEn = (str) => /^[A-Za-z0-9\s\-\#]+$/.test(String(str||"").trim());
            return guessLangIsEn(name) ? 
              { first_en: first, family_en: family, first_he:"", family_he:"" } :
              { first_en: "", family_en: "", first_he: first, family_he: family };
          }
          
          const playerRow = {
            firstName: p.name ? splitName(p.name).first_he : "",
            familyName: p.name ? splitName(p.name).family_he : "",
            internationalFirstName: p.name ? splitName(p.name).first_en : "",
            internationalFamilyName: p.name ? splitName(p.name).family_en : "",
            scoreboardName: p.name || "",
            shirtNumber: jersey,
            team: teamEn
          };
          
              // Resolve player identity using new system
              console.log('Calling resolvePlayerId with:', playerRow);
              const playerId = await resolvePlayerId(DB, playerRow);
              console.log('✅ Resolved player ID:', playerId, 'for player:', playerRow);
              
              // Check for potential transfer
              await detectAndHandleTransfer(playerId, teamEntry?.team_id || teamEn, $("gameCycle").value || "2024-25");
          
          // Save appearance record
          const appearanceData = {
            playerId: playerId,
            seasonId: $("gameCycle").value || "2024-25", // Use current season
            teamId: teamEntry?.team_id || teamEn,
            shirtNumber: jersey,
            fromDate: Date.now(),
            toDate: null // Active appearance
          };
          
          console.log('Saving appearance:', appearanceData);
          
          const appearanceTx = DB.transaction(["appearances"], "readwrite");
          const appearanceStore = appearanceTx.objectStore("appearances");
          await new Promise((resolve, reject) => {
            const req = appearanceStore.add(appearanceData);
            req.onsuccess = () => {
              console.log('✅ Appearance saved successfully');
              resolve();
            };
            req.onerror = () => {
              console.log('❌ Error saving appearance:', req.error);
              reject(req.error);
            };
          });
          
          // Save player stats
          const statsData = {
            playerId: playerId,
            gameId: $("gameId").value || "unknown",
            teamId: teamEntry?.team_id || teamEn,
            seasonId: $("gameCycle").value || "2024-25",
            metrics: {
              points: p.points || 0,
              rebounds: p.rebounds || 0,
              assists: p.assists || 0,
              steals: p.steals || 0,
              blocks: p.blocks || 0,
              turnovers: p.turnovers || 0,
              fouls: p.fouls || 0,
              fieldGoalsMade: p.fieldGoalsMade || 0,
              fieldGoalsAttempted: p.fieldGoalsAttempted || 0,
              threePointsMade: p.threePointsMade || 0,
              threePointsAttempted: p.threePointsAttempted || 0,
              freeThrowsMade: p.freeThrowsMade || 0,
              freeThrowsAttempted: p.freeThrowsAttempted || 0,
              minutes: p.minutes || "0:00",
              plusMinus: p.plusMinus || 0
            }
          };
          
          console.log('🔍 Saving stats data:', statsData);
          
          const statsTx = DB.transaction(["player_stats"], "readwrite");
          const statsStore = statsTx.objectStore("player_stats");
          await new Promise((resolve, reject) => {
            const req = statsStore.add(statsData);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
          });
          
        } catch(e) {
          console.log("Error saving player with new system:", e);
        }
      }
    }

    // Function to detect and handle player transfers
    async function detectAndHandleTransfer(playerId, newTeamId, seasonId) {
      console.log('=== detectAndHandleTransfer called ===');
      console.log('Player ID:', playerId, 'New Team:', newTeamId, 'Season:', seasonId);
      
      if (!(DB_AVAILABLE && DB)) {
        console.log('❌ DB not available for transfer detection');
        return;
      }
      
      try {
        // Get current open appearance for this player in this season
        const appearanceTx = DB.transaction(["appearances"], "readonly");
        const appearanceStore = appearanceTx.objectStore("appearances");
        const playerIndex = appearanceStore.index("by_player_season");
        const req = playerIndex.getAll([playerId, seasonId]);
        
        await new Promise((resolve) => {
          req.onsuccess = async () => {
            const appearances = req.result;
            console.log('Found appearances for player:', appearances.length);
            
            // Find the current open appearance (toDate is null)
            const openAppearance = appearances.find(app => app.toDate === null);
            
            if (openAppearance) {
              console.log('Open appearance found:', openAppearance);
              
              // Check if player is moving to a different team
              if (openAppearance.teamId !== newTeamId) {
                console.log('🚨 Transfer detected!');
                console.log('From team:', openAppearance.teamId, 'To team:', newTeamId);
                
                // Create transfer event
                await createTransferEvent(playerId, openAppearance.teamId, newTeamId, seasonId);
                
                // Close previous appearance
                await closeAppearance(openAppearance.appearanceId);
                
                console.log('✅ Transfer processed successfully');
              } else {
                console.log('✅ Player staying in same team, no transfer needed');
              }
            } else {
              console.log('No open appearance found, this is a new player or new season');
            }
            
            resolve();
          };
          req.onerror = () => {
            console.log('❌ Error getting appearances:', req.error);
            resolve();
          };
        });
        
      } catch (e) {
        console.log('❌ Error in detectAndHandleTransfer:', e);
      }
    }

    // Function to create a transfer event
    async function createTransferEvent(playerId, fromTeamId, toTeamId, seasonId) {
      console.log('Creating transfer event...');
      
      const transferData = {
        playerId: playerId,
        fromTeamId: fromTeamId,
        toTeamId: toTeamId,
        seasonId: seasonId,
        effectiveDate: Date.now(),
        discoveredOnDate: Date.now(),
        source_gameId: $("gameId").value || "unknown",
        is_inferred: true,
        confidence: 0.8, // Default confidence for auto-detected transfers
        status: 'pending', // pending|confirmed|dismissed
        notes: 'Auto-detected transfer'
      };
      
      const transferTx = DB.transaction(["transfer_events"], "readwrite");
      const transferStore = transferTx.objectStore("transfer_events");
      
      await new Promise((resolve, reject) => {
        const req = transferStore.add(transferData);
        req.onsuccess = () => {
          console.log('✅ Transfer event created:', req.result);
          resolve();
        };
        req.onerror = () => {
          console.log('❌ Error creating transfer event:', req.error);
          reject(req.error);
        };
      });
    }

    // Function to close an appearance
    async function closeAppearance(appearanceId) {
      console.log('Closing appearance:', appearanceId);
      
      const appearanceTx = DB.transaction(["appearances"], "readwrite");
      const appearanceStore = appearanceTx.objectStore("appearances");
      
      // Get the current appearance
      const getReq = appearanceStore.get(appearanceId);
      await new Promise((resolve) => {
        getReq.onsuccess = () => {
          const appearance = getReq.result;
          if (appearance) {
            // Close the appearance (set toDate to current date)
            appearance.toDate = Date.now();
            
            // Update the appearance
            const updateReq = appearanceStore.put(appearance);
            updateReq.onsuccess = () => {
              console.log('✅ Appearance closed successfully');
              resolve();
            };
            updateReq.onerror = () => {
              console.log('❌ Error closing appearance:', updateReq.error);
              resolve();
            };
          } else {
            console.log('❌ Appearance not found');
            resolve();
          }
        };
        getReq.onerror = () => {
          console.log('❌ Error getting appearance:', getReq.error);
          resolve();
        };
      });
    }

    async function parseNow(){
      console.log('=== parseNow called ===');
      $("alerts").innerHTML=""; $("mappingWarn").classList.add('hidden');
      
      // שמירת ערכים קיימים במקרה של מצב עדכון
      const isUpdateMode = $("updateModeGameId").value;
      const savedDate = isUpdateMode ? $("gameDate").value : null;
      const savedCycle = isUpdateMode ? $("gameCycle").value : null;
      const savedGameId = isUpdateMode ? $("gameId").value : null;
      
      console.log('🔍 Update mode check:', { isUpdateMode, savedDate, savedCycle, savedGameId });
      
      try{
        RAW=JSON.parse($("jsonTa").value||"{}");
        console.log('RAW data parsed, calling extractPlayers...');
        const {rows, teamMap, missing}=await extractPlayers(RAW);
        PLAYERS=rows; TEAMMAP=teamMap;
        console.log('extractPlayers completed, PLAYERS.length:', PLAYERS.length);
        
        // Store team statistics data in IndexedDB - teams are stored in extractPlayers
        
        // Save players to database automatically
        if (PLAYERS.length > 0) {
          console.log('=== About to save players ===');
          console.log('PLAYERS.length:', PLAYERS.length);
          
          await saveToDatabase();
          console.log('✅ saveToDatabase completed');
          
          // Also save with new player identity system
          console.log('About to call savePlayersWithNewSystem...');
          await savePlayersWithNewSystem();
          console.log('✅ savePlayersWithNewSystem completed');
        }
        
        // במצב עדכון - שחזור הערכים השמורים. במצב חדש - הגדרת ערכים חדשים
        if (isUpdateMode) {
          console.log('✅ Restoring saved values for update mode');
          if (savedGameId) $("gameId").value = savedGameId;
          if (savedDate) $("gameDate").value = savedDate;
          if (savedCycle) $("gameCycle").value = savedCycle;
        } else {
          console.log('✅ Setting new values for new game');
          $("gameId").value = String(await nextGameSerial());
          $("gameDate").value=(new Date()).toISOString().slice(0,10);
        }
        showOk(`נותח בהצלחה: ${Object.keys(TEAMMAP).length} קבוצה/ות, ${PLAYERS.length} שחקנים`);
        
        // Advanced analysis will be available in Game Preparation tab
        console.log('🔍 === DEBUG: After parsing, advanced analysis available ===');
        console.log('🔍 typeof window.displayAdvancedAnalysis:', typeof window.displayAdvancedAnalysis);
        console.log('✅ Advanced analysis is now available in Game Preparation tab');
        
        if(missing.length){
          $("mappingWarn").textContent = `לשמות הקבוצות הבאים אין מיפוי לעברית: ${missing.join(' | ')}. הוסף מיפוי בלחיצה על "הוסף מיפוי".`;
          $("mappingWarn").classList.remove('hidden');
        }
        render();
      }catch(e){
        showError("JSON לא תקין: "+(e?.message||e));
      }
    }

    // =========================
    // Game Preparation Functions
    // =========================
    
    // Initialize game preparation tab
    async function initGamePrep() {
      console.log('Initializing game preparation tab...');
      
      // Load teams into select dropdowns
      await loadTeamsForGamePrep();
      
      // Set up event listeners
      setupGamePrepEventListeners();
    }
    
    // Load teams into the select dropdowns
    async function loadTeamsForGamePrep() {
      const homeSelect = $("homeTeamSelect");
      const awaySelect = $("awayTeamSelect");
      
      if (!homeSelect || !awaySelect) return;
      
      // Clear existing options (except first option)
      homeSelect.innerHTML = '<option value="">בחר קבוצת בית...</option>';
      awaySelect.innerHTML = '<option value="">בחר קבוצת חוץ...</option>';
      
      // Initialize dbAdapter if not already done
      if (window.dbAdapter && !window.dbAdapter.isDbAvailable()) {
        await window.dbAdapter.init();
      }
      
      try {
        // Get teams from dbAdapter
        const allTeams = await window.dbAdapter.getTeams();
        
        if (!allTeams || allTeams.length === 0) {
          console.log('No teams found for game prep');
          return;
        }
        
        // Collect all teams in a Map to avoid duplicates
        const teamsMap = new Map();
        
        for (const team of allTeams) {
          const teamName = team.name_he || team.name_en || 'Unknown Team';
          
          // Use team_id as key to avoid duplicates
          if (!teamsMap.has(team.team_id)) {
            teamsMap.set(team.team_id, {
              id: team.team_id,
              name: teamName
            });
          }
        }
        
        // Convert Map to array and sort alphabetically by Hebrew name
        const sortedTeams = Array.from(teamsMap.values()).sort((a, b) => {
          return a.name.localeCompare(b.name, 'he');
        });
        
        // Add sorted teams to both dropdowns
        sortedTeams.forEach(team => {
          const homeOption = document.createElement('option');
          homeOption.value = team.id;
          homeOption.textContent = team.name;
          homeSelect.appendChild(homeOption);
          
          const awayOption = document.createElement('option');
          awayOption.value = team.id;
          awayOption.textContent = team.name;
          awaySelect.appendChild(awayOption);
        });
        
        console.log(`Teams loaded for game preparation: ${sortedTeams.length} teams (sorted alphabetically)`);
      } catch (error) {
        console.error('Error loading teams for game prep:', error);
      }
    }
    
    // Set up event listeners for game preparation
    function setupGamePrepEventListeners() {
      const homeSelect = $("homeTeamSelect");
      const awaySelect = $("awayTeamSelect");
      const analyzeBtn = $("analyzeGame");
      
      if (!homeSelect || !awaySelect || !analyzeBtn) return;
      
      // Update team options to prevent selecting the same team twice
      async function updateTeamOptions() {
        const homeSelected = homeSelect.value;
        const awaySelected = awaySelect.value;
        
        // Update away team options (remove home team from away options)
        await updateSelectOptions(awaySelect, homeSelected, 'בחר קבוצת חוץ...');
        
        // Update home team options (remove away team from home options)
        await updateSelectOptions(homeSelect, awaySelected, 'בחר קבוצת בית...');
      }
      
      // Helper function to update select options
      async function updateSelectOptions(selectElement, excludeTeamId, defaultText) {
        const currentValue = selectElement.value;
        
        // Clear all options except the first one
        selectElement.innerHTML = `<option value="">${defaultText}</option>`;
        
        // Initialize dbAdapter if not already done
        if (window.dbAdapter && !window.dbAdapter.isDbAvailable()) {
          await window.dbAdapter.init();
        }
        
        try {
          // Get all teams from dbAdapter
          const allTeams = await window.dbAdapter.getTeams();
          
          if (!allTeams || allTeams.length === 0) {
            console.log('No teams found for updating options');
            return;
          }
          
          // Collect unique teams in a Map
          const teamsMap = new Map();
          
          for (const team of allTeams) {
            const teamName = team.name_he || team.name_en || 'Unknown Team';
            
            // Skip the excluded team
            if (team.team_id === excludeTeamId) {
              continue;
            }
            
            // Use team_id as key to avoid duplicates
            if (!teamsMap.has(team.team_id)) {
              teamsMap.set(team.team_id, {
                id: team.team_id,
                name: teamName
              });
            }
          }
          
          // Convert Map to array and sort alphabetically
          const sortedTeams = Array.from(teamsMap.values()).sort((a, b) => {
            return a.name.localeCompare(b.name, 'he');
          });
          
          // Add options to select
          sortedTeams.forEach(team => {
            const option = document.createElement('option');
            option.value = team.id;
            option.textContent = team.name;
            selectElement.appendChild(option);
          });
          
          // Restore the current selection if it's still valid
          if (currentValue && currentValue !== excludeTeamId) {
            selectElement.value = currentValue;
          }
        } catch (error) {
          console.error('Error updating select options:', error);
        }
      }
      
      // Enable/disable analyze button based on selections
      function updateAnalyzeButton() {
        const homeSelected = homeSelect.value;
        const awaySelected = awaySelect.value;
        
        if (homeSelected && awaySelected && homeSelected !== awaySelected) {
          analyzeBtn.disabled = false;
          // Load players for comparison when both teams are selected
          if (typeof loadPlayersForComparison === 'function') {
            loadPlayersForComparison();
          }
        } else {
          analyzeBtn.disabled = true;
        }
      }
      
      // Combined update function
      async function handleTeamChange() {
        await updateTeamOptions();
        updateAnalyzeButton();
      }
      
      homeSelect.addEventListener('change', handleTeamChange);
      awaySelect.addEventListener('change', handleTeamChange);
      
      // Analyze button click
      analyzeBtn.addEventListener('click', async () => {
        const homeTeamId = homeSelect.value;
        const awayTeamId = awaySelect.value;
        
        if (!homeTeamId || !awayTeamId || homeTeamId === awayTeamId) return;
        
        await analyzeGame(homeTeamId, awayTeamId);
      });
    }
    
    // Main game analysis function
    async function analyzeGame(homeTeamId, awayTeamId) {
      console.log('Analyzing game between teams:', homeTeamId, awayTeamId);
      
      try {
        // Get team names
        const homeTeam = await getTeamById(homeTeamId);
        const awayTeam = await getTeamById(awayTeamId);
        
        if (!homeTeam || !awayTeam) {
          showError('לא ניתן למצוא את הקבוצות שנבחרו');
          return;
        }
        
        // Show analysis results
        $("gameAnalysis").classList.remove('hidden');
        
        // Load team averages and rankings
        await loadTeamAverages(homeTeam, awayTeam);
        
        // Load head-to-head history
        await loadHeadToHeadHistory(homeTeam, awayTeam);
        
        // Load last 5 games
        await loadLastFiveGames(homeTeam, awayTeam);
        
      } catch (error) {
        console.error('Error analyzing game:', error);
        showError('שגיאה בניתוח המשחק: ' + error.message);
      }
    }
    
    // Get team by ID
    async function getTeamById(teamId) {
      // Initialize dbAdapter if not already done
      if (window.dbAdapter && !window.dbAdapter.isDbAvailable()) {
        await window.dbAdapter.init();
      }
      
      try {
        // Get team from dbAdapter
        const team = await window.dbAdapter.getTeam(teamId);
        return team;
      } catch (error) {
        console.error('Error getting team by ID:', error);
        return null;
      }
    }
    
    // Load team averages and rankings
    async function loadTeamAverages(homeTeam, awayTeam) {
      console.log('Loading team averages for:', homeTeam.name_he, 'vs', awayTeam.name_he);
      console.log('Home team ID:', homeTeam.team_id);
      console.log('Away team ID:', awayTeam.team_id);
      
      const teamAveragesDiv = $("teamAverages");
      if (!teamAveragesDiv) return;
      
      try {
        // Get all team statistics for ranking calculation
        const allTeamStats = await getTeamsAggregate();
        console.log('All team stats from getTeamsAggregate:', allTeamStats);
        
        // Calculate averages and rankings for both teams
        // Use team names instead of team_id since that's how they're stored in getTeamsAggregate
        const homeStats = await calculateTeamStats(homeTeam.name_he, allTeamStats);
        const awayStats = await calculateTeamStats(awayTeam.name_he, allTeamStats);
        
        // Calculate home/away specific stats
        const homeHomeAwayStats = await calculateHomeAwayStats(homeTeam, true); // true = home team
        const awayHomeAwayStats = await calculateHomeAwayStats(awayTeam, false); // false = away team
        
        console.log('Home team calculated stats:', homeStats);
        console.log('Away team calculated stats:', awayStats);
        
        // Render the comparison
        teamAveragesDiv.innerHTML = `
          <div class="space-y-4">
            <!-- Home Team Stats -->
            <div class="bg-white border border-green-300 rounded-lg p-4">
              <h4 class="font-bold text-lg text-green-800 mb-3">${homeTeam.name_he} (בית)</h4>
              <div class="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div class="text-center">
                  <div class="font-semibold text-gray-700">נקודות למשחק</div>
                  <div class="text-xl font-bold text-black">${homeStats.avgPoints.toFixed(1)}</div>
                  <div class="text-xs text-gray-500">דירוג: ${homeStats.rankPoints}</div>
                </div>
                <div class="text-center">
                  <div class="font-semibold text-gray-700">ריבאונדים למשחק</div>
                  <div class="text-xl font-bold text-black">${homeStats.avgRebounds.toFixed(1)}</div>
                  <div class="text-xs text-gray-500">דירוג: ${homeStats.rankRebounds}</div>
                </div>
                <div class="text-center">
                  <div class="font-semibold text-gray-700">אסיסטים למשחק</div>
                  <div class="text-xl font-bold text-black">${homeStats.avgAssists.toFixed(1)}</div>
                  <div class="text-xs text-gray-500">דירוג: ${homeStats.rankAssists}</div>
                </div>
                <div class="text-center">
                  <div class="font-semibold text-gray-700">חטיפות למשחק</div>
                  <div class="text-xl font-bold text-black">${homeStats.avgSteals.toFixed(1)}</div>
                  <div class="text-xs text-gray-500">דירוג: ${homeStats.rankSteals}</div>
                </div>
                <div class="text-center">
                  <div class="font-semibold text-gray-700">יעילות למשחק</div>
                  <div class="text-xl font-bold text-black">${homeStats.avgEfficiency.toFixed(1)}</div>
                  <div class="text-xs text-gray-500">דירוג: ${homeStats.rankEfficiency}</div>
                </div>
                <div class="text-center">
                  <div class="font-semibold text-gray-700">משחקים</div>
                  <div class="text-xl font-bold text-black">${homeStats.games}</div>
                  <div class="text-xs text-gray-500">בעונה</div>
                </div>
              </div>
              
              <!-- Home/Away Specific Stats for Home Team -->
              <div class="mt-4 pt-4 border-t border-green-200">
                <h5 class="font-semibold text-green-700 mb-2">מאזן משחקים בבית</h5>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div class="text-center">
                    <div class="font-semibold text-gray-700">ניצחונות</div>
                    <div class="text-lg font-bold text-green-600">${homeHomeAwayStats.homeWins}</div>
                    <div class="text-xs text-gray-500">משחקים</div>
                  </div>
                  <div class="text-center">
                    <div class="font-semibold text-gray-700">הפסדים</div>
                    <div class="text-lg font-bold text-red-600">${homeHomeAwayStats.homeLosses}</div>
                    <div class="text-xs text-gray-500">משחקים</div>
                  </div>
                  <div class="text-center">
                    <div class="font-semibold text-gray-700">ממוצע ניצחון</div>
                    <div class="text-lg font-bold text-green-600">${homeHomeAwayStats.avgWinMargin.toFixed(1)}</div>
                    <div class="text-xs text-gray-500">נקודות</div>
                  </div>
                  <div class="text-center">
                    <div class="font-semibold text-gray-700">ממוצע הפסד</div>
                    <div class="text-lg font-bold text-red-600" style="direction: ltr; unicode-bidi: bidi-override;">-${homeHomeAwayStats.avgLossMargin.toFixed(1)}</div>
                    <div class="text-xs text-gray-500">נקודות</div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Away Team Stats -->
            <div class="bg-white border border-green-300 rounded-lg p-4">
              <h4 class="font-bold text-lg text-green-800 mb-3">${awayTeam.name_he} (חוץ)</h4>
              <div class="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div class="text-center">
                  <div class="font-semibold text-gray-700">נקודות למשחק</div>
                  <div class="text-xl font-bold text-black">${awayStats.avgPoints.toFixed(1)}</div>
                  <div class="text-xs text-gray-500">דירוג: ${awayStats.rankPoints}</div>
                </div>
                <div class="text-center">
                  <div class="font-semibold text-gray-700">ריבאונדים למשחק</div>
                  <div class="text-xl font-bold text-black">${awayStats.avgRebounds.toFixed(1)}</div>
                  <div class="text-xs text-gray-500">דירוג: ${awayStats.rankRebounds}</div>
                </div>
                <div class="text-center">
                  <div class="font-semibold text-gray-700">אסיסטים למשחק</div>
                  <div class="text-xl font-bold text-black">${awayStats.avgAssists.toFixed(1)}</div>
                  <div class="text-xs text-gray-500">דירוג: ${awayStats.rankAssists}</div>
                </div>
                <div class="text-center">
                  <div class="font-semibold text-gray-700">חטיפות למשחק</div>
                  <div class="text-xl font-bold text-black">${awayStats.avgSteals.toFixed(1)}</div>
                  <div class="text-xs text-gray-500">דירוג: ${awayStats.rankSteals}</div>
                </div>
                <div class="text-center">
                  <div class="font-semibold text-gray-700">יעילות למשחק</div>
                  <div class="text-xl font-bold text-black">${awayStats.avgEfficiency.toFixed(1)}</div>
                  <div class="text-xs text-gray-500">דירוג: ${awayStats.rankEfficiency}</div>
                </div>
                <div class="text-center">
                  <div class="font-semibold text-gray-700">משחקים</div>
                  <div class="text-xl font-bold text-black">${awayStats.games}</div>
                  <div class="text-xs text-gray-500">בעונה</div>
                </div>
              </div>
              
              <!-- Home/Away Specific Stats for Away Team -->
              <div class="mt-4 pt-4 border-t border-green-200">
                <h5 class="font-semibold text-green-700 mb-2">מאזן משחקים בחוץ</h5>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div class="text-center">
                    <div class="font-semibold text-gray-700">ניצחונות</div>
                    <div class="text-lg font-bold text-green-600">${awayHomeAwayStats.awayWins}</div>
                    <div class="text-xs text-gray-500">משחקים</div>
                  </div>
                  <div class="text-center">
                    <div class="font-semibold text-gray-700">הפסדים</div>
                    <div class="text-lg font-bold text-red-600">${awayHomeAwayStats.awayLosses}</div>
                    <div class="text-xs text-gray-500">משחקים</div>
                  </div>
                  <div class="text-center">
                    <div class="font-semibold text-gray-700">ממוצע ניצחון</div>
                    <div class="text-lg font-bold text-green-600">${awayHomeAwayStats.avgWinMargin.toFixed(1)}</div>
                    <div class="text-xs text-gray-500">נקודות</div>
                  </div>
                  <div class="text-center">
                    <div class="font-semibold text-gray-700">ממוצע הפסד</div>
                    <div class="text-lg font-bold text-red-600" style="direction: ltr; unicode-bidi: bidi-override;">-${awayHomeAwayStats.avgLossMargin.toFixed(1)}</div>
                    <div class="text-xs text-gray-500">נקודות</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
        
        // Display advanced analysis based on team data from database
        console.log('🔍 === DEBUG: Advanced Analysis Check ===');
        console.log('🔍 typeof window.displayAdvancedAnalysis:', typeof window.displayAdvancedAnalysis);
        console.log('🔍 window.App.displayAdvancedAnalysis:', typeof window.App?.displayAdvancedAnalysis);
        
        if (typeof window.displayAdvancedAnalysis === 'function' || typeof window.App?.displayAdvancedAnalysis === 'function') {
          console.log('✅ displayAdvancedAnalysis function exists');
          
          // Create synthetic game data from team averages for advanced analysis
          // Since we don't have detailed shooting stats, we'll create realistic estimates
          const createSyntheticShootingStats = (points, rebounds, assists, steals, blocks, turnovers) => {
            // Estimate field goal attempts based on points (assuming ~1.2 points per FGA)
            const estimatedFGA = Math.round(points / 1.2);
            // Estimate FG% around 45-50%
            const estimatedFGPercent = 0.47;
            const estimatedFGM = Math.round(estimatedFGA * estimatedFGPercent);
            
            // Estimate 3PA as ~35% of total FGA
            const estimated3PA = Math.round(estimatedFGA * 0.35);
            // Estimate 3P% around 35%
            const estimated3PPercent = 0.35;
            const estimated3PM = Math.round(estimated3PA * estimated3PPercent);
            
            // Estimate FTA based on points (assuming ~0.25 FTA per point)
            const estimatedFTA = Math.round(points * 0.25);
            // Estimate FT% around 75%
            const estimatedFTPercent = 0.75;
            const estimatedFTM = Math.round(estimatedFTA * estimatedFTPercent);
            
            return {
              tot_sFieldGoalsMade: estimatedFGM,
              tot_sFieldGoalsAttempted: estimatedFGA,
              tot_sThreePointsMade: estimated3PM,
              tot_sThreePointsAttempted: estimated3PA,
              tot_sFreeThrowsMade: estimatedFTM,
              tot_sFreeThrowsAttempted: estimatedFTA
            };
          };
          
          const homeShootingStats = createSyntheticShootingStats(
            homeStats.avgPoints, homeStats.avgRebounds, homeStats.avgAssists, 
            homeStats.avgSteals, homeStats.avgBlocks || 0, homeStats.avgTurnovers || 0
          );
          
          const awayShootingStats = createSyntheticShootingStats(
            awayStats.avgPoints, awayStats.avgRebounds, awayStats.avgAssists, 
            awayStats.avgSteals, awayStats.avgBlocks || 0, awayStats.avgTurnovers || 0
          );
          
          const syntheticGameData = {
            tm: {
              "1": {
                name: homeTeam.name_he,
                tot_sPoints: homeStats.avgPoints,
                tot_sRebounds: homeStats.avgRebounds,
                tot_sAssists: homeStats.avgAssists,
                tot_sSteals: homeStats.avgSteals,
                tot_sBlocks: homeStats.avgBlocks || 0,
                tot_sTurnovers: homeStats.avgTurnovers || 0,
                tot_sFouls: homeStats.avgFouls || 0,
                ...homeShootingStats
              },
              "2": {
                name: awayTeam.name_he,
                tot_sPoints: awayStats.avgPoints,
                tot_sRebounds: awayStats.avgRebounds,
                tot_sAssists: awayStats.avgAssists,
                tot_sSteals: awayStats.avgSteals,
                tot_sBlocks: awayStats.avgBlocks || 0,
                tot_sTurnovers: awayStats.avgTurnovers || 0,
                tot_sFouls: awayStats.avgFouls || 0,
                ...awayShootingStats
              }
            }
          };
          
          console.log('✅ Creating synthetic game data for advanced analysis...');
          console.log('🔍 Synthetic data:', syntheticGameData);
          
          // Call advanced analysis with synthetic data
          (window.displayAdvancedAnalysis || window.App?.displayAdvancedAnalysis)(syntheticGameData);
        } else {
          console.log('❌ displayAdvancedAnalysis function does not exist!');
        }
        
      } catch (error) {
        console.error('Error loading team averages:', error);
        teamAveragesDiv.innerHTML = `
          <div class="text-center text-red-500">
            <p>שגיאה בטעינת ממוצעים ודירוגים</p>
            <p class="text-sm">${error.message}</p>
          </div>
        `;
      }
    }
    
    // Calculate team statistics and rankings
    async function calculateTeamStats(teamId, allTeamStats) {
      console.log('Calculating stats for team:', teamId);
      console.log('Available team stats:', allTeamStats);
      
      // Find the team's stats - try multiple matching strategies
      const teamStats = allTeamStats.find(team => {
        // Try exact match first
        if (team.team === teamId) return true;
        
        // Try partial matches
        if (team.team && teamId) {
          if (team.team.includes(teamId) || teamId.includes(team.team)) return true;
          
          // Try case-insensitive match
          if (team.team.toLowerCase().includes(teamId.toLowerCase()) || 
              teamId.toLowerCase().includes(team.team.toLowerCase())) return true;
        }
        
        return false;
      });
      
      console.log('Found team stats:', teamStats);
      
      if (!teamStats) {
        console.warn('Team stats not found for:', teamId);
        console.log('Available teams:', allTeamStats.map(t => t.team));
        return {
          games: 0,
          avgPoints: 0,
          avgRebounds: 0,
          avgAssists: 0,
          avgSteals: 0,
          avgEfficiency: 0,
          rankPoints: 'N/A',
          rankRebounds: 'N/A',
          rankAssists: 'N/A',
          rankSteals: 'N/A',
          rankEfficiency: 'N/A'
        };
      }
      
      // Calculate averages
      const games = teamStats.games || 1; // Avoid division by zero
      const avgPoints = (teamStats.points || 0) / games;
      const avgRebounds = (teamStats.rebounds || 0) / games;
      const avgAssists = (teamStats.assists || 0) / games;
      const avgSteals = (teamStats.steals || 0) / games;
      const avgEfficiency = (teamStats.efficiency || 0) / games;
      
      // Calculate rankings
      const rankPoints = calculateRanking(allTeamStats, 'points', teamStats.points);
      const rankRebounds = calculateRanking(allTeamStats, 'rebounds', teamStats.rebounds);
      const rankAssists = calculateRanking(allTeamStats, 'assists', teamStats.assists);
      const rankSteals = calculateRanking(allTeamStats, 'steals', teamStats.steals);
      const rankEfficiency = calculateRanking(allTeamStats, 'efficiency', teamStats.efficiency);
      
      return {
        games,
        avgPoints,
        avgRebounds,
        avgAssists,
        avgSteals,
        avgEfficiency,
        rankPoints,
        rankRebounds,
        rankAssists,
        rankSteals,
        rankEfficiency
      };
    }
    
    // Calculate ranking for a specific stat
    function calculateRanking(allTeamStats, statName, teamValue) {
      if (!teamValue || teamValue === 0) return 'N/A';
      
      // Sort teams by this stat (descending)
      const sortedTeams = allTeamStats
        .filter(team => team[statName] && team[statName] > 0)
        .sort((a, b) => (b[statName] || 0) - (a[statName] || 0));
      
      // Find the rank (1-based)
      const rank = sortedTeams.findIndex(team => team[statName] <= teamValue) + 1;
      const totalTeams = sortedTeams.length;
      
      if (rank === 0) return 'N/A';
      
      // Format ranking (e.g., "3/8" for 3rd out of 8 teams)
      return `${rank}/${totalTeams}`;
    }
    
    // Calculate home/away specific statistics
    async function calculateHomeAwayStats(team, isHomeTeam) {
      console.log('Calculating home/away stats for:', team.name_he, 'isHome:', isHomeTeam);
      
      try {
        // Get all games from database
        const allGames = await getAllGames();
        
        // Get games for this team
        const teamGames = allGames.filter(game => {
          const teams = game.teams || [];
          return teams.some(gameTeam => 
            gameTeam === team.team_id || 
            gameTeam === team.name_he || 
            gameTeam === team.name_en
          );
        });
        
        let homeWins = 0, homeLosses = 0, awayWins = 0, awayLosses = 0;
        let homeWinMargins = [], homeLossMargins = [], awayWinMargins = [], awayLossMargins = [];
        
        for (const game of teamGames) {
          const teams = game.teams || [];
          const teamScores = await calculateTeamScoresForGame(game.gameSerial);
          
          // Find the team's position in the game
          const teamIndex = teams.findIndex(gameTeam => 
            gameTeam === team.team_id || 
            gameTeam === team.name_he || 
            gameTeam === team.name_en
          );
          
          if (teamIndex === -1) continue;
          
          const teamScore = teamScores[teams[teamIndex]] || 0;
          const opponentScore = teamScores[teams[1 - teamIndex]] || 0; // Other team's score
          const margin = teamScore - opponentScore;
          
          if (teamIndex === 0) {
            // Team is home
            if (margin > 0) {
              homeWins++;
              homeWinMargins.push(margin);
            } else if (margin < 0) {
              homeLosses++;
              homeLossMargins.push(Math.abs(margin));
            }
          } else {
            // Team is away
            if (margin > 0) {
              awayWins++;
              awayWinMargins.push(margin);
            } else if (margin < 0) {
              awayLosses++;
              awayLossMargins.push(Math.abs(margin));
            }
          }
        }
        
        // Calculate averages
        const avgHomeWinMargin = homeWinMargins.length > 0 ? 
          homeWinMargins.reduce((a, b) => a + b, 0) / homeWinMargins.length : 0;
        const avgHomeLossMargin = homeLossMargins.length > 0 ? 
          homeLossMargins.reduce((a, b) => a + b, 0) / homeLossMargins.length : 0;
        const avgAwayWinMargin = awayWinMargins.length > 0 ? 
          awayWinMargins.reduce((a, b) => a + b, 0) / awayWinMargins.length : 0;
        const avgAwayLossMargin = awayLossMargins.length > 0 ? 
          awayLossMargins.reduce((a, b) => a + b, 0) / awayLossMargins.length : 0;
        
        return {
          homeWins,
          homeLosses,
          awayWins,
          awayLosses,
          avgWinMargin: isHomeTeam ? avgHomeWinMargin : avgAwayWinMargin,
          avgLossMargin: isHomeTeam ? avgHomeLossMargin : avgAwayLossMargin
        };
        
      } catch (error) {
        console.error('Error calculating home/away stats:', error);
        return {
          homeWins: 0,
          homeLosses: 0,
          awayWins: 0,
          awayLosses: 0,
          avgWinMargin: 0,
          avgLossMargin: 0
        };
      }
    }
    
    // Load head-to-head history
    async function loadHeadToHeadHistory(homeTeam, awayTeam) {
      console.log('Loading head-to-head history between:', homeTeam.name_he, 'and', awayTeam.name_he);
      
      const headToHeadDiv = $("headToHead");
      if (!headToHeadDiv) return;
      
      try {
        // Get all games from database
        const allGames = await getAllGames();
        
        // Find head-to-head games
        const headToHeadGames = await findHeadToHeadGames(allGames, homeTeam, awayTeam);
        
        if (headToHeadGames.length === 0) {
          headToHeadDiv.innerHTML = `
            <div class="text-center text-gray-500 py-4">
              <p>אין מפגשים ישירים בעונה הנוכחית</p>
              <p class="text-sm">הקבוצות לא שיחקו זו נגד זו עדיין</p>
            </div>
          `;
          return;
        }
        
        // Calculate head-to-head statistics
        const h2hStats = calculateHeadToHeadStats(headToHeadGames, homeTeam, awayTeam);
        
        // Render the results
        headToHeadDiv.innerHTML = `
          <div class="space-y-4">
            <!-- Head-to-Head Summary -->
            <div class="bg-white border border-purple-300 rounded-lg p-4">
              <h4 class="font-bold text-lg text-purple-800 mb-3">סיכום מפגשים ישירים</h4>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div class="bg-purple-50 rounded-lg p-3">
                  <div class="text-2xl font-bold text-purple-600">${h2hStats.homeWins}</div>
                  <div class="text-sm text-purple-700">ניצחונות ${homeTeam.name_he}</div>
                </div>
                <div class="bg-gray-50 rounded-lg p-3">
                  <div class="text-2xl font-bold text-gray-600">${h2hStats.totalGames}</div>
                  <div class="text-sm text-gray-700">מפגשים בעונה</div>
                </div>
                <div class="bg-purple-50 rounded-lg p-3">
                  <div class="text-2xl font-bold text-purple-600">${h2hStats.awayWins}</div>
                  <div class="text-sm text-purple-700">ניצחונות ${awayTeam.name_he}</div>
                </div>
              </div>
            </div>
            
            <!-- Individual Games -->
            <div class="bg-white border border-purple-300 rounded-lg p-4">
              <h4 class="font-bold text-lg text-purple-800 mb-3">פירוט משחקים</h4>
              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="bg-purple-50">
                      <th class="px-3 py-2 text-right">תאריך</th>
                      <th class="px-3 py-2 text-center">בית</th>
                      <th class="px-3 py-2 text-center">תוצאה</th>
                      <th class="px-3 py-2 text-center">חוץ</th>
                      <th class="px-3 py-2 text-center">מחזור</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${headToHeadGames.map(game => `
                      <tr class="border-b border-gray-200">
                        <td class="px-3 py-2 text-right">${formatDate(game.date)}</td>
                        <td class="px-3 py-2 text-center">${game.homeTeam}</td>
                        <td class="px-3 py-2 text-center font-bold">${game.homeScore} - ${game.awayScore}</td>
                        <td class="px-3 py-2 text-center">${game.awayTeam}</td>
                        <td class="px-3 py-2 text-center">${game.cycle || 'N/A'}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        `;
        
      } catch (error) {
        console.error('Error loading head-to-head history:', error);
        headToHeadDiv.innerHTML = `
          <div class="text-center text-red-500 py-4">
            <p>שגיאה בטעינת מפגשים ישירים</p>
            <p class="text-sm">${error.message}</p>
          </div>
        `;
      }
    }
    
    // Get all games from database
    async function getAllGames() {
      // Initialize dbAdapter if not already done
      if (window.dbAdapter && !window.dbAdapter.isDbAvailable()) {
        await window.dbAdapter.init();
      }
      
      try {
        // Get all games from dbAdapter
        const games = await window.dbAdapter.getGames();
        return games || [];
      } catch (error) {
        console.error('Error getting all games:', error);
        return [];
      }
    }
    
    // Find head-to-head games between two teams
    async function findHeadToHeadGames(allGames, homeTeam, awayTeam) {
      const headToHeadGames = [];
      
      for (const game of allGames) {
        const teams = game.teams || [];
        
        // Check if both teams are involved in this game
        const homeTeamInvolved = teams.some(team => 
          team === homeTeam.team_id || 
          team === homeTeam.name_he || 
          team === homeTeam.name_en
        );
        const awayTeamInvolved = teams.some(team => 
          team === awayTeam.team_id || 
          team === awayTeam.name_he || 
          team === awayTeam.name_en
        );
        
        if (homeTeamInvolved && awayTeamInvolved) {
          // Calculate team scores from player data
          const teamScores = await calculateTeamScoresForGame(game.gameSerial);
          
          // Find which team is which
          let homeTeamName, awayTeamName, homeScore, awayScore;
          
          if (teams.length >= 2) {
            // Try to match teams with scores
            const team1 = teams[0];
            const team2 = teams[1];
            const score1 = teamScores[team1] || 0;
            const score2 = teamScores[team2] || 0;
            
            // Determine which is home/away based on team selection
            if (team1 === homeTeam.name_he || team1 === homeTeam.team_id || team1 === homeTeam.name_en) {
              homeTeamName = team1;
              awayTeamName = team2;
              homeScore = score1;
              awayScore = score2;
            } else {
              homeTeamName = team2;
              awayTeamName = team1;
              homeScore = score2;
              awayScore = score1;
            }
          } else {
            // Fallback
            homeTeamName = homeTeam.name_he;
            awayTeamName = awayTeam.name_he;
            homeScore = 0;
            awayScore = 0;
          }
          
          headToHeadGames.push({
            date: game.date,
            homeTeam: homeTeamName,
            awayTeam: awayTeamName,
            homeScore: homeScore,
            awayScore: awayScore,
            cycle: game.cycle
          });
        }
      }
      
      return headToHeadGames;
    }
    
    // Calculate team scores for a specific game from player data
    async function calculateTeamScoresForGame(gameId) {
      // Initialize dbAdapter if not already done
      if (window.dbAdapter && !window.dbAdapter.isDbAvailable()) {
        await window.dbAdapter.init();
      }
      
      const teamScores = {};
      
      try {
        // Get all players from dbAdapter
        const allPlayers = await window.dbAdapter.getPlayers();
        
        // Calculate team scores from player game data
        for (const player of allPlayers) {
          for (const game of (player.games || [])) {
            if (game.gameId === gameId) {
              if (!teamScores[game.team]) {
                teamScores[game.team] = 0;
              }
              teamScores[game.team] += game.points || 0;
            }
          }
        }
        
      } catch (error) {
        console.error('Error calculating team scores:', error);
      }
      
      return teamScores;
    }
    
    // Calculate head-to-head statistics
    function calculateHeadToHeadStats(games, homeTeam, awayTeam) {
      let homeWins = 0;
      let awayWins = 0;
      
      games.forEach(game => {
        if (game.homeScore > game.awayScore) {
          homeWins++;
        } else if (game.awayScore > game.homeScore) {
          awayWins++;
        }
        // Ties are not counted as wins for either team
      });
      
      return {
        totalGames: games.length,
        homeWins,
        awayWins,
        ties: games.length - homeWins - awayWins
      };
    }
    
    // Format date for display
    function formatDate(dateString) {
      if (!dateString) return 'N/A';
      
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('he-IL', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
      } catch (error) {
        return dateString;
      }
    }
    
    // Load last 5 games
    async function loadLastFiveGames(homeTeam, awayTeam) {
      console.log('Loading last 5 games for:', homeTeam.name_he, 'and', awayTeam.name_he);
      
      const lastFiveGamesDiv = $("lastFiveGames");
      if (!lastFiveGamesDiv) return;
      
      try {
        // Get all games from database
        const allGames = await getAllGames();
        
        // Get last 5 games for each team
        const homeTeamGames = await getLastGamesForTeam(allGames, homeTeam, 5);
        const awayTeamGames = await getLastGamesForTeam(allGames, awayTeam, 5);
        
        // Render the results
        lastFiveGamesDiv.innerHTML = `
          <div class="space-y-6">
            <!-- Home Team Last 5 Games -->
            <div class="bg-white border border-orange-300 rounded-lg p-4">
              <h4 class="font-bold text-lg text-orange-800 mb-3">${homeTeam.name_he} - 5 משחקים אחרונים</h4>
              ${homeTeamGames.length > 0 ? `
                <div class="space-y-2">
                  ${homeTeamGames.map(game => `
                    <div class="flex items-center justify-between bg-orange-50 rounded-lg p-3">
                      <div class="flex items-center space-x-3 space-x-reverse">
                        <div class="text-sm font-medium">${formatDate(game.date)}</div>
                        <div class="text-sm text-gray-600">${game.opponent}</div>
                        <div class="text-xs px-2 py-1 rounded ${game.isHome ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}">
                          ${game.isHome ? 'בית' : 'חוץ'}
                        </div>
                      </div>
                      <div class="flex items-center space-x-2 space-x-reverse">
                        <div class="text-sm font-bold ${game.result === 'W' ? 'text-green-600' : game.result === 'L' ? 'text-red-600' : 'text-gray-600'}">
                          ${game.result === 'W' ? 'ניצחון' : game.result === 'L' ? 'הפסד' : 'תיקו'}
                        </div>
                        <div class="text-sm font-bold">${game.teamScore} - ${game.opponentScore}</div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              ` : `
                <div class="text-center text-gray-500 py-4">
                  <p>אין משחקים זמינים</p>
                </div>
              `}
            </div>
            
            <!-- Away Team Last 5 Games -->
            <div class="bg-white border border-orange-300 rounded-lg p-4">
              <h4 class="font-bold text-lg text-orange-800 mb-3">${awayTeam.name_he} - 5 משחקים אחרונים</h4>
              ${awayTeamGames.length > 0 ? `
                <div class="space-y-2">
                  ${awayTeamGames.map(game => `
                    <div class="flex items-center justify-between bg-orange-50 rounded-lg p-3">
                      <div class="flex items-center space-x-3 space-x-reverse">
                        <div class="text-sm font-medium">${formatDate(game.date)}</div>
                        <div class="text-sm text-gray-600">${game.opponent}</div>
                        <div class="text-xs px-2 py-1 rounded ${game.isHome ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}">
                          ${game.isHome ? 'בית' : 'חוץ'}
                        </div>
                      </div>
                      <div class="flex items-center space-x-2 space-x-reverse">
                        <div class="text-sm font-bold ${game.result === 'W' ? 'text-green-600' : game.result === 'L' ? 'text-red-600' : 'text-gray-600'}">
                          ${game.result === 'W' ? 'ניצחון' : game.result === 'L' ? 'הפסד' : 'תיקו'}
                        </div>
                        <div class="text-sm font-bold">${game.teamScore} - ${game.opponentScore}</div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              ` : `
                <div class="text-center text-gray-500 py-4">
                  <p>אין משחקים זמינים</p>
                </div>
              `}
            </div>
          </div>
        `;
        
      } catch (error) {
        console.error('Error loading last 5 games:', error);
        lastFiveGamesDiv.innerHTML = `
          <div class="text-center text-red-500 py-4">
            <p>שגיאה בטעינת 5 משחקים אחרונים</p>
            <p class="text-sm">${error.message}</p>
          </div>
        `;
      }
    }
    
    // Get last N games for a specific team
    async function getLastGamesForTeam(allGames, team, limit = 5) {
      // Filter games where the team participated
      const teamGames = allGames.filter(game => {
        const teams = game.teams || [];
        return teams.some(gameTeam => 
          gameTeam === team.team_id || 
          gameTeam === team.name_he || 
          gameTeam === team.name_en
        );
      });
      
      // Sort by date (most recent first) and take the last N
      const sortedGames = teamGames
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, limit);
      
      // Process each game to extract relevant information
      const processedGames = [];
      
      for (const game of sortedGames) {
        const teams = game.teams || [];
        
        // Calculate team scores from player data
        const teamScores = await calculateTeamScoresForGame(game.gameSerial);
        
        // Find the team's position in the game
        const teamIndex = teams.findIndex(gameTeam => 
          gameTeam === team.team_id || 
          gameTeam === team.name_he || 
          gameTeam === team.name_en
        );
        
        // Determine opponent and scores
        let opponent, teamScore, opponentScore, isHome;
        
        if (teams.length >= 2) {
          if (teamIndex === 0) {
            // Team is first (home)
            opponent = teams[1];
            teamScore = teamScores[teams[0]] || 0;
            opponentScore = teamScores[teams[1]] || 0;
            isHome = true;
          } else {
            // Team is second (away)
            opponent = teams[0];
            teamScore = teamScores[teams[1]] || 0;
            opponentScore = teamScores[teams[0]] || 0;
            isHome = false;
          }
        } else {
          // Fallback
          opponent = 'Unknown';
          teamScore = 0;
          opponentScore = 0;
          isHome = true;
        }
        
        // Determine result
        let result;
        if (teamScore > opponentScore) {
          result = 'W'; // Win
        } else if (teamScore < opponentScore) {
          result = 'L'; // Loss
        } else {
          result = 'T'; // Tie
        }
        
        processedGames.push({
          date: game.date,
          opponent: opponent,
          teamScore: teamScore,
          opponentScore: opponentScore,
          isHome: isHome,
          result: result
        });
      }
      
      return processedGames;
    }

    // טעינה מחדש של כל המשחקים עם שחזור נתוני שחקנים
    async function reloadAllGamesFromJSON() {
      try {
        // Wait for DB to be ready
        if (typeof window.ensureDbReady === 'function') {
          await window.ensureDbReady();
        }

        if (!window.dbAdapter || typeof window.dbAdapter.getGames !== 'function') {
          showError('מסד הנתונים לא זמין');
          return;
        }

        const confirmed = confirm(
          '⚠️ פעולה זו תמחק את כל נתוני השחקנים ותבנה אותם מחדש מה-JSON המקורי.\n\n' +
          'זה ימנע כפילויות ויבטיח נתונים נקיים.\n\n' +
          'האם להמשיך?'
        );
        
        if (!confirmed) return;

        console.log('🔄 מתחיל ריבילד מלא של נתוני שחקנים...');
        showOk('🔄 מתחיל ניקוי ובנייה מחדש... אנא המתן');
        
        // שלב 1: ניקוי מלא של stores של שחקנים בלבד (לא משחקים!)
        console.log('🗑️ שלב 1: מנקה נתוני שחקנים ישנים...');
        const playerStores = ['players', 'player_mappings', 'player_stats', 'appearances', 'player_aliases'];
        
        for (const storeName of playerStores) {
          try {
            if (window.dbAdapter && typeof window.dbAdapter.clearTable === 'function') {
              await window.dbAdapter.clearTable(storeName);
              console.log(`  ✅ ${storeName} נוקה`);
            }
          } catch (err) {
            console.warn(`⚠️ לא ניתן לנקות ${storeName}:`, err);
          }
        }
        
        console.log('✅ שלב 1 הושלם - כל נתוני השחקנים נוקו');
        
        // שלב 2: קבלת כל המשחקים מ-dbAdapter
        console.log('📦 שלב 2: טוען רשימת משחקים...');
        const allGames = await window.dbAdapter.getGames();

        if (!allGames || allGames.length === 0) {
          showError('אין משחקים למעבד מחדש');
          return;
        }

        console.log(`✅ שלב 2 הושלם - נמצאו ${allGames.length} משחקים`);
        showOk(`נמצאו ${allGames.length} משחקים. מעבד...`);
        
        // שלב 3: עיבוד כל משחק
        console.log('⚙️ שלב 3: מעבד משחקים...');
        let successCount = 0;
        let errorCount = 0;
        let skippedCount = 0;

        for (let i = 0; i < allGames.length; i++) {
          const game = allGames[i];
          try {
            if (!game.originalJson) {
              console.log(`  ⚠️ משחק ${game.gameSerial} - אין JSON מקורי`);
              skippedCount++;
              continue;
            }

            console.log(`  ⚙️ [${i+1}/${allGames.length}] מעבד משחק ${game.gameSerial}...`);

            // פרוז את originalJson
            let originalData = game.originalJson;
            if (typeof originalData === 'string') {
              originalData = JSON.parse(originalData);
            }

            // חילוץ שחקנים
            RAW = originalData;
            const {rows, teamMap, missing} = await extractPlayers(originalData);
            PLAYERS = rows;
            TEAMMAP = teamMap;

            if (PLAYERS.length === 0) {
              console.log(`    ⚠️ משחק ${game.gameSerial} - אין שחקנים`);
              skippedCount++;
              continue;
            }

            // הגדרת פרטי המשחק (נדרש ל-saveToDatabase)
            $("gameId").value = String(game.gameSerial);
            $("gameDate").value = game.date || '';
            $("gameCycle").value = game.cycle || '';
            
            // חשוב! הגדר updateMode כדי שלא ייווצר משחק חדש
            $("updateModeGameId").value = String(game.gameSerial);

            console.log(`    📊 ${PLAYERS.length} שחקנים`);

            // שמירה למסד - עכשיו בטוח כי ה-stores נקיים
            // מעביר true כדי לדלג על בדיקת כפילויות (אין כפילויות אחרי ניקוי)
            await saveToDatabase(true);
            await savePlayersWithNewSystem();
            
            // נקה את updateMode אחרי השמירה
            $("updateModeGameId").value = '';
            
            successCount++;
            console.log(`    ✅ משחק ${game.gameSerial} הושלם`);
            
            // עדכון סטטוס כל 5 משחקים
            if ((i + 1) % 5 === 0) {
              showOk(`מעבד... ${i + 1}/${allGames.length} משחקים`);
            }
            
          } catch (error) {
            console.error(`  ❌ שגיאה במשחק ${game.gameSerial}:`, error);
            errorCount++;
          }
        }

        // סיכום
        console.log(`\n✅ שלב 3 הושלם!`);
        console.log(`   ✅ הצליחו: ${successCount}`);
        console.log(`   ❌ שגיאות: ${errorCount}`);
        console.log(`   ⏭️ דולגו: ${skippedCount}`);
        
        showOk(
          `✅ הריבילד הושלם בהצלחה!\n\n` +
          `✅ ${successCount} משחקים עובדו\n` +
          `${errorCount > 0 ? `❌ ${errorCount} שגיאות\n` : ''}` +
          `${skippedCount > 0 ? `⏭️ ${skippedCount} דולגו\n` : ''}\n` +
          `רוענן את הדף...`
        );
        
        // רענון הטאבים
        console.log('🔄 מרענן טאבים...');
        if (typeof renderTeamsAggregate === 'function') {
          await renderTeamsAggregate();
        }
        if (typeof renderPlayersTable === 'function') {
          await renderPlayersTable();
        }
        if (typeof listPlayerMappings === 'function') {
          await listPlayerMappings();
        }
        if (typeof listTeams === 'function') {
          await listTeams();
        }
        
        console.log('✅ הכל הושלם!');
        
      } catch (error) {
        console.error('❌ שגיאה קריטית בריבילד:', error);
        showError('שגיאה בטעינת משחקים: ' + (error?.message || error));
      }
    }
    
    // Initialize auth event listeners
    function initGamesTableListeners() {
      console.log('📌 [app_db_save] Initializing authStateChanged listener');
      
      window.addEventListener('authStateChanged', (event) => {
        console.log('🔐 [app_db_save] authStateChanged received!', event.detail);
        renderGamesTable();
      });
      
      console.log('✅ [app_db_save] authStateChanged listener registered');
    }

    // Auto-initialize when script loads (will happen in order with defer)
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initGamesTableListeners);
    } else {
      initGamesTableListeners();
    }
