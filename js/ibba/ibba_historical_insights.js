(function () {
  'use strict';
  const label=key=>window.IBBASeasons.getSeason(key)?.label || key;
  const same=(a,b)=>a!=null&&b!=null&&String(a)===String(b);
  const unique=games=>Array.from(new Map((games||[]).map(g=>[`${g.seasonKey}:${g.gameId}`,g])).values());
  const newest=games=>unique(games).sort((a,b)=>+new Date(b.date)-+new Date(a.date)||Number(b.gameId)-Number(a.gameId));
  const evidence=game=>({seasonKey:game.seasonKey,gameId:game.gameId,sourceUrl:game.permalink,fields:['date','teams','results','stage_id']});
  const gameText=game=>`${game.teams[0].name} ${game.teams[0].score} — ${game.teams[1].score} ${game.teams[1].name}`;
  function make(type,season,teams,facts,text,games,extras={}) {
    return {id:`${type}:${season}:${teams.join(',')}:${games.map(g=>g.gameId).join(',')}:${extras.playerRef||''}:${extras.historicalTeam||''}`,
      type,category:type.includes('PLAYER')?'PLAYERS':type.includes('MEETING')||type.includes('H2H')?'H2H':type.includes('OFFICIAL')?'BACKGROUND':'ROUND',scope:'historical',seasonKeys:[season],teamIds:teams,
      playerRef:null,historicalTeam:null,roundWindow:null,sampleSize:games.length,facts,evidence:games.map(evidence),dataState:'ready',text,broadcastShort:text,priority:type==='LAST_HISTORICAL_MEETING'?95:75,
      analysisScope:type.includes('OFFICIAL') ? window.IBBAAnalysisScope?.forOfficialSummary({games:extras.sampleSize,points:facts.points},{seasonKey:season,entityRef:extras.playerRef||String(teams[0])})
        : window.IBBAAnalysisScope?.fromGames(games,{phase:extras.roundWindow?'regular':'all',mode:extras.roundWindow?'rounds':type.includes('H2H')?'meetings':'single',requestedSeasonKeys:[season],fromRound:extras.roundWindow?.[0],toRound:extras.roundWindow?.[1]}),...extras};
  }
  class IBBAHistoricalInsights {
    static generate(context,{playerRefs=[]}={}) {
      const stories=[],match=context.match;
      const selected=match.teams || [];
      const inMatch=game=>selected.every(t=>game.teams?.some(other=>same(t.teamId,other.teamId)));
      const allMeetings=newest([...context.priorSeasons.flatMap(s=>s.resultGames),...(context.currentResultGames||[])].filter(inMatch));
      if(allMeetings.length) {
        const g=allMeetings[0];
        const [winner,loser]=[...g.teams].sort((a,b)=>Number(b.score)-Number(a.score));
        const resultText=Number(winner.score)>Number(loser.score)?`${winner.name} ניצחה את ${loser.name} ${winner.score}:${loser.score}`:gameText(g);
        stories.push(make('LAST_HISTORICAL_MEETING',g.seasonKey,selected.map(t=>t.teamId),{score:g.teams.map(t=>t.score),date:g.date},
          `במפגש האחרון, בעונת ${label(g.seasonKey)} (${new Date(g.date).toLocaleDateString('he-IL')}), ${resultText}${g.roundVerified&&g.competitionPhase==='regular'?`, במחזור ${g.roundNumber} של העונה הסדירה`:''}.`,[g],{scope:g.seasonKey===match.seasonKey?'current':'historical'}));
      }
      for(const season of context.priorSeasons) {
        const year=label(season.seasonKey),meetings=unique(season.resultGames.filter(inMatch));
        if(meetings.length) {
          const records=selected.map(team=>({team,wins:meetings.filter(g=>{const own=g.teams.find(t=>same(t.teamId,team.teamId)),rival=g.teams.find(t=>!same(t.teamId,team.teamId));return Number(own.score)>Number(rival.score);}).length}));
          const leader=records[0].wins===records[1].wins?null:records.reduce((a,b)=>a.wins>b.wins?a:b);
          const text=leader
            ? `${leader.team.name} ניצחה ב־${leader.wins} מתוך ${meetings.length} המפגשים מול ${selected.find(t=>!same(t.teamId,leader.team.teamId)).name}.`
            : `במפגשים בין ${selected[0].name} ל־${selected[1].name}, כל קבוצה ניצחה ${records[0].wins===1?'מפגש אחד':`ב־${records[0].wins} מפגשים`}.`;
          stories.push(make('HISTORICAL_H2H_RECORD',season.seasonKey,selected.map(t=>t.teamId),{wins:records[0].wins,losses:records[1].wins,total:meetings.length,winnerTeamId:leader?.team.teamId??null,winsByTeam:records.map(r=>({teamId:r.team.teamId,wins:r.wins}))},
            `בעונת ${year}, ${text}`,meetings,{dataState:season.state,priority:80}));
        }
        for(const team of selected) {
          if(match.roundVerified&&match.competitionPhase==='regular') {
            for(const g of unique(season.sameRoundGames).filter(g=>g.teams.some(t=>same(t.teamId,team.teamId)))) {
              const historic=g.teams.find(t=>same(t.teamId,team.teamId));
              stories.push(make('HISTORICAL_ROUND_RESULT',season.seasonKey,[team.teamId],{round:g.roundNumber,score:g.teams.map(t=>t.score),date:g.date},
                `במחזור ${g.roundNumber} של העונה הסדירה ${year}: ${gameText(g)} (${historic.isHome?'בבית':'בחוץ'} עבור ${historic.name}).`,[g],{roundWindow:[g.roundNumber,g.roundNumber],priority:match.roundNumber===1?100:85}));
            }
            if(match.roundNumber>1) {
              const games=unique(season.beforeRoundGames).filter(g=>g.teams.some(t=>same(t.teamId,team.teamId)));
              if(games.length) {
                const wins=games.filter(g=>{const t=g.teams.find(t=>same(t.teamId,team.teamId));return t.score>g.teams.find(t=>!same(t.teamId,team.teamId)).score;}).length;
                const complete=season.coverageByTeam?.[team.teamId]?.complete??season.coverage.roundWindowComplete;
                stories.push(make('SAME_STAGE_RECORD',season.seasonKey,[team.teamId],{wins,losses:games.length-wins,from:1,to:match.roundNumber-1},
                  `לפני מחזור ${match.roundNumber} בעונת ${year}, ${team.name} רשמה ${wins===1?'ניצחון אחד':`${wins} ניצחונות`} ב־${games.length} משחקים ממחזורים 1–${match.roundNumber-1} של העונה הסדירה.`,games,{teamName:team.name,roundWindow:[1,match.roundNumber-1],dataState:complete?'ready':'partial',priority:90}));
              }
            }
          }
        }
        for(const ref of [...new Set(playerRefs.map(r=>context.identity(r)).filter(Boolean))]) {
          const rows=(context.playerSummaries?.records || []).filter(r=>r.seasonKey===season.seasonKey&&context.identity(r.playerRef)===ref);
          for(const r of rows) {
            const text=`${r.name}: בעונת ${year}, ב${r.team||'קבוצה שלא צוינה'}, ${r.games??'מספר לא ידוע של'} משחקים${r.points==null?'':`, ${r.points} נקודות בממוצע`}.`;
            stories.push(make('PLAYER_OFFICIAL_SEASON',season.seasonKey,[],{games:r.games,points:r.points},text,[],{playerRef:ref,historicalTeam:r.team,sampleSize:r.games,evidence:[{seasonKey:r.seasonKey,sourceUrl:r.sourceUrl,fields:['games','points','team']}],priority:88}));
          }
          const appearances=newest(season.statGames).flatMap(g=>(g.playerObservations||[]).filter(p=>p.participation==='verified'&&p.availableMetrics.includes('points')&&context.identity({playerId:p.playerId})===ref).map(p=>({g,p})));
          for(const type of ['PLAYER_PREVIOUS_OPPONENT_GAME','PLAYER_SAME_ROUND_GAME']) {
            const found=appearances.find(({g,p})=>type==='PLAYER_SAME_ROUND_GAME'
              ? match.roundVerified&&g.roundVerified&&g.competitionPhase==='regular'&&g.roundNumber===match.roundNumber
              : g.teams.some(t=>selected.some(s=>same(s.teamId,t.teamId))&&!same(t.teamId,p.teamId)));
            if(!found)continue;
            const {g,p}=found,points=p.stats?.points;
            if(points==null||!Number.isFinite(Number(points)))continue;
            const name=rows[0]?.name || window.playerNamesLoader?.namesMap?.get(p.playerId)?.name || `שחקן במזהה ${p.playerId}`;
            const rival=g.teams.find(t=>!same(t.teamId,p.teamId));
            stories.push(make(type,season.seasonKey,[p.teamId],{points:Number(points),date:g.date,round:g.roundVerified?g.roundNumber:null},
              `${name} קלע ${points} נקודות מול ${rival.name} בעונת ${year}${g.roundVerified?`, מחזור ${g.roundNumber} בעונה הסדירה`:`, בתאריך ${new Date(g.date).toLocaleDateString('he-IL')}`}, כששיחק ב${p.teamName}.`,[g],{playerRef:ref,historicalTeam:p.teamName,priority:92}));
          }
        }
        for(const team of selected) {
          const summaries=(context.teamSummaries||[]).find(s=>s.seasonKey===season.seasonKey);
          const record=summaries?.records?.find(r=>r.teamRef&&team.profileUrl===r.teamRef);
          if(record?.metrics?.points!=null)stories.push(make('TEAM_OFFICIAL_SEASON_BACKGROUND',season.seasonKey,[team.teamId],{points:record.metrics.points,games:record.games},
            `בעונה הסדירה ${year}, ${record.name} רשמה ${record.metrics.points} נקודות בממוצע ב־${record.games??'מספר לא ידוע של'} משחקים.`,[],{sampleSize:record.games,evidence:[{seasonKey:season.seasonKey,sourceUrl:record.sourceUrl,fields:['points','games','teamRef']}],priority:60}));
        }
      }
      return Array.from(new Map(stories.map(i=>[i.id,i])).values());
    }
  }
  window.IBBAHistoricalInsights=IBBAHistoricalInsights;
})();


