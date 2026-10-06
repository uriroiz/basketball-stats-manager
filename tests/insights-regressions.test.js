const assert=require('assert'),fs=require('fs'),vm=require('vm');const c={window:{},Date,console};
vm.runInNewContext(fs.readFileSync('js/ibba/ibba_insights_v2.js','utf8'),c);
const engine=new c.window.IBBAInsightsV2({getTeamAverages:()=>[]});
// Synthetic reverse-ordered API input: first 4 games score 10, last 4 score 20.
const games=Array.from({length:8},(_,i)=>({gameId:i+1,date:`2026-01-${String(i+1).padStart(2,'0')}`,teams:[{name:'H',score:80,isHome:true},{name:'A',score:70}],players:[{teamName:'H',playerId:1,jersey:7,stats:{points:i<4?10:20}}]}));
const rise=engine.detectRisingStar('H',[...games].reverse());
assert(rise,'rising star must use chronological order regardless of API input');
assert.deepStrictEqual(rise,engine.detectRisingStar('H',games));
const recent=Array.from({length:15},(_,i)=>({...games[0],date:new Date(2026,0,i+1).toISOString(),players:[{playerId:1,teamName:'H',stats:{points:i<5?(i%2?0:50):15}}]}));
assert(engine.detectMrConsistent('H',recent),'latest ten, not oldest ten, must supply consistency window');
assert.strictEqual(engine.detectBestQuarter('H',Array.from({length:6},()=>({...games[0],quarters:{q1:{home:20,away:null}}}))),null,'unknown quarter must not become zero or throw');
const insights={PLAYERS:[{teamName:'H',importance:'high'},{teamName:'A',importance:'low'}]};
assert.strictEqual(engine.getTopInsights(insights)[0].importance,'high');
console.log('insights regression tests passed');
