// Database Adapter Layer
// Provides unified API for both Supabase (cloud) and IndexedDB (local fallback)

(function() {
  'use strict';

  // Configuration
  let supabase = null;
  let useSupabase = false;
  let DB_AVAILABLE = false;

  // IndexedDB fallback
  let DB = null;

  // Initialization tracking
  let dbInitPromise = null;
  let dbInitialized = false;

  /**
   * Initialize database connection
   * @returns {Promise<boolean>} - True if initialization successful
   */
  async function dbInit() {
    // Return existing promise if already initializing
    if (dbInitPromise) {
      return dbInitPromise;
    }

    // If already initialized, return immediately
    if (dbInitialized) {
      return Promise.resolve(true);
    }

    // Create initialization promise
    dbInitPromise = (async () => {
      console.log('=== DB Initialization Starting ===');
      
      try {
        // Check if we have Supabase configured
        if (window.supabase && window.supabaseConfig) {
          const { url, key } = window.supabaseConfig;
          
          if (url && key) {
            console.log('✅ Supabase credentials found, initializing Supabase client...');
            supabase = window.supabase.createClient(url, key);
            useSupabase = true;
            
            // Test connection
            try {
              const { data, error } = await supabase.from('teams').select('count', { count: 'exact', head: true });
              if (error) throw error;
              console.log('✅ Supabase connection verified');
              DB_AVAILABLE = true;
              dbInitialized = true;
              return true;
            } catch (testError) {
              console.error('❌ Supabase connection test failed:', testError);
              useSupabase = false;
              supabase = null;
            }
          }
        }

        // Fallback to IndexedDB
        console.log('ℹ️ Supabase not configured or failed, using IndexedDB fallback');
        const result = await initIndexedDB();
        dbInitialized = result;
        return result;
        
      } catch (error) {
        console.error('❌ DB Initialization Error:', error);
        dbInitialized = false;
        // Try IndexedDB fallback
        const result = await initIndexedDB();
        dbInitialized = result;
        return result;
      } finally {
        console.log('✅ DB Initialization Complete - Using:', useSupabase ? 'Supabase' : 'IndexedDB');
      }
    })();

    return dbInitPromise;
  }

  /**
   * Helper function to ensure DB is ready
   */
  async function ensureDbReady() {
    if (!dbInitialized) {
      await dbInit();
    }
    return dbInitialized;
  }

  /**
   * Initialize IndexedDB (fallback)
   */
  async function initIndexedDB() {
    return new Promise((resolve) => {
      if (!('indexedDB' in window)) {
        DB_AVAILABLE = false;
        useSupabase = false;
        return resolve(false);
      }

      const req = indexedDB.open("BasketballStatsDB", 10);

      req.onupgradeneeded = (e) => {
        const db = e.target.result;
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
            
            db.createObjectStore(name, options);
          }
        });
      };

      req.onsuccess = (e) => {
        DB = e.target.result;
        DB_AVAILABLE = true;
        useSupabase = false;
        console.log('✅ IndexedDB initialized (fallback mode)');
        resolve(true);
      };

      req.onerror = () => {
        DB = null;
        DB_AVAILABLE = false;
        console.error('❌ Failed to initialize IndexedDB');
        resolve(false);
      };
    });
  }

  // ========================================
  // GAMES API
  // ========================================

  /**
   * Get all games
   */
  async function dbGetGames() {
    if (useSupabase && supabase) {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .order('gameSerial', { ascending: false });
      
      if (error) {
        console.error('Error getting games:', error);
        return [];
      }
      return data || [];
    }

    // IndexedDB fallback
    if (!DB) return [];
    return new Promise((resolve) => {
      const tx = DB.transaction(['games'], 'readonly');
      const store = tx.objectStore('games');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  }

  /**
   * Get game by ID
   */
  async function dbGetGame(gameSerial) {
    if (useSupabase && supabase) {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('gameSerial', gameSerial)
        .single();
      
      if (error) {
        console.error('Error getting game:', error);
        return null;
      }
      return data;
    }

    // IndexedDB fallback
    if (!DB) return null;
    return new Promise((resolve) => {
      const tx = DB.transaction(['games'], 'readonly');
      const store = tx.objectStore('games');
      const request = store.get(gameSerial);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  }

  /**
   * Save/update game
   * Uses Edge Function if admin is authenticated, otherwise direct Supabase
   */
  async function dbSaveGame(gameData, playersData = []) {
    // Check if admin password is available (for Edge Function)
    const adminPassword = window.authModule?.getPassword?.();
    
    if (useSupabase && supabase && adminPassword) {
      // Use Edge Function with admin authentication
      console.log('💾 Saving via Edge Function (authenticated)...');
      try {
        const supabaseUrl = window.CONFIG?.SUPABASE_URL;
        const response = await fetch(`${supabaseUrl}/functions/v1/save-game`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-password': adminPassword,
            'apikey': window.CONFIG?.SUPABASE_ANON_KEY
          },
          body: JSON.stringify({ 
            gameData, 
            playersData 
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Edge Function call failed');
        }
        
        const result = await response.json();
        console.log('✅ Saved via Edge Function:', result);
        return gameData; // Return original gameData for consistency
      } catch (error) {
        console.error('❌ Edge Function error:', error);
        throw error;
      }
    }
    
    if (useSupabase && supabase) {
      // Fallback to direct Supabase (will fail if RLS is enabled)
      console.log('💾 Saving via direct Supabase...');
      const { data, error } = await supabase
        .from('games')
        .upsert(gameData, { onConflict: 'gameSerial' })
        .select()
        .single();
      
      if (error) {
        console.error('Error saving game:', error);
        throw error;
      }
      return data;
    }

    // IndexedDB fallback
    if (!DB) throw new Error('Database not available');
    return new Promise((resolve, reject) => {
      const tx = DB.transaction(['games'], 'readwrite');
      const store = tx.objectStore('games');
      const request = store.put(gameData);
      request.onsuccess = () => resolve(gameData);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete game
   */
  async function dbDeleteGame(gameSerial) {
    if (useSupabase && supabase) {
      const { error } = await supabase
        .from('games')
        .delete()
        .eq('gameSerial', gameSerial);
      
      if (error) {
        console.error('Error deleting game:', error);
        throw error;
      }
      return true;
    }

    // IndexedDB fallback
    if (!DB) throw new Error('Database not available');
    return new Promise((resolve, reject) => {
      const tx = DB.transaction(['games'], 'readwrite');
      const store = tx.objectStore('games');
      const request = store.delete(gameSerial);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  // ========================================
  // PLAYERS API
  // ========================================

  /**
   * Get all players
   */
  async function dbGetPlayers() {
    console.log('📡 dbGetPlayers called, useSupabase:', useSupabase);
    
    if (useSupabase && supabase) {
      try {
        const { data, error } = await supabase
          .from('players')
          .select('*')
          .order('name');
        
        if (error) {
          console.error('❌ Supabase error getting players:', error);
          return [];
        }
        
        console.log(`✅ Supabase returned ${data?.length || 0} players`);
        return data || [];
        
      } catch (error) {
        console.error('❌ Exception getting players from Supabase:', error);
        return [];
      }
    }

    // IndexedDB fallback
    console.log('📦 Using IndexedDB for players');
    if (!DB) {
      console.error('❌ IndexedDB not initialized');
      return [];
    }
    
    return new Promise((resolve) => {
      try {
        const tx = DB.transaction(['players'], 'readonly');
        const store = tx.objectStore('players');
        const request = store.getAll();
        
        request.onsuccess = () => {
          console.log(`✅ IndexedDB returned ${request.result?.length || 0} players`);
          resolve(request.result || []);
        };
        
        request.onerror = (e) => {
          console.error('❌ IndexedDB error getting players:', e);
          resolve([]);
        };
      } catch (error) {
        console.error('❌ Exception with IndexedDB players:', error);
        resolve([]);
      }
    });
  }

  /**
   * Get player by ID
   */
  async function dbGetPlayer(playerId) {
    if (useSupabase && supabase) {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('id', playerId)
        .single();
      
      if (error) {
        console.error('Error getting player:', error);
        return null;
      }
      return data;
    }

    // IndexedDB fallback
    if (!DB) return null;
    return new Promise((resolve) => {
      const tx = DB.transaction(['players'], 'readonly');
      const store = tx.objectStore('players');
      const request = store.get(playerId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  }

  /**
   * Save/update player
   */
  async function dbSavePlayer(playerData) {
    if (useSupabase && supabase) {
      const { data, error } = await supabase
        .from('players')
        .upsert(playerData, { onConflict: 'id' })
        .select()
        .single();
      
      if (error) {
        console.error('Error saving player:', error);
        throw error;
      }
      return data;
    }

    // IndexedDB fallback
    if (!DB) throw new Error('Database not available');
    return new Promise((resolve, reject) => {
      const tx = DB.transaction(['players'], 'readwrite');
      const store = tx.objectStore('players');
      const request = store.put(playerData);
      request.onsuccess = () => resolve(playerData);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete player
   */
  async function dbDeletePlayer(playerId) {
    if (useSupabase && supabase) {
      const { error } = await supabase
        .from('players')
        .delete()
        .eq('id', playerId);
      
      if (error) {
        console.error('Error deleting player:', error);
        throw error;
      }
      return true;
    }

    // IndexedDB fallback
    if (!DB) throw new Error('Database not available');
    return new Promise((resolve, reject) => {
      const tx = DB.transaction(['players'], 'readwrite');
      const store = tx.objectStore('players');
      const request = store.delete(playerId);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  // ========================================
  // TEAMS API
  // ========================================

  /**
   * Get all teams
   */
  async function dbGetTeams() {
    console.log('📡 dbGetTeams called, useSupabase:', useSupabase);
    
    if (useSupabase && supabase) {
      try {
        const { data, error } = await supabase
          .from('teams')
          .select('*')
          .order('name_he');
        
        if (error) {
          console.error('❌ Supabase error getting teams:', error);
          return [];
        }
        
        console.log(`✅ Supabase returned ${data?.length || 0} teams`);
        return data || [];
        
      } catch (error) {
        console.error('❌ Exception getting teams from Supabase:', error);
        return [];
      }
    }

    // IndexedDB fallback
    console.log('📦 Using IndexedDB for teams');
    if (!DB) {
      console.error('❌ IndexedDB not initialized');
      return [];
    }
    
    return new Promise((resolve) => {
      try {
        const tx = DB.transaction(['teams'], 'readonly');
        const store = tx.objectStore('teams');
        const request = store.getAll();
        
        request.onsuccess = () => {
          console.log(`✅ IndexedDB returned ${request.result?.length || 0} teams`);
          resolve(request.result || []);
        };
        
        request.onerror = (e) => {
          console.error('❌ IndexedDB error getting teams:', e);
          resolve([]);
        };
      } catch (error) {
        console.error('❌ Exception with IndexedDB teams:', error);
        resolve([]);
      }
    });
  }

  /**
   * Get team by ID
   */
  async function dbGetTeam(teamId) {
    if (useSupabase && supabase) {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('team_id', teamId)
        .single();
      
      if (error) {
        console.error('Error getting team:', error);
        return null;
      }
      return data;
    }

    // IndexedDB fallback
    if (!DB) return null;
    return new Promise((resolve) => {
      const tx = DB.transaction(['teams'], 'readonly');
      const store = tx.objectStore('teams');
      const request = store.get(teamId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  }

  /**
   * Save/update team
   */
  async function dbSaveTeam(teamData) {
    if (useSupabase && supabase) {
      const { data, error} = await supabase
        .from('teams')
        .upsert(teamData, { onConflict: 'team_id' })
        .select()
        .single();
      
      if (error) {
        console.error('Error saving team:', error);
        throw error;
      }
      return data;
    }

    // IndexedDB fallback
    if (!DB) throw new Error('Database not available');
    return new Promise((resolve, reject) => {
      const tx = DB.transaction(['teams'], 'readwrite');
      const store = tx.objectStore('teams');
      const request = store.put(teamData);
      request.onsuccess = () => resolve(teamData);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete team
   */
  async function dbDeleteTeam(teamId) {
    if (useSupabase && supabase) {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('team_id', teamId);
      
      if (error) {
        console.error('Error deleting team:', error);
        throw error;
      }
      return true;
    }

    // IndexedDB fallback
    if (!DB) throw new Error('Database not available');
    return new Promise((resolve, reject) => {
      const tx = DB.transaction(['teams'], 'readwrite');
      const store = tx.objectStore('teams');
      const request = store.delete(teamId);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  // ========================================
  // PLAYER MAPPINGS API
  // ========================================

  /**
   * Get all player mappings
   */
  async function dbGetPlayerMappings() {
    if (useSupabase && supabase) {
      const { data, error } = await supabase
        .from('player_mappings')
        .select('*');
      
      if (error) {
        console.error('Error getting player mappings:', error);
        return [];
      }
      return data || [];
    }

    // IndexedDB fallback
    if (!DB) return [];
    return new Promise((resolve) => {
      const tx = DB.transaction(['player_mappings'], 'readonly');
      const store = tx.objectStore('player_mappings');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  }

  /**
   * Save player mapping
   */
  async function dbSavePlayerMapping(mappingData) {
    if (useSupabase && supabase) {
      const { data, error } = await supabase
        .from('player_mappings')
        .upsert(mappingData, { onConflict: 'lookup_key' })
        .select()
        .single();
      
      if (error) {
        console.error('Error saving player mapping:', error);
        throw error;
      }
      return data;
    }

    // IndexedDB fallback
    if (!DB) throw new Error('Database not available');
    return new Promise((resolve, reject) => {
      const tx = DB.transaction(['player_mappings'], 'readwrite');
      const store = tx.objectStore('player_mappings');
      const request = store.put(mappingData);
      request.onsuccess = () => resolve(mappingData);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete player mapping
   */
  async function dbDeletePlayerMapping(lookupKey) {
    if (useSupabase && supabase) {
      const { error } = await supabase
        .from('player_mappings')
        .delete()
        .eq('lookup_key', lookupKey);
      
      if (error) {
        console.error('Error deleting player mapping:', error);
        throw error;
      }
      return true;
    }

    // IndexedDB fallback
    if (!DB) throw new Error('Database not available');
    return new Promise((resolve, reject) => {
      const tx = DB.transaction(['player_mappings'], 'readwrite');
      const store = tx.objectStore('player_mappings');
      const request = store.delete(lookupKey);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  // ========================================
  // GENERIC TABLE OPERATIONS
  // ========================================

  /**
   * Generic: Get all from table
   */
  async function dbGetAll(tableName) {
    if (useSupabase && supabase) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*');
      
      if (error) {
        console.error(`Error getting all from ${tableName}:`, error);
        return [];
      }
      return data || [];
    }

    // IndexedDB fallback
    if (!DB) return [];
    return new Promise((resolve) => {
      const tx = DB.transaction([tableName], 'readonly');
      const store = tx.objectStore(tableName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  }

  /**
   * Generic: Clear table
   */
  async function dbClearTable(tableName) {
    if (useSupabase && supabase) {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .neq('id', 0); // Delete all (workaround for "delete all" in Supabase)
      
      if (error) {
        console.error(`Error clearing ${tableName}:`, error);
        throw error;
      }
      return true;
    }

    // IndexedDB fallback
    if (!DB) throw new Error('Database not available');
    return new Promise((resolve, reject) => {
      const tx = DB.transaction([tableName], 'readwrite');
      const store = tx.objectStore(tableName);
      const request = store.clear();
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  // ========================================
  // UTILITY FUNCTIONS
  // ========================================

  /**
   * Check if using Supabase
   */
  function isUsingSupabase() {
    return useSupabase;
  }

  /**
   * Check if database is available
   */
  function isDbAvailable() {
    return DB_AVAILABLE;
  }

  /**
   * Get database info
   */
  function getDbInfo() {
    return {
      available: DB_AVAILABLE,
      type: useSupabase ? 'Supabase' : 'IndexedDB',
      supabase: useSupabase,
      indexedDB: !useSupabase && DB_AVAILABLE
    };
  }

  // Export to global scope
  window.dbAdapter = {
    // Initialization
    init: dbInit,
    ensureDbReady: ensureDbReady,
    isReady: () => dbInitialized,
    isSupabase: () => useSupabase,
    
    // Games
    getGames: dbGetGames,
    getGame: dbGetGame,
    saveGame: dbSaveGame,
    deleteGame: dbDeleteGame,
    
    // Players
    getPlayers: dbGetPlayers,
    getPlayer: dbGetPlayer,
    savePlayer: dbSavePlayer,
    deletePlayer: dbDeletePlayer,
    
    // Teams
    getTeams: dbGetTeams,
    getTeam: dbGetTeam,
    saveTeam: dbSaveTeam,
    deleteTeam: dbDeleteTeam,
    
    // Player Mappings
    getPlayerMappings: dbGetPlayerMappings,
    savePlayerMapping: dbSavePlayerMapping,
    deletePlayerMapping: dbDeletePlayerMapping,
    
    // Generic
    getAll: dbGetAll,
    clearTable: dbClearTable,
    
    // Utility
    isUsingSupabase,
    isDbAvailable,
    getDbInfo
  };

  // Also make ensureDbReady globally available
  window.ensureDbReady = ensureDbReady;

  console.log('📦 DB Adapter loaded');

})();

