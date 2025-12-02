/**
 * Admin Player Names Manager
 * Manages player names in Supabase with API sync capability
 */

class AdminPlayerNamesManager {
  constructor() {
    this.supabase = null;
    this.apiAdapter = null;
    this.allPlayers = []; // All players from games
    this.namesInDb = new Map(); // player_id → player data from Supabase
    this.isInitialized = false;
  }

  /**
   * Initialize with Supabase and API adapter
   */
  async init(supabaseClient, ibbaAdapter) {
    console.log('🎯 Initializing Admin Player Names Manager...');
    
    this.supabase = supabaseClient;
    this.apiAdapter = ibbaAdapter;
    
    // Load existing names from Supabase
    await this.loadNamesFromSupabase();
    
    this.isInitialized = true;
    console.log('✅ Admin Manager initialized');
  }

  /**
   * Load all player names from Supabase
   */
  async loadNamesFromSupabase() {
    if (!this.supabase) {
      console.error('❌ Supabase not initialized');
      return;
    }

    try {
      console.log('📥 Loading player names from Supabase...');
      
      const { data, error } = await this.supabase
        .from('player_names')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      // Build map
      this.namesInDb.clear();
      if (data) {
        data.forEach(player => {
          this.namesInDb.set(String(player.player_id), player);
        });
      }

      console.log(`✅ Loaded ${this.namesInDb.size} player names from Supabase`);
      return this.namesInDb;

    } catch (error) {
      console.error('❌ Error loading from Supabase:', error);
      throw error;
    }
  }

  /**
   * Extract all unique players from games
   */
  extractPlayersFromGames(games) {
    console.log(`🔍 Extracting players from ${games.length} games...`);
    
    const playersMap = new Map(); // player_id → player info
    
    games.forEach(game => {
      if (game.players) {
        game.players.forEach(player => {
          const id = String(player.playerId);
          
          if (!playersMap.has(id)) {
            playersMap.set(id, {
              player_id: id,
              jersey: player.jersey,
              team_id: player.teamId,
              team_name: player.teamName,
              games: []
            });
          }
          
          playersMap.get(id).games.push({
            date: game.date,
            homeTeam: game.homeTeam,
            awayTeam: game.awayTeam
          });
        });
      }
    });
    
    this.allPlayers = Array.from(playersMap.values());
    console.log(`✅ Found ${this.allPlayers.length} unique players`);
    
    return this.allPlayers;
  }

  /**
   * Get players with/without names
   */
  getPlayerStats() {
    const withNames = this.allPlayers.filter(p => this.namesInDb.has(p.player_id));
    const withoutNames = this.allPlayers.filter(p => !this.namesInDb.has(p.player_id));
    
    return {
      total: this.allPlayers.length,
      withNames: withNames.length,
      withoutNames: withoutNames.length,
      coverage: this.allPlayers.length > 0 
        ? ((withNames.length / this.allPlayers.length) * 100).toFixed(1)
        : 0,
      playersWithNames: withNames,
      playersWithoutNames: withoutNames
    };
  }

  /**
   * Sync missing players from IBBA API
   * @param {Function} onProgress - Progress callback
   */
  async syncFromAPI(onProgress = null) {
    if (!this.apiAdapter) {
      throw new Error('API Adapter not initialized');
    }

    console.log('🔄 Starting API sync...');
    if (onProgress) onProgress({ stage: 'init', message: 'Initializing...' });

    try {
      // Load players from API
      if (onProgress) onProgress({ stage: 'fetching', message: 'Fetching players from API...' });
      
      const apiLoader = new window.IBBAPlayerNames();
      await apiLoader.loadAllPlayerNames((progress) => {
        if (onProgress) onProgress({
          stage: 'fetching',
          message: progress.message || 'Loading...',
          percent: progress.percent
        });
      });

      const apiNamesMap = apiLoader.namesMap;
      console.log(`📊 API returned ${apiNamesMap.size} players`);

      // Find new players to add
      const newPlayers = [];
      apiNamesMap.forEach((data, playerId) => {
        if (!this.namesInDb.has(playerId)) {
          newPlayers.push({
            player_id: parseInt(playerId),
            name: data.name,
            jersey: data.jersey || null,
            team_id: data.teamId || null,
            team_name: null, // Will be filled from games if available
            source: 'api',
            notes: 'Auto-synced from IBBA API'
          });
        }
      });

      console.log(`📝 Found ${newPlayers.length} new players to add`);

      if (newPlayers.length === 0) {
        console.log('✅ No new players to sync');
        if (onProgress) onProgress({ stage: 'complete', message: 'No new players found' });
        return { added: 0, updated: 0 };
      }

      // Save to Supabase
      if (onProgress) onProgress({ stage: 'saving', message: `Saving ${newPlayers.length} players...` });
      
      const { data, error } = await this.supabase
        .from('player_names')
        .insert(newPlayers)
        .select();

      if (error) throw error;

      console.log(`✅ Added ${data.length} players to Supabase`);

      // Reload from Supabase
      await this.loadNamesFromSupabase();
      
      // Clear public dashboard cache so changes will be reflected
      this.clearPublicDashboardCache();

      if (onProgress) onProgress({ stage: 'complete', message: `Added ${data.length} players` });

      return { added: data.length, updated: 0 };

    } catch (error) {
      console.error('❌ Sync failed:', error);
      if (onProgress) onProgress({ stage: 'error', error: error.message });
      throw error;
    }
  }

