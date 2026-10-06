(function(){
  'use strict';
  const number=v=>v==null||v===''||!Number.isFinite(Number(v))?null:Number(v);
  const basic=['fieldGoalsMade','fieldGoalsAttempted','threePointsMade','threePointsAttempted','freeThrowsMade','freeThrowsAttempted','offensiveRebounds','defensiveRebounds','totalRebounds','assists','turnovers','steals','blocks','minutesPlayed','pointsFastBreak','pointsFromTurnovers','pointsInPaint','pointsSecondChance','pointsBench'];
  const pairs={fgPercentage:['fieldGoalsMade','fieldGoalsAttempted',100],threePointPercentage:['threePointsMade','threePointsAttempted',100],ftPercentage:['freeThrowsMade','freeThrowsAttempted',100],assistTurnoverRatio:['assists','turnovers',1]};
  const key=g=>`${g.seasonKey}:${g.gameId}`;
  const chronological=(a,b)=>+new Date(a.date)-+new Date(b.date)||String(a.gameId).localeCompare(String(b.gameId));
  class IBBAWindowStats {
    static selectGames(games,spec,{transportComplete=true,coverageByTeam={}}={}) {
      let scheduledGames=Array.from(new Map((games||[]).map(g=>[key(g),g])).values()).filter(g=>
        (!spec.seasonKey||g.seasonKey===spec.seasonKey)&&(spec.phase!=='regular'||g.roundVerified&&g.competitionPhase==='regular')&&
        (spec.teamId==null||g.teams?.some(t=>String(t.teamId)===String(spec.teamId)))&&
        (spec.opponentId==null||g.teams?.some(t=>String(t.teamId)===String(spec.opponentId)))&&
        (!spec.venue||String(g.teams?.[spec.venue==='home'?0:1]?.teamId)===String(spec.teamId))&&
        (spec.mode!=='rounds'||(g.roundNumber>=spec.fromRound&&g.roundNumber<=spec.toRound)));
      scheduledGames.sort(chronological);
      let resultGames=scheduledGames.filter(g=>g.hasResult&&(!spec.asOf||+new Date(g.date)<=+new Date(spec.asOf)));
      if(spec.mode==='recent'&&spec.count!=null)resultGames=resultGames.slice(-spec.count);
      return {spec:{...spec},scheduledGames,resultGames,coverageByTeam,transportComplete};
    }
    static entry(g,teamId,observation) {
      const index=g.teams?.findIndex(t=>String(t.teamId)===String(teamId));if(index==null||index<0)return null;
      const own=g.teams[index],opponent=g.teams[1-index];
      const stats=observation?.stats||g.teamObservations?.[teamId]||g.teamStats?.[index===0?'home':'away']||{};
      const available=observation?.availableMetrics||g.metricAvailability?.[teamId]||[];
      const values=Object.fromEntries(basic.map(m=>[m,available.includes(m)?number(stats[m]):null]));
      values.points=observation?(available.includes('points')?number(stats.points):null):number(own.score);
      values.opponentPoints=observation?null:number(opponent?.score);
      values.margin=values.points!=null&&values.opponentPoints!=null?values.points-values.opponentPoints:null;
      const quarters=[1,2,3,4].map(q=>{
        const part=g.quarters?.[`q${q}`];
        const a=number(part?.[index===0?'home':'away']),b=number(part?.[index===0?'away':'home']);
        return a!=null&&b!=null?a-b:null;
      });
      return {id:key(g)+(observation?`:p:${observation.playerId}`:`:t:${teamId}`),game:g,teamId,teamName:observation?.teamName||own.name,values,quarters,
        win:number(own.score)!=null&&number(opponent?.score)!=null?number(own.score)>number(opponent.score):null};
    }
    static metric(entries,name,pair,transportComplete) {
      const included=entries.filter(e=>pair?e.values[pair[0]]!=null&&e.values[pair[1]]!=null:e.values[name]!=null);
      const numerator=included.length?included.reduce((sum,e)=>sum+e.values[pair?pair[0]:name],0):null;
      const denominator=pair?included.reduce((sum,e)=>sum+e.values[pair[1]],0):included.length;
      return {value:denominator>0?(pair?.[2]||1)*numerator/denominator:null,numerator,denominator,
        gameIds:included.map(e=>String(e.game.gameId)),excludedGameIds:entries.filter(e=>!included.includes(e)).map(e=>String(e.game.gameId)),
        gameCount:included.length,dataState:!included.length||denominator===0?'unavailable':transportComplete&&included.length===entries.length?'ready':'partial'};
    }
    static snapshot(entries,entityRef,window) {
      window={...window,spec:{...window.spec,gameIds:window.resultGames.map(g=>String(g.gameId))}};
      entries=Array.from(new Map(entries.filter(Boolean).map(e=>[e.id,e])).values());
      const metrics=Object.fromEntries(['points','opponentPoints','margin',...basic].map(m=>[m,this.metric(entries,m,null,window.transportComplete)]));
      for(const [m,pair]of Object.entries(pairs))metrics[m]=this.metric(entries,m,pair,window.transportComplete);
      const quarterMargins=[0,1,2,3].map(i=>this.metric(entries.map(e=>({...e,values:{quarter:e.quarters[i]}})),'quarter',null,window.transportComplete));
      const record=list=>({wins:list.filter(e=>e.win===true).length,losses:list.filter(e=>e.win===false).length,total:list.length,gameIds:list.map(e=>String(e.game.gameId))});
      const close=entries.filter(e=>e.values.margin!=null&&Math.abs(e.values.margin)<=5);
      const half=entries.filter(e=>e.quarters[0]!=null&&e.quarters[1]!=null);
      const reversals=entries.filter(e=>{
        let margin=0,behind=false;for(const q of e.quarters){if(q==null)return false;margin+=q;if(margin<0)behind=true;}return behind&&e.win===true;
      });
      return {entityRef,seasonKeys:[...new Set(entries.map(e=>e.game.seasonKey))],window,gamesPlayed:entries.length,wins:entries.filter(e=>e.win===true).length,losses:entries.filter(e=>e.win===false).length,
        metrics,quarterMargins,closeRecord:record(close),halftimeRecord:{leading:record(half.filter(e=>e.quarters[0]+e.quarters[1]>0)),trailing:record(half.filter(e=>e.quarters[0]+e.quarters[1]<0))},
        leadReversals:{...record(reversals),eligible:entries.filter(e=>e.quarters.every(q=>q!=null)).length},
        evidence:entries.map(e=>({seasonKey:e.game.seasonKey,gameId:e.game.gameId,sourceUrl:e.game.permalink,teamId:e.teamId})),
        coverage:window.coverageByTeam?.[entityRef]||{complete:window.transportComplete},entries};
    }
    static team(window,teamId){return this.snapshot(window.resultGames.map(g=>this.entry(g,teamId)),String(teamId),window);}
    static subset(window,games,{offset=0}={}) {
      const unique=Array.from(new Map(games.map(g=>[key(g),g])).values()).sort(chronological);
      return {...window,spec:{...window.spec,mode:'recent',count:unique.length,offset,gameIds:unique.map(g=>String(g.gameId)),fromDate:unique[0]?.date,toDate:unique.at(-1)?.date},scheduledGames:unique,resultGames:unique};
    }
    static player(window,playerRef,identity=x=>typeof x==='object'?`wp:${x.playerId}`:x){
      const canonical=identity(playerRef);
      const entries=window.resultGames.flatMap(g=>(g.playerObservations||[]).filter(p=>p.participation==='verified'&&canonical&&identity({playerId:p.playerId})===canonical).map(p=>this.entry(g,p.teamId,p)));
      return this.snapshot(entries,canonical,window);
    }
    static league(window){return this.snapshot(window.resultGames.flatMap(g=>(g.teams||[]).map(t=>this.entry(g,t.teamId))),'league',window);}
    static pool(snapshots){
      const entries=snapshots.flatMap(s=>s.entries||[]);
      const window={spec:{mode:'pool',windows:snapshots.map(s=>s.window.spec)},scheduledGames:snapshots.flatMap(s=>s.window.scheduledGames),resultGames:entries.map(e=>e.game),transportComplete:snapshots.every(s=>s.window.transportComplete),coverageByTeam:{}};
      const pooled=this.snapshot(entries,snapshots[0]?.entityRef||'pool',window);pooled.coverage={complete:snapshots.every(s=>s.coverage.complete),windows:snapshots.map(s=>s.coverage)};return pooled;
    }
  }
  window.IBBAWindowStats=IBBAWindowStats;
})();
