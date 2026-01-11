/**
 * IBBAPlayerNames - Load player names from SportsPress API
 * 
 * Uses the /wp-json/sportspress/v2/players endpoint to fetch all player data
 * including names, jersey numbers, and team IDs. Caches results in sessionStorage.
 */

class IBBAPlayerNames {
  constructor(supabaseClient = null) {
    this.namesMap = new Map(); // playerId → { name, jersey, teamId }
    this.isLoading = false;
    this.isLoaded = false;
    this.supabase = supabaseClient; // Optional Supabase client
    this.apiUrl = 'https://ibasketball.co.il/wp-json/sportspress/v2/players';
    this.leagueId = '119474'; // Current league
    this.cacheKey = 'ibba_player_names_api_2025-2_v7'; // v7 = 5min expiry for fast updates
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes (fast refresh for admin changes)
    
    // Try loading from cache immediately
    this.loadFromCache();
  }
  
  /**
   * Check if we have cached names
   */
  hasCachedNames() {
    return this.namesMap.size > 0;
  }
  
  /**
   * Get player name by ID
   * @param {string|number} playerId - Player ID (e.g., 906516 or "906516")
   * @returns {string|null} Player name or null if not found
   */
  getPlayerName(playerId) {
    const id = String(playerId);
    const data = this.namesMap.get(id);
    return data ? data.name : null;
  }
  
  /**
   * Get player jersey number by ID
   */
  getPlayerJersey(playerId) {
    const id = String(playerId);
    const data = this.namesMap.get(id);
    return data ? data.jersey : null;
  }
  
  /**
   * Get player team by ID
   */
  getPlayerTeam(playerId) {
    const id = String(playerId);
    const data = this.namesMap.get(id);
    return data ? data.teamId : null;
  }
  
  /**
   * Get full player data by ID
   */
  getPlayerData(playerId) {
    const id = String(playerId);
    return this.namesMap.get(id) || null;
  }
  
  /**
   * Load from sessionStorage cache
   */
  loadFromCache() {
    try {
      const cached = sessionStorage.getItem(this.cacheKey);
      if (!cached) return false;
      
      const data = JSON.parse(cached);
      
      // Check expiry
      if (data.timestamp && Date.now() - data.timestamp > this.cacheExpiry) {
        console.log('⏰ Player names cache expired');
        sessionStorage.removeItem(this.cacheKey);
        return false;
      }
      
      // Load into map
      if (data.players && Array.isArray(data.players)) {
        this.namesMap = new Map(data.players);
        
        // Validate: cache must have at least 100 players to be valid
        if (this.namesMap.size < 100) {
          console.warn(`⚠️ Cache has only ${this.namesMap.size} players (expected 100+) - clearing bad cache`);
          sessionStorage.removeItem(this.cacheKey);
          this.namesMap.clear();
          return false;
        }
        
        console.log(`✅ Loaded ${this.namesMap.size} player names from cache`);
        
        // Load Plus/Minus stats from HTML (async, but don't wait for it)
        this.loadPlayerStatsFromHTML().then(() => {
          // Save updated cache with Plus/Minus data
          this.saveToCache();
        }).catch(err => {
          console.warn('⚠️ Failed to load Plus/Minus from HTML:', err.message);
        });
      }
      
      this.isLoaded = true;
      return true;
      
    } catch (error) {
      console.error('❌ Failed to load from cache:', error);
      return false;
    }
  }
  
  /**
   * Save to sessionStorage cache
   */
  saveToCache() {
    try {
      // Don't save empty or invalid cache
      if (this.namesMap.size < 100) {
        console.warn(`⚠️ Not saving cache: only ${this.namesMap.size} players (expected 100+)`);
        return;
      }
      
      const data = {
        players: Array.from(this.namesMap.entries()),
        timestamp: Date.now()
      };
      
      sessionStorage.setItem(this.cacheKey, JSON.stringify(data));
      console.log(`💾 Cached ${this.namesMap.size} player names`);
      
    } catch (error) {
      console.error('❌ Failed to save to cache:', error);
    }
  }
  