  /**
   * Add/Update a player name manually
   */
  async savePlayerName(playerId, name, source = 'manual', notes = '') {
    if (!this.supabase) {
      throw new Error('Supabase not initialized');
    }

    const playerIdNum = parseInt(playerId);
    const playerInfo = this.allPlayers.find(p => p.player_id === String(playerId));

    const playerData = {
      player_id: playerIdNum,
      name: name,
      jersey: playerInfo?.jersey || null,
      team_id: playerInfo?.team_id || null,
      team_name: playerInfo?.team_name || null,
      source: source,
      notes: notes
    };

    try {
      // Check if exists
      const existing = this.namesInDb.has(String(playerId));

      if (existing) {
        // Update
        const { data, error } = await this.supabase
          .from('player_names')
          .update(playerData)
          .eq('player_id', playerIdNum)
          .select();

        if (error) throw error;
        console.log(`✅ Updated player ${playerId}: ${name}`);
        return { action: 'updated', data: data[0] };

      } else {
        // Insert
        const { data, error } = await this.supabase
          .from('player_names')
          .insert([playerData])
          .select();

        if (error) throw error;
        console.log(`✅ Added player ${playerId}: ${name}`);
        return { action: 'inserted', data: data[0] };
      }

    } catch (error) {
      console.error(`❌ Error saving player ${playerId}:`, error);
      throw error;
    } finally {
      // Reload
      await this.loadNamesFromSupabase();
      
      // Clear public dashboard cache so changes will be reflected
      this.clearPublicDashboardCache();
    }
  }

  /**
   * Delete a player name
   */
  async deletePlayerName(playerId) {
    if (!this.supabase) {
      throw new Error('Supabase not initialized');
    }

    try {
      const { error } = await this.supabase
        .from('player_names')
        .delete()
        .eq('player_id', parseInt(playerId));

      if (error) throw error;

      console.log(`✅ Deleted player ${playerId}`);
      
      // Reload
      await this.loadNamesFromSupabase();
      
      // Clear public dashboard cache so changes will be reflected
      this.clearPublicDashboardCache();
      
      return { action: 'deleted' };

    } catch (error) {
      console.error(`❌ Error deleting player ${playerId}:`, error);
      throw error;
    }
  }

  /**
   * Get player by ID
   */
  getPlayer(playerId) {
    const id = String(playerId);
    const fromDb = this.namesInDb.get(id);
    const fromGames = this.allPlayers.find(p => p.player_id === id);

    return {
      inDb: fromDb || null,
      inGames: fromGames || null,
      hasName: !!fromDb
    };
  }

  /**
   * Export all data for inspection
   */
  exportData() {
    return {
      totalPlayersInGames: this.allPlayers.length,
      totalNamesInDb: this.namesInDb.size,
      stats: this.getPlayerStats(),
      allPlayers: this.allPlayers,
      namesInDb: Array.from(this.namesInDb.values())
    };
  }

  /**
   * Clear public dashboard cache
   * This ensures the public dashboard will load fresh data from Supabase
   * after any admin changes
   */
  clearPublicDashboardCache() {
    try {
      // Clear all versions of the player names cache
      const cacheKeys = [
        'ibba_player_names_v5', 
        'ibba_player_names_v6', 
        'ibba_player_names_v7',
        'ibba_player_names_api_2025-2_v6',
        'ibba_player_names_api_2025-2_v7'
      ];
      
      cacheKeys.forEach(key => {
        sessionStorage.removeItem(key);
        localStorage.removeItem(key);
      });
      
      console.log('🧹 Cleared public dashboard cache - fresh data will load on next visit');
      
      return true;
    } catch (error) {
      console.warn('⚠️ Could not clear cache:', error);
      return false;
    }
  }
}

// Make available globally
window.AdminPlayerNamesManager = AdminPlayerNamesManager;
console.log('📦 Admin Player Names Manager loaded');


