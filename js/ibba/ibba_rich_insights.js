(function(){
  'use strict';
  const W=window.IBBAWindowStats;
  const scoring=['points','opponentPoints','margin'];
  const year=k=>window.IBBASeasons.getSeason(k)?.label||k;
  class IBBARichInsights {
    static story(type,family,team,snapshots,facts,extras={}) {
      const seasonKeys=[...new Set(snapshots.flatMap(s=>s.seasonKeys))];
      const windows=snapshots.flatMap(s=>s.window.spec.mode==='pool'?s.window.spec.windows:s.window.spec);
      const factKey=JSON.stringify([team.teamId,extras.playerRef||'',seasonKeys,windows,facts]);
      const small=snapshots.some(s=>s.gamesPlayed<5);
      return {id:`${type}:${factKey}`,factKey,type,family,category:family,teamIds:team.teamId==null?[]:[team.teamId],teamName:team.name,
        seasonKeys,scope:extras.scope||'historical',facts,windows,metricDefinitions:{[facts.metric||'record']:{unit:facts.metric?.includes('Percentage')?'percent':'perGame'}},
        samples:snapshots.map(s=>({entityRef:s.entityRef,seasonKeys:s.seasonKeys,gameCount:s.gamesPlayed,metricGameCounts:Object.fromEntries(Object.entries(s.metrics).map(([m,v])=>[m,v.gameCount]))})),
        coverage:snapshots.map(s=>s.coverage),evidence:snapshots.flatMap(s=>s.evidence),sampleSize:snapshots[0]?.gamesPlayed||0,
        dataState:snapshots.every(s=>s.coverage.complete)&&snapshots.every(s=>!facts.metric||s.metrics[facts.metric]?.dataState==='ready')?'ready':'partial',
        smallSample:small,priority:type==='ROUND_SCORING'?96:type.includes('CHANGE')?92:72,text:'',broadcastShort:'',...extras};
    }
    static snapshot(season,team,spec) {
      const games=spec.phase==='regular'?season.regularGames:season.resultGames;
      const window=W.selectGames(games||[],{...spec,seasonKey:season.seasonKey,teamId:team.teamId},{transportComplete:season.state==='ready',coverageByTeam:{}});
      const snapshot=W.team(window,team.teamId);
      if(spec.mode==='rounds') {
        const availableRounds=[],missingRounds=[];
        for(let r=spec.fromRound;r<=spec.toRound;r++)(window.resultGames.filter(g=>g.roundNumber===r).length===1?availableRounds:missingRounds).push(r);
        snapshot.coverage={complete:window.transportComplete&&!missingRounds.length,availableRounds,missingRounds};
      }else snapshot.coverage={complete:window.transportComplete&&(spec.count==null||snapshot.gamesPlayed===spec.count)};
      return snapshot;
    }
    static generate(context,{playerRefs=[]}={}) {
      const match=context.match,round=match.roundNumber,regular=match.roundVerified&&match.competitionPhase==='regular',stories=[];
      const prior=(context.priorSeasons||[]).filter(s=>s.seasonKey<match.seasonKey);
      const current={seasonKey:match.seasonKey,state:context.currentComplete?'ready':'partial',regularGames:context.currentRegularGames||[],resultGames:context.currentResultGames||[]};
      const seasons=[...prior,current];
      const add=(type,family,team,snaps,facts,extras)=>stories.push(this.story(type,family,team,snaps,facts,extras));
      for(const team of match.teams||[]) {
        const snap=(season,spec)=>this.snapshot(season,team,{...spec,...(season===current?{asOf:context.asOf}:{})});
        if(regular) {
          const historicalRound=W.pool(prior.map(s=>snap(s,{phase:'regular',mode:'rounds',fromRound:round,toRound:round})));
          for(const metric of scoring)if(historicalRound.metrics[metric].value!=null)add('ROUND_SCORING','ROUND',team,[historicalRound],{metric,value:historicalRound.metrics[metric].value,round});
          if(round>1) {
            const spec={phase:'regular',mode:'rounds',fromRound:1,toRound:round-1};
            const now=snap(current,spec),past=W.pool(prior.map(s=>snap(s,spec)));
            for(const metric of scoring)if(now.metrics[metric].value!=null&&past.metrics[metric].value!=null)add('SAME_STAGE_COMPARISON','ROUND',team,[now,past],{metric,value:now.metrics[metric].value,referenceValue:past.metrics[metric].value,difference:now.metrics[metric].value-past.metrics[metric].value},{scope:'comparison'});
            const ranges=[[Math.max(1,round-5),round-1],...(round>5?[[1,5]]:[]),...(round>10?[[6,10]]:[])];
            for(const season of seasons)for(const [fromRound,toRound]of ranges) {
              const window=snap(season,{phase:'regular',mode:'rounds',fromRound,toRound});if(!window.gamesPlayed)continue;
              // Completed fixed blocks require all rounds; the moving preceding window can expose partial coverage.
              if((fromRound===1&&toRound===5||fromRound===6&&toRound===10)&&!window.coverage.complete)continue;
              for(const metric of scoring)if(window.metrics[metric].value!=null)add('ROUND_WINDOW_PROFILE','ROUND',team,[window],{metric,value:window.metrics[metric].value},{scope:season===current?'current':'historical'});
              const league=W.league(W.selectGames(season.regularGames||[],{phase:'regular',mode:'rounds',seasonKey:season.seasonKey,fromRound,toRound,...(season===current?{asOf:context.asOf}:{})},{transportComplete:season.state==='ready'}));
              if(league.metrics.points.value!=null)add('WINDOW_VS_LEAGUE','ROUND',team,[window,league],{metric:'points',value:window.metrics.points.value,referenceValue:league.metrics.points.value,difference:window.metrics.points.value-league.metrics.points.value},{scope:season===current?'current':'historical',referenceName:'נקודות למשחק לקבוצה בליגה'});
            }
            if(now.gamesPlayed)add('WINS_MILESTONE','MOMENTUM',team,[now],{wins:now.wins,losses:now.losses,total:now.gamesPlayed,referenceRecords:prior.map(s=>{const p=snap(s,spec);return {seasonKey:s.seasonKey,wins:p.wins,losses:p.losses,total:p.gamesPlayed};})},{scope:'comparison'});
          }
        }
        const last=snap(current,{phase:'any',mode:'recent',count:5}),ten=snap(current,{phase:'any',mode:'recent',count:10});
        const earlier=W.team({...ten.window,resultGames:ten.window.resultGames.slice(0,-5)},team.teamId);
        for(const metric of scoring) {
          if(last.metrics[metric].gameCount>=5&&earlier.metrics[metric].gameCount>=5)add('RECENT_WINDOW_CHANGE','MOMENTUM',team,[last,earlier],{metric,value:last.metrics[metric].value,referenceValue:earlier.metrics[metric].value,difference:last.metrics[metric].value-earlier.metrics[metric].value},{scope:'current'});
          const historic=W.pool(prior.map(s=>snap(s,{phase:'regular',mode:'rounds',fromRound:Math.max(1,round-5),toRound:round-1})));
          if(regular&&last.metrics[metric].gameCount>=5&&historic.metrics[metric].gameCount>=5)add('HISTORICAL_WINDOW_COMPARISON','MOMENTUM',team,[last,historic],{metric,value:last.metrics[metric].value,referenceValue:historic.metrics[metric].value,difference:last.metrics[metric].value-historic.metrics[metric].value},{scope:'comparison'});
        }
        const all=snap(current,{phase:'any',mode:'recent'}),ordered=all.entries;
        if(ordered.length){const win=ordered.at(-1).win;let count=0;for(let i=ordered.length-1;i>=0&&ordered[i].win===win;i--)count++;
          if(count>=2)add('STREAK_REFERENCE','MOMENTUM',team,[all],{count,win},{scope:'current'});
        }
        this.profiles?.({context,team,seasons,current,snap,add});
        this.matchups?.({context,team,prior,current,snap,add,playerRefs});
      }
      return [...new Map(stories.map(s=>[s.id,s])).values()];
    }
  }
  window.IBBARichInsights=IBBARichInsights;
})();
