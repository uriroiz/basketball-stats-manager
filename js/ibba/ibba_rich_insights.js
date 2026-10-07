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
      const sampleMetrics=snapshots.map((s,index)=>{const name=index&&facts.referenceMetric?facts.referenceMetric:facts.metric;
        const metric=name==='quarterMargin'?s.quarterMargins[facts.quarter-1]:s.metrics[name];
        return {name,metric,count:index===0&&extras.sampleSize!=null?extras.sampleSize:metric?.gameCount??s.gamesPlayed};});
      const samples=snapshots.map((s,index)=>({entityRef:s.entityRef,seasonKeys:s.seasonKeys,metric:sampleMetrics[index].name,gameCount:sampleMetrics[index].count,metricGameCounts:Object.fromEntries(Object.entries(s.metrics).map(([m,v])=>[m,v.gameCount]))}));
      const small=samples.some(s=>s.gameCount<5);
      return {id:`${type}:${factKey}`,factKey,type,family,category:family,teamIds:team.teamId==null?[]:[team.teamId],teamName:team.name,
        seasonKeys,scope:extras.scope||'historical',facts,windows,
        analysisScope:window.IBBAAnalysisScope?.fromSnapshots(snapshots,{facts,recordGameIds:extras.recordGameIds,requestedSeasonKeys:extras.requestedSeasonKeys}),
        metricDefinitions:{[facts.metric||'record']:{unit:facts.metric?.includes('Percentage')?'percent':'perGame'}},
        samples,
        coverage:snapshots.map(s=>s.coverage),evidence:snapshots.flatMap(s=>s.evidence),sampleSize:samples[0]?.gameCount||0,
        dataState:snapshots.every(s=>s.coverage.complete)&&sampleMetrics.every(s=>!s.name||s.metric?.dataState==='ready')?'ready':'partial',
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
    static profiles({context,team,seasons,current,snap,add}) {
      const style=['threePointsAttempted','threePointPercentage','fgPercentage','ftPercentage','offensiveRebounds','defensiveRebounds','totalRebounds','assists','turnovers','steals','blocks','assistTurnoverRatio','pointsFastBreak','pointsFromTurnovers','pointsInPaint','pointsSecondChance','pointsBench'];
      for(const season of seasons) {
        const scope=season===current?'current':'historical';
        const profile=snap(season,{phase:'any',mode:'recent'});if(!profile.gamesPlayed)continue;
        for(const metric of style)if(profile.metrics[metric].value!=null)add('WINDOW_STYLE','PROFILE',team,[profile],{metric,value:profile.metrics[metric].value},{scope});
        for(const venue of ['home','away']) {
          const at=snap(season,{phase:'any',mode:'recent',venue});if(!at.gamesPlayed)continue;
          for(const metric of scoring)if(at.metrics[metric].value!=null)add('VENUE_PROFILE','PROFILE',team,[at],{metric,value:at.metrics[metric].value,venue},{scope});
        }
        if(profile.closeRecord.total)add('CLOSE_GAME_RECORD','DECIDING',team,[profile],profile.closeRecord,{scope,sampleSize:profile.closeRecord.total,recordGameIds:profile.closeRecord.gameIds});
        for(const [position,record]of Object.entries(profile.halftimeRecord))if(record.total)add('HALFTIME_RECORD','DECIDING',team,[profile],{...record,position},{scope,sampleSize:record.total,recordGameIds:record.gameIds});
        for(let i=0;i<4;i++){const metric=profile.quarterMargins[i];if(metric.value!=null)add('QUARTER_WINDOW','DECIDING',team,[profile],{metric:'quarterMargin',value:metric.value,quarter:i+1},{scope,sampleSize:metric.gameCount,metricDefinitions:{quarterMargin:{unit:'pointsMargin'}},quarterGameIds:metric.gameIds});}
        if(profile.leadReversals.total)add('LEAD_REVERSAL','DECIDING',team,[profile],{count:profile.leadReversals.total,total:profile.leadReversals.eligible},{scope});
      }
      const opponent=context.match.teams.find(t=>String(t.teamId)!==String(team.teamId));
      const own=snap(current,{phase:'any',mode:'recent',count:5});
      if(opponent&&own.gamesPlayed) {
        const rival=this.snapshot(current,opponent,{phase:'any',mode:'recent',count:5,asOf:context.asOf});
        for(const [metric,referenceMetric]of [['offensiveRebounds','defensiveRebounds'],['turnovers','steals']])if(own.metrics[metric].value!=null&&rival.metrics[referenceMetric].value!=null)add('MATCHUP_STYLE','PROFILE',team,[own,rival],{metric,value:own.metrics[metric].value,referenceMetric,referenceValue:rival.metrics[referenceMetric].value},{scope:'current',referenceName:opponent.name});
        const opponents=rival.entries.map(e=>W.entry(e.game,e.game.teams.find(t=>String(t.teamId)!==String(opponent.teamId)).teamId));
        const allowed=W.snapshot(opponents,`opponents:${opponent.teamId}`,rival.window);
        if(own.metrics.threePointsAttempted.value!=null&&allowed.metrics.threePointPercentage.value!=null)add('MATCHUP_STYLE','PROFILE',team,[own,allowed],{metric:'threePointsAttempted',value:own.metrics.threePointsAttempted.value,referenceMetric:'threePointPercentage',referenceValue:allowed.metrics.threePointPercentage.value},{scope:'current',referenceName:`היריבות של ${opponent.name}`});
      }
      const ten=snap(current,{phase:'any',mode:'recent',count:10});const first=W.team(W.subset(ten.window,ten.window.resultGames.slice(0,-5),{offset:5}),team.teamId);
      const a=own.quarterMargins[3],b=first.quarterMargins[3];
      if(a.gameCount>=5&&b.gameCount>=5)add('LATE_GAME_CHANGE','DECIDING',team,[own,first],{metric:'quarterMargin',quarter:4,value:a.value,referenceValue:b.value,difference:a.value-b.value},{scope:'current'});
    }
    static matchups({context,team,prior,current,snap,add,playerRefs}) {
      const opponent=context.match.teams.find(t=>String(t.teamId)!==String(team.teamId));if(!opponent)return;
      for(const season of [...prior,current]) {
        const scope=season===current?'current':'historical';
        const spec={phase:'any',mode:'recent',opponentId:opponent.teamId};
        const h2h=snap(season,spec);if(!h2h.gamesPlayed)continue;
        for(const metric of scoring)if(h2h.metrics[metric].value!=null)add('H2H_WINDOW_PROFILE','MATCHUP',team,[h2h],{metric,value:h2h.metrics[metric].value,wins:h2h.wins,losses:h2h.losses,total:h2h.gamesPlayed},{scope,referenceName:opponent.name});
        for(const venue of ['home','away']){const at=snap(season,{...spec,venue});if(at.gamesPlayed)add('H2H_VENUE_PROFILE','MATCHUP',team,[at],{metric:'points',value:at.metrics.points.value,wins:at.wins,losses:at.losses,total:at.gamesPlayed,venue},{scope,referenceName:opponent.name});}
        const ten=snap(season,{...spec,phase:'regular',count:10}),last=W.team(W.subset(ten.window,ten.window.resultGames.slice(-5)),team.teamId),before=W.team(W.subset(ten.window,ten.window.resultGames.slice(0,-5),{offset:5}),team.teamId);
        if(last.gamesPlayed>=5&&before.gamesPlayed>=5)add('H2H_CHANGE','MATCHUP',team,[last,before],{metric:'points',value:last.metrics.points.value,referenceValue:before.metrics.points.value,difference:last.metrics.points.value-before.metrics.points.value},{scope,referenceName:opponent.name});
      }
      const now=snap(current,{phase:'any',mode:'recent'}),meetings=prior.flatMap(s=>snap(s,{phase:'any',mode:'recent',opponentId:opponent.teamId}).entries).sort((a,b)=>+new Date(a.game.date)-+new Date(b.game.date));
      if(now.entries.length&&meetings.length){const win=now.entries.at(-1).win;let count=0;for(let i=now.entries.length-1;i>=0&&now.entries[i].win===win;i--)count++;
        if(count>=2){const old=meetings.at(-1),past=W.snapshot([old],String(team.teamId),W.selectGames([old.game],{phase:'any',mode:'recent'}));add('CURRENT_STREAK_HISTORICAL_MATCHUP','MATCHUP',team,[now,past],{count,win,previousWin:old.win,date:old.game.date,previousPoints:old.values.points,previousOpponentPoints:old.values.opponentPoints},{scope:'comparison',referenceName:opponent.name});}
      }
      // Selected identities are independent of the current roster. Generate them once, with each actual historical team retained.
      if(String(team.teamId)!==String(context.match.teams[0].teamId))return;
      for(const ref of [...new Set(playerRefs.map(r=>context.identity(r)).filter(Boolean))]) {
        const name=context.playerSummaries?.records?.find(r=>context.identity(r.playerRef)===ref)?.name||`שחקן ${ref.replace(/^post:/,'')}`;
        for(const season of [...prior,current]) {
          const scope=season===current?'current':'historical';
          const window=W.selectGames(season.resultGames||[],{phase:'any',mode:'recent',seasonKey:season.seasonKey,...(season===current?{asOf:context.asOf}:{})},{transportComplete:season.state==='ready'});
          const p=W.player(window,ref,context.identity);if(!p.gamesPlayed)continue;
          const historicalTeam=[...new Set(p.entries.map(e=>e.teamName))].join(', ');
          const extra={playerRef:ref,playerName:name,historicalTeam,scope};
          for(const rival of context.match.teams) {
            const playerWindow={...window,spec:{...window.spec,opponentId:rival.teamId},resultGames:window.resultGames.filter(g=>g.teams.some(t=>String(t.teamId)===String(rival.teamId)))};
            const against=W.player(playerWindow,ref,context.identity);
            against.entries=against.entries.filter(e=>String(e.teamId)!==String(rival.teamId));
            const verified=W.snapshot(against.entries,ref,playerWindow);
            for(const metric of ['points','totalRebounds','assists'])if(verified.metrics[metric].value!=null)add('PLAYER_OPPONENT_PROFILE','PLAYERS',team,[verified],{metric,value:verified.metrics[metric].value},{...extra,historicalTeam:[...new Set(verified.entries.map(e=>e.teamName))].join(', '),referenceName:rival.name});
          }
          if(context.match.roundVerified&&context.match.competitionPhase==='regular') {
            const roundWindow=W.selectGames(season.regularGames||[],{phase:'regular',mode:'rounds',seasonKey:season.seasonKey,fromRound:context.match.roundNumber,toRound:context.match.roundNumber,...(season===current?{asOf:context.asOf}:{})});
            const at=W.player(roundWindow,ref,context.identity);
            for(const metric of ['points','totalRebounds','assists'])if(at.metrics[metric].value!=null)add('PLAYER_ROUND_PROFILE','PLAYERS',team,[at],{metric,value:at.metrics[metric].value,round:context.match.roundNumber},extra);
          }
          const eligible=p.entries.filter(e=>['points','totalRebounds','assists','steals','blocks'].every(m=>e.values[m]!=null));
          // Missing categories cannot prove the absence of a double double; two published qualifying categories can prove one.
          const proven=p.entries.filter(e=>['points','totalRebounds','assists','steals','blocks'].filter(m=>e.values[m]!=null&&e.values[m]>=10).length>=2);
          const evaluable=[...new Map([...eligible,...proven].map(e=>[e.id,e])).values()];
          if(proven.length)add('PLAYER_DOUBLE_DOUBLES','PLAYERS',team,[p],{count:proven.length,total:evaluable.length},{...extra,sampleSize:evaluable.length});
          const known=p.entries.filter(e=>e.values.points!=null);if(known.length>=5){const threshold=10,count=known.filter(e=>e.values.points>=threshold).length;add('PLAYER_CONSISTENCY','PLAYERS',team,[p],{count,total:known.length,threshold},extra);}
          const lastEntries=p.entries.slice(-5),previousEntries=p.entries.slice(-10,-5);
          const a=W.snapshot(lastEntries,ref,W.subset(window,lastEntries.map(e=>e.game))),b=W.snapshot(previousEntries,ref,W.subset(window,previousEntries.map(e=>e.game),{offset:5}));
          for(const metric of ['points','totalRebounds','assists'])if(a.metrics[metric].gameCount>=5&&b.metrics[metric].gameCount>=5)add('PLAYER_WINDOW_CHANGE','PLAYERS',team,[a,b],{metric,value:a.metrics[metric].value,referenceValue:b.metrics[metric].value,difference:a.metrics[metric].value-b.metrics[metric].value},extra);
          const share=entries=>{const valid=entries.filter(e=>e.values.points!=null&&e.game.teams.find(t=>String(t.teamId)===String(e.teamId))?.score!=null);const total=valid.reduce((sum,e)=>sum+Number(e.game.teams.find(t=>String(t.teamId)===String(e.teamId)).score),0);const numerator=valid.reduce((sum,e)=>sum+e.values.points,0);return {gameCount:valid.length,numerator,denominator:total,value:total>0?100*numerator/total:null,gameIds:valid.map(e=>String(e.game.gameId)),excludedGameIds:entries.filter(e=>!valid.includes(e)).map(e=>String(e.game.gameId)),dataState:!total?'unavailable':valid.length===entries.length?'ready':'partial'};};
          const sa=share(lastEntries),sb=share(previousEntries);a.metrics.contributionPercentage=sa;b.metrics.contributionPercentage=sb;if(sa.gameCount>=5&&sb.gameCount>=5&&sa.value!=null&&sb.value!=null)add('PLAYER_CONTRIBUTION_CHANGE','PLAYERS',team,[a,b],{metric:'contributionPercentage',value:sa.value,referenceValue:sb.value,difference:sa.value-sb.value},extra);
        }
      }
    }
    static generate(context,{playerRefs=[]}={}) {
      const match=context.match,round=match.roundNumber,regular=match.roundVerified&&match.competitionPhase==='regular',stories=[];
      const prior=(context.priorSeasons||[]).filter(s=>s.seasonKey<match.seasonKey);
      const current={seasonKey:match.seasonKey,state:context.currentComplete?'ready':'partial',regularGames:context.currentRegularGames||[],resultGames:context.currentResultGames||[]};
      const seasons=[...prior,current];
      const add=(type,family,team,snaps,facts,extras)=>{
        if(facts.difference!=null&&Number(facts.difference.toFixed(1))===0)return;
        stories.push(this.story(type,family,team,snaps,facts,extras));
      };
      for(const team of match.teams||[]) {
        const snap=(season,spec)=>this.snapshot(season,team,{...spec,...(season===current?{asOf:context.asOf}:{})});
        if(regular) {
          const historicalRound=W.pool(prior.map(s=>snap(s,{phase:'regular',mode:'rounds',fromRound:round,toRound:round})));
          const roundResults=historicalRound.entries.filter(e=>e.values.margin!=null).map(e=>({seasonKey:e.game.seasonKey,gameId:String(e.game.gameId),margin:e.values.margin}));
          for(const metric of scoring)if(historicalRound.metrics[metric].value!=null)add('ROUND_SCORING','ROUND',team,[historicalRound],{metric,value:historicalRound.metrics[metric].value,round,roundResults});
          if(round>1) {
            const spec={phase:'regular',mode:'rounds',fromRound:1,toRound:round-1};
            const now=snap(current,spec);
            for(const season of prior){const past=snap(season,spec);for(const metric of scoring)if(now.metrics[metric].value!=null&&past.metrics[metric].value!=null)add('SAME_STAGE_COMPARISON','ROUND',team,[now,past],{metric,value:now.metrics[metric].value,referenceValue:past.metrics[metric].value,difference:now.metrics[metric].value-past.metrics[metric].value},{scope:'comparison'});}
            const ranges=[[1,round-1],[Math.max(1,round-5),round-1],...(round>5?[[1,5]]:[]),...(round>10?[[6,10]]:[])];
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
        const ten=snap(current,{phase:'any',mode:'recent',count:10}),last=W.team(W.subset(ten.window,ten.window.resultGames.slice(-5)),team.teamId);
        const earlier=W.team(W.subset(ten.window,ten.window.resultGames.slice(0,-5),{offset:5}),team.teamId);
        for(const metric of scoring) {
          if(last.metrics[metric].gameCount>=5&&earlier.metrics[metric].gameCount>=5)add('RECENT_WINDOW_CHANGE','MOMENTUM',team,[last,earlier],{metric,value:last.metrics[metric].value,referenceValue:earlier.metrics[metric].value,difference:last.metrics[metric].value-earlier.metrics[metric].value},{scope:'current'});
          if(regular&&round>1){const roundSpec={phase:'regular',mode:'rounds',fromRound:Math.max(1,round-5),toRound:round-1};const at=snap(current,roundSpec);
            for(const season of prior){const historic=snap(season,roundSpec);if(at.metrics[metric].gameCount>=5&&historic.metrics[metric].gameCount>=5)add('HISTORICAL_WINDOW_COMPARISON','MOMENTUM',team,[at,historic],{metric,value:at.metrics[metric].value,referenceValue:historic.metrics[metric].value,difference:at.metrics[metric].value-historic.metrics[metric].value},{scope:'comparison'});}
          }
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
