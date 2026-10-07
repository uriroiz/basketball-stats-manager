(function () {
  'use strict';
  class IBBABroadcastReport {
    static selectTopStories(candidates,{limit=6,variant=0}={}) {
      if(window.IBBABroadcastEditorial)return window.IBBABroadcastEditorial.prepare(candidates,{}, {limit,variant}).topStories;
      const rounds=new Map();
      for(const story of candidates.filter(s=>s.type==='ROUND_SCORING'&&Number.isFinite(s.facts?.value))) {
        const key=JSON.stringify([story.teamIds,story.seasonKeys,story.facts.round]);
        if(!rounds.has(key))rounds.set(key,[]);
        rounds.get(key).push(story);
      }
      const merged=new Set(),briefings=[];
      for(const stories of rounds.values()) {
        if(!['points','opponentPoints','margin'].every(metric=>stories.some(s=>s.facts.metric===metric)))continue;
        const base=stories.find(s=>s.facts.metric==='margin')||stories[0];
        const summary={...base,id:`ROUND_TEAM_SUMMARY:${base.id}`,factKey:`ROUND_TEAM_SUMMARY:${base.factKey||base.id}`,type:'ROUND_TEAM_SUMMARY',
          facts:{...base.facts,roundMetrics:Object.fromEntries(stories.map(s=>[s.facts.metric,s.facts.value]))}};
        summary.text=window.IBBABroadcastCopy.format(summary,{variant});summary.broadcastShort=summary.text;
        briefings.push(summary);stories.forEach(s=>merged.add(s));
      }
      candidates=[...candidates.filter(s=>!merged.has(s)),...briefings];
      const hasRoundSummary=candidates.some(s=>s.type==='ROUND_SCORING');
      const hasBriefing=hasRoundSummary||briefings.length>0;
      const priority=s=>['ROUND_SCORING','ROUND_TEAM_SUMMARY'].includes(s.type)?110:(s.priority??({high:90,medium:65,low:40}[s.importance]||40));
      const sorted=candidates.filter(s=>!hasBriefing||s.type!=='HISTORICAL_ROUND_RESULT').sort((a,b)=>priority(b)-priority(a)||String(a.id||a.type).localeCompare(String(b.id||b.type)));
      const seen=new Set(),result=[];
      const distinct=sorted.filter(story=>{const key=story.factKey||story.id||`${story.type}:${story.teamName}:${story.text}`;if(seen.has(key))return false;seen.add(key);return true;});
      const representedTeams=new Set(),representedFamilies=new Set();
      const take=story=>{result.push(story);story.teamIds?.forEach(id=>representedTeams.add(String(id)));representedFamilies.add(story.family||story.category||story.type);};
      for(const story of distinct)if(result.length<Math.min(limit,4)&&((story.teamIds||[]).some(id=>!representedTeams.has(String(id)))||!representedFamilies.has(story.family||story.category||story.type)))take(story);
      for(const story of distinct)if(result.length<limit&&!result.includes(story)&&!result.some(other=>other.type===story.type&&['CLOSE_GAME_RECORD','QUARTER_WINDOW','HALFTIME_RECORD','SAME_STAGE_RECORD'].includes(story.type)&&JSON.stringify(other.teamIds)===JSON.stringify(story.teamIds)&&other.facts?.quarter===story.facts?.quarter&&other.facts?.position===story.facts?.position))take(story);
      return result;
    }
    static async build(match,{contextService,currentReportBuilder,selectedPlayerRefs=[],now=new Date(),refresh=false}={}) {
      const context=await contextService.load(match,{now,refresh});
      let currentSeason=null;const sourceStatuses=context.priorSeasons.map(s=>({seasonKey:s.seasonKey,state:s.state,error:s.error,failedMonths:s.failedMonths}));
      if(!context.currentComplete)sourceStatuses.push({seasonKey:match.seasonKey,state:'partial',failedMonths:context.currentFailedMonths||[],error:context.currentError});
      const both=context.currentComplete&&(match.teams||[]).every(team=>context.currentGames.some(g=>g.teams?.some(t=>String(t.teamId)===String(team.teamId))));
      if(both&&context.currentGames.length&&currentReportBuilder) {
        try {currentSeason=await currentReportBuilder(context.currentGames);}
        catch(error){sourceStatuses.push({seasonKey:match.seasonKey,state:'error',error:error.message});}
      }
      return this.compose({seasonKey:match.seasonKey,gameInfo:match,generatedAt:new Date(now).toISOString(),currentSeason,sourceStatuses,context},selectedPlayerRefs);
    }
    static compose(report,playerRefs=[]) {
      playerRefs=[...new Set(playerRefs.map(ref=>report.context.identity?.(ref)||ref).filter(Boolean))];
      const historicalInsights=window.IBBAHistoricalInsights.generate(report.context,{playerRefs});
      const current=Object.values(report.currentSeason?.insightsV2||{}).flat().map(i=>{
        const games=report.context.currentGames.filter(g=>!i.teamName||g.teams?.some(t=>t.name===i.teamName));
        const identity=i.id||`legacy:${report.seasonKey}:${JSON.stringify(Object.fromEntries(Object.entries(i).filter(([key])=>!['text','textShort','broadcastShort','importance','priority'].includes(key)).sort(([a],[b])=>a.localeCompare(b))))}`;
        const facts=i.facts||Object.fromEntries(Object.entries(i).filter(([key])=>!['text','textShort','broadcastShort','importance','priority','category','id','icon','teamName','playerName'].includes(key)));
        const entityNames=[i.teamName,i.teamA,i.teamB].filter(Boolean),matchTeams=report.context.match.teams||[];
        const teamIds=entityNames.length && entityNames.every(name=>matchTeams.some(t=>t.name===name))
          ? matchTeams.filter(t=>entityNames.includes(t.name)).map(t=>t.teamId) : [];
        const analysisScope=i.analysisScope||window.IBBAAnalysisScope?.fromGames([],{phase:'unknown',requestedSeasonKeys:[report.seasonKey],asOf:report.context.asOf});
        return {...i,id:identity,factKey:i.factKey||identity,facts,analysisScope,teamIds,playerRef:i.playerId!=null?report.context.identity?.({playerId:i.playerId})||`wp:${i.playerId}`:i.playerRef,scope:'current',seasonKeys:[report.seasonKey],sampleSize:Number.isFinite(i.games)?i.games:null,sourceGameCount:games.length,
          evidence:games.map(g=>({seasonKey:g.seasonKey,gameId:g.gameId,sourceUrl:g.permalink,fields:['results','performance']})),dataState:report.context.currentComplete?'ready':'partial',
          text:`בעונת ${window.IBBASeasons.getSeason(report.seasonKey).label}: ${i.text}`};
      });
      const rich=(window.IBBARichInsights?.generate(report.context,{playerRefs})||[]).map(s=>{const text=window.IBBABroadcastCopy?.format(s,{variant:report.copyVariant||0})||s.text;return {...s,text,broadcastShort:text};});
      const familyFor=s=>{const candidate=s.family||({'H2H':'MATCHUP','BACKGROUND':'PROFILE','QUARTERS':'DECIDING'}[s.category]||s.category);return ['ROUND','MOMENTUM','PROFILE','DECIDING','MATCHUP','PLAYERS'].includes(candidate)?candidate:'PROFILE';};
      const legacy=[...current,...historicalInsights].map(s=>({...s,family:familyFor(s),factKey:s.factKey||s.id}));
      const candidates=[...new Map([...rich,...legacy].map(s=>[s.factKey||s.id,s])).values()];
      const editorial=window.IBBABroadcastEditorial?.prepare(candidates,report.context,{variant:report.copyVariant||0});
      const allInsights=editorial?.allStories||candidates;
      const families=Object.fromEntries(['ROUND','MOMENTUM','PROFILE','DECIDING','MATCHUP','PLAYERS'].map(f=>[f,allInsights.filter(s=>s.family===f)]));
      return {...report,historicalContext:report.context.playerSummaries,historicalInsights,allInsights,families,topStories:editorial?.topStories||this.selectTopStories(allInsights,{variant:report.copyVariant||0}),selectedPlayerRefs:[...playerRefs]};
    }
    static captureExport(report,workspaceResult,{mode='full'}={}) {
      if(!['personal','recommended','full'].includes(mode))throw new Error('מצב ייצוא לא מוכר');
      const ref=workspaceResult?.state?.matchRef,match=report?.gameInfo || workspaceResult?.state?.matchSnapshot;
      if(ref && (!match || ref.seasonKey!==(match.seasonKey || report?.seasonKey) || String(ref.gameId)!==String(match.gameId)))throw new Error('הדוח והדף האישי שייכים למשחק אחר');
      if(mode==='full' && report?.cachedOnly)throw new Error('ייצוא מלא דורש דוח מעודכן');
      if(mode==='recommended' && !report?.topStories?.length)throw new Error('אין נקודות מומלצות לייצוא למשחק זה');
      const clone=value=>JSON.parse(JSON.stringify(value));
      return clone({mode,match,seasonKey:report?.seasonKey || ref?.seasonKey,rows:this.exportRows(report,{mode,workspace:workspaceResult}),capturedAt:new Date().toISOString()});
    }
    static exportRows(report,{mode='full',workspace=null}={}) {
      if(mode==='personal') {
        const rows=[['=== הדף שלי לשידור ===']];
        if(workspace?.cached)rows.push(['עותק שמור — הנתונים לא עודכנו',workspace.state?.updatedAt || '']);
        rows.push(['משפט לשידור','הערה לשידור','נאמר בשידור','היקף הנתונים','מועד שמירה']);
        for(const item of workspace?.state?.items || [])if(item.status==='active')rows.push([item.storySnapshot.text,item.note || '',item.used?'כן':'לא',window.IBBAAnalysisScope?.label(item.storySnapshot.analysisScope) || 'היקף לא צוין',workspace.state.updatedAt || '']);
        if(!workspace?.state?.items?.some(i=>i.status==='active'))rows.push(['אין נקודות פעילות בדף האישי']);
        return rows;
      }
      const rows=[['=== נקודות לשידור ===']];
      if(!report?.historicalInsights)return rows.concat([['ההקשר ההיסטורי טרם נטען']]);
      const sections=mode==='recommended'?[['נקודות מומלצות לשידור',report.topStories]]:[['נקודות לשידור',report.topStories],['כל התובנות',report.allInsights||report.historicalInsights]];
      for(const [title,stories] of sections) {
        rows.push([title],['משפט לשידור','עונות','חלונות','משחקים במדגם','מצב נתונים','מקור','משפחה','עובדות','מדגמי ההשוואה','כיסוי','שחקן','היקף הנתונים']);
        for(const s of stories||[])rows.push([s.text,(s.seasonKeys||[]).map(k=>window.IBBASeasons.getSeason(k)?.label||k).join(', '),s.windows?JSON.stringify(s.windows):s.roundWindow?.join('–')||'—',s.sampleSize??`${s.sourceGameCount??'—'} משחקי מקור; מדגם הגלאי לא צוין`,s.dataState||'ready',(s.evidence||[]).map(e=>e.sourceUrl||'מקור חסר').join('\n'),s.family||s.category,JSON.stringify(s.facts||{}),JSON.stringify(s.samples||[]),JSON.stringify(s.coverage||[]),s.playerRef||'',JSON.stringify(s.analysisScope||null)]);
      }
      if(mode==='recommended')return rows;
      const records=(report.context?.playerSummaries?.records||[]).filter(r=>(report.selectedPlayerRefs||[]).includes(report.context.identity(r.playerRef)));
      if(records.length&&window.IBBAPlayerHistory)rows.push(...window.IBBAPlayerHistory.exportRows({...report.context.playerSummaries,records}));
      if(['idle','loading'].includes(report.historicalContext?.state)||!report.historicalContext)rows.push(['ההיסטוריה טרם נטענה']);
      for(const status of report.sourceStatuses||[])if(status.state!=='ready')rows.push([window.IBBASeasons.getSeason(status.seasonKey)?.label||status.seasonKey,status.state,status.error||status.failedMonths?.join(', ')||'נתונים חלקיים']);
      return rows;
    }
  }
  window.IBBABroadcastReport=IBBABroadcastReport;
})();
