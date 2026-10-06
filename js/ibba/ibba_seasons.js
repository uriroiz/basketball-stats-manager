/* Shared IBBA seasons and isolated data loads. */
(function () {
  'use strict';
  const definitions = [
    ['2024-25', 2024, 19015, 18985, '2024-2-%d7%9c%d7%90%d7%95%d7%9e%d7%99%d7%aa'],
    ['2025-26', 2025, 119474, 119472, '2025-2'],
    ['2026-27', 2026, 119894, 119888, '2026-2']
  ];
  const seasons = definitions.map(([key, year, leagueId, seasonId, slug]) => Object.freeze({
    key, label: `${year}/${String(year + 1).slice(2)}`, leagueId, seasonId,
    regularTableId: key === '2024-25' ? 971628 : key === '2025-26' ? 1208926 : null,
    regularRoundCount: key === '2024-25' ? 26 : 30,
    // Team 596704 lost its title upstream. Its official match permalink preserves
    // the historical name: /match/705903-א-ס-רמהש-ירק-השדה-הפועל-בני-כפר-קאסם/.
    historicalTeamNames: Object.freeze(key === '2024-25' ? {596704:'הפועל בני כפר קאסם'} : {}),
    playersPageUrl: `https://ibasketball.co.il/league/${slug}/`,
    seasonMonths: Object.freeze(Array.from({length:12}, (_, i) => {
      const month = i + 10;
      return `${year + Math.floor((month - 1) / 12)}-${String((month - 1) % 12 + 1).padStart(2,'0')}`;
    }))
  }));
  const getSeason = key => seasons.find(s => s.key === key) || null;
  const canPrepareSeason = key => key === seasons[seasons.length - 1].key;
  function getUpcomingGames(games, key, now = new Date()) {
    if (!canPrepareSeason(key)) return [];
    return (games || []).filter(g=>g && (!g.seasonKey || g.seasonKey===key) && !g.hasResult && g.gameStatus!=='completed' && new Date(g.date)>now)
      .sort((a,b)=>new Date(a.date)-new Date(b.date));
  }
  function resolveInitialSeason(location, storage) {
    const params = new URLSearchParams(location?.search || '');
    if (params.has('season')) return getSeason(params.get('season'))?.key || '2026-27';
    try { return getSeason(storage?.getItem('ibba_selected_season'))?.key || '2026-27'; }
    catch (_) { return '2026-27'; }
  }
  class SelectionGate {
    constructor() { this.version = 0; }
    begin(key) { this.key = key; return ++this.version; }
    isCurrent(version) { return this.version === version; }
  }
  class IBBASeasonData {
    constructor(adapterFactory = season => new window.IBBAAdapter(season)) {
      this.adapterFactory = adapterFactory;
      this.cache = new Map();
      this.pending = new Map();
    }
    invalidateSeason(key) { for(const id of [key,`${key}:regular`]) {this.cache.delete(id);this.pending.delete(id);} }
    loadSeason(key, {refresh = false, regularOnly = false} = {}) {
      const season = getSeason(key);
      if (!season) return Promise.reject(new Error('Unknown season'));
      if (refresh) this.invalidateSeason(key);
      const cacheKey=regularOnly ? `${key}:regular` : key;
      if (this.cache.has(cacheKey)) return Promise.resolve(this.cache.get(cacheKey));
      if (this.pending.has(cacheKey)) return this.pending.get(cacheKey);
      const adapter = this.adapterFactory({...season,regularOnly});
      const request = adapter.fetchSeasonGames().then(raw => {
        const scheduleGames = raw.games.map(g => adapter.convertToInternalFormat(g));
        const result = {seasonKey:key, scheduleGames,
          analyticsGames:scheduleGames.filter(g => g.hasResult && g.hasPlayerStats),
          complete:raw.complete, failedMonths:raw.failedMonths};
        if (this.pending.get(cacheKey) === request && result.complete) this.cache.set(cacheKey,result);
        return result;
      }).finally(() => { if (this.pending.get(cacheKey) === request) this.pending.delete(cacheKey); });
      this.pending.set(cacheKey,request);
      return request;
    }
  }
  window.IBBASeasons = {seasons, getSeason, resolveInitialSeason, SelectionGate, canPrepareSeason, getUpcomingGames};
  window.IBBASeasonData = IBBASeasonData;
  window.IBBASeasonController = class {
    constructor(data) { this.data = data; this.gate = new SelectionGate(); }
    async select(key, apply, options = {}) {
      const version = this.gate.begin(key);
      try {
        const result = await this.data.loadSeason(key, options);
        if (this.gate.isCurrent(version)) await apply(result, () => this.gate.isCurrent(version));
      } catch (error) {
        if (this.gate.isCurrent(version)) throw error;
      }
    }
  };
})();
