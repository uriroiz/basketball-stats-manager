/**
 * IBBAPlayerNames - Load player names from SportsPress API
 * 
 * Uses the /wp-json/sportspress/v2/players endpoint to fetch all player data
 * Referenced identities use bounded include queries and a shared persistent name cache.
 * Seasonal team, jersey and Plus/Minus data stay in the season-specific map/cache.
 */

class IBBAPlayerNames {
  constructor(supabaseClient = null) {
    const config = window.appConfig || {};
    this.namesMap = new Map(); // playerId → { name, jersey, teamId }
    this.seasonKey=config.seasonKey || config.key || '2025-26';
    this.sourceState='idle';
    this.isLoading = false;
    this.isLoaded = false;
    this.supabase = supabaseClient; // Optional Supabase client
    this.apiUrl = 'https://ibasketball.co.il/wp-json/sportspress/v2/players';
    this.searchApiUrl = 'https://ibasketball.co.il/wp-json/wp/v2/search';
    this.leagueId = String(config.leagueId || 119474);
    this.playersPageUrl = config.playersPageUrl || 'https://ibasketball.co.il/league/2025-2/';
    this.cacheKey = `ibba_player_names_api_${config.seasonId || 119472}_v8`;
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes (fast refresh for admin changes)
    this.identityCacheKey = 'ibba_player_identities_v1';
    this.identityExpiry = 7 * 24 * 60 * 60 * 1000;
    this.identitiesMap = new Map();
    this._generation = 0;
    this._activeLoad = null;
    this._requests = new Set();
    this._sourceRetryAt = { json: 0, search: 0, text: 0 };
    this._verifiedNameSnapshot = undefined;
    this._catalogLoaded = false;
    this._plusMinusMap = new Map();
    this._statsVerifiedAt = null;
    this._membershipVerifiedAt = null;
    
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
    this._readIdentities(this._readStorage('localStorage', this.identityCacheKey));
    for (const [id, identity] of this.identitiesMap) this._applyIdentity(id, identity);
    const legacy = this._readStorage('sessionStorage', this.cacheKey);
    let migrated = false;
    if (Array.isArray(legacy?.players)) {
      this._statsVerifiedAt = Object.hasOwn(legacy, 'statsVerifiedAt') ? legacy.statsVerifiedAt : legacy.timestamp;
      this._membershipVerifiedAt = Object.hasOwn(legacy, 'membershipVerifiedAt') ? legacy.membershipVerifiedAt : legacy.timestamp;
      for (const entry of legacy.players) {
        if (!Array.isArray(entry) || entry.length !== 2) continue;
        const [id, value] = entry;
        const identity = this._identity(id, value, value?.verifiedAt ?? legacy.timestamp);
        if (!identity) continue;
        const key = String(id), previous = this.identitiesMap.get(key);
        if (!previous || previous.verifiedAt < identity.verifiedAt) {
          this.identitiesMap.set(key, identity);
          this._applyIdentity(key, identity);
          migrated = true;
        }
        // These fields belong only to this loader's configured season.
        const seasonal = this.namesMap.get(key);
        if (this._freshSeasonData(this._membershipVerifiedAt)) {
          for (const field of ['jersey', 'teamId']) if (value[field] != null) seasonal[field] = value[field];
        }
        if (this._freshSeasonData(this._statsVerifiedAt) && Number.isFinite(value.totalPlusMinus)) {
          seasonal.totalPlusMinus = value.totalPlusMinus;
          this._plusMinusMap.set(key, value.totalPlusMinus);
        }
      }
    }
    if (migrated) this._saveIdentities();
    this.isLoaded = this.namesMap.size > 0;
    return this.isLoaded;
  }

