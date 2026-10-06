const assert=require('assert'),fs=require('fs'),vm=require('vm');
const c={window:{},console,Date};for(const name of ['ibba_seasons','ibba_window_stats','ibba_rich_insights'])if(fs.existsSync(`js/ibba/${name}.js`))vm.runInNewContext(fs.readFileSync(`js/ibba/${name}.js`,'utf8'),c);
const R=c.window.IBBARichInsights;assert(R,'rich insights engine exists');
const game=(id,seasonKey='2025-26',points=80,extra={})=>({gameId:String(id),seasonKey,date:`2026-01-${String(id).padStart(2,'0')}`,hasResult:true,roundNumber:id,roundVerified:true,competitionPhase:'regular',teams:[{teamId:1,name:'A',score:points},{teamId:2,name:'B',score:75}],...extra});
const context=(round=1,current=[])=>({match:{seasonKey:'2026-27',roundNumber:round,roundVerified:true,competitionPhase:'regular',teams:[{teamId:1,name:'A'},{teamId:2,name:'B'}]},asOf:'2026-10-06',currentResultGames:current,currentScheduleGames:current,currentRegularGames:current,currentComplete:true,identity:x=>typeof x==='object'?`post:${x.playerId}`:x,playerSummaries:{records:[]},priorSeasons:[{seasonKey:'2024-25',state:'ready',regularGames:[game(1,'2024-25',80)],resultGames:[game(1,'2024-25',80)]},{seasonKey:'2025-26',state:'ready',regularGames:[game(1,'2025-26',100)],resultGames:[game(1,'2025-26',100)]}]});
let stories=R.generate(context());const round=stories.find(s=>s.type==='ROUND_SCORING'&&s.teamIds[0]===1);
assert.strictEqual(round.facts.value,90);assert.strictEqual(round.samples[0].gameCount,2);
const current=Array.from({length:10},(_,i)=>game(i+1,'2026-27',i<5?80:90));
stories=R.generate(context(11,current));const change=stories.find(s=>s.type==='RECENT_WINDOW_CHANGE'&&s.teamIds[0]===1&&s.facts.metric==='points');
assert.strictEqual(change.facts.difference,10);assert.strictEqual(change.samples[0].gameCount,5);assert.strictEqual(change.samples[1].gameCount,5);
assert(!R.generate(context(10,current.slice(0,9))).some(s=>s.type==='RECENT_WINDOW_CHANGE'));
const before=R.generate(context(10,current)).filter(s=>s.type==='SAME_STAGE_COMPARISON');assert(before.every(s=>s.windows.every(w=>w.toRound===9)));
assert(!R.generate(context(1)).some(s=>s.type==='RECENT_WINDOW_CHANGE'));
const deciding=Array.from({length:6},(_,i)=>game(i+1,'2026-27',i<4?78:72,{quarters:{q1:{home:20,away:18},q2:{home:20,away:18},q3:{home:20,away:18},q4:{home:18,away:21}},teamStats:{home:{pointsBench:0}},metricAvailability:{1:['pointsBench']}}));
const d=R.generate(context(7,deciding));const close=d.find(s=>s.type==='CLOSE_GAME_RECORD'&&s.teamIds[0]===1&&s.scope==='current');
assert.strictEqual(close.facts.wins,4);assert.strictEqual(close.facts.total,6);
assert(d.some(s=>s.type==='HALFTIME_RECORD'));
assert(d.some(s=>s.type==='WINDOW_STYLE'&&s.facts.metric==='pointsBench'&&s.facts.value===0));
assert(!d.some(s=>s.facts.metric==='pointsInPaint'));
const q=R.generate(context(2,[game(1,'2026-27',80,{quarters:{q1:{home:null,away:null},q4:{home:30,away:20}}})]));
assert(q.some(s=>s.type==='QUARTER_WINDOW'&&s.facts.quarter===4));assert(!q.some(s=>s.type==='QUARTER_WINDOW'&&s.facts.quarter===1&&s.scope==='current'));
const playerGames=Array.from({length:5},(_,i)=>game(i+1,'2025-26',80,{teams:[{teamId:3,name:'Old team',score:80},{teamId:2,name:'B',score:75}],playerObservations:[{playerId:7,teamId:3,teamName:'Old team',participation:'verified',availableMetrics:['points','totalRebounds','assists','steals','blocks'],stats:{points:12,totalRebounds:i<2?10:4,assists:3,steals:0,blocks:0}}]}));
const pc=context(3);pc.priorSeasons[1].resultGames=[...playerGames,game(6,'2025-26')];pc.priorSeasons[1].regularGames=playerGames;pc.playerSummaries.records=[{playerRef:'post:7',name:'Player',team:'Old team',seasonKey:'2025-26'}];
const ps=R.generate(pc,{playerRefs:['post:7']});const dd=ps.find(s=>s.type==='PLAYER_DOUBLE_DOUBLES');
assert.strictEqual(dd.facts.count,2);assert.strictEqual(dd.facts.total,5);assert.strictEqual(dd.historicalTeam,'Old team');
assert(ps.some(s=>s.type==='PLAYER_OPPONENT_PROFILE'&&s.playerRef==='post:7'));
assert(!R.generate(pc,{playerRefs:['post:8']}).some(s=>s.type.startsWith('PLAYER_')));
const missing=context(3);missing.priorSeasons[1].resultGames=playerGames.map(g=>({...g,playerObservations:g.playerObservations.map(p=>({...p,stats:{...p.stats,totalRebounds:null},availableMetrics:['points','assists']}))}));
assert(!R.generate(missing,{playerRefs:['post:7']}).some(s=>s.type==='PLAYER_DOUBLE_DOUBLES'));
assert(!ps.some(s=>s.type==='H2H_CHANGE'));
const reviewFailures=[];
function regression(name,fn){try{fn();}catch(error){reviewFailures.push(name+': '+error.message);}}
regression('postponed windows and separate years',()=>{
 const delayed=context(10,[1,5,6,7,8,9].map(r=>game(r,'2026-27',r===1?200:90,{date:r===1?'2026-02-01':`2026-01-${r}`})));
 delayed.priorSeasons.forEach(s=>{s.regularGames=[5,6,7,8,9].map(r=>game(r,s.seasonKey,80));});
 const changes=R.generate(delayed).filter(s=>s.type==='HISTORICAL_WINDOW_COMPARISON'&&s.teamIds[0]===1&&s.facts.metric==='points');
 assert.strictEqual(changes.length,2);assert(changes.every(s=>s.facts.value===90&&s.facts.referenceValue===80&&s.samples[1].gameCount===5));
});
regression('zero changes suppressed',()=>assert(!R.generate(context(11,Array.from({length:10},(_,i)=>game(i+1,'2026-27',80)))).some(s=>s.type==='RECENT_WINDOW_CHANGE')));
regression('phase verification for h2h changes',()=>{
 const unverified=context(11);unverified.priorSeasons=[];unverified.currentResultGames=Array.from({length:10},(_,i)=>game(i+1,'2026-27',i<5?80:90,{roundVerified:false,competitionPhase:'unknown'}));
 assert(!R.generate(unverified).some(s=>s.type==='H2H_CHANGE'));
});
regression('accurate comparison subset metadata',()=>assert(change.windows.every(w=>w.count===5&&w.gameIds.length===5)));
regression('conditional sample count',()=>assert.strictEqual(R.generate(context(8,[...deciding,game(7,'2026-27',110)])).find(s=>s.type==='CLOSE_GAME_RECORD'&&s.scope==='current'&&s.teamIds[0]===1).samples[0].gameCount,6));
regression('quarter metric readiness',()=>assert.strictEqual(q.find(s=>s.type==='QUARTER_WINDOW'&&s.scope==='current'&&s.facts.quarter===4).dataState,'ready'));
regression('metric-specific rival denominator',()=>{
 const available=Array.from({length:5},(_,i)=>game(i+1,'2026-27',80,{teamStats:{home:{offensiveRebounds:10},away:{offensiveRebounds:6,defensiveRebounds:20}},metricAvailability:{1:['offensiveRebounds'],2:i<2?['offensiveRebounds','defensiveRebounds']:['offensiveRebounds']}}));
 const s=R.generate(context(6,available)).find(s=>s.type==='MATCHUP_STYLE'&&s.teamIds[0]===1&&s.facts.metric==='offensiveRebounds');assert.strictEqual(s.samples[1].metric,'defensiveRebounds');assert.strictEqual(s.samples[1].gameCount,2);assert.strictEqual(s.dataState,'partial');
});
regression('derived player contribution readiness',()=>{
 const ctx=context(11);ctx.priorSeasons[1].resultGames=Array.from({length:10},(_,i)=>({...playerGames[i%5],gameId:String(i+1),date:`2026-01-${String(i+1).padStart(2,'0')}`,playerObservations:playerGames[i%5].playerObservations.map(p=>({...p,stats:{...p.stats,points:i<5?12:20}}))}));
 const contribution=R.generate(ctx,{playerRefs:['post:7']}).find(s=>s.type==='PLAYER_CONTRIBUTION_CHANGE');assert.strictEqual(contribution.dataState,'ready');assert.strictEqual(contribution.samples[0].gameCount,5);
});
if(reviewFailures.length){console.error(reviewFailures.join('\n'));process.exit(1);}
console.log('rich insights tests passed');
module.exports={c,context,game};
