(function () {
  'use strict';
  const unique = values => [...new Set(values.filter(v => v != null).map(String))].sort();
  const phase = value => value === 'regular' ? 'regular' : ['any','all'].includes(value) ? 'all' : 'unknown';
  const refs = games => [...new Map((games || []).map(g => [`${g.seasonKey}:${g.gameId}`, {seasonKey:g.seasonKey,gameId:String(g.gameId)}])).values()];
  class IBBAAnalysisScope {
    static fromGames(games, {phase: selectedPhase='all', mode='season', requestedSeasonKeys, asOf=null, ...selection}={}) {
      const contributingSeasonKeys = unique((games || []).map(g => g.seasonKey));
      return {basis:'gameCalculation',phase:phase(selectedPhase),mode,
        requestedSeasonKeys:requestedSeasonKeys || contributingSeasonKeys,contributingSeasonKeys,asOf,
        windows:[{...selection,phase:phase(selectedPhase),mode,asOf,gameRefs:refs(games)}],metricSamples:[]};
    }
    static fromSnapshots(snapshots, {facts={}, requestedSeasonKeys, asOf=null, recordGameIds}={}) {
      const windows = snapshots.flatMap(s => (s.window.spec.mode === 'pool' ? s.window.spec.windows : [s.window.spec]).map(w => ({...w,
        phase:phase(w.phase),mode:w.mode === 'recent' && w.count == null ? (w.opponentId != null ? 'meetings' : 'season') : w.mode,
        gameRefs:refs(s.window.resultGames.filter(g => !w.seasonKey || g.seasonKey === w.seasonKey))})));
      const phases = unique(windows.map(w => w.phase));
      const metricSamples = snapshots.map((s, index) => {
        const metric = index && facts.referenceMetric ? facts.referenceMetric : facts.metric;
        const m = metric === 'quarterMargin' ? s.quarterMargins?.[facts.quarter-1] : s.metrics?.[metric];
        const ids = recordGameIds || m?.gameIds || facts.gameIds;
        const games = (s.window.resultGames || []).filter(g => !ids || ids.map(String).includes(String(g.gameId)));
        return {metric:metric || 'record',entityRef:s.entityRef,seasonKey:s.seasonKeys.join('|'),
          unit:metric?.includes('Percentage') ? 'percent' : metric === 'assistTurnoverRatio' ? 'ratio' : 'perGame',
          gameCount:m?.gameCount ?? (recordGameIds ? games.length : facts.total ?? s.gamesPlayed),
          numerator:m?.numerator ?? null,denominator:m?.denominator ?? facts.total ?? games.length,gameRefs:refs(games)};
      });
      return {basis:'gameCalculation',phase:phases.length === 1 ? phases[0] : 'unknown',mode:windows[0]?.mode || 'season',
        requestedSeasonKeys:requestedSeasonKeys || unique(windows.map(w => w.seasonKey)),
        contributingSeasonKeys:unique(snapshots.flatMap(s => s.seasonKeys)),asOf:asOf || windows.find(w => w.asOf)?.asOf || null,
        windows,metricSamples};
    }
    static forOfficialSummary(record, {seasonKey,entityRef,metricUnits={}}={}) {
      return {basis:'officialSummary',phase:'regular',mode:'season',requestedSeasonKeys:[seasonKey],contributingSeasonKeys:[seasonKey],asOf:null,
        windows:[{seasonKey,mode:'season',phase:'regular',entityRef,gameRefs:[]}],
        metricSamples:Object.keys(record.metrics || {points:record.points}).map(metric => ({metric,entityRef,seasonKey,
          unit:metricUnits[metric] || (metric.includes('Percentage') ? 'percent' : 'perGame'),gameCount:record.games ?? null,
          numerator:null,denominator:null,gameRefs:[]}))};
    }
    static groupKey(scope) {
      if (!scope) return '';
      return JSON.stringify([scope.basis,scope.phase,scope.mode,(scope.windows || []).map(w =>
        [w.phase,w.mode,w.fromRound ?? null,w.toRound ?? null,w.count ?? null,w.offset ?? 0,w.venue || '',w.opponentId ?? null])]);
    }
    static label(scope) {
      if (!scope) return '';
      const w = scope.windows?.[0] || {};
      const stage = scope.phase === 'regular' ? 'העונה הסדירה' : scope.phase === 'all' ? 'כל משחקי העונה' : 'טווח מפורט בנתונים';
      const window = scope.mode === 'rounds' ? (w.fromRound === w.toRound ? `מחזור ${w.fromRound}` : `מחזורים ${w.fromRound}–${w.toRound}`)
        : scope.mode === 'recent' && w.count != null ? `${w.count} המשחקים ${w.offset ? 'הקודמים' : 'האחרונים'}`
        : scope.mode === 'single' ? 'משחק יחיד' : scope.mode === 'meetings' ? 'מפגשים בין הקבוצות' : '';
      return [stage,window].filter(Boolean).join(' · ');
    }
  }
  window.IBBAAnalysisScope = IBBAAnalysisScope;
})();