  _readStorage(storageName, key) {
    try {
      const storage = storageName === 'localStorage' ? localStorage : sessionStorage;
      const data = storage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (_) { return null; }
  }

  _name(value) {
    if (typeof value !== 'string') return null;
    const parsed = new DOMParser().parseFromString(value, 'text/html');
    const name = parsed.body?.textContent?.trim();
    return name || null;
  }

  _freshSeasonData(timestamp) {
    return Number.isFinite(timestamp) && timestamp > 0 && timestamp <= Date.now() && Date.now() - timestamp <= this.cacheExpiry;
  }

  _officialLink(value, id) {
    if (typeof value !== 'string') return null;
    try {
      const url = new URL(value, 'https://ibasketball.co.il');
      if (url.hostname !== 'ibasketball.co.il' || !['https:', 'http:'].includes(url.protocol)) return null;
      const postId = url.searchParams.get('p');
      if (/^\d+$/.test(postId || '')) return /^[1-9]\d*$/.test(postId) && postId === String(id) ? url.href : null;
      return /^\/player\/[^/]+/.test(url.pathname) ? url.href : null;
    } catch (_) { return null; }
  }

  _identity(id, value, timestamp) {
    if (!/^[1-9]\d*$/.test(String(id)) || !value || typeof value !== 'object') return null;
    const name = this._name(value.name);
    if (!name || !Number.isFinite(timestamp) || timestamp <= 0 || timestamp > Date.now()) return null;
    return { name, link: this._officialLink(value.link, id), verifiedAt: timestamp };
  }

  _identityLink(value, id) {
    const link = this._officialLink(value, id), previous = this.identitiesMap.get(id)?.link;
    if (!link) return previous || null;
    // A post URL verifies the same numeric ID but carries no new profile bridge.
    if (previous && new URL(link).searchParams.get('p') === id) return previous;
    return link;
  }

  _readIdentities(data, target = this.identitiesMap) {
    if (!Array.isArray(data?.players)) return;
    for (const entry of data.players) {
      if (!Array.isArray(entry) || entry.length !== 2) continue;
      const [id, value] = entry, identity = this._identity(id, value, value?.verifiedAt);
      if (!identity) continue;
      const key = String(id), previous = target.get(key);
      if (!previous || previous.verifiedAt <= identity.verifiedAt) target.set(key, identity);
    }
  }

  _registerIdentity(id, identity) {
    if (identity.link) window.historyView?.service?.registerPlayer({ id: Number(id), link: identity.link });
  }

  _applyIdentity(id, identity) {
    this.namesMap.set(id, { jersey: '', teamId: null, ...this.namesMap.get(id), ...identity });
    if (this._plusMinusMap.has(id)) this.namesMap.get(id).totalPlusMinus = this._plusMinusMap.get(id);
    this._registerIdentity(id, identity);
  }

  _saveIdentities() {
    const identities = new Map();
    this._readIdentities(this._readStorage('localStorage', this.identityCacheKey), identities);
    for (const [id, identity] of this.identitiesMap) {
      const previous = identities.get(id);
      if (!previous || previous.verifiedAt <= identity.verifiedAt) identities.set(id, identity);
    }
    const players = Array.from(identities).sort((a, b) => b[1].verifiedAt - a[1].verifiedAt).slice(0, 5000);
    try { localStorage.setItem(this.identityCacheKey, JSON.stringify({ players })); } catch (_) {}
  }
  
  /**
   * Save to sessionStorage cache
   */
  saveToCache() {
    this._saveIdentities();
    try {
      if (!this.namesMap.size) return;
      const data = {
        players: Array.from(this.namesMap.entries()),
        timestamp: Date.now(),
        statsVerifiedAt: this._statsVerifiedAt,
        membershipVerifiedAt: this._membershipVerifiedAt
      };
      
      sessionStorage.setItem(this.cacheKey, JSON.stringify(data));
      console.log(`💾 Cached ${this.namesMap.size} player names`);
      
    } catch (_) { /* Storage is an optional optimization. */ }
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
    const directController = new AbortController();
    const directTimeout = setTimeout(()=>directController.abort(),12000);
    try {
      const response = await fetch(url,{signal:directController.signal});
      
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
    } finally { clearTimeout(directTimeout); }
    
    // Fallback to CORS proxy
    const proxies = [`${window.appConfig?.ibbaProxyUrl || '/api/ibba'}?url=`];
    
    for (let i = 0; i < proxies.length; i++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      try {
        const proxyUrl = proxies[i] + encodeURIComponent(url);
        console.log(`🔄 Trying proxy ${i + 1}/${proxies.length}...`);
        
        const response = await fetch(proxyUrl, { signal: controller.signal });
        
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
      } finally { clearTimeout(timeoutId); }
    }
  }
  
  /**
   * Load player statistics (Plus/Minus) from league HTML page
   * @param {Function} onProgress - Optional callback for progress updates
   * @private
   */
  async loadPlayerStatsFromHTML(onProgress = null, operation = null) {
    const generation = this._generation;
    const current = () => operation ? this._isCurrent(operation) : generation === this._generation;
    try {
      if (!current()) return 0;
      if (onProgress) onProgress({ stage: 'proxy', proxy: 1, total: 1 });
      const html = await this._fetchOfficial(this.playersPageUrl, operation, 'text', true);
      if (!current()) return 0;
      if (typeof html !== 'string' || html.length < 1000) throw new Error('Response too short');
      
      // Parse HTML to extract Plus/Minus data
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const season=window.IBBASeasons?.getSeason(this.seasonKey);
      if(season && window.IBBAPlayerHistory) {
        const records=new window.IBBAPlayerHistory().parseOfficialSummaries(doc,season);
        this.addOfficialSummaryNames(records, operation);
      }
      
      // Find player rows with data-pm attribute
      const playerRows = doc.querySelectorAll('tr[data-pm]');
      let statsCount = 0;
      this._plusMinusMap.clear();
      for (const data of this.namesMap.values()) delete data.totalPlusMinus;
      this._statsVerifiedAt = Date.now();
      
      playerRows.forEach(row => {
        const playerId = row.getAttribute('data-id') || row.getAttribute('data-player');
        const plusMinus = row.getAttribute('data-pm');
        
        if (/^[1-9]\d*$/.test(String(playerId)) && plusMinus !== null && plusMinus !== '') {
          const id = String(playerId);
          const existingData = this.namesMap.get(id);
          const value = parseFloat(plusMinus);
          if (!Number.isFinite(value)) return;
          this._plusMinusMap.set(id, value);
          
          if (existingData) {
            // Update existing player data with Plus/Minus
            existingData.totalPlusMinus = value;
            statsCount++;
          }
        }
      });
      
      console.log(`✅ Loaded Plus/Minus stats for ${statsCount} players from HTML`);
      if (operation) this._notifyProgress(operation);
      return statsCount;
      
    } catch (error) {
      console.warn('⚠️ Failed to load player stats from HTML:', error);
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
    
    if (this._catalogLoaded && this.namesMap.size > 0) {
      console.log('✅ Player names already loaded');
      return this.namesMap;
    }
    
    this.isLoading = true;
    this.sourceState='loading';
    // Admin callers consume this map as the selected league catalog. Shared
    // identities remain available in identitiesMap but are not catalog members.
    this.namesMap.clear();
    this.isLoaded = false;
    
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
          if (error.message.includes('400') || error.message.includes('404')) {
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
      this._membershipVerifiedAt = Date.now();
      allPlayers.forEach(player => {
        const playerId = String(player.id);
        const jersey = player.number || '';
        const teamId = player.current_teams?.[0] || null;
        if (this._acceptPlayer(player, new Set([playerId]))) {
          Object.assign(this.namesMap.get(playerId), { jersey, teamId });
        }
      });
      
      console.log(`✅ Built mapping for ${this.namesMap.size} players`);
      
      // Load Plus/Minus stats from HTML (pass progress callback)
      if (onProgress) onProgress({ stage: 'stats', percent: 85, message: 'Loading Plus/Minus stats...' });
      await this.loadPlayerStatsFromHTML(onProgress);
      if(!this.namesMap.size) throw new Error('לא ניתן לטעון שמות שחקנים מאומתים מהאיגוד');
      
      if (onProgress) onProgress({ stage: 'complete', percent: 100, message: 'Complete!' });
      
      // Save to cache
      this.saveToCache();
      
      this.isLoaded = true;
      this._catalogLoaded = true;
      this.sourceState='ready';
      return this.namesMap;
      
    } catch (error) {
      console.warn('Player-name API unavailable; checking official summaries:',error.message);
      await this.loadPlayerStatsFromHTML(onProgress);
      this.sourceState=this.namesMap.size?'partial':'error';
      if(this.namesMap.size) {
        this.saveToCache();this.isLoaded=true;
        return this.namesMap;
      }
      
      if (onProgress) onProgress({ stage: 'error', error });
      throw error;
      
    } finally {
      this.isLoading = false;
    }
  }

  addOfficialSummaryNames(records, operation = null) {
    if (operation && !this._isCurrent(operation)) return;
    let changed = false;
    for (const record of records || []) {
      const match = /^post:([1-9]\d*)$/.exec(record.playerRef || '');
      const name = this._name(record.name);
      if (!match || !name) continue;
      const id = match[1];
      // The API wins when it already verified this identity during the same load.
      if (operation?.verified.has(id)) continue;
      const identity = { name, link: this._identityLink(record.playerUrl, id), verifiedAt: Date.now() };
      this.identitiesMap.set(id, identity);
      this._applyIdentity(id, identity);
      operation?.verified.add(id);
      changed = true;
    }
    if (changed) this._saveIdentities();
  }

  _acceptPlayer(player, requested, operation = null) {
    if (operation && !this._isCurrent(operation)) return false;
    const id = String(player?.id), name = this._name(player?.title?.rendered);
    if (!/^[1-9]\d*$/.test(id) || !requested.has(id) || !name) return false;
    const identity = { name, link: this._identityLink(player.link, id), verifiedAt: Date.now() };
    this.identitiesMap.set(id, identity);
    this._applyIdentity(id, identity);
    operation?.verified.add(id);
    return true;
  }

  _acceptSearchPlayer(player, requested, operation) {
    if (!Number.isSafeInteger(player?.id) || player.id <= 0 || player.type !== 'post' || player.subtype !== 'sp_player') return false;
    try {
      const url = new URL(player.url);
      if (url.protocol !== 'https:' || url.hostname !== 'ibasketball.co.il' || url.port || url.username || url.password
        || !/^\/player\/[^/]+\/?$/.test(url.pathname) || !this._officialLink(url.href, String(player.id))) return false;
      return this._acceptPlayer({ id: player.id, title: { rendered: player.title }, link: url.href }, requested, operation);
    } catch (_) { return false; }
  }

  _isCurrent(operation) {
    return !operation.cancelled && operation.generation === this._generation && operation.subscribers.some(subscriber => {
      try { return subscriber.isCurrent(); } catch (_) { return false; }
    });
  }

  _notifyProgress(operation) {
    if (!this._isCurrent(operation)) return;
    const progress = { total: operation.ids.length, resolved: operation.ids.filter(id => this.namesMap.has(id)).length };
    for (const subscriber of operation.subscribers) {
      try { if (subscriber.isCurrent()) subscriber.onProgress(progress); } catch (_) { /* UI callbacks do not invalidate source data. */ }
    }
  }

  cancel() {
    this._generation++;
    if (this._activeLoad) this._activeLoad.cancelled = true;
    this._activeLoad = null;
    for (const request of this._requests) {
      clearTimeout(request.timer);
      request.controller.abort();
    }
    this._requests.clear();
    this.isLoading = false;
  }

  async _fetchOfficial(url, operation = null, type = 'json', proxyOnly = false) {
    const proxy = `${window.appConfig?.ibbaProxyUrl || '/api/ibba'}?url=${encodeURIComponent(url)}`;
    const lane = type === 'text' ? 'text' : url.startsWith(this.searchApiUrl) ? 'search' : 'json';
    let lastError = null, deniedError = null;
    // Public search exposes CORS; it is outside the proxy's deliberately narrow allowlist.
    for (const source of lane === 'search' ? [url] : proxyOnly ? [proxy] : [url, proxy]) {
      if (operation && !this._isCurrent(operation)) throw new Error('Player load cancelled');
      if (!this._sourceAvailable(lane)) throw new Error('Player source cooling down');
      const controller = new AbortController();
      const request = { controller, timer: setTimeout(() => controller.abort(), 12000) };
      this._requests.add(request);
      try {
        const response = await fetch(source, { signal: controller.signal });
        if (controller.signal.aborted || (operation && !this._isCurrent(operation))) throw new Error('Player load cancelled');
        if (!response.ok) {
          const error = new Error(`HTTP ${response.status}`);
          error.status = response.status;
          error.retryAfter = response.headers?.get('Retry-After');
          throw error;
        }
        return await response[type]();
      } catch (error) {
        if (operation && !this._isCurrent(operation)) throw error;
        lastError = error;
        if ([401, 403, 429].includes(error.status) && (deniedError?.status !== 429)) deniedError = error;
      } finally {
        clearTimeout(request.timer);
        this._requests.delete(request);
      }
    }
    const error = deniedError || lastError || new Error('Player source unavailable');
    if (deniedError) {
      const retryAfter = error.retryAfter;
      const seconds = retryAfter == null || retryAfter === '' ? NaN : Number(retryAfter);
      const retryAt = Number.isFinite(seconds) ? Date.now() + seconds * 1000 : Date.parse(retryAfter);
      const until = Math.max(Date.now() + 60000, Number.isFinite(retryAt) ? retryAt : 0);
      const lanes = error.status === 429 ? ['json', 'search', 'text'] : [lane];
      for (const sourceLane of lanes) this._sourceRetryAt[sourceLane] = Math.max(this._sourceRetryAt[sourceLane], until);
    }
    throw error;
  }

  _sourceAvailable(type) {
    return Date.now() >= this._sourceRetryAt[type];
  }

  fetchPlayerById(id, operation = null) {
    return this._fetchOfficial(`${this.apiUrl}/${id}`, operation);
  }

  loadReferencedPlayers(games, isCurrent = () => true, onProgress = () => {}, { refresh = false } = {}) {
    const ids = Array.from(new Set((games || []).flatMap(game => (game.players || []).map(player => String(player.playerId)))))
      .filter(id => /^[1-9]\d*$/.test(id)).sort();
    const key = ids.join(',');
    if (!refresh && this._activeLoad?.key === key && this._isCurrent(this._activeLoad)) {
      this._activeLoad.subscribers.push({ isCurrent, onProgress });
      this._notifyProgress(this._activeLoad);
      return this._activeLoad.promise;
    }
    if (refresh || this._activeLoad) this.cancel();
    if (refresh && this._verifiedNameSnapshot === null) this._verifiedNameSnapshot = undefined;
    for (const id of ids) {
      const identity = this.identitiesMap.get(id);
      if (identity) this._applyIdentity(id, identity);
    }
    const operation = { key, ids, generation: this._generation, subscribers: [{ isCurrent, onProgress }], verified: new Set(), cancelled: false };
    this._activeLoad = operation;
    this.isLoading = true;
    this.sourceState = 'loading';
    this._notifyProgress(operation);
    operation.promise = this._loadReferences(operation, refresh);
    return operation.promise;
  }

  async _loadVerifiedNameSnapshot(operation) {
    if (!this._isCurrent(operation) || operation.ids.every(id => this.namesMap.has(id))) return;
    let data = this._verifiedNameSnapshot;
    if (data === undefined) {
      const controller = new AbortController();
      const request = { controller, timer: setTimeout(() => controller.abort(), 5000) };
      this._requests.add(request);
      try {
        const response = await fetch('/data/ibba-player-identities.json?v=2.3.5', { signal: controller.signal });
        if (controller.signal.aborted || !this._isCurrent(operation)) return;
        if (!response.ok || Number(response.headers?.get('Content-Length')) > 5 * 1024 * 1024) throw new Error('Verified names unavailable');
        data = await response.json();
        if (controller.signal.aborted || !this._isCurrent(operation)) return;
        const generatedAt = Date.parse(data?.generatedAt);
        if (data?.schemaVersion !== 1 || !Number.isFinite(generatedAt) || generatedAt <= 0 || generatedAt > Date.now()
          || !Array.isArray(data.players) || data.players.length > 5000 || JSON.stringify(data).length > 5 * 1024 * 1024) {
          throw new Error('Invalid verified names');
        }
        this._verifiedNameSnapshot = data;
      } catch (_) {
        if (this._isCurrent(operation) && !controller.signal.aborted) this._verifiedNameSnapshot = null;
        return; // Live sources remain available when the optional names file fails.
      } finally {
        clearTimeout(request.timer);
        this._requests.delete(request);
      }
    }
    if (!data || !this._isCurrent(operation)) return;
    const requested = new Set(operation.ids);
    const sources = new Set(['2023-24', '2024-25', '2025-26'].map(key => window.IBBASeasons?.getSeason(key)?.playersPageUrl).filter(Boolean));
    let changed = false;
    for (const record of data.players) {
      if (!Number.isSafeInteger(record?.id) || record.id <= 0 || !requested.has(String(record.id)) || !sources.has(record.sourceUrl)
        || record.verifiedAt > Date.parse(data.generatedAt)) continue;
      const id = String(record.id);
      let link;
      try {
        link = new URL(record.link);
        if (link.protocol !== 'https:' || link.hostname !== 'ibasketball.co.il' || link.port || link.username || link.password
          || link.pathname !== '/' || link.hash || link.search !== `?p=${id}`) continue;
      } catch (_) { continue; }
      const identity = this._identity(id, record, record.verifiedAt), previous = this.identitiesMap.get(id);
      if (!identity || (previous && previous.verifiedAt >= identity.verifiedAt)) continue;
      identity.link = this._identityLink(link.href, id);
      this.identitiesMap.set(id, identity);
      this._applyIdentity(id, identity);
      changed = true;
    }
    if (changed) {
      // Preserve collection timestamps: a bundled identity is not a live verification.
      this._saveIdentities();
      this._notifyProgress(operation);
    }
  }

  async _loadReferences(operation, refresh) {
    const targets = operation.ids.filter(id => {
      const cached = this.identitiesMap.get(id);
      return refresh || !cached || Date.now() - cached.verifiedAt > this.identityExpiry;
    });
    try {
      const collection = (async () => {
        await this._loadIdentityBatches(targets, operation, true);
        await this._loadIdentityBatches(targets.filter(id => !operation.verified.has(id)), operation, false);
      })();
      await Promise.all([collection, this.loadPlayerStatsFromHTML(null, operation), this._loadVerifiedNameSnapshot(operation)]);
      const unresolved = targets.filter(id => !operation.verified.has(id));
      let cursor = 0, resolved = 0;
      await Promise.all(Array.from({ length: Math.min(6, unresolved.length) }, async () => {
        while (cursor < unresolved.length && this._isCurrent(operation) && this._sourceAvailable('json')) {
          const id = unresolved[cursor++];
          try {
            const player = await this.fetchPlayerById(id, operation);
            if (!this._isCurrent(operation)) return;
            if (this._acceptPlayer(player, new Set([id]), operation)) {
              this._saveIdentities();
              if (++resolved % 6 === 0) this._notifyProgress(operation);
            }
          } catch (_) { /* Preserve known identities when a source is unavailable. */ }
        }
      }));
      if (this._isCurrent(operation)) {
        const resolvedCount = operation.ids.filter(id => this.namesMap.has(id)).length;
        const incomplete = resolvedCount < operation.ids.length || targets.some(id => !operation.verified.has(id));
        this.sourceState = incomplete ? (resolvedCount ? 'partial' : 'error') : 'ready';
        this.isLoaded = resolvedCount > 0;
        this.saveToCache();
      }
      return this.namesMap;
    } finally {
      if (this._activeLoad === operation) {
        this.isLoading = false;
        this._notifyProgress(operation);
        this._activeLoad = null;
      }
    }
  }

  async _loadIdentityBatches(targets, operation, publicSearch) {
    const batches = [];
    for (let offset = 0; offset < targets.length; offset += 100) batches.push(targets.slice(offset, offset + 100));
    let cursor = 0;
    const lane = publicSearch ? 'search' : 'json';
    await Promise.all(Array.from({ length: Math.min(3, batches.length) }, async () => {
      while (cursor < batches.length && this._isCurrent(operation) && this._sourceAvailable(lane)) {
        const ids = batches[cursor++], requested = new Set(ids);
        const url = publicSearch
          ? `${this.searchApiUrl}?type=post&subtype=sp_player&include=${ids.join(',')}&per_page=100`
          : `${this.apiUrl}?include=${ids.join(',')}&per_page=100&_fields=id,title,link`;
        try {
          const players = await this._fetchOfficial(url, operation);
          if (!this._isCurrent(operation)) return;
          let changed = false;
          for (const player of Array.isArray(players) ? players : []) {
            const accepted = publicSearch ? this._acceptSearchPlayer(player, requested, operation) : this._acceptPlayer(player, requested, operation);
            if (accepted) changed = true;
          }
          if (changed) { this._saveIdentities(); this._notifyProgress(operation); }
        } catch (_) { /* Recover unresolved records through the next source; access denial pauses this lane. */ }
      }
    }));
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
        this._membershipVerifiedAt = Date.now();
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
    this.cancel();
    try { sessionStorage.removeItem(this.cacheKey); } catch (_) {}
    try { localStorage.removeItem(this.identityCacheKey); } catch (_) {}
    this.namesMap.clear();
    this.identitiesMap.clear();
    this._plusMinusMap.clear();
    this._catalogLoaded = false;
    this._statsVerifiedAt = null;
    this._membershipVerifiedAt = null;
    this.isLoaded = false;
    this.sourceState = 'idle';
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