  /**
   * Fetch single page of players (with CORS proxy fallback)
   * @private
   */
  async fetchPlayersPage(page = 1, perPage = 100, useLeagueFilter = true) {
    // Build URL - with or without league filter
    let url = `${this.apiUrl}?per_page=${perPage}&page=${page}`;
    if (useLeagueFilter && this.leagueId) {
      url += `&leagues=${this.leagueId}`;
    }
    
    console.log(`📥 Fetching players page ${page}${useLeagueFilter ? ` (league ${this.leagueId})` : ' (all leagues)'}...`);
    
    // Try direct fetch first
    try {
      const response = await fetch(url);
      
      if (response.ok) {
        console.log(`✅ Direct fetch succeeded for page ${page}`);
        return await response.json();
      }
      
      // If we get 400/404 from direct fetch, no need to try proxies
      if (response.status === 400 || response.status === 404) {
        throw new Error(`HTTP ${response.status} - No more pages`);
      }
    } catch (error) {
      // If it's a 400/404, throw immediately (no proxies needed)
      if (error.message.includes('400') || error.message.includes('404')) {
        throw error;
      }
      console.log(`⚠️ Direct fetch failed, trying CORS proxy...`);
    }
    
    // Fallback to CORS proxy
    const proxies = [
      'https://corsproxy.io/?',
      'https://api.allorigins.win/raw?url=',
      'https://cors-anywhere.herokuapp.com/'
    ];
    
    for (let i = 0; i < proxies.length; i++) {
      try {
        const proxyUrl = proxies[i] + encodeURIComponent(url);
        console.log(`🔄 Trying proxy ${i + 1}/${proxies.length}...`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
        
        const response = await fetch(proxyUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        console.log(`✅ Proxy ${i + 1} succeeded for page ${page}`);
        return await response.json();
        
      } catch (error) {
        const errorMsg = error.name === 'AbortError' ? 'timeout (15s)' : error.message;
        console.warn(`⚠️ Proxy ${i + 1} failed:`, errorMsg);
        
        if (i === proxies.length - 1) {
          throw new Error(`All proxies failed for page ${page}`);
        }
      }
    }
  }
  
  /**
   * Load player statistics (Plus/Minus) from league HTML page
   * @param {Function} onProgress - Optional callback for progress updates
   * @private
   */
  async loadPlayerStatsFromHTML(onProgress = null) {
    try {
      console.log('🔄 Loading player Plus/Minus stats from league HTML via CORS proxy...');
      
      const leaguePageUrl = 'https://ibasketball.co.il/league/2025-2/';
      let html = null;
      
      // Use CORS proxies (direct fetch will fail due to CORS policy)
      // Ordered by reliability - corsproxy.io is most reliable
      const proxies = [
        { 
          url: 'https://corsproxy.io/?',  // Most reliable - try first
          parseResponse: (response) => response.text(),
          timeout: 8000
        },
        { 
          url: 'https://api.allorigins.win/get?url=',  // /get works better than /raw
          parseResponse: async (response) => {
            const data = await response.json();
            return data.contents;
          },
          timeout: 8000
        },
        { 
          url: 'https://api.allorigins.win/raw?url=',  // Fallback
          parseResponse: (response) => response.text(),
          timeout: 5000  // Shorter timeout for known-problematic proxy
        }
      ];
      
      for (let i = 0; i < proxies.length; i++) {
        try {
          const proxy = proxies[i];
          const proxyUrl = proxy.url + encodeURIComponent(leaguePageUrl);
          console.log(`🔄 Trying proxy ${i + 1}/${proxies.length}...`);
          
          // Report progress to UI
          if (onProgress) {
            onProgress({ stage: 'proxy', proxy: i + 1, total: proxies.length });
          }
          
          // Use AbortController with timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), proxy.timeout || 8000);
          
          const response = await fetch(proxyUrl, { signal: controller.signal });
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          
          html = await proxy.parseResponse(response);
          
          if (html && html.length > 1000) {
            console.log(`✅ Proxy ${i + 1} succeeded for league HTML`);
            break;
          } else {
            throw new Error('Response too short');
          }
          
        } catch (error) {
          const errorMsg = error.name === 'AbortError' ? `timeout (${proxies[i].timeout}ms)` : error.message;
          console.warn(`⚠️ Proxy ${i + 1} failed:`, errorMsg);
          if (i === proxies.length - 1) {
            throw new Error('All proxies failed for league HTML');
          }
        }
      }
      
      if (!html) {
        throw new Error('Failed to fetch league HTML');
      }
      
      // Parse HTML to extract Plus/Minus data
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Find player rows with data-pm attribute
      const playerRows = doc.querySelectorAll('tr[data-pm]');
      let statsCount = 0;
      
      playerRows.forEach(row => {
        const playerId = row.getAttribute('data-id') || row.getAttribute('data-player');
        const plusMinus = row.getAttribute('data-pm');
        
        if (playerId && plusMinus !== null && plusMinus !== '') {
          const id = String(playerId);
          const existingData = this.namesMap.get(id);
          
          if (existingData) {
            // Update existing player data with Plus/Minus
            existingData.totalPlusMinus = parseFloat(plusMinus) || 0;
            statsCount++;
          }
        }
      });
      
      console.log(`✅ Loaded Plus/Minus stats for ${statsCount} players from HTML`);
      return statsCount;
      
    } catch (error) {
      console.error('❌ Failed to load player stats from HTML:', error);
      // Don't throw - this is optional enrichment
      return 0;
    }
  }
  
  /**
   * Load all player names from API with pagination
   * @param {Function} onProgress - Optional callback for progress updates
   * @returns {Promise<Map>} Map of playerId → player data
   */
  async loadAllPlayerNames(onProgress = null) {
    if (this.isLoading) {
      console.log('⏳ Already loading player names...');
      return this.namesMap;
    }
    
    if (this.isLoaded && this.namesMap.size > 0) {
      console.log('✅ Player names already loaded');
      return this.namesMap;
    }
    
    this.isLoading = true;
    
    try {
      console.log('🔄 Loading player names from SportsPress API...');
      if (onProgress) onProgress({ stage: 'fetching', percent: 10, message: 'Fetching players...' });
      
      const allPlayers = [];
      let page = 1;
      let hasMore = true;
      
      // Fetch all pages
      while (hasMore) {
        try {
          const players = await this.fetchPlayersPage(page, 100);
          
          if (players.length === 0) {
            hasMore = false;
          } else {
            allPlayers.push(...players);
            page++;
            console.log(`📥 Loaded ${allPlayers.length} players so far...`);
            
            // Update progress
            const percent = 10 + (Math.min(page * 10, 60));
            if (onProgress) {
              onProgress({ 
                stage: 'fetching', 
                percent, 
                message: `Fetched ${allPlayers.length} players...` 
              });
            }
          }
        } catch (error) {
          // If we get 400/404, we've reached the end
          if (error.message.includes('400') || error.message.includes('404') || error.message.includes('All proxies failed')) {
            console.log(`ℹ️ Reached end of players at page ${page} (${allPlayers.length} total)`);
            hasMore = false;
          } else {
            // For other errors, rethrow
            throw error;
          }
        }
      }
      
      console.log(`✅ Fetched ${allPlayers.length} players from API`);
      if (onProgress) onProgress({ stage: 'processing', percent: 70, message: 'Processing data...' });
      
      // Build the mapping
      allPlayers.forEach(player => {
        const playerId = String(player.id);
        const name = player.title?.rendered || '';
        const jersey = player.number || '';
        const teamId = player.current_teams?.[0] || null;
        
        if (playerId && name) {
          this.namesMap.set(playerId, {
            name: name,
            jersey: jersey,
            teamId: teamId
          });
        }
      });
      
      console.log(`✅ Built mapping for ${this.namesMap.size} players`);
      
      // Load Plus/Minus stats from HTML (pass progress callback)
      if (onProgress) onProgress({ stage: 'stats', percent: 85, message: 'Loading Plus/Minus stats...' });
      await this.loadPlayerStatsFromHTML(onProgress);
      
      if (onProgress) onProgress({ stage: 'complete', percent: 100, message: 'Complete!' });
      
      // Save to cache
      this.saveToCache();
      
      this.isLoaded = true;
      return this.namesMap;
      
    } catch (error) {
      console.error('❌ Failed to load player names:', error);
      
      // Save what we have so far (if >= 100)
      if (this.namesMap.size >= 100) {
        console.log(`💾 Saving ${this.namesMap.size} players loaded before error...`);
        this.saveToCache();
        this.isLoaded = true;
      }
      
      if (onProgress) onProgress({ stage: 'error', error });
      throw error;
      
    } finally {
      this.isLoading = false;
    }
  }
  
  /**
   * Load missing players by scanning ALL players (without league filter)
   * @param {Array<string>} missingIds - Array of player IDs to find
   * @returns {Promise<number>} Number of players successfully loaded
   */
  async loadMissingPlayers(missingIds) {
    if (!missingIds || missingIds.length === 0) {
      console.log('ℹ️ No missing players to load');
      return 0;
    }
    
    console.log(`🔄 Searching for ${missingIds.length} missing players in ALL players (no league filter)...`);
    console.log(`   Missing IDs: ${missingIds.join(', ')}`);
    
    const missingSet = new Set(missingIds.map(id => String(id)));
    let successCount = 0;
    let page = 1;
    let hasMore = true;
    let totalScanned = 0;
    
    // Scan players without league filter until we find all missing ones
    while (hasMore && missingSet.size > 0) {
      try {
        console.log(`📥 Scanning page ${page} (found ${successCount}/${missingIds.length} so far)...`);
        
        const players = await this.fetchPlayersPage(page, 100, false); // false = no league filter
        
        if (players.length === 0) {
          hasMore = false;
          console.log(`ℹ️ Reached end of players at page ${page}`);
        } else {
          totalScanned += players.length;
          
          // Check each player
          players.forEach(player => {
            const playerId = String(player.id);
            
            if (missingSet.has(playerId)) {
              const name = player.title?.rendered || '';
              const jersey = player.number || '';
              const teamId = player.current_teams?.[0] || null;
              
              if (name) {
                this.namesMap.set(playerId, { name, jersey, teamId });
                console.log(`✅ Found missing player: ${name} (#${jersey}) - ID: ${playerId}`);
                missingSet.delete(playerId);
                successCount++;
              }
            }
          });
          
          page++;
          
          // Safety limit: don't scan more than 30 pages (3000 players)
          if (page > 30) {
            console.warn(`⚠️ Reached safety limit (30 pages / 3000 players)`);
            hasMore = false;
          }
        }
      } catch (error) {
        console.error(`❌ Error scanning page ${page}:`, error.message);
        
        // If we get errors, try to continue
        if (error.message.includes('400') || error.message.includes('404')) {
          hasMore = false;
        }
      }
    }
    
    console.log(`📊 Scan complete: scanned ${totalScanned} players across ${page - 1} pages`);
    
    if (successCount > 0) {
      // Save updated cache
      this.saveToCache();
      console.log(`✅ Successfully loaded ${successCount}/${missingIds.length} missing players`);
    }
    
    if (missingSet.size > 0) {
      console.warn(`⚠️ Still missing ${missingSet.size} players:`, Array.from(missingSet));
    }
    
    return successCount;
  }
  
  /**
   * Load player names from Supabase (fastest!)
   * @param {Function} onProgress - Optional callback for progress updates during HTML stats loading
   */
  async loadFromSupabase(onProgress = null) {
    if (!this.supabase) {
      console.log('ℹ️ Supabase not configured, skipping Supabase load');
      return 0;
    }

    try {
      console.log('📥 Loading player names from Supabase...');
      
      const { data, error } = await this.supabase
        .from('player_names')
        .select('player_id, name, jersey, team_id');

      if (error) {
        console.error('❌ Supabase load error:', error);
        return 0;
      }

      if (data && data.length > 0) {
        // Load into map
        data.forEach(player => {
          this.namesMap.set(String(player.player_id), {
            name: player.name,
            jersey: player.jersey,
            teamId: player.team_id
          });
        });

        console.log(`✅ Loaded ${data.length} player names from Supabase (instant!)`);
        this.isLoaded = true;
        
        // Load Plus/Minus stats from HTML (pass progress callback)
        await this.loadPlayerStatsFromHTML(onProgress);
        
        // Cache for next time
        this.saveToCache();
        
        return data.length;
      }

      return 0;

    } catch (error) {
      console.error('❌ Supabase load failed:', error);
      return 0;
    }
  }
  
  /**
   * Clear cache
   */
  clearCache() {
    sessionStorage.removeItem(this.cacheKey);
    this.namesMap.clear();
    this.isLoaded = false;
    console.log('🗑️ Player names cache cleared');
  }
  
  /**
   * Get statistics
   */
  getStats() {
    return {
      totalPlayers: this.namesMap.size,
      isLoaded: this.isLoaded,
      isLoading: this.isLoading,
      hasCachedData: this.hasCachedNames()
    };
  }
}

// Export to window
window.IBBAPlayerNames = IBBAPlayerNames;
console.log('👥 IBBA Player Names module loaded successfully! (Hybrid: Supabase + API)');
