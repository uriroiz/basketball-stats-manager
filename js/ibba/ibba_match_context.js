(function () {
  'use strict';
  const unique = games => Array.from(new Map((games || []).map(g=>[String(g.gameId),g])).values());
  class IBBAMatchContext {
    constructor({seasonData,playerHistory,teamSummaries,teamIdentity}={}) {
      this.seasonData=seasonData || new window.IBBASeasonData();
      this.playerHistory=playerHistory;
      this.teamSummaries=teamSummaries;
      this.teamIdentity=teamIdentity;
    }
    sameTeam(a,b) {
      if(a?.teamId!=null && b?.teamId!=null)return String(a.teamId)===String(b.teamId);
      return Boolean(this.teamIdentity?.(a,b));
    }
    async load(match,{refresh=false,now=new Date()}={}) {
      const asOf=new Date(Math.min(+new Date(now),+new Date(match.date))).toISOString();
      const prior=window.IBBASeasons.seasons.filter(s=>s.key<match.seasonKey);
      const current=await this.seasonData.loadSeason(match.seasonKey,{refresh}).catch(()=>null);
      const priorSeasons=await Promise.all(prior.map(async season=>{
        try {
          const [data,regular]=await Promise.all([
            this.seasonData.loadSeason(season.key,{refresh}),
            this.seasonData.loadSeason(season.key,{regularOnly:true})
          ]);
          const resultGames=unique(data.scheduleGames).filter(g=>g.seasonKey===season.key&&g.hasResult);
          const regularGames=unique(regular.scheduleGames).filter(g=>g.seasonKey===season.key&&g.roundVerified&&g.competitionPhase==='regular');
          const regularById=new Map(regularGames.map(g=>[String(g.gameId),g]));
          const statGames=resultGames.filter(g=>g.hasPlayerStats).map(g=>{
            const verified=regularById.get(String(g.gameId));
            return verified?{...g,roundNumber:verified.roundNumber,roundLabel:verified.roundLabel,roundVerified:true,competitionPhase:'regular'}:g;
          });
          const comparable=match.roundVerified&&match.competitionPhase==='regular';
          const beforeRoundGames=comparable?regularGames.filter(g=>g.hasResult&&g.roundNumber<match.roundNumber):[];
          const sameRoundGames=comparable?regularGames.filter(g=>g.hasResult&&g.roundNumber===match.roundNumber):[];
          const complete=comparable&&regular.complete&&(match.teams||[]).every(team=>Array.from({length:Math.max(0,match.roundNumber-1)},(_,i)=>i+1).every(round=>{
            const games=regularGames.filter(g=>g.roundNumber===round&&g.teams?.some(t=>this.sameTeam(t,team)));
            return games.length===1&&games[0].hasResult;
          }));
          return {seasonKey:season.key,state:data.complete&&regular.complete?'ready':'partial',failedMonths:[...new Set([...(data.failedMonths||[]),...(regular.failedMonths||[])])],
            coverage:{transportComplete:data.complete&&regular.complete,roundWindowComplete:Boolean(complete),phaseVerified:Boolean(comparable&&regularGames.length)},
            resultGames,statGames,sameRoundGames,beforeRoundGames,regularGames};
        }catch(error){return {seasonKey:season.key,state:'error',error:error.message,failedMonths:[],coverage:{transportComplete:false,roundWindowComplete:false,phaseVerified:false},resultGames:[],statGames:[],sameRoundGames:[],beforeRoundGames:[],regularGames:[]};}
      }));
      return {match,asOf,currentComplete:Boolean(current?.complete),
        currentGames:unique(current?.scheduleGames).filter(g=>g.seasonKey===match.seasonKey&&g.hasResult&&g.hasPlayerStats&&+new Date(g.date)<=+new Date(asOf)),priorSeasons,
        playerSummaries:{state:'idle',records:[],statuses:[]},teamSummaries:[],identity:ref=>this.playerHistory?.identity(ref) || window.IBBAPlayerHistory?.playerRef(ref)};
    }
    async enrich(context,{refresh=false}={}) {
      const [players,teams]=await Promise.all([
        this.playerHistory?.loadHistory(context.match.seasonKey,{refresh}) || {state:'idle',records:[],statuses:[]},
        Promise.all(context.priorSeasons.map(s=>this.teamSummaries?.load(s.seasonKey,{refresh}) || {seasonKey:s.seasonKey,state:'idle',records:[]}))
      ]);
      return {...context,playerSummaries:players,teamSummaries:teams};
    }
  }
  window.IBBAMatchContext=IBBAMatchContext;
})();
