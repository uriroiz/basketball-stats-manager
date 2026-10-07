const assert=require('assert'),load=require('./helpers/broadcast');
const c=load(['ibba_seasons','ibba_analysis_scope','ibba_broadcast_copy','ibba_broadcast_editorial']);
const E=c.window.IBBABroadcastEditorial;assert(E,'editorial service exists');
const scope=c.window.IBBAAnalysisScope.fromGames([{seasonKey:'2025-26',gameId:1}],{phase:'all',mode:'recent',count:5});
const story=(type,team=1,extras={})=>({type,family:'PROFILE',teamIds:[team],seasonKeys:['2025-26'],analysisScope:scope,text:type,
 facts:{metric:'points',value:80},dataState:'ready',...extras});
const s=story('WINDOW_STYLE'),reword={...s,text:'new wording'},changed={...s,facts:{metric:'points',value:85},evidence:[{seasonKey:'2025-26',gameId:2}]};
assert.strictEqual(E.storyKey(s),E.storyKey(reword));
assert.strictEqual(E.storyKey(s),E.storyKey(changed));
assert.notStrictEqual(E.fingerprint(s),E.fingerprint(changed));
assert.strictEqual(E.storyKey({...s,teamIds:[],teamName:'same name'}),null,'name alone never merges');
const current=story('RECENT_WINDOW_CHANGE',1,{scope:'current',family:'MOMENTUM',seasonKeys:['2026-27'],facts:{metric:'points',difference:8,value:90,referenceValue:82}});
const round=story('ROUND_TEAM_SUMMARY',2,{family:'ROUND',facts:{round:1,roundMetrics:{points:80,opponentPoints:70,margin:10}}});
const strong=story('HALFTIME_RECORD',1,{family:'DECIDING',facts:{position:'leading',wins:25,total:27}});
const tiny=story('HALFTIME_RECORD',1,{family:'DECIDING',seasonKeys:['2024-25'],analysisScope:{...scope,requestedSeasonKeys:['2024-25']},facts:{position:'leading',wins:1,total:1}});
const candidates=[round,s,tiny,strong,current];
const result=E.prepare(candidates,{match:{teams:[{teamId:1},{teamId:2}]}});
assert(result.topStories.findIndex(x=>x.type===current.type)<result.topStories.findIndex(x=>x.type===round.type));
assert.strictEqual(E.tier(tiny),6,'one of one has no exceptional-record priority');
assert(result.topStories.findIndex(x=>x.facts.total===27)<result.topStories.findIndex(x=>x.type==='WINDOW_STYLE'));
assert.deepStrictEqual(Array.from(E.prepare([...candidates].reverse(),{match:{teams:[{teamId:1},{teamId:2}]}}).topStories,x=>x.storyKey),Array.from(result.topStories,x=>x.storyKey));
assert.strictEqual(E.prepare([s,s],{}).topStories.length,1);
assert.strictEqual(E.prepare([s],{}).topStories.length,1,'no padding');
const game=(id,key,winner=1)=>({gameId:id,seasonKey:key,hasResult:true,date:`${key.slice(0,4)}-12-01`,teams:[{teamId:1,name:'A',score:winner===1?85:82},{teamId:2,name:'B',score:winner===2?85:82}]});
const context={match:{seasonKey:'2026-27',teams:[{teamId:1,name:'A'},{teamId:2,name:'B'}]},priorSeasons:[
 {seasonKey:'2024-25',state:'ready',resultGames:[game(1,'2024-25'),game(2,'2024-25'),game(2,'2024-25')]},
 {seasonKey:'2025-26',state:'ready',resultGames:[game(1,'2025-26'),game(2,'2025-26')]},
 {seasonKey:'2023-24',state:'error',resultGames:[game(9,'2023-24')]}]};
const pooled=E.prepare([],context).topStories.find(x=>x.type==='POOLED_H2H_RECORD');
assert.strictEqual(pooled.facts.total,4);
assert.strictEqual(pooled.seasonKeys.length,2);
assert(pooled.text.includes('4')&&pooled.text.includes('2024/25')&&!pooled.text.includes('2023/24'));
assert.strictEqual(pooled.evidence.length,4);
context.priorSeasons[1].resultGames=[game(1,'2025-26',2),game(2,'2025-26',2)];
const tied=E.prepare([],context).topStories[0];
assert(tied.text.includes('כל קבוצה ניצחה')&&tied.text.includes('2'));
const input=JSON.stringify(candidates);E.prepare(candidates,{});assert.strictEqual(JSON.stringify(candidates),input);
const metrics=['points','opponentPoints','margin'].map((metric,index)=>story('ROUND_SCORING',1,{family:'ROUND',facts:{metric,value:[81.5,80.5,1][index],round:1,roundResults:[{seasonKey:'2024-25',gameId:1,margin:30},{seasonKey:'2025-26',gameId:1,margin:-28}]},sampleSize:2}));
const merged=E.prepare(metrics,{}).topStories;
assert.strictEqual(merged.length,1);
assert(merged[0].text.includes('30')&&merged[0].text.includes('28'),'actual outcomes survive merge');
console.log('broadcast editorial tests passed');
