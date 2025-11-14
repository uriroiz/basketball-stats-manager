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

  /**
   * Initialize database connection
   * @returns {Promise<boolean>} - True if initialization successful
   */
  async function dbInit() {
    try {
      // Check if we have Supabase configured
      if (window.supabase && window.supabaseConfig) {
        const { url, key } = window.supabaseConfig;
        
        if (url && key) {
          supabase = window.supabase.createClient(url, key);
          useSupabase = true;
          DB_AVAILABLE = true;
          console.log('✅ Supabase initialized');
          return true;
        }
      }

      // Fallback to IndexedDB
      console.log('ℹ️ Supabase not configured, using IndexedDB fallback');
      return await initIndexedDB();
      
    } catch (error) {
      console.error('Error initializing database:', error);
      // Try IndexedDB fallback
      return await initIndexedDB();
    }
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
   */
  async function dbSaveGame(gameData) {
    if (useSupabase && supabase) {
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
    if (useSupabase && supabase) {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Error getting players:', error);
        return [];
      }
      return data || [];
    }

    // IndexedDB fallback
    if (!DB) return [];
    return new Promise((resolve) => {
      const tx = DB.transaction(['players'], 'readonly');
      const store = tx.objectStore('players');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
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
    if (useSupabase && supabase) {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('name_he');
      
      if (error) {
        console.error('Error getting teams:', error);
        return [];
      }
      return data || [];
    }

    // IndexedDB fallback
    if (!DB) return [];
    return new Promise((resolve) => {
      const tx = DB.transaction(['teams'], 'readonly');
      const store = tx.objectStore('teams');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
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

  console.log('📦 DB Adapter loaded');

})();

