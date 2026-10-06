(function () {
  'use strict';
  class IBBABroadcastReport {
    static selectTopStories(candidates,{limit=8}={}) {
      const sorted=[...candidates].sort((a,b)=>(b.priority??({high:90,medium:65,low:40}[b.importance]||40))-(a.priority??({high:90,medium:65,low:40}[a.importance]||40))||String(a.id||a.type).localeCompare(String(b.id||b.type)));
      const seen=new Set(),result=[];
      const distinct=sorted.filter(story=>{const key=story.factKey||story.id||`${story.type}:${story.teamName}:${story.text}`;if(seen.has(key))return false;seen.add(key);return true;});
      const representedTeams=new Set(),representedFamilies=new Set();
      const take=story=>{result.push(story);story.teamIds?.forEach(id=>representedTeams.add(String(id)));representedFamilies.add(story.family||story.category||story.type);};
      for(const story of distinct)if(result.length<Math.min(limit,4)&&((story.teamIds||[]).some(id=>!representedTeams.has(String(id)))||!representedFamilies.has(story.family||story.category||story.type)))take(story);
      for(const story of distinct)if(result.length<limit&&!result.includes(story))take(story);
      return result;
    }
    static async build(match,{contextService,currentReportBuilder,selectedPlayerRefs=[],now=new Date(),refresh=false}={}) {
      const context=await contextService.load(match,{now,refresh});
      let currentSeason=null;const sourceStatuses=context.priorSeasons.map(s=>({seasonKey:s.seasonKey,state:s.state,error:s.error,failedMonths:s.failedMonths}));
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
        return {...i,id:identity,factKey:i.factKey||identity,facts,scope:'current',seasonKeys:[report.seasonKey],sampleSize:Number.isFinite(i.games)?i.games:null,sourceGameCount:games.length,
          evidence:games.map(g=>({seasonKey:g.seasonKey,gameId:g.gameId,sourceUrl:g.permalink,fields:['results','performance']})),dataState:report.context.currentComplete?'ready':'partial',
          text:`בעונת ${window.IBBASeasons.getSeason(report.seasonKey).label}: ${i.text}`};
      });
      const rich=(window.IBBARichInsights?.generate(report.context,{playerRefs})||[]).map(s=>{const text=window.IBBABroadcastCopy?.format(s,{variant:report.copyVariant||0})||s.text;return {...s,text,broadcastShort:text};});
      const familyFor=s=>{const candidate=s.family||({'H2H':'MATCHUP','BACKGROUND':'PROFILE','QUARTERS':'DECIDING'}[s.category]||s.category);return ['ROUND','MOMENTUM','PROFILE','DECIDING','MATCHUP','PLAYERS'].includes(candidate)?candidate:'PROFILE';};
      const legacy=[...current,...historicalInsights].map(s=>({...s,family:familyFor(s),factKey:s.factKey||s.id}));
      const allInsights=[...new Map([...rich,...legacy].map(s=>[s.factKey||s.id,s])).values()];
      const families=Object.fromEntries(['ROUND','MOMENTUM','PROFILE','DECIDING','MATCHUP','PLAYERS'].map(f=>[f,allInsights.filter(s=>s.family===f)]));
      return {...report,historicalContext:report.context.playerSummaries,historicalInsights,allInsights,families,topStories:this.selectTopStories(allInsights),selectedPlayerRefs:[...playerRefs]};
    }
    static exportRows(report) {
      const rows=[['=== נקודות לשידור ===']];
      if(!report?.historicalInsights)return rows.concat([['ההקשר ההיסטורי טרם נטען']]);
      for(const [title,stories] of [['נקודות לשידור',report.topStories],['כל התובנות',report.allInsights||report.historicalInsights]]) {
        rows.push([title],['משפט לשידור','עונות','חלונות','משחקים במדגם','מצב נתונים','מקור','משפחה','עובדות','מדגמי ההשוואה','כיסוי','שחקן']);
        for(const s of stories||[])rows.push([s.text,(s.seasonKeys||[]).map(k=>window.IBBASeasons.getSeason(k)?.label||k).join(', '),s.windows?JSON.stringify(s.windows):s.roundWindow?.join('–')||'—',s.sampleSize??`${s.sourceGameCount??'—'} משחקי מקור; מדגם הגלאי לא צוין`,s.dataState||'ready',(s.evidence||[]).map(e=>e.sourceUrl||'מקור חסר').join('\n'),s.family||s.category,JSON.stringify(s.facts||{}),JSON.stringify(s.samples||[]),JSON.stringify(s.coverage||[]),s.playerRef||'']);
      }
      const records=(report.context?.playerSummaries?.records||[]).filter(r=>(report.selectedPlayerRefs||[]).includes(report.context.identity(r.playerRef)));
      if(records.length&&window.IBBAPlayerHistory)rows.push(...window.IBBAPlayerHistory.exportRows({...report.context.playerSummaries,records}));
      if(['idle','loading'].includes(report.historicalContext?.state)||!report.historicalContext)rows.push(['ההיסטוריה טרם נטענה']);
      for(const status of report.sourceStatuses||[])if(status.state!=='ready')rows.push([window.IBBASeasons.getSeason(status.seasonKey)?.label||status.seasonKey,status.state,status.error||status.failedMonths?.join(', ')||'נתונים חלקיים']);
      return rows;
    }
  }
  window.IBBABroadcastReport=IBBABroadcastReport;
})();
