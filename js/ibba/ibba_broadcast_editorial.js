(function () {
  'use strict';
  const stable = value => JSON.stringify(order(value));
  function order(value) {
    if (Array.isArray(value)) return value.map(order);
    if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k,order(value[k])]));
    return value;
  }
  function factsOnly(value) {
    if(Array.isArray(value))return value.map(factsOnly);
    if(value && typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>key!=='asOf').map(([key,v])=>[key,factsOnly(v)]));
    return value;
  }
  const family = s => s.family || s.category || s.type;
  class IBBABroadcastEditorial {
    static storyKey(s) {
      const entities = (s.teamIds || []).filter(id => id != null).map(String).sort();
      if (!entities.length && !s.playerRef) return null;
      const f=s.facts || {}, a=s.analysisScope;
      const windows=(a?.windows || s.windows || []).map(w => [w.phase,w.mode,w.fromRound,w.toRound,
        s.type==='RISING_STAR'?null:w.count,s.type==='RISING_STAR'?null:w.offset,w.venue,w.opponentId,w.teamId]);
      return stable([s.type,entities,s.playerRef || '',s.historicalTeamRef || s.historicalTeam || '',
        a?.requestedSeasonKeys || s.seasonKeys || [],a?.basis || 'gameCalculation',a?.phase || '',a?.mode || '',windows,
        f.metric,f.referenceMetric,f.quarter,f.position,f.venue,f.round,f.from,f.to,f.threshold,f.win,f.stat,f.category,
        a?null:s.factKey || s.id || null]);
    }
    static fingerprint(s) {
      const facts={...(s.facts || {})};delete facts.analysisScope;
      return stable(factsOnly([facts,s.seasonKeys,s.analysisScope,s.samples,s.sampleSize,s.evidence]));
    }
    static tier(s) {
      if (s.scope==='current' && (/CHANGE|STREAK|RISING_STAR|HOT_HAND|COLD_SPELL|POINT_DIFF_TREND/.test(s.type) || s.playerRef && /MATCHUP|KILLER_VS_TEAM/.test(s.type))) return 1;
      if (['LAST_HISTORICAL_MEETING','PLAYER_PREVIOUS_OPPONENT_GAME'].includes(s.type)) return 2;
      const f=s.facts || {},ratio=f.wins/f.total;
      if (['HALFTIME_RECORD','CLOSE_GAME_RECORD'].includes(s.type) && f.total>=10 && (ratio>=0.8 || ratio<=0.2)) return 3;
      if (s.type==='POOLED_H2H_RECORD') return 4;
      if (family(s)==='ROUND' && s.analysisScope?.phase!=='unknown') return 5;
      return 6;
    }
    static pooledMeetings(context) {
      const teams=context?.match?.teams || [];
      if (teams.length!==2 || teams.some(t=>t.teamId==null)) return null;
      const seasons=(context.priorSeasons || []).filter(s=>s.state==='ready');
      const games=[...new Map(seasons.flatMap(s=>s.resultGames || []).filter(g=>g.hasResult && teams.every(t=>g.teams?.some(x=>String(x.teamId)===String(t.teamId))))
        .map(g=>[`${g.seasonKey}:${g.gameId}`,g])).values()];
      if (!games.length) return null;
      const seasonKeys=[...new Set(games.map(g=>g.seasonKey))].sort();
      const winsByTeam=teams.map(t=>({teamId:t.teamId,wins:games.filter(g=>{
        const own=g.teams.find(x=>String(x.teamId)===String(t.teamId)),other=g.teams.find(x=>String(x.teamId)!==String(t.teamId));
        return Number(own.score)>Number(other.score);
      }).length}));
      const scope=window.IBBAAnalysisScope?.fromGames(games,{phase:'all',mode:'meetings',requestedSeasonKeys:(context.priorSeasons || []).map(s=>s.seasonKey)});
      return {type:'POOLED_H2H_RECORD',family:'MATCHUP',scope:'historical',teamIds:teams.map(t=>t.teamId),teamNames:teams.map(t=>t.name),
        seasonKeys,analysisScope:scope,sampleSize:games.length,facts:{total:games.length,winsByTeam},dataState:'ready',priority:80,
        evidence:games.map(g=>({seasonKey:g.seasonKey,gameId:g.gameId,sourceUrl:g.permalink})),text:''};
    }
    static prepare(candidates=[],context={}, {limit=6,variant=0}={}) {
      const original=candidates.map(s=>({...s})),rounds=new Map(),summaries=[];
      for (const s of original.filter(s=>s.type==='ROUND_SCORING' && Number.isFinite(s.facts?.value))) {
        const key=stable([s.teamIds,s.analysisScope?.requestedSeasonKeys || s.seasonKeys,s.facts.round,window.IBBAAnalysisScope?.groupKey(s.analysisScope)]);
        if (!rounds.has(key)) rounds.set(key,[]);rounds.get(key).push(s);
      }
      for (const group of rounds.values()) {
        if (!['points','opponentPoints','margin'].every(metric=>group.some(s=>s.facts.metric===metric))) continue;
        const base=group.find(s=>s.facts.metric==='margin');
        summaries.push({...base,type:'ROUND_TEAM_SUMMARY',id:`ROUND_TEAM_SUMMARY:${base.id || ''}`,
          facts:{...base.facts,roundMetrics:Object.fromEntries(group.map(s=>[s.facts.metric,s.facts.value]))},text:''});
      }
      const pooled=this.pooledMeetings(context);
      const allStories=[...original,...summaries,...(pooled?[pooled]:[])].map(s=>{
        if (['ROUND_TEAM_SUMMARY','POOLED_H2H_RECORD'].includes(s.type)) s.text=window.IBBABroadcastCopy.format(s,{variant});
        if (s.type==='LAST_HISTORICAL_MEETING' && s.analysisScope && context.match?.seasonKey) s.analysisScope={...s.analysisScope,requestedSeasonKeys:[...(context.priorSeasons || []).map(p=>p.seasonKey),context.match.seasonKey]};
        s.broadcastShort=s.broadcastShort || s.text;s.storyKey=this.storyKey(s);s.factFingerprint=this.fingerprint(s);return s;
      });
      const hasRound=allStories.some(s=>s.type==='ROUND_SCORING');
      const eligible=allStories.filter(s=>s.storyKey && s.text && s.dataState!=='unavailable' && !(summaries.length && s.type==='ROUND_SCORING')
        && !(hasRound && s.type==='HISTORICAL_ROUND_RESULT') && !(pooled && s.type==='HISTORICAL_H2H_RECORD'));
      const priority=s=>s.priority ?? ({high:90,medium:65,low:40}[s.importance] || 40);
      const compare=(a,b)=>this.tier(a)-this.tier(b) || priority(b)-priority(a)
        || String(b.seasonKeys?.at(-1) || '').localeCompare(String(a.seasonKeys?.at(-1) || ''))
        || String(a.storyKey || a.factKey || a.id || a.type).localeCompare(String(b.storyKey || b.factKey || b.id || b.type));
      eligible.sort(compare);
      const seen=new Set(),distinct=eligible.filter(s=>{
        const key=s.storyKey || s.factKey || s.id || stable([s.type,s.text]);
        if (seen.has(key)) return false;seen.add(key);return true;
      });
      const selected=[],families=new Map(),represented=new Set(),repeated=new Set();
      const take=s=>{selected.push(s);families.set(family(s),(families.get(family(s))||0)+1);(s.teamIds||[]).forEach(id=>represented.add(String(id)));};
      for (const team of context.match?.teams || []) {
        if (selected.length>=limit || represented.has(String(team.teamId))) continue;
        const s=distinct.find(s=>(s.teamIds||[]).some(id=>String(id)===String(team.teamId)));if(s)take(s);
      }
      for (const s of distinct) {
        if (selected.length>=limit || selected.includes(s)) continue;
        const f=s.facts||{}, repeat=stable([s.type,s.teamIds,f.quarter,f.position]);
        if (['SAME_STAGE_RECORD','HALFTIME_RECORD','CLOSE_GAME_RECORD','QUARTER_WINDOW'].includes(s.type)) {
          if (repeated.has(repeat) || selected.some(x=>x.type===s.type && stable([x.teamIds,x.facts?.quarter,x.facts?.position])===stable([s.teamIds,f.quarter,f.position]))) continue;
          repeated.add(repeat);
        }
        if ((families.get(family(s))||0)>=2 && distinct.some(x=>!selected.includes(x) && (families.get(family(x))||0)<2)) continue;
        take(s);
      }
      return {allStories,topStories:selected.sort(compare)};
    }
  }
  window.IBBABroadcastEditorial=IBBABroadcastEditorial;
})();
