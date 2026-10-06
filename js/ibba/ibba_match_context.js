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
    coverage(games,match,transportComplete,asOf) {
      const comparable=match.roundVerified&&match.competitionPhase==='regular';
      return Object.fromEntries((match.teams||[]).map(team=>{
        const availableRounds=[],missingRounds=[];
        for(let round=1;comparable&&round<match.roundNumber;round++) {
          const found=games.filter(g=>g.roundNumber===round&&g.teams?.some(t=>this.sameTeam(t,team)));
          (found.length===1&&found[0].hasResult&&(!asOf||+new Date(found[0].date)<=+new Date(asOf))?availableRounds:missingRounds).push(round);
        }
        return [String(team.teamId),{complete:Boolean(comparable&&transportComplete&&!missingRounds.length),availableRounds,missingRounds}];
      }));
    }
    async load(match,{refresh=false,now=new Date()}={}) {
      const asOf=new Date(Math.min(+new Date(now),+new Date(match.date))).toISOString();
      const prior=window.IBBASeasons.seasons.filter(s=>s.key<match.seasonKey);
      if(refresh)this.seasonData.invalidateSeason?.(match.seasonKey);
      const current=await this.seasonData.loadSeason(match.seasonKey,{}).catch(()=>null);
      const priorSeasons=await Promise.all(prior.map(async season=>{
        try {
          if(refresh)this.seasonData.invalidateSeason?.(season.key);
          const [data,regular]=await Promise.all([
            this.seasonData.loadSeason(season.key,{}),
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
          const coverageByTeam=this.coverage(regularGames,match,regular.complete);
          const complete=Object.values(coverageByTeam).every(c=>c.complete);
          return {seasonKey:season.key,state:data.complete&&regular.complete?'ready':'partial',failedMonths:[...new Set([...(data.failedMonths||[]),...(regular.failedMonths||[])])],
            coverage:{transportComplete:data.complete&&regular.complete,roundWindowComplete:Boolean(complete),phaseVerified:Boolean(comparable&&regularGames.length)},
            coverageByTeam,resultGames,statGames,sameRoundGames,beforeRoundGames,regularGames};
        }catch(error){return {seasonKey:season.key,state:'error',error:error.message,failedMonths:[],coverageByTeam:this.coverage([],match,false),coverage:{transportComplete:false,roundWindowComplete:false,phaseVerified:false},resultGames:[],statGames:[],sameRoundGames:[],beforeRoundGames:[],regularGames:[]};}
      }));
      const currentScheduleGames=unique(current?.scheduleGames).filter(g=>g.seasonKey===match.seasonKey);
      const currentResultGames=currentScheduleGames.filter(g=>g.hasResult&&+new Date(g.date)<=+new Date(asOf));
      const currentRegularGames=currentScheduleGames.filter(g=>g.roundVerified&&g.competitionPhase==='regular');
      return {match,asOf,currentComplete:Boolean(current?.complete),currentScheduleGames,currentResultGames,currentRegularGames,
        currentCoverageByTeam:this.coverage(currentRegularGames,match,current?.complete,asOf),
        currentGames:currentResultGames.filter(g=>g.hasPlayerStats),priorSeasons,
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
