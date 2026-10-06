/* Shared IBBA seasons and isolated data loads. */
(function () {
  'use strict';
  // Official regular schedule audited 2026-10-06. New event IDs stay unverified.
  const verified2026Rounds=Object.freeze({"1502015":1,"1502010":1,"1502011":1,"1502012":1,"1502013":1,"1502014":1,"1502009":1,"1502029":2,"1502024":2,"1502026":2,"1502028":2,"1502027":2,"1502030":2,"1502025":2,"1502042":3,"1502043":3,"1502037":3,"1502038":3,"1502041":3,"1502040":3,"1502036":3,"1502081":4,"1502074":4,"1502078":4,"1502075":4,"1502077":4,"1502076":4,"1502080":4,"1502086":5,"1502088":5,"1502082":5,"1502083":5,"1502089":5,"1502084":5,"1502087":5,"1502094":6,"1502091":6,"1502095":6,"1502093":6,"1502097":6,"1502090":6,"1502096":6,"1502098":7,"1502102":7,"1502099":7,"1502105":7,"1502104":7,"1502101":7,"1502103":7,"1502113":8,"1502117":8,"1502118":8,"1502115":8,"1502116":8,"1502112":8,"1502119":8,"1502129":9,"1502128":9,"1502125":9,"1502126":9,"1502132":9,"1502127":9,"1502130":9,"1502143":10,"1502144":10,"1502141":10,"1502142":10,"1502138":10,"1502139":10,"1502140":10,"1502155":11,"1502151":11,"1502156":11,"1502157":11,"1502153":11,"1502154":11,"1502152":11,"1502159":12,"1502164":12,"1502158":12,"1502165":12,"1502160":12,"1502163":12,"1502162":12,"1502172":13,"1502175":13,"1502176":13,"1502171":13,"1502177":13,"1502173":13,"1502178":13,"1502184":14,"1502183":14,"1502179":14,"1502182":14,"1502180":14,"1502181":14,"1502185":14,"1502193":15,"1502192":15,"1502197":15,"1502191":15,"1502194":15,"1502195":15,"1502196":15,"1502199":16,"1502204":16,"1502198":16,"1502200":16,"1502202":16,"1502203":16,"1502201":16,"1502210":17,"1502211":17,"1502212":17,"1502213":17,"1502214":17,"1502215":17,"1502216":17,"1502224":18,"1502228":18,"1502222":18,"1502225":18,"1502226":18,"1502227":18,"1502223":18,"1502234":19,"1502235":19,"1502236":19,"1502237":19,"1502239":19,"1502240":19,"1502238":19,"1502248":20,"1502252":20,"1502246":20,"1502249":20,"1502250":20,"1502251":20,"1502247":20,"1502253":21,"1502254":21,"1502255":21,"1502257":21,"1502258":21,"1502259":21,"1502256":21,"1502262":22,"1502266":22,"1502260":22,"1502263":22,"1502264":22,"1502265":22,"1502261":22,"1502277":23,"1502278":23,"1502279":23,"1502281":23,"1502282":23,"1502283":23,"1502280":23,"1502285":24,"1502290":24,"1502286":24,"1502287":24,"1502288":24,"1502289":24,"1502284":24,"1502291":25,"1502292":25,"1502293":25,"1502294":25,"1502296":25,"1502297":25,"1502295":25,"1502299":26,"1502304":26,"1502300":26,"1502301":26,"1502302":26,"1502303":26,"1502298":26,"1502305":27,"1502306":27,"1502307":27,"1502308":27,"1502310":27,"1502311":27,"1502309":27,"1502318":28,"1502313":28,"1502314":28,"1502315":28,"1502316":28,"1502317":28,"1502312":28,"1502320":29,"1502319":29,"1502321":29,"1502322":29,"1502324":29,"1502325":29,"1502323":29,"1502328":30,"1502329":30,"1502330":30,"1502331":30,"1502332":30,"1502333":30,"1502326":30});
  const definitions = [
    ['2023-24', 2023, 18586, 18583, '2023-2-%d7%9c%d7%90%d7%95%d7%9e%d7%99%d7%aa'],
    ['2024-25', 2024, 19015, 18985, '2024-2-%d7%9c%d7%90%d7%95%d7%9e%d7%99%d7%aa'],
    ['2025-26', 2025, 119474, 119472, '2025-2'],
    ['2026-27', 2026, 119894, 119888, '2026-2']
  ];
  const seasons = definitions.map(([key, year, leagueId, seasonId, slug]) => Object.freeze({
    key, label: `${year}/${String(year + 1).slice(2)}`, leagueId, seasonId,
    regularTableId: key === '2023-24' ? 881046 : key === '2024-25' ? 971628 : key === '2025-26' ? 1208926 : null,
    regularRoundCount: ['2023-24','2024-25'].includes(key) ? 26 : 30,
    verifiedRegularRounds: key === '2026-27' ? verified2026Rounds : null,
    // Team 596704 lost its title upstream. Its official match permalink preserves
    // the historical name in both 2023/24 (event 886018, /match/657669-…)
    // and 2024/25 (/match/705903-א-ס-רמהש-ירק-השדה-הפועל-בני-כפר-קאסם/).
    historicalTeamNames: Object.freeze(['2023-24','2024-25'].includes(key) ? {596704:'הפועל בני כפר קאסם'} : {}),
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
