const assert=require('assert'),fs=require('fs'),vm=require('vm');
const c={window:{},URLSearchParams,URL,Date,console};
vm.runInNewContext(fs.readFileSync('js/ibba/ibba_seasons.js','utf8'),c);
if(fs.existsSync('js/ibba/ibba_match_context.js'))vm.runInNewContext(fs.readFileSync('js/ibba/ibba_match_context.js','utf8'),c);
assert(c.window.IBBAMatchContext,'match context service must exist');
// Synthetic games exercise missing rounds and postponed dates independently of live data.
const game=(id,round,date='2025-10-01',result=true)=>({gameId:id,seasonKey:'2025-26',date,roundVerified:true,roundNumber:round,competitionPhase:'regular',hasResult:result,hasPlayerStats:false,teams:[{teamId:1,name:'old sponsor',score:80},{teamId:2,name:'B',score:75}],homeTeam:'old sponsor',awayTeam:'B',permalink:'https://ibasketball.co.il/match/'+id});
async function run(){
 const calls=[];const data={loadSeason:async(key,options)=>{calls.push([key,options.regularOnly]);return {seasonKey:key,complete:true,failedMonths:[],scheduleGames:key==='2025-26'?[game(1,1),game(2,2,'2026-06-01',false),game(4,4),game(1,1)]:[]};}};
 const service=new c.window.IBBAMatchContext({seasonData:data});
 const match={...game(100,4,'2026-10-20'),seasonKey:'2026-27'};
 const context=await service.load(match,{now:new Date('2026-10-06')});
 assert.deepStrictEqual(Array.from(context.priorSeasons,s=>s.seasonKey),['2024-25','2025-26']);
 const prior=context.priorSeasons[1];
 assert.deepStrictEqual(Array.from(prior.beforeRoundGames,g=>g.gameId),[1]);
 assert.strictEqual(prior.coverage.roundWindowComplete,false,'missing and postponed rounds cannot look complete');
 assert.strictEqual(prior.resultGames.length,2,'duplicates removed and result-only games retained');
 assert.strictEqual(prior.statGames.length,0);
 assert(calls.some(([k,regular])=>k==='2025-26'&&regular),'round comparisons use official regular table');
 const unknown=await service.load({...match,roundVerified:false});
 assert.strictEqual(unknown.priorSeasons[1].sameRoundGames.length,0);
 assert.strictEqual(unknown.priorSeasons[1].resultGames.length,2);
 const active=await service.load(match,{now:new Date('2025-10-02')});
 assert.strictEqual(active.currentGames.length,0,'wrong season cannot enter current games');
 const failure=new c.window.IBBAMatchContext({seasonData:{loadSeason:async key=>{if(key==='2024-25')throw Error('offline');return {seasonKey:key,scheduleGames:[{...game(8,1,'2026-10-05'),seasonKey:key},{...game(9,2,'2026-10-07'),seasonKey:key}],complete:false,failedMonths:['2026-11']};}}});
 const partial=await failure.load(match,{now:new Date('2026-10-06')});
 assert.strictEqual(partial.priorSeasons[0].state,'error');
 assert.deepStrictEqual(Array.from(partial.currentGames,g=>g.gameId),[8]);
 assert.strictEqual(partial.priorSeasons[1].state,'partial');
 assert.strictEqual(service.sameTeam({teamId:1,name:'A'},{teamId:9,name:'A'}),false,'names never link identities');
 assert.strictEqual(service.sameTeam({teamId:1,name:'new'},{teamId:1,name:'old'}),true);
 console.log('match context tests passed');
}
run().catch(e=>{console.error(e);process.exit(1)});
