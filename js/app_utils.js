// =========================
    // Utilities
    // =========================
    const $ = (id) => document.getElementById(id);
    const asInt = (v, d=0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
    const played = (min) => !!min && min !== "0:00" && min !== "00:00";
    const cap = (w) => w ? w.charAt(0).toUpperCase() + w.slice(1) : w;
    const properCase = (s="") => {
      const words = String(s).toLowerCase().split(" ");
      const fixed = words.map((w) => {
        const hy = w.split("-").map((seg) => {
          const ap = seg.split("'").map(cap).join("'");
          return cap(ap);
        }).join("-");
        return cap(hy);
      });
      return fixed.join(" ");
    };
    const fullName = (p) =>
      [p.internationalFirstName, p.internationalFamilyName]
        .filter(Boolean)
        .map(properCase)
        .join(" ")
        .trim();

    const formatPct = (made, attempted) => {
      if (!attempted || attempted === 0) return "-";
      return (made / attempted * 100).toFixed(1) + "%";
    };

    const sortByColumn = (players, column, direction='desc') =>
      players.slice().sort((a,b)=>{
        let aValue=a[column]||0, bValue=b[column]||0;
        if (typeof aValue==='string' && !isNaN(parseFloat(aValue))) aValue=parseFloat(aValue);
        if (typeof bValue==='string' && !isNaN(parseFloat(bValue))) bValue=parseFloat(bValue);
        return direction==='desc'? bValue-aValue : aValue-bValue;
      });

    // -------- Hebrew gibberish detector & decoder (for mis-encoded UTF-8) --------
    const looksGibberishHeb = (s) => /×/.test(String(s || ''));
    const tryDecodeHeb = (s) => {
      try { return decodeURIComponent(escape(String(s || ''))); }
      catch { return s; }
    };

    // -------- Normalization helpers for player-lookup keys --------
    function normalizeEn(s){
      return String(s || "")
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s'-]/g, '')
        .trim();
    }
    function normalizeJersey(j){ return String(j || '').trim(); }
    function normalizeKey(firstEn, familyEn, jersey, teamEn){
      const fe = normalizeEn(firstEn);
      const fa = normalizeEn(familyEn);
      const j  = normalizeJersey(jersey);
      const te = normalizeEn(teamEn || '');
      return `${fe}|${fa}|${j}|${te}`;
    }

    // פונקציה חדשה ליצירת lookup_key ללא תלות במספר חולצה
    function normalizeKeyWithoutJersey(firstEn, familyEn, teamEn){
      const fe = normalizeEn(firstEn);
      const fa = normalizeEn(familyEn);
      const te = normalizeEn(teamEn || '');
      return `${fe}|${fa}|${te}`;
    }

    // =========================
    // New Player Identity System (based on ChatGPT recommendation)
    // =========================
    
    // Generate UUID v4 for player identity
    function generatePlayerId() {
      return crypto.randomUUID();
    }
    
    // Normalize text for canonical keys
    function stripPunctuation(s) {
      if (!s) return '';
      return s.normalize('NFKD')
        .replace(/[\u0591-\u05C7]/g, '')    // Hebrew diacritics
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')  // punctuation → space
        .replace(/\s+/g, ' ').trim().toLowerCase();
    }
    
    // Normalize name components
    function normalizeName({ first, family }) {
      if (!first && family) return { first: '', family: stripPunctuation(family) };
      return { first: stripPunctuation(first||''), family: stripPunctuation(family||'') };
    }
    
    // Create canonical key from name parts
    function canonicalKey(first, family) {
      const nf = (first||'').replace(/\.$/, '');      // drop trailing dot in initials
      const parts = [nf, family].filter(Boolean);
      return parts.join('|');                          // e.g., "john|smith", "j|smith"
    }
    
    // Hebrew phonetic normalization
    function hebrewPhonetic(s) {
      if (!s) return '';
      return s.replace(/[ךכ]/g,'כ').replace(/[םמ]/g,'מ')
              .replace(/[ןנ]/g,'נ').replace(/[ףפ]/g,'פ').replace(/[ץצ]/g,'צ');
    }
    
    // English phonetic (simplified - in production use Double Metaphone)
    function englishPhonetic(s) {
      if (!s) return '';
      return s.replace(/[aeiou]/g, '').substring(0, 4); // crude consonant skeleton
    }
    
    // Player identity resolution system
    async function resolvePlayerId(db, row) {
      console.log('Resolving player identity for:', row);
      const candidates = new Map(); // playerId -> score
      
      // Build name forms from the row
      const forms = [
        {lang:'en', first: row.internationalFirstName, family: row.internationalFamilyName},
        {lang:'he', first: row.firstName, family: row.familyName},
      ];
      const sb = row.scoreboardName;
      
      // 1) Build canonical keys
      const keys = [];
      for (const f of forms) {
        const n = normalizeName({ first: f.first, family: f.family });
        if (n.family) {
          keys.push({ lang: f.lang, ck: canonicalKey(n.first, n.family), n });
          // Initial+surname form
          if (n.first?.length >= 1) {
            keys.push({ lang: f.lang, ck: canonicalKey(n.first[0], n.family), n });
          }
        }
      }
      if (sb) {
        keys.push({ lang:'sb', ck: stripPunctuation(sb), n:{ first:'', family: stripPunctuation(sb) }});
      }
      
      console.log('Generated keys:', keys);
      
      // 2) Query by canonical keys for exact matches
      for (const key of keys) {
        try {
          const tx = db.transaction(['players'], 'readonly');
          const store = tx.objectStore('players');
          const index = store.index('by_canonical');
          const req = index.getAll(key.ck);
          
          await new Promise((resolve, reject) => {
            req.onsuccess = () => {
              const results = req.result;
              for (const player of results) {
                const currentScore = candidates.get(player.id) || 0;
                candidates.set(player.id, currentScore + 100); // Exact canonical match
              }
              resolve();
            };
            req.onerror = () => reject(req.error);
          });
        } catch (e) {
          console.log('Error querying canonical keys:', e);
        }
      }
      
      // 3) Query by aliases
      for (const key of keys) {
        try {
          const tx = db.transaction(['player_aliases'], 'readonly');
          const store = tx.objectStore('player_aliases');
          const index = store.index('by_value');
          const req = index.getAll(key.ck);
          
          await new Promise((resolve, reject) => {
            req.onsuccess = () => {
              const results = req.result;
              for (const alias of results) {
                const currentScore = candidates.get(alias.playerId) || 0;
                candidates.set(alias.playerId, currentScore + 95); // Alias match
              }
              resolve();
            };
            req.onerror = () => reject(req.error);
          });
        } catch (e) {
          console.log('Error querying aliases:', e);
        }
      }
      
      // 4) Choose best candidate or create new player
      let bestPlayerId = null;
      let bestScore = 0;
      
      for (const [playerId, score] of candidates) {
        if (score > bestScore) {
          bestScore = score;
          bestPlayerId = playerId;
        }
      }
      
      console.log('Best candidate:', bestPlayerId, 'with score:', bestScore);
      
      // Auto-accept if score >= 80
      if (bestScore >= 80) {
        return bestPlayerId;
      }
      
      // Create provisional player for low confidence matches
      const playerId = generatePlayerId();
      const canonicalKeys = Array.from(new Set(keys.map(k => k.ck)));
      const phonetic = {
        first: keys.map(k => englishPhonetic(k.n.first)).filter(Boolean),
        family: keys.map(k => englishPhonetic(k.n.family)).filter(Boolean),
        heFirst: keys.filter(k => k.lang === 'he').map(k => hebrewPhonetic(k.n.first)).filter(Boolean),
        heFamily: keys.filter(k => k.lang === 'he').map(k => hebrewPhonetic(k.n.family)).filter(Boolean)
      };
      
      const playerData = {
        id: playerId,
        firstNameEn: row.internationalFirstName || null,
        familyNameEn: row.internationalFamilyName || null,
        firstNameHe: row.firstName || null,
        familyNameHe: row.familyName || null,
        canonicalNameKeys: canonicalKeys,
        scoreboardAliases: sb ? [sb] : [],
        phonetic: phonetic,
        confidence: bestScore >= 60 ? 'medium' : 'low',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      // Save player
      try {
        const tx = db.transaction(['players'], 'readwrite');
        const store = tx.objectStore('players');
        await new Promise((resolve, reject) => {
          const req = store.put(playerData);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
        
        // Save aliases
        const aliasTx = db.transaction(['player_aliases'], 'readwrite');
        const aliasStore = aliasTx.objectStore('player_aliases');
        
        for (const key of keys) {
          const aliasData = {
            playerId: playerId,
            lang: key.lang,
            value: key.ck,
            canonicalKey: key.ck,
            createdAt: Date.now()
          };
          
          await new Promise((resolve, reject) => {
            const req = aliasStore.add(aliasData);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
          });
        }
        
        console.log('Created new player:', playerId, 'with confidence:', playerData.confidence);
        return playerId;
        
      } catch (e) {
        console.error('Error creating player:', e);
        return playerId; // Return ID even if save failed
      }
    }

    // =========================
    // IndexedDB (with fallback for Guest/Private)
    // =========================
    const REQUIRED_DB_VERSION = 10; // Increment for team aliases system 
    let DB = null;
    let DB_AVAILABLE = true;

    // Function to properly close DB connection
    function closeDbConnection() {
      if (DB) {
        DB.close();
        DB = null;
        DB_AVAILABLE = false;
        console.log('DB connection closed properly');
      }
    }

    // Close DB when page unloads
    window.addEventListener('beforeunload', closeDbConnection);

// Diagnostics for DB availability
let DB_ERROR_INFO = null;
function getDbDiagnostics(){
  try{
    return {
      protocol: location.protocol,
      hostname: location.hostname,
      userAgent: navigator.userAgent,
      storageEstimateSupported: !!(navigator.storage && navigator.storage.estimate),
      hasIndexedDB: typeof indexedDB !== 'undefined',
      lastError: DB_ERROR_INFO
    };
  }catch(e){ return { error: String(e) }; }
}

// פונקציה חדשה: בקשת הרשאה לאחסון קבוע
async function requestPersistentStorage() {
    if (!navigator.storage || !navigator.storage.persist) {
        return; // לא נתמך בדפדפן
    }
    try {
        const isPersisted = await navigator.storage.persisted();
        if (isPersisted) {
            console.log("Storage is already persistent.");
            return;
        }
        
        const granted = await navigator.storage.persist();
        if (granted) {
            console.log("Successfully requested persistent storage.");
        } else {
            console.warn("Persistent storage request denied by user/browser.");
        }
    } catch (e) {
        console.error("Error requesting persistent storage:", e);
    }
}


function initDb() {
  return new Promise(async (resolve) => { // הפך ל-async כדי להשתמש ב-await
    try {
      // נסה לבקש הרשאת שמירה קבועה לפני פתיחת המסד
      await requestPersistentStorage();
      
      if (!('indexedDB' in window)) {
        DB_AVAILABLE = false;
        return resolve(null);
      }
      
      const req1 = indexedDB.open("BasketballStatsDB", REQUIRED_DB_VERSION);
      
      req1.onupgradeneeded = (e) => {
        const db = e.target.result;
        
        // New player identity system stores
        const objectStoreNames = ['games', 'players', 'teams', 'player_mappings', 'player_aliases', 'appearances', 'player_stats', 'transfer_events', 'team_aliases'];
        objectStoreNames.forEach(name => {
          if (!db.objectStoreNames.contains(name)) {
            let options = {};
            if (name === 'games') options = { keyPath: 'gameSerial' };
            if (name === 'players') options = { keyPath: 'id' };
            if (name === 'teams') options = { keyPath: 'team_id' };
            if (name === 'player_mappings') options = { keyPath: 'lookup_key' };
            if (name === 'player_aliases') options = { keyPath: 'aliasId', autoIncrement: true };
            if (name === 'appearances') options = { keyPath: 'appearanceId', autoIncrement: true };
            if (name === 'player_stats') options = { keyPath: 'statId', autoIncrement: true };
            if (name === 'transfer_events') options = { keyPath: 'transferId', autoIncrement: true };
            if (name === 'team_aliases') options = { keyPath: 'id', autoIncrement: true };
            
            const store = db.createObjectStore(name, options);
            
            if (name === 'players') {
              // New indexes for player identity system
              if (!store.indexNames.contains('by_canonical')) {
                store.createIndex('by_canonical', 'canonicalNameKeys', { multiEntry: true });
              }
              if (!store.indexNames.contains('by_alias')) {
                store.createIndex('by_alias', 'scoreboardAliases', { multiEntry: true });
              }
              if (!store.indexNames.contains('by_phon_first')) {
                store.createIndex('by_phon_first', 'phonetic.first', { multiEntry: true });
              }
              if (!store.indexNames.contains('by_phon_family')) {
                store.createIndex('by_phon_family', 'phonetic.family', { multiEntry: true });
              }
              // Keep old indexes for backward compatibility
              if (!store.indexNames.contains('nameIndex')) {
                store.createIndex('nameIndex', 'name', { unique: false });
              }
              if (!store.indexNames.contains('teamIndex')) {
                store.createIndex('teamIndex', 'team', { unique: false });
              }
              if (!store.indexNames.contains('jerseyIndex')) {
                store.createIndex('jerseyIndex', 'jersey', { unique: false });
              }
            }
            
            if (name === 'player_aliases') {
              if (!store.indexNames.contains('by_value')) {
                store.createIndex('by_value', 'value');
              }
              if (!store.indexNames.contains('by_canonical')) {
                store.createIndex('by_canonical', 'canonicalKey');
              }
              if (!store.indexNames.contains('by_player')) {
                store.createIndex('by_player', 'playerId');
              }
            }
            
            if (name === 'appearances') {
              if (!store.indexNames.contains('by_player_season')) {
                store.createIndex('by_player_season', ['playerId', 'seasonId']);
              }
              if (!store.indexNames.contains('by_season_team')) {
                store.createIndex('by_season_team', ['seasonId', 'teamId']);
              }
            }
            
            if (name === 'player_stats') {
              if (!store.indexNames.contains('by_player_season')) {
                store.createIndex('by_player_season', ['playerId', 'seasonId']);
              }
              if (!store.indexNames.contains('by_player_game')) {
                store.createIndex('by_player_game', ['playerId', 'gameId']);
              }
              if (!store.indexNames.contains('by_season_team_player')) {
                store.createIndex('by_season_team_player', ['seasonId', 'teamId', 'playerId']);
              }
            }
            
            if (name === 'transfer_events') {
              if (!store.indexNames.contains('by_player_date')) {
                store.createIndex('by_player_date', ['playerId', 'effectiveDate']);
              }
              if (!store.indexNames.contains('by_status')) {
                store.createIndex('by_status', 'status');
              }
              if (!store.indexNames.contains('by_season')) {
                store.createIndex('by_season', 'seasonId');
              }
            }
            
            if (name === 'team_aliases') {
              if (!store.indexNames.contains('by_alias_name')) {
                store.createIndex('by_alias_name', 'alias_name');
              }
              if (!store.indexNames.contains('by_target_team')) {
                store.createIndex('by_target_team', 'target_team_id');
              }
            }
          }
        });
      };
      
      req1.onsuccess = (e) => {
        DB = e.target.result;
        DB_AVAILABLE = true;
        DB_ERROR_INFO = null;
        resolve(DB);
        
        if (DB.version < REQUIRED_DB_VERSION) {
          DB.close();
          DB_AVAILABLE = false;
          DB_ERROR_INFO = { 
            name: "VersionError",
            message: `The requested version (${DB.version}) is less than the existing version (${REQUIRED_DB_VERSION}).`,
            code_fix_required: true
          };
          console.error("Database version mismatch detected.", getDbDiagnostics());
          resolve(null);
        }
      };

      req1.onerror = (e) => {
        console.error("IndexedDB Open Error:", e.target.error);
        DB = null;
        DB_AVAILABLE = false;
        DB_ERROR_INFO = e.target.error;
        if(e.target.error.name === 'InvalidStateError' || e.target.error.name === 'SecurityError'){
          DB_ERROR_INFO.message = "ייתכן שמסד הנתונים אינו זמין במצב אורח/פרטי";
        }
        resolve(null);
      };
      
      req1.onblocked = () => {
        DB = null;
        DB_AVAILABLE = false;
        DB_ERROR_INFO = { 
            name: "BlockedError",
            message: "המסד נחסם, ייתכן שחלון אחר מחזיק חיבור פתוח. סגור את כל החלונות ונסה שוב."
        };
        console.error("IndexedDB Open Blocked:", DB_ERROR_INFO);
        resolve(null);
      };
      
      setTimeout(() => {
        if (DB === null && DB_AVAILABLE === true) {
            DB_AVAILABLE = false;
            DB_ERROR_INFO = DB_ERROR_INFO || { 
              name: "SilentFailure",
              message: "פתיחת מסד הנתונים נכשלה ללא הודעת שגיאה מפורשת. (ייתכן מצב אורח/פרטי)",
            };
            console.error("IndexedDB silent timeout failure.", getDbDiagnostics());
            resolve(null);
        }
      }, 500);

    } catch (e) {
      console.error("IndexedDB Init Catch Error:", e);
      DB = null;
      DB_AVAILABLE = false;
      DB_ERROR_INFO = { name: e.name, message: e.message };
      resolve(null);
    }
  });
}

    // =========================
    // Teams Index & Helpers
    // =========================
    let TEAM_INDEX = null; // { byNameEn: Map<string, team>, byAlias: Map<string, team> }
    const TEAMS_MEM = []; // Fallback if DB is unavailable

    async function loadTeamsIndex(){
      TEAM_INDEX = null;
      if(DB_AVAILABLE && DB){
        const tx=DB.transaction(["teams"],"readonly");
        const store=tx.objectStore("teams");
        const byNameEn=new Map(); const byAlias=new Map();
        await new Promise((resolve)=>{ const req=store.openCursor(); req.onsuccess=(e)=>{ const cur=e.target.result; if(!cur) return resolve(); const t=cur.value; if(t.name_en) byNameEn.set(normalizeEn(t.name_en), t); (t.aliases||[]).forEach(a=>byAlias.set(normalizeEn(a), t)); cur.continue(); }; });
        TEAM_INDEX={byNameEn, byAlias};
      } else {
        const byNameEn=new Map(); const byAlias=new Map();
        TEAMS_MEM.forEach(t=>{ if(t.name_en) byNameEn.set(normalizeEn(t.name_en), t); (t.aliases||[]).forEach(a=>byAlias.set(normalizeEn(a), t)); });
        TEAM_INDEX={byNameEn, byAlias};
      }
    }

    function resolveTeam(enName){ if(!TEAM_INDEX) return null; const key=normalizeEn(enName); return TEAM_INDEX.byNameEn.get(key) || TEAM_INDEX.byAlias.get(key) || null; }

    async function upsertTeam(rec){
      if(DB_AVAILABLE && DB){
        const tx=DB.transaction(["teams"],"readwrite");
        const store=tx.objectStore("teams");
        await new Promise((res,rej)=>{ const rq=store.put(rec); rq.onsuccess=()=>res(); rq.onerror=()=>rej(rq.error); });
        await loadTeamsIndex(); // רענון אינדקס הקבוצות
      } else {
        const idx = TEAMS_MEM.findIndex(t=>t.team_id===rec.team_id);
        if(idx>=0) TEAMS_MEM[idx] = rec; else TEAMS_MEM.push(rec);
      }
    }