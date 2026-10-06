(function () {
  'use strict';
  class IBBABroadcastReport {
    static selectTopStories(candidates,{limit=8}={}) {
      const sorted=[...candidates].sort((a,b)=>(b.priority??({high:90,medium:65,low:40}[b.importance]||40))-(a.priority??({high:90,medium:65,low:40}[a.importance]||40))||String(a.id||a.type).localeCompare(String(b.id||b.type)));
      const seen=new Set(),counts=new Map(),result=[];
      for(const story of sorted) {
        const key=story.id || `${story.type}:${story.teamName}:${story.playerName||''}:${story.text}`;
        if(seen.has(key))continue;seen.add(key);
        const group=`${story.teamIds?.[0]??story.teamName??'both'}:${story.category||story.type}`;
        if((counts.get(group)||0)>=2)continue;
        counts.set(group,(counts.get(group)||0)+1);result.push(story);
        if(result.length===limit)break;
      }
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
      const historicalInsights=window.IBBAHistoricalInsights.generate(report.context,{playerRefs});
      const current=Object.values(report.currentSeason?.insightsV2||{}).flat().map(i=>{
        const games=report.context.currentGames.filter(g=>!i.teamName||g.teams?.some(t=>t.name===i.teamName));
        return {...i,scope:'current',seasonKeys:[report.seasonKey],sampleSize:Number.isFinite(i.games)?i.games:null,sourceGameCount:games.length,
          evidence:games.map(g=>({seasonKey:g.seasonKey,gameId:g.gameId,sourceUrl:g.permalink,fields:['results','performance']})),dataState:report.context.currentComplete?'ready':'partial',
          text:`בעונת ${window.IBBASeasons.getSeason(report.seasonKey).label}: ${i.text}`};
      });
      return {...report,historicalContext:report.context.playerSummaries,historicalInsights,topStories:this.selectTopStories([...current,...historicalInsights]),selectedPlayerRefs:[...playerRefs]};
    }
    static exportRows(report) {
      const rows=[['=== נקודות לשידור ===']];
      if(!report?.historicalInsights)return rows.concat([['ההקשר ההיסטורי טרם נטען']]);
      for(const [title,stories] of [['נקודות לשידור',report.topStories],['עבר רלוונטי למשחק ולמחזור',report.historicalInsights]]) {
        rows.push([title],['משפט לשידור','עונות','מחזורים','משחקים במדגם','מצב נתונים','מקור']);
        for(const s of stories||[])rows.push([s.text,(s.seasonKeys||[]).map(k=>window.IBBASeasons.getSeason(k)?.label||k).join(', '),s.roundWindow?.join('–')||'—',s.sampleSize??`${s.sourceGameCount??'—'} משחקי מקור; מדגם הגלאי לא צוין`,s.dataState||'ready',(s.evidence||[]).map(e=>e.sourceUrl||'מקור חסר').join('\n')]);
      }
      if(['idle','loading'].includes(report.historicalContext?.state)||!report.historicalContext)rows.push(['ההיסטוריה טרם נטענה']);
      for(const status of report.sourceStatuses||[])if(status.state!=='ready')rows.push([window.IBBASeasons.getSeason(status.seasonKey)?.label||status.seasonKey,status.state,status.error||status.failedMonths?.join(', ')||'נתונים חלקיים']);
      return rows;
    }
  }
  window.IBBABroadcastReport=IBBABroadcastReport;
})();
