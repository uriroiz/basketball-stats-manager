const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
function adapter(fetch, seasonKey = null) {
  const c = {window:{},fetch,console:{log(){},warn(){},error(){}},URL,Date,
    document:{createElement:()=>({set innerHTML(v){this.value=v;},value:''})}};
  vm.runInNewContext(fs.readFileSync('js/ibba/ibba_adapter.js','utf8'),c);
  vm.runInNewContext(fs.readFileSync('js/ibba/ibba_seasons.js','utf8'),c);
  return new c.window.IBBAAdapter(seasonKey ? c.window.IBBASeasons.getSeason(seasonKey) : {key:'2026-27',leagueId:119894,seasonId:119888,seasonMonths:['2026-10','2026-11']});
}
async function run() {
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
  const stats=Object.fromEntries(['min','pts','fgm','fga','threepm','threepa','ftm','fta','off','def','ast','stl','blk','to','pf','rate'].map(key=>[key,'1']));
  const withPlayers=historical.convertToInternalFormat({...deletedTeamGame,performance:{596704:{123:stats}},away:{team:''}});
  assert.strictEqual(withPlayers.players[0].teamName,recovered.awayTeam,'player and game team labels agree');
  assert.strictEqual(r.games.length,101);
  assert(urls.every(u=>u.includes('seasons=119888')&&u.includes('leagues=119894')));
  const future=a.convertToInternalFormat({id:1,teams:[10,20],date:'2026-10-13',title:{rendered:'Home — Away'},performance:''});
  assert.strictEqual(future.roundVerified,false,'unknown round is never inferred');
  assert.strictEqual(future.roundNumber,null);
  assert.strictEqual(historical.convertToInternalFormat({...deletedTeamGame,format:'league',stage_id:1}).roundVerified,false,'parent league mixes later stages: round needs table filter');
  const regular=a.convertToInternalFormat({id:4,teams:[10,20],date:'2026-10-13',format:'league',stage_id:2,title:{rendered:'Home — Away'},sp_teams:{10:{pbc:0}}});
  assert.strictEqual(regular.roundNumber,2);
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
