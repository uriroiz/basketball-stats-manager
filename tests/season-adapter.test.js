const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
function adapter(fetch, seasonKey = null) {
  const c = {window:{},fetch,console:{log(){},warn(){},error(){}},URL,Date,
    document:{createElement:()=>({set innerHTML(v){this.value=v.replace(/&#8212;|&mdash;/g,'—').replace(/&ndash;/g,'–').replace(/&amp;/g,'&');},value:''})}};
  vm.runInNewContext(fs.readFileSync('js/ibba/ibba_adapter.js','utf8'),c);
  vm.runInNewContext(fs.readFileSync('js/ibba/ibba_seasons.js','utf8'),c);
  return new c.window.IBBAAdapter(seasonKey ? c.window.IBBASeasons.getSeason(seasonKey) : {key:'2026-27',leagueId:119894,seasonId:119888,seasonMonths:['2026-10','2026-11']});
}
async function run() {
  // The unfiltered official endpoint currently omits the opening round even
  // while returning a nonempty, paginated schedule. Monthly queries retain it.
  const fullStats=Object.fromEntries(['min','pts','fgm','fga','threepm','threepa','ftm','fta','off','def','ast','stl','blk','to','pf','rate'].map(key=>[key,1]));
  fullStats.min='01:00';
  const openingRound=[
    {id:1502010,teams:[166511,168948],date:'2026-10-16T13:00:00',title:{rendered:'אליצור יבנה — הפועל חיפה'},performance:{166511:{0:{pts:63},11:fullStats},168948:{0:{pts:94},22:fullStats}}},
    {id:1502014,teams:[596011,166345],date:'2026-10-16T13:45:00',title:{rendered:'מגדל העמק — עירוני נהריה'},performance:{596011:{0:{pts:69},33:fullStats},166345:{0:{pts:89},44:fullStats}}}
  ];
  const upcoming={id:1502024,teams:[166345,166511],date:'2026-10-22T19:00:00',title:{rendered:'עירוני נהריה — אליצור יבנה'},performance:''};
  const restored=adapter(async url=>{const month=new URL(url).searchParams.get('month');return {ok:true,json:async()=>month==='2026-10'?[...openingRound,upcoming]:month?[]:[upcoming]};});
  const completeSchedule=await restored.fetchSeasonGames();
  assert.deepStrictEqual(Array.from(completeSchedule.games,g=>g.id),[1502010,1502014,1502024],'nonempty general schedule must not hide older completed games');
  assert.strictEqual(completeSchedule.complete,true);
  const allNormalized=completeSchedule.games.map(g=>restored.convertToInternalFormat(g));
  assert.strictEqual(allNormalized.filter(g=>g.hasResult&&g.hasPlayerStats).length,2,'both selected teams retain their opening-round statistics');
  const monthOnly=adapter(async()=>({ok:true,json:async()=>[]}));
  monthOnly.fetchEventPages=async month=>{
    if(month==='2026-10')return [...openingRound,upcoming];
    throw Error('month offline');
  };
  const partialWithResults=await monthOnly.fetchSeasonGames();
  assert.strictEqual(partialWithResults.games.length,3,'a failed month retains available results');
  assert.strictEqual(partialWithResults.complete,false);
  assert.deepStrictEqual(Array.from(partialWithResults.failedMonths),['2026-11']);
  const urls=[];
  const a = adapter(async url => {
    urls.push(url); const u=new URL(url);
    return {ok:true,json:async()=>Number(u.searchParams.get('offset'))===0
      ? Array.from({length:100},(_,i)=>({id:i+1})) : [{id:101}]};
  });
  assert.strictEqual(a.leagueId,119894,'explicit season controls adapter');
  const r=await a.fetchSeasonGames();
  const historical=adapter(async()=>{throw Error('no network needed');},'2024-25');
  const deletedTeamGame={id:971291,teams:[166934,596704],date:'2024-10-01',title:{rendered:'Home — '},performance:''};
  const recovered=historical.convertToInternalFormat(deletedTeamGame);
  assert.strictEqual(recovered.awayTeam,'הפועל בני כפר קאסם');
  assert.strictEqual(recovered.teams[1].name,recovered.awayTeam);
  assert.strictEqual(recovered.teams[1].teamId,596704);
  const homeDeleted=historical.convertToInternalFormat({...deletedTeamGame,teams:[596704,166934],title:{rendered:' — Away'}});
  assert.strictEqual(homeDeleted.homeTeam,recovered.awayTeam);
  assert.strictEqual(historical.convertToInternalFormat({...deletedTeamGame,title:{rendered:'Home — Published name'}}).awayTeam,'Published name');
  assert.notStrictEqual(a.convertToInternalFormat(deletedTeamGame).awayTeam,recovered.awayTeam,'historical fallback never leaks to another season');
  assert.ok(!a.convertToInternalFormat(deletedTeamGame).awayTeam.includes('Unknown'));
  assert.ok(historical.convertToInternalFormat({...deletedTeamGame,teams:[166934,999999]}).awayTeam.includes('999999'),'another missing team keeps its own identity');
  const olderUrls=[];
  const older=adapter(async url=>{olderUrls.push(url);return {ok:true,json:async()=>[{id:886018,teams:[596704,168902],format:'league',stage_id:1,title:{rendered:' — אליצור שומרון'}}]};},'2023-24');
  older.regularOnly=true;
  const olderData=await older.fetchSeasonGames();
  assert(olderUrls.every(url=>url.includes('seasons=18583')&&url.includes('leagues=18586')&&url.includes('tables=881046')),'historical requests use the official season, league and regular table');
  assert.strictEqual(older.convertToInternalFormat(olderData.games[0]).homeTeam,'הפועל בני כפר קאסם','2023/24 deleted team retains the verified historical name');
  assert.strictEqual(older.normalizeRound({...olderData.games[0],stage_id:26}).roundVerified,true);
  assert.strictEqual(older.normalizeRound({...olderData.games[0],stage_id:27}).roundVerified,false,'later phases cannot enter the 26-round regular season');
  const stats=Object.fromEntries(['min','pts','fgm','fga','threepm','threepa','ftm','fta','off','def','ast','stl','blk','to','pf','rate'].map(key=>[key,'1']));
  const raanana='מכבי אב-גד רעננה',modiin='הפועל חבל מודיעין';
  const completed={id:1502009,teams:[166484,167843],date:'2026-10-16',
    performance:{166484:{0:{pts:84},11:stats},167843:{0:{pts:72},22:stats}}};
  // The official first-round fixture lost both its full home name and its real opponent.
  for(const fixture of [
    {title:`${raanana} — ${modiin}`,home:{team:raanana},away:{team:modiin},want:[raanana,modiin]},
    {title:`${modiin} — ${raanana}`,home:{team:modiin},away:{team:raanana},want:[modiin,raanana]},
    {title:`old home — old away`,home:{team:raanana},away:{team:modiin},want:[raanana,modiin]},
    {title:`${raanana} — ${modiin}`,want:[raanana,modiin]},
    {title:`${modiin} – ${raanana}`,want:[modiin,raanana]},
    {title:`${raanana} - יריבה אב-גד`,want:[raanana,'יריבה אב-גד']},
    {title:`${raanana}—${modiin}`,want:[raanana,modiin]},
    {title:`${raanana} &#8212; ${modiin}`,want:[raanana,modiin]},
    {title:`${raanana} &ndash; ${modiin}`,home:{team:'Unknown'},away:{team:'   '},want:[raanana,modiin]},
    {title:'Home &amp; Sponsor — Away',want:['Home & Sponsor','Away']}
  ]) {
    const game=a.convertToInternalFormat({...completed,home:fixture.home,away:fixture.away,title:{rendered:fixture.title}});
    assert.deepStrictEqual([game.homeTeam,game.awayTeam],fixture.want,'game labels retain internal hyphens and official team names');
    assert.deepStrictEqual(Array.from(game.teams,t=>t.name),fixture.want);
    for(const rows of [game.players,game.playerObservations]) {
      assert.deepStrictEqual(Array.from(rows,p=>p.teamName),fixture.want,'players and observations use the same names as their game teams');
      assert.deepStrictEqual(Array.from(rows,p=>Number(p.teamId)),[166484,167843]);
    }
  }
  const namedGame=a.convertToInternalFormat({...completed,title:{rendered:`${raanana} — ${modiin}`},home:{team:raanana},away:{team:modiin}});
  const analyticsContext={window:{},console:{log(){},time(){},timeEnd(){}}};
  vm.runInNewContext(fs.readFileSync('js/ibba/ibba_analytics.js','utf8'),analyticsContext);
  const teamStats=new analyticsContext.window.IBBAAnalytics([namedGame]).getTeamStats();
  assert.deepStrictEqual(Object.keys(teamStats),[raanana,modiin],'analytics has two real teams rather than sponsor fragments');
  assert.strictEqual(teamStats[raanana].totalPoints,84);assert.strictEqual(teamStats[modiin].totalPoints,72);
  assert.strictEqual(Number(teamStats[raanana].totalEfficiency),1,'player efficiency remains attached to the full team name');
  const withPlayers=historical.convertToInternalFormat({...deletedTeamGame,performance:{596704:{123:stats}},away:{team:''}});
  assert.strictEqual(withPlayers.players[0].teamName,recovered.awayTeam,'player and game team labels agree');
  assert.strictEqual(r.games.length,101);
  assert(urls.every(u=>u.includes('seasons=119888')&&u.includes('leagues=119894')));
  const future=a.convertToInternalFormat({id:1,teams:[10,20],date:'2026-10-13',title:{rendered:'Home — Away'},performance:''});
  assert.strictEqual(future.roundVerified,false,'unknown round is never inferred');
  assert.strictEqual(future.roundNumber,null);
  assert.strictEqual(historical.convertToInternalFormat({...deletedTeamGame,format:'league',stage_id:1}).roundVerified,false,'parent league mixes later stages: round needs table filter');
  assert.strictEqual(a.convertToInternalFormat({id:99999999,teams:[10,20],format:'league',stage_id:1}).roundVerified,false,'new later-stage events are not in audited regular schedule');
  const regular=a.convertToInternalFormat({id:1502015,teams:[10,20],date:'2026-10-13',format:'league',stage_id:1,title:{rendered:'Home — Away'},sp_teams:{10:{pbc:0}}});
  assert.strictEqual(regular.roundNumber,1);
  assert.strictEqual(regular.competitionPhase,'regular');
  assert.strictEqual(regular.roundVerified,true);
  const strange=a.convertToInternalFormat({id:4,teams:[10,20],format:'cup',stage_id:999,title:{rendered:'Home — Away'}});
  assert.strictEqual(strange.roundVerified,false,'unverified competition cannot supply comparable round');
  assert.ok(!future.availableMetrics.includes('pointsBench'),'missing advanced values are not evidence');
  assert.strictEqual(future.homeScore,null);
  assert.strictEqual(future.hasResult,false);
  assert.strictEqual(future.hasPlayerStats,false);
  const resultOnly=a.convertToInternalFormat({id:2,teams:[10,20],date:'2024-01-01',title:{rendered:'Home — Away'},results:{10:{pts:'80'},20:{pts:'75'}}});
  assert.strictEqual(resultOnly.homeScore,80);
  assert.strictEqual(resultOnly.hasPlayerStats,false);
  assert.strictEqual(resultOnly.hasResult,true);
  const rosterOnly=a.convertToInternalFormat({id:3,teams:[10,20],date:'2024-01-01',title:{rendered:'Home — Away'},performance:{10:{0:{pts:80},123:{number:4,status:'sub'}},20:{0:{pts:75},456:{}}}});
  assert.strictEqual(rosterOnly.hasPlayerStats,false,'roster placeholders are not personal statistics');
  const b=adapter(async url=>({ok:true,json:async()=>{
    const u=new URL(url); if(!u.searchParams.get('month')) return [];
    if(u.searchParams.get('month')==='2026-11') throw Error('offline');
    return [{id:5},{id:5}];
  }}));
  b.fetchViaProxy=async()=>{throw Error('offline');};
  const partial=await b.fetchSeasonGames();
  assert.strictEqual(partial.games.length,1);
  assert.strictEqual(partial.complete,false);
  assert.deepStrictEqual(Array.from(partial.failedMonths),['2026-11']);
  console.log('season adapter tests passed');
}
run().catch(e=>{console.error(e);process.exit(1);});
